import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader({ isAuthenticated, role, userEmail, totalItems, onLogout }) {
  const showAdminLink = role === "admin";

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            SHCP Shop
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link to="/">Home</Link>
            <Link to="/products">Products</Link>
            <Link to="/orders">Orders</Link>
            {showAdminLink ? <Link to="/admin">Admin</Link> : <span className="opacity-60">Admin</span>}
            {isAuthenticated ? (
              <span>{`${userEmail || "user"} (${role})`}</span>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/signup">Signup</Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button type="button" variant="ghost" onClick={onLogout}>
              Logout
            </Button>
          ) : null}
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:hidden">
        <nav className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <Link to="/">Home</Link>
          <Link to="/products">Products</Link>
          <Link to="/orders">Orders</Link>
          {showAdminLink ? <Link to="/admin">Admin</Link> : <span className="opacity-60">Admin</span>}
          {isAuthenticated ? (
            <button type="button" className="text-sm text-muted-foreground" onClick={onLogout}>
              Logout
            </button>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Signup</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
