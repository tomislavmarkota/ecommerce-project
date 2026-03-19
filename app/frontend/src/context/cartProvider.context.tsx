import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type CartItem = {
  productId: number;
  quantity: number;
  name?: string;
  thumbnail?: string | null;
  price?: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
};

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = 'shop_cart';

const readCartFromStorage = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        name: typeof item.name === 'string' ? item.name : undefined,
        thumbnail: typeof item.thumbnail === 'string' || item.thumbnail === null ? item.thumbnail : undefined,
        price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : undefined,
      }))
      .filter(
        (item) =>
          Number.isInteger(item.productId) &&
          item.productId > 0 &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0,
      );
  } catch {
    return [];
  }
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readCartFromStorage());

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((x) => x.productId === item.productId);

      if (existing) {
        return prev.map((x) =>
          x.productId === item.productId
            ? {
                ...x,
                quantity: x.quantity + item.quantity,
                name: item.name ?? x.name,
                thumbnail: item.thumbnail ?? x.thumbnail,
                price: item.price ?? x.price,
              }
            : x,
        );
      }

      return [...prev, item];
    });
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((x) => x.productId !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    setItems((prev) =>
      prev.map((x) => (x.productId === productId ? { ...x, quantity } : x)).filter((x) => x.quantity > 0),
    );
  };

  const clearCart = () => setItems([]);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
    }),
    [items, totalItems],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return ctx;
};
