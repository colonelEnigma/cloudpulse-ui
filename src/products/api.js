import { httpJson } from "@/lib/http";

export function getProducts() {
  return httpJson("/api/products", {
    method: "GET",
  });
}
