import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/admin/overview", label: "Overview" },
  { to: "/admin/deployments", label: "Services" },
  { to: "/admin/logs", label: "Logs" },
  { to: "/admin/incidents", label: "Incidents" },
  { to: "/admin/resilience", label: "Resilience" },
  { to: "/admin/ai", label: "AI Assistant" },
  { to: "/admin/audit", label: "Audit" },
];

export function AdminShell({ title, subtitle, children }) {
  return (
    <section className="py-8">
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="bg-gradient-to-r from-sky-600 to-cyan-500 px-5 py-5 text-white sm:px-6">
          <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-sky-50/90">{subtitle}</p>
        </div>

        <div className="border-b px-4 py-3 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="px-4 py-5 sm:px-6">{children}</div>
      </div>
    </section>
  );
}
