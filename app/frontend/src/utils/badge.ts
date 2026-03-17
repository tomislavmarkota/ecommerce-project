export const normalizeBadgeKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z]/g, '');
