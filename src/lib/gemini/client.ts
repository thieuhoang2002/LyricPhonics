import { GoogleGenAI } from '@google/genai';

/**
 * Server-Side Gemini Client Factory.
 * Strict zero-leakage: Only accesses process.env.GEMINI_API_KEY.
 * Never export or initialize on client components.
 */
let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error(
      'MISSING_GEMINI_API_KEY: process.env.GEMINI_API_KEY is not configured on the server. Please add it to your environment variables.'
    );
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }

  return cachedClient;
}

export const GEMINI_AUDIO_MODEL = 'gemini-2.5-flash';
export const GEMINI_FALLBACK_MODEL = 'gemini-2.0-flash';
