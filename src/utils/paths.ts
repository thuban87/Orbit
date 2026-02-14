/**
 * File path utility functions for Orbit plugin.
 *
 * All user-derived file paths must go through these utilities
 * to ensure Obsidian compatibility and safe filenames.
 */
import { normalizePath } from 'obsidian';

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
