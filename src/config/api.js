const isProduction = import.meta.env.PROD;

const DEV_BASES = {
  users: "http://localhost:3000",
  orders: "http://localhost:3003",
  payment: "http://localhost:4000",
  products: "http://localhost:3005",
  search: "http://localhost:5003",
};

const PROD_BASES = {
  users: "",
  orders: "",
  payment: "",
  products: "",
  search: "",
};

const serviceBases = isProduction ? PROD_BASES : DEV_BASES;

export const apiConfig = {
  services: serviceBases,
  controlPlane: "/api/control-plane",
  controlPlaneAI: "/api/control-plane/ai",
  devProxies: isProduction
    ? {
        controlPlane: "",
        controlPlaneAI: "",
      }
    : {
        controlPlane: "http://localhost:18080",
        controlPlaneAI: "http://localhost:7100",
      },
};
