import pako from 'pako';

/**
 * Compresses data using gzip and converts it to a base64 string
 * @param {any} data - The data to compress
 * @returns {string|null} Base64 encoded compressed string or null if compression fails
 */
export const compressData = (data) => {
    if (!data) return null;
    try {
        const jsonString = JSON.stringify(data);
        const compressed = pako.gzip(jsonString);
        return btoa(String.fromCharCode.apply(null, compressed));
    } catch (e) {
        console.error('Failed to compress data:', e);
        return null;
    }
};

/**
 * Decompresses a base64 encoded gzipped string back to its original form
 * @param {string} compressed - Base64 encoded compressed string
 * @returns {any|null} Original data object or null if decompression fails
 */
export const decompressData = (compressed) => {
    if (!compressed) return null;
    try {
        // Convert base64 to binary
        const binary = atob(compressed);
        const bytes = new Uint8Array(binary.length);

        // Convert binary to byte array
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        // Decompress and parse JSON
        const decompressed = pako.ungzip(bytes, { to: 'string' });
        return JSON.parse(decompressed);
    } catch (e) {
        console.error('Failed to decompress data:', e);
        return null;
    }
};

/**
 * Creates a shareable URL containing compressed expression and index sizes
 * @param {Object} expression - The tensor expression to share
 * @param {Object} indexSizes - The index sizes configuration
 * @returns {string|null} URL containing compressed data or null if creation fails
 */
export const createShareableUrl = (expression, indexSizes) => {
    const compressedExpression = compressData(expression);
    const compressedSizes = compressData(indexSizes);

    if (!compressedExpression || !compressedSizes) {
        console.error('Error: Failed to create shareable URL');
        return null;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams({
        e: compressedExpression,
        s: compressedSizes
    });

    return `${baseUrl}?${params.toString()}`;
};
