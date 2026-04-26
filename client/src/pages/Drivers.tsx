import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Star, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { available: "DISPONÍVEL", on_trip: "EM VIAGEM", inactive: "INATIVO", suspended: "SUSPENSO" };
const statusColors: Record<string, string> = {
  available: "text-green-400 border-green-400/50", on_trip: "text-primary border-primary/50",
  inactive: "text-muted-foreground border-muted", suspended: "text-yellow-400 border-yellow-400/50",
};

export default function Drivers() {
  const [createOpen, setCreateOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: drivers, isLoading } = trpc.drivers.list.useQuery();
  const createDriver = trpc.drivers.create.useMutation({
    onSuccess: () => { utils.drivers.list.invalidate(); setCreateOpen(false); toast.success("Motorista cadastrado"); },
  });
  const updateDriver = trpc.drivers.update.useMutation({
    onSuccess: () => { utils.drivers.list.invalidate(); toast.success("Status atualizado"); },
  });

  const [form, setForm] = useState({ name: "", cpf: "", cnh: "", cnhCategory: "", phone: "", email: "", city: "", state: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-foreground">MOTORISTAS</h1>
          <div className="brutal-divider mt-2" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-bold tracking-widest"><Plus className="h-4 w-4 mr-2" /> NOVO MOTORISTA</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle className="text-xl font-bold tracking-widest">NOVO MOTORISTA</DialogTitle></DialogHeader>
            <div className="brutal-divider my-2" />
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground tracking-widest">NOME COMPLETO</label><Input className="bg-input border-border" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground tracking-widest">CPF</label><Input className="bg-input border-border" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground tracking-widest">CNH</label><Input className="bg-input border-border" value={form.cnh} onChange={e => setForm(f => ({ ...f, cnh: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground tracking-widest">CATEGORIA CNH</label>
                  <Select value={form.cnhCategory} onValueChange={v => setForm(f => ({ ...f, cnhCategory: v }))}>
                    <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem>
                      <SelectItem value="E">E</SelectItem><SelectItem value="AB">AB</SelectItem>
                      <SelectItem value="AC">AC</SelectItem><SelectItem value="AD">AD</SelectItem>
                      <SelectItem value="AE">AE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs text-muted-foreground tracking-widest">TELEFONE</label><Input className="bg-input border-border" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs text-muted-foreground tracking-widest">EMAIL</label><Input className="bg-input border-border" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground tracking-widest">CIDADE</label><Input className="bg-input border-border" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
                <div><label className="text-xs text-muted-foreground tracking-widest">UF</label><Input className="bg-input border-border" maxLength={2} value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} /></div>
              </div>
              <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest" disabled={!form.name || !form.cpf || !form.cnh || createDriver.isPending}
                onClick={() => createDriver.mutate(form)}>
                {createDriver.isPending ? "CADASTRANDO..." : "CADASTRAR MOTORISTA"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="brutal-card animate-pulse h-40" />) :
          !drivers?.length ? <div className="col-span-full text-center text-muted-foreground tracking-wider p-8">NENHUM MOTORISTA CADASTRADO</div> :
          drivers.map(d => (
            <div key={d.id} className="brutal-card space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold tracking-widest text-foreground text-lg">{d.name}</h3>
                  <p className="text-xs text-muted-foreground tracking-wider">CNH: {d.cnh} ({d.cnhCategory || "-"})</p>
                </div>
                <span className={`badge-status ${statusColors[d.status]}`}>{statusLabels[d.status]}</span>
              </div>
              <div className="brutal-divider" />
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" /> {d.phone || "-"}</div>
                <div className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" /> {d.email || "-"}</div>
                <div className="flex items-center gap-1 text-muted-foreground"><Star className="h-3 w-3 text-yellow-400" /> {d.rating?.toFixed(1) || "5.0"}</div>
                <div className="text-muted-foreground">{d.totalTrips || 0} viagens</div>
              </div>
              <div className="flex gap-2">
                {d.status === "available" && (
                  <Button size="sm" variant="outline" className="text-xs tracking-wider border-border flex-1 h-7"
                    onClick={() => updateDriver.mutate({ id: d.id, status: "on_trip" })}>EM VIAGEM</Button>
                )}
                {d.status === "on_trip" && (
                  <Button size="sm" variant="outline" className="text-xs tracking-wider border-border flex-1 h-7"
                    onClick={() => updateDriver.mutate({ id: d.id, status: "available" })}>DISPONÍVEL</Button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
