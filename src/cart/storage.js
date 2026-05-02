const CART_STORAGE_KEY = "shcp_cart_items";

export function readCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}
