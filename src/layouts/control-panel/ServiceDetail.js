import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import { NavLink, useParams } from "react-router-dom";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import {
  getActions,
  getServiceDetail,
  getServiceEvents,
  getServiceLogs,
  scaleService,
} from "services/controlPlaneService";
import ControlPanelState from "./components/ControlPanelState";
import LogBlock from "./components/LogBlock";
import {
  ALLOWLISTED_SERVICES,
  asArray,
  errorMessage,
  formatDate,
  formatValue,
  getValue,
} from "./utils";

export default function ServiceDetail() {
  const { service } = useParams();
  const [state, setState] = useState({
    loading: true,
    error: "",
    detail: null,
    logs: [],
    events: [],
    actions: [],
  });
  const [confirmation, setConfirmation] = useState("");
  const [actionState, setActionState] = useState({ loading: false, error: "", response: null });

  const loadService = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));

    return Promise.all([
      getServiceDetail(service),
      getServiceLogs(service),
      getServiceEvents(service),
      getActions(),
    ])
      .then(([detail, logs, events, actions]) => {
        const actionRows = asArray(actions, ["actions"]).filter(
          (action) => getValue(action, ["service"], "") === service
        );

        setState({
          loading: false,
          error: "",
          detail,
          logs: asArray(logs, ["logs"]),
          events: asArray(events, ["events"]),
          actions: actionRows,
        });
      })
      .catch((error) => {
        setState((current) => ({ ...current, loading: false, error: errorMessage(error) }));
      });
  }, [service]);

  useEffect(() => {
    if (ALLOWLISTED_SERVICES.includes(service)) {
      loadService();
    } else {
      setState({
        loading: false,
        error: `${service} is not in the Control Plane allowlist.`,
        detail: null,
        logs: [],
        events: [],
        actions: [],
      });
    }
  }, [loadService, service]);

  const confirmationMatches = confirmation === service;

  const handleScale = async (replicas) => {
    setActionState({ loading: true, error: "", response: null });

    try {
      const response = await scaleService({ service, replicas, confirmation });
      setActionState({ loading: false, error: "", response });
      setConfirmation("");
      await loadService();
    } catch (error) {
      setActionState({ loading: false, error: errorMessage(error), response: null });
      loadService();
    }
  };

  const deployment = getValue(state.detail, ["deployment"], state.detail || {});
  const pods = asArray(state.detail, ["pods"]);
  const replicaSets = asArray(state.detail, ["replicaSets", "replicasets"]);

  return (
    <ControlPanelState loading={state.loading} error={state.error} empty={!state.detail}>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <MDBox>
          <MDTypography variant="h5">{service}</MDTypography>
          <MDTypography color="text" variant="body2">
            Live prod deployment diagnostics and guarded scale action.
          </MDTypography>
        </MDBox>
        <MDButton component={NavLink} to="/control-panel/services" variant="outlined" color="info">
          Back
        </MDButton>
      </MDBox>

      <Grid container spacing={2} mb={2}>
        <Grid item xs={12} lg={7}>
          <Card>
            <MDBox p={2}>
              <MDTypography variant="h6" mb={2}>
                Deployment
              </MDTypography>
              <Grid container spacing={1}>
                {[
                  ["Desired", ["desired", "desiredReplicas", "replicas", "spec.replicas"]],
                  ["Ready", ["ready", "readyReplicas", "status.readyReplicas"]],
                  ["Available", ["available", "availableReplicas", "status.availableReplicas"]],
                  ["Image", ["image", "containerImage"]],
                  ["Namespace", ["namespace", "metadata.namespace"]],
                ].map(([label, paths]) => (
                  <Grid item xs={12} md={6} key={label}>
                    <MDTypography variant="caption" color="text" display="block">
                      {label}
                    </MDTypography>
                    <MDTypography variant="button" fontWeight="medium">
                      {formatValue(getValue(deployment, paths))}
                    </MDTypography>
                  </Grid>
                ))}
              </Grid>
            </MDBox>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card>
            <MDBox p={2}>
              <MDTypography variant="h6" mb={1}>
                Guarded Scale
              </MDTypography>
              <MDTypography variant="body2" color="text" mb={2}>
                Type {service} exactly to enable scaling to replicas 0 or 1.
              </MDTypography>
              <MDInput
                fullWidth
                value={confirmation}
                error={Boolean(confirmation) && !confirmationMatches}
                success={confirmationMatches}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Type service name to confirm"
              />
              <MDBox display="flex" gap={1} mt={2} flexWrap="wrap">
                <MDButton
                  color="error"
                  disabled={!confirmationMatches || actionState.loading}
                  onClick={() => handleScale(0)}
                >
                  Scale Down
                </MDButton>
                <MDButton
                  color="success"
                  disabled={!confirmationMatches || actionState.loading}
                  onClick={() => handleScale(1)}
                >
                  Scale Up
                </MDButton>
              </MDBox>
              {confirmation && !confirmationMatches && (
                <MDTypography variant="caption" color="error" display="block" mt={1}>
                  Confirmation must exactly match {service}.
                </MDTypography>
              )}
              {actionState.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {actionState.error}
                </Alert>
              )}
              {actionState.response && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {formatValue(
                    getValue(actionState.response, ["message", "reason", "result"], "Action done")
                  )}
                </Alert>
              )}
            </MDBox>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={6}>
          <Card>
            <MDBox p={2}>
              <MDTypography variant="h6" mb={2}>
                Pods And ReplicaSets
              </MDTypography>
              {[...pods, ...replicaSets].length ? (
                [...pods, ...replicaSets].map((item, index) => (
                  <MDBox key={`runtime-${index}`} mb={1.5}>
                    <MDTypography variant="button" fontWeight="medium">
                      {getValue(item, ["name", "pod", "podName", "metadata.name"], "runtime item")}
                    </MDTypography>
                    <MDTypography variant="caption" color="text" display="block">
                      {formatValue(getValue(item, ["status", "phase", "ready", "replicas"]))}
                    </MDTypography>
                  </MDBox>
                ))
              ) : (
                <MDTypography variant="body2" color="text">
                  No pod or ReplicaSet details returned.
                </MDTypography>
              )}
            </MDBox>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card>
            <MDBox p={2}>
              <MDTypography variant="h6" mb={2}>
                Recent Events
              </MDTypography>
              {state.events.length ? (
                state.events.slice(0, 8).map((event, index) => (
                  <MDBox key={`event-${index}`} mb={1.5}>
                    <MDTypography variant="button" fontWeight="medium">
                      {getValue(event, ["reason", "type", "name"], "Event")}
                    </MDTypography>
                    <MDTypography variant="caption" color="text" display="block">
                      {getValue(event, ["message", "note"])} -{" "}
                      {formatDate(
                        getValue(event, ["lastTimestamp", "eventTime", "created_at"], "")
                      )}
                    </MDTypography>
                  </MDBox>
                ))
              ) : (
                <MDTypography variant="body2" color="text">
                  No recent events returned.
                </MDTypography>
              )}
            </MDBox>
          </Card>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Card>
            <MDBox p={2}>
              <MDTypography variant="h6" mb={2}>
                Recent Logs
              </MDTypography>
              <LogBlock logs={state.logs} />
            </MDBox>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card>
            <MDBox p={2}>
              <MDTypography variant="h6" mb={2}>
                Recent Manual Actions
              </MDTypography>
              {state.actions.length ? (
                state.actions.slice(0, 6).map((action, index) => (
                  <MDBox key={`action-${index}`} mb={1.5}>
                    <MDTypography variant="button" fontWeight="medium">
                      {getValue(action, ["result"], "result")} replicas{" "}
                      {getValue(action, ["requested_replicas", "requestedReplicas"])}
                    </MDTypography>
                    <MDTypography variant="caption" color="text" display="block">
                      {getValue(action, ["reason"])} -{" "}
                      {formatDate(getValue(action, ["created_at", "createdAt"], ""))}
                    </MDTypography>
                  </MDBox>
                ))
              ) : (
                <MDTypography variant="body2" color="text">
                  No manual actions returned for this service.
                </MDTypography>
              )}
            </MDBox>
          </Card>
        </Grid>
      </Grid>
    </ControlPanelState>
  );
}
