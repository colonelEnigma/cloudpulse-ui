const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
  app.use(
    "/api/users",
    createProxyMiddleware({
      target: "http://localhost:3000",
      changeOrigin: true,
    })
  );

  app.use(
    "/api/control-plane",
    createProxyMiddleware({
      target: "http://localhost:7100",
      changeOrigin: true,
    })
  );

  app.use(
    "/api/orders",
    createProxyMiddleware({
      target: "http://localhost:3003",
      changeOrigin: true,
    })
  );

  app.use(
    "/api/payment",
    createProxyMiddleware({
      target: "http://localhost:4000",
      changeOrigin: true,
    })
  );

  app.use(
    "/api/products",
    createProxyMiddleware({
      target: "http://localhost:3005",
      changeOrigin: true,
    })
  );

  app.use(
    "/api/search",
    createProxyMiddleware({
      target: "http://localhost:5003",
      changeOrigin: true,
    })
  );
};
