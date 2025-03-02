
/**
 * Formats a number with specified options
 * @param {number} number - The number to format
 * @param {Object} options - Formatting options
 * @returns {string} Formatted number
 */
export const formatNumber = (number, options = {}) => {
    const defaultOptions = {
        locale: 'en-US',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    };

    const finalOptions = { ...defaultOptions, ...options };

    return number.toLocaleString(finalOptions.locale, {
        minimumFractionDigits: finalOptions.minimumFractionDigits,
        maximumFractionDigits: finalOptions.maximumFractionDigits
    });
};