// This file initializes the Replicate client for OpenAI GPT-5 model

import Replicate from 'replicate';
import dotenv from 'dotenv';

dotenv.config();

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export default function createReplicateClient() {
  try {
    if (!REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN environment variable is required");
    }

    const client = new Replicate({
      auth: REPLICATE_API_TOKEN,
    });

    console.log(`🤖 Replicate client configured with API token`);
    return client;
  } catch (error) {
    console.error("❌ Error creating Replicate client:", error);
    throw new Error("Failed to initialize Replicate client.");
  }
}

// Helper function to run OpenAI GPT-5 through Replicate
export async function runGPT5Model(client, input, systemPrompt = "", reasoningEffort = "medium", maxTokens = 4096) {
  try {
    const output = await client.run(
      "openai/gpt-5",
      {
        input: {
          prompt: input,
          system_prompt: systemPrompt,
          reasoning_effort: reasoningEffort,
          max_completion_tokens: maxTokens,
        }
      }
    );

    return output.join('');
  } catch (error) {
    console.error("❌ Error running GPT-5 model:", error);
    throw new Error(`Failed to run GPT-5 model: ${error.message}`);
  }
}