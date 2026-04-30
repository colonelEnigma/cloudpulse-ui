import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { getAlerts, getHealingHistory, getServiceEvents } from "services/controlPlaneService";
import ControlPanelState from "./components/ControlPanelState";
import ServiceSelector from "./components/ServiceSelector";
import { ALLOWLISTED_SERVICES, asArray, errorMessage, formatDate, getValue } from "./utils";

export default function Incidents() {
  const [selectedService, setSelectedService] = useState(ALLOWLISTED_SERVICES[0]);
  const [state, setState] = useState({
    loading: true,
    error: "",
    alerts: [],
    healingHistory: [],
    events: [],
  });

  useEffect(() => {
    let mounted = true;
    setState((current) => ({ ...current, loading: true, error: "" }));

    Promise.all([getAlerts(), getHealingHistory(), getServiceEvents(selectedService)])
      .then(([alerts, healingHistory, events]) => {
        if (mounted) {
          setState({
            loading: false,
            error: "",
            alerts: asArray(alerts, ["alerts"]),
            healingHistory: asArray(healingHistory, ["history", "healingHistory"]),
            events: asArray(events, ["events"]),
          });
        }
      })
      .catch((error) => {
        if (mounted) {
          setState({
            loading: false,
            error: errorMessage(error),
            alerts: [],
            healingHistory: [],
            events: [],
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [selectedService]);

  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        Incidents
      </MDTypography>
      <MDTypography color="text" mb={2}>
        Live alert state, healer history, and Kubernetes events for prod.
      </MDTypography>
      <ServiceSelector value={selectedService} onChange={setSelectedService} />
      <ControlPanelState
        loading={state.loading}
        error={state.error}
        empty={!state.alerts.length && !state.healingHistory.length && !state.events.length}
        emptyText="No alerts, healer history, or events returned."
      >
        <Grid container spacing={2}>
          <Grid item xs={12} lg={4}>
            <Card>
              <MDBox p={2}>
                <MDTypography variant="h6" mb={2}>
                  Alerts
                </MDTypography>
                {state.alerts.length ? (
                  state.alerts.map((alert, index) => (
                    <MDBox key={`alert-${index}`} mb={1.5}>
                      <MDTypography variant="button" color="error" fontWeight="medium">
                        {getValue(alert, ["alertname", "name", "labels.alertname"], "Alert")}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        {getValue(alert, ["state", "status", "severity", "labels.severity"])}
                      </MDTypography>
                    </MDBox>
                  ))
                ) : (
                  <MDTypography variant="body2" color="text">
                    No active alerts returned.
                  </MDTypography>
                )}
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card>
              <MDBox p={2}>
                <MDTypography variant="h6" mb={2}>
                  Healer History
                </MDTypography>
                {state.healingHistory.length ? (
                  state.healingHistory.slice(0, 10).map((entry, index) => (
                    <MDBox key={`history-${index}`} mb={1.5}>
                      <MDTypography variant="button" fontWeight="medium">
                        {getValue(entry, ["deployment", "service"])}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        {getValue(entry, ["result"])} - {getValue(entry, ["reason"])}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        {formatDate(getValue(entry, ["created_at", "createdAt"], ""))}
                      </MDTypography>
                    </MDBox>
                  ))
                ) : (
                  <MDTypography variant="body2" color="text">
                    No healer history returned.
                  </MDTypography>
                )}
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card>
              <MDBox p={2}>
                <MDTypography variant="h6" mb={2}>
                  {selectedService} Events
                </MDTypography>
                {state.events.length ? (
                  state.events.slice(0, 10).map((event, index) => (
                    <MDBox key={`event-${index}`} mb={1.5}>
                      <MDTypography variant="button" fontWeight="medium">
                        {getValue(event, ["reason", "type", "name"], "Event")}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        {getValue(event, ["message", "note"])}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        {formatDate(
                          getValue(event, ["lastTimestamp", "eventTime", "created_at"], "")
                        )}
                      </MDTypography>
                    </MDBox>
                  ))
                ) : (
                  <MDTypography variant="body2" color="text">
                    No events returned for this service.
                  </MDTypography>
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </ControlPanelState>
    </MDBox>
  );
}
