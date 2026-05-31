export function flattenSettings(data: any): Record<string, string> {
  const flat: Record<string, string> = {};
  if (data && typeof data === 'object') {
    Object.values(data).forEach((group: any) => {
      if (typeof group === 'object') {
        Object.entries(group).forEach(([key, value]) => {
          flat[key] = value as string;
        });
      }
    });
  }
  return flat;
}
