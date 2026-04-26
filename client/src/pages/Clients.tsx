import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Building2, Phone, Mail, MapPin, User, Search, Pencil, Ban, CheckCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { active: "ATIVO", inactive: "INATIVO" };
const statusColors: Record<string, string> = {
  active: "text-green-400 border-green-400/50",
  inactive: "text-muted-foreground border-muted",
};

const emptyForm = { name: "", cnpj: "", email: "", phone: "", address: "", city: "", state: "", zipCode: "", contactPerson: "" };

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCEP(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function Clients() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const utils = trpc.useUtils();

  const { data: clients, isLoading } = trpc.clients.list.useQuery();
  const createClient = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setCreateOpen(false);
      setForm(emptyForm);
      toast.success("Cliente cadastrado com sucesso");
    },
    onError: (err) => toast.error(err.message),
  });
  const updateClient = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setEditOpen(false);
      setEditingClient(null);
      toast.success("Cliente atualizado com sucesso");
    },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter(c => {
      const matchesSearch = !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.cnpj.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
        c.city?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const activeCount = clients?.filter(c => c.status === "active").length ?? 0;
  const inactiveCount = clients?.filter(c => c.status === "inactive").length ?? 0;

  const openEdit = (client: typeof filteredClients[0]) => {
    setEditingClient(client.id);
    setEditForm({
      name: client.name,
      cnpj: client.cnpj,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      zipCode: client.zipCode || "",
      contactPerson: client.contactPerson || "",
    });
    setEditOpen(true);
  };

  const handleCreate = () => {
    if (!form.name.trim() || !form.cnpj.trim()) {
      toast.error("Nome e CNPJ são obrigatórios");
      return;
    }
    createClient.mutate({
      name: form.name.trim(),
      cnpj: form.cnpj.replace(/\D/g, ""),
      email: form.email.trim() || undefined,
      phone: form.phone.replace(/\D/g, "") || undefined,
      address: form.address.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      zipCode: form.zipCode.replace(/\D/g, "") || undefined,
      contactPerson: form.contactPerson.trim() || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingClient) return;
    updateClient.mutate({
      id: editingClient,
      name: editForm.name.trim() || undefined,
      cnpj: editForm.cnpj.replace(/\D/g, "") || undefined,
      email: editForm.email.trim() || undefined,
      phone: editForm.phone.replace(/\D/g, "") || undefined,
      address: editForm.address.trim() || undefined,
      city: editForm.city.trim() || undefined,
      state: editForm.state.trim() || undefined,
      zipCode: editForm.zipCode.replace(/\D/g, "") || undefined,
      contactPerson: editForm.contactPerson.trim() || undefined,
    });
  };

  const toggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    updateClient.mutate({ id, status: newStatus as "active" | "inactive" });
  };

  const renderFormFields = (
    formData: typeof emptyForm,
    setFormData: React.Dispatch<React.SetStateAction<typeof emptyForm>>
  ) => (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground tracking-widest block mb-1">RAZÃO SOCIAL / NOME *</label>
        <Input
          className="bg-input border-border"
          placeholder="Ex: Transportes ABC Ltda"
          value={formData.name}
          onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground tracking-widest block mb-1">CNPJ *</label>
          <Input
            className="bg-input border-border"
            placeholder="00.000.000/0000-00"
            value={formData.cnpj}
            onChange={e => setFormData(f => ({ ...f, cnpj: formatCNPJ(e.target.value) }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-widest block mb-1">PESSOA DE CONTATO</label>
          <Input
            className="bg-input border-border"
            placeholder="Nome do responsável"
            value={formData.contactPerson}
            onChange={e => setFormData(f => ({ ...f, contactPerson: e.target.value }))}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground tracking-widest block mb-1">EMAIL</label>
          <Input
            className="bg-input border-border"
            type="email"
            placeholder="contato@empresa.com"
            value={formData.email}
            onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-widest block mb-1">TELEFONE</label>
          <Input
            className="bg-input border-border"
            placeholder="(00) 00000-0000"
            value={formData.phone}
            onChange={e => setFormData(f => ({ ...f, phone: formatPhone(e.target.value) }))}
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground tracking-widest block mb-1">ENDEREÇO</label>
        <Input
          className="bg-input border-border"
          placeholder="Rua, número, complemento"
          value={formData.address}
          onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground tracking-widest block mb-1">CIDADE</label>
          <Input
            className="bg-input border-border"
            placeholder="São Paulo"
            value={formData.city}
            onChange={e => setFormData(f => ({ ...f, city: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-widest block mb-1">UF</label>
          <Input
            className="bg-input border-border"
            placeholder="SP"
            maxLength={2}
            value={formData.state}
            onChange={e => setFormData(f => ({ ...f, state: e.target.value.toUpperCase() }))}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-widest block mb-1">CEP</label>
          <Input
            className="bg-input border-border"
            placeholder="00000-000"
            value={formData.zipCode}
            onChange={e => setFormData(f => ({ ...f, zipCode: formatCEP(e.target.value) }))}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-widest text-foreground">CLIENTES</h1>
          <div className="brutal-divider mt-2" />
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground font-bold tracking-widest">
              <Plus className="h-4 w-4 mr-2" /> NOVO CLIENTE
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-widest">CADASTRAR CLIENTE</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs tracking-wider">
                Preencha os dados do novo cliente. Campos com * são obrigatórios.
              </DialogDescription>
            </DialogHeader>
            <div className="brutal-divider my-2" />
            {renderFormFields(form, setForm)}
            <Button
              className="w-full bg-primary text-primary-foreground font-bold tracking-widest mt-2"
              disabled={!form.name.trim() || !form.cnpj.trim() || createClient.isPending}
              onClick={handleCreate}
            >
              {createClient.isPending ? "CADASTRANDO..." : "CADASTRAR CLIENTE"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="brutal-stat flex items-center gap-4">
          <div className="p-2 bg-foreground/5"><Building2 className="h-5 w-5 text-foreground" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{clients?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground tracking-widest">TOTAL DE CLIENTES</p>
          </div>
        </div>
        <div className="brutal-stat flex items-center gap-4">
          <div className="p-2 bg-green-400/10"><CheckCircle className="h-5 w-5 text-green-400" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            <p className="text-xs text-muted-foreground tracking-widest">ATIVOS</p>
          </div>
        </div>
        <div className="brutal-stat flex items-center gap-4">
          <div className="p-2 bg-muted/30"><Ban className="h-5 w-5 text-muted-foreground" /></div>
          <div>
            <p className="text-2xl font-bold text-foreground">{inactiveCount}</p>
            <p className="text-xs text-muted-foreground tracking-widest">INATIVOS</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="bg-input border-border pl-10"
            placeholder="Buscar por nome, CNPJ, email, cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            className={`text-xs tracking-wider h-9 ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "border-border"}`}
            onClick={() => setStatusFilter("all")}
          >
            TODOS
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            className={`text-xs tracking-wider h-9 ${statusFilter === "active" ? "bg-green-600 text-white" : "border-border"}`}
            onClick={() => setStatusFilter("active")}
          >
            ATIVOS
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size="sm"
            className={`text-xs tracking-wider h-9 ${statusFilter === "inactive" ? "bg-muted text-muted-foreground" : "border-border"}`}
            onClick={() => setStatusFilter("inactive")}
          >
            INATIVOS
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="brutal-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">EMPRESA</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">CNPJ</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden lg:table-cell">CONTATO</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden md:table-cell">TELEFONE</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest hidden lg:table-cell">CIDADE/UF</th>
              <th className="text-left p-3 text-xs text-muted-foreground tracking-widest">STATUS</th>
              <th className="text-right p-3 text-xs text-muted-foreground tracking-widest">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={7} className="p-3"><div className="h-6 bg-muted animate-pulse" /></td>
                </tr>
              ))
            ) : !filteredClients.length ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground tracking-wider">
                  {search || statusFilter !== "all" ? "NENHUM CLIENTE ENCONTRADO COM OS FILTROS APLICADOS" : "NENHUM CLIENTE CADASTRADO — CLIQUE EM \"NOVO CLIENTE\" PARA COMEÇAR"}
                </td>
              </tr>
            ) : (
              filteredClients.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold tracking-wider text-foreground text-sm">{c.name}</p>
                        {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground tracking-wider hidden md:table-cell font-mono">
                    {formatCNPJ(c.cnpj)}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {c.contactPerson || "-"}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden md:table-cell">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {c.phone ? formatPhone(c.phone) : "-"}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {c.city && c.state ? `${c.city}/${c.state}` : c.city || c.state || "-"}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`badge-status ${statusColors[c.status]}`}>
                      {statusLabels[c.status]}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs tracking-wider border-border h-7"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> EDITAR
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`text-xs tracking-wider h-7 ${c.status === "active" ? "border-primary/50 text-primary" : "border-green-400/50 text-green-400"}`}
                        onClick={() => toggleStatus(c.id, c.status)}
                        disabled={updateClient.isPending}
                      >
                        {c.status === "active" ? (
                          <><Ban className="h-3 w-3 mr-1" /> INATIVAR</>
                        ) : (
                          <><CheckCircle className="h-3 w-3 mr-1" /> ATIVAR</>
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingClient(null); }}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-widest">EDITAR CLIENTE</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs tracking-wider">
              Atualize os dados do cliente abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="brutal-divider my-2" />
          {renderFormFields(editForm, setEditForm)}
          <Button
            className="w-full bg-primary text-primary-foreground font-bold tracking-widest mt-2"
            disabled={!editForm.name.trim() || updateClient.isPending}
            onClick={handleUpdate}
          >
            {updateClient.isPending ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
