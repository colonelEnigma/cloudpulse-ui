import { httpJson } from "@/lib/http";

function withCheckoutStage(error, stage) {
  error.checkoutStage = stage;
  return error;
}

export function createOrder(items) {
  return httpJson("/api/orders", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ items }),
  }).catch((error) => {
    throw withCheckoutStage(error, "order");
  });
}

export function createPayment(orderId, amount) {
  return httpJson("/api/payment", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ orderId, amount }),
  }).catch((error) => {
    throw withCheckoutStage(error, "payment");
  });
}

export function getMyOrders() {
  return httpJson("/api/orders/my-orders", {
    method: "GET",
    auth: true,
  });
}

export function getOrderById(orderId) {
  return httpJson(`/api/orders/${orderId}`, {
    method: "GET",
    auth: true,
  });
}

export async function getPaymentByOrderId(orderId) {
  try {
    return await httpJson(`/api/payment/${orderId}`, {
      method: "GET",
      auth: true,
    });
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}
