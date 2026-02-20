/**
 * Deploy script for Orbit plugin.
 * Copies built files to the target Obsidian vault plugins directory.
 *
 * Usage:
 *   node deploy.mjs test        → Deploy to test vault
 *   node deploy.mjs staging     → Deploy to staging vault
 *
 * Note: Production deployment is handled via BRAT (GitHub releases).
 */

import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// Deploy targets
const TARGETS = {
    test: "C:\\Quest-Board-Test-Vault\\.obsidian\\plugins\\orbit",
    staging: "C:\\Quest-Board-Staging-Vault\\Staging Vault\\.obsidian\\plugins\\orbit",
};

// Files to copy
const FILES_TO_COPY = ["main.js", "manifest.json", "styles.css"];

// Parse target from command line
const target = process.argv[2];

if (!target || !TARGETS[target]) {
    console.error("❌ Usage: node deploy.mjs <test|staging>");
    console.error("   test    → Deploy to test vault");
    console.error("   staging → Deploy to staging vault");
    process.exit(1);
}

const deployDir = TARGETS[target];

// Ensure deploy directory exists
if (!existsSync(deployDir)) {
    mkdirSync(deployDir, { recursive: true });
    console.log(`Created deploy directory: ${deployDir}`);
}

// Copy files
for (const file of FILES_TO_COPY) {
    const src = join(process.cwd(), file);
    const dest = join(deployDir, file);

    if (existsSync(src)) {
        copyFileSync(src, dest);
        console.log(`✓ Copied ${file} → ${dest}`);
    } else {
        console.warn(`⚠ Warning: ${file} not found, skipping...`);
    }
}

console.log(`\n🚀 Deployment to ${target} complete!`);
