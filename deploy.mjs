/**
 * Deploy script for Orbit plugin.
 * Copies built files to the Obsidian vault plugins directory.
 */

import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// Deploy target - the Obsidian vault plugins directory
const DEPLOY_DIR = "G:\\My Drive\\IT\\Obsidian Vault\\My Notebooks\\.obsidian\\plugins\\orbit";

// Files to copy
const FILES_TO_COPY = ["main.js", "manifest.json", "styles.css"];

// Ensure deploy directory exists
if (!existsSync(DEPLOY_DIR)) {
    mkdirSync(DEPLOY_DIR, { recursive: true });
    console.log(`Created deploy directory: ${DEPLOY_DIR}`);
}

// Copy files
for (const file of FILES_TO_COPY) {
    const src = join(process.cwd(), file);
    const dest = join(DEPLOY_DIR, file);

    if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log(`✓ Copied ${file} -> ${dest}`);
    } else {
        console.warn(`⚠ Warning: ${file} not found, skipping...`);
    }
}

console.log("\n🚀 Deployment complete!");
