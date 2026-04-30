import { paymentApi } from "./api";

export async function getPaymentByOrderId(orderId) {
  try {
    const response = await paymentApi.get(`/api/payment/${orderId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}
