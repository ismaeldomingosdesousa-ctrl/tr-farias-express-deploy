import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Truck, Route, Play, CheckCircle, XCircle, Search, Loader2, MapPin } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useCep } from "@/hooks/useCep";

const vehicleTypes: Record<string, string> = {
  vuc: "VUC", toco: "TOCO", truck: "TRUCK", carreta: "CARRETA",
  bitrem: "BITREM", van: "VAN", utilitario: "UTILITÁRIO",
};
const vehicleStatusLabels: Record<string, string> = {
  available: "DISPONÍVEL", in_use: "EM USO", maintenance: "MANUTENÇÃO", inactive: "INATIVO",
};
const vehicleStatusColors: Record<string, string> = {
  available: "text-green-400 border-green-400/50", in_use: "text-primary border-primary/50",
  maintenance: "text-yellow-400 border-yellow-400/50", inactive: "text-muted-foreground border-muted",
};
const routeStatusLabels: Record<string, string> = {
  planned: "PLANEJADA", in_progress: "EM ANDAMENTO", completed: "CONCLUÍDA", cancelled: "CANCELADA",
};
const routeStatusColors: Record<string, string> = {
  planned: "text-blue-400 border-blue-400/50", in_progress: "text-yellow-400 border-yellow-400/50",
  completed: "text-green-400 border-green-400/50", cancelled: "text-muted-foreground border-muted",
};

// Google Maps Directions API via Manus proxy
async function calculateRouteDistance(origin: string, destination: string): Promise<{ distanceKm: number; durationMin: number } | null> {
  try {
    const params = new URLSearchParams({
      origin,
      destination,
      key: "proxy",
      language: "pt-BR",
    });
    const res = await fetch(`https://forge.manus.ai/v1/maps/proxy/maps/api/directions/json?${params}`);
    const data = await res.json();
    if (data.status === "OK" && data.routes?.[0]?.legs?.[0]) {
      const leg = data.routes[0].legs[0];
      const distanceKm = Math.round(leg.distance.value / 1000);
      const durationMin = Math.round(leg.duration.value / 60);
      return { distanceKm, durationMin };
    }
    return null;
  } catch {
    return null;
  }
}

export default function Transport() {
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [routeCalc, setRouteCalc] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const utils = trpc.useUtils();
  const { lookup: lookupCep, loading: cepLoading } = useCep();

  const { data: vehicles, isLoading: loadingV } = trpc.vehicles.list.useQuery();
  const { data: routes, isLoading: loadingR } = trpc.routes.list.useQuery();
  const { data: drivers } = trpc.drivers.list.useQuery();

  const createVehicle = trpc.vehicles.create.useMutation({
    onSuccess: () => { utils.vehicles.list.invalidate(); setVehicleOpen(false); toast.success("Veículo cadastrado"); },
  });
  const createRoute = trpc.routes.create.useMutation({
    onSuccess: () => { utils.routes.list.invalidate(); setRouteOpen(false); setRouteCalc(null); toast.success("Rota criada"); },
  });
  const updateRoute = trpc.routes.update.useMutation({
    onSuccess: () => { utils.routes.list.invalidate(); setActioningId(null); },
  });

  const handleRouteAction = (routeId: number, action: "start" | "complete" | "cancel") => {
    setActioningId(routeId);
    const now = new Date();
    if (action === "start") {
      updateRoute.mutate({ id: routeId, status: "in_progress", startedAt: now }, {
        onSuccess: () => { toast.success("Rota iniciada — pedidos atualizados para EM TRÂNSITO"); setActioningId(null); },
        onError: () => setActioningId(null),
      });
    } else if (action === "complete") {
      updateRoute.mutate({ id: routeId, status: "completed", completedAt: now }, {
        onSuccess: () => { toast.success("Rota concluída — pedidos atualizados para ENTREGUE"); setActioningId(null); },
        onError: () => setActioningId(null),
      });
    } else {
      updateRoute.mutate({ id: routeId, status: "cancelled" }, {
        onSuccess: () => { toast.error("Rota cancelada"); setActioningId(null); },
        onError: () => setActioningId(null),
      });
    }
  };

  const [vForm, setVForm] = useState({ plate: "", type: "toco" as const, brand: "", model: "", capacityKg: 0, capacityM3: 0 });
  const [rForm, setRForm] = useState({
    originAddress: "", destAddress: "",
    originCep: "", destCep: "",
    driverId: 0, vehicleId: 0,
    distanceKm: 0, estimatedDuration: 0,
  });

  const handleCepLookup = async (field: "origin" | "dest") => {
    const cep = field === "origin" ? rForm.originCep : rForm.destCep;
    const result = await lookupCep(cep);
    if (result) {
      if (field === "origin") {
        setRForm(f => ({ ...f, originAddress: result.fullAddress }));
        toast.success(`Origem: ${result.city}, ${result.state}`);
      } else {
        setRForm(f => ({ ...f, destAddress: result.fullAddress }));
        toast.success(`Destino: ${result.city}, ${result.state}`);
      }
    } else {
      toast.error("CEP não encontrado");
    }
  };

  const handleCalcRoute = async () => {
    if (!rForm.originAddress || !rForm.destAddress) {
      toast.error("Preencha origem e destino primeiro");
      return;
    }
    setCalcLoading(true);
    const result = await calculateRouteDistance(rForm.originAddress, rForm.destAddress);
    setCalcLoading(false);
    if (result) {
      setRouteCalc(result);
      setRForm(f => ({ ...f, distanceKm: result.distanceKm, estimatedDuration: result.durationMin }));
      toast.success(`Distância: ${result.distanceKm} km — Duração estimada: ${Math.floor(result.durationMin / 60)}h${result.durationMin % 60}min`);
    } else {
      toast.error("Não foi possível calcular a rota. Verifique os endereços.");
    }
  };

  const handleCreateRoute = () => {
    const { originCep, destCep, ...payload } = rForm;
    createRoute.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-widest text-foreground">TRANSPORTE (TMS)</h1>
        <div className="brutal-divider mt-2" />
      </div>

      <Tabs defaultValue="vehicles">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="vehicles" className="tracking-widest text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Truck className="h-3 w-3 mr-1" /> FROTA
          </TabsTrigger>
          <TabsTrigger value="routes" className="tracking-widest text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Route className="h-3 w-3 mr-1" /> ROTAS
          </TabsTrigger>
        </TabsList>

        {/* ── FROTA ── */}
        <TabsContent value="vehicles" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground font-bold tracking-widest">
                  <Plus className="h-4 w-4 mr-2" /> NOVO VEÍCULO
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-xl font-bold tracking-widest">NOVO VEÍCULO</DialogTitle></DialogHeader>
                <div className="brutal-divider my-2" />
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground tracking-widest">PLACA</label>
                      <Input className="bg-input border-border" value={vForm.plate} onChange={e => setVForm(f => ({ ...f, plate: e.target.value.toUpperCase() }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground tracking-widest">TIPO</label>
                      <Select value={vForm.type} onValueChange={v => setVForm(f => ({ ...f, type: v as any }))}>
                        <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {Object.entries(vehicleTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground tracking-widest">MARCA</label>
                      <Input className="bg-input border-border" value={vForm.brand} onChange={e => setVForm(f => ({ ...f, brand: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground tracking-widest">MODELO</label>
                      <Input className="bg-input border-border" value={vForm.model} onChange={e => setVForm(f => ({ ...f, model: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground tracking-widest">CAPACIDADE (KG)</label>
                      <Input type="number" className="bg-input border-border" value={vForm.capacityKg || ""} onChange={e => setVForm(f => ({ ...f, capacityKg: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground tracking-widest">CAPACIDADE (M³)</label>
                      <Input type="number" className="bg-input border-border" value={vForm.capacityM3 || ""} onChange={e => setVForm(f => ({ ...f, capacityM3: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest" disabled={!vForm.plate || createVehicle.isPending}
                    onClick={() => createVehicle.mutate(vForm)}>
                    {createVehicle.isPending ? "CADASTRANDO..." : "CADASTRAR VEÍCULO"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="brutal-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">PLACA</th>
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">TIPO</th>
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">MARCA/MODELO</th>
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden lg:table-cell">CAPACIDADE</th>
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {loadingV ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50"><td colSpan={5} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td></tr>
                  ))
                ) : !vehicles?.length ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground tracking-wider">NENHUM VEÍCULO CADASTRADO</td></tr>
                ) : (
                  vehicles.map(v => (
                    <tr key={v.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-3 font-bold tracking-wider">{v.plate}</td>
                      <td className="p-3 text-muted-foreground">{vehicleTypes[v.type] || v.type}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{v.brand} {v.model}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell">{v.capacityKg ? `${v.capacityKg}kg` : "-"} / {v.capacityM3 ? `${v.capacityM3}m³` : "-"}</td>
                      <td className="p-3"><span className={`badge-status ${vehicleStatusColors[v.status]}`}>{vehicleStatusLabels[v.status]}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── ROTAS ── */}
        <TabsContent value="routes" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground tracking-widest">
              <span className="flex items-center gap-1"><Play className="h-3 w-3 text-blue-400" /> INICIAR</span>
              <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-green-400" /> CONCLUIR</span>
              <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-500" /> CANCELAR</span>
            </div>
            <Dialog open={routeOpen} onOpenChange={(open) => { setRouteOpen(open); if (!open) setRouteCalc(null); }}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground font-bold tracking-widest">
                  <Plus className="h-4 w-4 mr-2" /> NOVA ROTA
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-w-lg">
                <DialogHeader><DialogTitle className="text-xl font-bold tracking-widest">NOVA ROTA</DialogTitle></DialogHeader>
                <div className="brutal-divider my-2" />
                <div className="space-y-3">

                  {/* ORIGEM */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground tracking-widest">CEP DE ORIGEM</label>
                    <div className="flex gap-2">
                      <Input
                        className="bg-input border-border"
                        placeholder="00000-000"
                        maxLength={9}
                        value={rForm.originCep}
                        onChange={e => setRForm(f => ({ ...f, originCep: e.target.value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2") }))}
                        onKeyDown={e => { if (e.key === "Enter") handleCepLookup("origin"); }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border shrink-0"
                        disabled={cepLoading}
                        onClick={() => handleCepLookup("origin")}
                      >
                        {cepLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      </Button>
                    </div>
                    <Input
                      className="bg-input border-border"
                      placeholder="Endereço de origem (preenchido pelo CEP ou manual)"
                      value={rForm.originAddress}
                      onChange={e => setRForm(f => ({ ...f, originAddress: e.target.value }))}
                    />
                  </div>

                  {/* DESTINO */}
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground tracking-widest">CEP DE DESTINO</label>
                    <div className="flex gap-2">
                      <Input
                        className="bg-input border-border"
                        placeholder="00000-000"
                        maxLength={9}
                        value={rForm.destCep}
                        onChange={e => setRForm(f => ({ ...f, destCep: e.target.value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2") }))}
                        onKeyDown={e => { if (e.key === "Enter") handleCepLookup("dest"); }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border shrink-0"
                        disabled={cepLoading}
                        onClick={() => handleCepLookup("dest")}
                      >
                        {cepLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                      </Button>
                    </div>
                    <Input
                      className="bg-input border-border"
                      placeholder="Endereço de destino (preenchido pelo CEP ou manual)"
                      value={rForm.destAddress}
                      onChange={e => setRForm(f => ({ ...f, destAddress: e.target.value }))}
                    />
                  </div>

                  {/* CALCULAR ROTA */}
                  <Button
                    variant="outline"
                    className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10 font-bold tracking-widest"
                    disabled={calcLoading || !rForm.originAddress || !rForm.destAddress}
                    onClick={handleCalcRoute}
                  >
                    {calcLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> CALCULANDO...</> : <><MapPin className="h-4 w-4 mr-2" /> CALCULAR ROTA AUTOMATICAMENTE</>}
                  </Button>

                  {routeCalc && (
                    <div className="brutal-card p-3 text-sm flex items-center gap-4 text-green-400 font-bold tracking-widest">
                      <span>📍 {routeCalc.distanceKm} km</span>
                      <span>⏱ {Math.floor((rForm.estimatedDuration ?? 0) / 60)}h{(rForm.estimatedDuration ?? 0) % 60}min</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">MOTORISTA</label>
                    <Select onValueChange={v => setRForm(f => ({ ...f, driverId: parseInt(v) }))}>
                      <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {drivers?.filter(d => d.status === "available").map(d => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground tracking-widest">VEÍCULO</label>
                    <Select onValueChange={v => setRForm(f => ({ ...f, vehicleId: parseInt(v) }))}>
                      <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {vehicles?.filter(v => v.status === "available").map(v => <SelectItem key={v.id} value={String(v.id)}>{v.plate} — {vehicleTypes[v.type]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest" disabled={createRoute.isPending}
                    onClick={handleCreateRoute}>
                    {createRoute.isPending ? "CRIANDO..." : "CRIAR ROTA"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* ── Fluxo de status ── */}
          <div className="brutal-card p-4 text-xs text-muted-foreground tracking-widest flex items-center gap-2 flex-wrap">
            <span className="text-blue-400 font-bold">PLANEJADA</span>
            <span>→</span>
            <span className="text-yellow-400 font-bold">EM ANDAMENTO</span>
            <span>→</span>
            <span className="text-green-400 font-bold">CONCLUÍDA</span>
            <span className="ml-4 text-muted-foreground">Ao iniciar, pedidos vinculados passam para EM TRÂNSITO. Ao concluir, passam para ENTREGUE.</span>
          </div>

          <div className="brutal-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">CÓDIGO</th>
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">ORIGEM</th>
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">DESTINO</th>
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">DISTÂNCIA</th>
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
                  <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {loadingR ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50"><td colSpan={6} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td></tr>
                  ))
                ) : !routes?.length ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground tracking-wider">NENHUMA ROTA CADASTRADA</td></tr>
                ) : (
                  routes.map(r => {
                    const isActioning = actioningId === r.id;
                    return (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="p-3 font-bold tracking-wider">{r.routeCode}</td>
                        <td className="p-3 text-muted-foreground text-xs max-w-[160px] truncate">{r.originAddress || "-"}</td>
                        <td className="p-3 text-muted-foreground text-xs max-w-[160px] truncate">{r.destAddress || "-"}</td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">
                          {r.distanceKm ? `${r.distanceKm} km` : "-"}
                          {r.estimatedDuration ? ` · ${Math.floor(r.estimatedDuration / 60)}h${r.estimatedDuration % 60}min` : ""}
                        </td>
                        <td className="p-3">
                          <span className={`badge-status ${routeStatusColors[r.status]}`}>{routeStatusLabels[r.status]}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            {r.status === "planned" && (
                              <>
                                <Button size="sm" disabled={isActioning}
                                  className="h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-widest"
                                  onClick={() => handleRouteAction(r.id, "start")} title="Iniciar rota">
                                  <Play className="h-3 w-3 mr-1" />{isActioning ? "..." : "INICIAR"}
                                </Button>
                                <Button size="sm" variant="outline" disabled={isActioning}
                                  className="h-7 px-2 border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-bold tracking-widest"
                                  onClick={() => handleRouteAction(r.id, "cancel")} title="Cancelar rota">
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {r.status === "in_progress" && (
                              <>
                                <Button size="sm" disabled={isActioning}
                                  className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold tracking-widest"
                                  onClick={() => handleRouteAction(r.id, "complete")} title="Concluir rota">
                                  <CheckCircle className="h-3 w-3 mr-1" />{isActioning ? "..." : "CONCLUIR"}
                                </Button>
                                <Button size="sm" variant="outline" disabled={isActioning}
                                  className="h-7 px-2 border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-bold tracking-widest"
                                  onClick={() => handleRouteAction(r.id, "cancel")} title="Cancelar rota">
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {(r.status === "completed" || r.status === "cancelled") && (
                              <span className="text-xs text-muted-foreground tracking-widest">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
