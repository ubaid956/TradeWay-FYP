import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

const GRADING_PROMPT_VERSION = 'marble-grading-v1';
const DEFAULT_MODEL = process.env.AI_GRADING_MODEL || process.env.AI_MODEL_NAME || 'gemini-2.0-flash';
const API_KEY = process.env.AI_API_KEY;
const API_VERSION = process.env.AI_API_VERSION || 'v1';
const MAX_IMAGES = 5;

let cachedModel;

const getModel = () => {
  if (!API_KEY) {
    throw new Error('AI_API_KEY is missing. Please set it before triggering grading.');
  }

  if (!cachedModel) {
    const client = new GoogleGenerativeAI(API_KEY, { apiVersion: API_VERSION });
    cachedModel = client.getGenerativeModel({
      model: DEFAULT_MODEL,
      generationConfig: {
        temperature: 0.2,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 1024,
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

const parseJsonOrThrow = (text = '') => {
  const attempts = [text, extractJsonSegment(text)].filter((candidate, index, self) => candidate && self.indexOf(candidate) === index);

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      continue;
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

  const response = result?.response;
  let rawText = typeof response?.text === 'function' ? response.text() : '';
  if (!rawText && Array.isArray(response?.candidates)) {
    rawText = response.candidates
      .flatMap((candidate) => candidate?.content?.parts?.map((part) => part?.text || '') || [])
      .filter(Boolean)
      .join('\n');
  }

  const cleaned = stripMarkdownJson(rawText);
  if (!cleaned) {
    throw new Error('Gemini returned an empty response for grading.');
  }

  const parsed = parseJsonOrThrow(cleaned);

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
