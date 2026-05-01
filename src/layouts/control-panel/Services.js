import { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
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

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function deploymentHealth(deployment) {
  const desired = numberValue(getValue(deployment, ["desired", "desiredReplicas", "replicas"], 0));
  const ready = numberValue(getValue(deployment, ["ready", "readyReplicas"], 0));
  const available = numberValue(getValue(deployment, ["available", "availableReplicas"], 0));

  if (desired === 0) {
    return { label: "Scaled down", color: "default", desired, ready, available };
  }

  if (desired === null || ready === null || available === null) {
    return { label: "Unknown", color: "warning", desired, ready, available };
  }

  if (available === 0) {
    return { label: "Down", color: "error", desired, ready, available };
  }

  if (ready < desired || available < desired) {
    return { label: "Degraded", color: "warning", desired, ready, available };
  }

  return { label: "Healthy", color: "success", desired, ready, available };
}

function ReplicaChip({ label, value, color }) {
  return (
    <Chip
      label={`${label}: ${formatValue(value)}`}
      color={color}
      size="small"
      variant={color === "default" ? "outlined" : "filled"}
      sx={{ mr: 1, mb: 1 }}
    />
  );
}

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
          const health = deploymentHealth(deployment);

          return (
            <Grid item xs={12} md={6} xl={4} key={service}>
              <Card>
                <MDBox p={2}>
                  <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <MDTypography variant="button" fontWeight="medium">
                      {service}
                    </MDTypography>
                    <Chip label={health.label} color={health.color} size="small" />
                  </MDBox>
                  <MDBox display="flex" flexWrap="wrap" mb={1}>
                    <ReplicaChip label="Desired" value={health.desired} color="default" />
                    <ReplicaChip
                      label="Ready"
                      value={health.ready}
                      color={
                        health.ready === health.desired && health.desired > 0
                          ? "success"
                          : health.color
                      }
                    />
                    <ReplicaChip label="Available" value={health.available} color={health.color} />
                  </MDBox>
                  <MDTypography variant="caption" color="text" display="block">
                    Image: {formatValue(getValue(deployment, ["image", "containerImage"]))}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Pods: {formatValue(getValue(deployment, ["podStatus", "podsReady", "pods"]))}
                  </MDTypography>
                  <MDBox mt={1.5}>
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
