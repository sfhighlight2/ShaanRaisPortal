import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff,
    Search, Filter, Link2, FileText, Video, File, FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Sheet, SheetContent, SheetDescription, SheetHeader,
    SheetTitle, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Resource, ResourceType, UserRole } from "@/lib/types";

const typeIcons: Record<ResourceType, React.ElementType> = {
    link: Link2,
    pdf: FileText,
    video: Video,
    gdoc: FileText,
    file: File,
};

const typeLabels: Record<ResourceType, string> = {
    link: "External Link",
    pdf: "PDF",
    video: "Video",
    gdoc: "Google Doc",
    file: "File Upload",
};

const typeColors: Record<ResourceType, string> = {
    link: "bg-blue-500/10 text-blue-600",
    pdf: "bg-red-500/10 text-red-600",
    video: "bg-purple-500/10 text-purple-600",
    gdoc: "bg-emerald-500/10 text-emerald-600",
    file: "bg-amber-500/10 text-amber-600",
};

const AdminResourcesManagement: React.FC = () => {
    const [resources, setResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = React.useCallback(async () => {
        try {
            if (!isSupabaseConfigured) return;
            const { data, error } = await supabase.from("resources").select("*").order("display_order");
            if (error) throw error;
            
            setResources((data || []).map(r => ({
                id: r.id, 
                title: r.title, 
                description: r.description, 
                category: r.category, 
                type: r.type, 
                url: r.url, 
                filePath: r.file_path, 
                displayOrder: r.display_order, 
                visibleToRole: r.visible_to_roles
            })));
        } catch (err) {
            console.error("Error loading resources:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    // UI state
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<Resource | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form state
    const [formTitle, setFormTitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formCategory, setFormCategory] = useState("");
    const [formType, setFormType] = useState<ResourceType>("link");
    const [formUrl, setFormUrl] = useState("");
    const [formVisibleManager, setFormVisibleManager] = useState(true);

    // Derived
    const categories = useMemo(() => {
        const set = new Set(resources.map((r) => r.category));
        return Array.from(set).sort();
    }, [resources]);

    const filteredResources = useMemo(() => {
        let result = resources;
        if (filterCategory !== "all") {
            result = result.filter((r) => r.category === filterCategory);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (r) =>
                    r.title.toLowerCase().includes(q) ||
                    r.description?.toLowerCase().includes(q) ||
                    r.category.toLowerCase().includes(q)
            );
        }
        return result.sort((a, b) => {
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            return a.displayOrder - b.displayOrder;
        });
    }, [resources, searchQuery, filterCategory]);

    // CRUD
    const openDialog = (resource?: Resource) => {
        if (resource) {
            setEditingResource(resource);
            setFormTitle(resource.title);
            setFormDescription(resource.description || "");
            setFormCategory(resource.category);
            setFormType(resource.type);
            setFormUrl(resource.url || resource.filePath || "");
            setFormVisibleManager(resource.visibleToRole.includes("manager"));
        } else {
            setEditingResource(null);
            setFormTitle("");
            setFormDescription("");
            setFormCategory("");
            setFormType("link");
            setFormUrl("");
            setFormVisibleManager(true);
        }
        setDialogOpen(true);
    };

    const handleSaveResource = async () => {
        if (!formTitle.trim() || !formCategory.trim()) return;
        const visibleToRole: UserRole[] = ["admin"];
        if (formVisibleManager) visibleToRole.push("manager", "team_member");

        try {
            if (editingResource) {
                const { error } = await supabase.from("resources").update({
                    title: formTitle.trim(),
                    description: formDescription.trim() || null,
                    category: formCategory.trim(),
                    type: formType,
                    url: formType !== "file" ? formUrl.trim() || null : null,
                    file_path: formType === "file" ? formUrl.trim() || null : null,
                    visible_to_roles: visibleToRole,
                }).eq("id", editingResource.id);
                if (error) throw error;
            } else {
                const categoryResources = resources.filter((r) => r.category === formCategory.trim());
                const maxOrder = categoryResources.reduce((max, r) => Math.max(max, r.displayOrder), 0);
                
                const { error } = await supabase.from("resources").insert({
                    title: formTitle.trim(),
                    description: formDescription.trim() || null,
                    category: formCategory.trim(),
                    type: formType,
                    url: formType !== "file" ? formUrl.trim() || null : null,
                    file_path: formType === "file" ? formUrl.trim() || null : null,
                    display_order: maxOrder + 1,
                    visible_to_roles: visibleToRole,
                });
                if (error) throw error;
            }
            loadData();
            setDialogOpen(false);
        } catch (error) {
            console.error("Error saving resource:", error);
        }
    };

    const moveResource = async (resourceId: string, category: string, direction: "up" | "down") => {
        const catResources = resources.filter((r) => r.category === category).sort((a, b) => a.displayOrder - b.displayOrder);
        const idx = catResources.findIndex((r) => r.id === resourceId);
        if ((direction === "up" && idx === 0) || (direction === "down" && idx === catResources.length - 1)) return;
        
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        const currentRes = catResources[idx];
        const targetRes = catResources[swapIdx];

        try {
            await Promise.all([
                supabase.from("resources").update({ display_order: targetRes.displayOrder }).eq("id", currentRes.id),
                supabase.from("resources").update({ display_order: currentRes.displayOrder }).eq("id", targetRes.id),
            ]);
            loadData();
        } catch (err) {
            console.error("Error moving resource:", err);
        }
    };

    const toggleVisibility = async (id: string, currentRoles: UserRole[]) => {
        const hasManager = currentRoles.includes("manager");
        const visibleToRole: UserRole[] = hasManager
            ? currentRoles.filter((role) => role !== "manager" && role !== "team_member")
            : [...currentRoles, "manager", "team_member"];
        
        try {
            const { error } = await supabase.from("resources").update({ visible_to_roles: visibleToRole }).eq("id", id);
            if (error) throw error;
            loadData();
        } catch (err) {
            console.error("Error toggling visibility:", err);
        }
    };

    const requestDelete = (id: string) => {
        setDeleteId(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            const { error } = await supabase.from("resources").delete().eq("id", deleteId);
            if (error) throw error;
            loadData();
        } catch (err) {
            console.error("Error deleting resource:", err);
        } finally {
            setDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-heading font-semibold text-foreground">Resources Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage resources, documents, and links available to managers.
                    </p>
                </div>
                <Button onClick={() => openDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Resource
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="relative flex-1 w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search resources..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-full sm:w-[200px] h-9">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {filteredResources.length} resource{filteredResources.length !== 1 ? "s" : ""}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Resources Table */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card>
                    <CardContent className="p-0">
                        {filteredResources.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-5 w-10"></TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-center">Visible</TableHead>
                                        <TableHead className="text-right pr-5">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredResources.map((resource, idx) => {
                                        const Icon = typeIcons[resource.type];
                                        const isVisible = resource.visibleToRole.includes("manager");
                                        return (
                                            <TableRow key={resource.id}>
                                                <TableCell className="pl-5">
                                                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${typeColors[resource.type]}`}>
                                                        <Icon className="h-3.5 w-3.5" />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground">{resource.title}</p>
                                                        {resource.description && (
                                                            <p className="text-xs text-muted-foreground truncate max-w-xs">{resource.description}</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px]">{resource.category}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`text-[10px] ${typeColors[resource.type]}`}>{typeLabels[resource.type]}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleVisibility(resource.id, resource.visibleToRole)}>
                                                        {isVisible ? (
                                                            <Eye className="h-3.5 w-3.5 text-success" />
                                                        ) : (
                                                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                                        )}
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="text-right pr-5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveResource(resource.id, resource.category, "up")} disabled={idx === 0}>
                                                            <ArrowUp className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveResource(resource.id, resource.category, "down")} disabled={idx === filteredResources.length - 1}>
                                                            <ArrowDown className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDialog(resource)}>
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => requestDelete(resource.id)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="p-12 text-center">
                                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No resources found.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Resource Dialog */}
            <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
                <SheetContent className="sm:max-w-md md:max-w-lg overflow-y-auto w-full">
                    <SheetHeader>
                        <SheetTitle>{editingResource ? "Edit Resource" : "Add Resource"}</SheetTitle>
                        <SheetDescription>
                            {editingResource ? "Update the resource details." : "Create a new resource for managers."}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="res-title">Title</Label>
                            <Input id="res-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. CRM Training Video" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="res-desc">Description</Label>
                            <Textarea id="res-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" rows={2} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="res-category">Category</Label>
                                <Input id="res-category" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} placeholder="e.g. Training Materials" list="category-list" />
                                <datalist id="category-list">
                                    {categories.map((cat) => <option key={cat} value={cat} />)}
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="res-type">Resource Type</Label>
                                <Select value={formType} onValueChange={(v) => setFormType(v as ResourceType)}>
                                    <SelectTrigger id="res-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(Object.entries(typeLabels) as [ResourceType, string][]).map(([val, label]) => (
                                            <SelectItem key={val} value={val}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="res-url">{formType === "file" ? "File Path" : "URL"}</Label>
                            <Input id="res-url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder={formType === "file" ? "/files/document.pdf" : "https://..."} />
                        </div>
                        <div className="flex items-center justify-between mt-2 p-2 border rounded-md">
                            <Label htmlFor="res-visible" className="text-sm">Visible to Managers</Label>
                            <Switch id="res-visible" checked={formVisibleManager} onCheckedChange={setFormVisibleManager} />
                        </div>
                    </div>
                    <SheetFooter className="mt-6 flex gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveResource} disabled={!formTitle.trim() || !formCategory.trim()}>
                            {editingResource ? "Save Changes" : "Add Resource"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Resource</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this resource. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AdminResourcesManagement;
