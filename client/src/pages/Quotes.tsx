import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, Zap, ArrowRightLeft, CheckCircle, XCircle, Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const urgencyLabels: Record<string, string> = { standard: "PADRÃO", express: "EXPRESSO", same_day: "MESMO DIA" };
const statusLabels: Record<string, string> = {
  pending: "PENDENTE", accepted: "ACEITA", rejected: "REJEITADA",
  expired: "EXPIRADA", converted: "CONVERTIDA",
};
const statusColors: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/50",
  accepted: "text-green-400 border-green-400/50",
  rejected: "text-muted-foreground border-muted",
  expired: "text-muted-foreground border-muted",
  converted: "text-primary border-primary/50",
};

export default function Quotes() {
  const [, navigate] = useLocation();
  const [simOpen, setSimOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: quotes, isLoading } = trpc.quotes.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();

  const simulate = trpc.quotes.simulate.useMutation({ onSuccess: (data) => setSimResult(data) });

  const createQuote = trpc.quotes.create.useMutation({
    onSuccess: () => {
      utils.quotes.list.invalidate();
      setCreateOpen(false);
      setForm(emptyForm);
      toast.success("Cotação criada com sucesso");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateQuote = trpc.quotes.update.useMutation({
    onSuccess: (_, vars) => {
      utils.quotes.list.invalidate();
      if (vars.status === "accepted") toast.success("Cotação aceita");
      if (vars.status === "rejected") toast.success("Cotação rejeitada");
    },
    onError: (err) => toast.error(err.message),
  });

  const convertToOrder = trpc.quotes.convertToOrder.useMutation({
    onSuccess: (data) => {
      utils.quotes.list.invalidate();
      setConvertingId(null);
      toast.success(`Pedido ${data.orderNumber} criado com sucesso!`, {
        action: {
          label: "VER PEDIDO",
          onClick: () => navigate("/orders"),
        },
      });
    },
    onError: (err) => { setConvertingId(null); toast.error(err.message); },
  });

  const emptyForm = { originZip: "", destZip: "", weightKg: 0, volumeM3: 0, distanceKm: 0, urgency: "standard" as const, clientId: 0, originCity: "", destCity: "" };
  const [form, setForm] = useState(emptyForm);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-foreground">COTAÇÃO</h1>
          <div className="brutal-divider mt-2" />
        </div>
        <div className="flex gap-2">
          {/* Simulator */}
          <Dialog open={simOpen} onOpenChange={v => { setSimOpen(v); if (!v) setSimResult(null); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-primary text-primary font-bold tracking-widest">
                <Calculator className="h-4 w-4 mr-2" /> SIMULAR
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="text-xl font-bold tracking-widest">SIMULADOR DE PREÇO</DialogTitle></DialogHeader>
              <div className="brutal-divider my-2" />
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground tracking-widest">CEP ORIGEM</label><Input className="bg-input border-border" value={form.originZip} onChange={e => setForm(f => ({ ...f, originZip: e.target.value }))} /></div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">CEP DESTINO</label><Input className="bg-input border-border" value={form.destZip} onChange={e => setForm(f => ({ ...f, destZip: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground tracking-widest">PESO (KG)</label><Input type="number" className="bg-input border-border" value={form.weightKg || ""} onChange={e => setForm(f => ({ ...f, weightKg: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">VOLUME (M³)</label><Input type="number" className="bg-input border-border" value={form.volumeM3 || ""} onChange={e => setForm(f => ({ ...f, volumeM3: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">DISTÂNCIA (KM)</label><Input type="number" className="bg-input border-border" value={form.distanceKm || ""} onChange={e => setForm(f => ({ ...f, distanceKm: parseFloat(e.target.value) || 0 }))} /></div>
                </div>
                <div><label className="text-xs text-muted-foreground tracking-widest">URGÊNCIA</label>
                  <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v as any }))}>
                    <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">{Object.entries(urgencyLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest"
                  disabled={!form.weightKg || !form.distanceKm || simulate.isPending}
                  onClick={() => simulate.mutate({ originZip: form.originZip || "00000000", destZip: form.destZip || "00000000", weightKg: form.weightKg, volumeM3: form.volumeM3 || undefined, distanceKm: form.distanceKm, urgency: form.urgency })}>
                  <Zap className="h-4 w-4 mr-2" /> {simulate.isPending ? "CALCULANDO..." : "CALCULAR PREÇO"}
                </Button>
                {simResult && (
                  <div className="brutal-stat mt-4 space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground tracking-wider">BASE</span><span className="font-bold">R$ {simResult.basePrice?.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground tracking-wider">PESO</span><span className="font-bold">R$ {simResult.weightPrice?.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground tracking-wider">DISTÂNCIA</span><span className="font-bold">R$ {simResult.distancePrice?.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted-foreground tracking-wider">MULTIPLICADOR</span><span className="font-bold">x{simResult.urgencyMultiplier}</span></div>
                    <div className="brutal-divider my-2" />
                    <div className="flex justify-between"><span className="text-sm text-primary font-bold tracking-widest">TOTAL</span><span className="text-xl font-bold text-primary">R$ {simResult.totalPrice?.toFixed(2)}</span></div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* New Quote */}
          <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground font-bold tracking-widest">
                <Plus className="h-4 w-4 mr-2" /> NOVA COTAÇÃO
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="text-xl font-bold tracking-widest">NOVA COTAÇÃO</DialogTitle></DialogHeader>
              <div className="brutal-divider my-2" />
              <div className="space-y-3">
                <div><label className="text-xs text-muted-foreground tracking-widest">CLIENTE</label>
                  <Select onValueChange={v => setForm(f => ({ ...f, clientId: parseInt(v) }))}>
                    <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">CEP ORIGEM</label>
                    <Input className="bg-input border-border" placeholder="00000-000" value={form.originZip} onChange={e => setForm(f => ({ ...f, originZip: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">CEP DESTINO</label>
                    <Input className="bg-input border-border" placeholder="00000-000" value={form.destZip} onChange={e => setForm(f => ({ ...f, destZip: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">CIDADE ORIGEM</label>
                    <Input className="bg-input border-border" placeholder="São Paulo" value={form.originCity} onChange={e => setForm(f => ({ ...f, originCity: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">CIDADE DESTINO</label>
                    <Input className="bg-input border-border" placeholder="Rio de Janeiro" value={form.destCity} onChange={e => setForm(f => ({ ...f, destCity: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground tracking-widest">PESO (KG)</label><Input type="number" className="bg-input border-border" value={form.weightKg || ""} onChange={e => setForm(f => ({ ...f, weightKg: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">VOLUME (M³)</label><Input type="number" className="bg-input border-border" value={form.volumeM3 || ""} onChange={e => setForm(f => ({ ...f, volumeM3: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">DISTÂNCIA (KM)</label><Input type="number" className="bg-input border-border" value={form.distanceKm || ""} onChange={e => setForm(f => ({ ...f, distanceKm: parseFloat(e.target.value) || 0 }))} /></div>
                </div>
                <div><label className="text-xs text-muted-foreground tracking-widest">URGÊNCIA</label>
                  <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v as any }))}>
                    <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">{Object.entries(urgencyLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest"
                  disabled={!form.originZip || !form.destZip || !form.weightKg || !form.distanceKm || createQuote.isPending}
                  onClick={() => createQuote.mutate({ ...form, clientId: form.clientId || undefined })}>
                  {createQuote.isPending ? "CRIANDO..." : "CRIAR COTAÇÃO"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Legend */}
      <div className="brutal-card p-3">
        <p className="text-xs text-muted-foreground tracking-wider">
          <span className="text-foreground font-bold">FLUXO:</span> Crie uma cotação → Aceite-a → Converta em Pedido automaticamente com todos os dados preenchidos.
        </p>
      </div>

      {/* Table */}
      <div className="brutal-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">COTAÇÃO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">ROTA</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">PESO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">URGÊNCIA</th>
              <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">VALOR</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden lg:table-cell">DATA</th>
              <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={8} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td>
                  </tr>
                ))
              : !quotes?.length
              ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground tracking-wider">
                      NENHUMA COTAÇÃO — CLIQUE EM "NOVA COTAÇÃO" PARA COMEÇAR
                    </td>
                  </tr>
                )
              : quotes.map(q => (
                  <tr key={q.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="p-3 font-bold tracking-wider font-mono text-sm">{q.quoteNumber}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      <div>{q.originCity || q.originZip}</div>
                      <div className="text-primary">↓</div>
                      <div>{q.destCity || q.destZip}</div>
                    </td>
                    <td className="p-3 text-muted-foreground hidden md:table-cell">{q.weightKg} kg</td>
                    <td className="p-3 hidden md:table-cell">
                      <span className={`text-xs font-bold tracking-widest ${q.urgency === "same_day" ? "text-primary" : q.urgency === "express" ? "text-yellow-400" : "text-muted-foreground"}`}>
                        {urgencyLabels[q.urgency]}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-foreground">R$ {q.totalPrice?.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`badge-status ${statusColors[q.status]}`}>{statusLabels[q.status]}</span>
                      {q.orderId && (
                        <div className="text-xs text-primary mt-1 tracking-wider">
                          <Package className="h-3 w-3 inline mr-1" />
                          PEDIDO #{q.orderId}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">
                      {new Date(q.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        {/* Accept / Reject — only for pending */}
                        {q.status === "pending" && (
                          <>
                            <Button size="sm" variant="outline"
                              className="text-xs tracking-wider border-green-400/50 text-green-400 h-7"
                              disabled={updateQuote.isPending}
                              onClick={() => updateQuote.mutate({ id: q.id, status: "accepted" })}>
                              <CheckCircle className="h-3 w-3 mr-1" /> ACEITAR
                            </Button>
                            <Button size="sm" variant="outline"
                              className="text-xs tracking-wider border-muted text-muted-foreground h-7"
                              disabled={updateQuote.isPending}
                              onClick={() => updateQuote.mutate({ id: q.id, status: "rejected" })}>
                              <XCircle className="h-3 w-3 mr-1" /> REJEITAR
                            </Button>
                          </>
                        )}
                        {/* Convert to Order — only for accepted */}
                        {q.status === "accepted" && (
                          <Button size="sm"
                            className="text-xs tracking-wider bg-primary text-primary-foreground font-bold h-7"
                            disabled={convertingId === q.id}
                            onClick={() => { setConvertingId(q.id); convertToOrder.mutate({ id: q.id }); }}>
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            {convertingId === q.id ? "CONVERTENDO..." : "CONVERTER EM PEDIDO"}
                          </Button>
                        )}
                        {/* Already converted — show link to order */}
                        {q.status === "converted" && q.orderId && (
                          <Button size="sm" variant="outline"
                            className="text-xs tracking-wider border-primary/50 text-primary h-7"
                            onClick={() => navigate("/orders")}>
                            <Package className="h-3 w-3 mr-1" /> VER PEDIDO
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
