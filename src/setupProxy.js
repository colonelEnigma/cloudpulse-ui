const dotenv = require("dotenv");
const { createProxyMiddleware } = require("http-proxy-middleware");

// CRA dev proxy is only for Control Plane access during local frontend dev.
// App APIs call Docker Compose services directly from src/config.js in development.
// AI routes use local Docker control-plane-service so it can reach laptop LM Studio.
dotenv.config({ path: ".env.development.local" });
dotenv.config({ path: ".env.local" });
dotenv.config();

const controlPlaneTarget =
  process.env.CONTROL_PLANE_PROXY_TARGET || "http://localhost:18080";
const controlPlaneAiTarget =
  process.env.CONTROL_PLANE_AI_PROXY_TARGET || "http://localhost:7100";

module.exports = function setupProxy(app) {
  console.log(`[dev-proxy] /api/control-plane/ai -> ${controlPlaneAiTarget}`);
  console.log(`[dev-proxy] /api/control-plane -> ${controlPlaneTarget}`);

  app.use(
    "/api/control-plane/ai",
    createProxyMiddleware({
      target: controlPlaneAiTarget,
      changeOrigin: true,
    }),
  );

  app.use(
    "/api/control-plane",
    createProxyMiddleware({
      target: controlPlaneTarget,
      changeOrigin: true,
    }),
  );
};
