import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { getOverview, getStatus } from "services/controlPlaneService";
import ControlPanelState from "./components/ControlPanelState";
import { asArray, errorMessage, formatDate, formatValue, getServiceName, getValue } from "./utils";

function MetricCard({ label, value, color }) {
  return (
    <Card>
      <MDBox p={2}>
        <MDTypography variant="button" color="text" fontWeight="medium">
          {label}
        </MDTypography>
        <MDTypography variant="h4" color={color} mt={1}>
          {value}
        </MDTypography>
      </MDBox>
    </Card>
  );
}

export default function Overview() {
  const [state, setState] = useState({ loading: true, error: "", status: null, overview: null });

  useEffect(() => {
    let mounted = true;

    Promise.all([getStatus(), getOverview()])
      .then(([status, overview]) => {
        if (mounted) setState({ loading: false, error: "", status, overview });
      })
      .catch((error) => {
        if (mounted) {
          setState((current) => ({ ...current, loading: false, error: errorMessage(error) }));
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const deployments = asArray(state.overview, ["deployments"]);
  const alerts = asArray(state.overview, ["alerts"]);
  const healingHistory = asArray(state.overview, ["healingHistory", "healing_history", "history"]);
  const actions = asArray(state.overview, ["recentActions", "manualActions", "actions"]);
  const namespace = getValue(
    state.status,
    ["namespaceScope", "namespace", "scope.namespace"],
    "prod"
  );
  const ready = getValue(state.status, ["ready", "readiness.ready", "status"], "live");
  const degradedCount = deployments.filter((deployment) => {
    const desired = Number(getValue(deployment, ["desired", "desiredReplicas", "replicas"], 0));
    const readyReplicas = Number(getValue(deployment, ["ready", "readyReplicas"], 0));
    return desired !== readyReplicas;
  }).length;

  return (
    <ControlPanelState loading={state.loading} error={state.error} empty={!state.overview}>
      <MDTypography variant="h5" mb={1}>
        Prod Control Plane Overview
      </MDTypography>
      <MDTypography color="text" mb={3}>
        Live namespace scope: {formatValue(namespace)}. Backend readiness: {formatValue(ready)}.
      </MDTypography>

      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={3}>
          <MetricCard label="Allowlisted services" value={deployments.length} color="info" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Degraded services" value={degradedCount} color="warning" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Active alerts" value={alerts.length} color="error" />
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard label="Recent actions" value={actions.length} color="success" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Card>
            <MDBox p={2}>
              <MDTypography variant="h6" mb={2}>
                Service Health
              </MDTypography>
              {deployments.length ? (
                deployments.map((deployment) => (
                  <MDBox key={getServiceName(deployment)} mb={1.5}>
                    <MDTypography variant="button" fontWeight="medium">
                      {getServiceName(deployment)}
                    </MDTypography>
                    <MDTypography variant="caption" color="text" display="block">
                      Desired {formatValue(getValue(deployment, ["desired", "desiredReplicas"]))} |
                      Ready {formatValue(getValue(deployment, ["ready", "readyReplicas"]))} |
                      Available{" "}
                      {formatValue(getValue(deployment, ["available", "availableReplicas"]))}
                    </MDTypography>
                  </MDBox>
                ))
              ) : (
                <MDTypography variant="body2" color="text">
                  No deployment summary returned.
                </MDTypography>
              )}
            </MDBox>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <MDBox p={2}>
              <MDTypography variant="h6" mb={2}>
                Alerts And Recent Activity
              </MDTypography>
              {alerts.slice(0, 5).map((alert, index) => (
                <MDBox key={`alert-${index}`} mb={1.5}>
                  <MDTypography variant="button" color="error" fontWeight="medium">
                    {getValue(alert, ["alertname", "name", "labels.alertname"], "Alert")}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    {getValue(alert, ["state", "status", "severity", "labels.severity"])}
                  </MDTypography>
                </MDBox>
              ))}
              {healingHistory.slice(0, 3).map((entry, index) => (
                <MDBox key={`healing-${index}`} mb={1.5}>
                  <MDTypography variant="button" fontWeight="medium">
                    Healing: {getValue(entry, ["deployment", "service"])}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    {getValue(entry, ["result"])} | {getValue(entry, ["reason"])} |{" "}
                    {formatDate(getValue(entry, ["created_at", "createdAt"], ""))}
                  </MDTypography>
                </MDBox>
              ))}
              {actions.slice(0, 3).map((action, index) => (
                <MDBox key={`action-${index}`} mb={1.5}>
                  <MDTypography variant="button" fontWeight="medium">
                    Manual: {getValue(action, ["service"])}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    {getValue(action, ["result"])} | replicas{" "}
                    {getValue(action, ["requested_replicas", "requestedReplicas"])} |{" "}
                    {formatDate(getValue(action, ["created_at", "createdAt"], ""))}
                  </MDTypography>
                </MDBox>
              ))}
              {!alerts.length && !healingHistory.length && !actions.length && (
                <MDTypography variant="body2" color="text">
                  No alerts or recent activity returned.
                </MDTypography>
              )}
            </MDBox>
          </Card>
        </Grid>
      </Grid>
    </ControlPanelState>
  );
}
