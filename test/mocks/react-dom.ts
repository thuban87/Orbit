/**
 * Mock module for react-dom/client.
 *
 * Used by ReactModal and other modal classes in later phases.
 * Provides a mock createRoot that captures render calls for testing.
 */
import { vi } from 'vitest';

export function createRoot(_container: HTMLElement) {
    return {
        render: vi.fn(),
        unmount: vi.fn(),
    };
}
