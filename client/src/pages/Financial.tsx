import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, DollarSign, CheckCircle2, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  pending: "PENDENTE",
  paid: "PAGO",
  overdue: "VENCIDO",
  cancelled: "CANCELADO",
};
const statusColors: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/50",
  paid: "text-green-400 border-green-400/50",
  overdue: "text-primary border-primary/50",
  cancelled: "text-muted-foreground border-muted",
};

const categories = [
  { value: "frete", label: "FRETE" },
  { value: "combustivel", label: "COMBUSTÍVEL" },
  { value: "manutencao", label: "MANUTENÇÃO" },
  { value: "pedagio", label: "PEDÁGIO" },
  { value: "salario", label: "SALÁRIO" },
  { value: "seguro", label: "SEGURO" },
  { value: "imposto", label: "IMPOSTO" },
  { value: "adiantamento", label: "ADIANTAMENTO MOTORISTA" },
  { value: "aluguel", label: "ALUGUEL" },
  { value: "outros", label: "OUTROS" },
];

const emptyForm = {
  type: "receivable" as "receivable" | "payable",
  category: "",
  description: "",
  amount: 0,
  dueDate: "",
  referenceId: "" as string | undefined,
};

const advanceStatusLabels: Record<string, string> = {
  pending: "PENDENTE",
  approved: "APROVADO",
  rejected: "REJEITADO",
  paid: "PAGO",
};
const advanceStatusColors: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/50",
  approved: "text-blue-400 border-blue-400/50",
  rejected: "text-red-400 border-red-400/50",
  paid: "text-green-400 border-green-400/50",
};

export default function Financial() {
  const [createOpen, setCreateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const utils = trpc.useUtils();

  const { data: advances, isLoading: advancesLoading } = trpc.driverApp.listAdvances.useQuery();
  const reviewAdvance = trpc.driverApp.reviewAdvance.useMutation({
    onSuccess: () => { utils.driverApp.listAdvances.invalidate(); utils.financial.list.invalidate(); },
    onError: (err) => toast.error(err.message),
  });
  const markAdvancePaid = trpc.driverApp.markAdvancePaid.useMutation({
    onSuccess: () => { utils.driverApp.listAdvances.invalidate(); utils.financial.list.invalidate(); toast.success("Adiantamento marcado como PAGO — lançamento financeiro criado"); },
    onError: (err) => toast.error(err.message),
  });

  const { data: transactions, isLoading } = trpc.financial.list.useQuery(
    typeFilter !== "all" ? { type: typeFilter } : undefined
  );

  const createTx = trpc.financial.create.useMutation({
    onSuccess: () => {
      utils.financial.list.invalidate();
      setCreateOpen(false);
      setForm(emptyForm);
      toast.success("Lançamento registrado com sucesso");
    },
    onError: (err) => toast.error(err.message),
  });

  const markPaid = trpc.financial.markPaid.useMutation({
    onSuccess: () => {
      utils.financial.list.invalidate();
      toast.success("Marcado como PAGO");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState(emptyForm);

  // Computed totals
  const filtered = transactions?.filter(t => statusFilter === "all" || t.status === statusFilter) ?? [];
  const totalReceivable = transactions?.filter(t => t.type === "receivable" && t.status === "pending").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalPayable = transactions?.filter(t => t.type === "payable" && t.status === "pending").reduce((s, t) => s + t.amount, 0) ?? 0;
  const totalPaid = transactions?.filter(t => t.status === "paid").reduce((s, t) => s + (t.type === "receivable" ? t.amount : -t.amount), 0) ?? 0;

  const overdueCount = transactions?.filter(t => t.status === "pending" && new Date(t.dueDate) < new Date()).length ?? 0;

  const pendingAdvances = advances?.filter(a => a.advance.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-foreground">FINANCEIRO</h1>
          <div className="brutal-divider mt-2" />
          <p className="text-xs text-muted-foreground tracking-wider mt-1">
            REGISTRO MANUAL DE LANÇAMENTOS — CONTAS A PAGAR E RECEBER
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-bold tracking-widest">
              <Plus className="h-4 w-4 mr-2" /> NOVO LANÇAMENTO
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-widest">NOVO LANÇAMENTO</DialogTitle>
            </DialogHeader>
            <div className="brutal-divider my-2" />
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">TIPO</label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="receivable">A RECEBER (RECEITA)</SelectItem>
                    <SelectItem value="payable">A PAGAR (DESPESA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">CATEGORIA</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">DESCRIÇÃO</label>
                <Input className="bg-input border-border" placeholder="Ex: Frete SP→RJ - Cliente ABC" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest">VALOR (R$)</label>
                  <Input type="number" min="0" step="0.01" className="bg-input border-border" placeholder="0,00" value={form.amount || ""} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground tracking-widest">VENCIMENTO</label>
                  <Input type="date" className="bg-input border-border" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground tracking-widest">Nº PEDIDO / REFERÊNCIA (opcional)</label>
                <Input className="bg-input border-border" placeholder="Ex: ORD-ABC12345" value={form.referenceId || ""} onChange={e => setForm(f => ({ ...f, referenceId: e.target.value || undefined }))} />
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground font-bold tracking-widest"
                disabled={!form.category || !form.amount || !form.dueDate || createTx.isPending}
                onClick={() => createTx.mutate({ ...form, dueDate: new Date(form.dueDate) })}>
                {createTx.isPending ? "REGISTRANDO..." : "REGISTRAR LANÇAMENTO"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="brutal-stat flex items-center gap-3">
          <div className="p-2 bg-green-400/10 shrink-0"><TrendingUp className="h-5 w-5 text-green-400" /></div>
          <div>
            <p className="text-lg font-bold text-foreground">R$ {totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground tracking-widest">A RECEBER</p>
          </div>
        </div>
        <div className="brutal-stat flex items-center gap-3">
          <div className="p-2 bg-primary/10 shrink-0"><TrendingDown className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-lg font-bold text-foreground">R$ {totalPayable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground tracking-widest">A PAGAR</p>
          </div>
        </div>
        <div className="brutal-stat flex items-center gap-3">
          <div className="p-2 bg-muted shrink-0"><DollarSign className="h-5 w-5 text-muted-foreground" /></div>
          <div>
            <p className={`text-lg font-bold ${totalPaid >= 0 ? "text-green-400" : "text-primary"}`}>
              R$ {totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground tracking-widest">SALDO REALIZADO</p>
          </div>
        </div>
        <div className="brutal-stat flex items-center gap-3">
          <div className={`p-2 shrink-0 ${overdueCount > 0 ? "bg-primary/10" : "bg-muted"}`}>
            <TrendingDown className={`h-5 w-5 ${overdueCount > 0 ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className={`text-lg font-bold ${overdueCount > 0 ? "text-primary" : "text-foreground"}`}>{overdueCount}</p>
            <p className="text-xs text-muted-foreground tracking-widest">VENCIDOS</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44 bg-input border-border text-xs tracking-widest"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">TODOS OS TIPOS</SelectItem>
            <SelectItem value="receivable">A RECEBER</SelectItem>
            <SelectItem value="payable">A PAGAR</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-input border-border text-xs tracking-widest"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">TODOS OS STATUS</SelectItem>
            <SelectItem value="pending">PENDENTE</SelectItem>
            <SelectItem value="paid">PAGO</SelectItem>
            <SelectItem value="overdue">VENCIDO</SelectItem>
            <SelectItem value="cancelled">CANCELADO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <div className="brutal-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">TIPO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">CATEGORIA</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">DESCRIÇÃO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden lg:table-cell">REFERÊNCIA</th>
              <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">VALOR</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">VENCIMENTO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
              <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td colSpan={8} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td>
                  </tr>
                ))
              : !filtered.length
              ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground tracking-wider">
                      NENHUM LANÇAMENTO — CLIQUE EM "NOVO LANÇAMENTO" PARA REGISTRAR
                    </td>
                  </tr>
                )
              : filtered.map(t => {
                  const isOverdue = t.status === "pending" && new Date(t.dueDate) < new Date();
                  return (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-3">
                        <span className={`text-xs font-bold tracking-widest ${t.type === "receivable" ? "text-green-400" : "text-primary"}`}>
                          {t.type === "receivable" ? "▲ RECEBER" : "▼ PAGAR"}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground uppercase tracking-wider text-xs">
                        {categories.find(c => c.value === t.category)?.label ?? t.category}
                      </td>
                      <td className="p-3 text-muted-foreground hidden md:table-cell text-xs">{t.description || "—"}</td>
                      <td className="p-3 text-muted-foreground hidden lg:table-cell text-xs font-mono">
                        {(t as any).referenceId || "—"}
                      </td>
                      <td className="p-3 text-right font-bold">
                        <span className={t.type === "receivable" ? "text-green-400" : "text-primary"}>
                          {t.type === "payable" ? "−" : "+"}R$ {t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        <span className={isOverdue ? "text-primary font-bold" : "text-muted-foreground"}>
                          {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                          {isOverdue && <span className="ml-1 text-primary">⚠</span>}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`badge-status ${isOverdue && t.status === "pending" ? "text-primary border-primary/50" : statusColors[t.status]}`}>
                          {isOverdue && t.status === "pending" ? "VENCIDO" : statusLabels[t.status]}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {t.status === "pending" && (
                            <Button size="sm" variant="outline"
                              className="text-xs tracking-wider border-green-400/50 text-green-400 h-7"
                              disabled={markPaid.isPending}
                              onClick={() => markPaid.mutate({ id: t.id })}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> PAGO
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      {filtered.length > 0 && (
        <div className="brutal-card p-3 flex flex-wrap gap-6 text-xs text-muted-foreground tracking-wider">
          <span>{filtered.length} LANÇAMENTO(S)</span>
          <span className="text-green-400 font-bold">
            RECEITAS: R$ {filtered.filter(t => t.type === "receivable").reduce((s, t) => s + t.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-primary font-bold">
            DESPESAS: R$ {filtered.filter(t => t.type === "payable").reduce((s, t) => s + t.amount, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* ── ADIANTAMENTOS DE MOTORISTAS ── */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-widest text-foreground">ADIANTAMENTOS DE MOTORISTAS</h2>
          {pendingAdvances > 0 && (
            <span className="badge-status text-yellow-400 border-yellow-400/50">{pendingAdvances} PENDENTE(S)</span>
          )}
        </div>
        <div className="brutal-divider mb-4" />
        <div className="brutal-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">MOTORISTA</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">PEDIDO / ROTA</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">MOTIVO</th>
                <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">VALOR</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">DATA</th>
                <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
                <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {advancesLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={7} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td>
                    </tr>
                  ))
                : !advances?.length
                ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground tracking-wider">
                        NENHUM ADIANTAMENTO SOLICITADO
                      </td>
                    </tr>
                  )
                : advances.map((row: any) => {
                    const adv = row.advance;
                    return (
                    <tr key={adv.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                      <td className="p-3 font-bold text-xs tracking-wider">{row.driverName ?? `#${adv.driverId}`}</td>
                      <td className="p-3 text-muted-foreground text-xs hidden md:table-cell font-mono">
                        {adv.orderId ? `PED-${adv.orderId}` : adv.routeId ? `RT-${adv.routeId}` : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs hidden md:table-cell">{adv.reason || "—"}</td>
                      <td className="p-3 text-right font-bold text-primary">
                        −R$ {Number(adv.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {new Date(adv.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3">
                        <span className={`badge-status ${advanceStatusColors[adv.status] ?? "text-muted-foreground"}`}>
                          {advanceStatusLabels[adv.status] ?? adv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {adv.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline"
                                className="text-xs tracking-wider border-green-400/50 text-green-400 h-7"
                                disabled={reviewAdvance.isPending}
                                onClick={() => reviewAdvance.mutate({ id: adv.id, status: "approved" })}>
                                APROVAR
                              </Button>
                              <Button size="sm" variant="outline"
                                className="text-xs tracking-wider border-primary/50 text-primary h-7"
                                disabled={reviewAdvance.isPending}
                                onClick={() => reviewAdvance.mutate({ id: adv.id, status: "rejected" })}>
                                REJEITAR
                              </Button>
                            </>
                          )}
                          {adv.status === "approved" && (
                            <Button size="sm" variant="outline"
                              className="text-xs tracking-wider border-blue-400/50 text-blue-400 h-7"
                              disabled={markAdvancePaid.isPending}
                              onClick={() => markAdvancePaid.mutate({ id: adv.id })}>
                              <CheckCircle2 className="h-3 w-3 mr-1" /> MARCAR PAGO
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
