import React, { useState, useEffect } from "react";
import { Search, Filter, MoreHorizontal, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/lib/supabase";
import type { ClientStatus } from "@/lib/types";

const statusColors: Record<ClientStatus, string> = {
  lead: "bg-muted text-muted-foreground",
  onboarding: "bg-warning/10 text-warning border-warning/20",
  active: "bg-success/10 text-success border-success/20",
  paused: "bg-orange-500/10 text-orange-500",
  waiting_on_client: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  archived: "bg-muted text-muted-foreground border-border",
};

interface ClientRow {
  id: string;
  company_name: string;
  primary_contact_name: string;
  status: ClientStatus;
  manager?: { first_name: string; last_name: string } | null;
  package?: string;
  currentPhase?: string;
}

interface Stats { total: number; active: number; onboarding: number; waiting: number; }

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, onboarding: 0, waiting: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        /**
         * Performance fix: replaced a 3-step waterfall
         *   (clients → projects → phases)
         * with parallel fetches joined by a single Supabase nested select.
         * The phases name is pulled via the projects join in one round-trip.
         */
        const { data } = await supabase
          .from("clients")
          .select(
            "id, company_name, primary_contact_name, status, " +
            "manager:profiles!account_manager_id(first_name, last_name), " +
            "packageInfo:package_templates!package_template_id(name), " +
            // Nested join: main project → current phase name
            "projects!client_id(is_main_project, current_phase:phases!current_phase_id(name))"
          )
          .order("company_name");

        const rows: ClientRow[] = (data ?? []).map((r: any) => {
          // Handle Supabase returning either an object or a single-element array
          const manager = Array.isArray(r.manager) ? r.manager[0] : r.manager;
          const packageInfo = Array.isArray(r.packageInfo) ? r.packageInfo[0] : r.packageInfo;
          // Find the main project's current phase
          const mainProject = (r.projects ?? []).find((p: any) => p.is_main_project);
          const currentPhaseData = mainProject?.current_phase;
          const phaseName = Array.isArray(currentPhaseData)
            ? currentPhaseData[0]?.name
            : currentPhaseData?.name;

          return {
            id: r.id,
            company_name: r.company_name,
            primary_contact_name: r.primary_contact_name,
            status: r.status as ClientStatus,
            manager: manager ?? null,
            package: packageInfo?.name ?? undefined,
            currentPhase: phaseName ?? undefined,
          };
        });

        setClients(rows);
        setStats({
          total: rows.length,
          active: rows.filter(r => r.status === "active").length,
          onboarding: rows.filter(r => r.status === "onboarding").length,
          waiting: rows.filter(r => r.status === "waiting_on_client").length,
        });
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = clients.filter(c =>
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.primary_contact_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statCards = [
    { label: "Total Clients", value: stats.total, icon: Users, bg: "bg-muted", iconClass: "text-muted-foreground", tooltip: "Total number of clients in the system" },
    { label: "Active", value: stats.active, icon: CheckCircle, bg: "bg-success/10", iconClass: "text-success", tooltip: "Clients currently in active service phases" },
    { label: "Onboarding", value: stats.onboarding, icon: Clock, bg: "bg-warning/10", iconClass: "text-warning", tooltip: "Clients currently being onboarded" },
    { label: "Waiting on Client", value: stats.waiting, icon: AlertCircle, bg: "bg-destructive/10", iconClass: "text-destructive", tooltip: "Clients awaiting action from the client side" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage all client accounts from one place.</p>
      </div>

      {/* Stats Cards — CSS stagger replaces framer-motion */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div
            key={s.label}
            className="animate-fade-in"
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
          >
            <Card>
              <CardContent className="p-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="w-full text-left">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                          <s.icon className={`h-5 w-5 ${s.iconClass}`} />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-foreground">{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent><p className="text-xs">{s.tooltip}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-base font-medium">All Clients</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 w-[200px]" />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="h-3.5 w-3.5" /> Filter
              </Button>
            </div>
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
                  <TableHead>Consultant</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(client => (
                  <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/clients/${client.id}`)}>
                    <TableCell className="pl-6">
                      <div>
                        <p className="font-medium text-foreground">{client.company_name}</p>
                        <p className="text-xs text-muted-foreground">{client.primary_contact_name}</p>
                      </div>
                    </TableCell>
                    <TableCell><p className="text-sm text-muted-foreground">{client.package ?? "—"}</p></TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] font-medium ${statusColors[client.status]}`}>
                        {client.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell><p className="text-sm text-muted-foreground">{client.currentPhase ?? "—"}</p></TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {client.manager ? `${client.manager.first_name} ${client.manager.last_name}` : "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); navigate(`/admin/clients/${client.id}`); }}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
