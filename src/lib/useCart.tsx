'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import {
  cartItemIdentity,
  mergeCartItem,
  parseStoredCart,
  type CartAddon,
  type StoredCartItem,
} from './cart-storage';

export type CartItem = StoredCartItem;

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, color: string, addons?: CartAddon[]) => void;
  updateQuantity: (productId: number, color: string, quantity: number, addons?: CartAddon[]) => void;
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
  return parseStoredCart(localStorage.getItem(CART_KEY));
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
    const cart = mergeCartItem(getStoredCart(), item);
    saveCart(cart);
    setItems(cart);
  }, []);

  const removeItem = useCallback((productId: number, color: string, addons: CartAddon[] = []) => {
    const targetIdentity = cartItemIdentity({ productId, color, addons });
    const cart = getStoredCart().filter(
      (item) => cartItemIdentity(item) !== targetIdentity,
    );
    saveCart(cart);
    setItems(cart);
  }, []);

  const updateQuantity = useCallback((productId: number, color: string, quantity: number, addons: CartAddon[] = []) => {
    const cart = getStoredCart();
    const targetIdentity = cartItemIdentity({ productId, color, addons });
    const item = cart.find((candidate) => cartItemIdentity(candidate) === targetIdentity);
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
