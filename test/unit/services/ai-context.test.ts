/**
 * Unit tests for extractSection — markdown section extraction.
 *
 * Tests the function that pulls content from a contact's markdown
 * file by matching ## headings, including emoji-prefixed headings.
 */
import { describe, it, expect } from 'vitest';
import { extractSection } from '../../../src/services/AiService';

// ─── Sample markdown content (mimics a real contact file) ───────

const SAMPLE_CONTENT = `---
category: Friends
frequency: Weekly
---
# Marcus Chen

## 🗣️ Conversational Fuel
**Last Thing We Talked About:**
- His startup DevPulse got into TechStars
- We debated Rust vs Go

**Safe Topics (Go-To):**
- Tech and programming
- Board games

**⛔ Off-Limits / Triggers:**
- His ex (messy breakup)

## 🧠 The Small Talk Data
**Key People (Partner/Kids):**
- Sister: Lily — getting married in April

**Pets:**
- Apollo — golden retriever

## 🎁 The Gift Locker
- Wingspan expansion packs
- Nice coffee

## 📝 Interaction Log
- **2026-01-05**: Game night at his place
- **2026-02-02**: Texted about the Super Bowl
`;

// ═══════════════════════════════════════════════════════════════
// extractSection
// ═══════════════════════════════════════════════════════════════

describe('extractSection', () => {
    describe('basic matching', () => {
        it('should extract content between two ## headings', () => {
            const result = extractSection(SAMPLE_CONTENT, 'Gift Locker');
            expect(result).toContain('Wingspan expansion packs');
            expect(result).toContain('Nice coffee');
        });

        it('should extract the last section (no following ## heading)', () => {
            const result = extractSection(SAMPLE_CONTENT, 'Interaction Log');
            expect(result).toContain('Game night at his place');
            expect(result).toContain('Texted about the Super Bowl');
        });

        it('should return "None available" for non-existent section', () => {
            const result = extractSection(SAMPLE_CONTENT, 'Nonexistent Section');
            expect(result).toBe('None available');
        });
    });

    describe('emoji-prefixed headings', () => {
        it('should match through emoji prefix: 🗣️ Conversational Fuel', () => {
            const result = extractSection(SAMPLE_CONTENT, 'Conversational Fuel');
            expect(result).toContain('DevPulse got into TechStars');
            expect(result).toContain('Tech and programming');
        });

        it('should match through emoji + extra word: 🧠 The Small Talk Data', () => {
            const result = extractSection(SAMPLE_CONTENT, 'Small Talk Data');
            expect(result).toContain('Lily');
            expect(result).toContain('Apollo');
        });

        it('should match through emoji: 🎁 The Gift Locker', () => {
            const result = extractSection(SAMPLE_CONTENT, 'Gift Locker');
            expect(result).toContain('Wingspan');
        });

        it('should match through emoji: 📝 Interaction Log', () => {
            const result = extractSection(SAMPLE_CONTENT, 'Interaction Log');
            expect(result).toContain('2026-01-05');
        });
    });

    describe('section boundaries', () => {
        it('should not bleed Conversational Fuel into Small Talk Data', () => {
            const fuel = extractSection(SAMPLE_CONTENT, 'Conversational Fuel');
            expect(fuel).not.toContain('Apollo');
            expect(fuel).not.toContain('Lily');
        });

        it('should not bleed Small Talk Data into Gift Locker', () => {
            const smallTalk = extractSection(SAMPLE_CONTENT, 'Small Talk Data');
            expect(smallTalk).not.toContain('Wingspan');
        });

        it('should not include frontmatter in any section', () => {
            const fuel = extractSection(SAMPLE_CONTENT, 'Conversational Fuel');
            expect(fuel).not.toContain('category:');
            expect(fuel).not.toContain('frequency:');
        });
    });

    describe('edge cases', () => {
        it('should return "None available" for empty content', () => {
            expect(extractSection('', 'Anything')).toBe('None available');
        });

        it('should return "None available" for content with no headings', () => {
            const noHeadings = 'Just some text\nwith no headings at all';
            expect(extractSection(noHeadings, 'Missing')).toBe('None available');
        });

        it('should return "None available" for section with empty body', () => {
            const emptySection = '## Empty Section\n\n## Next Section\nContent here';
            expect(extractSection(emptySection, 'Empty Section')).toBe('None available');
        });

        it('should handle section name with special regex characters', () => {
            const content = '## Notes (Personal)\nSome personal notes';
            const result = extractSection(content, 'Notes (Personal)');
            expect(result).toBe('Some personal notes');
        });

        it('should be case-sensitive for section matching', () => {
            const result = extractSection(SAMPLE_CONTENT, 'conversational fuel');
            // The regex is case-sensitive, so lowercase won't match
            expect(result).toBe('None available');
        });

        it('should handle plain headings without emoji', () => {
            const plain = '## Conversational Fuel\n- Topic 1\n- Topic 2';
            const result = extractSection(plain, 'Conversational Fuel');
            expect(result).toContain('Topic 1');
            expect(result).toContain('Topic 2');
        });
    });
});
