"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface CartItem {
  skuId: string;
  productId: string;
  productName: string;
  skuName: string;
  skuCode: string;
  imageUrl?: string;
  warehouseId: string;
  warehouseName: string;
  price: number;
  currency: string;
  available: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: CartItem) => boolean;
  updateQuantity: (skuId: string, quantity: number) => void;
  removeItem: (skuId: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "order-platform-store-cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setItems(JSON.parse(stored) as CartItem[]);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((total, item) => total + item.quantity, 0),
      subtotal: items.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      ),
      addItem(item) {
        if (
          items.length > 0 &&
          items.some((current) => current.warehouseId !== item.warehouseId)
        ) {
          return false;
        }
        setItems((current) => {
          const existing = current.find(
            (cartItem) => cartItem.skuId === item.skuId,
          );
          if (!existing) return [...current, item];
          return current.map((cartItem) =>
            cartItem.skuId === item.skuId
              ? {
                  ...cartItem,
                  quantity: Math.min(
                    cartItem.quantity + item.quantity,
                    item.available,
                  ),
                  available: item.available,
                  price: item.price,
                }
              : cartItem,
          );
        });
        return true;
      },
      updateQuantity(skuId, quantity) {
        setItems((current) =>
          current.map((item) =>
            item.skuId === skuId
              ? {
                  ...item,
                  quantity: Math.min(
                    Math.max(Math.trunc(quantity) || 1, 1),
                    item.available,
                  ),
                }
              : item,
          ),
        );
      },
      removeItem(skuId) {
        setItems((current) =>
          current.filter((item) => item.skuId !== skuId),
        );
      },
      clear() {
        setItems([]);
      },
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
