/**
 * Returns the base URL from Vite environment variables
 * This matches the 'base' configuration in vite.config.js
 */
export function getBaseUrl() {
  return import.meta.env.BASE_URL;
}
