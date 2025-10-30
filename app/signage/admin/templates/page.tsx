"use client";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Home, Star, Copy, Check, X } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TemplatesPage() {
  const templates = useQuery(api.queries.getTemplates) ?? [];
  const createTemplate = useMutation(api.mutations.createTemplate);
  const updateTemplate = useMutation(api.mutations.updateTemplate);
  const deleteTemplate = useMutation(api.mutations.deleteTemplate);
  const setDefaultTemplate = useMutation(api.mutations.setDefaultTemplate);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"templates"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"templates"> | null>(null);

  const generateUploadUrl = useAction(api.files.generateUploadUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    layoutType: "grid" as "grid" | "list" | "featured" | "columns",
    columns: 3,
    showPrices: true,
    showImages: true,
    isDefault: false,
    // Column layout config
    config: {
      numberOfColumns: 3,
      showHeader: false,
      headerLogo: undefined as string | undefined,
      columnColors: ["#FF8C00", "#FFD700"] as string[], // Default orange and yellow
      showColumnSeparators: true,
      separatorColor: "#000000",
      columnPadding: 16,
      textColor: "#000000",
      priceColor: "#000000",
      imagePosition: "bottom" as "top" | "bottom",
    },
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) return;

    const config = formData.layoutType === "columns" ? formData.config : undefined;

    await createTemplate({
      name: formData.name,
      slug: formData.slug,
      layoutType: formData.layoutType,
      columns: formData.layoutType === "grid" ? formData.columns : undefined,
      showPrices: formData.showPrices,
      showImages: formData.showImages,
      config,
      isDefault: formData.isDefault,
    });

    setIsCreateOpen(false);
    resetForm();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          headerLogo: storageId,
        },
      });
    } catch (error) {
      console.error("Failed to upload logo:", error);
    } finally {
      setLogoUploading(false);
    }
  };

  const updateColumnColor = (index: number, color: string) => {
    const newColors = [...formData.config.columnColors];
    newColors[index] = color;
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        columnColors: newColors,
      },
    });
  };

  const updateNumberOfColumns = (count: number) => {
    const currentColors = formData.config.columnColors;
    const newColors: string[] = [];

    // Generate alternating colors pattern
    for (let i = 0; i < count; i++) {
      if (i < currentColors.length) {
        newColors[i] = currentColors[i];
      } else {
        // Alternate between orange and yellow
        newColors[i] = i % 2 === 0 ? "#FF8C00" : "#FFD700";
      }
    }

    setFormData({
      ...formData,
      config: {
        ...formData.config,
        numberOfColumns: count,
        columnColors: newColors,
      },
    });
  };

  const handleEdit = (template: Doc<"templates">) => {
    setEditingId(template._id);
    const config = template.config as any || {};
    setFormData({
      name: template.name,
      slug: template.slug,
      layoutType: template.layoutType,
      columns: template.columns ?? 3,
      showPrices: template.showPrices,
      showImages: template.showImages,
      isDefault: template.isDefault,
      config: {
        numberOfColumns: config.numberOfColumns ?? 3,
        showHeader: config.showHeader ?? false,
        headerLogo: config.headerLogo,
        columnColors: config.columnColors ?? ["#FF8C00", "#FFD700"],
        showColumnSeparators: config.showColumnSeparators ?? true,
        separatorColor: config.separatorColor ?? "#000000",
        columnPadding: config.columnPadding ?? 16,
        textColor: config.textColor ?? "#000000",
        priceColor: config.priceColor ?? "#000000",
        imagePosition: config.imagePosition ?? "bottom",
      },
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    const config = formData.layoutType === "columns" ? formData.config : undefined;

    await updateTemplate({
      id: editingId,
      name: formData.name,
      slug: formData.slug,
      layoutType: formData.layoutType,
      columns: formData.layoutType === "grid" ? formData.columns : undefined,
      showPrices: formData.showPrices,
      showImages: formData.showImages,
      config,
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
      config: {
        numberOfColumns: 3,
        showHeader: false,
        headerLogo: undefined,
        columnColors: ["#FF8C00", "#FFD700"],
        showColumnSeparators: true,
        separatorColor: "#000000",
        columnPadding: 16,
        textColor: "#000000",
        priceColor: "#000000",
        imagePosition: "bottom",
      },
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
      case "columns":
        return "Columns";
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
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Template</DialogTitle>
                  <DialogDescription>
                    Create a new template for displaying products
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="layout">Layout</TabsTrigger>
                    <TabsTrigger value="columns" disabled={formData.layoutType !== "columns"}>
                      Columns
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 mt-4">
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
                        onValueChange={(value: "grid" | "list" | "featured" | "columns") =>
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
                          <SelectItem value="columns">Columns (Menu Style)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                  </TabsContent>
                  <TabsContent value="layout" className="space-y-4 mt-4">
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
                    {formData.layoutType === "columns" && (
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="numberOfColumns">Number of Product Columns</Label>
                          <Select
                            value={formData.config.numberOfColumns.toString()}
                            onValueChange={(value) =>
                              updateNumberOfColumns(parseInt(value))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 Columns</SelectItem>
                              <SelectItem value="3">3 Columns</SelectItem>
                              <SelectItem value="4">4 Columns</SelectItem>
                              <SelectItem value="5">5 Columns</SelectItem>
                              <SelectItem value="6">6 Columns</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showHeader">Show Header with Logo</Label>
                          <Switch
                            id="showHeader"
                            checked={formData.config.showHeader}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                config: { ...formData.config, showHeader: checked },
                              })
                            }
                          />
                        </div>
                        {formData.config.showHeader && (
                          <div className="grid gap-2">
                            <Label htmlFor="headerLogo">Header Logo</Label>
                            <div className="flex items-center gap-2">
                              <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => logoInputRef.current?.click()}
                                disabled={logoUploading}
                              >
                                {logoUploading ? "Uploading..." : "Upload Logo"}
                              </Button>
                              {formData.config.headerLogo && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      config: { ...formData.config, headerLogo: undefined },
                                    })
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="grid gap-2">
                          <Label>Column Colors</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: formData.config.numberOfColumns }).map(
                              (_, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Label className="text-sm">Column {index + 1}</Label>
                                  <input
                                    type="color"
                                    value={formData.config.columnColors[index] || "#FF8C00"}
                                    onChange={(e) => updateColumnColor(index, e.target.value)}
                                    className="w-16 h-10 rounded border"
                                  />
                                </div>
                              )
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="showSeparators">Show Column Separators</Label>
                          <Switch
                            id="showSeparators"
                            checked={formData.config.showColumnSeparators}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                config: { ...formData.config, showColumnSeparators: checked },
                              })
                            }
                          />
                        </div>
                        {formData.config.showColumnSeparators && (
                          <div className="grid gap-2">
                            <Label htmlFor="separatorColor">Separator Color</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={formData.config.separatorColor}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    config: {
                                      ...formData.config,
                                      separatorColor: e.target.value,
                                    },
                                  })
                                }
                                className="w-16 h-10 rounded border"
                              />
                              <Input
                                value={formData.config.separatorColor}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    config: {
                                      ...formData.config,
                                      separatorColor: e.target.value,
                                    },
                                  })
                                }
                                placeholder="#000000"
                              />
                            </div>
                          </div>
                        )}
                        <div className="grid gap-2">
                          <Label htmlFor="imagePosition">Image Position</Label>
                          <Select
                            value={formData.config.imagePosition}
                            onValueChange={(value: "top" | "bottom") =>
                              setFormData({
                                ...formData,
                                config: { ...formData.config, imagePosition: value },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">Top</SelectItem>
                              <SelectItem value="bottom">Bottom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="columnPadding">Column Padding (px)</Label>
                          <Input
                            id="columnPadding"
                            type="number"
                            value={formData.config.columnPadding}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  columnPadding: parseInt(e.target.value) || 16,
                                },
                              })
                            }
                            min="0"
                            max="100"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="textColor">Text Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.config.textColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, textColor: e.target.value },
                                })
                              }
                              className="w-16 h-10 rounded border"
                            />
                            <Input
                              value={formData.config.textColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, textColor: e.target.value },
                                })
                              }
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="priceColor">Price Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.config.priceColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, priceColor: e.target.value },
                                })
                              }
                              className="w-16 h-10 rounded border"
                            />
                            <Input
                              value={formData.config.priceColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, priceColor: e.target.value },
                                })
                              }
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="columns" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Configure column-specific settings for the menu-style layout.
                    </p>
                  </TabsContent>
                </Tabs>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
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
                          : template.layoutType === "columns"
                            ? (template.config as any)?.numberOfColumns ?? "N/A"
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
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Template</DialogTitle>
                  <DialogDescription>
                    Update template details
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="layout">Layout</TabsTrigger>
                    <TabsTrigger value="columns" disabled={formData.layoutType !== "columns"}>
                      Columns
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="basic" className="space-y-4 mt-4">
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
                        onValueChange={(value: "grid" | "list" | "featured" | "columns") =>
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
                          <SelectItem value="columns">Columns (Menu Style)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                  </TabsContent>
                  <TabsContent value="layout" className="space-y-4 mt-4">
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
                    {formData.layoutType === "columns" && (
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="edit-numberOfColumns">Number of Product Columns</Label>
                          <Select
                            value={formData.config.numberOfColumns.toString()}
                            onValueChange={(value) =>
                              updateNumberOfColumns(parseInt(value))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 Columns</SelectItem>
                              <SelectItem value="3">3 Columns</SelectItem>
                              <SelectItem value="4">4 Columns</SelectItem>
                              <SelectItem value="5">5 Columns</SelectItem>
                              <SelectItem value="6">6 Columns</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="edit-showHeader">Show Header with Logo</Label>
                          <Switch
                            id="edit-showHeader"
                            checked={formData.config.showHeader}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                config: { ...formData.config, showHeader: checked },
                              })
                            }
                          />
                        </div>
                        {formData.config.showHeader && (
                          <div className="grid gap-2">
                            <Label htmlFor="edit-headerLogo">Header Logo</Label>
                            <div className="flex items-center gap-2">
                              <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => logoInputRef.current?.click()}
                                disabled={logoUploading}
                              >
                                {logoUploading ? "Uploading..." : "Upload Logo"}
                              </Button>
                              {formData.config.headerLogo && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setFormData({
                                      ...formData,
                                      config: { ...formData.config, headerLogo: undefined },
                                    })
                                  }
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="grid gap-2">
                          <Label>Column Colors</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {Array.from({ length: formData.config.numberOfColumns }).map(
                              (_, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Label className="text-sm">Column {index + 1}</Label>
                                  <input
                                    type="color"
                                    value={formData.config.columnColors[index] || "#FF8C00"}
                                    onChange={(e) => updateColumnColor(index, e.target.value)}
                                    className="w-16 h-10 rounded border"
                                  />
                                </div>
                              )
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="edit-showSeparators">Show Column Separators</Label>
                          <Switch
                            id="edit-showSeparators"
                            checked={formData.config.showColumnSeparators}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                config: { ...formData.config, showColumnSeparators: checked },
                              })
                            }
                          />
                        </div>
                        {formData.config.showColumnSeparators && (
                          <div className="grid gap-2">
                            <Label htmlFor="edit-separatorColor">Separator Color</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={formData.config.separatorColor}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    config: {
                                      ...formData.config,
                                      separatorColor: e.target.value,
                                    },
                                  })
                                }
                                className="w-16 h-10 rounded border"
                              />
                              <Input
                                value={formData.config.separatorColor}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    config: {
                                      ...formData.config,
                                      separatorColor: e.target.value,
                                    },
                                  })
                                }
                                placeholder="#000000"
                              />
                            </div>
                          </div>
                        )}
                        <div className="grid gap-2">
                          <Label htmlFor="edit-imagePosition">Image Position</Label>
                          <Select
                            value={formData.config.imagePosition}
                            onValueChange={(value: "top" | "bottom") =>
                              setFormData({
                                ...formData,
                                config: { ...formData.config, imagePosition: value },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="top">Top</SelectItem>
                              <SelectItem value="bottom">Bottom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-columnPadding">Column Padding (px)</Label>
                          <Input
                            id="edit-columnPadding"
                            type="number"
                            value={formData.config.columnPadding}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                config: {
                                  ...formData.config,
                                  columnPadding: parseInt(e.target.value) || 16,
                                },
                              })
                            }
                            min="0"
                            max="100"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-textColor">Text Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.config.textColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, textColor: e.target.value },
                                })
                              }
                              className="w-16 h-10 rounded border"
                            />
                            <Input
                              value={formData.config.textColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, textColor: e.target.value },
                                })
                              }
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="edit-priceColor">Price Color</Label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={formData.config.priceColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, priceColor: e.target.value },
                                })
                              }
                              className="w-16 h-10 rounded border"
                            />
                            <Input
                              value={formData.config.priceColor}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  config: { ...formData.config, priceColor: e.target.value },
                                })
                              }
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="columns" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Configure column-specific settings for the menu-style layout.
                    </p>
                  </TabsContent>
                </Tabs>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
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

