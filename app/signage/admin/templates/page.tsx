"use client";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Home, Star, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Id } from "@/convex/_generated/dataModel";
import type { Doc } from "@/convex/_generated/dataModel";

export default function TemplatesPage() {
  const templates = useQuery(api.queries.getTemplates) ?? [];
  const createTemplate = useMutation(api.mutations.createTemplate);
  const updateTemplate = useMutation(api.mutations.updateTemplate);
  const deleteTemplate = useMutation(api.mutations.deleteTemplate);
  const setDefaultTemplate = useMutation(api.mutations.setDefaultTemplate);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"templates"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"templates"> | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    layoutType: "grid" as "grid" | "list" | "featured",
    columns: 3,
    showPrices: true,
    showImages: true,
    isDefault: false,
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) return;

    await createTemplate({
      name: formData.name,
      slug: formData.slug,
      layoutType: formData.layoutType,
      columns: formData.layoutType === "grid" ? formData.columns : undefined,
      showPrices: formData.showPrices,
      showImages: formData.showImages,
      isDefault: formData.isDefault,
    });

    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = (template: Doc<"templates">) => {
    setEditingId(template._id);
    setFormData({
      name: template.name,
      slug: template.slug,
      layoutType: template.layoutType,
      columns: template.columns ?? 3,
      showPrices: template.showPrices,
      showImages: template.showImages,
      isDefault: template.isDefault,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    await updateTemplate({
      id: editingId,
      name: formData.name,
      slug: formData.slug,
      layoutType: formData.layoutType,
      columns: formData.layoutType === "grid" ? formData.columns : undefined,
      showPrices: formData.showPrices,
      showImages: formData.showImages,
      isDefault: formData.isDefault,
    });

    setEditingId(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteTemplate({ id: deletingId });
    setDeletingId(null);
  };

  const handleSetDefault = async (id: Id<"templates">) => {
    await setDefaultTemplate({ id });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      layoutType: "grid",
      columns: 3,
      showPrices: true,
      showImages: true,
      isDefault: false,
    });
  };

  const getLayoutTypeLabel = (type: string) => {
    switch (type) {
      case "grid":
        return "Grid";
      case "list":
        return "List";
      case "featured":
        return "Featured";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Digital Signage Admin</h1>
          <Link href="/">
            <Button variant="ghost" size="icon" title="Go to Home">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex">
        <aside className="w-64 border-r p-4">
          <AdminNav />
        </aside>
        <main className="flex-1 p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Templates</h2>
              <p className="text-muted-foreground mt-2">
                Manage display templates for dynamic screens
              </p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Template</DialogTitle>
                  <DialogDescription>
                    Create a new template for displaying products
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Grid 3 Columns"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      placeholder="grid-3-columns"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="layoutType">Layout Type</Label>
                    <Select
                      value={formData.layoutType}
                      onValueChange={(value: "grid" | "list" | "featured") =>
                        setFormData({ ...formData, layoutType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="list">List</SelectItem>
                        <SelectItem value="featured">Featured</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.layoutType === "grid" && (
                    <div className="grid gap-2">
                      <Label htmlFor="columns">Columns</Label>
                      <Select
                        value={formData.columns.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            columns: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Columns</SelectItem>
                          <SelectItem value="3">3 Columns</SelectItem>
                          <SelectItem value="4">4 Columns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showPrices">Show Prices</Label>
                    <Switch
                      id="showPrices"
                      checked={formData.showPrices}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, showPrices: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showImages">Show Images</Label>
                    <Switch
                      id="showImages"
                      checked={formData.showImages}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, showImages: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isDefault">Set as Default Template</Label>
                    <Switch
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isDefault: checked })
                      }
                    />
                  </div>
                  <Button onClick={handleCreate}>Create Template</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Layout Type</TableHead>
                  <TableHead>Columns</TableHead>
                  <TableHead>Show Prices</TableHead>
                  <TableHead>Show Images</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No templates found. Create your first template to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template._id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.slug}</TableCell>
                      <TableCell>{getLayoutTypeLabel(template.layoutType)}</TableCell>
                      <TableCell>
                        {template.layoutType === "grid"
                          ? template.columns ?? "N/A"
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {template.showPrices ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.showImages ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {template.isDefault ? (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(template._id)}
                          >
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(template._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {editingId && (
            <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Template</DialogTitle>
                  <DialogDescription>
                    Update template details
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-slug">Slug</Label>
                    <Input
                      id="edit-slug"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-layoutType">Layout Type</Label>
                    <Select
                      value={formData.layoutType}
                      onValueChange={(value: "grid" | "list" | "featured") =>
                        setFormData({ ...formData, layoutType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="list">List</SelectItem>
                        <SelectItem value="featured">Featured</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.layoutType === "grid" && (
                    <div className="grid gap-2">
                      <Label htmlFor="edit-columns">Columns</Label>
                      <Select
                        value={formData.columns.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            columns: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Columns</SelectItem>
                          <SelectItem value="3">3 Columns</SelectItem>
                          <SelectItem value="4">4 Columns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-showPrices">Show Prices</Label>
                    <Switch
                      id="edit-showPrices"
                      checked={formData.showPrices}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, showPrices: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-showImages">Show Images</Label>
                    <Switch
                      id="edit-showImages"
                      checked={formData.showImages}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, showImages: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-isDefault">Set as Default Template</Label>
                    <Switch
                      id="edit-isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isDefault: checked })
                      }
                    />
                  </div>
                  <Button onClick={handleUpdate}>Update Template</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {deletingId && (
            <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Template</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this template? This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeletingId(null)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
}

