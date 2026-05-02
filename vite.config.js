import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const controlPlaneTarget =
    env.CONTROL_PLANE_PROXY_TARGET || "http://localhost:18080";
  const controlPlaneAiTarget =
    env.CONTROL_PLANE_AI_PROXY_TARGET || "http://localhost:7100";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/api/users": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/api/products": {
          target: "http://localhost:3005",
          changeOrigin: true,
        },
        "/api/orders": {
          target: "http://localhost:3003",
          changeOrigin: true,
        },
        "/api/payment": {
          target: "http://localhost:4000",
          changeOrigin: true,
        },
        "/api/control-plane/ai": {
          target: controlPlaneAiTarget,
          changeOrigin: true,
        },
        "/api/control-plane": {
          target: controlPlaneTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
