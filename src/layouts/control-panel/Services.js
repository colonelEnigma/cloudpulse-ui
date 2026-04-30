import { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { getDeployments } from "services/controlPlaneService";

import ServiceDetail from "./ServiceDetail";
import ControlPanelState from "./components/ControlPanelState";
import {
  ALLOWLISTED_SERVICES,
  asArray,
  errorMessage,
  formatValue,
  getServiceName,
  getValue,
} from "./utils";

function ServiceList() {
  const [state, setState] = useState({ loading: true, error: "", deployments: [] });

  useEffect(() => {
    let mounted = true;

    getDeployments()
      .then((data) => {
        if (mounted) {
          setState({ loading: false, error: "", deployments: asArray(data, ["deployments"]) });
        }
      })
      .catch((error) => {
        if (mounted) {
          setState({ loading: false, error: errorMessage(error), deployments: [] });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const byName = state.deployments.reduce((accumulator, deployment) => {
    accumulator[getServiceName(deployment)] = deployment;
    return accumulator;
  }, {});

  return (
    <ControlPanelState loading={state.loading} error={state.error} empty={false}>
      <MDTypography variant="h6" mb={2}>
        Allowlisted Prod Services
      </MDTypography>
      <Grid container spacing={2}>
        {ALLOWLISTED_SERVICES.map((service) => {
          const deployment = byName[service] || {};

          return (
            <Grid item xs={12} md={6} xl={4} key={service}>
              <Card>
                <MDBox p={2}>
                  <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <MDTypography variant="button" fontWeight="medium">
                      {service}
                    </MDTypography>
                    <MDButton
                      component={NavLink}
                      to={service}
                      variant="outlined"
                      color="info"
                      size="small"
                    >
                      Details
                    </MDButton>
                  </MDBox>
                  <MDTypography variant="caption" color="text" display="block">
                    Desired: {formatValue(getValue(deployment, ["desired", "desiredReplicas"]))}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Ready: {formatValue(getValue(deployment, ["ready", "readyReplicas"]))}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Available:{" "}
                    {formatValue(getValue(deployment, ["available", "availableReplicas"]))}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Image: {formatValue(getValue(deployment, ["image", "containerImage"]))}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Pods: {formatValue(getValue(deployment, ["podStatus", "podsReady", "pods"]))}
                  </MDTypography>
                </MDBox>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </ControlPanelState>
  );
}

export default function Services() {
  return (
    <MDBox>
      <Routes>
        <Route path="" element={<ServiceList />} />
        <Route path=":service" element={<ServiceDetail />} />
      </Routes>
    </MDBox>
  );
}
