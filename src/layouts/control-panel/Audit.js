import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

export default function Audit() {
  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        Audit
      </MDTypography>
      <MDTypography color="text">
        Manual Control Panel action history will appear here (UI-only).
      </MDTypography>
    </MDBox>
  );
}
