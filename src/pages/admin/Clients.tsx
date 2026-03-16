import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Filter, MoreHorizontal, Plus, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { mockClients, mockProjects, mockPhases, getUserById } from "@/lib/mock-data";
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
}

interface Manager { id: string; first_name: string; last_name: string; }

const emptyForm = {
  company_name: "", primary_contact_name: "", primary_contact_email: "",
  phone: "", status: "lead" as ClientStatus, account_manager_id: "",
};

const AdminClients: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editClient, setEditClient] = useState<ClientRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadClients = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Fall back to mock
      setClients(mockClients.map(c => {
        const pm = mockProjects.find(p => p.clientId === c.id && p.isMainProject);
        const phases = mockPhases.filter(ph => ph.projectId === pm?.id);
        const cur = phases.find(ph => ph.status === "current");
        const mgr = getUserById(c.accountManagerId);
        return {
          id: c.id, company_name: c.companyName, primary_contact_name: c.primaryContactName,
          primary_contact_email: c.primaryContactEmail, phone: null, status: c.status as ClientStatus,
          account_manager_id: c.accountManagerId, package: pm?.projectName,
          currentPhase: cur?.name,
          manager: mgr ? { first_name: mgr.firstName, last_name: mgr.lastName } : null,
        };
      }));
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("clients")
      .select("*, manager:profiles!account_manager_id(first_name, last_name)")
      .neq("status", "archived")
      .order("company_name");
    setClients((data ?? []) as ClientRow[]);
    setLoading(false);
  }, []);

  const loadManagers = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase.from("profiles").select("id, first_name, last_name").in("role", ["admin", "manager"]);
    setManagers((data ?? []) as Manager[]);
  }, []);

  useEffect(() => { loadClients(); loadManagers(); }, [loadClients, loadManagers]);

  const openAdd = () => { setForm(emptyForm); setError(""); setShowAddDialog(true); };
  const openEdit = (c: ClientRow) => {
    setEditClient(c);
    setForm({ company_name: c.company_name, primary_contact_name: c.primary_contact_name,
      primary_contact_email: c.primary_contact_email, phone: c.phone ?? "",
      status: c.status, account_manager_id: c.account_manager_id ?? "" });
    setError("");
  };

  const handleCreate = async () => {
    if (!form.company_name || !form.primary_contact_name) { setError("Company name and contact name are required."); return; }
    setSubmitting(true); setError("");
    const { error: err } = await supabase.from("clients").insert({
      company_name: form.company_name, primary_contact_name: form.primary_contact_name,
      primary_contact_email: form.primary_contact_email || null,
      phone: form.phone || null, status: form.status,
      account_manager_id: form.account_manager_id || null,
    });
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setShowAddDialog(false);
    loadClients();
  };

  const handleUpdate = async () => {
    if (!editClient) return;
    setSubmitting(true); setError("");
    const { error: err } = await supabase.from("clients").update({
      company_name: form.company_name, primary_contact_name: form.primary_contact_name,
      primary_contact_email: form.primary_contact_email || null,
      phone: form.phone || null, status: form.status,
      account_manager_id: form.account_manager_id || null,
    }).eq("id", editClient.id);
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setEditClient(null);
    loadClients();
  };

  const handleArchive = async (c: ClientRow) => {
    await supabase.from("clients").update({ status: "archived" }).eq("id", c.id);
    loadClients();
  };

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.primary_contact_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ClientFormFields = () => (
    <div className="space-y-3 py-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Company Name *</label>
        <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Acme Corp" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Contact Name *</label>
          <Input value={form.primary_contact_name} onChange={e => setForm(f => ({ ...f, primary_contact_name: e.target.value }))} placeholder="Jane Doe" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Contact Email</label>
          <Input type="email" value={form.primary_contact_email} onChange={e => setForm(f => ({ ...f, primary_contact_email: e.target.value }))} placeholder="jane@company.com" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Phone</label>
          <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 555 000 0000" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Status</label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ClientStatus }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["lead","onboarding","active","waiting_on_client","completed","archived"] as ClientStatus[]).map(s => (
                <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Account Manager</label>
        <Select value={form.account_manager_id} onValueChange={v => setForm(f => ({ ...f, account_manager_id: v }))}>
          <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Unassigned</SelectItem>
            {managers.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
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

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Filter className="h-3.5 w-3.5" /> Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
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
                  <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/clients/${client.id}`)}>
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
                            <Badge className={`text-[10px] font-medium ${statusColors[client.status]}`}>
                              {client.status.replace("_", " ")}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">{statusLabels[client.status]}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">{client.currentPhase ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {client.manager ? `${client.manager.first_name} ${client.manager.last_name}` : "—"}
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
                          <DropdownMenuItem className="text-muted-foreground" onClick={() => handleArchive(client)}>
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
          <ClientFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Creating…" : "Create Client"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={!!editClient} onOpenChange={v => { if (!v) setEditClient(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          <ClientFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClient(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={submitting}>{submitting ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClients;
