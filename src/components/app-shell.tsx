import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Clock, GraduationCap, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { useMe, useSettings } from "@/hooks/use-api";
import { ErrorState, LoadingState } from "./states";

export interface NavItem { to: string; label: string; exact?: boolean }

export function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  // Always leave the signed-in screens, even if the server cannot be reached.
  return async () => {
    try { await api.auth.signOut(); } catch (e) { console.error("Sign out request failed", e); }
    finally { qc.clear(); void navigate({ to: "/signin" }); }
  };
}

export function AppShell({ nav, children, roleLabel }: { nav: NavItem[]; children: ReactNode; roleLabel: string }) {
  const { data: me } = useMe();
  const { data: settings } = useSettings();
  const signOut = useSignOut();
  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-primary text-primary-foreground print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <GraduationCap className="h-6 w-6 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">{settings?.schoolName ?? "Kids Parliament"} Results</p>
            <p className="truncate text-xs opacity-80">{roleLabel} · {me?.fullName}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={signOut}><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></Button>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-2">
          <ul className="flex gap-1 whitespace-nowrap pb-1.5">
            {nav.map((n) => (
              <li key={n.to}>
                <Link to={n.to} activeOptions={{ exact: !!n.exact }} className="block rounded-md px-3 py-1.5 text-sm font-medium opacity-80 hover:bg-primary-foreground/10 hover:opacity-100"
                  activeProps={{ className: "bg-primary-foreground/15 !opacity-100" }}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}

/** Client-side role guard. The real server must enforce the same rules on every call. */
export function RequireRole({ role, children }: { role: "admin" | "teacher"; children: ReactNode }) {
  const { data: me, isLoading, error, refetch } = useMe();
  const signOut = useSignOut();
  if (isLoading) return <LoadingState />;
  if (error) return <div className="p-6"><ErrorState error={error} onRetry={() => void refetch()} /></div>;
  if (!me) return <Navigate to="/signin" />;
  if (me.role !== role) return <Navigate to={me.role === "admin" ? "/admin" : "/teacher"} />;
  if (me.status === "pending")
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <div className="max-w-sm rounded-xl border bg-card p-6 text-center shadow-sm">
          <Clock className="mx-auto h-10 w-10 text-warning" />
          <h1 className="mt-3 text-lg font-bold">Waiting for Admin approval</h1>
          <p className="mt-1 text-sm text-muted-foreground">Hello {me.fullName}. Your account has been created. The Admin will approve it and assign your subjects soon.</p>
          <Button className="mt-4" variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  if (me.status === "disabled")
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div><h1 className="text-lg font-bold">Account disabled</h1><p className="text-sm text-muted-foreground">Please contact the Admin.</p><Button className="mt-4" variant="outline" onClick={signOut}>Sign out</Button></div>
      </div>
    );
  return <>{children}</>;
}
