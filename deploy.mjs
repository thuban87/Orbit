/**
 * Deploy script for Orbit plugin.
 * Copies built files to the target Obsidian vault plugins directory.
 *
 * Usage:
 *   node deploy.mjs test        → Deploy to staging vault
 *   node deploy.mjs production  → Deploy to production vault (requires confirmation)
 */

import { copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createInterface } from "readline";

// Deploy targets
const TARGETS = {
    test: "C:\\Quest-Board-Staging-Vault\\Staging Vault\\.obsidian\\plugins\\orbit",
    production: "G:\\My Drive\\IT\\Obsidian Vault\\My Notebooks\\.obsidian\\plugins\\orbit",
};

// Files to copy
const FILES_TO_COPY = ["main.js", "manifest.json", "styles.css"];

// Parse target from command line
const target = process.argv[2];

if (!target || !TARGETS[target]) {
    console.error("❌ Usage: node deploy.mjs <test|production>");
    console.error("   test       → Deploy to staging vault");
    console.error("   production → Deploy to production vault (requires confirmation)");
    process.exit(1);
}

const deployDir = TARGETS[target];

/**
 * Prompt user for confirmation (production only).
 */
async function confirmDeploy() {
    if (target !== "production") return true;

    const rl = createInterface({ input: process.stdin, output: process.stdout });

    return new Promise((resolve) => {
        console.log("\n⚠️  You are about to deploy to PRODUCTION:");
        console.log(`   ${deployDir}\n`);
        rl.question("Type 'yes' to confirm: ", (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === "yes");
        });
    });
}

async function deploy() {
    const confirmed = await confirmDeploy();

    if (!confirmed) {
        console.log("\n🚫 Deployment cancelled.");
        process.exit(0);
    }

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
}

deploy();
