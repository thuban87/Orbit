import { defineConfig } from 'vitest/config';
import path from 'path';

// Determine if we are running on GitHub Actions (CI) or Local
const isCI = process.env.CI === 'true';

// Coverage output path logic
let outputDir: string;

if (isCI) {
    // On GitHub Actions: standard folder relative to repo root
    outputDir = 'coverage';
} else {
    // On Local: timestamped folder in external testing directory
    const chicagoTime = new Date().toLocaleString("sv-SE", { timeZone: "America/Chicago" });
    const timestamp = chicagoTime.replace(" ", "_").replace(/:/g, "-");
    outputDir = `C:\\Users\\bwales\\projects\\obsidian-plugins\\ViTest Coverage Reports\\orbit\\${timestamp}`;
}

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./test/setup.ts'],
        include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],

        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts', 'src/**/*.tsx'],
            reportsDirectory: outputDir,
            reporter: ['text', 'json-summary', 'json', 'html'],
        },
    },
    resolve: {
        alias: {
            'obsidian': path.resolve(__dirname, 'test/mocks/obsidian.ts'),
        },
    },
});
