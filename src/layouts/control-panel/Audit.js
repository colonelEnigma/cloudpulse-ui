import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { getActions } from "services/controlPlaneService";
import ControlPanelState from "./components/ControlPanelState";
import { asArray, errorMessage, formatDate, getValue } from "./utils";

export default function Audit() {
  const [state, setState] = useState({ loading: true, error: "", actions: [] });

  useEffect(() => {
    let mounted = true;

    getActions()
      .then((data) => {
        if (mounted) setState({ loading: false, error: "", actions: asArray(data, ["actions"]) });
      })
      .catch((error) => {
        if (mounted) setState({ loading: false, error: errorMessage(error), actions: [] });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        Manual Action Audit
      </MDTypography>
      <MDTypography color="text" mb={2}>
        Live backend audit records for Control Panel actions.
      </MDTypography>
      <ControlPanelState
        loading={state.loading}
        error={state.error}
        empty={!state.actions.length}
        emptyText="No manual Control Panel actions returned."
      >
        <Grid container spacing={2}>
          {state.actions.map((action, index) => (
            <Grid item xs={12} md={6} xl={4} key={getValue(action, ["id"], index)}>
              <Card>
                <MDBox p={2}>
                  <MDTypography variant="button" fontWeight="medium">
                    {getValue(action, ["service"])} - {getValue(action, ["action"], "scale")}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Result: {getValue(action, ["result"])}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Requested replicas:{" "}
                    {getValue(action, ["requested_replicas", "requestedReplicas"])}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Previous replicas: {getValue(action, ["previous_replicas", "previousReplicas"])}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Admin: {getValue(action, ["user_email", "userEmail", "user_id", "userId"])}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Reason: {getValue(action, ["reason"])}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    {formatDate(getValue(action, ["created_at", "createdAt"], ""))}
                  </MDTypography>
                </MDBox>
              </Card>
            </Grid>
          ))}
        </Grid>
      </ControlPanelState>
    </MDBox>
  );
}
