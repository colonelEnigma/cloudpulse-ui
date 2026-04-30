import PropTypes from "prop-types";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { formatValue, getValue } from "../utils";

const toLogLine = (entry) => {
  if (typeof entry === "string") return entry;

  const service = getValue(entry, ["service", "deployment"], "");
  const pod = getValue(entry, ["pod", "podName"], "");
  const message = getValue(entry, ["message", "line", "log", "text"], formatValue(entry));
  const prefix = [service, pod].filter(Boolean).join(" / ");

  return prefix ? `${prefix}: ${message}` : message;
};

function LogBlock({ logs }) {
  const lines = logs.map(toLogLine);

  return (
    <MDBox
      component="pre"
      p={2}
      bgColor="dark"
      color="white"
      borderRadius="md"
      sx={{
        maxHeight: 420,
        overflow: "auto",
        fontSize: "0.8rem",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {lines.length ? (
        lines.join("\n")
      ) : (
        <MDTypography variant="caption" color="white">
          No recent logs returned.
        </MDTypography>
      )}
    </MDBox>
  );
}

LogBlock.propTypes = {
  logs: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])).isRequired,
};

export default LogBlock;
