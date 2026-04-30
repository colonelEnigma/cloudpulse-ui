import PropTypes from "prop-types";
import MenuItem from "@mui/material/MenuItem";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import { ALLOWLISTED_SERVICES } from "../utils";

function ServiceSelector({ value, onChange, includeAll }) {
  return (
    <MDBox mb={2}>
      <MDTypography variant="button" color="text" fontWeight="medium">
        Service
      </MDTypography>
      <MDInput
        select
        fullWidth
        value={value}
        onChange={(event) => onChange(event.target.value)}
        sx={{ mt: 1, maxWidth: 360 }}
      >
        {includeAll && <MenuItem value="all">All allowlisted services</MenuItem>}
        {ALLOWLISTED_SERVICES.map((service) => (
          <MenuItem key={service} value={service}>
            {service}
          </MenuItem>
        ))}
      </MDInput>
    </MDBox>
  );
}

ServiceSelector.defaultProps = {
  includeAll: false,
};

ServiceSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  includeAll: PropTypes.bool,
};

export default ServiceSelector;
