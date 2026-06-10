"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenRouterClient = void 0;
class OpenRouterClient {
    constructor(apiKey) {
        this.baseURL = 'https://openrouter.ai/api/v1';
        this.apiKey = apiKey;
    }
    async chatCompletion(messages, model = 'anthropic/claude-3.5-haiku', temperature = 0.7, responseFormat) {
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
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                console.error("OpenRouter API Error:", {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText,
                    apiKeyPresent: !!this.apiKey,
                });
                throw new Error(`OpenRouter API error: ${response.status} - ${response.statusText} - ${errorText.substring(0, 200)}`);
            }
            return response.json();
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                console.warn('[OpenRouter] Request timed out after 10s');
                throw new Error('OpenRouter API timeout - rate limit or slow response');
            }
            throw error;
        }
    }
    async getModels() {
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
exports.OpenRouterClient = OpenRouterClient;
exports.default = OpenRouterClient;
