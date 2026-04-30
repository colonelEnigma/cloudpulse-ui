import React from "react";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

export default function Overview() {
  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        Overview
      </MDTypography>
      <MDTypography color="text">
        Summary metrics and health panels will appear here (UI-only).
      </MDTypography>
    </MDBox>
  );
}
