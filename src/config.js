const isDevelopment = process.env.NODE_ENV === "development";

const API_URLS = {
  USER: isDevelopment ? "http://localhost:3000" : "",
  ORDER: isDevelopment ? "http://localhost:3003" : "",
  PAYMENT: isDevelopment ? "http://localhost:4000" : "",
  PRODUCT: isDevelopment ? "http://localhost:3005" : "",
  SEARCH: isDevelopment ? "http://localhost:5003" : "",
  CONTROL_PLANE: "",
};

export default API_URLS;
