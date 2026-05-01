const http = require("http");
const { spawn } = require("child_process");

const localIngressPort = process.env.PROD_INGRESS_LOCAL_PORT || "18080";
const controlPlaneTarget =
  process.env.CONTROL_PLANE_PROXY_TARGET || `http://localhost:${localIngressPort}`;
const controlPlaneAiTarget =
  process.env.CONTROL_PLANE_AI_PROXY_TARGET || "http://localhost:7100";
const shouldAutoPortForward =
  process.env.SKIP_KUBE_PORT_FORWARD !== "true" &&
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(controlPlaneTarget);

process.env.PORT = process.env.PORT || "3001";
process.env.BROWSER = process.env.BROWSER || "none";
process.env.CONTROL_PLANE_PROXY_TARGET = controlPlaneTarget;
process.env.CONTROL_PLANE_AI_PROXY_TARGET = controlPlaneAiTarget;

let portForwardProcess = null;
let reactProcess = null;

const request = (url, timeoutMs = 2500) =>
  new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      res.on("end", () => resolve({ ok: true, statusCode: res.statusCode }));
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("timeout"));
    });

    req.on("error", (error) => {
      resolve({ ok: false, error: error.message });
    });
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForControlPlaneTarget = async () => {
  const deadline = Date.now() + 20000;
  const healthUrl = `${controlPlaneTarget}/api/control-plane/status`;

  while (Date.now() < deadline) {
    const result = await request(healthUrl);
    if (result.ok) {
      return result;
    }
    await sleep(1000);
  }

  throw new Error(`Timed out waiting for ${healthUrl}`);
};

const startControlPlanePortForward = async () => {
  if (!shouldAutoPortForward) {
    return;
  }

  const existing = await request(`${controlPlaneTarget}/api/control-plane/status`);
  if (existing.ok) {
    console.log(`[dev-start] Reusing existing Control Plane target ${controlPlaneTarget}`);
    return;
  }

  console.log(`[dev-start] Starting prod Control Plane tunnel on ${controlPlaneTarget}`);
  portForwardProcess = spawn(
    "kubectl",
    [
      "port-forward",
      "-n",
      "ingress-nginx",
      "svc/ingress-nginx-controller",
      `${localIngressPort}:80`,
    ],
    { stdio: "inherit", shell: true },
  );

  portForwardProcess.on("exit", (code) => {
    if (reactProcess && !reactProcess.killed) {
      console.error(`[dev-start] kubectl port-forward exited with code ${code}`);
      reactProcess.kill();
    }
  });

  await waitForControlPlaneTarget();
};

const printMappings = () => {
  console.log(`[dev-start] Frontend: http://localhost:${process.env.PORT}`);
  console.log("[dev-start] App APIs call Docker Compose directly:");
  console.log("[dev-start]   /api/users    -> http://localhost:3000");
  console.log("[dev-start]   /api/orders   -> http://localhost:3003");
  console.log("[dev-start]   /api/payment  -> http://localhost:4000");
  console.log("[dev-start]   /api/products -> http://localhost:3005");
  console.log("[dev-start]   /api/search   -> http://localhost:5003");
  console.log(`[dev-start] Control Plane proxy: /api/control-plane -> ${controlPlaneTarget}`);
  console.log(`[dev-start] Control Plane AI proxy: /api/control-plane/ai -> ${controlPlaneAiTarget}`);
};

const startReact = () => {
  printMappings();

  reactProcess = spawn("react-scripts", ["start"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });

  reactProcess.on("exit", (code) => {
    cleanup();
    process.exit(code || 0);
  });
};

const cleanup = () => {
  if (portForwardProcess && !portForwardProcess.killed) {
    portForwardProcess.kill();
  }
};

process.on("SIGINT", () => {
  cleanup();
  process.exit(130);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(143);
});

startControlPlanePortForward()
  .then(startReact)
  .catch((error) => {
    cleanup();
    console.error(`[dev-start] ${error.message}`);
    process.exit(1);
  });
