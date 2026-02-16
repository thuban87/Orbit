/**
 * Unit tests for AiService — provider abstraction layer.
 *
 * Tests cover all 5 provider implementations (Ollama, OpenAI, Anthropic,
 * Google, Custom) and the AiService orchestrator.
 *
 * All HTTP calls are mocked via the `requestUrl` vi.fn() in test/mocks/obsidian.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestUrl } from 'obsidian';
import {
    OllamaProvider,
    OpenAiProvider,
    AnthropicProvider,
    GoogleProvider,
    CustomProvider,
    AiService,
    DEFAULT_PROMPT_TEMPLATE,
} from '../../../src/services/AiService';
import { createSettings } from '../../helpers/factories';

// ─── Helpers ────────────────────────────────────────────────────

/** Shortcut for mocking requestUrl resolved value */
function mockResponse(json: any, status = 200) {
    vi.mocked(requestUrl).mockResolvedValueOnce({ status, json, text: '', headers: {}, arrayBuffer: new ArrayBuffer(0) });
}

/** Shortcut for mocking requestUrl rejection */
function mockNetworkError() {
    vi.mocked(requestUrl).mockRejectedValueOnce(new Error('Network error'));
}

// ─── Reset mocks ────────────────────────────────────────────────

beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
});

// ═══════════════════════════════════════════════════════════════
// DEFAULT PROMPT TEMPLATE
// ═══════════════════════════════════════════════════════════════

describe('DEFAULT_PROMPT_TEMPLATE', () => {
    it('should contain all expected placeholders', () => {
        const placeholders = [
            '{{name}}',
            '{{category}}',
            '{{daysSinceContact}}',
            '{{socialBattery}}',
            '{{lastInteraction}}',
            '{{conversationalFuel}}',
            '{{smallTalkData}}',
        ];
        for (const p of placeholders) {
            expect(DEFAULT_PROMPT_TEMPLATE).toContain(p);
        }
    });

    it('should be a non-empty string', () => {
        expect(DEFAULT_PROMPT_TEMPLATE.length).toBeGreaterThan(50);
    });
});

// ═══════════════════════════════════════════════════════════════
// OLLAMA PROVIDER
// ═══════════════════════════════════════════════════════════════

describe('OllamaProvider', () => {
    const provider = new OllamaProvider();

    it('should have id "ollama" and name "Ollama"', () => {
        expect(provider.id).toBe('ollama');
        expect(provider.name).toBe('Ollama');
    });

    describe('isAvailable', () => {
        it('should return true when server responds 200', async () => {
            mockResponse({}, 200);
            expect(await provider.isAvailable()).toBe(true);
        });

        it('should return false when server responds non-200', async () => {
            mockResponse({}, 503);
            expect(await provider.isAvailable()).toBe(false);
        });

        it('should return false on network error', async () => {
            mockNetworkError();
            expect(await provider.isAvailable()).toBe(false);
        });
    });

    describe('listModels', () => {
        it('should return model names from /api/tags', async () => {
            mockResponse({ models: [{ name: 'llama3' }, { name: 'mistral' }] });
            const models = await provider.listModels();
            expect(models).toEqual(['llama3', 'mistral']);
        });

        it('should return empty array when models field is missing', async () => {
            mockResponse({});
            const models = await provider.listModels();
            expect(models).toEqual([]);
        });

        it('should return empty array on network error', async () => {
            mockNetworkError();
            const models = await provider.listModels();
            expect(models).toEqual([]);
        });
    });

    describe('generate', () => {
        it('should return response text', async () => {
            mockResponse({ response: 'Hey there!' });
            const result = await provider.generate('Say hi', 'llama3');
            expect(result).toBe('Hey there!');
        });

        it('should throw when response is empty', async () => {
            mockResponse({});
            await expect(provider.generate('Say hi', 'llama3'))
                .rejects.toThrow('Ollama returned an empty response');
        });

        it('should throw on network error', async () => {
            mockNetworkError();
            await expect(provider.generate('Say hi', 'llama3'))
                .rejects.toThrow('Network error');
        });

        it('should use correct URL and body format', async () => {
            mockResponse({ response: 'ok' });
            await provider.generate('Hello', 'llama3');

            expect(requestUrl).toHaveBeenCalledWith({
                url: 'http://localhost:11434/api/generate',
                method: 'POST',
                contentType: 'application/json',
                body: JSON.stringify({ model: 'llama3', prompt: 'Hello', stream: false }),
            });
        });
    });

    it('should accept custom base URL', async () => {
        const custom = new OllamaProvider('http://myserver:1234');
        mockResponse({}, 200);
        await custom.isAvailable();
        expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
            url: 'http://myserver:1234',
        }));
    });
});

// ═══════════════════════════════════════════════════════════════
// OPENAI PROVIDER
// ═══════════════════════════════════════════════════════════════

describe('OpenAiProvider', () => {
    const provider = new OpenAiProvider('sk-test-key');

    it('should have id "openai" and name "OpenAI"', () => {
        expect(provider.id).toBe('openai');
        expect(provider.name).toBe('OpenAI');
    });

    describe('isAvailable', () => {
        it('should return true when API key is set', async () => {
            expect(await provider.isAvailable()).toBe(true);
        });

        it('should return false when API key is empty', async () => {
            const noKey = new OpenAiProvider('');
            expect(await noKey.isAvailable()).toBe(false);
        });
    });

    describe('listModels', () => {
        it('should return curated model list', async () => {
            const models = await provider.listModels();
            expect(models).toContain('gpt-4.1-nano');
            expect(models).toContain('gpt-4.1-mini');
            expect(models).toContain('gpt-5-mini');
            expect(models.length).toBe(3);
        });

        it('should return a copy (not a reference)', async () => {
            const a = await provider.listModels();
            const b = await provider.listModels();
            expect(a).not.toBe(b);
            expect(a).toEqual(b);
        });
    });

    describe('generate', () => {
        it('should return generated text', async () => {
            mockResponse({
                choices: [{ message: { content: 'Hello from GPT!' } }],
            });
            const result = await provider.generate('Write something', 'gpt-4.1-nano');
            expect(result).toBe('Hello from GPT!');
        });

        it('should throw when API key is empty', async () => {
            const noKey = new OpenAiProvider('');
            await expect(noKey.generate('test', 'gpt-4.1-nano'))
                .rejects.toThrow('OpenAI API key is not configured');
        });

        it('should throw on unexpected response format', async () => {
            mockResponse({ choices: [] });
            await expect(provider.generate('test', 'gpt-4.1-nano'))
                .rejects.toThrow('OpenAI returned an unexpected response format');
        });

        it('should send correct headers and body', async () => {
            mockResponse({ choices: [{ message: { content: 'ok' } }] });
            await provider.generate('Hello', 'gpt-4.1-mini');

            expect(requestUrl).toHaveBeenCalledWith({
                url: 'https://api.openai.com/v1/chat/completions',
                method: 'POST',
                contentType: 'application/json',
                headers: { 'Authorization': 'Bearer sk-test-key' },
                body: JSON.stringify({
                    model: 'gpt-4.1-mini',
                    messages: [{ role: 'user', content: 'Hello' }],
                    temperature: 0.7,
                }),
            });
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// ANTHROPIC PROVIDER
// ═══════════════════════════════════════════════════════════════

describe('AnthropicProvider', () => {
    const provider = new AnthropicProvider('sk-ant-test');

    it('should have id "anthropic" and name "Anthropic"', () => {
        expect(provider.id).toBe('anthropic');
        expect(provider.name).toBe('Anthropic');
    });

    describe('isAvailable', () => {
        it('should return true when API key is set', async () => {
            expect(await provider.isAvailable()).toBe(true);
        });

        it('should return false when API key is empty', async () => {
            const noKey = new AnthropicProvider('');
            expect(await noKey.isAvailable()).toBe(false);
        });
    });

    describe('listModels', () => {
        it('should return curated model list', async () => {
            const models = await provider.listModels();
            expect(models).toContain('claude-haiku-4-5-20251001');
            expect(models).toContain('claude-sonnet-4-20250514');
            expect(models.length).toBe(2);
        });
    });

    describe('generate', () => {
        it('should return generated text', async () => {
            mockResponse({
                content: [{ text: 'Hello from Claude!' }],
            });
            const result = await provider.generate('Write something', 'claude-haiku-4-5-20251001');
            expect(result).toBe('Hello from Claude!');
        });

        it('should throw when API key is empty', async () => {
            const noKey = new AnthropicProvider('');
            await expect(noKey.generate('test', 'claude-haiku-4-5-20251001'))
                .rejects.toThrow('Anthropic API key is not configured');
        });

        it('should throw on unexpected response format', async () => {
            mockResponse({ content: [] });
            await expect(provider.generate('test', 'claude-haiku-4-5-20251001'))
                .rejects.toThrow('Anthropic returned an unexpected response format');
        });

        it('should send correct headers (x-api-key + anthropic-version)', async () => {
            mockResponse({ content: [{ text: 'ok' }] });
            await provider.generate('Hello', 'claude-sonnet-4-20250514');

            expect(requestUrl).toHaveBeenCalledWith({
                url: 'https://api.anthropic.com/v1/messages',
                method: 'POST',
                contentType: 'application/json',
                headers: {
                    'x-api-key': 'sk-ant-test',
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1024,
                    messages: [{ role: 'user', content: 'Hello' }],
                }),
            });
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// GOOGLE (GEMINI) PROVIDER
// ═══════════════════════════════════════════════════════════════

describe('GoogleProvider', () => {
    const provider = new GoogleProvider('google-test-key');

    it('should have id "google" and name "Google (Gemini)"', () => {
        expect(provider.id).toBe('google');
        expect(provider.name).toBe('Google (Gemini)');
    });

    describe('isAvailable', () => {
        it('should return true when API key is set', async () => {
            expect(await provider.isAvailable()).toBe(true);
        });

        it('should return false when API key is empty', async () => {
            const noKey = new GoogleProvider('');
            expect(await noKey.isAvailable()).toBe(false);
        });
    });

    describe('listModels', () => {
        it('should return curated model list', async () => {
            const models = await provider.listModels();
            expect(models).toContain('gemini-3.0-flash');
            expect(models).toContain('gemini-2.5-flash');
            expect(models.length).toBe(2);
        });
    });

    describe('generate', () => {
        it('should return generated text', async () => {
            mockResponse({
                candidates: [{ content: { parts: [{ text: 'Hello from Gemini!' }] } }],
            });
            const result = await provider.generate('Write something', 'gemini-3.0-flash');
            expect(result).toBe('Hello from Gemini!');
        });

        it('should throw when API key is empty', async () => {
            const noKey = new GoogleProvider('');
            await expect(noKey.generate('test', 'gemini-3.0-flash'))
                .rejects.toThrow('Google API key is not configured');
        });

        it('should throw on unexpected response format', async () => {
            mockResponse({ candidates: [] });
            await expect(provider.generate('test', 'gemini-3.0-flash'))
                .rejects.toThrow('Google Gemini returned an unexpected response format');
        });

        it('should include API key in URL query parameter', async () => {
            mockResponse({
                candidates: [{ content: { parts: [{ text: 'ok' }] } }],
            });
            await provider.generate('Hello', 'gemini-2.5-flash');

            expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=google-test-key',
            }));
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// CUSTOM PROVIDER
// ═══════════════════════════════════════════════════════════════

describe('CustomProvider', () => {
    const provider = new CustomProvider(
        'https://my-api.example.com/v1/chat/completions',
        'custom-key',
        'my-model'
    );

    it('should have id "custom" and name "Custom endpoint"', () => {
        expect(provider.id).toBe('custom');
        expect(provider.name).toBe('Custom endpoint');
    });

    describe('isAvailable', () => {
        it('should return true when endpoint URL is set', async () => {
            expect(await provider.isAvailable()).toBe(true);
        });

        it('should return false when endpoint URL is empty', async () => {
            const noUrl = new CustomProvider('', 'key', 'model');
            expect(await noUrl.isAvailable()).toBe(false);
        });
    });

    describe('listModels', () => {
        it('should return the user-provided model name', async () => {
            const models = await provider.listModels();
            expect(models).toEqual(['my-model']);
        });

        it('should return empty array when model name is empty', async () => {
            const noModel = new CustomProvider('https://api.example.com', 'key', '');
            const models = await noModel.listModels();
            expect(models).toEqual([]);
        });
    });

    describe('generate', () => {
        it('should return text from OpenAI-compatible response', async () => {
            mockResponse({
                choices: [{ message: { content: 'Custom response!' } }],
            });
            const result = await provider.generate('Hello', 'my-model');
            expect(result).toBe('Custom response!');
        });

        it('should return text from response field (fallback format)', async () => {
            mockResponse({ response: 'Fallback response!' });
            const result = await provider.generate('Hello', 'my-model');
            expect(result).toBe('Fallback response!');
        });

        it('should throw when endpoint URL is empty', async () => {
            const noUrl = new CustomProvider('', 'key', 'model');
            await expect(noUrl.generate('test', 'model'))
                .rejects.toThrow('Custom endpoint URL is not configured');
        });

        it('should throw on unexpected response format', async () => {
            mockResponse({ unexpected: true });
            await expect(provider.generate('test', 'my-model'))
                .rejects.toThrow('Custom endpoint returned an unexpected response format');
        });

        it('should include Authorization header when API key is set', async () => {
            mockResponse({ choices: [{ message: { content: 'ok' } }] });
            await provider.generate('Hello', 'my-model');

            expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
                headers: { 'Authorization': 'Bearer custom-key' },
            }));
        });

        it('should omit Authorization header when no API key', async () => {
            const noKeyProvider = new CustomProvider('https://api.example.com', '', 'model');
            mockResponse({ choices: [{ message: { content: 'ok' } }] });
            await noKeyProvider.generate('Hello', 'model');

            expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
                headers: {},
            }));
        });

        it('should use modelName as fallback when model param is empty', async () => {
            mockResponse({ choices: [{ message: { content: 'ok' } }] });
            await provider.generate('Hello', '');

            const body = JSON.parse(vi.mocked(requestUrl).mock.calls[0][0].body);
            expect(body.model).toBe('my-model');
        });
    });
});

// ═══════════════════════════════════════════════════════════════
// AI SERVICE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

describe('AiService', () => {
    let service: AiService;

    beforeEach(() => {
        service = new AiService();
    });

    describe('refreshProviders', () => {
        it('should register all 5 providers', () => {
            const settings = createSettings({ aiProvider: 'openai', aiApiKey: 'test-key' });
            service.refreshProviders(settings);

            expect(service.getProvider('ollama')).toBeDefined();
            expect(service.getProvider('openai')).toBeDefined();
            expect(service.getProvider('anthropic')).toBeDefined();
            expect(service.getProvider('google')).toBeDefined();
            expect(service.getProvider('custom')).toBeDefined();
        });

        it('should clear and rebuild providers on each call', () => {
            const settings1 = createSettings({ aiApiKey: 'key-1' });
            service.refreshProviders(settings1);
            const provider1 = service.getProvider('openai');

            const settings2 = createSettings({ aiApiKey: 'key-2' });
            service.refreshProviders(settings2);
            const provider2 = service.getProvider('openai');

            // Should be a new instance after refresh
            expect(provider1).not.toBe(provider2);
        });

        it('should return undefined for unknown provider ID', () => {
            const settings = createSettings();
            service.refreshProviders(settings);
            expect(service.getProvider('nonexistent')).toBeUndefined();
        });
    });

    describe('getActiveProvider', () => {
        it('should return null when provider is "none"', () => {
            const settings = createSettings({ aiProvider: 'none' });
            service.refreshProviders(settings);

            expect(service.getActiveProvider(settings)).toBeNull();
        });

        it('should return the correct provider when set', () => {
            const settings = createSettings({ aiProvider: 'openai', aiApiKey: 'key' });
            service.refreshProviders(settings);

            const active = service.getActiveProvider(settings);
            expect(active).toBeDefined();
            expect(active!.id).toBe('openai');
        });

        it('should return null for unregistered provider type', () => {
            const settings = createSettings();
            service.refreshProviders(settings);
            // Force an unknown provider type
            (settings as any).aiProvider = 'unknown_provider';

            expect(service.getActiveProvider(settings)).toBeNull();
        });
    });

    describe('generate', () => {
        it('should throw when no provider is configured', async () => {
            const settings = createSettings({ aiProvider: 'none' });
            service.refreshProviders(settings);

            await expect(service.generate(settings, 'Hello'))
                .rejects.toThrow('No AI provider is configured');
        });

        it('should throw when no model is selected', async () => {
            const settings = createSettings({
                aiProvider: 'openai',
                aiApiKey: 'key',
                aiModel: '',
            });
            service.refreshProviders(settings);

            await expect(service.generate(settings, 'Hello'))
                .rejects.toThrow('No AI model is selected');
        });

        it('should delegate to the active provider', async () => {
            mockResponse({
                choices: [{ message: { content: 'Generated text!' } }],
            });

            const settings = createSettings({
                aiProvider: 'openai',
                aiApiKey: 'test-key',
                aiModel: 'gpt-4.1-nano',
            });
            service.refreshProviders(settings);

            const result = await service.generate(settings, 'Write something');
            expect(result).toBe('Generated text!');
        });

        it('should propagate provider errors', async () => {
            mockNetworkError();

            const settings = createSettings({
                aiProvider: 'openai',
                aiApiKey: 'test-key',
                aiModel: 'gpt-4.1-nano',
            });
            service.refreshProviders(settings);

            await expect(service.generate(settings, 'Hello'))
                .rejects.toThrow('Network error');
        });
    });
});
