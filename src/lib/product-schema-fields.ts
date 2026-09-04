const MATERIAL_LABELS: Record<string, string> = {
  'kim-loai': 'Kim loại',
  titan: 'Titanium',
  nhua: 'Nhựa',
  tr90: 'TR90',
};

/** Normalize API arrays without changing Vietnamese text or its order. */
export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== 'string') continue;

    const normalized = item.trim();
    if (!normalized) continue;

    const key = normalized.toLocaleLowerCase('vi');
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

export function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();
  return normalized || undefined;
}

export function productMaterialLabel(materials: unknown): string | undefined {
  const labels = normalizeStringArray(materials).map((value) => {
    const key = value.toLocaleLowerCase('vi');
    return MATERIAL_LABELS[key] || value;
  });
  const uniqueLabels = normalizeStringArray(labels);

  return uniqueLabels.length > 0 ? uniqueLabels.join(', ') : undefined;
}

export function productColorLabel(colorNames: unknown): string | undefined {
  const values = normalizeStringArray(colorNames);

  return values.length > 0 ? values.join(' / ') : undefined;
}
