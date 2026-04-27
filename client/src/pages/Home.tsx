import { trpc } from "@/lib/trpc";
import {
  Package, Truck, Warehouse, Users, DollarSign,
  AlertTriangle, TrendingUp, Clock, CheckCircle2, Activity,
} from "lucide-react";

type KpiCardProps = {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: boolean;
  trend?: string;
};

function KpiCard({ icon: Icon, label, value, accent = false, trend }: KpiCardProps) {
  return (
    <div className="kpi-card group animate-slide-up" style={{ animationFillMode: "both", opacity: 0 }}>
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent ? "bg-primary/15" : "bg-white/5"}`}>
          <Icon className={`h-5 w-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        {trend && (
          <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-foreground tracking-tight mb-1">{value}</p>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
    </div>
  );
}

export default function Home() {
  const { data: kpis, isLoading } = trpc.dashboard.kpis.useQuery(undefined, {
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Dashboard Operacional</h1>
          <div className="brutal-divider mt-3 max-w-xs" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="kpi-card animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-white/5 mb-4" />
              <div className="h-7 bg-white/5 rounded mb-2 w-2/3" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const deliveryRate =
    kpis && kpis.totalOrders > 0
      ? `${Math.round((kpis.deliveredOrders / kpis.totalOrders) * 100)}%`
      : "0%";

  const fleetOccupancy =
    kpis && (kpis.availableVehicles + kpis.inTransitOrders) > 0
      ? `${Math.round((kpis.inTransitOrders / (kpis.availableVehicles + kpis.inTransitOrders)) * 100)}%`
      : "0%";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Dashboard Operacional
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral da operação em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border border-border rounded-lg px-3 py-2">
          <Activity className="h-3.5 w-3.5 text-primary animate-pulse" />
          Atualiza a cada 15s
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Package}      label="Total de Pedidos"       value={kpis?.totalOrders ?? 0}   />
        <KpiCard icon={Clock}        label="Pendentes"               value={kpis?.pendingOrders ?? 0}  accent />
        <KpiCard icon={Truck}        label="Em Trânsito"             value={kpis?.inTransitOrders ?? 0} accent />
        <KpiCard icon={CheckCircle2} label="Entregues"               value={kpis?.deliveredOrders ?? 0} />
        <KpiCard icon={Users}        label="Motoristas Ativos"       value={kpis?.activeDrivers ?? 0}  />
        <KpiCard icon={Warehouse}    label="Veículos Disponíveis"    value={kpis?.availableVehicles ?? 0} />
        <KpiCard
          icon={DollarSign}
          label="Receita Total"
          value={`R$ ${(kpis?.totalRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          accent
        />
        <KpiCard icon={AlertTriangle} label="Alertas Não Lidos"     value={kpis?.unreadAlerts ?? 0}  accent />
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Financial summary */}
        <div className="brutal-card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Resumo Financeiro</h2>
          </div>
          <div className="brutal-divider mb-4 max-w-[48px]" />
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Receita Confirmada</span>
              <span className="text-base font-bold text-foreground">
                R$ {(kpis?.totalRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Receita Pendente</span>
              <span className="text-base font-bold text-primary">
                R$ {(kpis?.pendingRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Clientes Ativos</span>
              <span className="text-base font-bold text-foreground">{kpis?.totalClients ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Operational status */}
        <div className="brutal-card">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight">Status Operacional</h2>
          </div>
          <div className="brutal-divider mb-4 max-w-[48px]" />
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Taxa de Entrega</span>
              <span className="text-base font-bold text-foreground">{deliveryRate}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-sm text-muted-foreground">Ocupação da Frota</span>
              <span className="text-base font-bold text-primary">{fleetOccupancy}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Em Processamento</span>
              <span className="text-base font-bold text-foreground">{kpis?.pendingOrders ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
