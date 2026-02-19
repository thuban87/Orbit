/**
 * Integration tests for the AI suggestion flow.
 *
 * Tests the end-to-end pipeline: contact file → extractContext → assemblePrompt → generate.
 * Also tests per-provider API key support.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestUrl } from 'obsidian';
import {
    AiService,
    extractContext,
    assemblePrompt,
    DEFAULT_PROMPT_TEMPLATE,
} from '../../src/services/AiService';
import { createOrbitContact, createSettings } from '../helpers/factories';

// ─── Helpers ────────────────────────────────────────────────────

function mockResponse(json: any, status = 200) {
    vi.mocked(requestUrl).mockResolvedValueOnce({ status, json, text: '', headers: {}, arrayBuffer: new ArrayBuffer(0) });
}

beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
});

// ─── Sample file content ────────────────────────────────────────

const RICH_CONTACT_FILE = `---
category: Friends
frequency: Weekly
last_contact: 2026-02-02
---
# Marcus Chen

## 🗣️ Conversational Fuel
**Last Thing We Talked About:**
- His startup DevPulse got into TechStars
- We debated Rust vs Go

**Safe Topics:**
- Board games
- Chicago food scene

## 🧠 The Small Talk Data
**Pets:**
- Apollo — golden retriever, 3 years old

**Current "Big Thing":**
- Training for the Chicago Marathon

## 🎁 The Gift Locker
- Wingspan expansion packs
- Nice coffee

## 📝 Interaction Log
- **2026-02-02**: Texted about the Super Bowl
`;

// ═══════════════════════════════════════════════════════════════
// FULL PIPELINE: file → context → prompt → generate
// ═══════════════════════════════════════════════════════════════

describe('AI suggest — full pipeline', () => {
    it('should produce a populated prompt from a rich contact file', () => {
        const contact = createOrbitContact({
            name: 'Marcus Chen',
            category: 'Friends',
            daysSinceContact: 14,
            socialBattery: 'Charger',
            lastContact: new Date('2026-02-02T12:00:00'),
            lastInteraction: 'text',
        });

        const context = extractContext(contact, RICH_CONTACT_FILE);
        const prompt = assemblePrompt(DEFAULT_PROMPT_TEMPLATE, context, RICH_CONTACT_FILE);

        // Known fields should be populated
        expect(prompt).toContain('Marcus Chen');
        expect(prompt).toContain('Friends');
        expect(prompt).toContain('14');
        expect(prompt).toContain('Charger');
        expect(prompt).toContain('2026-02-02 (text)');

        // Dynamic sections should be populated (NOT "None available")
        expect(prompt).toContain('DevPulse');
        expect(prompt).toContain('Board games');
        expect(prompt).toContain('Apollo');
        expect(prompt).toContain('Chicago Marathon');

        // Should NOT contain raw placeholders
        expect(prompt).not.toContain('{{');
        expect(prompt).not.toContain('}}');
    });

    it('should handle a minimal contact file gracefully', () => {
        const bareFile = `---
category: Work
---
# Jane Doe
`;
        const contact = createOrbitContact({
            name: 'Jane Doe',
            category: 'Work',
            daysSinceContact: 30,
            lastContact: null,
        });

        const context = extractContext(contact, bareFile);
        const prompt = assemblePrompt(DEFAULT_PROMPT_TEMPLATE, context, bareFile);

        expect(prompt).toContain('Jane Doe');
        expect(prompt).toContain('Work');
        expect(prompt).toContain('None available');
        expect(prompt).toContain('No previous interaction recorded');
    });

    it('should generate text through the full service + provider stack', async () => {
        const service = new AiService();
        const settings = createSettings({
            aiProvider: 'openai',
            aiApiKey: 'test-key',
            aiModel: 'gpt-4.1-nano',
            aiPromptTemplate: DEFAULT_PROMPT_TEMPLATE,
        });
        service.refreshProviders(settings);

        const contact = createOrbitContact({
            name: 'Marcus Chen',
            category: 'Friends',
            daysSinceContact: 14,
            socialBattery: 'Charger',
            lastContact: new Date('2026-02-02T12:00:00'),
            lastInteraction: 'text',
        });

        const context = extractContext(contact, RICH_CONTACT_FILE);
        const prompt = assemblePrompt(settings.aiPromptTemplate, context, RICH_CONTACT_FILE);

        mockResponse({
            choices: [{ message: { content: 'Hey Marcus! How is DevPulse going since TechStars?' } }],
        });

        const result = await service.generate(settings, prompt);
        expect(result).toBe('Hey Marcus! How is DevPulse going since TechStars?');
    });
});

// ═══════════════════════════════════════════════════════════════
// PER-PROVIDER API KEYS
// ═══════════════════════════════════════════════════════════════

describe('Per-provider API keys', () => {
    let service: AiService;

    beforeEach(() => {
        service = new AiService();
    });

    it('should use per-provider key from aiApiKeys when available', async () => {
        const settings = createSettings({
            aiProvider: 'openai',
            aiApiKey: 'legacy-key',
            aiApiKeys: { openai: 'openai-specific-key' },
            aiModel: 'gpt-4.1-nano',
        });
        service.refreshProviders(settings);

        mockResponse({
            choices: [{ message: { content: 'ok' } }],
        });

        await service.generate(settings, 'Hello');

        // Should use the per-provider key, not the legacy key
        expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
            headers: expect.objectContaining({
                'Authorization': 'Bearer openai-specific-key',
            }),
        }));
    });

    it('should fall back to legacy aiApiKey when no per-provider key exists', async () => {
        const settings = createSettings({
            aiProvider: 'openai',
            aiApiKey: 'legacy-key',
            aiApiKeys: {},
            aiModel: 'gpt-4.1-nano',
        });
        service.refreshProviders(settings);

        mockResponse({
            choices: [{ message: { content: 'ok' } }],
        });

        await service.generate(settings, 'Hello');

        expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
            headers: expect.objectContaining({
                'Authorization': 'Bearer legacy-key',
            }),
        }));
    });

    it('should store different keys for different providers', () => {
        const settings = createSettings({
            aiApiKeys: {
                openai: 'sk-openai',
                anthropic: 'sk-ant-key',
                google: 'google-ai-key',
            },
        });
        service.refreshProviders(settings);

        // Each provider should be a distinct instance (we can't directly
        // check the key, but we can verify the providers are registered)
        expect(service.getProvider('openai')).toBeDefined();
        expect(service.getProvider('anthropic')).toBeDefined();
        expect(service.getProvider('google')).toBeDefined();
    });

    it('should use provider-specific key for Anthropic', async () => {
        const settings = createSettings({
            aiProvider: 'anthropic',
            aiApiKey: 'legacy-key',
            aiApiKeys: { anthropic: 'sk-ant-specific' },
            aiModel: 'claude-haiku-4-5-20251001',
        });
        service.refreshProviders(settings);

        mockResponse({
            content: [{ text: 'ok' }],
        });

        await service.generate(settings, 'Hello');

        expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
            headers: expect.objectContaining({
                'x-api-key': 'sk-ant-specific',
            }),
        }));
    });

    it('should use provider-specific key for Google in URL', async () => {
        const settings = createSettings({
            aiProvider: 'google',
            aiApiKey: 'legacy-key',
            aiApiKeys: { google: 'google-specific-key' },
            aiModel: 'gemini-2.5-flash',
        });
        service.refreshProviders(settings);

        mockResponse({
            candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        });

        await service.generate(settings, 'Hello');

        expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({
            url: expect.stringContaining('key=google-specific-key'),
        }));
    });
});

// ═══════════════════════════════════════════════════════════════
// CUSTOM TEMPLATE SUPPORT
// ═══════════════════════════════════════════════════════════════

describe('Custom template with dynamic sections', () => {
    it('should allow users to add their own section placeholders', () => {
        const customTemplate = `Write a message for {{name}}.

Gift ideas: {{Gift Locker}}

Recent history: {{Interaction Log}}`;

        const contact = createOrbitContact({ name: 'Marcus Chen' });
        const context = extractContext(contact, RICH_CONTACT_FILE);
        const prompt = assemblePrompt(customTemplate, context, RICH_CONTACT_FILE);

        expect(prompt).toContain('Marcus Chen');
        expect(prompt).toContain('Wingspan expansion packs');
        expect(prompt).toContain('Texted about the Super Bowl');
    });

    it('should handle templates that reference only custom sections', () => {
        const template = 'Gift ideas for {{name}}:\n{{Gift Locker}}';
        const contact = createOrbitContact({ name: 'Marcus' });
        const context = extractContext(contact, RICH_CONTACT_FILE);
        const prompt = assemblePrompt(template, context, RICH_CONTACT_FILE);

        expect(prompt).toContain('Marcus');
        expect(prompt).toContain('Wingspan');
        expect(prompt).not.toContain('{{');
    });
});
