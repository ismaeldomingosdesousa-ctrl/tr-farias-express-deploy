import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileCheck, FileX, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const typeLabels: Record<string, string> = { cte: "CT-e", mdfe: "MDF-e", nfe: "NF-e" };
const statusLabels: Record<string, string> = { draft: "RASCUNHO", authorized: "AUTORIZADO", cancelled: "CANCELADO", rejected: "REJEITADO", corrected: "CORRIGIDO" };
const statusColors: Record<string, string> = {
  draft: "text-yellow-400 border-yellow-400/50", authorized: "text-green-400 border-green-400/50",
  cancelled: "text-muted-foreground border-muted", rejected: "text-primary border-primary/50",
  corrected: "text-blue-400 border-blue-400/50",
};

export default function Fiscal() {
  const [createOpen, setCreateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const utils = trpc.useUtils();

  const { data: docs, isLoading } = trpc.fiscal.list.useQuery(
    typeFilter !== "all" ? { type: typeFilter } : undefined
  );
  const createDoc = trpc.fiscal.create.useMutation({
    onSuccess: () => { utils.fiscal.list.invalidate(); setCreateOpen(false); toast.success("Documento criado"); },
  });
  const authorizeDoc = trpc.fiscal.authorize.useMutation({
    onSuccess: (data) => { utils.fiscal.list.invalidate(); toast.success(`Autorizado: ${data.protocol}`); },
    onError: (err) => toast.error(err.message),
  });
  const cancelDoc = trpc.fiscal.cancel.useMutation({
    onSuccess: () => { utils.fiscal.list.invalidate(); toast.success("Documento cancelado"); },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({ type: "cte" as const, totalValue: 0, notes: "" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-foreground">DOCUMENTOS FISCAIS</h1>
          <div className="brutal-divider mt-2" />
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-bold tracking-widest"><Plus className="h-4 w-4 mr-2" /> NOVO DOCUMENTO</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="text-xl font-bold tracking-widest">NOVO DOCUMENTO FISCAL</DialogTitle></DialogHeader>
            <div className="brutal-divider my-2" />
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground tracking-widest">TIPO</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="cte">CT-e (Conhecimento de Transporte)</SelectItem>
                    <SelectItem value="mdfe">MDF-e (Manifesto de Documentos)</SelectItem>
                    <SelectItem value="nfe">NF-e (Nota Fiscal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-muted-foreground tracking-widest">VALOR TOTAL (R$)</label><Input type="number" className="bg-input border-border" value={form.totalValue || ""} onChange={e => setForm(f => ({ ...f, totalValue: parseFloat(e.target.value) || 0 }))} /></div>
              <div><label className="text-xs text-muted-foreground tracking-widest">OBSERVAÇÕES</label><Input className="bg-input border-border" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
              <Button className="w-full bg-primary text-primary-foreground font-bold tracking-widest" disabled={createDoc.isPending}
                onClick={() => createDoc.mutate(form)}>
                {createDoc.isPending ? "EMITINDO..." : "EMITIR DOCUMENTO"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="brutal-stat flex items-center gap-4">
          <div className="p-2 bg-green-400/10"><FileCheck className="h-5 w-5 text-green-400" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{docs?.filter(d => d.status === "authorized").length ?? 0}</p>
            <p className="text-xs text-muted-foreground tracking-widest">AUTORIZADOS</p>
          </div>
        </div>
        <div className="brutal-stat flex items-center gap-4">
          <div className="p-2 bg-yellow-400/10"><Shield className="h-5 w-5 text-yellow-400" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{docs?.filter(d => d.status === "draft").length ?? 0}</p>
            <p className="text-xs text-muted-foreground tracking-widest">RASCUNHOS</p>
          </div>
        </div>
        <div className="brutal-stat flex items-center gap-4">
          <div className="p-2 bg-primary/10"><FileX className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{docs?.filter(d => d.status === "cancelled").length ?? 0}</p>
            <p className="text-xs text-muted-foreground tracking-widest">CANCELADOS</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <Select value={typeFilter} onValueChange={setTypeFilter}>
        <SelectTrigger className="w-48 bg-input border-border"><SelectValue /></SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="all">TODOS</SelectItem>
          <SelectItem value="cte">CT-e</SelectItem>
          <SelectItem value="mdfe">MDF-e</SelectItem>
          <SelectItem value="nfe">NF-e</SelectItem>
        </SelectContent>
      </Select>

      {/* Table */}
      <div className="brutal-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">NÚMERO</th>
            <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">TIPO</th>
            <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">SÉRIE</th>
            <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">VALOR</th>
            <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
            <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden lg:table-cell">PROTOCOLO</th>
            <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">DATA</th>
            <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">AÇÕES</th>
          </tr></thead>
          <tbody>
            {isLoading ? Array.from({ length: 3 }).map((_, i) => <tr key={i} className="border-b border-border/50"><td colSpan={8} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td></tr>) :
              !docs?.length ? <tr><td colSpan={8} className="p-8 text-center text-muted-foreground tracking-wider">NENHUM DOCUMENTO</td></tr> :
              docs.map(d => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="p-3 font-bold tracking-wider text-xs">{d.number}</td>
                  <td className="p-3"><span className="text-xs font-bold tracking-widest text-primary">{typeLabels[d.type]}</span></td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{d.series}</td>
                  <td className="p-3 text-right font-bold">{d.totalValue ? `R$ ${d.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}</td>
                  <td className="p-3"><span className={`badge-status ${statusColors[d.status]}`}>{statusLabels[d.status]}</span></td>
                  <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell truncate max-w-[150px]">{d.sefazProtocol || "-"}</td>
                  <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">{d.issueDate ? new Date(d.issueDate).toLocaleDateString("pt-BR") : "-"}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {d.status === "draft" && (
                        <Button size="sm" variant="outline" className="text-xs tracking-wider border-border h-7"
                          disabled={authorizeDoc.isPending}
                          onClick={() => authorizeDoc.mutate({ id: d.id })}>
                          AUTORIZAR
                        </Button>
                      )}
                      {d.status !== "cancelled" && (
                        <Button size="sm" variant="outline" className="text-xs tracking-wider border-primary/50 text-primary h-7"
                          disabled={cancelDoc.isPending}
                          onClick={() => cancelDoc.mutate({ id: d.id })}>
                          CANCELAR
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
