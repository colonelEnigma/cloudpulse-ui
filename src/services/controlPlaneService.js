import { createApiClient } from "./api";

const controlPlaneApi = createApiClient();
const CONTROL_PLANE_BASE = "/api/control-plane";

export const getStatus = async () => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/status`);
  return response.data;
};

export const getOverview = async () => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/overview`);
  return response.data;
};

export const getDeployments = async () => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/deployments`);
  return response.data;
};

export const getServiceDetail = async (service) => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/services/${service}`);
  return response.data;
};

export const getLogs = async () => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/logs`);
  return response.data;
};

export const getServiceLogs = async (service) => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/logs/${service}`);
  return response.data;
};

export const getServiceEvents = async (service) => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/events/${service}`);
  return response.data;
};

export const getAlerts = async () => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/alerts`);
  return response.data;
};

export const getHealingHistory = async () => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/healing-history`);
  return response.data;
};

export const getResilience = async () => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/resilience`);
  return response.data;
};

export const getActions = async () => {
  const response = await controlPlaneApi.get(`${CONTROL_PLANE_BASE}/actions`);
  return response.data;
};

export const scaleService = async ({ service, replicas, confirmation }) => {
  const response = await controlPlaneApi.post(`${CONTROL_PLANE_BASE}/actions/scale`, {
    namespace: "prod",
    service,
    replicas,
    confirmation,
  });
  return response.data;
};
