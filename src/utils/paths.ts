/**
 * File path utility functions for Orbit plugin.
 *
 * All user-derived file paths must go through these utilities
 * to ensure Obsidian compatibility and safe filenames.
 */
import { App, normalizePath } from 'obsidian';

/**
 * Strips characters that are invalid in file paths.
 *
 * @param name - Raw file name string
 * @returns Sanitized string safe for use as a file name
 */
export function sanitizeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

/**
 * Combines normalizePath + sanitizeFileName for user-derived paths.
 *
 * @param folder - Target folder path
 * @param name - Raw contact name (will be sanitized)
 * @param ext - File extension (default: '.md')
 * @returns Normalized, safe file path
 */
export function buildContactPath(folder: string, name: string, ext = '.md'): string {
    const cleanName = sanitizeFileName(name);
    return normalizePath(`${folder}/${cleanName}${ext}`);
}

/**
 * Ensure a folder path exists in the vault, creating intermediate
 * directories as needed. Silently succeeds if the folder already exists.
 *
 * @param app - Obsidian App instance
 * @param folderPath - Path to ensure exists
 */
export async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    if (!normalized) return;

    const existing = app.vault.getFolderByPath(normalized);
    if (existing) return;

    // Split path and create each segment
    const parts = normalized.split('/');
    let current = '';
    for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        const folder = app.vault.getFolderByPath(current);
        if (!folder) {
            try {
                await app.vault.createFolder(current);
            } catch {
                // Folder may have been created by another process
            }
        }
    }
}
