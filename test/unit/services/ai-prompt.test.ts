/**
 * Unit tests for extractContext and assemblePrompt — prompt assembly pipeline.
 *
 * Tests the context extraction from OrbitContact + file content,
 * and the dynamic prompt assembly with {{placeholder}} replacement.
 */
import { describe, it, expect } from 'vitest';
import { extractContext, assemblePrompt } from '../../../src/services/AiService';
import { createOrbitContact } from '../../helpers/factories';

// ─── Sample file content ────────────────────────────────────────

const SAMPLE_FILE = `---
category: Friends
frequency: Weekly
---
# Marcus Chen

## 🗣️ Conversational Fuel
**Last Thing We Talked About:**
- His startup DevPulse got into TechStars
- We debated Rust vs Go

**Safe Topics:**
- Board games
- Tech

## 🧠 The Small Talk Data
**Pets:**
- Apollo — golden retriever

## 🎁 The Gift Locker
- Wingspan expansion packs
`;

// ═══════════════════════════════════════════════════════════════
// extractContext
// ═══════════════════════════════════════════════════════════════

describe('extractContext', () => {
    it('should extract name from contact', () => {
        const contact = createOrbitContact({ name: 'Marcus Chen' });
        const ctx = extractContext(contact, SAMPLE_FILE);
        expect(ctx.name).toBe('Marcus Chen');
    });

    it('should extract category with fallback to Uncategorized', () => {
        const contact = createOrbitContact({ category: 'Friends' });
        expect(extractContext(contact, SAMPLE_FILE).category).toBe('Friends');

        const noCategory = createOrbitContact({});
        // Factory defaults category to 'Friends' via ??, so we must explicitly override
        (noCategory as any).category = undefined;
        expect(extractContext(noCategory, SAMPLE_FILE).category).toBe('Uncategorized');
    });

    it('should extract daysSinceContact', () => {
        const contact = createOrbitContact({ daysSinceContact: 14 });
        const ctx = extractContext(contact, SAMPLE_FILE);
        expect(ctx.daysSinceContact).toBe(14);
    });

    it('should extract socialBattery with fallback to Unknown', () => {
        const contact = createOrbitContact({ socialBattery: 'Charger' });
        expect(extractContext(contact, SAMPLE_FILE).socialBattery).toBe('Charger');

        const noBattery = createOrbitContact({ socialBattery: undefined });
        expect(extractContext(noBattery, SAMPLE_FILE).socialBattery).toBe('Unknown');
    });

    it('should format lastInteraction with date and type', () => {
        const contact = createOrbitContact({
            lastContact: new Date('2026-02-02T12:00:00'),
            lastInteraction: 'text',
        });
        const ctx = extractContext(contact, SAMPLE_FILE);
        expect(ctx.lastInteraction).toBe('2026-02-02 (text)');
    });

    it('should handle null lastContact', () => {
        const contact = createOrbitContact({ lastContact: null });
        const ctx = extractContext(contact, SAMPLE_FILE);
        expect(ctx.lastInteraction).toBe('No previous interaction recorded');
    });

    it('should default lastInteraction type to "unknown"', () => {
        const contact = createOrbitContact({
            lastContact: new Date('2026-01-15'),
            lastInteraction: undefined,
        });
        const ctx = extractContext(contact, SAMPLE_FILE);
        expect(ctx.lastInteraction).toContain('(unknown)');
    });
});

// ═══════════════════════════════════════════════════════════════
// assemblePrompt
// ═══════════════════════════════════════════════════════════════

describe('assemblePrompt', () => {
    const baseContext = {
        name: 'Marcus Chen',
        category: 'Friends',
        daysSinceContact: 14,
        socialBattery: 'Charger',
        lastInteraction: '2026-02-02 (text)',
    };

    describe('known field replacement', () => {
        it('should replace {{name}}', () => {
            const template = 'Hello {{name}}!';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toBe('Hello Marcus Chen!');
        });

        it('should replace {{category}}', () => {
            const template = 'Category: {{category}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toBe('Category: Friends');
        });

        it('should replace {{daysSinceContact}}', () => {
            const template = 'Days: {{daysSinceContact}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toBe('Days: 14');
        });

        it('should replace {{socialBattery}}', () => {
            const template = 'Battery: {{socialBattery}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toBe('Battery: Charger');
        });

        it('should replace {{lastInteraction}}', () => {
            const template = 'Last: {{lastInteraction}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toBe('Last: 2026-02-02 (text)');
        });

        it('should replace multiple occurrences of the same placeholder', () => {
            const template = '{{name}} is {{name}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toBe('Marcus Chen is Marcus Chen');
        });
    });

    describe('dynamic section replacement', () => {
        it('should extract {{Conversational Fuel}} from file content', () => {
            const template = 'Fuel:\n{{Conversational Fuel}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toContain('DevPulse');
            expect(result).toContain('Board games');
        });

        it('should extract {{Small Talk Data}} from file content', () => {
            const template = 'Data:\n{{Small Talk Data}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toContain('Apollo');
        });

        it('should extract {{Gift Locker}} from file content', () => {
            const template = 'Gifts:\n{{Gift Locker}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toContain('Wingspan');
        });

        it('should return "None available" for missing sections', () => {
            const template = 'Notes:\n{{Personal Notes}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toContain('None available');
        });

        it('should handle multiple dynamic sections in one template', () => {
            const template = 'Fuel: {{Conversational Fuel}}\n\nGifts: {{Gift Locker}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toContain('DevPulse');
            expect(result).toContain('Wingspan');
        });
    });

    describe('mixed known + dynamic replacement', () => {
        it('should replace both known fields and dynamic sections', () => {
            const template = 'Message for {{name}} ({{category}}):\n{{Conversational Fuel}}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toContain('Marcus Chen');
            expect(result).toContain('Friends');
            expect(result).toContain('DevPulse');
        });
    });

    describe('edge cases', () => {
        it('should handle template with no placeholders', () => {
            const template = 'Just a plain string';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toBe('Just a plain string');
        });

        it('should handle empty file content', () => {
            const template = '{{Conversational Fuel}}';
            const result = assemblePrompt(template, baseContext, '');
            expect(result).toBe('None available');
        });

        it('should handle placeholder with extra whitespace', () => {
            const template = '{{ Conversational Fuel }}';
            const result = assemblePrompt(template, baseContext, SAMPLE_FILE);
            expect(result).toContain('DevPulse');
        });
    });
});
