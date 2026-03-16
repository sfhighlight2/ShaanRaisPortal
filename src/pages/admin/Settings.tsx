import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Palette, Bell, Shield, Database, User, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // keep form in sync if user changes (e.g. after role switch)
  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user]);

  const handleProfileSave = async () => {
    if (!isSupabaseConfigured || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("id", user.id);
    setSaving(false);
    if (!error) {
      // Force a page reload so AuthContext re-fetches the updated profile
      setSavedMsg("Profile saved! Refreshing…");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      setSavedMsg("Error saving profile: " + error.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
            {savedMsg && <p className="text-sm text-success">{savedMsg}</p>}
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
              <Input className="w-[250px]" defaultValue="Shaan Rais Client Portal" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Support Email</p>
                <p className="text-xs text-muted-foreground">Email for client inquiries</p>
              </div>
              <Input className="w-[250px]" defaultValue="support@shaanrais.com" />
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
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Task Completion Alerts</p>
                <p className="text-xs text-muted-foreground">Alert when clients complete tasks</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Question Notifications</p>
                <p className="text-xs text-muted-foreground">Get notified of new client questions</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Inactivity Alerts</p>
                <p className="text-xs text-muted-foreground">Alert when clients are inactive for 7+ days</p>
              </div>
              <Switch />
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
              <Switch />
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
              <Switch />
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
              <Button variant="outline" size="sm">Export CSV</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
