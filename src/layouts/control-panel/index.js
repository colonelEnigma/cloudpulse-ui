import React from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

import Overview from "./Overview";
import Services from "./Services";
import Logs from "./Logs";
import Incidents from "./Incidents";
import Resilience from "./Resilience";
import Audit from "./Audit";
import AiAssistant from "./AiAssistant";

function NavButton({ to, children }) {
  return (
    <MDButton
      component={NavLink}
      to={to}
      variant="outlined"
      color="info"
      sx={{ mr: 1, mb: 1, textDecoration: "none" }}
    >
      {children}
    </MDButton>
  );
}

export default function ControlPanel() {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
              >
                <MDTypography variant="h6" color="white">
                  Control Panel
                </MDTypography>
              </MDBox>

              <MDBox p={2}>
                <MDBox display="flex" flexWrap="wrap" mb={2}>
                  <NavButton to="overview">Overview</NavButton>
                  <NavButton to="services">Services</NavButton>
                  <NavButton to="logs">Logs</NavButton>
                  <NavButton to="incidents">Incidents</NavButton>
                  <NavButton to="resilience">Resilience</NavButton>
                  <NavButton to="ai">AI Assistant</NavButton>
                  <NavButton to="audit">Audit</NavButton>
                </MDBox>

                <Routes>
                  <Route path="" element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<Overview />} />
                  <Route path="services/*" element={<Services />} />
                  <Route path="logs" element={<Logs />} />
                  <Route path="incidents" element={<Incidents />} />
                  <Route path="resilience" element={<Resilience />} />
                  <Route path="ai" element={<AiAssistant />} />
                  <Route path="audit" element={<Audit />} />
                </Routes>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}
