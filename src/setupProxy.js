const dotenv = require("dotenv");
const { createProxyMiddleware } = require("http-proxy-middleware");

// CRA does not expose non-REACT_APP variables to browser code, but the dev
// proxy runs in Node and can safely read local-only proxy target overrides.
dotenv.config({ path: ".env.development.local" });
dotenv.config({ path: ".env.local" });
dotenv.config();

const sharedProdTarget = process.env.PROD_API_PROXY_TARGET || "";

const resolveTarget = (specificEnvName, fallbackTarget) =>
  process.env[specificEnvName] || sharedProdTarget || fallbackTarget;

const proxyConfigs = [
  {
    path: "/api/users",
    envName: "USER_PROXY_TARGET",
    fallbackTarget: "http://localhost:3000",
  },
  {
    path: "/api/control-plane",
    envName: "CONTROL_PLANE_PROXY_TARGET",
    fallbackTarget: "http://localhost:7100",
  },
  {
    path: "/api/orders",
    envName: "ORDER_PROXY_TARGET",
    fallbackTarget: "http://localhost:3003",
  },
  {
    path: "/api/payment",
    envName: "PAYMENT_PROXY_TARGET",
    fallbackTarget: "http://localhost:4000",
  },
  {
    path: "/api/products",
    envName: "PRODUCT_PROXY_TARGET",
    fallbackTarget: "http://localhost:3005",
  },
  {
    path: "/api/search",
    envName: "SEARCH_PROXY_TARGET",
    fallbackTarget: "http://localhost:5003",
  },
];

module.exports = function setupProxy(app) {
  proxyConfigs.forEach(({ path, envName, fallbackTarget }) => {
    const target = resolveTarget(envName, fallbackTarget);
    console.log(`[dev-proxy] ${path} -> ${target}`);

    app.use(
      path,
      createProxyMiddleware({
        target,
        changeOrigin: true,
      }),
    );
  });
};
