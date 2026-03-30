import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, MoreHorizontal, Plus, Eye, Trash2, LayoutGrid, List } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { ClientStatus } from "@/lib/types";

const statusColors: Record<ClientStatus, string> = {
  lead: "bg-muted text-muted-foreground",
  onboarding: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  waiting_on_client: "bg-destructive/10 text-destructive",
  completed: "bg-primary/10 text-primary",
  archived: "bg-muted text-muted-foreground",
};

const statusLabels: Record<ClientStatus, string> = {
  lead: "Prospective client, not yet onboarded",
  onboarding: "Currently being onboarded",
  active: "Actively receiving services",
  waiting_on_client: "Awaiting client action or response",
  completed: "Project / service completed",
  archived: "Archived / inactive",
};

interface ClientRow {
  id: string;
  company_name: string;
  primary_contact_name: string;
  primary_contact_email: string;
  phone: string | null;
  status: ClientStatus;
  account_manager_id: string | null;
  manager?: { first_name: string; last_name: string } | null;
  package?: string;
  currentPhase?: string;
  google_drive_url?: string;
  airtable_url?: string;
}

interface Manager { id: string; first_name: string; last_name: string; }
interface PackageTemplate { id: string; name: string; }

const UNASSIGNED = "__unassigned__";

const emptyForm = {
  company_name: "", primary_contact_name: "", primary_contact_email: "",
  phone: "", google_drive_url: "", airtable_url: "", status: "lead" as ClientStatus,
  account_manager_id: UNASSIGNED, package_template_id: UNASSIGNED,
};

// ── Standalone form component (NOT defined inside AdminClients) ──────────────
interface ClientFormProps {
  form: typeof emptyForm;
  onChange: (patch: Partial<typeof emptyForm>) => void;
  managers: Manager[];
  templates: PackageTemplate[];
  error: string;
}

const ClientFormFields: React.FC<ClientFormProps> = ({ form, onChange, managers, templates, error }) => (
  <div className="space-y-3 py-2">
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Company Name *</label>
      <Input
        value={form.company_name}
        onChange={e => onChange({ company_name: e.target.value })}
        placeholder="Acme Corp"
      />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Contact Name *</label>
        <Input
          value={form.primary_contact_name}
          onChange={e => onChange({ primary_contact_name: e.target.value })}
          placeholder="Jane Doe"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Contact Email</label>
        <Input
          type="email"
          value={form.primary_contact_email}
          onChange={e => onChange({ primary_contact_email: e.target.value })}
          placeholder="jane@company.com"
        />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Phone</label>
        <Input
          value={form.phone}
          onChange={e => onChange({ phone: e.target.value })}
          placeholder="+1 555 000 0000"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Google Drive URL</label>
        <Input
          value={form.google_drive_url}
          onChange={e => onChange({ google_drive_url: e.target.value })}
          placeholder="https://drive.google.com/..."
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Airtable URL</label>
        <Input
          value={form.airtable_url}
          onChange={e => onChange({ airtable_url: e.target.value })}
          placeholder="https://airtable.com/..."
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Status</label>
        <Select value={form.status} onValueChange={v => onChange({ status: v as ClientStatus })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["lead", "onboarding", "active", "waiting_on_client", "completed", "archived"] as ClientStatus[]).map(s => (
              <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Package Template</label>
      <Select value={form.package_template_id} onValueChange={v => onChange({ package_template_id: v })}>
        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>None</SelectItem>
          {templates.map(t => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Account Manager</label>
      <Select value={form.account_manager_id} onValueChange={v => onChange({ account_manager_id: v })}>
        <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {managers.map(m => (
            <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

const KANBAN_STATUSES: ClientStatus[] = ["lead", "onboarding", "active", "waiting_on_client", "completed"];

const kanbanColumnStyles: Record<ClientStatus, { header: string; card: string; dot: string }> = {
  lead:              { header: "bg-muted/60 border-border",             card: "border-border",            dot: "bg-muted-foreground" },
  onboarding:        { header: "bg-warning/10 border-warning/30",       card: "border-warning/20",        dot: "bg-warning" },
  active:            { header: "bg-success/10 border-success/30",       card: "border-success/20",        dot: "bg-success" },
  waiting_on_client: { header: "bg-destructive/10 border-destructive/30", card: "border-destructive/20", dot: "bg-destructive" },
  completed:         { header: "bg-primary/10 border-primary/30",       card: "border-primary/20",        dot: "bg-primary" },
  archived:          { header: "bg-muted/60 border-border",             card: "border-border",            dot: "bg-muted-foreground" },
};

const AdminClients: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [templates, setTemplates] = useState<PackageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editClient, setEditClient] = useState<ClientRow | null>(null);
  const [deleteClient, setDeleteClient] = useState<ClientRow | null>(null);
  const [dragOverCol, setDragOverCol] = useState<ClientStatus | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth();

  const patchForm = (patch: Partial<typeof emptyForm>) =>
    setForm(f => ({ ...f, ...patch }));

  const loadClients = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from("clients")
        .select("*, manager:profiles!account_manager_id(first_name, last_name)")
        .neq("status", "archived")
        .order("company_name");
      if (fetchErr) throw fetchErr;
      const rows: ClientRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
        ...(r as Omit<ClientRow, "manager">),
        manager: Array.isArray(r.manager) ? (r.manager[0] ?? null) : (r.manager as ClientRow["manager"]),
      }));
      setClients(rows);
    } catch (err) {
      console.error("Clients load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadManagers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("role", ["admin", "manager"]);
    setManagers((data ?? []) as Manager[]);
  }, []);

  const loadTemplates = useCallback(async () => {
    const { data } = await supabase.from("package_templates").select("id, name").order("name");
    setTemplates((data ?? []) as PackageTemplate[]);
  }, []);

  useEffect(() => { loadClients(); loadManagers(); loadTemplates(); }, [loadClients, loadManagers, loadTemplates]);

  const openAdd = () => { setForm(emptyForm); setError(""); setShowAddDialog(true); };
  const openEdit = (c: ClientRow) => {
    setEditClient(c);
    setForm({
      company_name: c.company_name, primary_contact_name: c.primary_contact_name,
      primary_contact_email: c.primary_contact_email, phone: c.phone ?? "",
      google_drive_url: c.google_drive_url ?? "", airtable_url: c.airtable_url ?? "",
      status: c.status, account_manager_id: c.account_manager_id ?? UNASSIGNED,
      package_template_id: (c as any).package_template_id ?? UNASSIGNED,
    });
    setError("");
  };

  const handleCreate = async () => {
    if (!form.company_name || !form.primary_contact_name) {
      setError("Company name and contact name are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const packageTemplateId = form.package_template_id === UNASSIGNED ? null : (form.package_template_id || null);
    
    const { data: newClient, error: err } = await supabase.from("clients").insert({
      company_name: form.company_name,
      primary_contact_name: form.primary_contact_name,
      primary_contact_email: form.primary_contact_email || null,
      phone: form.phone || null,
      google_drive_url: form.google_drive_url || null,
      airtable_url: form.airtable_url || null,
      status: form.status,
      account_manager_id: form.account_manager_id === UNASSIGNED ? null : (form.account_manager_id || null),
      package_template_id: packageTemplateId,
    }).select("id").single();
    
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }

    if (packageTemplateId && newClient?.id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-package`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ client_id: newClient.id, package_template_id: packageTemplateId })
        });
        toast({ title: "Client Created", description: "Package template has been assigned." });
      } catch (pkgErr) {
        console.error("Failed to assign package details:", pkgErr);
        toast({ title: "Template Warning", description: "Client was created but applying the template failed.", variant: "destructive" });
      }
    } else {
      toast({ title: "Client Created" });
    }

    setSubmitting(false);
    setShowAddDialog(false);
    loadClients();
  };

  const handleUpdate = async () => {
    if (!editClient) return;
    if (!form.company_name || !form.primary_contact_name) {
      setError("Company name and contact name are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    const packageTemplateId = form.package_template_id === UNASSIGNED ? null : (form.package_template_id || null);

    const { error: err } = await supabase.from("clients").update({
      company_name: form.company_name,
      primary_contact_name: form.primary_contact_name,
      primary_contact_email: form.primary_contact_email || null,
      phone: form.phone || null,
      google_drive_url: form.google_drive_url || null,
      airtable_url: form.airtable_url || null,
      status: form.status,
      account_manager_id: form.account_manager_id === UNASSIGNED ? null : (form.account_manager_id || null),
      package_template_id: packageTemplateId,
    }).eq("id", editClient.id);
    
    if (err) {
      setError(err.message);
      setSubmitting(false);
      return;
    }

    if (packageTemplateId && packageTemplateId !== (editClient as any).package_template_id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-package`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ client_id: editClient.id, package_template_id: packageTemplateId })
        });
        toast({ title: "Package Assigned", description: "Template tasks have been fully applied." });
      } catch (pkgErr) {
        console.error("Failed to assign package details:", pkgErr);
        toast({ title: "Template Warning", description: "Updated client but applying the new template failed.", variant: "destructive" });
      }
    } else {
      toast({ title: "Client Updated" });
    }

    setSubmitting(false);
    setEditClient(null);
    loadClients();
  };

  const handleArchive = async (c: ClientRow) => {
    await supabase.from("clients").update({ status: "archived" }).eq("id", c.id);
    loadClients();
  };

  const handleDeleteClient = async () => {
    if (!deleteClient) return;
    const { error } = await supabase.from("clients").delete().eq("id", deleteClient.id);
    if (error) console.error("Error deleting client:", error);
    setDeleteClient(null);
    loadClients();
  };

  const handleStatusChange = async (clientId: string, newStatus: ClientStatus) => {
    // Optimistic update
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));
    const { error } = await supabase.from("clients").update({ status: newStatus }).eq("id", clientId);
    if (error) {
      console.error("Status update failed:", error);
      loadClients(); // revert on error
    }
  };

  // Drag handlers
  const onDragStart = (e: React.DragEvent, clientId: string) => {
    e.dataTransfer.setData("clientId", clientId);
  };
  const onDragOver = (e: React.DragEvent, status: ClientStatus) => {
    e.preventDefault();
    setDragOverCol(status);
  };
  const onDrop = (e: React.DragEvent, status: ClientStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const clientId = e.dataTransfer.getData("clientId");
    if (clientId) handleStatusChange(clientId, status);
  };

  const filteredClients = clients.filter(c =>
    (c.company_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.primary_contact_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all client accounts.</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* Toolbar: search + view toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {/* View Toggle */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              viewMode === "table"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <List className="h-4 w-4" /> Table
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
              viewMode === "kanban"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <LayoutGrid className="h-4 w-4" /> Kanban
          </button>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {searchQuery ? "No clients match your search." : "No clients yet — add one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Client</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map(client => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/clients/${client.id}`)}
                  >
                    <TableCell className="pl-6">
                      <div>
                        <p className="font-medium text-foreground">{client.company_name}</p>
                        <p className="text-xs text-muted-foreground">{client.primary_contact_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{client.package ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className={`text-[10px] font-medium ${statusColors[client.status] ?? ""}`}>
                              {client.status.replace("_", " ")}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{statusLabels[client.status] ?? client.status}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{client.currentPhase ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {client.manager
                          ? `${client.manager.first_name} ${client.manager.last_name}`
                          : "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right pr-6" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}`)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(client)}>Edit</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-muted-foreground"
                            onClick={() => handleArchive(client)}
                          >
                            Archive
                          </DropdownMenuItem>
                          {user?.role === "admin" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteClient(client)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>}

      {/* ── KANBAN VIEW ── */}
      {viewMode === "kanban" && (
        <div className="overflow-x-auto pb-4">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="flex gap-4 min-w-max">
              {KANBAN_STATUSES.map(status => {
                const colClients = filteredClients.filter(c => c.status === status);
                const styles = kanbanColumnStyles[status];
                const isOver = dragOverCol === status;
                return (
                  <div
                    key={status}
                    className={`w-64 flex-shrink-0 rounded-xl border-2 transition-colors ${
                      isOver ? "border-primary/60 bg-primary/5" : styles.header
                    }`}
                    onDragOver={e => onDragOver(e, status)}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={e => onDrop(e, status)}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-inherit">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
                        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          {status.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{colClients.length}</span>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2 min-h-[120px]">
                      {colClients.length === 0 && (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                          Drop clients here
                        </div>
                      )}
                      {colClients.map(client => (
                        <div
                          key={client.id}
                          draggable
                          onDragStart={e => onDragStart(e, client.id)}
                          className={`group bg-background rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all ${styles.card}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{client.company_name}</p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{client.primary_contact_name}</p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0.5 rounded">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem onClick={() => navigate(`/admin/clients/${client.id}`)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(client)}>Edit</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-muted-foreground" onClick={() => handleArchive(client)}>Archive</DropdownMenuItem>
                                {user?.role === "admin" && (
                                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteClient(client)}>
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {client.manager && (
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {client.manager.first_name} {client.manager.last_name}
                            </p>
                          )}
                          {/* Move to status select */}
                          <select
                            value={client.status}
                            onChange={e => handleStatusChange(client.id, e.target.value as ClientStatus)}
                            onClick={e => e.stopPropagation()}
                            className="mt-2 w-full text-[10px] bg-muted border-0 rounded px-1.5 py-1 text-muted-foreground cursor-pointer"
                          >
                            {KANBAN_STATUSES.map(s => (
                              <option key={s} value={s}>{s.replace("_", " ")}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={open => { if (!open) setShowAddDialog(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <ClientFormFields form={form} onChange={patchForm} managers={managers} templates={templates} error={error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? "Creating…" : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={v => { if (!v) setEditClient(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <ClientFormFields form={form} onChange={patchForm} managers={managers} templates={templates} error={error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClient(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={submitting}>
              {submitting ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Client Dialog */}
      <AlertDialog open={!!deleteClient} onOpenChange={v => { if (!v) setDeleteClient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteClient?.company_name} and all of their data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminClients;
