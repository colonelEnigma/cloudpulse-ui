import { Link } from "react-router-dom";
import { AdminShell } from "@/components/admin-shell";

export function AdminHomePage() {
  return (
    <AdminShell title="Control Panel" subtitle="Production operations dashboard">
      <div className="space-y-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Admin routes are gated and now connected to live prod read APIs. Use the sections below
          to inspect current platform state.
        </p>
        <div className="rounded-xl border bg-background p-4 text-sm text-muted-foreground">
          <p>Go to:</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Link to="/admin/overview" className="font-medium text-primary hover:underline">
              Overview
            </Link>
            <Link to="/admin/deployments" className="font-medium text-primary hover:underline">
              Services
            </Link>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
