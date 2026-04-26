import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCep } from "@/hooks/useCep";

const statusLabels: Record<string, string> = {
  pending: "PENDENTE", confirmed: "CONFIRMADO", picking: "PICKING",
  packed: "EMBALADO", awaiting_pickup: "AGUARDANDO COLETA",
  in_transit: "EM TRÂNSITO", delivered: "ENTREGUE",
  cancelled: "CANCELADO", returned: "DEVOLVIDO",
};
const statusColors: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/50", confirmed: "text-blue-400 border-blue-400/50",
  picking: "text-orange-400 border-orange-400/50", packed: "text-cyan-400 border-cyan-400/50",
  awaiting_pickup: "text-purple-400 border-purple-400/50", in_transit: "text-primary border-primary/50",
  delivered: "text-green-400 border-green-400/50", cancelled: "text-muted-foreground border-muted",
  returned: "text-muted-foreground border-muted",
};

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: orders, isLoading } = trpc.orders.list.useQuery(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const { data: clients } = trpc.clients.list.useQuery();
  const { data: routes } = trpc.routes.list.useQuery();
  const { data: drivers } = trpc.drivers.list.useQuery();
  const createMutation = trpc.orders.create.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); setCreateOpen(false); toast.success("Pedido criado"); },
  });
  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => { utils.orders.list.invalidate(); toast.success("Status atualizado"); },
  });

  const [form, setForm] = useState({ clientId: 0, routeId: 0, driverId: 0, originAddress: "", originCity: "", originState: "", destAddress: "", destCity: "", destState: "", priority: "normal" as const, notes: "" });
  const [originCep, setOriginCep] = useState("");
  const [destCep, setDestCep] = useState("");
  const { lookup: lookupCep, loading: cepLoading } = useCep();

  const handleCepLookup = async (field: "origin" | "dest") => {
    const cep = field === "origin" ? originCep : destCep;
    const result = await lookupCep(cep);
    if (result) {
      if (field === "origin") {
        setForm(f => ({ ...f, originAddress: result.street ? `${result.street}, ${result.neighborhood}` : result.fullAddress, originCity: result.city, originState: result.state }));
        toast.success(`Origem: ${result.city}, ${result.state}`);
      } else {
        setForm(f => ({ ...f, destAddress: result.street ? `${result.street}, ${result.neighborhood}` : result.fullAddress, destCity: result.city, destState: result.state }));
        toast.success(`Destino: ${result.city}, ${result.state}`);
      }
    } else {
      toast.error("CEP não encontrado");
    }
  };

  const filtered = orders?.filter(o =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.destCity?.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-foreground">PEDIDOS</h1>
          <div className="brutal-divider mt-2" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-bold tracking-widest">
              <Plus className="h-4 w-4 mr-2" /> NOVO PEDIDO
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-widest">NOVO PEDIDO</DialogTitle>
            </DialogHeader>
            <div className="brutal-divider my-2" />
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">CLIENTE</label>
                <Select onValueChange={v => setForm(f => ({ ...f, clientId: parseInt(v) }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground tracking-widest">CEP ORIGEM</label>
                <div className="flex gap-2">
                  <Input className="bg-input border-border" placeholder="00000-000" maxLength={9}
                    value={originCep}
                    onChange={e => setOriginCep(e.target.value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2"))}
                    onKeyDown={e => { if (e.key === "Enter") handleCepLookup("origin"); }}
                  />
                  <Button size="sm" variant="outline" className="border-border shrink-0" disabled={cepLoading} onClick={() => handleCepLookup("origin")}>
                    {cepLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest">CIDADE ORIGEM</label>
                  <Input className="bg-input border-border" value={form.originCity} onChange={e => setForm(f => ({ ...f, originCity: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest">UF ORIGEM</label>
                  <Input className="bg-input border-border" maxLength={2} value={form.originState} onChange={e => setForm(f => ({ ...f, originState: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">ENDEREÇO ORIGEM</label>
                <Input className="bg-input border-border" value={form.originAddress} onChange={e => setForm(f => ({ ...f, originAddress: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground tracking-widest">CEP DESTINO</label>
                <div className="flex gap-2">
                  <Input className="bg-input border-border" placeholder="00000-000" maxLength={9}
                    value={destCep}
                    onChange={e => setDestCep(e.target.value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2"))}
                    onKeyDown={e => { if (e.key === "Enter") handleCepLookup("dest"); }}
                  />
                  <Button size="sm" variant="outline" className="border-border shrink-0" disabled={cepLoading} onClick={() => handleCepLookup("dest")}>
                    {cepLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest">CIDADE DESTINO</label>
                  <Input className="bg-input border-border" value={form.destCity} onChange={e => setForm(f => ({ ...f, destCity: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest">UF DESTINO</label>
                  <Input className="bg-input border-border" maxLength={2} value={form.destState} onChange={e => setForm(f => ({ ...f, destState: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">ENDEREÇO DESTINO</label>
                <Input className="bg-input border-border" value={form.destAddress} onChange={e => setForm(f => ({ ...f, destAddress: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">ROTA <span className="text-muted-foreground/50">(opcional)</span></label>
                <Select onValueChange={v => setForm(f => ({ ...f, routeId: parseInt(v) }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Vincular a uma rota" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {routes?.filter(r => r.status === "planned" || r.status === "in_progress").map(r => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.routeCode} — {r.originAddress?.split(",")[0] ?? ""} → {r.destAddress?.split(",")[0] ?? ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">MOTORISTA <span className="text-muted-foreground/50">(opcional)</span></label>
                <Select onValueChange={v => setForm(f => ({ ...f, driverId: parseInt(v) }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Atribuir motorista" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {drivers?.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">PRIORIDADE</label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="low">BAIXA</SelectItem>
                    <SelectItem value="normal">NORMAL</SelectItem>
                    <SelectItem value="high">ALTA</SelectItem>
                    <SelectItem value="urgent">URGENTE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">OBSERVAÇÕES</label>
                <Input className="bg-input border-border" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground font-bold tracking-widest"
                disabled={!form.clientId || createMutation.isPending}
                onClick={() => createMutation.mutate(form)}
              >
                {createMutation.isPending ? "CRIANDO..." : "CRIAR PEDIDO"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 bg-input border-border" placeholder="Buscar pedido..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 bg-input border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">TODOS</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="brutal-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">PEDIDO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">DESTINO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden lg:table-cell">PRIORIDADE</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden lg:table-cell">FRETE</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">DATA</th>
              <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50"><td colSpan={7} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground tracking-wider">NENHUM PEDIDO ENCONTRADO</td></tr>
            ) : (
              filtered.map(order => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="p-3 font-bold tracking-wider text-foreground">{order.orderNumber}</td>
                  <td className="p-3">
                    <span className={`badge-status ${statusColors[order.status]}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{order.destCity}{order.destState ? `/${order.destState}` : ""}</td>
                  <td className="p-3 hidden lg:table-cell">
                    <span className={`text-xs font-bold tracking-widest ${order.priority === "urgent" ? "text-primary" : order.priority === "high" ? "text-yellow-400" : "text-muted-foreground"}`}>
                      {order.priority?.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground hidden lg:table-cell">
                    {order.freightValue ? `R$ ${order.freightValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {order.status === "pending" && (
                        <Button size="sm" variant="outline" className="text-xs tracking-wider border-border h-7"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: "confirmed" })}>
                          CONFIRMAR
                        </Button>
                      )}
                      {order.status === "confirmed" && (
                        <Button size="sm" variant="outline" className="text-xs tracking-wider border-border h-7"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: "in_transit" })}>
                          DESPACHAR
                        </Button>
                      )}
                      {order.status === "in_transit" && (
                        <Button size="sm" variant="outline" className="text-xs tracking-wider border-border h-7"
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: "delivered" })}>
                          ENTREGAR
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
