import React from "react";
import { motion } from "framer-motion";
import { Settings, Palette, Bell, Shield, Database, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const AdminSettings: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure portal settings and preferences.</p>
      </div>

      <div className="grid gap-6">
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
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Accent Color</p>
                <p className="text-xs text-muted-foreground">Primary brand color</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary border-2 border-primary-foreground cursor-pointer" />
                <div className="h-8 w-8 rounded-full bg-success cursor-pointer opacity-50 hover:opacity-100" />
                <div className="h-8 w-8 rounded-full bg-[hsl(250,60%,50%)] cursor-pointer opacity-50 hover:opacity-100" />
              </div>
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
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Session Timeout</p>
                <p className="text-xs text-muted-foreground">Auto logout after inactivity</p>
              </div>
              <Input className="w-[100px]" defaultValue="60" type="number" />
              <span className="text-sm text-muted-foreground">minutes</span>
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
                <p className="text-sm font-medium">Export All Data</p>
                <p className="text-xs text-muted-foreground">Download a complete backup of all portal data</p>
              </div>
              <Button variant="outline" size="sm">Export</Button>
            </div>
            <Separator />
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
