/**
 * Unit tests for src/utils/logger.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../../../src/utils/logger';

describe('Logger', () => {
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
    });

    // ── Level Management ────────────────────────────
    describe('setLevel / getLevel', () => {
        it('defaults to "off"', () => {
            expect(Logger.getLevel()).toBe('off');
        });

        it('updates level via setLevel', () => {
            Logger.setLevel('debug');
            expect(Logger.getLevel()).toBe('debug');
        });
    });

    // ── Level: off ──────────────────────────────────
    describe('level: off', () => {
        it('does not call console.log for debug()', () => {
            Logger.debug('Test', 'hello');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('does not call console.warn for warn()', () => {
            Logger.warn('Test', 'hello');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('does not call console.error for error()', () => {
            Logger.error('Test', 'hello');
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });
    });

    // ── Level: error ────────────────────────────────
    describe('level: error', () => {
        beforeEach(() => Logger.setLevel('error'));

        it('outputs console.error for error()', () => {
            Logger.error('Index', 'failed');
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Orbit:Index]', 'failed');
        });

        it('does not output console.warn for warn()', () => {
            Logger.warn('Index', 'missing field');
            expect(consoleWarnSpy).not.toHaveBeenCalled();
        });

        it('does not output console.log for debug()', () => {
            Logger.debug('Index', 'scanning');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    // ── Level: warn ─────────────────────────────────
    describe('level: warn', () => {
        beforeEach(() => Logger.setLevel('warn'));

        it('outputs console.error for error()', () => {
            Logger.error('CM', 'write failed');
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Orbit:CM]', 'write failed');
        });

        it('outputs console.warn for warn()', () => {
            Logger.warn('CM', 'missing optional');
            expect(consoleWarnSpy).toHaveBeenCalledWith('[Orbit:CM]', 'missing optional');
        });

        it('does not output console.log for debug()', () => {
            Logger.debug('CM', 'detail');
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    // ── Level: debug ────────────────────────────────
    describe('level: debug', () => {
        beforeEach(() => Logger.setLevel('debug'));

        it('outputs console.error for error()', () => {
            Logger.error('AI', 'api failure');
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Orbit:AI]', 'api failure');
        });

        it('outputs console.warn for warn()', () => {
            Logger.warn('AI', 'retry');
            expect(consoleWarnSpy).toHaveBeenCalledWith('[Orbit:AI]', 'retry');
        });

        it('outputs console.log for debug()', () => {
            Logger.debug('AI', 'payload sent');
            expect(consoleLogSpy).toHaveBeenCalledWith('[Orbit:AI]', 'payload sent');
        });
    });

    // ── Extra Args ──────────────────────────────────
    describe('extra arguments', () => {
        beforeEach(() => Logger.setLevel('debug'));

        it('passes extra arguments to console.log', () => {
            const extra = { count: 42 };
            Logger.debug('Test', 'data', extra);
            expect(consoleLogSpy).toHaveBeenCalledWith('[Orbit:Test]', 'data', extra);
        });

        it('passes extra arguments to console.warn', () => {
            Logger.warn('Test', 'issue', 1, 2);
            expect(consoleWarnSpy).toHaveBeenCalledWith('[Orbit:Test]', 'issue', 1, 2);
        });

        it('passes extra arguments to console.error', () => {
            const err = new Error('boom');
            Logger.error('Test', 'failed', err);
            expect(consoleErrorSpy).toHaveBeenCalledWith('[Orbit:Test]', 'failed', err);
        });
    });
});
