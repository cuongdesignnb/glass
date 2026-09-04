function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const result: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== 'string') continue;

    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function normalizeOptionalImage(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();
  return normalized || undefined;
}

export function productImageSources({
  variantImages,
  galleryImages,
  thumbnail,
}: {
  variantImages?: unknown;
  galleryImages?: unknown;
  thumbnail?: unknown;
}): string[] {
  const variant = normalizeImages(variantImages);
  const gallery = normalizeImages(galleryImages);
  const result = variant.length > 0
    ? normalizeImages([...variant, ...gallery])
    : gallery;
  const fallback = normalizeOptionalImage(thumbnail);

  if (result.length === 0 && fallback) {
    return [fallback];
  }

  return result;
}
