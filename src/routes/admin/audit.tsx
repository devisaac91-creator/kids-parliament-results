import { createFileRoute } from "@tanstack/react-router";
import { AppShell, RequireRole } from "@/components/app-shell";
import { ADMIN_NAV } from "@/components/admin-nav";
import { useAuditLog } from "@/hooks/use-api";

export const Route = createFileRoute("/admin/audit")({ head: () => ({ meta: [{ title: "Audit Log | Kids Parliament Results" }] }), component: AdminAuditRoute });

function AdminAuditRoute() {
  const { data: logs } = useAuditLog({});
  return <RequireRole role="admin"><AppShell roleLabel="Administrator" nav={ADMIN_NAV}><div className="space-y-4"><h1 className="text-xl font-bold">System Activity Log</h1><div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full text-left text-xs"><thead className="border-b bg-muted/60 font-semibold text-muted-foreground"><tr><th className="px-3 py-2">Timestamp</th><th className="px-3 py-2">Actor</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Details</th></tr></thead><tbody className="divide-y">{logs.map((log) => <tr key={log.id} className="hover:bg-muted/30"><td className="px-3 py-2 font-mono text-muted-foreground">{new Date(log.at).toLocaleString()}</td><td className="px-3 py-2 font-medium">{log.actorName}</td><td className="px-3 py-2 font-mono">{log.action}</td><td className="px-3 py-2 text-muted-foreground">{log.details}</td></tr>)}</tbody></table></div></div></AppShell></RequireRole>;
}
