/**
 * ImageScraper — Downloads images from URLs and saves them to the vault.
 *
 * Stateless utility with static methods. Uses Obsidian's `requestUrl()`
 * for HTTP requests (required by plugin guidelines — no fetch/axios).
 *
 * Naming convention: "{sanitizedName} - Photo.{ext}"
 * Conflicts resolved by appending numbers: "Photo-2", "Photo-3", etc.
 * Returns a wikilink string for the saved file.
 */
import { App, requestUrl, normalizePath } from 'obsidian';
import { sanitizeFileName } from './paths';
import { ensureFolderExists } from './paths';
import { Logger } from './logger';

/** Maps Content-Type MIME types to file extensions */
const CONTENT_TYPE_MAP: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/bmp': '.bmp',
    'image/tiff': '.tiff',
    'image/avif': '.avif',
};

/** Valid image extensions for URL path detection */
const VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.tiff', '.avif'];

/** Default fallback extension when none can be detected */
const DEFAULT_EXTENSION = '.webp';

export class ImageScraper {
    /**
     * Downloads an image from a URL and saves it to the vault.
     *
     * @param app - Obsidian App instance
     * @param imageUrl - URL to download the image from
     * @param contactName - Contact name (used for filename generation)
     * @param assetFolder - Vault folder to save the image in
     * @returns Wikilink string for the saved file, e.g. "[[John Doe - Photo.jpg]]"
     */
    static async scrapeAndSave(
        app: App,
        imageUrl: string,
        contactName: string,
        assetFolder: string
    ): Promise<string> {
        Logger.debug('ImageScraper', `Downloading image from ${imageUrl}`);

        // 1. Download the image
        const response = await requestUrl({ url: imageUrl });

        // 2. Detect file extension
        const contentType = response.headers['content-type'] ?? response.headers['Content-Type'] ?? '';
        let ext = ImageScraper.getExtensionFromContentType(contentType);
        if (!ext) {
            ext = ImageScraper.getExtensionFromUrl(imageUrl);
        }
        if (!ext) {
            ext = DEFAULT_EXTENSION;
            Logger.debug('ImageScraper', `Could not detect extension, falling back to ${ext}`);
        }

        // 3. Build filename with conflict resolution
        const safeName = sanitizeFileName(contactName);
        const baseFilename = `${safeName} - Photo`;
        const filename = await ImageScraper.resolveFilename(app, assetFolder, baseFilename, ext);

        // 4. Ensure target folder exists
        await ensureFolderExists(app, assetFolder);

        // 5. Save the file
        const filePath = normalizePath(`${assetFolder}/${filename}`);
        await app.vault.createBinary(filePath, response.arrayBuffer);

        Logger.debug('ImageScraper', `Saved image to ${filePath}`);

        // 6. Return wikilink (without folder path — Obsidian resolves globally)
        return `[[${filename}]]`;
    }

    /**
     * Determines a unique filename, appending a number if a conflict exists.
     *
     * Example: "John Doe - Photo.jpg" → "John Doe - Photo-2.jpg" if original exists.
     */
    static async resolveFilename(
        app: App,
        folder: string,
        baseName: string,
        ext: string
    ): Promise<string> {
        let filename = `${baseName}${ext}`;
        let filePath = normalizePath(`${folder}/${filename}`);
        let counter = 1;

        while (app.vault.getAbstractFileByPath(filePath)) {
            counter++;
            filename = `${baseName}-${counter}${ext}`;
            filePath = normalizePath(`${folder}/${filename}`);
        }

        return filename;
    }

    /**
     * Extracts file extension from a Content-Type header.
     *
     * @param contentType - MIME type string (e.g., "image/jpeg; charset=utf-8")
     * @returns File extension including dot (e.g., ".jpg"), or null if unrecognized
     */
    static getExtensionFromContentType(contentType: string): string | null {
        if (!contentType) return null;
        // Strip parameters (e.g., "; charset=utf-8")
        const mimeType = contentType.split(';')[0].trim().toLowerCase();
        return CONTENT_TYPE_MAP[mimeType] ?? null;
    }

    /**
     * Extracts file extension from a URL path.
     *
     * @param url - Full URL string
     * @returns File extension including dot (e.g., ".jpg"), or null if not found
     */
    static getExtensionFromUrl(url: string): string | null {
        try {
            const pathname = new URL(url).pathname;
            const lastDot = pathname.lastIndexOf('.');
            if (lastDot === -1) return null;

            const ext = pathname.slice(lastDot).toLowerCase();
            // Only return if it's a known image extension
            if (VALID_IMAGE_EXTENSIONS.includes(ext)) {
                return ext === '.jpeg' ? '.jpg' : ext;
            }
            return null;
        } catch {
            return null;
        }
    }

    /**
     * Checks if a string looks like a URL (starts with http:// or https://).
     */
    static isUrl(value: string): boolean {
        return value.startsWith('http://') || value.startsWith('https://');
    }
}
