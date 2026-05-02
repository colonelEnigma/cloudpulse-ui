import { createContext, useContext, useMemo, useState } from "react";

import { readCart, writeCart } from "@/cart/storage";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCart());

  function sync(nextItems) {
    setItems(nextItems);
    writeCart(nextItems);
  }

  function addToCart(product) {
    const existing = items.find((item) => item.id === product.id);
    if (existing) {
      sync(
        items.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        ),
      );
      return;
    }

    sync([
      ...items,
      {
        id: product.id,
        name: product.name,
        category: product.category || "Uncategorized",
        price: Number(product.price || 0),
        quantity: 1,
      },
    ]);
  }

  function updateQuantity(productId, quantity) {
    const next = Number(quantity);
    if (next <= 0) {
      sync(items.filter((item) => item.id !== productId));
      return;
    }
    sync(items.map((item) => (item.id === productId ? { ...item, quantity: next } : item)));
  }

  function removeFromCart(productId) {
    sync(items.filter((item) => item.id !== productId));
  }

  function clearCart() {
    sync([]);
  }

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  );
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      totalItems,
      totalAmount,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    }),
    [items, totalItems, totalAmount],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
