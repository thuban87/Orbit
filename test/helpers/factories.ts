/**
 * Test factories for creating Orbit test objects with sensible defaults.
 *
 * Usage: createOrbitContact({ name: 'Alice', status: 'wobble' })
 * All fields have reasonable defaults so you only override what matters.
 */
import { TFile, CachedMetadata, createMockApp } from '../mocks/obsidian';
import type { OrbitContact, Frequency, OrbitStatus } from '../../src/types';
import type { OrbitSettings } from '../../src/settings';

// ─── TFile Factory ──────────────────────────────────────────────

export function createTFile(overrides: Partial<{ path: string; basename: string; extension: string }> = {}): TFile {
    const path = overrides.path ?? 'People/Test Person.md';
    const file = new TFile(path);
    if (overrides.basename !== undefined) file.basename = overrides.basename;
    if (overrides.extension !== undefined) file.extension = overrides.extension;
    return file;
}

// ─── OrbitContact Factory ───────────────────────────────────────

export function createOrbitContact(overrides: Partial<OrbitContact> = {}): OrbitContact {
    const file = overrides.file ?? createTFile();
    return {
        file,
        name: overrides.name ?? file.basename,
        category: overrides.category ?? 'Friends',
        frequency: overrides.frequency ?? 'Monthly',
        lastContact: 'lastContact' in overrides ? overrides.lastContact! : new Date(),
        status: overrides.status ?? 'stable',
        daysSinceContact: overrides.daysSinceContact ?? 0,
        daysUntilDue: overrides.daysUntilDue ?? 30,
        photo: overrides.photo,
        socialBattery: overrides.socialBattery,
        snoozeUntil: 'snoozeUntil' in overrides ? overrides.snoozeUntil! : null,
        lastInteraction: overrides.lastInteraction,
        birthday: overrides.birthday,
        fuel: overrides.fuel,
    };
}

// ─── CachedMetadata Factory ─────────────────────────────────────

export function createCachedMetadata(overrides: {
    frontmatter?: Record<string, any>;
    tags?: { tag: string; position: any }[];
    hasFrontmatterTags?: boolean;
} = {}): CachedMetadata {
    const defaultFrontmatter: Record<string, any> = {
        tags: ['people'],
        frequency: 'Monthly',
        last_contact: '2025-01-15',
        category: 'Friends',
    };

    return {
        frontmatter: overrides.frontmatter ?? defaultFrontmatter,
        tags: overrides.tags,
    };
}

// ─── OrbitSettings Factory ──────────────────────────────────────

export function createSettings(overrides: Partial<OrbitSettings> = {}): OrbitSettings {
    return {
        personTag: overrides.personTag ?? 'people',
        ignoredPaths: overrides.ignoredPaths ?? ['Templates', 'Archive'],
        dateFormat: overrides.dateFormat ?? 'YYYY-MM-DD',
    };
}

// Re-export createMockApp from obsidian mock for convenience
export { createMockApp };
