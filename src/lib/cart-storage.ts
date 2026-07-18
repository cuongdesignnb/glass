export interface CartAddon {
  groupName: string;
  optionName: string;
  price: number;
}

export interface StoredCartItem {
  productId: number;
  name: string;
  slug: string;
  image: string;
  price: number;
  salePrice: number | null;
  quantity: number;
  color: string;
  colorName: string;
  addons?: CartAddon[];
  addonTotal?: number;
}

export function parseStoredCart(value: string | null): StoredCartItem[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is StoredCartItem => Boolean(
        item && typeof item === 'object' && 'productId' in item,
      ))
      : [];
  } catch {
    return [];
  }
}

export function cartItemIdentity(item: Pick<StoredCartItem, 'productId' | 'color' | 'addons'>): string {
  const addons = (item.addons || [])
    .map((addon) => `${addon.groupName}:${addon.optionName}`)
    .sort();

  return JSON.stringify([item.productId, item.color, addons]);
}

export function mergeCartItem(
  items: StoredCartItem[],
  incoming: StoredCartItem,
): StoredCartItem[] {
  const identity = cartItemIdentity(incoming);
  const existingIndex = items.findIndex((item) => cartItemIdentity(item) === identity);

  if (existingIndex < 0) return [...items, incoming];

  return items.map((item, index) => index === existingIndex
    ? { ...item, quantity: item.quantity + incoming.quantity }
    : item);
}
