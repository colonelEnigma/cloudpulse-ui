import React from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

import ServiceDetail from "./ServiceDetail";

const mockServices = [
  "user-service",
  "order-service",
  "payment-service",
  "product-service",
  "search-service",
];

function ServiceList() {
  return (
    <MDBox>
      <MDTypography variant="h6" mb={2}>
        Allowlisted Services
      </MDTypography>
      <MDBox display="flex" flexDirection="column" gap={1}>
        {mockServices.map((s) => (
          <MDButton key={s} component={NavLink} to={s} variant="outlined" color="info">
            {s}
          </MDButton>
        ))}
      </MDBox>
    </MDBox>
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
