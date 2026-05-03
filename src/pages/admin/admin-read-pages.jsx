import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  getAdminActions,
  getAdminDeployments,
  getAdminOverview,
  postAdminScaleAction,
  getAdminServiceEvents,
  getAdminServiceDetail,
  getAdminServiceLogs,
} from "@/admin/api";
import { AdminShell } from "@/components/admin-shell";
import {
  ALLOWLISTED_SERVICES,
  asArray,
  formatDate,
  getValue,
  LogBlock,
} from "@/pages/admin/admin-shared";

export function AdminOverviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        setData(await getAdminOverview());
      } catch (loadError) {
        setError(loadError.message || "Failed to load admin overview");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  return (
    <AdminShell
      title="Control Panel"
      subtitle="Live production snapshot from control-plane-service"
    >
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          This section summarizes current prod health across allowlisted services and highlights
          deployment readiness at a glance.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/admin/deployments" className="font-medium text-primary hover:underline">
            View deployment details
          </Link>
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">Loading overview...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!isLoading && !error && data ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Services" value={data.serviceCounts?.total} />
              <StatCard label="Healthy" value={data.serviceCounts?.healthy} />
              <StatCard label="Degraded" value={data.serviceCounts?.degraded} />
              <StatCard label="Scaled Down" value={data.serviceCounts?.scaledDown} />
            </div>

            <article className="rounded-xl border bg-background p-4">
              <div className="mb-3">
                <p className="font-medium">Service Health</p>
                <p className="text-sm text-muted-foreground">
                  Live allowlisted prod deployment readiness snapshot.
                </p>
              </div>

              {Array.isArray(data.deployments) && data.deployments.length > 0 ? (
                <div className="space-y-3">
                  {data.deployments.map((deployment) => (
                    <ServiceHealthRow
                      key={deployment.service || "unknown-service"}
                      deployment={deployment}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No deployment summary returned.</p>
              )}
            </article>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

export function AdminDeploymentsPage() {
  const [deployments, setDeployments] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const response = await getAdminDeployments();
        setDeployments(asArray(response, ["deployments"]));
      } catch (loadError) {
        setError(loadError.message || "Failed to load deployments");
        setDeployments([]);
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  return (
    <AdminShell title="Services" subtitle="Allowlisted production services and health state">
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          This section lists each allowlisted prod service with its live replica health and quick
          access to detailed diagnostics.
        </p>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading deployments...</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!isLoading && !error ? (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {ALLOWLISTED_SERVICES.map((serviceName) => {
              const deployment = deployments.find((item) => item.service === serviceName) || {};
              const health = getDeploymentHealth(deployment);

              return (
                <article key={serviceName} className="rounded-xl border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{serviceName}</p>
                    <HealthBadge label={health.label} tone={health.tone} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ReplicaChip label="Desired" value={health.desired} />
                    <ReplicaChip label="Ready" value={health.ready} />
                    <ReplicaChip label="Available" value={health.available} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {`Image: ${deployment.image || "N/A"}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {`Pods: ${deployment.podStatus || "N/A"}`}
                  </p>
                  <Link
                    to={`/admin/services/${serviceName}`}
                    className="mt-3 inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
                  >
                    Details
                  </Link>
                </article>
              );
            })}
          </div>
        ) : null}

        {!isLoading && !error && ALLOWLISTED_SERVICES.length === 0 ? (
          <p className="text-sm text-muted-foreground">No allowlisted services configured.</p>
        ) : null}
      </div>
    </AdminShell>
  );
}

export function AdminServiceDetailPage() {
  const { service } = useParams();
  const [state, setState] = useState({
    isLoading: true,
    error: "",
    detail: null,
    logs: [],
    events: [],
    actions: [],
  });
  const [confirmation, setConfirmation] = useState("");
  const [actionState, setActionState] = useState({
    loading: false,
    error: "",
    response: null,
  });

  useEffect(() => {
    async function load() {
      if (!service) return;

      if (!ALLOWLISTED_SERVICES.includes(service)) {
        setState({
          isLoading: false,
          error: `${service} is not in the Control Plane allowlist.`,
          detail: null,
          logs: [],
          events: [],
          actions: [],
        });
        return;
      }

      setState((current) => ({ ...current, isLoading: true, error: "" }));

      try {
        const [detail, logsResponse, eventsResponse, actionsResponse] = await Promise.all([
          getAdminServiceDetail(service),
          getAdminServiceLogs(service),
          getAdminServiceEvents(service),
          getAdminActions(),
        ]);

        const allActions = asArray(actionsResponse, ["actions"]);
        const serviceActions = allActions.filter(
          (action) => getValue(action, ["service"], "") === service,
        );

        setState({
          isLoading: false,
          error: "",
          detail,
          logs: asArray(logsResponse, ["logs", "entries"]),
          events: asArray(eventsResponse, ["events"]),
          actions: serviceActions,
        });
      } catch (loadError) {
        setState({
          isLoading: false,
          error: loadError.message || "Failed to load service detail",
          detail: null,
          logs: [],
          events: [],
          actions: [],
        });
      }
    }

    load();
  }, [service]);

  const deployment = getValue(state.detail, ["deployment"], state.detail || {});
  const replicaSets = asArray(state.detail, ["replicaSets", "replicasets"]);
  const pods = asArray(state.detail, ["pods"]);
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
  const confirmationMatches = confirmation === service;

  async function handleScale(replicas) {
    setActionState({ loading: true, error: "", response: null });
    try {
      const response = await postAdminScaleAction({
        namespace: "prod",
        service,
        replicas,
        confirmation,
      });
      setActionState({ loading: false, error: "", response });
      setConfirmation("");
    } catch (error) {
      setActionState({
        loading: false,
        error: error.message || "Failed to submit scale action",
        response: null,
      });
    }
  }

  return (
    <AdminShell
      title={`Service: ${service || "unknown"}`}
      subtitle="Live prod deployment diagnostics and recent activity"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This section provides deep service-level diagnostics, recent activity, and guarded scale
          controls for the selected allowlisted prod deployment.
        </p>
        <Link to="/admin/deployments" className="text-sm font-medium text-primary hover:underline mb-2 inline-block">
          Back to services
        </Link>

        {state.isLoading ? <p className="text-sm text-muted-foreground">Loading service detail...</p> : null}
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        {!state.isLoading && !state.error && state.detail ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border bg-background p-4">
                <p className="mb-2 font-medium">Deployment</p>
                <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <p>{`Desired: ${getValue(deployment, ["desiredReplicas", "replicas"], "N/A")}`}</p>
                  <p>{`Ready: ${getValue(deployment, ["readyReplicas"], "N/A")}`}</p>
                  <p>{`Available: ${getValue(deployment, ["availableReplicas"], "N/A")}`}</p>
                  <p>{`Namespace: ${getValue(deployment, ["namespace"], "prod")}`}</p>
                  <p className="sm:col-span-2">{`Image: ${getValue(deployment, ["image", "containerImage"], "N/A")}`}</p>
                </div>
              </article>

              <article className="rounded-xl border bg-background p-4">
                <p className="mb-2 font-medium">Guarded Scale</p>
                <p className="text-sm text-muted-foreground">
                  Type <span className="font-medium text-foreground">{service}</span> exactly to enable scale to replicas 0 or 1.
                </p>
                <input
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Type service name to confirm"
                  className="mt-3 h-9 w-full rounded-md border bg-background px-3 text-sm"
                />
                {confirmation && !confirmationMatches ? (
                  <p className="mt-2 text-xs text-destructive">
                    Confirmation must exactly match {service}.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleScale(0)}
                    disabled={!confirmationMatches || actionState.loading}
                    className="h-9 rounded-md border border-red-500/40 bg-red-500/10 px-3 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300"
                  >
                    Scale Down (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScale(1)}
                    disabled={!confirmationMatches || actionState.loading}
                    className="h-9 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300"
                  >
                    Scale Up (1)
                  </button>
                </div>
                {actionState.error ? (
                  <p className="mt-3 text-sm text-destructive">{actionState.error}</p>
                ) : null}
                {actionState.response ? (
                  <div className="mt-3 rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{getValue(actionState.response, ["message"], "Scale action completed")}</p>
                    <p>{`Audit ID: ${getValue(actionState.response, ["auditId"], "N/A")}`}</p>
                    <p>{`Audited At: ${formatDate(getValue(actionState.response, ["auditedAt"], ""))}`}</p>
                    <p>{`Previous Replicas: ${getValue(actionState.response, ["previousReplicas"], "N/A")}`}</p>
                    <p>{`Requested Replicas: ${getValue(actionState.response, ["requestedReplicas"], "N/A")}`}</p>
                    <p>{`Changed: ${getValue(actionState.response, ["changed"], false) ? "Yes" : "No"}`}</p>
                  </div>
                ) : null}
              </article>

              <article className="rounded-xl border bg-background p-4">
                <p className="mb-2 font-medium">Recent Events</p>
                {timelineEvents.length > 0 ? (
                  <div className="relative space-y-4 pl-6">
                    <span aria-hidden className="absolute bottom-2 left-2 top-2 w-px bg-border" />
                    {timelineEvents.slice(0, 12).map((item) => (
                      <div key={`${getValue(item.event, ["reason", "type", "name"], "event")}-${item.index}`} className="relative">
                        <span aria-hidden className="absolute -left-[10px] top-[11px] h-px w-[10px] bg-border" />
                        <span
                          aria-hidden
                          className="absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border border-primary/40 bg-background"
                        />
                        <div className="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
                          <p className="font-medium text-foreground break-words">
                            {getValue(item.event, ["reason", "type", "name"], "Event")}
                          </p>
                          <p className="mt-1 break-words">{getValue(item.event, ["message", "note"], "No message")}</p>
                          <p className="mt-2 text-xs text-muted-foreground/90">
                            {`Time: ${formatEventTimestamp(item.timestamp)}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent events returned.</p>
                )}
              </article>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border bg-background p-4">
                <p className="mb-2 font-medium">Pods And ReplicaSets</p>
                {[...pods, ...replicaSets].length > 0 ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {[...pods, ...replicaSets].slice(0, 12).map((item, index) => (
                      <div key={`runtime-${index}`} className="rounded-md border p-2">
                        <p className="font-medium text-foreground">
                          {getValue(item, ["name", "pod", "podName", "metadata.name"], "runtime item")}
                        </p>
                        <p>{getValue(item, ["status", "phase", "ready", "replicas"], "N/A")}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No pod or ReplicaSet details returned.</p>
                )}
              </article>

              <article className="rounded-xl border bg-background p-4">
                <p className="mb-2 font-medium">Recent Manual Actions</p>
                {state.actions.length > 0 ? (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {state.actions.slice(0, 6).map((action, index) => (
                      <div
                        key={`${getValue(action, ["id"], "action")}-${index}`}
                        className="rounded-md border p-2"
                      >
                        <p className="font-medium text-foreground">
                          {getValue(action, ["result"], "result")} replicas{" "}
                          {getValue(action, ["requested_replicas", "requestedReplicas"], "n/a")}
                        </p>
                        <p>{getValue(action, ["reason"], "No reason")}</p>
                        <p>{formatDate(getValue(action, ["created_at", "createdAt"], ""))}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No manual actions returned for this service.</p>
                )}
              </article>
            </div>

            <article className="rounded-xl border bg-background p-4">
              <p className="mb-2 font-medium">Recent Logs</p>
              <LogBlock logs={state.logs} />
            </article>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="rounded-xl border bg-background p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value ?? 0}</p>
    </article>
  );
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDeploymentHealth(deployment = {}) {
  const desired = numberValue(deployment.desiredReplicas);
  const ready = numberValue(deployment.readyReplicas);
  const available = numberValue(deployment.availableReplicas);

  if (desired === 0) {
    return { label: "Scaled down", tone: "muted", desired, ready, available };
  }

  if (desired === null || ready === null || available === null) {
    return { label: "Unknown", tone: "warning", desired, ready, available };
  }

  if (desired > 0 && available === 0) {
    return { label: "Down", tone: "destructive", desired, ready, available };
  }

  if (ready < desired || available < desired) {
    return { label: "Degraded", tone: "warning", desired, ready, available };
  }

  return { label: "Healthy", tone: "success", desired, ready, available };
}

function HealthBadge({ label, tone }) {
  const toneClassName = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    destructive: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    muted: "border-border bg-muted text-muted-foreground",
  };

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
        toneClassName[tone] || toneClassName.muted
      }`}
    >
      {label}
    </span>
  );
}

function ReplicaChip({ label, value }) {
  return (
    <span className="rounded-md border bg-muted px-2 py-1 text-xs text-muted-foreground">
      {`${label}: ${value ?? "N/A"}`}
    </span>
  );
}

function ServiceHealthRow({ deployment }) {
  const health = getDeploymentHealth(deployment);
  const serviceName = deployment?.service || "unknown-service";

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{serviceName}</p>
        <HealthBadge label={health.label} tone={health.tone} />
      </div>
      <div className="flex flex-wrap gap-2">
        <ReplicaChip label="Desired" value={health.desired} />
        <ReplicaChip label="Ready" value={health.ready} />
        <ReplicaChip label="Available" value={health.available} />
      </div>
    </div>
  );
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
