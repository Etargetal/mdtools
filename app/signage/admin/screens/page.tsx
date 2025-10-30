"use client";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Edit,
  Trash2,
  Home,
  ExternalLink,
  Monitor,
  Image as ImageIcon,
  Grid3x3,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Id } from "@/convex/_generated/dataModel";
import type { Doc } from "@/convex/_generated/dataModel";

export default function ScreensPage() {
  const screens = useQuery(api.queries.getScreens) ?? [];
  const locations = useQuery(api.queries.getLocations) ?? [];
  const products = useQuery(api.queries.getActiveProducts) ?? [];
  const templates = useQuery(api.queries.getTemplates) ?? [];

  // Group screens by location
  const screensByLocation = locations.map((location) => ({
    location,
    screens: screens.filter((screen) => screen.locationId === location._id),
  }));

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
          <div className="mb-8">
            <h2 className="text-3xl font-bold">Screens</h2>
            <p className="text-muted-foreground mt-2">
              Manage your display screens and their configurations
            </p>
          </div>

          <ScreenManagement
            screens={screens}
            locations={locations}
            products={products}
            templates={templates}
          />
        </main>
      </div>
    </div>
  );
}

function ScreenManagement({
  screens,
  locations,
  products,
  templates,
}: {
  screens: Doc<"screens">[];
  locations: Doc<"locations">[];
  products: Doc<"products">[];
  templates: Doc<"templates">[];
}) {
  const createScreen = useMutation(api.mutations.createScreen);
  const updateScreen = useMutation(api.mutations.updateScreen);
  const deleteScreen = useMutation(api.mutations.deleteScreen);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"screens"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"screens"> | null>(null);

  const [formData, setFormData] = useState({
    screenId: "",
    name: "",
    locationId: "" as Id<"locations"> | "",
    mode: "dynamic" as "dynamic" | "static",
    // Dynamic config
    productIds: [] as Id<"products">[],
    templateId: "" as Id<"templates"> | "",
    backgroundImage: "",
    // Static config
    imageUrl: "",
    // Layout config
    orientation: "landscape" as "landscape" | "portrait",
    refreshInterval: 300,
    status: "active" as "active" | "inactive" | "maintenance",
  });

  const handleCreate = async () => {
    if (!formData.screenId || !formData.name || !formData.locationId) return;
    if (formData.mode === "dynamic" && !formData.templateId) return;
    if (formData.mode === "static" && !formData.imageUrl) return;

    await createScreen({
      screenId: formData.screenId,
      name: formData.name,
      locationId: formData.locationId as Id<"locations">,
      mode: formData.mode,
      dynamicConfig:
        formData.mode === "dynamic"
          ? {
              productIds: formData.productIds,
              templateId: formData.templateId as Id<"templates">,
              backgroundImage: formData.backgroundImage || undefined,
            }
          : undefined,
      staticConfig:
        formData.mode === "static"
          ? {
              imageUrl: formData.imageUrl,
            }
          : undefined,
      layoutConfig: {
        orientation: formData.orientation,
        refreshInterval: formData.refreshInterval,
      },
    });

    setIsCreateOpen(false);
    resetForm();
  };

  const handleEdit = (screen: Doc<"screens">) => {
    setEditingId(screen._id);
    setFormData({
      screenId: screen.screenId,
      name: screen.name,
      locationId: screen.locationId,
      mode: screen.mode,
      productIds: screen.dynamicConfig?.productIds ?? [],
      templateId: screen.dynamicConfig?.templateId ?? ("" as Id<"templates"> | ""),
      backgroundImage: screen.dynamicConfig?.backgroundImage ?? "",
      imageUrl: screen.staticConfig?.imageUrl ?? "",
      orientation: screen.layoutConfig.orientation,
      refreshInterval: screen.layoutConfig.refreshInterval,
      status: screen.status,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (formData.mode === "dynamic" && !formData.templateId) return;
    if (formData.mode === "static" && !formData.imageUrl) return;

    await updateScreen({
      id: editingId,
      screenId: formData.screenId,
      name: formData.name,
      locationId: formData.locationId as Id<"locations">,
      mode: formData.mode,
      dynamicConfig:
        formData.mode === "dynamic"
          ? {
              productIds: formData.productIds,
              templateId: formData.templateId as Id<"templates">,
              backgroundImage: formData.backgroundImage || undefined,
            }
          : undefined,
      staticConfig:
        formData.mode === "static"
          ? {
              imageUrl: formData.imageUrl,
            }
          : undefined,
      layoutConfig: {
        orientation: formData.orientation,
        refreshInterval: formData.refreshInterval,
      },
      status: formData.status,
    });

    setEditingId(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteScreen({ id: deletingId });
    setDeletingId(null);
  };

  const resetForm = () => {
    setFormData({
      screenId: "",
      name: "",
      locationId: "" as Id<"locations"> | "",
      mode: "dynamic",
      productIds: [],
      templateId: "" as Id<"templates"> | "",
      backgroundImage: "",
      imageUrl: "",
      orientation: "landscape",
      refreshInterval: 300,
      status: "active",
    });
  };

  const toggleProductSelection = (productId: Id<"products">) => {
    setFormData({
      ...formData,
      productIds: formData.productIds.includes(productId)
        ? formData.productIds.filter((id) => id !== productId)
        : [...formData.productIds, productId],
    });
  };

  const getModeIcon = (mode: string) => {
    return mode === "dynamic" ? (
      <Grid3x3 className="h-4 w-4" />
    ) : (
      <ImageIcon className="h-4 w-4" />
    );
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      inactive: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
      maintenance: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
          colors[status as keyof typeof colors]
        }`}
      >
        {status}
      </span>
    );
  };

  // Group screens by location
  const screensByLocation = locations.map((location) => ({
    location,
    screens: screens.filter((screen) => screen.locationId === location._id),
  }));

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Create Screen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Screen</DialogTitle>
              <DialogDescription>
                Configure a new display screen
              </DialogDescription>
            </DialogHeader>
            <ScreenForm
              formData={formData}
              setFormData={setFormData}
              locations={locations}
              products={products}
              templates={templates}
              onSubmit={handleCreate}
              onCancel={() => setIsCreateOpen(false)}
              toggleProductSelection={toggleProductSelection}
            />
          </DialogContent>
        </Dialog>
      </div>

      {screensByLocation.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No locations found. Create a location first, then add screens.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {screensByLocation.map(({ location, screens: locationScreens }) => (
            <Card key={location._id}>
              <CardHeader>
                <CardTitle>{location.name}</CardTitle>
                <CardDescription>
                  {locationScreens.length} screen{locationScreens.length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {locationScreens.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No screens configured for this location.
                  </p>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Screen ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Orientation</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locationScreens.map((screen) => (
                          <TableRow key={screen._id}>
                            <TableCell className="font-mono text-sm">
                              {screen.screenId}
                            </TableCell>
                            <TableCell className="font-medium">{screen.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getModeIcon(screen.mode)}
                                <span className="capitalize">{screen.mode}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(screen.status)}</TableCell>
                            <TableCell className="capitalize">
                              {screen.layoutConfig.orientation}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/signage/display/${screen.screenId}`}
                                  target="_blank"
                                >
                                  <Button variant="ghost" size="sm" title="Preview">
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(screen)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingId(screen._id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingId && (
        <Dialog open={!!editingId} onOpenChange={() => setEditingId(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Screen</DialogTitle>
              <DialogDescription>
                Update screen configuration
              </DialogDescription>
            </DialogHeader>
            <ScreenForm
              formData={formData}
              setFormData={setFormData}
              locations={locations}
              products={products}
              templates={templates}
              onSubmit={handleUpdate}
              onCancel={() => setEditingId(null)}
              toggleProductSelection={toggleProductSelection}
              isEdit={true}
            />
          </DialogContent>
        </Dialog>
      )}

      {deletingId && (
        <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Screen</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this screen? This action cannot be undone.
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
    </>
  );
}

function ScreenForm({
  formData,
  setFormData,
  locations,
  products,
  templates,
  onSubmit,
  onCancel,
  toggleProductSelection,
  isEdit = false,
}: {
  formData: any;
  setFormData: (data: any) => void;
  locations: Doc<"locations">[];
  products: Doc<"products">[];
  templates: Doc<"templates">[];
  onSubmit: () => void;
  onCancel: () => void;
  toggleProductSelection: (id: Id<"products">) => void;
  isEdit?: boolean;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="screenId">Screen ID (URL slug)</Label>
        <Input
          id="screenId"
          value={formData.screenId}
          onChange={(e) => setFormData({ ...formData, screenId: e.target.value })}
          placeholder="teplice-main-left"
          disabled={isEdit}
        />
        <p className="text-xs text-muted-foreground">
          Used in URL: /signage/display/[screenId]
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Teplice - Main Left Screen"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="locationId">Location</Label>
        <Select
          value={formData.locationId}
          onValueChange={(value) =>
            setFormData({ ...formData, locationId: value })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location._id} value={location._id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={formData.mode} onValueChange={(value) => setFormData({ ...formData, mode: value })}>
        <TabsList>
          <TabsTrigger value="dynamic">Dynamic Mode</TabsTrigger>
          <TabsTrigger value="static">Static Mode</TabsTrigger>
        </TabsList>
        <TabsContent value="dynamic" className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="templateId">Template</Label>
            <Select
              value={formData.templateId}
              onValueChange={(value) =>
                setFormData({ ...formData, templateId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template._id} value={template._id}>
                    {template.name}
                    {template.isDefault && " (Default)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Products</Label>
            <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active products available. Create products first.
                </p>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => (
                    <div
                      key={product._id}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id={`product-${product._id}`}
                        checked={formData.productIds.includes(product._id)}
                        onChange={() => toggleProductSelection(product._id)}
                        className="rounded"
                      />
                      <label
                        htmlFor={`product-${product._id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {product.name} - {product.price} Kč
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Selected: {formData.productIds.length} product{formData.productIds.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="backgroundImage">Background Image URL (Optional)</Label>
            <Input
              id="backgroundImage"
              value={formData.backgroundImage}
              onChange={(e) =>
                setFormData({ ...formData, backgroundImage: e.target.value })
              }
              placeholder="https://example.com/image.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Overrides location default background
            </p>
          </div>
        </TabsContent>
        <TabsContent value="static" className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) =>
                setFormData({ ...formData, imageUrl: e.target.value })
              }
              placeholder="https://example.com/static-image.jpg"
            />
            <p className="text-xs text-muted-foreground">
              Full URL to the static image to display
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="border-t pt-4 space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="orientation">Orientation</Label>
          <Select
            value={formData.orientation}
            onValueChange={(value: "landscape" | "portrait") =>
              setFormData({ ...formData, orientation: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="landscape">Landscape</SelectItem>
              <SelectItem value="portrait">Portrait</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
          <Input
            id="refreshInterval"
            type="number"
            value={formData.refreshInterval}
            onChange={(e) =>
              setFormData({
                ...formData,
                refreshInterval: parseInt(e.target.value) || 300,
              })
            }
            min={60}
          />
          <p className="text-xs text-muted-foreground">
            Default: 300 seconds (5 minutes)
          </p>
        </div>
        {isEdit && (
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: "active" | "inactive" | "maintenance") =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          {isEdit ? "Update" : "Create"} Screen
        </Button>
      </div>
    </div>
  );
}

