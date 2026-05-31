'use client';

import { useState, useEffect } from 'react';
import { flattenSettings } from './settingsUtils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

let cachedSettings: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;

async function fetchSettings(): Promise<Record<string, string>> {
  if (cachedSettings) return cachedSettings;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(`${API}/public/settings`)
    .then(res => res.json())
    .then(data => {
      const flat = flattenSettings(data);
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

import React, { createContext, useContext } from 'react';

export const SettingsContext = createContext<{
  settings: Record<string, string>;
  menus: any[];
} | null>(null);

export function SettingsProvider({
  children,
  initialSettings,
  initialMenus,
}: {
  children: React.ReactNode;
  initialSettings: Record<string, string>;
  initialMenus: any[];
}) {
  const [settings] = useState(initialSettings);
  const [menus] = useState(initialMenus);

  return (
    <SettingsContext.Provider value={{ settings, menus }}>
      {children}
    </SettingsContext.Provider>
  );
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
  const context = useContext(SettingsContext);

  if (context) {
    return { settings: context.settings, loading: false };
  }

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
