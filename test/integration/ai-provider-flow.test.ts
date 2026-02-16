/**
 * Integration tests for the AI provider flow.
 *
 * Tests the end-to-end flow: settings → AiService → provider → generation.
 * Verifies that the orchestrator correctly wires up providers and delegates.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestUrl } from 'obsidian';
import { AiService } from '../../src/services/AiService';
import { createSettings } from '../helpers/factories';

// ─── Helpers ────────────────────────────────────────────────────

function mockResponse(json: any, status = 200) {
    vi.mocked(requestUrl).mockResolvedValueOnce({ status, json, text: '', headers: {}, arrayBuffer: new ArrayBuffer(0) });
}

function mockNetworkError() {
    vi.mocked(requestUrl).mockRejectedValueOnce(new Error('Network error'));
}

beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
});

// ═══════════════════════════════════════════════════════════════
// PROVIDER CONFIGURATION FLOW
// ═══════════════════════════════════════════════════════════════

describe('AI provider configuration flow', () => {
    let service: AiService;

    beforeEach(() => {
        service = new AiService();
    });

    it('should start with no providers before refreshProviders is called', () => {
        expect(service.getProvider('openai')).toBeUndefined();
    });

    it('should configure all providers after refreshProviders', () => {
        const settings = createSettings({ aiProvider: 'openai', aiApiKey: 'key' });
        service.refreshProviders(settings);

        const ids = ['ollama', 'openai', 'anthropic', 'google', 'custom'];
        for (const id of ids) {
            expect(service.getProvider(id)).toBeDefined();
        }
    });

    it('should switch active provider when settings change', () => {
        const settings = createSettings({ aiProvider: 'openai', aiApiKey: 'key' });
        service.refreshProviders(settings);
        expect(service.getActiveProvider(settings)?.id).toBe('openai');

        // Switch to Anthropic
        const newSettings = createSettings({ aiProvider: 'anthropic', aiApiKey: 'key' });
        service.refreshProviders(newSettings);
        expect(service.getActiveProvider(newSettings)?.id).toBe('anthropic');
    });

    it('should disable AI when provider is set to "none"', () => {
        const settings = createSettings({ aiProvider: 'none' });
        service.refreshProviders(settings);
        expect(service.getActiveProvider(settings)).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════
// END-TO-END GENERATION FLOW
// ═══════════════════════════════════════════════════════════════

describe('AI generation flow', () => {
    let service: AiService;

    beforeEach(() => {
        service = new AiService();
    });

    it('should generate text via OpenAI provider', async () => {
        const settings = createSettings({
            aiProvider: 'openai',
            aiApiKey: 'test-key',
            aiModel: 'gpt-4.1-nano',
        });
        service.refreshProviders(settings);

        mockResponse({
            choices: [{ message: { content: 'Hey, how are you?' } }],
        });

        const result = await service.generate(settings, 'Write a check-in message');
        expect(result).toBe('Hey, how are you?');
    });

    it('should generate text via Anthropic provider', async () => {
        const settings = createSettings({
            aiProvider: 'anthropic',
            aiApiKey: 'test-key',
            aiModel: 'claude-haiku-4-5-20251001',
        });
        service.refreshProviders(settings);

        mockResponse({
            content: [{ text: 'Hi there, checking in!' }],
        });

        const result = await service.generate(settings, 'Write a check-in message');
        expect(result).toBe('Hi there, checking in!');
    });

    it('should generate text via Google provider', async () => {
        const settings = createSettings({
            aiProvider: 'google',
            aiApiKey: 'test-key',
            aiModel: 'gemini-3.0-flash',
        });
        service.refreshProviders(settings);

        mockResponse({
            candidates: [{ content: { parts: [{ text: 'Hello from Gemini!' }] } }],
        });

        const result = await service.generate(settings, 'Write a check-in message');
        expect(result).toBe('Hello from Gemini!');
    });

    it('should generate text via Ollama provider', async () => {
        const settings = createSettings({
            aiProvider: 'ollama',
            aiModel: 'llama3',
        });
        service.refreshProviders(settings);

        mockResponse({ response: 'Hey buddy!' });

        const result = await service.generate(settings, 'Write a check-in message');
        expect(result).toBe('Hey buddy!');
    });

    it('should generate text via Custom provider', async () => {
        const settings = createSettings({
            aiProvider: 'custom',
            aiApiKey: 'custom-key',
            aiModel: 'my-model',
            aiCustomEndpoint: 'https://my-api.example.com/chat',
            aiCustomModel: 'my-model',
        });
        service.refreshProviders(settings);

        mockResponse({
            choices: [{ message: { content: 'Custom response!' } }],
        });

        const result = await service.generate(settings, 'Write a check-in message');
        expect(result).toBe('Custom response!');
    });

    it('should fail gracefully when no provider is configured', async () => {
        const settings = createSettings({ aiProvider: 'none' });
        service.refreshProviders(settings);

        await expect(service.generate(settings, 'Hello'))
            .rejects.toThrow('No AI provider is configured');
    });

    it('should fail gracefully when no model is selected', async () => {
        const settings = createSettings({
            aiProvider: 'openai',
            aiApiKey: 'key',
            aiModel: '',
        });
        service.refreshProviders(settings);

        await expect(service.generate(settings, 'Hello'))
            .rejects.toThrow('No AI model is selected');
    });

    it('should propagate network errors from providers', async () => {
        const settings = createSettings({
            aiProvider: 'openai',
            aiApiKey: 'key',
            aiModel: 'gpt-4.1-nano',
        });
        service.refreshProviders(settings);

        mockNetworkError();

        await expect(service.generate(settings, 'Hello'))
            .rejects.toThrow('Network error');
    });

    it('should propagate API format errors from providers', async () => {
        const settings = createSettings({
            aiProvider: 'openai',
            aiApiKey: 'key',
            aiModel: 'gpt-4.1-nano',
        });
        service.refreshProviders(settings);

        mockResponse({ unexpected: true });

        await expect(service.generate(settings, 'Hello'))
            .rejects.toThrow('OpenAI returned an unexpected response format');
    });
});

// ═══════════════════════════════════════════════════════════════
// PROVIDER AVAILABILITY CHECKS
// ═══════════════════════════════════════════════════════════════

describe('Provider availability checks', () => {
    let service: AiService;

    beforeEach(() => {
        service = new AiService();
    });

    it('should report Ollama available when server responds', async () => {
        const settings = createSettings({ aiProvider: 'ollama' });
        service.refreshProviders(settings);

        mockResponse({}, 200);
        const provider = service.getProvider('ollama');
        expect(await provider!.isAvailable()).toBe(true);
    });

    it('should report Ollama unavailable when server is down', async () => {
        const settings = createSettings({ aiProvider: 'ollama' });
        service.refreshProviders(settings);

        mockNetworkError();
        const provider = service.getProvider('ollama');
        expect(await provider!.isAvailable()).toBe(false);
    });

    it('should report cloud providers available when API key is set', async () => {
        const settings = createSettings({ aiApiKey: 'valid-key' });
        service.refreshProviders(settings);

        for (const id of ['openai', 'anthropic', 'google']) {
            const provider = service.getProvider(id);
            expect(await provider!.isAvailable()).toBe(true);
        }
    });

    it('should report cloud providers unavailable when API key is empty', async () => {
        const settings = createSettings({ aiApiKey: '' });
        service.refreshProviders(settings);

        for (const id of ['openai', 'anthropic', 'google']) {
            const provider = service.getProvider(id);
            expect(await provider!.isAvailable()).toBe(false);
        }
    });

    it('should report custom provider available when endpoint is set', async () => {
        const settings = createSettings({
            aiCustomEndpoint: 'https://example.com',
        });
        service.refreshProviders(settings);

        const provider = service.getProvider('custom');
        expect(await provider!.isAvailable()).toBe(true);
    });

    it('should report custom provider unavailable when endpoint is empty', async () => {
        const settings = createSettings({ aiCustomEndpoint: '' });
        service.refreshProviders(settings);

        const provider = service.getProvider('custom');
        expect(await provider!.isAvailable()).toBe(false);
    });
});
