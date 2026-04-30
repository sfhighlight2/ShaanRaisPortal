import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { UserPlus, MoreHorizontal, Mail, AlertCircle, Building } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { edgeFetch } from "@/lib/edgeFetch";
import { useAuth } from "@/contexts/AuthContext";

interface PortalUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  client_id?: string;
  company_name?: string;
}

interface ClientRow {
  id: string;
  company_name: string;
  user_id: string | null;
}

const emptyForm = { first_name: "", last_name: "", email: "", password: "", client_id: "" };

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editUser, setEditUser] = useState<PortalUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<PortalUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch available clients based on role
      let clientsQuery = supabase.from("clients").select("id, company_name, user_id").order("company_name");
      if (user.role === "manager") {
        clientsQuery = clientsQuery.eq("account_manager_id", user.id);
      }
      
      // 2. Fetch profiles where role is client
      // If manager, we might fetch profiles for all clients, but we'll only show ones linked to their clients or we can fetch all client profiles and filter. 
      // Actually, if we fetch all profiles where role = 'client', a manager shouldn't see them unless they belong to their client.
      const profilesQuery = supabase.from("profiles").select("*").eq("role", "client").order("first_name");

      const [clientsRes, profilesRes] = await Promise.all([clientsQuery, profilesQuery]);
      
      const fetchedClients = (clientsRes.data as ClientRow[]) || [];
      const fetchedProfiles = (profilesRes.data as any[]) || [];

      // Map clients to profiles
      const mappedUsers: PortalUser[] = fetchedProfiles.map(p => {
        // The profile might have a client_id, or the client table maps user_id to profile.id
        const assignedClient = fetchedClients.find(c => c.user_id === p.id || c.id === p.client_id);
        return {
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          status: p.status,
          client_id: assignedClient?.id,
          company_name: assignedClient?.company_name,
        };
      });

      // If manager, filter mappedUsers to only those that match one of their clients
      let finalUsers = mappedUsers;
      if (user.role === "manager") {
        const clientIds = new Set(fetchedClients.map(c => c.id));
        finalUsers = mappedUsers.filter(u => u.client_id && clientIds.has(u.client_id));
      }

      setClients(fetchedClients);
      setUsers(finalUsers);
    } catch (err) {
      console.error("Portal users load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setForm(emptyForm); setError(""); setShowAddDialog(true); };
  
  const openEdit = (u: PortalUser) => { 
    setEditUser(u); 
    setForm({ 
      first_name: u.first_name, 
      last_name: u.last_name, 
      email: u.email, 
      password: "", 
      client_id: u.client_id || "" 
    }); 
    setError(""); 
  };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.first_name || !form.client_id) {
      setError("First Name, Email, Password, and Client are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await edgeFetch("create-user", {
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        role: "client",
        client_id: form.client_id,
      });
      setShowAddDialog(false);
      loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to create portal user. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    setSubmitting(true);
    setError("");
    try {
      await edgeFetch("create-user", {
        action: "update_portal_user",
        user_id: editUser.id,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password || undefined,
        client_id: form.client_id,
      });
      setEditUser(null);
      loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update portal user. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (u: PortalUser) => {
    if (!isSupabaseConfigured) return;
    const newStatus = u.status === "active" ? "inactive" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", u.id);
    loadData();
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteError("");
    try {
      await edgeFetch("create-user", { action: "delete", user_id: deleteUser.id });
      setDeleteUser(null);
      setDeleteError("");
      loadData();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete portal user.");
    }
  };

  // Only show clients that don't already have a portal user
  const availableClients = clients.filter(c => !c.user_id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">Portal Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage client portal logins and accesses.</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <UserPlus className="h-4 w-4" /> Add Portal User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-2xl font-semibold text-foreground">{users.length}</p>
          <p className="text-xs text-muted-foreground">Portal Users</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-semibold text-foreground">{users.filter(u => u.status === "active").length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-semibold text-foreground">{availableClients.length}</p>
          <p className="text-xs text-muted-foreground">Clients Without Access</p>
        </CardContent></Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Portal Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : users.length === 0 ? (
             <div className="p-8 text-center text-sm text-muted-foreground">No portal users found. Create one to get started.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <p className="font-medium">{u.first_name} {u.last_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.company_name ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          {u.company_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] capitalize ${u.status === "active" ? "text-success border-success/30" : "text-muted-foreground"}`}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(u)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeactivate(u)}>
                            {u.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteUser(u)}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Portal User Dialog */}
      <Sheet open={showAddDialog} onOpenChange={setShowAddDialog}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
          <SheetHeader>
            <SheetTitle>Add Portal User</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-2 mt-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assign To Client *</label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger>
                <SelectContent>
                  {availableClients.length === 0 ? (
                    <SelectItem value="none" disabled>No clients available</SelectItem>
                  ) : (
                    availableClients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">First Name *</label>
                <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Jane" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Last Name</label>
                <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Smith" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email *</label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@clientcompany.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password *</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || form.client_id === "" || form.client_id === "none"}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit User Dialog */}
      <Sheet open={!!editUser} onOpenChange={v => { if (!v) setEditUser(null); }}>
        <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
          <SheetHeader>
            <SheetTitle>Edit Portal User</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 py-2 mt-4">
             <div className="space-y-1.5">
              <label className="text-sm font-medium">Assigned Client</label>
              <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">First Name</label>
                <Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Last Name</label>
                <Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">New Password</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank to keep current password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <SheetFooter className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={submitting}>{submitting ? "Saving…" : "Save Changes"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={v => { if (!v) { setDeleteUser(null); setDeleteError(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete portal user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteUser?.first_name} {deleteUser?.last_name}'s account and cannot be undone.
              The associated client will lose portal access until a new user is created.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{deleteError}</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteError("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
