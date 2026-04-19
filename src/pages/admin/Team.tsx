import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, MoreHorizontal, Mail, Shield, X, AlertCircle } from "lucide-react";
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { edgeFetch } from "@/lib/edgeFetch";
import type { UserRole } from "@/lib/types";

const roleColors: Record<UserRole, string> = {
  admin: "bg-primary/10 text-primary",
  manager: "bg-success/10 text-success",
  team_member: "bg-muted text-muted-foreground",
  client: "bg-warning/10 text-warning",
};

interface TeamProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  status: string;
}

const emptyForm = { first_name: "", last_name: "", email: "", password: "", role: "team_member" as UserRole };

const AdminTeam: React.FC = () => {
  const [members, setMembers] = useState<TeamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editMember, setEditMember] = useState<TeamProfile | null>(null);
  const [deleteMember, setDeleteMember] = useState<TeamProfile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const loadMembers = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("role", "client")
        .order("first_name");
      setMembers((data as TeamProfile[]) ?? []);
    } catch (err) {
      console.error("Team load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const openAdd = () => { setForm(emptyForm); setError(""); setShowAddDialog(true); };
  const openEdit = (m: TeamProfile) => { setEditMember(m); setForm({ first_name: m.first_name, last_name: m.last_name, email: m.email, password: "", role: m.role }); setError(""); };

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.first_name) {
      setError("Name, email and password are required.");
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
        role: form.role,
      });
      setShowAddDialog(false);
      loadMembers();
    } catch (err: any) {
      setError(err?.message || "Failed to create team member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editMember) return;
    setSubmitting(true);
    setError("");
    try {
      await edgeFetch("create-user", {
        action: "update",
        user_id: editMember.id,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
      });
      setEditMember(null);
      loadMembers();
    } catch (err: any) {
      setError(err?.message || "Failed to update team member. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (m: TeamProfile) => {
    if (!isSupabaseConfigured) return;
    const newStatus = m.status === "active" ? "inactive" : "active";
    await supabase.from("profiles").update({ status: newStatus }).eq("id", m.id);
    loadMembers();
  };

  const handleDelete = async () => {
    if (!deleteMember) return;
    setDeleteError("");
    try {
      await edgeFetch("create-user", { action: "delete", user_id: deleteMember.id });
      setDeleteMember(null);
      setDeleteError("");
      loadMembers();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete team member.");
    }
  };

  const internalMembers = members.filter(u => u.role !== "client");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage internal team members and permissions.</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Team Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-2xl font-semibold text-foreground">{internalMembers.length}</p>
          <p className="text-xs text-muted-foreground">Team Members</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-semibold text-foreground">{internalMembers.filter(u => u.role === "admin").length}</p>
          <p className="text-xs text-muted-foreground">Admins</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-semibold text-foreground">{internalMembers.filter(u => u.role === "manager").length}</p>
          <p className="text-xs text-muted-foreground">Managers</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-2xl font-semibold text-foreground">{internalMembers.filter(u => u.status === "active").length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </CardContent></Card>
      </div>

      {/* Team Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {internalMembers.map((member) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {member.first_name?.[0]}{member.last_name?.[0]}
                        </div>
                        <p className="font-medium">{member.first_name} {member.last_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {member.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] capitalize ${roleColors[member.role]}`}>
                        {member.role.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] capitalize ${member.status === "active" ? "text-success border-success/30" : "text-muted-foreground"}`}>
                        {member.status}
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
                          <DropdownMenuItem onClick={() => openEdit(member)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeactivate(member)}>
                            {member.status === "active" ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteMember(member)}>
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

      {/* Permissions Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" /> Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="font-medium text-primary mb-2">Admin</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Full platform access</li>
                <li>• Manage templates</li>
                <li>• Manage users &amp; permissions</li>
                <li>• Create/edit all clients</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <p className="font-medium text-success mb-2">Manager</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Manage assigned clients</li>
                <li>• Update project phases</li>
                <li>• Post client updates</li>
                <li>• Add tasks &amp; deliverables</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="font-medium text-foreground mb-2">Team Member</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View assigned clients</li>
                <li>• Add internal notes</li>
                <li>• Upload files</li>
                <li>• Complete internal tasks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Team Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@shaanrais.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password *</label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="team_member">Team Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editMember} onOpenChange={v => { if (!v) setEditMember(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
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
              <label className="text-sm font-medium">Role</label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="team_member">Team Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={submitting}>{submitting ? "Saving…" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={!!deleteMember} onOpenChange={v => { if (!v) { setDeleteMember(null); setDeleteError(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deleteMember?.first_name} {deleteMember?.last_name}'s account and cannot be undone.
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

export default AdminTeam;
