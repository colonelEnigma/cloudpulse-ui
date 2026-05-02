import { Link } from "react-router-dom";

export const ALLOWLISTED_SERVICES = [
  "user-service",
  "order-service",
  "payment-service",
  "product-service",
  "search-service",
];

export function AdminState({ loading, error, empty, emptyText = "No data", children }) {
  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (empty) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  return children;
}

export function ServiceSelector({ value, onChange, includeAll = false }) {
  const options = includeAll ? ["all", ...ALLOWLISTED_SERVICES] : ALLOWLISTED_SERVICES;

  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border bg-background px-3 text-sm"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export function LogBlock({ logs = [] }) {
  if (!logs.length) {
    return <p className="text-sm text-muted-foreground">No logs available.</p>;
  }

  const lines = logs
    .map((item) => {
      if (typeof item === "string") return item;

      const service = getValue(item, ["service", "deployment"], "unknown-service");
      const pod = getValue(item, ["pod", "podName"], "unknown-pod");
      const container = getValue(item, ["container"], "");
      const error = getValue(item, ["error"], "");
      const message = getValue(item, ["log", "message", "line", "text"], "");
      const header = [service, pod, container].filter(Boolean).join(" / ");

      if (error && !message) {
        return `${header}\n[log-error] ${error}`;
      }

      return `${header}\n${message || JSON.stringify(item)}`;
    })
    .join("\n\n");

  return (
    <pre className="max-h-96 overflow-auto rounded-lg border bg-black/90 p-3 text-xs text-emerald-200">
      {lines}
    </pre>
  );
}

export function SectionTitle({ title, subtitle, backTo }) {
  return (
    <div className="space-y-2">
      {backTo ? (
        <Link to={backTo} className="text-sm font-medium text-primary hover:underline">
          Back
        </Link>
      ) : null}
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function asArray(value, keys = []) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

export function getValue(source, paths, fallback = "N/A") {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), source);
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return fallback;
}

export function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");
  return date.toLocaleString();
}
