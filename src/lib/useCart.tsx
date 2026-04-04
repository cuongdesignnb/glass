'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

export interface CartItem {
  productId: number;
  name: string;
  slug: string;
  image: string;
  price: number;
  salePrice: number | null;
  quantity: number;
  color: string;
  colorName: string;
  addons?: { groupName: string; optionName: string; price: number }[];
  addonTotal?: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, color: string) => void;
  updateQuantity: (productId: number, color: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  subtotal: 0,
});

const CART_KEY = 'glass_cart';

function getStoredCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('cart-updated'));
}

export function CartProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getStoredCart());

    const handleUpdate = () => setItems(getStoredCart());
    window.addEventListener('cart-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('cart-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const addItem = useCallback((item: CartItem) => {
    const cart = getStoredCart();
    const existingIndex = cart.findIndex(
      (i) => i.productId === item.productId && i.color === item.color
    );
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += item.quantity;
    } else {
      cart.push(item);
    }
    saveCart(cart);
    setItems([...cart]);
  }, []);

  const removeItem = useCallback((productId: number, color: string) => {
    const cart = getStoredCart().filter(
      (i) => !(i.productId === productId && i.color === color)
    );
    saveCart(cart);
    setItems(cart);
  }, []);

  const updateQuantity = useCallback((productId: number, color: string, quantity: number) => {
    const cart = getStoredCart();
    const item = cart.find((i) => i.productId === productId && i.color === color);
    if (item) {
      item.quantity = Math.max(1, quantity);
      saveCart(cart);
      setItems([...cart]);
    }
  }, []);

  const clearCart = useCallback(() => {
    saveCart([]);
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + ((i.salePrice || i.price) + (i.addonTotal || 0)) * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
