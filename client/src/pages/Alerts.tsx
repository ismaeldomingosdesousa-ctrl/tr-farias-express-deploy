import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, Info, AlertOctagon, CheckCheck, Truck, FileText, Package, MapPin, Wrench, DollarSign } from "lucide-react";
import { toast } from "sonner";

const severityConfig: Record<string, { icon: typeof Info; color: string; label: string }> = {
  info: { icon: Info, color: "text-blue-400 border-blue-400/50 bg-blue-400/5", label: "INFO" },
  warning: { icon: AlertTriangle, color: "text-yellow-400 border-yellow-400/50 bg-yellow-400/5", label: "AVISO" },
  critical: { icon: AlertOctagon, color: "text-primary border-primary/50 bg-primary/5", label: "CRÍTICO" },
};

const typeIcons: Record<string, typeof Truck> = {
  delivery_delay: Package, route_deviation: MapPin, document_expiry: FileText,
  low_inventory: Package, maintenance_due: Wrench, payment_overdue: DollarSign,
  geofence_breach: MapPin, system: Bell,
};

const typeLabels: Record<string, string> = {
  delivery_delay: "ATRASO NA ENTREGA", route_deviation: "DESVIO DE ROTA",
  document_expiry: "DOCUMENTO VENCIDO", low_inventory: "ESTOQUE BAIXO",
  maintenance_due: "MANUTENÇÃO PENDENTE", payment_overdue: "PAGAMENTO VENCIDO",
  geofence_breach: "VIOLAÇÃO GEOFENCE", system: "SISTEMA",
};

export default function Alerts() {
  const utils = trpc.useUtils();
  const { data: alerts, isLoading } = trpc.alerts.list.useQuery();
  const markRead = trpc.alerts.markRead.useMutation({
    onSuccess: () => { utils.alerts.list.invalidate(); },
  });
  const markAllRead = trpc.alerts.markAllRead.useMutation({
    onSuccess: () => { utils.alerts.list.invalidate(); toast.success("Todos marcados como lidos"); },
  });

  const unreadCount = alerts?.filter(a => !a.isRead).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-foreground">ALERTAS</h1>
          <div className="brutal-divider mt-2" />
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" className="border-border font-bold tracking-widest text-xs"
            onClick={() => markAllRead.mutate()}>
            <CheckCheck className="h-4 w-4 mr-2" /> MARCAR TODOS COMO LIDOS ({unreadCount})
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="brutal-stat flex items-center gap-4">
          <div className="p-2 bg-primary/10"><AlertOctagon className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{alerts?.filter(a => a.severity === "critical" && !a.isRead).length ?? 0}</p>
            <p className="text-xs text-muted-foreground tracking-widest">CRÍTICOS</p>
          </div>
        </div>
        <div className="brutal-stat flex items-center gap-4">
          <div className="p-2 bg-yellow-400/10"><AlertTriangle className="h-5 w-5 text-yellow-400" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{alerts?.filter(a => a.severity === "warning" && !a.isRead).length ?? 0}</p>
            <p className="text-xs text-muted-foreground tracking-widest">AVISOS</p>
          </div>
        </div>
        <div className="brutal-stat flex items-center gap-4">
          <div className="p-2 bg-blue-400/10"><Info className="h-5 w-5 text-blue-400" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{alerts?.filter(a => a.severity === "info" && !a.isRead).length ?? 0}</p>
            <p className="text-xs text-muted-foreground tracking-widest">INFORMATIVOS</p>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="brutal-card animate-pulse h-20" />
          ))
        ) : !alerts?.length ? (
          <div className="brutal-card text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground tracking-wider">NENHUM ALERTA</p>
          </div>
        ) : (
          alerts.map(alert => {
            const sev = severityConfig[alert.severity] || severityConfig.info;
            const SevIcon = sev.icon;
            const TypeIcon = typeIcons[alert.type] || Bell;
            return (
              <div key={alert.id}
                className={`brutal-card flex items-start gap-4 transition-all ${!alert.isRead ? "border-l-2 " + sev.color.split(" ").find(c => c.startsWith("border-")) : "opacity-60"}`}
                onClick={() => { if (!alert.isRead) markRead.mutate({ id: alert.id }); }}
                style={{ cursor: !alert.isRead ? "pointer" : "default" }}>
                <div className={`p-2 shrink-0 ${sev.color.split(" ").find(c => c.startsWith("bg-"))}`}>
                  <SevIcon className={`h-4 w-4 ${sev.color.split(" ").find(c => c.startsWith("text-"))}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <TypeIcon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground tracking-widest">{typeLabels[alert.type] || alert.type}</span>
                    <span className={`badge-status text-[10px] ${sev.color.split(" ").slice(0, 2).join(" ")}`}>{sev.label}</span>
                    {!alert.isRead && <span className="w-2 h-2 bg-primary rounded-full" />}
                  </div>
                  <h3 className="font-bold tracking-wider text-foreground text-sm">{alert.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground/50 mt-2">{new Date(alert.createdAt).toLocaleString("pt-BR")}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
