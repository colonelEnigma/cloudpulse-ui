const http = require("http");
const { spawn } = require("child_process");

const localIngressPort = process.env.PROD_INGRESS_LOCAL_PORT || "8080";
const proxyTarget = process.env.PROD_API_PROXY_TARGET || `http://localhost:${localIngressPort}`;
const shouldAutoPortForward =
  process.env.SKIP_KUBE_PORT_FORWARD !== "true" &&
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(proxyTarget);

process.env.PORT = process.env.PORT || "3001";
process.env.BROWSER = process.env.BROWSER || "none";
process.env.PROD_API_PROXY_TARGET = proxyTarget;

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

const waitForProxyTarget = async () => {
  const deadline = Date.now() + 20000;
  const healthUrl = `${proxyTarget}/api/control-plane/status`;

  while (Date.now() < deadline) {
    const result = await request(healthUrl);
    if (result.ok) {
      return result;
    }
    await sleep(1000);
  }

  throw new Error(`Timed out waiting for ${healthUrl}`);
};

const startPortForward = async () => {
  if (!shouldAutoPortForward) {
    return;
  }

  const existing = await request(`${proxyTarget}/api/control-plane/status`);
  if (existing.ok) {
    console.log(`[dev-start] Reusing existing proxy target ${proxyTarget}`);
    return;
  }

  console.log(`[dev-start] Starting Kubernetes ingress tunnel on ${proxyTarget}`);
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

  await waitForProxyTarget();
};

const startReact = () => {
  console.log(`[dev-start] Frontend: http://localhost:${process.env.PORT}`);
  console.log(`[dev-start] API proxy target: ${process.env.PROD_API_PROXY_TARGET}`);

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

startPortForward()
  .then(startReact)
  .catch((error) => {
    cleanup();
    console.error(`[dev-start] ${error.message}`);
    process.exit(1);
  });
