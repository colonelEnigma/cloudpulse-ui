import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

export default function Logs() {
  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        Logs
      </MDTypography>
      <MDTypography color="text">
        Combined and per-service recent logs will appear here (UI-only).
      </MDTypography>
    </MDBox>
  );
}
