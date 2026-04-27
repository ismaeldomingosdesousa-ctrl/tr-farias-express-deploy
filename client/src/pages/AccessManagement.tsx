import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Link2, Trash2, CheckCircle2, XCircle, DollarSign, Copy, Users, Key } from "lucide-react";

type Tab = "tokens" | "advances" | "pins";

export default function AccessManagement() {
  const [tab, setTab] = useState<Tab>("tokens");

  // Token creation
  const [selectedClientId, setSelectedClientId] = useState("");
  const [tokenLabel, setTokenLabel] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);

  // PIN management
  const [pinDriverId, setPinDriverId] = useState("");
  const [pin, setPin] = useState("");

  const utils = trpc.useUtils();

  const { data: clients } = trpc.clients.list.useQuery();
  const { data: tokens, isLoading: tokensLoading } = trpc.clientPortal.listTokens.useQuery();
  const { data: advances, isLoading: advancesLoading } = trpc.driverApp.listAdvances.useQuery({});
  const { data: drivers } = trpc.drivers.list.useQuery();

  const createTokenMut = trpc.clientPortal.createToken.useMutation({
    onSuccess: (data) => {
      setNewToken(data.token);
      setSelectedClientId("");
      setTokenLabel("");
      setExpiryDays("");
      utils.clientPortal.listTokens.invalidate();
      toast.success("Token criado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeTokenMut = trpc.clientPortal.revokeToken.useMutation({
    onSuccess: () => { utils.clientPortal.listTokens.invalidate(); toast.success("Token revogado"); },
    onError: (e) => toast.error(e.message),
  });

  const reviewAdvanceMut = trpc.driverApp.reviewAdvance.useMutation({
    onSuccess: () => { utils.driverApp.listAdvances.invalidate(); toast.success("Adiantamento atualizado!"); },
    onError: (e) => toast.error(e.message),
  });

  const markPaidMut = trpc.driverApp.markAdvancePaid.useMutation({
    onSuccess: () => { utils.driverApp.listAdvances.invalidate(); toast.success("Marcado como pago!"); },
    onError: (e) => toast.error(e.message),
  });

  const setPinMut = trpc.driverApp.setDriverPin.useMutation({
    onSuccess: () => { setPinDriverId(""); setPin(""); toast.success("PIN definido com sucesso!"); },
    onError: (e) => toast.error(e.message),
  });

  const portalUrl = (token: string) =>
    `${window.location.origin}/track?token=${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(portalUrl(token));
    toast.success("Link copiado!");
  };

  const pendingAdvances = advances?.filter(a => a.advance.status === "pending") ?? [];
  const allAdvances = advances ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-widest text-foreground">GESTÃO DE ACESSOS</h1>
        <div className="brutal-divider mt-2" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { key: "tokens" as Tab, label: "PORTAL CLIENTE", icon: Key, badge: 0 },
          { key: "advances" as Tab, label: "ADIANTAMENTOS", icon: DollarSign, badge: pendingAdvances.length },
          { key: "pins" as Tab, label: "PINs MOTORISTAS", icon: Users, badge: 0 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black tracking-widest rounded-md transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.badge > 0 && (
              <span className="bg-primary text-primary-foreground text-xs font-black rounded-full w-4 h-4 flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CLIENT PORTAL TOKENS */}
      {tab === "tokens" && (
        <div className="space-y-4">
          {/* Create token form */}
          <div className="brutal-card p-5 space-y-4">
            <p className="text-xs text-muted-foreground tracking-widest">GERAR LINK DE ACESSO PARA CLIENTE</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {clients?.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="bg-input border-border"
                placeholder="Rótulo (ex: Acesso Março)"
                value={tokenLabel}
                onChange={e => setTokenLabel(e.target.value)}
              />
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Validade" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                  <SelectItem value="0">Sem expiração</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 font-black tracking-widest"
              disabled={!selectedClientId || createTokenMut.isPending}
              onClick={() => createTokenMut.mutate({
                clientId: parseInt(selectedClientId),
                label: tokenLabel || undefined,
                expiresInDays: expiryDays && expiryDays !== "0" ? parseInt(expiryDays) : undefined,
              })}
            >
              {createTokenMut.isPending ? "GERANDO..." : "GERAR LINK"}
            </Button>

            {newToken && (
              <div className="bg-green-500/10 border border-green-500/30 rounded p-3 space-y-2">
                <p className="text-xs text-green-400 font-bold tracking-widest">LINK GERADO — COPIE E ENVIE AO CLIENTE</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-foreground bg-input rounded px-2 py-1 flex-1 truncate">
                    {portalUrl(newToken)}
                  </code>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => copyLink(newToken)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tokens list */}
          <div className="space-y-2">
            {tokensLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse h-16 brutal-card" />
              ))
            ) : !tokens?.length ? (
              <p className="text-muted-foreground text-center py-8 tracking-wider">NENHUM TOKEN GERADO</p>
            ) : (
              tokens.map(t => (
                <div key={t.token.id} className={`brutal-card flex items-center justify-between ${!t.token.isActive ? "opacity-50" : ""}`}>
                  <div>
                    <p className="font-bold text-sm">{t.clientName}</p>
                    <p className="text-xs text-muted-foreground">{t.token.label}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {t.token.expiresAt ? `Expira: ${new Date(t.token.expiresAt).toLocaleDateString("pt-BR")}` : "Sem expiração"}
                      {t.token.lastUsedAt && ` · Último uso: ${new Date(t.token.lastUsedAt).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.token.isActive && (
                      <Button size="sm" variant="outline" className="border-border text-muted-foreground h-8"
                        onClick={() => copyLink(t.token.token)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                    {t.token.isActive && (
                      <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 h-8"
                        onClick={() => revokeTokenMut.mutate({ id: t.token.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                    {!t.token.isActive && (
                      <span className="text-xs text-muted-foreground tracking-widest">REVOGADO</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADVANCES */}
      {tab === "advances" && (
        <div className="space-y-3">
          {advancesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-24 brutal-card" />
            ))
          ) : !allAdvances.length ? (
            <p className="text-muted-foreground text-center py-8 tracking-wider">NENHUM ADIANTAMENTO</p>
          ) : (
            allAdvances.map(({ advance, driverName, driverCpf }) => (
              <div key={advance.id} className={`brutal-card space-y-3 ${
                advance.status === "pending" ? "border-primary/50" : ""
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black tracking-widest text-sm">{driverName}</p>
                    <p className="text-xs text-muted-foreground">{driverCpf}</p>
                    <p className="text-lg font-black mt-1">
                      R$ {advance.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{advance.reason}</p>
                    <p className="text-xs text-muted-foreground/60">{new Date(advance.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                  <span className={`text-xs font-black tracking-widest ${
                    advance.status === "pending" ? "text-yellow-400" :
                    advance.status === "approved" ? "text-green-400" :
                    advance.status === "paid" ? "text-blue-400" : "text-red-400"
                  }`}>
                    {advance.status === "pending" ? "PENDENTE" :
                     advance.status === "approved" ? "APROVADO" :
                     advance.status === "paid" ? "PAGO" : "REJEITADO"}
                  </span>
                </div>

                {advance.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 font-black tracking-widest text-xs h-8"
                      disabled={reviewAdvanceMut.isPending}
                      onClick={() => reviewAdvanceMut.mutate({ id: advance.id, status: "approved" })}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" /> APROVAR
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-400 font-black tracking-widest text-xs h-8"
                      disabled={reviewAdvanceMut.isPending}
                      onClick={() => reviewAdvanceMut.mutate({ id: advance.id, status: "rejected", reviewNote: "Solicitação não aprovada" })}
                    >
                      <XCircle className="h-3 w-3 mr-1" /> REJEITAR
                    </Button>
                  </div>
                )}

                {advance.status === "approved" && (
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 font-black tracking-widest text-xs h-8"
                    disabled={markPaidMut.isPending}
                    onClick={() => markPaidMut.mutate({ id: advance.id })}
                  >
                    <DollarSign className="h-3 w-3 mr-1" /> MARCAR COMO PAGO
                  </Button>
                )}

                {advance.reviewNote && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-2">Nota: {advance.reviewNote}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* PINs */}
      {tab === "pins" && (
        <div className="space-y-4">
          <div className="brutal-card space-y-4">
            <p className="text-xs text-muted-foreground tracking-widest">DEFINIR PIN DE ACESSO DO MOTORISTA</p>
            <p className="text-xs text-muted-foreground/60">O PIN é usado pelo motorista para acessar o app. Use 6 dígitos numéricos.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={pinDriverId} onValueChange={setPinDriverId}>
                <SelectTrigger className="bg-input border-border">
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {drivers?.map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name} — {d.cpf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="bg-input border-border tracking-widest text-center text-xl"
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
              <Button
                className="bg-primary hover:bg-primary/90 font-black tracking-widest"
                disabled={!pinDriverId || pin.length !== 6 || setPinMut.isPending}
                onClick={() => setPinMut.mutate({ driverId: parseInt(pinDriverId), pin })}
              >
                {setPinMut.isPending ? "SALVANDO..." : "DEFINIR PIN"}
              </Button>
            </div>
          </div>

          <div className="brutal-card border-primary/20 text-xs text-yellow-400/70 tracking-wider space-y-1">
            <p className="font-bold">INSTRUÇÕES PARA O MOTORISTA:</p>
            <p>1. Acesse <span className="text-foreground">{window.location.origin}/driver</span> pelo celular</p>
            <p>2. Clique em "Adicionar à tela inicial" no Chrome para instalar como app</p>
            <p>3. Entre com CPF e o PIN definido acima</p>
          </div>
        </div>
      )}
    </div>
  );
}
