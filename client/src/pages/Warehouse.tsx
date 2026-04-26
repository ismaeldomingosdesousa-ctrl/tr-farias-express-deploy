import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Warehouse, Package, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function WarehousePage() {
  const [whOpen, setWhOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: warehouses, isLoading: loadingWh } = trpc.warehouse.list.useQuery();
  const { data: inventoryItems, isLoading: loadingInv } = trpc.warehouse.inventoryList.useQuery();
  const { data: movements, isLoading: loadingMov } = trpc.warehouse.movementsList.useQuery();

  const createWh = trpc.warehouse.create.useMutation({ onSuccess: () => { utils.warehouse.list.invalidate(); setWhOpen(false); toast.success("Armazém criado"); } });
  const createInv = trpc.warehouse.inventoryCreate.useMutation({ onSuccess: () => { utils.warehouse.inventoryList.invalidate(); setInvOpen(false); toast.success("Item cadastrado"); } });
  const createMov = trpc.warehouse.movementCreate.useMutation({ onSuccess: () => { utils.warehouse.movementsList.invalidate(); utils.warehouse.inventoryList.invalidate(); setMovOpen(false); toast.success("Movimentação registrada"); } });

  const [whForm, setWhForm] = useState({ name: "", code: "", city: "", state: "", totalCapacityM3: 0 });
  const [invForm, setInvForm] = useState({ sku: "", productName: "", warehouseId: 0, location: "", availableQty: 0, minQty: 0 });
  const [movForm, setMovForm] = useState({ inventoryId: 0, warehouseId: 0, type: "inbound" as const, quantity: 0, notes: "" });

  const movTypes: Record<string, string> = { inbound: "ENTRADA", outbound: "SAÍDA", transfer: "TRANSFERÊNCIA", adjustment: "AJUSTE", picking: "PICKING", packing: "PACKING" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-widest text-foreground">ARMAZÉM (WMS)</h1>
        <div className="brutal-divider mt-2" />
      </div>

      <Tabs defaultValue="warehouses">
        <TabsList className="bg-muted border border-border">
          <TabsTrigger value="warehouses" className="tracking-widest text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Warehouse className="h-3 w-3 mr-1" /> ARMAZÉNS
          </TabsTrigger>
          <TabsTrigger value="inventory" className="tracking-widest text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Package className="h-3 w-3 mr-1" /> ESTOQUE
          </TabsTrigger>
          <TabsTrigger value="movements" className="tracking-widest text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ArrowUpDown className="h-3 w-3 mr-1" /> MOVIMENTAÇÕES
          </TabsTrigger>
        </TabsList>

        <TabsContent value="warehouses" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={whOpen} onOpenChange={setWhOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground font-bold tracking-widest"><Plus className="h-4 w-4 mr-2" /> NOVO ARMAZÉM</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-xl font-bold tracking-widest">NOVO ARMAZÉM</DialogTitle></DialogHeader>
                <div className="brutal-divider my-2" />
                <div className="space-y-3">
                  <div><label className="text-xs text-muted-foreground tracking-widest">NOME</label><Input className="bg-input border-border" value={whForm.name} onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground tracking-widest">CÓDIGO</label><Input className="bg-input border-border" value={whForm.code} onChange={e => setWhForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} /></div>
                    <div><label className="text-xs text-muted-foreground tracking-widest">CIDADE</label><Input className="bg-input border-border" value={whForm.city} onChange={e => setWhForm(f => ({ ...f, city: e.target.value }))} /></div>
                    <div><label className="text-xs text-muted-foreground tracking-widest">UF</label><Input className="bg-input border-border" maxLength={2} value={whForm.state} onChange={e => setWhForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} /></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">CAPACIDADE (M³)</label><Input type="number" className="bg-input border-border" value={whForm.totalCapacityM3 || ""} onChange={e => setWhForm(f => ({ ...f, totalCapacityM3: parseFloat(e.target.value) || 0 }))} /></div>
                  <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest" disabled={!whForm.name || !whForm.code || createWh.isPending} onClick={() => createWh.mutate(whForm)}>
                    {createWh.isPending ? "CRIANDO..." : "CRIAR ARMAZÉM"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingWh ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="brutal-card animate-pulse h-32" />) :
              !warehouses?.length ? <div className="col-span-full text-center text-muted-foreground tracking-wider p-8">NENHUM ARMAZÉM CADASTRADO</div> :
              warehouses.map(w => (
                <div key={w.id} className="brutal-card">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold tracking-widest text-foreground">{w.name}</h3>
                      <p className="text-xs text-muted-foreground tracking-wider">{w.code} - {w.city}/{w.state}</p>
                    </div>
                    <span className={`badge-status ${w.status === "active" ? "text-green-400 border-green-400/50" : "text-muted-foreground border-muted"}`}>
                      {w.status === "active" ? "ATIVO" : "INATIVO"}
                    </span>
                  </div>
                  {w.totalCapacityM3 ? (
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground tracking-wider mb-1">
                        <span>OCUPAÇÃO</span>
                        <span>{Math.round(((w.usedCapacityM3 || 0) / w.totalCapacityM3) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-muted">
                        <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, ((w.usedCapacityM3 || 0) / w.totalCapacityM3) * 100)}%` }} />
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={invOpen} onOpenChange={setInvOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground font-bold tracking-widest"><Plus className="h-4 w-4 mr-2" /> NOVO ITEM</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-xl font-bold tracking-widest">NOVO ITEM DE ESTOQUE</DialogTitle></DialogHeader>
                <div className="brutal-divider my-2" />
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground tracking-widest">SKU</label><Input className="bg-input border-border" value={invForm.sku} onChange={e => setInvForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))} /></div>
                    <div><label className="text-xs text-muted-foreground tracking-widest">ARMAZÉM</label>
                      <Select onValueChange={v => setInvForm(f => ({ ...f, warehouseId: parseInt(v) }))}>
                        <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="bg-popover border-border">{warehouses?.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">PRODUTO</label><Input className="bg-input border-border" value={invForm.productName} onChange={e => setInvForm(f => ({ ...f, productName: e.target.value }))} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="text-xs text-muted-foreground tracking-widest">ENDEREÇO</label><Input className="bg-input border-border" value={invForm.location} onChange={e => setInvForm(f => ({ ...f, location: e.target.value }))} /></div>
                    <div><label className="text-xs text-muted-foreground tracking-widest">QTD INICIAL</label><Input type="number" className="bg-input border-border" value={invForm.availableQty || ""} onChange={e => setInvForm(f => ({ ...f, availableQty: parseInt(e.target.value) || 0 }))} /></div>
                    <div><label className="text-xs text-muted-foreground tracking-widest">QTD MÍNIMA</label><Input type="number" className="bg-input border-border" value={invForm.minQty || ""} onChange={e => setInvForm(f => ({ ...f, minQty: parseInt(e.target.value) || 0 }))} /></div>
                  </div>
                  <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest" disabled={!invForm.sku || !invForm.productName || !invForm.warehouseId || createInv.isPending}
                    onClick={() => createInv.mutate(invForm)}>
                    {createInv.isPending ? "CADASTRANDO..." : "CADASTRAR ITEM"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="brutal-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">SKU</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">PRODUTO</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">ENDEREÇO</th>
                <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">DISPONÍVEL</th>
                <th className="text-right p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">RESERVADO</th>
                <th className="text-right p-3 text-xs text-muted-foreground tracking-widest hidden lg:table-cell">MÍNIMO</th>
              </tr></thead>
              <tbody>
                {loadingInv ? Array.from({ length: 3 }).map((_, i) => <tr key={i} className="border-b border-border/50"><td colSpan={6} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td></tr>) :
                  !inventoryItems?.length ? <tr><td colSpan={6} className="p-8 text-center text-muted-foreground tracking-wider">NENHUM ITEM NO ESTOQUE</td></tr> :
                  inventoryItems.map(item => (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-3 font-bold tracking-wider">{item.sku}</td>
                      <td className="p-3 text-muted-foreground">{item.productName}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{item.location || "-"}</td>
                      <td className={`p-3 text-right font-bold ${item.minQty && item.availableQty <= item.minQty ? "text-primary" : "text-foreground"}`}>{item.availableQty}</td>
                      <td className="p-3 text-right text-muted-foreground hidden md:table-cell">{item.reservedQty}</td>
                      <td className="p-3 text-right text-muted-foreground hidden lg:table-cell">{item.minQty || "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Dialog open={movOpen} onOpenChange={setMovOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground font-bold tracking-widest"><Plus className="h-4 w-4 mr-2" /> NOVA MOVIMENTAÇÃO</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="text-xl font-bold tracking-widest">NOVA MOVIMENTAÇÃO</DialogTitle></DialogHeader>
                <div className="brutal-divider my-2" />
                <div className="space-y-3">
                  <div><label className="text-xs text-muted-foreground tracking-widest">ITEM</label>
                    <Select onValueChange={v => { const item = inventoryItems?.find(i => i.id === parseInt(v)); setMovForm(f => ({ ...f, inventoryId: parseInt(v), warehouseId: item?.warehouseId || 0 })); }}>
                      <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent className="bg-popover border-border">{inventoryItems?.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.sku} - {i.productName}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground tracking-widest">TIPO</label>
                      <Select value={movForm.type} onValueChange={v => setMovForm(f => ({ ...f, type: v as any }))}>
                        <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-popover border-border">{Object.entries(movTypes).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><label className="text-xs text-muted-foreground tracking-widest">QUANTIDADE</label><Input type="number" className="bg-input border-border" value={movForm.quantity || ""} onChange={e => setMovForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} /></div>
                  </div>
                  <div><label className="text-xs text-muted-foreground tracking-widest">OBSERVAÇÕES</label><Input className="bg-input border-border" value={movForm.notes} onChange={e => setMovForm(f => ({ ...f, notes: e.target.value }))} /></div>
                  <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest" disabled={!movForm.inventoryId || !movForm.quantity || createMov.isPending}
                    onClick={() => createMov.mutate(movForm)}>
                    {createMov.isPending ? "REGISTRANDO..." : "REGISTRAR MOVIMENTAÇÃO"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="brutal-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">DATA</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">TIPO</th>
                <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">QTD</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">REFERÊNCIA</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">NOTAS</th>
              </tr></thead>
              <tbody>
                {loadingMov ? Array.from({ length: 3 }).map((_, i) => <tr key={i} className="border-b border-border/50"><td colSpan={5} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td></tr>) :
                  !movements?.length ? <tr><td colSpan={5} className="p-8 text-center text-muted-foreground tracking-wider">NENHUMA MOVIMENTAÇÃO</td></tr> :
                  movements.map(m => (
                    <tr key={m.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-3 text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString("pt-BR")}</td>
                      <td className="p-3"><span className={`badge-status ${["inbound", "adjustment"].includes(m.type) ? "text-green-400 border-green-400/50" : "text-primary border-primary/50"}`}>{movTypes[m.type] || m.type}</span></td>
                      <td className="p-3 text-right font-bold">{m.quantity}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{m.reference || "-"}</td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell">{m.notes || "-"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
