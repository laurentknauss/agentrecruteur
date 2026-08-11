// OpenAI client — GPT-5.5 via l'API officielle OpenAI (Responses API).
// Remplace l'ancien proxy Replicate (openai/gpt-4.1).

import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
export const GPT_MODEL = process.env.GPT_MODEL || 'gpt-5.5';

export default function createOpenAIClient() {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const client = new OpenAI({ apiKey: OPENAI_API_KEY });
    console.log(`🤖 OpenAI client configured (model: ${GPT_MODEL})`);
    return client;
  } catch (error) {
    console.error('❌ Error creating OpenAI client:', error);
    throw new Error('Failed to initialize OpenAI client.');
  }
}

/**
 * Run GPT-5.5 through the OpenAI Responses API.
 * @param {OpenAI} client
 * @param {string} input - user prompt
 * @param {string} systemPrompt - instructions
 * @param {'none'|'low'|'medium'|'high'|'xhigh'} reasoningEffort
 * @param {number} maxTokens
 */
export async function runGPT5Model(client, input, systemPrompt = '', reasoningEffort = 'medium', maxTokens = 4096) {
  try {
    const response = await client.responses.create({
      model: GPT_MODEL,
      input: input,
      instructions: systemPrompt || undefined,
      reasoning: { effort: reasoningEffort },
      max_output_tokens: maxTokens,
    });

    return response.output_text;
  } catch (error) {
    console.error('❌ Error running GPT-5.5 model:', error);
    throw new Error(`Failed to run GPT-5.5 model: ${error instanceof Error ? error.message : String(error)}`);
  }
}
