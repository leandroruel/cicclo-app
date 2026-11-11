export function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!configuredUrl) {
    throw new Error('EXPO_PUBLIC_API_URL não está configurada.');
  }

  return configuredUrl.replace(/\/+$/, '');
}
