declare module 'openai' {
  export namespace OpenAI {
    namespace Chat {
      namespace Completions {
        interface ChatCompletionMessage {
          content?: string | null;
        }

        interface ChatCompletionChoice {
          message?: ChatCompletionMessage;
        }

        interface ChatCompletion {
          choices: ChatCompletionChoice[];
        }

        interface CreateParams {
          model: string;
          temperature?: number;
          response_format?: { type: string };
          messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
        }
      }
    }
  }

  export default class OpenAI {
    constructor(options: { apiKey: string; baseURL?: string });
    chat: {
      completions: {
        create(
          params: OpenAI.Chat.Completions.CreateParams,
        ): Promise<OpenAI.Chat.Completions.ChatCompletion>;
      };
    };
  }
}

