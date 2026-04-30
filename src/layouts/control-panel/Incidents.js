import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

export default function Incidents() {
  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        Incidents
      </MDTypography>
      <MDTypography color="text">
        Prometheus alert-style incidents and healer history will appear here (UI-only).
      </MDTypography>
    </MDBox>
  );
}
