export const getCustomEntryId = (code: string): string | null => {
  if (!code.startsWith('custom-')) return null;

  return code.replace('custom-', '');
};
