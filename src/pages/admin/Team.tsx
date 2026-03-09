import React from "react";
import { motion } from "framer-motion";
import { Plus, MoreHorizontal, Mail, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { mockUsers } from "@/lib/mock-data";
import type { UserRole } from "@/lib/types";

const roleColors: Record<UserRole, string> = {
  admin: "bg-primary/10 text-primary",
  manager: "bg-success/10 text-success",
  team_member: "bg-muted text-muted-foreground",
  client: "bg-warning/10 text-warning",
};

const AdminTeam: React.FC = () => {
  const internalUsers = mockUsers.filter((u) => u.role !== "client");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">Team</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage internal team members and permissions.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Add Team Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{internalUsers.length}</p>
            <p className="text-xs text-muted-foreground">Team Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{internalUsers.filter((u) => u.role === "admin").length}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{internalUsers.filter((u) => u.role === "manager").length}</p>
            <p className="text-xs text-muted-foreground">Managers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-semibold text-foreground">{internalUsers.filter((u) => u.status === "active").length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">All Team Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
              {internalUsers.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <p className="font-medium">{user.firstName} {user.lastName}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] capitalize ${roleColors[user.role]}`}>
                      {user.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] capitalize ${user.status === "active" ? "text-success border-success/30" : ""}`}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
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
                <li>• Manage users & permissions</li>
                <li>• Create/edit all clients</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-success/5 border border-success/20">
              <p className="font-medium text-success mb-2">Manager</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Manage assigned clients</li>
                <li>• Update project phases</li>
                <li>• Post client updates</li>
                <li>• Add tasks & deliverables</li>
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
    </div>
  );
};

export default AdminTeam;
