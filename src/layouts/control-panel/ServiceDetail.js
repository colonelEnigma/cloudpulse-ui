import React from "react";
import { useParams } from "react-router-dom";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

export default function ServiceDetail() {
  const { service } = useParams();

  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        {service}
      </MDTypography>

      <MDTypography color="text" mb={2}>
        Deployment status, pods, image, recent events and logs would show here.
      </MDTypography>

      <MDTypography variant="subtitle2" mb={1}>
        Guarded Scale Action (UI-only)
      </MDTypography>
      <MDBox display="flex" alignItems="center" gap={1} mb={2}>
        <MDInput placeholder="Type service name to confirm" />
        <MDButton variant="contained" color="error">
          Scale to 0
        </MDButton>
        <MDButton variant="contained" color="success">
          Scale to 1
        </MDButton>
      </MDBox>

      <MDTypography color="text">
        No backend connected — actions are disabled until API is available.
      </MDTypography>
    </MDBox>
  );
}
