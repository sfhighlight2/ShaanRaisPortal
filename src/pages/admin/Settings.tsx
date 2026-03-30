import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Palette, Bell, Shield, Database, User, Save, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [exporting, setExporting] = useState(false);

  // General state
  const [portalName, setPortalName] = useState(() => localStorage.getItem("portal_name") || "Shaan Rais Client Portal");
  const [supportEmail, setSupportEmail] = useState(() => localStorage.getItem("portal_email") || "support@shaanrais.com");

  // Toggles state
  const [options, setOptions] = useState(() => {
    const saved = localStorage.getItem("portal_options");
    return saved ? JSON.parse(saved) : {
      newClientNotifs: true,
      taskAlerts: true,
      questionNotifs: true,
      inactivityAlerts: false,
      darkMode: false,
      twoFactor: false,
    };
  });

  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user]);

  const toggleOption = (key: keyof typeof options) => {
    const newOptions = { ...options, [key]: !options[key] };
    setOptions(newOptions);
    localStorage.setItem("portal_options", JSON.stringify(newOptions));
    
    // Simulate setting logic
    if (key === "darkMode") {
      if (newOptions[key]) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
    
    toast({ title: "Setting updated", description: "Your preferences have been saved." });
  };

  const handleGeneralSave = () => {
    localStorage.setItem("portal_name", portalName);
    localStorage.setItem("portal_email", supportEmail);
    toast({ title: "Settings saved", description: "General portal configuration updated." });
  };

  const handleProfileSave = async () => {
    if (!isSupabaseConfigured || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", user.id);
    setSaving(false);
    if (!error) {
      setSavedMsg("Profile saved! Refreshing…");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      setSavedMsg("Error saving profile: " + error.message);
    }
  };

  const handleExportCsv = async () => {
    if (!isSupabaseConfigured) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.from("clients").select("*");
      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast({ title: "No data", description: "There are no clients to export.", variant: "destructive" });
        return;
      }
      
      const keys = Object.keys(data[0]);
      const csvContent = [
        keys.join(","),
        ...data.map(row => keys.map(k => `"${String(row[k] || "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");
      
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `clients_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ title: "Export Complete", description: "Client data has been downloaded." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure portal settings and preferences.</p>
      </div>

      <div className="grid gap-6">
        {/* My Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <User className="h-4 w-4" /> My Profile
            </CardTitle>
            <CardDescription>Update your display name. Changes appear throughout the portal immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Email (read-only)</label>
              <Input value={user?.email ?? ""} disabled className="bg-muted/50" />
            </div>
            {savedMsg && <p className={`text-sm ${savedMsg.includes('Error') ? 'text-destructive' : 'text-success'}`}>{savedMsg}</p>}
            <div className="flex justify-end">
              <Button onClick={handleProfileSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" /> General
            </CardTitle>
            <CardDescription>Basic portal configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Portal Name</p>
                <p className="text-xs text-muted-foreground">The name displayed in the portal</p>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  className="w-[200px] md:w-[250px]" 
                  value={portalName} 
                  onChange={e => setPortalName(e.target.value)} 
                />
                <Button variant="outline" size="sm" onClick={handleGeneralSave}>Save</Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Support Email</p>
                <p className="text-xs text-muted-foreground">Email for client inquiries</p>
              </div>
              <div className="flex items-center gap-2">
                <Input 
                  className="w-[200px] md:w-[250px]" 
                  value={supportEmail}
                  onChange={e => setSupportEmail(e.target.value)}
                />
                <Button variant="outline" size="sm" onClick={handleGeneralSave}>Save</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" /> Notifications
            </CardTitle>
            <CardDescription>Configure notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">New Client Notifications</p>
                <p className="text-xs text-muted-foreground">Get notified when a new client is added</p>
              </div>
              <Switch checked={options.newClientNotifs} onCheckedChange={() => toggleOption('newClientNotifs')} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Task Completion Alerts</p>
                <p className="text-xs text-muted-foreground">Alert when clients complete tasks</p>
              </div>
              <Switch checked={options.taskAlerts} onCheckedChange={() => toggleOption('taskAlerts')} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Question Notifications</p>
                <p className="text-xs text-muted-foreground">Get notified of new client questions</p>
              </div>
              <Switch checked={options.questionNotifs} onCheckedChange={() => toggleOption('questionNotifs')} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Inactivity Alerts</p>
                <p className="text-xs text-muted-foreground">Alert when clients are inactive for 7+ days</p>
              </div>
              <Switch checked={options.inactivityAlerts} onCheckedChange={() => toggleOption('inactivityAlerts')} />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" /> Appearance
            </CardTitle>
            <CardDescription>Customize the portal look and feel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Enable dark theme for the portal</p>
              </div>
              <Switch checked={options.darkMode} onCheckedChange={() => toggleOption('darkMode')} />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" /> Security
            </CardTitle>
            <CardDescription>Security and access settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-muted-foreground">Require 2FA for all admin users</p>
              </div>
              <Switch checked={options.twoFactor} onCheckedChange={() => toggleOption('twoFactor')} />
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Database className="h-4 w-4" /> Data Management
            </CardTitle>
            <CardDescription>Export and backup options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Export Client List</p>
                <p className="text-xs text-muted-foreground">Download client data as CSV</p>
              </div>
              <Button onClick={handleExportCsv} disabled={exporting} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                {exporting ? "Preparing..." : "Export CSV"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
