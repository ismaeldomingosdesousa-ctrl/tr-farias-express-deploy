import { trpc } from "@/lib/trpc";
import {
  Package, Truck, Warehouse, Users, DollarSign,
  AlertTriangle, TrendingUp, Clock, CheckCircle2,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, accent = false }: {
  icon: React.ElementType; label: string; value: string | number; accent?: boolean;
}) {
  return (
    <div className="brutal-stat flex items-center gap-4">
      <div className={`p-2 ${accent ? "bg-primary/20" : "bg-muted"}`}>
        <Icon className={`h-5 w-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground tracking-wider">{value}</p>
        <p className="text-xs text-muted-foreground tracking-widest uppercase">{label}</p>
      </div>
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
          <h1 className="text-3xl font-bold tracking-widest text-foreground">DASHBOARD</h1>
          <div className="brutal-divider mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="brutal-stat animate-pulse">
              <div className="h-12 bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-widest text-foreground">DASHBOARD OPERACIONAL</h1>
        <div className="brutal-divider mt-2" />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Total Pedidos" value={kpis?.totalOrders ?? 0} />
        <StatCard icon={Clock} label="Pendentes" value={kpis?.pendingOrders ?? 0} accent />
        <StatCard icon={Truck} label="Em Trânsito" value={kpis?.inTransitOrders ?? 0} accent />
        <StatCard icon={CheckCircle2} label="Entregues" value={kpis?.deliveredOrders ?? 0} />
        <StatCard icon={Users} label="Motoristas Ativos" value={kpis?.activeDrivers ?? 0} />
        <StatCard icon={Truck} label="Veículos Disponíveis" value={kpis?.availableVehicles ?? 0} />
        <StatCard icon={DollarSign} label="Receita Total" value={`R$ ${(kpis?.totalRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} accent />
        <StatCard icon={AlertTriangle} label="Alertas Não Lidos" value={kpis?.unreadAlerts ?? 0} accent />
      </div>

      {/* Quick Info Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="brutal-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold tracking-widest text-foreground">RESUMO FINANCEIRO</h2>
          </div>
          <div className="brutal-divider mb-4" />
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground tracking-wider">RECEITA CONFIRMADA</span>
              <span className="text-lg font-bold text-foreground">
                R$ {(kpis?.totalRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground tracking-wider">RECEITA PENDENTE</span>
              <span className="text-lg font-bold text-primary">
                R$ {(kpis?.pendingRevenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground tracking-wider">CLIENTES ATIVOS</span>
              <span className="text-lg font-bold text-foreground">{kpis?.totalClients ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="brutal-card">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-bold tracking-widest text-foreground">STATUS OPERACIONAL</h2>
          </div>
          <div className="brutal-divider mb-4" />
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground tracking-wider">TAXA DE ENTREGA</span>
              <span className="text-lg font-bold text-foreground">
                {kpis && kpis.totalOrders > 0
                  ? `${Math.round((kpis.deliveredOrders / kpis.totalOrders) * 100)}%`
                  : "0%"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground tracking-wider">OCUPAÇÃO DA FROTA</span>
              <span className="text-lg font-bold text-primary">
                {kpis && (kpis.availableVehicles + kpis.inTransitOrders) > 0
                  ? `${Math.round((kpis.inTransitOrders / (kpis.availableVehicles + kpis.inTransitOrders)) * 100)}%`
                  : "0%"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground tracking-wider">PEDIDOS EM PROCESSAMENTO</span>
              <span className="text-lg font-bold text-foreground">{kpis?.pendingOrders ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
