import { useEffect, useState } from "react";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import MDAlert from "components/MDAlert";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { getResilience } from "services/controlPlaneService";
import ControlPanelState from "./components/ControlPanelState";
import { asArray, errorMessage, formatDate, formatValue, getValue } from "./utils";

function chipColor(value) {
  const normalized = String(value || "").toLowerCase();

  if (["closed", "available", "enabled", "success"].includes(normalized)) return "success";
  if (["open", "blocked", "error", "failed"].includes(normalized)) return "error";
  if (["half_open", "half-open", "warning", "cooldown"].includes(normalized)) return "warning";

  return "default";
}

function StatusChip({ label }) {
  return <Chip label={formatValue(label)} color={chipColor(label)} size="small" />;
}

function InfoItem({ label, value }) {
  return (
    <MDBox mb={1}>
      <MDTypography variant="caption" color="text" display="block">
        {label}
      </MDTypography>
      <MDTypography variant="button" fontWeight="medium">
        {formatValue(value)}
      </MDTypography>
    </MDBox>
  );
}

function SectionCard({ title, children }) {
  return (
    <Card>
      <MDBox p={2}>
        <MDTypography variant="h6" mb={2}>
          {title}
        </MDTypography>
        {children}
      </MDBox>
    </Card>
  );
}

function WarningList({ warnings }) {
  if (!warnings.length) return null;

  return (
    <MDBox mb={2}>
      {warnings.map((warning, index) => (
        <MDAlert color="warning" key={`resilience-warning-${index}`}>
          <MDTypography variant="body2" color="white">
            {formatValue(warning)}
          </MDTypography>
        </MDAlert>
      ))}
    </MDBox>
  );
}

function ServiceStateCard({ serviceState }) {
  const circuitBreaker = getValue(serviceState, ["circuitBreaker"], {});
  const rateLimit = getValue(serviceState, ["rateLimit"], {});
  const retry = getValue(serviceState, ["retry"], {});
  const lastAction = getValue(serviceState, ["lastAction"], null);
  const blockedReasons = getValue(serviceState, ["recentBlockedReasonCounts"], {});

  return (
    <Card>
      <MDBox p={2}>
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <MDTypography variant="button" fontWeight="medium">
            {getValue(serviceState, ["service"])}
          </MDTypography>
          <StatusChip label={getValue(circuitBreaker, ["state"])} />
        </MDBox>
        <MDTypography variant="caption" color="text" display="block">
          Circuit failures: {formatValue(getValue(circuitBreaker, ["failureCount"]))} /{" "}
          {formatValue(getValue(circuitBreaker, ["failureThreshold"]))} in{" "}
          {formatValue(getValue(circuitBreaker, ["windowMinutes"]))}m
        </MDTypography>
        <MDBox display="flex" alignItems="center" gap={1} mt={1}>
          <MDTypography variant="caption" color="text">
            Rate limit:
          </MDTypography>
          <StatusChip label={getValue(rateLimit, ["state"])} />
        </MDBox>
        <MDTypography variant="caption" color="text" display="block" mt={1}>
          Actions: {formatValue(getValue(rateLimit, ["actionCount"]))} /{" "}
          {formatValue(getValue(rateLimit, ["maxActionsPerWindow"]))} per{" "}
          {formatValue(getValue(rateLimit, ["windowMinutes"]))}m
        </MDTypography>
        <MDTypography variant="caption" color="text" display="block">
          Cooldown: {formatValue(getValue(serviceState, ["cooldownSeconds"]))}s | Retry:{" "}
          {formatValue(getValue(retry, ["attempts"]))} attempts,{" "}
          {formatValue(getValue(retry, ["baseDelayMs"]))}ms base delay
        </MDTypography>
        <MDTypography variant="caption" color="text" display="block">
          Blocked reasons: {formatValue(blockedReasons)}
        </MDTypography>
        <MDTypography variant="caption" color="text" display="block">
          Last action: {lastAction ? formatValue(lastAction) : "N/A"}
        </MDTypography>
      </MDBox>
    </Card>
  );
}

export default function Resilience() {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    let mounted = true;

    getResilience()
      .then((data) => {
        if (mounted) setState({ loading: false, error: "", data });
      })
      .catch((error) => {
        if (mounted) setState({ loading: false, error: errorMessage(error), data: null });
      });

    return () => {
      mounted = false;
    };
  }, []);

  const mechanisms = getValue(state.data, ["mechanisms"], {});
  const healerPolicy = getValue(mechanisms, ["healerServiceDownPolicy"], {});
  const serviceState = asArray(healerPolicy, ["serviceState"]);
  const orderProduct = getValue(mechanisms, ["orderProductCircuitBreaker"], null);
  const manualScaleGuard = getValue(mechanisms, ["manualScaleGuard"], {});
  const warnings = asArray(state.data, ["warnings"]);
  const circuitBreakers = asArray(orderProduct, ["circuitBreakers"]);
  const retries = asArray(orderProduct, ["retries"]);
  const healerRateLimitSummary = `Rate limit: ${formatValue(
    getValue(healerPolicy, ["rateLimit.maxActionsPerWindow"])
  )} actions per ${formatValue(getValue(healerPolicy, ["rateLimit.windowMinutes"]))}m`;
  const healerRetrySummary = `Retry: ${formatValue(
    getValue(healerPolicy, ["retry.attempts"])
  )} attempts at ${formatValue(getValue(healerPolicy, ["retry.baseDelayMs"]))}ms base delay`;
  const healerCircuitSummary = `Circuit threshold: ${formatValue(
    getValue(healerPolicy, ["circuitBreaker.failureThreshold"])
  )} failures in ${formatValue(getValue(healerPolicy, ["circuitBreaker.windowMinutes"]))}m`;

  return (
    <MDBox>
      <MDTypography variant="h5" mb={1}>
        Resilience Diagnostics
      </MDTypography>
      <MDTypography color="text" mb={2}>
        Read-only prod safeguards and dependency resilience state generated at{" "}
        {formatDate(getValue(state.data, ["generatedAt"], ""))}.
      </MDTypography>

      <ControlPanelState
        loading={state.loading}
        error={state.error}
        empty={!state.data}
        emptyText="No resilience diagnostics returned."
      >
        <WarningList warnings={warnings} />

        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}>
            <SectionCard title="Healer Safeguards">
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <InfoItem label="Alert" value={getValue(healerPolicy, ["alertName"])} />
                  <InfoItem label="Owner" value={getValue(healerPolicy, ["owner"])} />
                  <InfoItem label="Action" value={getValue(healerPolicy, ["action"])} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoItem label="Enabled" value={getValue(healerPolicy, ["enabled"])} />
                  <InfoItem
                    label="Cooldown"
                    value={`${formatValue(getValue(healerPolicy, ["cooldownSeconds"]))}s`}
                  />
                  <InfoItem
                    label="Allowed namespaces"
                    value={asArray(healerPolicy, ["allowedNamespaces"]).join(", ")}
                  />
                </Grid>
              </Grid>
              <MDTypography variant="caption" color="text" display="block">
                {healerRateLimitSummary} | {healerRetrySummary} | {healerCircuitSummary}
              </MDTypography>
            </SectionCard>
          </Grid>

          <Grid item xs={12} lg={6}>
            <SectionCard title="Manual Action Guardrails">
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <InfoItem label="Owner" value={getValue(manualScaleGuard, ["owner"])} />
                  <InfoItem label="Namespace" value={getValue(manualScaleGuard, ["namespace"])} />
                  <InfoItem label="Action" value={getValue(manualScaleGuard, ["action"])} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <InfoItem
                    label="Allowed replicas"
                    value={asArray(manualScaleGuard, ["allowedReplicas"]).join(", ")}
                  />
                  <InfoItem
                    label="Typed confirmation"
                    value={getValue(manualScaleGuard, ["requiresTypedConfirmation"])}
                  />
                  <InfoItem
                    label="Audited results"
                    value={asArray(manualScaleGuard, ["auditedResults"]).join(", ")}
                  />
                </Grid>
              </Grid>
              <MDTypography variant="caption" color="text" display="block">
                Allowlisted deployments:{" "}
                {asArray(manualScaleGuard, ["allowedDeployments"]).join(", ") || "N/A"}
              </MDTypography>
            </SectionCard>
          </Grid>

          <Grid item xs={12}>
            <SectionCard title="Service Resilience State">
              {serviceState.length ? (
                <Grid container spacing={2}>
                  {serviceState.map((item) => (
                    <Grid item xs={12} md={6} xl={4} key={getValue(item, ["service"])}>
                      <ServiceStateCard serviceState={item} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <MDTypography variant="body2" color="text">
                  No per-service resilience state returned.
                </MDTypography>
              )}
            </SectionCard>
          </Grid>

          <Grid item xs={12}>
            <SectionCard title="Order/Product Circuit Breaker">
              {orderProduct ? (
                <Grid container spacing={2}>
                  {circuitBreakers.map((breaker, index) => (
                    <Grid item xs={12} lg={6} key={getValue(breaker, ["name"], index)}>
                      <Card>
                        <MDBox p={2}>
                          <MDBox display="flex" justifyContent="space-between" mb={1}>
                            <MDTypography variant="button" fontWeight="medium">
                              {getValue(breaker, ["name"])}
                            </MDTypography>
                            <StatusChip label={getValue(breaker, ["state"])} />
                          </MDBox>
                          <MDTypography variant="caption" color="text" display="block">
                            Owner: {getValue(breaker, ["owner"])} | Dependency:{" "}
                            {getValue(breaker, ["dependency"])}
                          </MDTypography>
                          <MDTypography variant="caption" color="text" display="block">
                            Timeout: {getValue(breaker, ["options.timeout"])}ms | Error threshold:{" "}
                            {getValue(breaker, ["options.errorThresholdPercentage"])}% | Reset:{" "}
                            {getValue(breaker, ["options.resetTimeout"])}ms
                          </MDTypography>
                          <MDTypography variant="caption" color="text" display="block">
                            Filter: {getValue(breaker, ["options.errorFilter"])}
                          </MDTypography>
                          <MDTypography variant="caption" color="text" display="block">
                            Fallback: {formatValue(getValue(breaker, ["fallback.enabled"]))} |{" "}
                            {formatValue(getValue(breaker, ["fallback.response"]))}
                          </MDTypography>
                        </MDBox>
                      </Card>
                    </Grid>
                  ))}
                  {retries.map((retry, index) => (
                    <Grid item xs={12} lg={6} key={getValue(retry, ["name"], index)}>
                      <Card>
                        <MDBox p={2}>
                          <MDTypography variant="button" fontWeight="medium">
                            {getValue(retry, ["name"])}
                          </MDTypography>
                          <MDTypography variant="caption" color="text" display="block">
                            Dependency: {getValue(retry, ["dependency"])}
                          </MDTypography>
                          <MDTypography variant="caption" color="text" display="block">
                            Attempts: {getValue(retry, ["attempts"])} | Base delay:{" "}
                            {getValue(retry, ["baseDelayMs"])}ms
                          </MDTypography>
                          <MDTypography variant="caption" color="text" display="block">
                            Retried failures:{" "}
                            {asArray(retry, ["retriedFailures"]).join(", ") || "N/A"}
                          </MDTypography>
                        </MDBox>
                      </Card>
                    </Grid>
                  ))}
                  {!circuitBreakers.length && !retries.length && (
                    <Grid item xs={12}>
                      <MDTypography variant="body2" color="text">
                        No order/product circuit breaker diagnostics returned.
                      </MDTypography>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <MDTypography variant="body2" color="text">
                  Order/product circuit breaker diagnostics were not returned.
                </MDTypography>
              )}
            </SectionCard>
          </Grid>
        </Grid>
      </ControlPanelState>
    </MDBox>
  );
}
