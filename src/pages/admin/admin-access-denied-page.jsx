import { Link } from "react-router-dom";
import { AdminShell } from "@/components/admin-shell";

export function AdminAccessDeniedPage() {
  return (
    <AdminShell title="Control Panel" subtitle="Admin access required">
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Access denied</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your account does not have admin role access for Control Panel routes.
        </p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          Return to shop home
        </Link>
      </div>
    </AdminShell>
  );
}
