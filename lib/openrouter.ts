export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface OpenRouterModelsResponse {
  data: {
    id: string;
    name: string;
  }[];
}

export class OpenRouterClient {
  private apiKey: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chatCompletion(
    messages: OpenRouterMessage[],
    model: string = 'google/gemma-4-31b-it:free',
    temperature: number = 0.7,
    responseFormat?: { type: 'json_object' },
    maxTokens: number = 1024
  ): Promise<OpenRouterResponse> {
    // Add 10 second timeout to prevent long waits
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://arquiv.org',
          'X-Title': 'Arquiv - Architectural Regulations Guide',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          response_format: responseFormat,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error("OpenRouter API Error:", { status: response.status, apiKeyPresent: !!this.apiKey });
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[OpenRouter] Request timed out after 10s');
        throw new Error('OpenRouter API timeout - rate limit or slow response');
      }
      throw error;
    }
  }

  async getModels(): Promise<OpenRouterModelsResponse> {
    const response = await fetch(`${this.baseURL}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    return response.json();
  }
}

export default OpenRouterClient;
