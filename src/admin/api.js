import { httpJson } from "@/lib/http";

const base = "/api/control-plane";

export function getAdminOverview() {
  return httpJson(`${base}/overview`, {
    method: "GET",
    auth: true,
  });
}

export function getAdminDeployments() {
  return httpJson(`${base}/deployments`, {
    method: "GET",
    auth: true,
  });
}

export function getAdminServiceDetail(service) {
  return httpJson(`${base}/services/${service}`, {
    method: "GET",
    auth: true,
  });
}

export function getAdminAlerts() {
  return httpJson(`${base}/alerts`, {
    method: "GET",
    auth: true,
  });
}

export function getAdminHealingHistory() {
  return httpJson(`${base}/healing-history`, {
    method: "GET",
    auth: true,
  });
}

export function getAdminLogs() {
  return httpJson(`${base}/logs`, {
    method: "GET",
    auth: true,
  });
}

export function getAdminServiceLogs(service) {
  return httpJson(`${base}/logs/${service}`, {
    method: "GET",
    auth: true,
  });
}

export function getAdminServiceEvents(service) {
  return httpJson(`${base}/events/${service}`, {
    method: "GET",
    auth: true,
  });
}

export function getAdminResilience() {
  return httpJson(`${base}/resilience`, {
    method: "GET",
    auth: true,
  });
}

export function getAdminActions() {
  return httpJson(`${base}/actions`, {
    method: "GET",
    auth: true,
  });
}

export function postAdminScaleAction(payload) {
  return httpJson(`${base}/actions/scale`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getAdminAiStatus() {
  return httpJson(`${base}/ai/status`, {
    method: "GET",
    auth: true,
  });
}

export function postAdminAiChat(payload) {
  return httpJson(`${base}/ai/chat`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}
