/**
 * Integration tests for the debug logging system.
 *
 * Verifies that Logger level gating works end-to-end: settings → Logger → console output.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../src/utils/logger';
import type { LogLevel } from '../../src/utils/logger';

describe('Logging flow integration', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        Logger.setLevel('off');
    });

    afterEach(() => {
        vi.restoreAllMocks();
        Logger.setLevel('off');
    });

    // ── Level: off — no output ───────────────────────
    describe('level: off', () => {
        it('suppresses all console output', () => {
            Logger.setLevel('off');
            Logger.debug('Test', 'debug message');
            Logger.warn('Test', 'warn message');
            Logger.error('Test', 'error message');
            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });
    });

    // ── Level: error — errors only ───────────────────
    describe('level: error', () => {
        it('allows only console.error', () => {
            Logger.setLevel('error');
            Logger.debug('Test', 'debug');
            Logger.warn('Test', 'warn');
            Logger.error('Test', 'error');
            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledOnce();
        });
    });

    // ── Level: warn — errors + warnings ──────────────
    describe('level: warn', () => {
        it('allows console.error and console.warn', () => {
            Logger.setLevel('warn');
            Logger.debug('Test', 'debug');
            Logger.warn('Test', 'warn');
            Logger.error('Test', 'error');
            expect(consoleLogSpy).not.toHaveBeenCalled();
            expect(consoleWarnSpy).toHaveBeenCalledOnce();
            expect(consoleErrorSpy).toHaveBeenCalledOnce();
        });
    });

    // ── Level: debug — all output ────────────────────
    describe('level: debug', () => {
        it('allows all console methods', () => {
            Logger.setLevel('debug');
            Logger.debug('Test', 'debug');
            Logger.warn('Test', 'warn');
            Logger.error('Test', 'error');
            expect(consoleLogSpy).toHaveBeenCalledOnce();
            expect(consoleWarnSpy).toHaveBeenCalledOnce();
            expect(consoleErrorSpy).toHaveBeenCalledOnce();
        });
    });

    // ── Dynamic level changes ────────────────────────
    describe('dynamic level switching', () => {
        it('applies new level immediately after setLevel()', () => {
            Logger.setLevel('off');
            Logger.debug('Test', 'should not appear');
            expect(consoleLogSpy).not.toHaveBeenCalled();

            Logger.setLevel('debug');
            Logger.debug('Test', 'should appear');
            expect(consoleLogSpy).toHaveBeenCalledOnce();
        });

        it('respects level downgrade', () => {
            Logger.setLevel('debug');
            Logger.debug('Test', 'visible');
            expect(consoleLogSpy).toHaveBeenCalledOnce();

            Logger.setLevel('error');
            Logger.debug('Test', 'suppressed');
            expect(consoleLogSpy).toHaveBeenCalledOnce(); // Still just the one
        });
    });

    // ── Output format ────────────────────────────────
    describe('output format', () => {
        it('prefixes output with [Orbit:source]', () => {
            Logger.setLevel('debug');
            Logger.debug('OrbitIndex', 'scan complete');
            expect(consoleLogSpy).toHaveBeenCalledWith(
                '[Orbit:OrbitIndex]', 'scan complete'
            );
        });

        it('passes extra arguments through', () => {
            Logger.setLevel('debug');
            const extra = { count: 5 };
            Logger.error('CM', 'write failed', extra);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[Orbit:CM]', 'write failed', extra
            );
        });
    });

    // ── Settings simulation ──────────────────────────
    describe('settings-driven level changes', () => {
        it('simulates the full settings → Logger flow', () => {
            // Simulate onload — default setting
            const settings = { logLevel: 'off' as LogLevel };
            Logger.setLevel(settings.logLevel);
            Logger.debug('Test', 'should be silent');
            expect(consoleLogSpy).not.toHaveBeenCalled();

            // Simulate user changing setting
            settings.logLevel = 'debug';
            Logger.setLevel(settings.logLevel);
            Logger.debug('Test', 'now visible');
            expect(consoleLogSpy).toHaveBeenCalledOnce();

            // Simulate user setting back to off
            settings.logLevel = 'off';
            Logger.setLevel(settings.logLevel);
            Logger.debug('Test', 'silent again');
            expect(consoleLogSpy).toHaveBeenCalledOnce(); // No additional call
        });
    });
});
