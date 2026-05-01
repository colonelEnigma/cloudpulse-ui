import { useCallback, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import { askAiAssistant, getAiStatus } from "services/controlPlaneService";
import { ALLOWLISTED_SERVICES, asArray, errorMessage, formatDate, getValue } from "./utils";

const AI_MODES = [
  { value: "platform-summary", label: "Platform Summary" },
  { value: "incident-summary", label: "Incident Summary" },
  { value: "service-diagnostics", label: "Service Diagnostics" },
  { value: "resilience", label: "Resilience" },
  { value: "audit-summary", label: "Audit Summary" },
  { value: "logs", label: "Logs" },
  { value: "runbook", label: "Runbook" },
];

const QUICK_PROMPTS = [
  {
    label: "Summarize current prod health",
    mode: "platform-summary",
    service: "all",
    question: "Summarize current prod health across the allowlisted services.",
  },
  {
    label: "Explain recent healer activity",
    mode: "incident-summary",
    service: "all",
    question: "Explain recent healer activity and whether any services still need attention.",
  },
  {
    label: "Diagnose order-service",
    mode: "service-diagnostics",
    service: "order-service",
    question: "Diagnose order-service using recent events, logs, and resilience state.",
  },
  {
    label: "Explain circuit breaker state",
    mode: "resilience",
    service: "order-service",
    question: "Explain the current circuit breaker and retry state for order-service dependencies.",
  },
  {
    label: "Summarize recent manual scale actions",
    mode: "audit-summary",
    service: "all",
    question: "Summarize recent manual scale actions and call out any blocked or failed attempts.",
  },
];

function isLmStudioUnavailable(error) {
  return error?.response?.status === 502;
}

function isAiRouteMissing(error) {
  return error?.response?.status === 404;
}

function aiErrorMessage(error) {
  if (isLmStudioUnavailable(error)) {
    return "LM Studio is unavailable to the control-plane-service. Confirm LM_STUDIO_BASE_URL points to a backend-reachable address, or run control-plane-service locally for a laptop LM Studio demo.";
  }

  if (isAiRouteMissing(error)) {
    return "AI route not found on control-plane-service. Deploy or restart the backend build that includes /api/control-plane/ai/status and /api/control-plane/ai/chat, then refresh this panel.";
  }

  return errorMessage(error);
}

function statusColor(status) {
  const normalized = String(status || "").toLowerCase();

  if (["ready", "available", "ok", "healthy", "connected"].includes(normalized)) return "success";
  if (["unavailable", "disabled", "error", "failed"].includes(normalized)) return "error";
  if (["degraded", "unknown"].includes(normalized)) return "warning";

  return "info";
}

function getStatusLabel(status) {
  return getValue(status, ["status", "state", "ready", "available"], "unknown");
}

export default function AiAssistant() {
  const [mode, setMode] = useState("platform-summary");
  const [service, setService] = useState("all");
  const [question, setQuestion] = useState("Summarize current prod health.");
  const [statusState, setStatusState] = useState({
    loading: true,
    error: "",
    unavailable: false,
    data: null,
  });
  const [chatState, setChatState] = useState({
    loading: false,
    error: "",
    unavailable: false,
    response: null,
  });

  const loadStatus = useCallback(() => {
    setStatusState({ loading: true, error: "", unavailable: false, data: null });

    getAiStatus()
      .then((data) => {
        setStatusState({ loading: false, error: "", unavailable: false, data });
      })
      .catch((error) => {
        setStatusState({
          loading: false,
          error: aiErrorMessage(error),
          unavailable: isLmStudioUnavailable(error) || isAiRouteMissing(error),
          data: null,
        });
      });
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const applyQuickPrompt = (prompt) => {
    setMode(prompt.mode);
    setService(prompt.service);
    setQuestion(prompt.question);
    setChatState({ loading: false, error: "", unavailable: false, response: null });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setChatState({ loading: true, error: "", unavailable: false, response: null });

    try {
      const response = await askAiAssistant({ mode, service, question: question.trim() });
      setChatState({ loading: false, error: "", unavailable: false, response });
    } catch (error) {
      setChatState({
        loading: false,
        error: aiErrorMessage(error),
        unavailable: isLmStudioUnavailable(error) || isAiRouteMissing(error),
        response: null,
      });
    }
  };

  const statusLabel = getStatusLabel(statusState.data);
  const model = getValue(statusState.data, ["model", "activeModel"], "N/A");
  const canSubmit = Boolean(question.trim()) && !chatState.loading && !statusState.loading;
  const responseWarnings = asArray(chatState.response, ["warnings"]);
  const contextUsed = asArray(chatState.response, ["contextUsed", "context"]);

  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        AI Assistant
      </MDTypography>
      <MDTypography color="text" mb={2}>
        Admin-only, read-only guidance generated from live Control Plane context.
      </MDTypography>

      <Alert severity="info" sx={{ mb: 2 }}>
        AI responses are advisory. This panel cannot perform cluster actions or change resilience
        settings.
      </Alert>

      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <Card>
            <MDBox p={2}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <MDTypography variant="h6">AI Status</MDTypography>
                <MDButton
                  variant="outlined"
                  color="info"
                  size="small"
                  disabled={statusState.loading}
                  onClick={loadStatus}
                >
                  Refresh
                </MDButton>
              </MDBox>

              {statusState.loading ? (
                <MDBox display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={18} />
                  <MDTypography variant="button" color="text">
                    Checking AI backend...
                  </MDTypography>
                </MDBox>
              ) : statusState.error ? (
                <Alert severity={statusState.unavailable ? "warning" : "error"}>
                  {statusState.error}
                </Alert>
              ) : (
                <MDBox>
                  <Chip label={statusLabel} color={statusColor(statusLabel)} size="small" />
                  <MDTypography variant="caption" color="text" display="block" mt={1}>
                    Model: {model}
                  </MDTypography>
                  <MDTypography variant="caption" color="text" display="block">
                    Generated at: {formatDate(getValue(statusState.data, ["generatedAt"], ""))}
                  </MDTypography>
                </MDBox>
              )}
            </MDBox>
          </Card>

          <Card sx={{ mt: 2 }}>
            <MDBox p={2}>
              <MDTypography variant="h6" mb={2}>
                Quick Prompts
              </MDTypography>
              <MDBox display="flex" flexDirection="column" gap={1}>
                {QUICK_PROMPTS.map((prompt) => (
                  <MDButton
                    key={prompt.label}
                    variant="outlined"
                    color="info"
                    size="small"
                    onClick={() => applyQuickPrompt(prompt)}
                  >
                    {prompt.label}
                  </MDButton>
                ))}
              </MDBox>
            </MDBox>
          </Card>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Card>
            <MDBox component="form" p={2} onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <MDTypography variant="button" color="text" fontWeight="medium">
                    Mode
                  </MDTypography>
                  <MDInput
                    select
                    fullWidth
                    value={mode}
                    onChange={(event) => setMode(event.target.value)}
                    sx={{ mt: 1 }}
                  >
                    {AI_MODES.map((item) => (
                      <MenuItem key={item.value} value={item.value}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </MDInput>
                </Grid>

                <Grid item xs={12} md={6}>
                  <MDTypography variant="button" color="text" fontWeight="medium">
                    Service
                  </MDTypography>
                  <MDInput
                    select
                    fullWidth
                    value={service}
                    onChange={(event) => setService(event.target.value)}
                    sx={{ mt: 1 }}
                  >
                    <MenuItem value="all">Optional: all allowlisted services</MenuItem>
                    {ALLOWLISTED_SERVICES.map((item) => (
                      <MenuItem key={item} value={item}>
                        {item}
                      </MenuItem>
                    ))}
                  </MDInput>
                </Grid>

                <Grid item xs={12}>
                  <MDTypography variant="button" color="text" fontWeight="medium">
                    Question
                  </MDTypography>
                  <MDInput
                    multiline
                    fullWidth
                    minRows={4}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask for a prod health summary, service diagnosis, runbook, or audit summary."
                    sx={{ mt: 1 }}
                  />
                </Grid>
              </Grid>

              <MDBox display="flex" justifyContent="flex-end" mt={2}>
                <MDButton color="info" disabled={!canSubmit} type="submit">
                  {chatState.loading ? "Asking..." : "Ask AI"}
                </MDButton>
              </MDBox>

              {chatState.loading && (
                <MDBox display="flex" alignItems="center" gap={1} mt={2}>
                  <CircularProgress size={18} />
                  <MDTypography variant="button" color="text">
                    Generating advisory response from live context...
                  </MDTypography>
                </MDBox>
              )}

              {chatState.error && (
                <Alert severity={chatState.unavailable ? "warning" : "error"} sx={{ mt: 2 }}>
                  {chatState.error}
                </Alert>
              )}
            </MDBox>
          </Card>

          {chatState.response && (
            <Card sx={{ mt: 2 }}>
              <MDBox p={2}>
                <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <MDTypography variant="h6">Advisory Response</MDTypography>
                  <Chip label="Read-only" color="info" size="small" />
                </MDBox>

                <MDTypography variant="body2" color="text" sx={{ whiteSpace: "pre-wrap" }}>
                  {getValue(chatState.response, ["answer"], "No answer returned.")}
                </MDTypography>

                <MDBox display="flex" flexWrap="wrap" gap={1} mt={2}>
                  <Chip
                    label={`Mode: ${getValue(chatState.response, ["mode"], mode)}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Service: ${getValue(chatState.response, ["service"], service)}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Model: ${getValue(chatState.response, ["model"], "N/A")}`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={`Generated: ${formatDate(
                      getValue(chatState.response, ["generatedAt"], "")
                    )}`}
                    size="small"
                    variant="outlined"
                  />
                </MDBox>

                {contextUsed.length > 0 && (
                  <MDTypography variant="caption" color="text" display="block" mt={1}>
                    Context used: {contextUsed.join(", ")}
                  </MDTypography>
                )}

                {responseWarnings.map((warning, index) => (
                  <Alert severity="warning" sx={{ mt: 1 }} key={`ai-warning-${index}`}>
                    {warning}
                  </Alert>
                ))}
              </MDBox>
            </Card>
          )}
        </Grid>
      </Grid>
    </MDBox>
  );
}
