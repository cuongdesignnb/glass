import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

let cachedSettings: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;

async function fetchSettings(): Promise<Record<string, string>> {
  if (cachedSettings) return cachedSettings;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(`${API}/public/settings`)
    .then(res => res.json())
    .then(data => {
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
      cachedSettings = flat;
      fetchPromise = null;
      return flat;
    })
    .catch(() => {
      fetchPromise = null;
      return {};
    });

  return fetchPromise;
}

export function invalidateSettings() {
  cachedSettings = null;
  fetchPromise = null;
}

/**
 * Hook đọc settings từ API (public endpoint).
 * Cache trong memory để tránh gọi lại nhiều lần.
 *
 * @example
 * const { settings } = useSettings();
 * const logo = settings['site_logo'];
 */
export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>(cachedSettings || {});
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }
    fetchSettings().then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  return { settings, loading };
}
