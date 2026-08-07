export interface AdminSettingUpdate {
  key: string;
  value: string;
  group: string;
}

export interface AdminSettingsClient {
  updateSettings: (settings: AdminSettingUpdate[]) => Promise<unknown>;
  getSettings: () => Promise<unknown>;
}

export function flattenAdminSettings(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};

  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
        if (typeof nestedValue === 'string') flat[nestedKey] = nestedValue;
      }
    } else if (typeof value === 'string') {
      flat[key] = value;
    }
  }

  return flat;
}

/**
 * Persist one admin setting and verify it from a fresh authenticated read.
 * The callback runs only after the read-back matches exactly.
 */
export async function persistAdminSetting(
  client: AdminSettingsClient,
  setting: AdminSettingUpdate,
  onPersisted?: () => void,
): Promise<void> {
  await client.updateSettings([setting]);

  const persistedValue = flattenAdminSettings(await client.getSettings())[setting.key] ?? '';
  if (persistedValue !== setting.value) {
    throw new Error(`Setting "${setting.key}" did not persist; please try again.`);
  }

  onPersisted?.();
}
