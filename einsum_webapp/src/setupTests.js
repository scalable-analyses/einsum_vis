// jest-dom adds custom jest matchers for asserting on DOM nodes
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Mock ResizeObserver since it's not available in Jest DOM environment
global.ResizeObserver = class ResizeObserver {
    constructor(cb) {
        this.cb = cb;
    }
    observe() {
        // Mock implementation
    }
    unobserve() {
        // Mock implementation
    }
    disconnect() {
        // Mock implementation
    }
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock createPortal for ReactFlow
jest.mock('react-dom', () => ({
    ...jest.requireActual('react-dom'),
    createPortal: (element) => element,
}));

jest.mock('@radix-ui/react-tabs', () => ({
    Root: ({ children }) => <div>{children}</div>,
    List: ({ children }) => <div>{children}</div>,
    Trigger: ({ children }) => <button>{children}</button>,
    Content: ({ children }) => <div>{children}</div>
}));

// Suppress console errors and warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
    console.error = (...args) => {
        if (args[0].includes('Error:')) return;
        originalError.call(console, ...args);
    };
    console.warn = (...args) => {
        if (args[0].includes('Warning:')) return;
        originalWarn.call(console, ...args);
    };
});

afterEach(() => {
    cleanup();
});

afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
});