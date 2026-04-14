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
    model: string = 'openrouter/elephant-alpha',
    temperature: number = 0.7,
    responseFormat?: { type: 'json_object' }
  ): Promise<OpenRouterResponse> {
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        apiKeyPresent: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0
      });
      throw new Error(`OpenRouter API error: ${response.status} - ${response.statusText} - ${errorText.substring(0, 200)}`);
    }

    return response.json();
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
