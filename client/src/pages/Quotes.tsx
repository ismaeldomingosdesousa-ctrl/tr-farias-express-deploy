import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Plus, Zap, ArrowRightLeft, CheckCircle, XCircle, Package, Search, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useCep } from "@/hooks/useCep";

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

async function calcDistanceByCities(city1: string, state1: string, city2: string, state2: string): Promise<{ distanceKm: number; durationMin: number } | null> {
  try {
    const geocode = async (city: string, state: string) => {
      const q = encodeURIComponent(`${city}, ${state}, Brasil`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
        headers: { "User-Agent": "TrFariasExpress/1.0" },
      });
      const data = await res.json() as Array<{ lat: string; lon: string }>;
      if (!data[0]) return null;
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    };
    const [p1, p2] = await Promise.all([geocode(city1, state1), geocode(city2, state2)]);
    if (!p1 || !p2) return null;
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const straight = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const roadKm = Math.round(straight * 1.35);
    return { distanceKm: roadKm, durationMin: Math.round(roadKm / 70 * 60) };
  } catch {
    return null;
  }
}

export default function Quotes() {
  const [, navigate] = useLocation();
  const [simOpen, setSimOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [clientPickerQuoteId, setClientPickerQuoteId] = useState<number | null>(null);
  const [clientPickerValue, setClientPickerValue] = useState("");
  const [calcLoading, setCalcLoading] = useState(false);
  const utils = trpc.useUtils();
  const { lookup: lookupCep, loading: cepLoading } = useCep();
  const originCityRef = useRef<{ city: string; state: string } | null>(null);
  const destCityRef = useRef<{ city: string; state: string } | null>(null);

  const { data: quotes, isLoading } = trpc.quotes.list.useQuery();
  const { data: clients } = trpc.clients.list.useQuery();

  const simulate = trpc.quotes.simulate.useMutation({ onSuccess: (data) => setSimResult(data) });

  const createQuote = trpc.quotes.create.useMutation({
    onSuccess: () => {
      utils.quotes.list.invalidate();
      setCreateOpen(false);
      setForm(emptyForm);
      originCityRef.current = null;
      destCityRef.current = null;
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
      setClientPickerQuoteId(null);
      setClientPickerValue("");
      toast.success(`Pedido ${data.orderNumber} criado com sucesso!`, {
        action: { label: "VER PEDIDO", onClick: () => navigate("/orders") },
      });
    },
    onError: (err) => { setConvertingId(null); toast.error(err.message); },
  });

  const emptyForm = {
    originZip: "", destZip: "", weightKg: 0, volumeM3: 0, distanceKm: 0,
    urgency: "standard" as const, clientId: 0, originCity: "", destCity: "",
    originState: "", destState: "",
  };
  const [form, setForm] = useState(emptyForm);

  const handleCepLookup = async (field: "origin" | "dest") => {
    const cep = field === "origin" ? form.originZip : form.destZip;
    const result = await lookupCep(cep);
    if (!result) { toast.error("CEP não encontrado"); return; }
    if (field === "origin") {
      setForm(f => ({ ...f, originCity: result.city, originState: result.state }));
      originCityRef.current = { city: result.city, state: result.state };
      toast.success(`Origem: ${result.city}, ${result.state}`);
    } else {
      setForm(f => ({ ...f, destCity: result.city, destState: result.state }));
      destCityRef.current = { city: result.city, state: result.state };
      toast.success(`Destino: ${result.city}, ${result.state}`);
    }
    // Auto-calc distance when both are filled
    const o = field === "origin" ? { city: result.city, state: result.state } : originCityRef.current;
    const d = field === "dest" ? { city: result.city, state: result.state } : destCityRef.current;
    if (o && d) {
      setCalcLoading(true);
      const dist = await calcDistanceByCities(o.city, o.state, d.city, d.state);
      setCalcLoading(false);
      if (dist) {
        setForm(f => ({ ...f, distanceKm: dist.distanceKm }));
        toast.success(`Distância estimada: ${dist.distanceKm} km`);
      }
    }
  };

  const handleConvert = (q: { id: number; clientId: number | null }) => {
    if (!q.clientId) {
      setClientPickerQuoteId(q.id);
      setClientPickerValue("");
    } else {
      setConvertingId(q.id);
      convertToOrder.mutate({ id: q.id });
    }
  };

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
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">CEP ORIGEM</label>
                    <div className="flex gap-1">
                      <Input className="bg-input border-border" placeholder="00000-000" value={form.originZip} onChange={e => setForm(f => ({ ...f, originZip: e.target.value }))} />
                      <Button size="sm" variant="outline" className="border-border px-2 h-10 shrink-0" disabled={cepLoading} onClick={() => handleCepLookup("origin")}>
                        {cepLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      </Button>
                    </div>
                    {form.originCity && <p className="text-xs text-primary mt-1">{form.originCity}, {form.originState}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">CEP DESTINO</label>
                    <div className="flex gap-1">
                      <Input className="bg-input border-border" placeholder="00000-000" value={form.destZip} onChange={e => setForm(f => ({ ...f, destZip: e.target.value }))} />
                      <Button size="sm" variant="outline" className="border-border px-2 h-10 shrink-0" disabled={cepLoading} onClick={() => handleCepLookup("dest")}>
                        {cepLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      </Button>
                    </div>
                    {form.destCity && <p className="text-xs text-primary mt-1">{form.destCity}, {form.destState}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground tracking-widest">PESO (KG)</label><Input type="number" className="bg-input border-border" value={form.weightKg || ""} onChange={e => setForm(f => ({ ...f, weightKg: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">VOLUME (M³)</label><Input type="number" className="bg-input border-border" value={form.volumeM3 || ""} onChange={e => setForm(f => ({ ...f, volumeM3: parseFloat(e.target.value) || 0 }))} /></div>
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">DISTÂNCIA (KM)</label>
                    <div className="flex items-center gap-1">
                      <Input type="number" className="bg-input border-border" value={form.distanceKm || ""} onChange={e => setForm(f => ({ ...f, distanceKm: parseFloat(e.target.value) || 0 }))} />
                      {calcLoading && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
                    </div>
                  </div>
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
          <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) { setForm(emptyForm); originCityRef.current = null; destCityRef.current = null; } }}>
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
                    <div className="flex gap-1">
                      <Input className="bg-input border-border" placeholder="00000-000" value={form.originZip} onChange={e => setForm(f => ({ ...f, originZip: e.target.value }))} />
                      <Button size="sm" variant="outline" className="border-border px-2 h-10 shrink-0" disabled={cepLoading} onClick={() => handleCepLookup("origin")}>
                        {cepLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      </Button>
                    </div>
                    {form.originCity && <p className="text-xs text-primary mt-1">{form.originCity}, {form.originState}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">CEP DESTINO</label>
                    <div className="flex gap-1">
                      <Input className="bg-input border-border" placeholder="00000-000" value={form.destZip} onChange={e => setForm(f => ({ ...f, destZip: e.target.value }))} />
                      <Button size="sm" variant="outline" className="border-border px-2 h-10 shrink-0" disabled={cepLoading} onClick={() => handleCepLookup("dest")}>
                        {cepLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      </Button>
                    </div>
                    {form.destCity && <p className="text-xs text-primary mt-1">{form.destCity}, {form.destState}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-xs text-muted-foreground tracking-widest">PESO (KG)</label><Input type="number" className="bg-input border-border" value={form.weightKg || ""} onChange={e => setForm(f => ({ ...f, weightKg: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">VOLUME (M³)</label><Input type="number" className="bg-input border-border" value={form.volumeM3 || ""} onChange={e => setForm(f => ({ ...f, volumeM3: parseFloat(e.target.value) || 0 }))} /></div>
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">DISTÂNCIA (KM)</label>
                    <div className="flex items-center gap-1">
                      <Input type="number" className="bg-input border-border" value={form.distanceKm || ""} onChange={e => setForm(f => ({ ...f, distanceKm: parseFloat(e.target.value) || 0 }))} />
                      {calcLoading && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
                    </div>
                  </div>
                </div>
                <div><label className="text-xs text-muted-foreground tracking-widest">URGÊNCIA</label>
                  <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v as any }))}>
                    <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">{Object.entries(urgencyLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest"
                  disabled={!form.originZip || !form.destZip || !form.weightKg || !form.distanceKm || createQuote.isPending}
                  onClick={() => createQuote.mutate({ ...form, clientId: form.clientId || undefined, originState: form.originState || undefined, destState: form.destState || undefined })}>
                  {createQuote.isPending ? "CRIANDO..." : "CRIAR COTAÇÃO"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Client picker dialog for quotes without client */}
      <Dialog open={!!clientPickerQuoteId} onOpenChange={v => { if (!v) { setClientPickerQuoteId(null); setClientPickerValue(""); } }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="text-lg font-bold tracking-widest">SELECIONAR CLIENTE</DialogTitle></DialogHeader>
          <div className="brutal-divider my-2" />
          <p className="text-sm text-muted-foreground">Esta cotação não possui cliente vinculado. Selecione um cliente para continuar.</p>
          <Select value={clientPickerValue} onValueChange={setClientPickerValue}>
            <SelectTrigger className="bg-input border-border mt-3"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {clients?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            className="w-full bg-primary text-primary-foreground font-bold tracking-widest mt-2"
            disabled={!clientPickerValue || convertToOrder.isPending}
            onClick={() => {
              if (!clientPickerQuoteId || !clientPickerValue) return;
              setConvertingId(clientPickerQuoteId);
              convertToOrder.mutate({ id: clientPickerQuoteId, clientId: parseInt(clientPickerValue) });
            }}
          >
            {convertToOrder.isPending ? "CONVERTENDO..." : "CONVERTER EM PEDIDO"}
          </Button>
        </DialogContent>
      </Dialog>

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
                    <td className="p-3 font-bold tracking-wider font-mono text-sm">
                      {q.quoteNumber}
                      {!q.clientId && q.status === "accepted" && (
                        <div className="text-xs text-yellow-400 mt-0.5">⚠ sem cliente</div>
                      )}
                    </td>
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
                        {q.status === "accepted" && (
                          <Button size="sm"
                            className="text-xs tracking-wider bg-primary text-primary-foreground font-bold h-7"
                            disabled={convertingId === q.id}
                            onClick={() => handleConvert(q)}>
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                            {convertingId === q.id ? "CONVERTENDO..." : "CONVERTER EM PEDIDO"}
                          </Button>
                        )}
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
