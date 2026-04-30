export const ALLOWLISTED_SERVICES = [
  "user-service",
  "order-service",
  "payment-service",
  "product-service",
  "search-service",
];

export const unwrapData = (value) => {
  if (value && !Array.isArray(value) && typeof value === "object" && value.data) {
    return value.data;
  }

  return value;
};

export const asArray = (value, preferredKeys = []) => {
  const source = unwrapData(value);

  if (Array.isArray(source)) return source;
  if (typeof source === "string") return [source];
  if (!source || typeof source !== "object") return [];

  const keys = [
    ...preferredKeys,
    "items",
    "results",
    "deployments",
    "services",
    "logs",
    "events",
    "alerts",
    "history",
    "actions",
    "records",
    "entries",
    "lines",
  ];

  for (const key of keys) {
    if (Array.isArray(source[key])) return source[key];
  }

  return [];
};

export const getValue = (source, paths, fallback = "N/A") => {
  if (!source || typeof source !== "object") return fallback;

  for (const path of paths) {
    const value = path.split(".").reduce((current, part) => {
      if (current === undefined || current === null) return undefined;
      return current[part];
    }, source);

    if (value !== undefined && value !== null && value !== "") return value;
  }

  return fallback;
};

export const formatValue = (value) => {
  if (value === undefined || value === null || value === "") return "N/A";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

export const getServiceName = (item) =>
  getValue(item, ["service", "name", "deployment", "deploymentName", "metadata.name"], "unknown");

export const errorMessage = (error) => {
  const status = error?.response?.status;
  const responseData = error?.response?.data;
  const responseText =
    typeof responseData === "string"
      ? responseData
      : responseData && typeof responseData === "object"
      ? JSON.stringify(responseData)
      : "";
  const message =
    responseData?.message ||
    responseData?.error ||
    responseData?.reason ||
    responseText ||
    error?.message ||
    "Request failed";

  if (status === 403) return `403 Forbidden: ${message}`;
  if (status === 401) return `401 Unauthorized: ${message}`;

  return message;
};

export const controlPlaneRecoveryHint = (error) => {
  const text = String(error || "");

  if (text.includes("403 Forbidden")) {
    return "Your session is authenticated but does not have admin access. Sign in with an admin user and try again.";
  }

  if (text.includes("401 Unauthorized")) {
    return "Your session is missing or expired. Sign in again and retry the Control Panel request.";
  }

  if (
    text.includes("ECONNREFUSED") ||
    text.includes(":8080") ||
    text.toLowerCase().includes("kubernetes")
  ) {
    return "Status can work without cluster reads, but this page needs a control-plane-service instance with real Kubernetes connectivity. Run it in-cluster or with a valid kube API connection, then refresh.";
  }

  return "Check that the control-plane-service is running, reachable through /api/control-plane, and connected to its live prod dependencies.";
};
