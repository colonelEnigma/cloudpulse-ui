import { useEffect, useState } from "react";

import {
  getAdminActions,
  getAdminAiStatus,
  getAdminAlerts,
  getAdminHealingHistory,
  getAdminLogs,
  getAdminResilience,
  getAdminServiceEvents,
  getAdminServiceLogs,
  postAdminAiChat,
} from "@/admin/api";
import { AdminShell } from "@/components/admin-shell";
import {
  AdminState,
  asArray,
  formatDate,
  getValue,
  LogBlock,
  SectionTitle,
  ServiceSelector,
} from "@/pages/admin/admin-shared";

export function AdminLogsPage() {
  const [selectedService, setSelectedService] = useState("all");
  const [state, setState] = useState({ loading: true, error: "", logs: [] });

  useEffect(() => {
    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: "" }));
      try {
        const data =
          selectedService === "all"
            ? await getAdminLogs()
            : await getAdminServiceLogs(selectedService);
        const logs =
          selectedService === "all"
            ? asArray(data, ["services"]).flatMap((serviceLog) =>
                asArray(serviceLog, ["entries"]).map((entry) => ({
                  ...entry,
                  service: entry.service || serviceLog.service || "unknown-service",
                })),
              )
            : asArray(data, ["entries"]);
        setState({ loading: false, error: "", logs });
      } catch (error) {
        setState({ loading: false, error: error.message || "Failed to load logs", logs: [] });
      }
    }
    load();
  }, [selectedService]);

  return (
    <AdminShell title="Logs" subtitle="Live control-plane service logs">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This section streams recent logs from allowlisted prod services to support fast runtime
          troubleshooting and triage.
        </p>
        <ServiceSelector value={selectedService} onChange={setSelectedService} includeAll />
        <AdminState loading={state.loading} error={state.error} empty={!state.logs.length} emptyText="No logs returned.">
          <LogBlock logs={state.logs} />
        </AdminState>
      </div>
    </AdminShell>
  );
}

export function AdminIncidentsPage() {
  const [selectedService, setSelectedService] = useState("order-service");
  const [state, setState] = useState({ loading: true, error: "", alerts: [], healing: [], events: [] });

  useEffect(() => {
    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: "" }));
      try {
        const [alerts, healing, events] = await Promise.all([
          getAdminAlerts(),
          getAdminHealingHistory(),
          getAdminServiceEvents(selectedService),
        ]);
        setState({
          loading: false,
          error: "",
          alerts: asArray(alerts, ["alerts"]),
          healing: asArray(healing, ["actions", "history"]),
          events: asArray(events, ["events"]),
        });
      } catch (error) {
        setState({
          loading: false,
          error: error.message || "Failed to load incidents",
          alerts: [],
          healing: [],
          events: [],
        });
      }
    }
    load();
  }, [selectedService]);
  const timelineEvents = state.events
    .map((event, index) => {
      const timestamp = getEventTimestamp(event);
      return {
        event,
        index,
        timestamp,
      };
    })
    .sort((a, b) => {
      if (a.timestamp === null && b.timestamp === null) return a.index - b.index;
      if (a.timestamp === null) return 1;
      if (b.timestamp === null) return -1;
      if (a.timestamp === b.timestamp) return a.index - b.index;
      return b.timestamp - a.timestamp;
    });

  return (
    <AdminShell title="Incidents" subtitle="Alerts, healing history, and service events">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          This section combines active alerts, healer actions, and Kubernetes events so you can
          understand incident timeline and impact by service.
        </p>
        <ServiceSelector value={selectedService} onChange={setSelectedService} />
        <AdminState loading={state.loading} error={state.error} empty={false}>
          <div className="grid gap-4 lg:grid-cols-3">
            <IncidentCard title="Active Alerts" items={state.alerts} render={(item) => (
              <>
                <p className="font-medium">{getValue(item, ["alertname", "name", "labels.alertname"], "Alert")}</p>
                <p className="text-xs text-muted-foreground">{getValue(item, ["severity", "state", "status"], "unknown")}</p>
              </>
            )} />
            <IncidentCard title="Healing History" items={state.healing} render={(item) => (
              <>
                <p className="font-medium">{getValue(item, ["deployment", "service"], "service")}</p>
                <p className="text-xs text-muted-foreground">
                  {getValue(item, ["result"], "result")} - {getValue(item, ["reason"], "reason")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(getValue(item, ["created_at", "createdAt"], ""))}
                </p>
              </>
            )} />
            <article className="rounded-xl border bg-background p-4">
              <p className="mb-2 font-medium">Service Events</p>
              {timelineEvents.length ? (
                <div className="relative space-y-2 pl-4">
                  <span aria-hidden className="absolute bottom-2 left-0 top-2 w-px bg-border" />
                  {timelineEvents.slice(0, 12).map((item, idx) => (
                    <div key={`Service Events-${idx}`} className="relative rounded-md border p-2 text-sm">
                      <span aria-hidden className="absolute -left-[10px] top-[13px] h-px w-[10px] bg-border" />
                      <span
                        aria-hidden
                        className="absolute -left-[21px] top-3 h-2.5 w-2.5 rounded-full border border-primary/40 bg-background"
                      />
                      <p className="font-medium break-words">
                        {getValue(item.event, ["reason", "type", "name"], "Event")}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">
                        {getValue(item.event, ["message", "note"], "No message")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/90">
                        {`Time: ${formatEventTimestamp(item.timestamp)}`}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No items.</p>
              )}
            </article>
          </div>
        </AdminState>
      </div>
    </AdminShell>
  );
}

export function AdminResiliencePage() {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  useEffect(() => {
    getAdminResilience()
      .then((data) => setState({ loading: false, error: "", data }))
      .catch((error) =>
        setState({ loading: false, error: error.message || "Failed to load resilience", data: null }),
      );
  }, []);

  const mechanisms = getValue(state.data, ["mechanisms"], {});
  const healerPolicy = getValue(mechanisms, ["healerServiceDownPolicy"], {});
  const serviceState = asArray(healerPolicy, ["serviceState"]);
  const orderProduct = getValue(mechanisms, ["orderProductCircuitBreaker"], null);
  const manualScaleGuard = getValue(mechanisms, ["manualScaleGuard"], {});
  const warnings = asArray(state.data, ["warnings"]);
  const circuitBreakers = asArray(orderProduct, ["circuitBreakers"]);
  const retries = asArray(orderProduct, ["retries"]);

  return (
    <AdminShell title="Resilience" subtitle="Circuit breaker, rate limit, retry, and policy state">
      <AdminState loading={state.loading} error={state.error} empty={!state.data}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This section shows live prod resilience safeguards, breaker states, retry behavior, and
            manual-action guardrails used to protect platform stability.
          </p>
          <SectionTitle title="Policy Warnings" />
          {warnings.length ? (
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {warnings.map((w, idx) => (
                <li key={`${w}-${idx}`}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No warnings.</p>
          )}

          <SectionTitle
            title="Healer Safeguards"
            subtitle={`Generated at ${formatDate(getValue(state.data, ["generatedAt"], ""))}`}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-xl border bg-background p-4">
              <p className="mb-2 font-medium">Policy</p>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <p>{`Alert: ${getValue(healerPolicy, ["alertName"], "N/A")}`}</p>
                <p>{`Owner: ${getValue(healerPolicy, ["owner"], "N/A")}`}</p>
                <p>{`Action: ${getValue(healerPolicy, ["action"], "N/A")}`}</p>
                <p>{`Enabled: ${formatValue(getValue(healerPolicy, ["enabled"], "N/A"))}`}</p>
                <p>{`Cooldown: ${formatValue(getValue(healerPolicy, ["cooldownSeconds"], "N/A"))}s`}</p>
                <p>{`Allowed namespaces: ${asArray(healerPolicy, ["allowedNamespaces"]).join(", ") || "N/A"}`}</p>
              </div>
            </article>
            <article className="rounded-xl border bg-background p-4">
              <p className="mb-2 font-medium">Limits And Retry</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{`Rate limit: ${formatValue(getValue(healerPolicy, ["rateLimit.maxActionsPerWindow"], "N/A"))} actions per ${formatValue(getValue(healerPolicy, ["rateLimit.windowMinutes"], "N/A"))}m`}</p>
                <p>{`Retry: ${formatValue(getValue(healerPolicy, ["retry.attempts"], "N/A"))} attempts at ${formatValue(getValue(healerPolicy, ["retry.baseDelayMs"], "N/A"))}ms base delay`}</p>
                <p>{`Circuit threshold: ${formatValue(getValue(healerPolicy, ["circuitBreaker.failureThreshold"], "N/A"))} failures in ${formatValue(getValue(healerPolicy, ["circuitBreaker.windowMinutes"], "N/A"))}m`}</p>
                <p>{`Allowed deployments: ${asArray(healerPolicy, ["allowedDeployments"]).join(", ") || "N/A"}`}</p>
              </div>
            </article>
          </div>

          <SectionTitle title="Manual Action Guardrails" />
          <article className="rounded-xl border bg-background p-4">
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
              <p>{`Owner: ${getValue(manualScaleGuard, ["owner"], "N/A")}`}</p>
              <p>{`Namespace: ${getValue(manualScaleGuard, ["namespace"], "N/A")}`}</p>
              <p>{`Action: ${getValue(manualScaleGuard, ["action"], "N/A")}`}</p>
              <p>{`Allowed replicas: ${asArray(manualScaleGuard, ["allowedReplicas"]).join(", ") || "N/A"}`}</p>
              <p>{`Typed confirmation: ${formatValue(getValue(manualScaleGuard, ["requiresTypedConfirmation"], "N/A"))}`}</p>
              <p>{`Audited results: ${asArray(manualScaleGuard, ["auditedResults"]).join(", ") || "N/A"}`}</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {`Allowlisted deployments: ${asArray(manualScaleGuard, ["allowedDeployments"]).join(", ") || "N/A"}`}
            </p>
          </article>

          <SectionTitle title="Service Resilience State" />
          {serviceState.length ? (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {serviceState.map((item, idx) => {
                const circuit = getValue(item, ["circuitBreaker"], {});
                const rate = getValue(item, ["rateLimit"], {});
                const retry = getValue(item, ["retry"], {});
                const lastAction = getValue(item, ["lastAction"], null);
                return (
                  <article
                    key={`${getValue(item, ["service"], "service")}-${idx}`}
                    className="rounded-xl border bg-background p-4"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-medium">{getValue(item, ["service"], "service")}</p>
                      <StatusBadge value={getValue(circuit, ["state"], "unknown")} />
                    </div>
                    <div className="mt-2 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {`Circuit failures: ${formatValue(getValue(circuit, ["failureCount"], "N/A"))} / ${formatValue(getValue(circuit, ["failureThreshold"], "N/A"))} in ${formatValue(getValue(circuit, ["windowMinutes"], "N/A"))}m`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {`Rate limit: ${formatValue(getValue(rate, ["state"], "N/A"))} (${formatValue(getValue(rate, ["actionCount"], "N/A"))}/${formatValue(getValue(rate, ["maxActionsPerWindow"], "N/A"))} per ${formatValue(getValue(rate, ["windowMinutes"], "N/A"))}m)`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {`Retry: ${formatValue(getValue(retry, ["attempts"], "N/A"))} attempts, ${formatValue(getValue(retry, ["baseDelayMs"], "N/A"))}ms base delay`}
                      </p>
                      <p className="break-words text-xs text-muted-foreground">
                        {`Blocked reasons: ${formatValue(getValue(item, ["recentBlockedReasonCounts"], {}))}`}
                      </p>
                      <p className="break-words text-xs text-muted-foreground">
                        {`Last action: ${lastAction ? formatValue(lastAction) : "N/A"}`}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No per-service resilience state returned.</p>
          )}

          <SectionTitle title="Order/Product Circuit Breaker" />
          {orderProduct ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {circuitBreakers.map((breaker, idx) => (
                <article
                  key={`${getValue(breaker, ["name"], "breaker")}-${idx}`}
                  className="rounded-xl border bg-background p-4"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium">{getValue(breaker, ["name"], "Circuit Breaker")}</p>
                    <StatusBadge value={getValue(breaker, ["state"], "unknown")} />
                  </div>
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {`Owner: ${getValue(breaker, ["owner"], "N/A")} | Dependency: ${getValue(breaker, ["dependency"], "N/A")}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {`Timeout: ${getValue(breaker, ["options.timeout"], "N/A")}ms | Error threshold: ${getValue(breaker, ["options.errorThresholdPercentage"], "N/A")}% | Reset: ${getValue(breaker, ["options.resetTimeout"], "N/A")}ms`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {`Filter: ${getValue(breaker, ["options.errorFilter"], "N/A")}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {`Fallback: ${formatValue(getValue(breaker, ["fallback.enabled"], "N/A"))} | ${formatValue(getValue(breaker, ["fallback.response"], "N/A"))}`}
                    </p>
                  </div>
                </article>
              ))}
              {retries.map((retryItem, idx) => (
                <article
                  key={`${getValue(retryItem, ["name"], "retry")}-${idx}`}
                  className="rounded-xl border bg-background p-4"
                >
                <p className="font-medium">{getValue(retryItem, ["name"], "Retry")}</p>
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {`Dependency: ${getValue(retryItem, ["dependency"], "N/A")}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {`Attempts: ${getValue(retryItem, ["attempts"], "N/A")} | Base delay: ${getValue(retryItem, ["baseDelayMs"], "N/A")}ms`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {`Retried failures: ${asArray(retryItem, ["retriedFailures"]).join(", ") || "N/A"}`}
                  </p>
                  </div>
                </article>
              ))}
              {!circuitBreakers.length && !retries.length ? (
                <p className="text-sm text-muted-foreground">
                  No order/product circuit breaker diagnostics returned.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Order/product circuit breaker diagnostics were not returned.
            </p>
          )}
        </div>
      </AdminState>
    </AdminShell>
  );
}

export function AdminAuditPage() {
  const [state, setState] = useState({ loading: true, error: "", actions: [] });

  useEffect(() => {
    getAdminActions()
      .then((data) => setState({ loading: false, error: "", actions: asArray(data, ["actions"]) }))
      .catch((error) =>
        setState({ loading: false, error: error.message || "Failed to load audit", actions: [] }),
      );
  }, []);

  return (
    <AdminShell title="Manual Action Audit" subtitle="Live backend audit records for Control Panel actions.">
      <p className="mb-4 text-sm text-muted-foreground">
        This section provides an operator trail for guarded manual actions, including who initiated
        the action, what changed, why it was allowed or blocked, and when it happened.
      </p>
      <AdminState
        loading={state.loading}
        error={state.error}
        empty={!state.actions.length}
        emptyText="No manual Control Panel actions returned."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.actions.map((action, idx) => (
            <article key={`${getValue(action, ["id"], idx)}-${idx}`} className="rounded-xl border bg-background p-4">
              <p className="font-medium mb-2">
                {getValue(action, ["service"], "service")} - {getValue(action, ["action"], "scale")}
              </p>
              <div className="mt-0.20 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {`Result: ${getValue(action, ["result"], "result")}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {`Requested replicas: ${getValue(action, ["requested_replicas", "requestedReplicas"], "n/a")}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {`Previous replicas: ${getValue(action, ["previous_replicas", "previousReplicas"], "n/a")}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {`Admin: ${getValue(action, ["user_email", "userEmail", "user_id", "userId"], "n/a")}`}
                </p>
                <p className="break-words text-xs text-muted-foreground">
                  {`Reason: ${getValue(action, ["reason"], "n/a")}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(getValue(action, ["created_at", "createdAt"], ""))}
                </p>
              </div>
            </article>
          ))}
        </div>
      </AdminState>
    </AdminShell>
  );
}

const AI_MODES = [
  { value: "platform-summary", label: "Platform summary" },
  { value: "service-deep-dive", label: "Service deep dive" },
  { value: "incident-analysis", label: "Incident analysis" },
];

export function AdminAiPage() {
  const [mode, setMode] = useState("platform-summary");
  const [service, setService] = useState("order-service");
  const [question, setQuestion] = useState("Summarize current prod health.");
  const [statusState, setStatusState] = useState({ loading: true, error: "", data: null });
  const [chatState, setChatState] = useState({ loading: false, error: "", response: null });

  useEffect(() => {
    getAdminAiStatus()
      .then((data) => setStatusState({ loading: false, error: "", data }))
      .catch((error) =>
        setStatusState({ loading: false, error: error.message || "Failed to load AI status", data: null }),
      );
  }, []);

  async function handleAsk(event) {
    event.preventDefault();
    setChatState({ loading: true, error: "", response: null });
    try {
      const response = await postAdminAiChat({ mode, service, question });
      setChatState({ loading: false, error: "", response });
    } catch (error) {
      setChatState({ loading: false, error: error.message || "Failed to fetch AI response", response: null });
    }
  }

  return (
    <AdminShell title="AI Assistant" subtitle="Read-only admin AI assistant (LM Studio)">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This section lets admins ask read-only operational questions and receive summarized
          insights from live control-plane context.
        </p>
        <AdminState loading={statusState.loading} error={statusState.error} empty={!statusState.data}>
          <p className="text-sm text-muted-foreground">
            Status: {getValue(statusState.data, ["status"], "unknown")} | Model:{" "}
            {getValue(statusState.data, ["model"], "N/A")}
          </p>
        </AdminState>

        <form onSubmit={handleAsk} className="space-y-3 rounded-xl border bg-background p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
            >
              {AI_MODES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <ServiceSelector value={service} onChange={setService} />
            <button
              type="submit"
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              disabled={chatState.loading}
            >
              {chatState.loading ? "Thinking..." : "Ask AI"}
            </button>
          </div>
          <textarea
            className="min-h-24 w-full rounded-md border bg-background p-3 text-sm"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </form>

        {chatState.error ? <p className="text-sm text-destructive">{chatState.error}</p> : null}
        {chatState.response ? (
          <article className="rounded-xl border bg-background p-4">
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {getValue(chatState.response, ["answer"], "No answer returned.")}
            </p>
          </article>
        ) : null}
      </div>
    </AdminShell>
  );
}

function IncidentCard({ title, items, render, limit = 8 }) {
  return (
    <article className="rounded-xl border bg-background p-4">
      <p className="mb-2 font-medium">{title}</p>
      <div className="space-y-2">
        {items.slice(0, limit).map((item, idx) => (
          <div key={`${title}-${idx}`} className="rounded-md border p-2 text-sm">
            {render(item)}
          </div>
        ))}
        {!items.length ? <p className="text-sm text-muted-foreground">No items.</p> : null}
      </div>
    </article>
  );
}

function StatusBadge({ value }) {
  const normalized = String(value || "").toLowerCase();
  let className = "border-border bg-muted text-muted-foreground";
  if (["closed", "available", "enabled", "success", "healthy"].includes(normalized)) {
    className = "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  } else if (["open", "blocked", "error", "failed", "down"].includes(normalized)) {
    className = "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
  } else if (["half_open", "half-open", "warning", "cooldown", "degraded"].includes(normalized)) {
    className = "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return <span className={`rounded-full border px-2 py-0.5 text-xs ${className}`}>{formatValue(value)}</span>;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "N/A";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getEventTimestamp(event = {}) {
  const rawTimestamp = getValue(event, ["lastTimestamp", "eventTime", "created_at", "createdAt"], "");
  if (!rawTimestamp) return null;
  const parsed = new Date(rawTimestamp).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function formatEventTimestamp(timestamp) {
  if (timestamp === null) return "Unknown time";
  return formatDate(new Date(timestamp).toISOString());
}
