import { compressData, decompressData, createShareableUrl } from '../components/utils/compression.jsx';

describe('Compression Utilities', () => {
    const testData = {
        name: 'test',
        numbers: [1, 2, 3],
        nested: { value: 'nested' }
    };

    test('compresses and decompresses data correctly', () => {
        const compressed = compressData(testData);
        expect(compressed).toBeTruthy();
        expect(typeof compressed).toBe('string');

        const decompressed = decompressData(compressed);
        expect(decompressed).toEqual(testData);
    });

    test('handles null and undefined inputs', () => {
        expect(compressData(null)).toBeNull();
        expect(compressData(undefined)).toBeNull();
        expect(decompressData(null)).toBeNull();
        expect(decompressData(undefined)).toBeNull();
    });

    test('handles empty objects and arrays', () => {
        const emptyObject = {};
        const emptyArray = [];

        const compressedObj = compressData(emptyObject);
        const compressedArr = compressData(emptyArray);

        expect(decompressData(compressedObj)).toEqual(emptyObject);
        expect(decompressData(compressedArr)).toEqual(emptyArray);
    });

    test('creates shareable URL with valid data', () => {
        const expression = '[i,j]->[j]';
        const indexSizes = { i: 2, j: 3 };

        const url = createShareableUrl(expression, indexSizes);
        expect(url).toBeTruthy();
        expect(url.includes('?e=')).toBeTruthy();
        expect(url.includes('&s=')).toBeTruthy();
    });

    test('handles invalid shareable URL data', () => {
        const url = createShareableUrl(null, null);
        expect(url).toBeNull();
    });


    test('compression reduces data size', () => {
        const longString = 'x'.repeat(1000);
        const compressed = compressData(longString);
        expect(compressed.length).toBeLessThan(longString.length);
    });
});
