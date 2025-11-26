import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

const GRADING_PROMPT_VERSION = 'marble-grading-v1';
const FALLBACK_MODEL = 'gemini-2.5-flash';
const SUPPORTED_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite'
];

const resolveModelName = () => {
  const candidate = process.env.AI_GRADING_MODEL || process.env.AI_MODEL_NAME;
  if (!candidate) {
    console.log('[Grading] No model specified in env, using fallback:', FALLBACK_MODEL);
    return FALLBACK_MODEL;
  }

  const normalized = candidate.trim().toLowerCase();
  if (!normalized || normalized === 'auto' || normalized === 'default') {
    console.log('[Grading] Invalid model name, using fallback:', FALLBACK_MODEL);
    return FALLBACK_MODEL;
  }

  // Check if model is supported
  const modelMatch = SUPPORTED_MODELS.find(m => normalized.includes(m));
  if (!modelMatch) {
    console.warn(`[Grading] Model "${candidate}" may not be supported. Supported models: ${SUPPORTED_MODELS.join(', ')}. Using fallback: ${FALLBACK_MODEL}`);
    return FALLBACK_MODEL;
  }

  console.log('[Grading] Using model:', candidate.trim());
  return candidate.trim();
};

const DEFAULT_MODEL = resolveModelName();
const API_KEY = process.env.AI_API_KEY;
const API_VERSION = process.env.AI_API_VERSION || 'v1beta';

console.log('[Grading Service] Initialized with:', { model: DEFAULT_MODEL, apiVersion: API_VERSION, hasApiKey: !!API_KEY });
const MAX_IMAGES = 5;

let cachedModel;

const getModel = () => {
  if (!API_KEY) {
    throw new Error('AI_API_KEY is missing. Please set it before triggering grading.');
  }

  if (!cachedModel) {
    const client = new GoogleGenerativeAI(API_KEY);
    cachedModel = client.getGenerativeModel({
      model: DEFAULT_MODEL,
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json'
      }
    });
  }

  return cachedModel;
};

const stripMarkdownJson = (text = '') => {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/```json|```/gi, '').trim();
  }
  return trimmed;
};

const extractJsonSegment = (text = '') => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return text;
  }
  return text.slice(start, end + 1);
};

const normalizeJsonQuotes = (text = '') =>
  text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

const stripTrailingCommas = (text = '') =>
  text
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/,\s*,/g, ',');

const sanitizeJsonCandidate = (text = '') => stripTrailingCommas(normalizeJsonQuotes(text));

const parseJsonOrThrow = (text = '') => {
  const candidates = [text, extractJsonSegment(text)].filter((candidate, index, self) => candidate && self.indexOf(candidate) === index);

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      try {
        const repaired = sanitizeJsonCandidate(trimmed);
        if (repaired !== trimmed) {
          return JSON.parse(repaired);
        }
      } catch (repairError) {
        continue;
      }
    }
  }

  throw new Error('Gemini returned invalid JSON for grading.');
};

const normalizeIssues = (issues) => {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues
    .filter(Boolean)
    .map((issue) => ({
      label: issue.label || issue.name || 'observation',
      severity: issue.severity || issue.impact || 'medium',
      details: issue.details || issue.description || issue.notes || ''
    }));
};

const normalizeRecommendations = (recommendations) => {
  if (Array.isArray(recommendations)) {
    return recommendations.filter((item) => typeof item === 'string' && item.trim().length);
  }

  if (typeof recommendations === 'string' && recommendations.trim().length) {
    return [recommendations.trim()];
  }

  return [];
};

const clampConfidence = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return Math.min(1, Math.max(0, Number(value)));
};

const buildPrompt = (product, customContext) => {
  const baseContext = `You are TradeWay's marble quality inspector.
Evaluate the visual quality of marble slabs for buyers and sellers.

Product context (JSON): ${JSON.stringify({
    title: product.title,
    category: product.category,
    specifications: product.specifications,
    location: product.location,
    price: product.price
  })}

Instructions:
- First verify that every frame clearly shows a marble/stone slab. If any image is not marble (e.g., people, tools, warehouses, landscapes), immediately mark the grade as "reject" and set summary to "Image does not appear to show a marble product" (or similar) while listing the mismatch inside issues.
- When images do contain marble, review polish, veining consistency, edge defects, color matching, and visible cracks.
- Reference obvious issues explicitly and keep responses factual.
- Respond with a JSON object using this exact schema:
{
  "grade": "premium | standard | commercial | reject",
  "confidence": 0-1,
  "summary": "string",
  "issues": [{ "label": "string", "severity": "low|medium|high|critical", "details": "string" }],
  "recommendations": ["string"],
  "model": { "name": "string", "version": "string", "provider": "google-gemini" }
}
- Keep summary under 280 characters.
- Leave issues empty if the slab is defect free.`;

  if (customContext && customContext.trim().length) {
    return `${baseContext}

Extra user context: ${customContext.trim()}`;
  }

  return baseContext;
};

export const prepareInlineImages = async ({ uploadedFiles = [], remoteUrls = [] }) => {
  const inlineImages = [];
  const evidence = [];

  const normalizedFiles = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
  for (const file of normalizedFiles) {
    if (!file || !file.data || inlineImages.length >= MAX_IMAGES) {
      continue;
    }
    inlineImages.push({
      data: file.data.toString('base64'),
      mimeType: file.mimetype || 'image/jpeg'
    });
    evidence.push({ url: null, label: file.name || 'uploaded-file' });
  }

  const normalizedUrls = Array.isArray(remoteUrls) ? remoteUrls : [];
  for (const url of normalizedUrls) {
    if (inlineImages.length >= MAX_IMAGES) {
      break;
    }
    if (!url) {
      continue;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Could not download image: ${url}`);
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    inlineImages.push({
      data: buffer.toString('base64'),
      mimeType: contentType.split(';')[0]
    });
    evidence.push({ url, label: url });
  }

  return { inlineImages, evidence };
};

export const gradeMarbleImages = async ({ product, inlineImages, additionalContext }) => {
  if (!product) {
    throw new Error('Product is required for grading.');
  }

  if (!Array.isArray(inlineImages) || !inlineImages.length) {
    throw new Error('At least one image is required for grading.');
  }

  const model = getModel();
  const instructions = buildPrompt(product, additionalContext);

  console.log('[Grading] Sending request to Gemini with', inlineImages.length, 'images');
  console.log('[Grading] Model config:', { model: DEFAULT_MODEL, apiVersion: API_VERSION });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: instructions },
          ...inlineImages.map((inlineData) => ({ inlineData }))
        ]
      }
    ]
  });

  console.log('[Grading] Received response from Gemini');
  console.log('[Grading] Response structure:', {
    hasResponse: !!result?.response,
    hasCandidates: Array.isArray(result?.response?.candidates),
    candidateCount: result?.response?.candidates?.length || 0
  });

  const response = result?.response;
  let rawText = typeof response?.text === 'function' ? response.text() : '';
  if (!rawText && Array.isArray(response?.candidates)) {
    rawText = response.candidates
      .flatMap((candidate) => candidate?.content?.parts?.map((part) => part?.text || '') || [])
      .filter(Boolean)
      .join('\n');
  }

  console.log('[Grading] Raw text length:', rawText?.length || 0);
  if (!rawText) {
    console.error('[Grading] Empty response details:', JSON.stringify({
      response: result?.response,
      candidates: result?.response?.candidates
    }, null, 2));
  }

  const cleaned = stripMarkdownJson(rawText);
  if (!cleaned) {
    console.error('[Grading] Empty response after cleaning. This usually means:');
    console.error('  1. Model is not available for the API version (check model + apiVersion compatibility)');
    console.error('  2. API key lacks permissions or billing is not enabled');
    console.error('  3. Images are too large or in unsupported format');
    console.error('  Current config:', { model: DEFAULT_MODEL, apiVersion: API_VERSION });
    
    throw new Error(`Gemini returned empty response. Model: ${DEFAULT_MODEL}, API Version: ${API_VERSION}. Check server logs for details.`);
  }

  console.log('[Grading] Parsing JSON response...');
  const parsed = parseJsonOrThrow(cleaned);
  console.log('[Grading] Successfully parsed response. Grade:', parsed.grade);

  return {
    structured: {
      grade: parsed.grade || 'unknown',
      confidence: clampConfidence(parsed.confidence),
      summary: parsed.summary || parsed.overview || parsed.verdict || '',
      issues: normalizeIssues(parsed.issues || parsed.defects),
      recommendations: normalizeRecommendations(parsed.recommendations),
      model: parsed.model || {
        name: DEFAULT_MODEL,
        version: 'latest',
        provider: 'google-gemini'
      },
      raw: parsed
    },
    rawText,
    promptVersion: GRADING_PROMPT_VERSION
  };
};
