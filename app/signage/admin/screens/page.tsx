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
  Upload,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect, useRef } from "react";
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
    imageUrls: [] as string[],
    rotationInterval: 10,
    // Layout config
    orientation: "landscape" as "landscape" | "portrait",
    refreshInterval: 300,
    status: "active" as "active" | "inactive" | "maintenance",
  });

  const handleCreate = async () => {
    if (!formData.screenId || !formData.name || !formData.locationId) return;
    if (formData.mode === "dynamic" && !formData.templateId) return;
    if (formData.mode === "static" && formData.imageUrls.length === 0 && !formData.imageUrl) return;

    // Use first image from imageUrls as primary, or fall back to imageUrl
    const primaryImage = formData.imageUrls.length > 0 ? formData.imageUrls[0] : formData.imageUrl;

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
            imageUrl: primaryImage,
            imageUrls: formData.imageUrls.length > 0 ? formData.imageUrls : undefined,
            rotationInterval: formData.imageUrls.length > 1 ? formData.rotationInterval : undefined,
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
      imageUrls: screen.staticConfig?.imageUrls ?? [],
      rotationInterval: screen.staticConfig?.rotationInterval ?? 10,
      orientation: screen.layoutConfig.orientation,
      refreshInterval: screen.layoutConfig.refreshInterval,
      status: screen.status,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (formData.mode === "dynamic" && !formData.templateId) return;
    if (formData.mode === "static" && formData.imageUrls.length === 0 && !formData.imageUrl) return;

    // Use first image from imageUrls as primary, or fall back to imageUrl
    const primaryImage = formData.imageUrls.length > 0 ? formData.imageUrls[0] : formData.imageUrl;

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
            imageUrl: primaryImage,
            imageUrls: formData.imageUrls.length > 0 ? formData.imageUrls : undefined,
            rotationInterval: formData.imageUrls.length > 1 ? formData.rotationInterval : undefined,
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
      imageUrls: [],
      rotationInterval: 10,
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
        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colors[status as keyof typeof colors]
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
            <Label>Background Image (Optional)</Label>
            <ImageUploader
              value={formData.backgroundImage}
              onChange={(value) => setFormData({ ...formData, backgroundImage: value })}
              placeholder="Upload or paste URL"
            />
            <p className="text-xs text-muted-foreground">
              Overrides location default background
            </p>
          </div>
        </TabsContent>
        <TabsContent value="static" className="space-y-4">
          <div className="grid gap-2">
            <Label>Static Images</Label>
            <MultiImageSelector
              images={formData.imageUrls}
              onChange={(urls) => setFormData({ ...formData, imageUrls: urls })}
            />
            <p className="text-xs text-muted-foreground">
              Add multiple images to rotate on the display. Click and drag to reorder.
            </p>
          </div>
          {formData.imageUrls.length > 1 && (
            <div className="grid gap-2">
              <Label htmlFor="rotationInterval">Rotation Interval (seconds)</Label>
              <Input
                id="rotationInterval"
                type="number"
                value={formData.rotationInterval}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rotationInterval: parseInt(e.target.value) || 10,
                  })
                }
                min={1}
              />
              <p className="text-xs text-muted-foreground">
                Time between image rotations (default: 10 seconds)
              </p>
            </div>
          )}
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

function ImageUploader({
  value,
  onChange,
  placeholder = "Upload or paste URL",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const generateUploadUrl = useAction(api.files.generateUploadUrl);
  const createStaticAsset = useMutation(api.mutations.createStaticAsset);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if value looks like a Convex storage ID
  const looksLikeStorageId = Boolean(value && /^k[a-zA-Z0-9]+$/.test(value));
  const storageUrl = useQuery(
    api.files.getStorageUrl,
    looksLikeStorageId ? { storageId: value as Id<"_storage"> } : "skip"
  );

  // Determine the display URL
  const displayUrl = looksLikeStorageId ? storageUrl : value;

  useEffect(() => {
    if (displayUrl) {
      setPreviewUrl(displayUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [displayUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload an image file (JPEG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size must be less than 10MB");
      return;
    }

    try {
      setIsUploading(true);

      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();

      // Track the upload in staticAssets
      await createStaticAsset({
        name: file.name,
        storageId: storageId as Id<"_storage">,
        fileUrl: storageId, // Will be resolved to URL when displayed
        fileSize: file.size,
        mimeType: file.type,
      });

      // Set the storage ID as the value
      onChange(storageId);

      // Create local preview
      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (newValue && !newValue.startsWith("k")) {
      setPreviewUrl(newValue);
    }
  };

  const handleClear = () => {
    onChange("");
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* URL Input with Upload Button */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={looksLikeStorageId ? "" : value}
            onChange={handleUrlChange}
            placeholder={looksLikeStorageId ? "Uploaded file" : placeholder}
            disabled={isUploading || looksLikeStorageId}
            className={looksLikeStorageId ? "text-muted-foreground" : ""}
          />
          {looksLikeStorageId && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ✓ Uploaded file
            </span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="shrink-0"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={isUploading}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Preview */}
      {previewUrl && (
        <div className="relative rounded-lg border overflow-hidden bg-muted/50">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-40 object-contain"
            onError={() => setPreviewUrl(null)}
          />
        </div>
      )}
    </div>
  );
}

function MultiImageSelector({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const generateUploadUrl = useAction(api.files.generateUploadUrl);
  const createStaticAsset = useMutation(api.mutations.createStaticAsset);
  const [isUploading, setIsUploading] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSize = 10 * 1024 * 1024;

    try {
      setIsUploading(true);
      const newImages: string[] = [];

      for (const file of Array.from(files)) {
        if (!allowedTypes.includes(file.type)) {
          console.warn(`Skipping ${file.name}: invalid type`);
          continue;
        }
        if (file.size > maxSize) {
          console.warn(`Skipping ${file.name}: too large`);
          continue;
        }

        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (response.ok) {
          const { storageId } = await response.json();

          // Track the upload in staticAssets
          await createStaticAsset({
            name: file.name,
            storageId: storageId as Id<"_storage">,
            fileUrl: storageId,
            fileSize: file.size,
            mimeType: file.type,
          });

          newImages.push(storageId);
        }
      }

      onChange([...images, ...newImages]);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload images. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    const newImages = [...images];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= images.length) return;
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    onChange(newImages);
  };

  const handleGallerySelect = (selectedImages: string[]) => {
    onChange([...images, ...selectedImages]);
    setIsGalleryOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* Action buttons */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
          multiple
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex-1"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Upload Images
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsGalleryOpen(true)}
          className="flex-1"
        >
          <ImageIcon className="h-4 w-4 mr-2" />
          Browse Gallery
        </Button>
      </div>

      {/* Image list */}
      {images.length > 0 && (
        <div className="space-y-2">
          {images.map((imageId, index) => (
            <ImageListItem
              key={`${imageId}-${index}`}
              imageId={imageId}
              index={index}
              total={images.length}
              onRemove={() => removeImage(index)}
              onMoveUp={() => moveImage(index, "up")}
              onMoveDown={() => moveImage(index, "down")}
            />
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No images added yet</p>
          <p className="text-xs mt-1">Upload images or select from gallery</p>
        </div>
      )}

      {/* Gallery picker dialog */}
      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select from Gallery</DialogTitle>
            <DialogDescription>
              Choose images from your uploaded files
            </DialogDescription>
          </DialogHeader>
          <GalleryPicker
            onSelect={handleGallerySelect}
            excludeIds={images}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImageListItem({
  imageId,
  index,
  total,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  imageId: string;
  index: number;
  total: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const looksLikeStorageId = Boolean(imageId && /^k[a-zA-Z0-9]+$/.test(imageId));
  const storageUrl = useQuery(
    api.files.getStorageUrl,
    looksLikeStorageId ? { storageId: imageId as Id<"_storage"> } : "skip"
  );
  const displayUrl = looksLikeStorageId ? storageUrl : imageId;

  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
      <div className="w-16 h-16 rounded overflow-hidden bg-muted shrink-0">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={`Image ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          Image {index + 1}
          {index === 0 && <span className="text-muted-foreground ml-1">(Primary)</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {looksLikeStorageId ? "Uploaded file" : imageId}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          disabled={index === 0}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          disabled={index === total - 1}
        >
          ↓
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function GalleryPicker({
  onSelect,
  excludeIds,
}: {
  onSelect: (images: string[]) => void;
  excludeIds: string[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "uploads" | "generated">("all");

  // Get generated files (images only)
  const generatedFiles = useQuery(api.queries.getGeneratedFiles, {
    fileType: "image",
    limit: 100,
  }) ?? [];

  // Get static assets (uploaded images)
  const staticAssets = useQuery(api.queries.getStaticAssets) ?? [];

  // Process static assets - use storageId if available, otherwise fileUrl
  const uploadedImages = staticAssets.map((a) => ({
    id: a.storageId ?? a.fileUrl,
    url: a.storageId ?? a.fileUrl,
    name: a.name,
    type: "upload" as const,
    createdAt: a.createdAt,
  }));

  // Process generated files
  const generatedImages = generatedFiles.map((f) => ({
    id: f.storageId,
    url: f.fileUrl,
    name: `Generated ${new Date(f.createdAt).toLocaleDateString()}`,
    type: "generated" as const,
    createdAt: f.createdAt,
  }));

  // Filter images based on active tab
  const filteredImages = (() => {
    let images = [];
    if (activeTab === "all") {
      images = [...uploadedImages, ...generatedImages];
    } else if (activeTab === "uploads") {
      images = uploadedImages;
    } else {
      images = generatedImages;
    }
    // Sort by creation date (newest first) and filter out already selected
    return images
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((img) => !excludeIds.includes(img.id));
  })();

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onSelect(selectedIds);
  };

  const totalUploads = uploadedImages.filter((img) => !excludeIds.includes(img.id)).length;
  const totalGenerated = generatedImages.filter((img) => !excludeIds.includes(img.id)).length;

  if (uploadedImages.length === 0 && generatedImages.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No images available in gallery</p>
        <p className="text-sm mt-1">Upload images or use the Generator to create some</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab filters */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("all")}
        >
          All ({totalUploads + totalGenerated})
        </Button>
        <Button
          variant={activeTab === "uploads" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("uploads")}
        >
          <Upload className="h-4 w-4 mr-1" />
          Uploads ({totalUploads})
        </Button>
        <Button
          variant={activeTab === "generated" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("generated")}
        >
          <ImageIcon className="h-4 w-4 mr-1" />
          Generated ({totalGenerated})
        </Button>
      </div>

      {filteredImages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No images in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto p-1">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedIds.includes(image.id)
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/30"
                }`}
              onClick={() => toggleSelection(image.id)}
            >
              <div className="aspect-square bg-muted">
                <GalleryImage imageId={image.id} url={image.url} />
              </div>
              {selectedIds.includes(image.id) && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                  {selectedIds.indexOf(image.id) + 1}
                </div>
              )}
              <div className="absolute top-2 left-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${image.type === "upload"
                    ? "bg-blue-500/80 text-white"
                    : "bg-purple-500/80 text-white"
                  }`}>
                  {image.type === "upload" ? "Upload" : "AI"}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
                {image.name}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length} image{selectedIds.length !== 1 ? "s" : ""} selected
        </p>
        <Button onClick={handleConfirm} disabled={selectedIds.length === 0}>
          Add Selected
        </Button>
      </div>
    </div>
  );
}

function GalleryImage({ imageId, url }: { imageId: string; url: string }) {
  const looksLikeStorageId = Boolean(imageId && /^k[a-zA-Z0-9]+$/.test(imageId));
  const storageUrl = useQuery(
    api.files.getStorageUrl,
    looksLikeStorageId ? { storageId: imageId as Id<"_storage"> } : "skip"
  );
  const displayUrl = looksLikeStorageId ? storageUrl : url;

  if (!displayUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt="Gallery image"
      className="w-full h-full object-cover"
    />
  );
}

