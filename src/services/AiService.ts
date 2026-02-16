/**
 * AI Service — Provider abstraction layer.
 *
 * Supports 5 providers: Ollama (local), OpenAI, Anthropic, Google (Gemini),
 * and Custom (OpenAI-compatible endpoint). All HTTP is done via Obsidian's
 * `requestUrl()` for CORS + mobile compatibility.
 *
 * Phase 7 — plumbing only, no user-facing AI feature yet.
 */
import { requestUrl } from 'obsidian';
import { Logger } from '../utils/logger';
import type { OrbitSettings } from '../settings';

// ─── Default Prompt Template ────────────────────────────────────

export const DEFAULT_PROMPT_TEMPLATE = `You are a personal relationship assistant. Write a short, warm check-in message for the following contact.

**Contact:** {{name}}
**Category:** {{category}}
**Days since last contact:** {{daysSinceContact}}
**Social battery:** {{socialBattery}}
**Last interaction:** {{lastInteraction}}

**Conversational Fuel:**
{{conversationalFuel}}

**Small Talk Data:**
{{smallTalkData}}

Guidelines:
- Keep it casual and authentic — not robotic
- Reference specific topics from their Conversational Fuel or Small Talk Data if available
- Match the tone to the relationship category (family = warm, work = professional but friendly)
- Keep it under 3-4 sentences
- Don't mention that you're an AI or that you're using data about them`;

// ─── Provider Interface ─────────────────────────────────────────

/**
 * Common interface for all AI providers.
 * Each provider knows how to check availability, list models, and generate text.
 */
export interface AiProvider {
    /** Unique provider ID (matches AiProviderType values) */
    id: string;
    /** Human-readable provider name */
    name: string;
    /** Check if the provider is reachable and configured */
    isAvailable(): Promise<boolean>;
    /** List available models for this provider */
    listModels(): Promise<string[]>;
    /** Generate text from a prompt using the specified model */
    generate(prompt: string, model: string): Promise<string>;
}

// ─── Ollama Provider ────────────────────────────────────────────

/**
 * Local Ollama provider — auto-detects via HTTP ping.
 * Models are dynamically listed from the user's installed models.
 */
export class OllamaProvider implements AiProvider {
    readonly id = 'ollama';
    readonly name = 'Ollama';
    private baseUrl: string;

    constructor(baseUrl: string = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }

    /** Ping the Ollama server root endpoint */
    async isAvailable(): Promise<boolean> {
        try {
            const response = await requestUrl({
                url: this.baseUrl,
                method: 'GET',
                throw: false,
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    /** List installed models via /api/tags */
    async listModels(): Promise<string[]> {
        try {
            const response = await requestUrl({
                url: `${this.baseUrl}/api/tags`,
                method: 'GET',
            });
            const data = response.json;
            if (data?.models && Array.isArray(data.models)) {
                return data.models.map((m: { name: string }) => m.name);
            }
            return [];
        } catch (error) {
            Logger.error('AiService', 'Failed to list Ollama models', error);
            return [];
        }
    }

    /** Generate text via /api/generate */
    async generate(prompt: string, model: string): Promise<string> {
        const response = await requestUrl({
            url: `${this.baseUrl}/api/generate`,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
            }),
        });

        const data = response.json;
        if (!data?.response) {
            throw new Error('Ollama returned an empty response');
        }
        return data.response;
    }
}

// ─── OpenAI Provider ────────────────────────────────────────────

/** Curated list of OpenAI budget/mid-tier models */
const OPENAI_MODELS = [
    'gpt-4.1-nano',
    'gpt-4.1-mini',
    'gpt-5-mini',
];

/**
 * OpenAI provider — API key auth, chat completions API.
 */
export class OpenAiProvider implements AiProvider {
    readonly id = 'openai';
    readonly name = 'OpenAI';
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async isAvailable(): Promise<boolean> {
        return this.apiKey.length > 0;
    }

    async listModels(): Promise<string[]> {
        return [...OPENAI_MODELS];
    }

    async generate(prompt: string, model: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key is not configured');
        }

        const response = await requestUrl({
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            }),
        });

        const data = response.json;
        if (!data?.choices?.[0]?.message?.content) {
            throw new Error('OpenAI returned an unexpected response format');
        }
        return data.choices[0].message.content;
    }
}

// ─── Anthropic Provider ─────────────────────────────────────────

/** Curated list of Anthropic budget/mid-tier models */
const ANTHROPIC_MODELS = [
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-20250514',
];

/**
 * Anthropic provider — x-api-key header auth, Messages API.
 */
export class AnthropicProvider implements AiProvider {
    readonly id = 'anthropic';
    readonly name = 'Anthropic';
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async isAvailable(): Promise<boolean> {
        return this.apiKey.length > 0;
    }

    async listModels(): Promise<string[]> {
        return [...ANTHROPIC_MODELS];
    }

    async generate(prompt: string, model: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Anthropic API key is not configured');
        }

        const response = await requestUrl({
            url: 'https://api.anthropic.com/v1/messages',
            method: 'POST',
            contentType: 'application/json',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: 1024,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        const data = response.json;
        if (!data?.content?.[0]?.text) {
            throw new Error('Anthropic returned an unexpected response format');
        }
        return data.content[0].text;
    }
}

// ─── Google (Gemini) Provider ───────────────────────────────────

/** Curated list of Google Gemini budget/mid-tier models */
const GOOGLE_MODELS = [
    'gemini-3.0-flash',
    'gemini-2.5-flash',
];

/**
 * Google Gemini provider — API key in query parameter, generateContent API.
 */
export class GoogleProvider implements AiProvider {
    readonly id = 'google';
    readonly name = 'Google (Gemini)';
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async isAvailable(): Promise<boolean> {
        return this.apiKey.length > 0;
    }

    async listModels(): Promise<string[]> {
        return [...GOOGLE_MODELS];
    }

    async generate(prompt: string, model: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Google API key is not configured');
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

        const response = await requestUrl({
            url,
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        const data = response.json;
        if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Google Gemini returned an unexpected response format');
        }
        return data.candidates[0].content.parts[0].text;
    }
}

// ─── Custom Endpoint Provider ───────────────────────────────────

/**
 * Custom endpoint provider — user-provided URL, OpenAI-compatible format.
 */
export class CustomProvider implements AiProvider {
    readonly id = 'custom';
    readonly name = 'Custom endpoint';
    private endpointUrl: string;
    private apiKey: string;
    private modelName: string;

    constructor(endpointUrl: string, apiKey: string, modelName: string) {
        this.endpointUrl = endpointUrl;
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    async isAvailable(): Promise<boolean> {
        return this.endpointUrl.length > 0;
    }

    async listModels(): Promise<string[]> {
        // Custom endpoint uses a single user-provided model name
        return this.modelName ? [this.modelName] : [];
    }

    async generate(prompt: string, model: string): Promise<string> {
        if (!this.endpointUrl) {
            throw new Error('Custom endpoint URL is not configured');
        }

        const headers: Record<string, string> = {};
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await requestUrl({
            url: this.endpointUrl,
            method: 'POST',
            contentType: 'application/json',
            headers,
            body: JSON.stringify({
                model: model || this.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
            }),
        });

        const data = response.json;
        // Support OpenAI-compatible response format
        if (data?.choices?.[0]?.message?.content) {
            return data.choices[0].message.content;
        }
        // Fallback: try direct response field (some APIs use this)
        if (data?.response) {
            return data.response;
        }
        throw new Error('Custom endpoint returned an unexpected response format');
    }
}

// ─── AiService Orchestrator ─────────────────────────────────────

/**
 * Central AI service — manages provider registry and delegates generation.
 *
 * Usage:
 *   const service = new AiService();
 *   const provider = service.getActiveProvider(settings);
 *   if (provider) {
 *       const result = await service.generate(settings, 'Write a message...');
 *   }
 */
export class AiService {
    private providers: Map<string, AiProvider> = new Map();

    /**
     * Build provider instances from current settings.
     * Called when settings change to refresh provider configuration.
     */
    refreshProviders(settings: OrbitSettings): void {
        this.providers.clear();

        // Ollama — always registered (availability checked at runtime)
        this.providers.set('ollama', new OllamaProvider());

        // Cloud providers — use API key from settings
        this.providers.set('openai', new OpenAiProvider(settings.aiApiKey));
        this.providers.set('anthropic', new AnthropicProvider(settings.aiApiKey));
        this.providers.set('google', new GoogleProvider(settings.aiApiKey));

        // Custom — use endpoint URL + API key + model from settings
        this.providers.set('custom', new CustomProvider(
            settings.aiCustomEndpoint,
            settings.aiApiKey,
            settings.aiCustomModel,
        ));
    }

    /** Get a provider by ID */
    getProvider(id: string): AiProvider | undefined {
        return this.providers.get(id);
    }

    /**
     * Get the currently active provider based on settings.
     * Returns null if provider is 'none' or not found.
     */
    getActiveProvider(settings: OrbitSettings): AiProvider | null {
        if (settings.aiProvider === 'none') {
            return null;
        }
        return this.providers.get(settings.aiProvider) ?? null;
    }

    /**
     * Generate text using the active provider and configured model.
     * @throws Error if no provider is configured, or if generation fails
     */
    async generate(settings: OrbitSettings, prompt: string): Promise<string> {
        const provider = this.getActiveProvider(settings);
        if (!provider) {
            throw new Error('No AI provider is configured. Go to Settings → AI provider to set one up.');
        }

        const model = settings.aiModel;
        if (!model) {
            throw new Error('No AI model is selected. Go to Settings → AI provider to select a model.');
        }

        Logger.debug('AiService', `Generating with ${provider.name}, model: ${model}`);

        try {
            const result = await provider.generate(prompt, model);
            Logger.debug('AiService', `Generation complete (${result.length} chars)`);
            return result;
        } catch (error) {
            Logger.error('AiService', `Generation failed: ${error}`);
            throw error;
        }
    }
}
