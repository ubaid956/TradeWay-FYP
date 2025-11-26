import { GoogleGenerativeAI } from '@google/generative-ai';

const modelName = process.env.AI_MODEL_NAME || 'gemini-2.5-flash-lite';
const apiKey = process.env.AI_API_KEY;
const apiVersion = process.env.AI_API_VERSION || 'v1beta';

let cachedModel;

const getModel = () => {
  if (!apiKey) {
    throw new Error('AI_API_KEY is missing. Please add it to your .env file.');
  }

  if (!cachedModel) {
    const client = new GoogleGenerativeAI(apiKey);
    cachedModel = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.7,
        topK: 32,
        topP: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
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

const buildFallback = (products, limit) => {
  return products.slice(0, limit).map((product, index) => ({
    productId: product.productId,
    score: Number((1 - index * 0.05).toFixed(2)),
    reason: 'Popular marble listing aligned with your recent activity.',
  }));
};

export const generateAIRecommendations = async ({ userProfile, products, limit = 5 }) => {
  if (!products?.length) {
    return [];
  }

  const model = getModel();
  const safeLimit = Math.min(limit, 10, products.length);

  const instructions = {
    role: 'user',
    parts: [{
      text: `You are an expert marble sourcing assistant for the TradeWay marketplace.
Return personalized product recommendations.

User profile (JSON): ${JSON.stringify(userProfile)}

Candidate products (JSON array): ${JSON.stringify(products)}

Instructions:
- Only recommend items that exist in the candidate list.
- Respond with JSON array (max ${safeLimit}) objects using schema { "productId": string, "score": number (0-1), "reason": string }.
- Prioritize marble-focused listings aligned with the user's preferred categories, budgets, and recent actions.
- Keep reasons short (<=160 characters).
- If data is insufficient, respond with an empty array.`
    }],
  };

  try {
    const result = await model.generateContent({ contents: [instructions] });
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
      console.error('AI recommendation warning: empty response body');
      if (response?.candidates?.[0]?.finishReason) {
        console.error('Finish reason:', response.candidates[0].finishReason);
      }
      return buildFallback(products, safeLimit);
    }

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) {
      throw new Error('AI response was not an array');
    }

    const uniqueIds = new Set();
    const normalized = [];

    for (const entry of parsed) {
      if (entry?.productId && !uniqueIds.has(entry.productId)) {
        uniqueIds.add(entry.productId);
        normalized.push(entry);
      }
      if (normalized.length >= safeLimit) break;
    }

    if (!normalized.length) {
      return buildFallback(products, safeLimit);
    }

    return normalized;
  } catch (error) {
    console.error('AI recommendation error:', error.message);
    return buildFallback(products, safeLimit);
  }
};
