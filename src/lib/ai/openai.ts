import OpenAI from 'openai';

let client: OpenAI | null = null;

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const { OPENAI_API_KEY, OPENAI_BASE_URL } = process.env;

export interface JsonChatCompletionInput {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
}

function getClient(): OpenAI {
  if (client) {
    return client;
  }
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  client = new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_BASE_URL || undefined,
  });
  return client;
}

export interface JsonChatCompletionResult {
  content: string;
  raw: OpenAI.Chat.Completions.ChatCompletion;
}

export async function completeJsonChat(
  input: JsonChatCompletionInput,
): Promise<JsonChatCompletionResult> {
  const openai = getClient();
  const completion = await openai.chat.completions.create({
    model: input.model ?? DEFAULT_MODEL,
    temperature: input.temperature ?? 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: input.systemPrompt },
      { role: 'user', content: input.userPrompt },
    ],
  });
  const content = completion.choices?.[0]?.message?.content?.trim() ?? '';
  return { content, raw: completion };
}

