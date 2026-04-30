import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { getLogs, getServiceLogs } from "services/controlPlaneService";
import ControlPanelState from "./components/ControlPanelState";
import LogBlock from "./components/LogBlock";
import ServiceSelector from "./components/ServiceSelector";
import { asArray, errorMessage } from "./utils";

export default function Logs() {
  const [selectedService, setSelectedService] = useState("all");
  const [state, setState] = useState({ loading: true, error: "", logs: [] });

  useEffect(() => {
    let mounted = true;
    setState((current) => ({ ...current, loading: true, error: "" }));

    const request = selectedService === "all" ? getLogs() : getServiceLogs(selectedService);

    request
      .then((data) => {
        if (mounted) setState({ loading: false, error: "", logs: asArray(data, ["logs"]) });
      })
      .catch((error) => {
        if (mounted) setState({ loading: false, error: errorMessage(error), logs: [] });
      });

    return () => {
      mounted = false;
    };
  }, [selectedService]);

  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        Recent Logs
      </MDTypography>
      <MDTypography color="text" mb={2}>
        Live bounded logs for prod allowlisted services.
      </MDTypography>
      <ServiceSelector value={selectedService} onChange={setSelectedService} includeAll />
      <ControlPanelState
        loading={state.loading}
        error={state.error}
        empty={!state.logs.length}
        emptyText="No recent logs returned."
      >
        <Card>
          <MDBox p={2}>
            <LogBlock logs={state.logs} />
          </MDBox>
        </Card>
      </ControlPanelState>
    </MDBox>
  );
}
