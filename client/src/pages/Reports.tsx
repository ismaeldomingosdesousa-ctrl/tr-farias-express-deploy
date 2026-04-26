import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart3, Download, FileText, Truck, DollarSign, Package } from "lucide-react";
import { useState, useMemo } from "react";

type ReportType = "orders" | "financial" | "drivers" | "vehicles";

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("orders");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: orders } = trpc.orders.list.useQuery();
  const { data: transactions } = trpc.financial.list.useQuery();
  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: vehicles } = trpc.vehicles.list.useQuery();

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(o => {
      const d = new Date(o.createdAt);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [orders, dateFrom, dateTo]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      const d = new Date(t.dueDate);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  const exportCSV = (data: Record<string, any>[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(";"),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        if (val instanceof Date) return val.toLocaleDateString("pt-BR");
        if (typeof val === "number") return val.toString().replace(".", ",");
        return `"${String(val ?? "").replace(/"/g, '""')}"`;
      }).join(";"))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    switch (reportType) {
      case "orders":
        exportCSV(filteredOrders.map(o => ({
          Pedido: o.orderNumber, Status: o.status, Origem: `${o.originCity}/${o.originState}`,
          Destino: `${o.destCity}/${o.destState}`, Frete: o.freightValue || 0,
          Data: new Date(o.createdAt).toLocaleDateString("pt-BR"),
        })), "relatorio-pedidos");
        break;
      case "financial":
        exportCSV(filteredTransactions.map(t => ({
          Tipo: t.type === "receivable" ? "Receber" : "Pagar", Categoria: t.category,
          Descricao: t.description || "", Valor: t.amount, Vencimento: new Date(t.dueDate).toLocaleDateString("pt-BR"),
          Status: t.status,
        })), "relatorio-financeiro");
        break;
      case "drivers":
        exportCSV((drivers || []).map(d => ({
          Nome: d.name, CPF: d.cpf, CNH: d.cnh, Categoria: d.cnhCategory || "",
          Status: d.status, Viagens: d.totalTrips || 0, Avaliacao: d.rating || 0,
        })), "relatorio-motoristas");
        break;
      case "vehicles":
        exportCSV((vehicles || []).map(v => ({
          Placa: v.plate, Tipo: v.type, Marca: v.brand || "", Modelo: v.model || "",
          CapacidadeKg: v.capacityKg || 0, Status: v.status,
        })), "relatorio-veiculos");
        break;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-widest text-foreground">RELATÓRIOS</h1>
        <div className="brutal-divider mt-2" />
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { key: "orders", icon: Package, label: "PEDIDOS" },
          { key: "financial", icon: DollarSign, label: "FINANCEIRO" },
          { key: "drivers", icon: FileText, label: "MOTORISTAS" },
          { key: "vehicles", icon: Truck, label: "VEÍCULOS" },
        ] as const).map(r => (
          <button key={r.key}
            className={`brutal-card flex items-center gap-3 transition-colors ${reportType === r.key ? "border-primary" : ""}`}
            onClick={() => setReportType(r.key)}>
            <r.icon className={`h-5 w-5 ${reportType === r.key ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-bold tracking-widest ${reportType === r.key ? "text-primary" : "text-muted-foreground"}`}>{r.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {(reportType === "orders" || reportType === "financial") && (
          <>
            <div>
              <label className="text-xs text-muted-foreground tracking-widest block mb-1">DATA INÍCIO</label>
              <Input type="date" className="bg-input border-border w-44" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground tracking-widest block mb-1">DATA FIM</label>
              <Input type="date" className="bg-input border-border w-44" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </>
        )}
        <Button onClick={handleExport} className="bg-primary text-primary-foreground font-bold tracking-widest">
          <Download className="h-4 w-4 mr-2" /> EXPORTAR CSV
        </Button>
      </div>

      {/* Report Content */}
      {reportType === "orders" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="brutal-stat"><p className="text-2xl font-bold">{filteredOrders.length}</p><p className="text-xs text-muted-foreground tracking-widest">TOTAL</p></div>
            <div className="brutal-stat"><p className="text-2xl font-bold">{filteredOrders.filter(o => o.status === "delivered").length}</p><p className="text-xs text-muted-foreground tracking-widest">ENTREGUES</p></div>
            <div className="brutal-stat"><p className="text-2xl font-bold">{filteredOrders.filter(o => o.status === "in_transit").length}</p><p className="text-xs text-muted-foreground tracking-widest">EM TRÂNSITO</p></div>
            <div className="brutal-stat"><p className="text-2xl font-bold text-primary">R$ {filteredOrders.reduce((s, o) => s + (o.freightValue || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground tracking-widest">RECEITA FRETE</p></div>
          </div>
          <div className="brutal-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">PEDIDO</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">DESTINO</th>
                <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">FRETE</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">DATA</th>
              </tr></thead>
              <tbody>
                {filteredOrders.slice(0, 50).map(o => (
                  <tr key={o.id} className="border-b border-border/50">
                    <td className="p-3 font-bold tracking-wider text-xs">{o.orderNumber}</td>
                    <td className="p-3 text-xs text-muted-foreground uppercase">{o.status}</td>
                    <td className="p-3 text-xs text-muted-foreground">{o.destCity}/{o.destState}</td>
                    <td className="p-3 text-right text-xs font-bold">{o.freightValue ? `R$ ${o.freightValue.toFixed(2)}` : "-"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === "financial" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="brutal-stat"><p className="text-2xl font-bold text-green-400">R$ {filteredTransactions.filter(t => t.type === "receivable").reduce((s, t) => s + t.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground tracking-widest">TOTAL A RECEBER</p></div>
            <div className="brutal-stat"><p className="text-2xl font-bold text-primary">R$ {filteredTransactions.filter(t => t.type === "payable").reduce((s, t) => s + t.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground tracking-widest">TOTAL A PAGAR</p></div>
            <div className="brutal-stat"><p className="text-2xl font-bold">{filteredTransactions.filter(t => t.status === "overdue").length}</p><p className="text-xs text-muted-foreground tracking-widest">VENCIDOS</p></div>
          </div>
          <div className="brutal-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">TIPO</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">CATEGORIA</th>
                <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">VALOR</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">VENCIMENTO</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
              </tr></thead>
              <tbody>
                {filteredTransactions.slice(0, 50).map(t => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="p-3 text-xs font-bold tracking-widest">{t.type === "receivable" ? "RECEBER" : "PAGAR"}</td>
                    <td className="p-3 text-xs text-muted-foreground uppercase">{t.category}</td>
                    <td className="p-3 text-right text-xs font-bold">R$ {t.amount.toFixed(2)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(t.dueDate).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 text-xs text-muted-foreground uppercase">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === "drivers" && (
        <div className="brutal-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">NOME</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">CPF</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">CNH</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
              <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">VIAGENS</th>
              <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">AVALIAÇÃO</th>
            </tr></thead>
            <tbody>
              {(drivers || []).map(d => (
                <tr key={d.id} className="border-b border-border/50">
                  <td className="p-3 font-bold tracking-wider text-xs">{d.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{d.cpf}</td>
                  <td className="p-3 text-xs text-muted-foreground">{d.cnh} ({d.cnhCategory})</td>
                  <td className="p-3 text-xs text-muted-foreground uppercase">{d.status}</td>
                  <td className="p-3 text-right text-xs font-bold">{d.totalTrips || 0}</td>
                  <td className="p-3 text-right text-xs font-bold">{d.rating?.toFixed(1) || "5.0"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reportType === "vehicles" && (
        <div className="brutal-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">PLACA</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">TIPO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">MARCA/MODELO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
              <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">CAPACIDADE (KG)</th>
            </tr></thead>
            <tbody>
              {(vehicles || []).map(v => (
                <tr key={v.id} className="border-b border-border/50">
                  <td className="p-3 font-bold tracking-wider text-xs">{v.plate}</td>
                  <td className="p-3 text-xs text-muted-foreground uppercase">{v.type}</td>
                  <td className="p-3 text-xs text-muted-foreground">{v.brand} {v.model}</td>
                  <td className="p-3 text-xs text-muted-foreground uppercase">{v.status}</td>
                  <td className="p-3 text-right text-xs font-bold">{v.capacityKg || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
