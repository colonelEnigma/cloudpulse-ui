import PropTypes from "prop-types";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { controlPlaneRecoveryHint } from "../utils";

function ControlPanelState({ loading, error, empty, emptyText, children }) {
  if (loading) {
    return (
      <Card>
        <MDBox p={3} display="flex" alignItems="center" gap={2}>
          <CircularProgress size={22} />
          <MDTypography variant="button" color="text">
            Loading live control plane data...
          </MDTypography>
        </MDBox>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <MDBox p={3}>
          <MDTypography variant="h6" color="error" mb={1}>
            Control Plane request failed
          </MDTypography>
          <MDTypography variant="body2" color="text">
            {error}
          </MDTypography>
          <MDTypography variant="caption" color="text" display="block" mt={1}>
            {controlPlaneRecoveryHint(error)}
          </MDTypography>
        </MDBox>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card>
        <MDBox p={3}>
          <MDTypography variant="body2" color="text">
            {emptyText}
          </MDTypography>
        </MDBox>
      </Card>
    );
  }

  return children;
}

ControlPanelState.defaultProps = {
  error: "",
  empty: false,
  emptyText: "No live data returned.",
};

ControlPanelState.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  empty: PropTypes.bool,
  emptyText: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default ControlPanelState;
