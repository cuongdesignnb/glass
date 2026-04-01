/**
 * Convert Vietnamese text to URL-friendly slug (không dấu)
 * "Kính Mắt Thời Trang" → "kinh-mat-thoi-trang"
 */
export function vietnameseSlug(str: string): string {
  if (!str) return '';
  
  // Vietnamese character map
  const from = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
  const to   = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';
  
  let slug = str.toLowerCase().trim();
  
  // Replace Vietnamese characters
  for (let i = 0; i < from.length; i++) {
    slug = slug.replace(new RegExp(from[i], 'g'), to[i]);
  }
  
  // Also handle uppercase Vietnamese
  const fromUpper = from.toUpperCase();
  for (let i = 0; i < fromUpper.length; i++) {
    slug = slug.replace(new RegExp(fromUpper[i], 'g'), to[i]);
  }
  
  return slug
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric
    .replace(/\s+/g, '-')          // Replace spaces with hyphens
    .replace(/-+/g, '-')           // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '');      // Trim leading/trailing hyphens
}

/**
 * Generate unique slug by appending number if duplicate exists
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}
