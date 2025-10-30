"use client";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit, Home, Upload, X, Check } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import type { Doc } from "@/convex/_generated/dataModel";

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("easy");

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
            <h2 className="text-3xl font-bold">Products</h2>
            <p className="text-muted-foreground mt-2">
              Manage your products - Quick entry or advanced management
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="easy">Easy Interface</TabsTrigger>
              <TabsTrigger value="advanced">Advanced Management</TabsTrigger>
            </TabsList>
            <TabsContent value="easy" className="mt-6">
              <EasyProductInterface />
            </TabsContent>
            <TabsContent value="advanced" className="mt-6">
              <AdvancedProductInterface />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

function EasyProductInterface() {
  const products = useQuery(api.queries.getProducts) ?? [];
  const activeProducts = useQuery(api.queries.getActiveProducts) ?? [];
  const createProduct = useMutation(api.mutations.createProduct);
  const updateProduct = useMutation(api.mutations.updateProduct);

  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const handleAddProduct = async () => {
    if (!productName || !productPrice) return;

    const price = parseFloat(productPrice);
    if (isNaN(price) || price <= 0) return;

    const maxOrder = products.length > 0
      ? Math.max(...products.map((p: Doc<"products">) => p.order))
      : 0;

    await createProduct({
      name: productName,
      price,
      currency: "CZK",
      order: maxOrder + 1,
    });

    setProductName("");
    setProductPrice("");
  };

  const handleEdit = (product: Doc<"products">) => {
    setEditingId(product._id);
    setEditName(product.name);
    setEditPrice(product.price.toString());
  };

  const handleUpdate = async () => {
    if (!editingId || !editName || !editPrice) return;

    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) return;

    await updateProduct({
      id: editingId as any,
      name: editName,
      price,
    });

    setEditingId(null);
    setEditName("");
    setEditPrice("");
  };

  const handleDelete = async (id: string) => {
    await updateProduct({
      id: id as any,
      status: "inactive",
    });
  };

  const recentProducts = [...products]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Quick Add Product</CardTitle>
          <CardDescription>
            Add a product quickly with just name and price
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              placeholder="Burger Classic"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddProduct();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-price">Price (CZK)</Label>
            <Input
              id="product-price"
              type="number"
              placeholder="150"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddProduct();
                }
              }}
            />
          </div>
          <Button onClick={handleAddProduct} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Products</CardTitle>
          <CardDescription>
            {recentProducts.length} most recently added products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No products yet. Add your first product!
            </p>
          ) : (
            <div className="space-y-2">
              {recentProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.price} {product.currency}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(product._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{products.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Active Products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{activeProducts.length}</p>
          </CardContent>
        </Card>
      </div>

      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Product</CardTitle>
              <CardDescription>
                Update product details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Product Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price (CZK)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdate} className="flex-1">
                  Update Product
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setEditName("");
                    setEditPrice("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function AdvancedProductInterface() {
  const products = useQuery(api.queries.getProducts) ?? [];
  const createProduct = useMutation(api.mutations.createProduct);
  const updateProduct = useMutation(api.mutations.updateProduct);
  const bulkUpdateProducts = useMutation(api.mutations.bulkUpdateProducts);
  const bulkDeleteProducts = useMutation(api.mutations.bulkDeleteProducts);
  const reorderProducts = useMutation(api.mutations.reorderProducts);
  const generateUploadUrl = useAction((api as any).files?.generateUploadUrl || (() => Promise.resolve("")));

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    currency: "CZK",
    category: "",
    description: "",
    image: "",
    status: "active" as "active" | "inactive",
  });

  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get unique categories
  const categories = Array.from(new Set(products.map((p: Doc<"products">) => p.category).filter(Boolean)));

  // Filter products
  const filteredProducts = products
    .filter((p: Doc<"products">) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter || (!p.category && categoryFilter === "uncategorized");
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a: Doc<"products">, b: Doc<"products">) => a.order - b.order);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (file.size > maxSize) {
      alert("Image size must be less than 5MB");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      alert("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    // Automatically upload when file is selected
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setFormData({ ...formData, image: storageId });
      setUploading(false);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Image upload failed");
      setUploading(false);
      setImageFile(null);
      setImagePreview("");
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.price) return;

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) return;

    const maxOrder = products.length > 0
      ? Math.max(...products.map((p: Doc<"products">) => p.order))
      : 0;

    await createProduct({
      name: formData.name,
      price,
      currency: formData.currency,
      category: formData.category || undefined,
      description: formData.description || undefined,
      image: formData.image || undefined,
      order: maxOrder + 1,
    });

    setIsCreateOpen(false);
    setFormData({
      name: "",
      price: "",
      currency: "CZK",
      category: "",
      description: "",
      image: "",
      status: "active",
    });
    setImagePreview("");
    setImageFile(null);
  };

  const handleEdit = (product: Doc<"products">) => {
    setEditingId(product._id);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      currency: product.currency,
      category: product.category || "",
      description: product.description || "",
      image: product.image || "",
      status: product.status,
    });
    // TODO: Load image preview if image exists
  };

  const handleUpdate = async () => {
    if (!editingId || !formData.name || !formData.price) return;

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) return;

    await updateProduct({
      id: editingId as any,
      name: formData.name,
      price,
      currency: formData.currency,
      category: formData.category || undefined,
      description: formData.description || undefined,
      image: formData.image || undefined,
      status: formData.status,
    });

    setEditingId(null);
    setFormData({
      name: "",
      price: "",
      currency: "CZK",
      category: "",
      description: "",
      image: "",
      status: "active",
    });
    setImagePreview("");
    setImageFile(null);
  };

  const handleBulkAction = async (action: "activate" | "deactivate" | "delete") => {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds).map(id => id as Id<"products">);

    if (action === "delete") {
      await bulkDeleteProducts({ ids });
    } else {
      await bulkUpdateProducts({
        ids,
        status: action === "activate" ? "active" : "inactive",
      });
    }

    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p: Doc<"products">) => p._id)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={String(cat)} value={String(cat)}>
                  {String(cat)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="outline"
                onClick={() => handleBulkAction("activate")}
              >
                Activate ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkAction("deactivate")}
              >
                Deactivate ({selectedIds.size})
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleBulkAction("delete")}
              >
                Delete ({selectedIds.size})
              </Button>
            </>
          )}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Product</DialogTitle>
                <DialogDescription>
                  Add a new product with full details
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-name">Name *</Label>
                  <Input
                    id="create-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-price">Price (CZK) *</Label>
                  <Input
                    id="create-price"
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-category">Category</Label>
                  <Input
                    id="create-category"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="food, drinks, specials"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-description">Description</Label>
                  <Input
                    id="create-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Image</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-md"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImagePreview("");
                          setImageFile(null);
                          setFormData({ ...formData, image: "" });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? "Uploading..." : "Upload Image"}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Max 5MB. Formats: JPG, PNG, WebP
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="create-status">Active</Label>
                  <Switch
                    id="create-status"
                    checked={formData.status === "active"}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        status: checked ? "active" : "inactive",
                      })
                    }
                  />
                </div>
                <Button onClick={handleCreate}>Create Product</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No products found. Create your first product!
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product: Doc<"products">) => (
                <TableRow key={product._id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product._id)}
                      onChange={() => toggleSelect(product._id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell>{product.order}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.price} {product.currency}</TableCell>
                  <TableCell>{product.category || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${product.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                        }`}
                    >
                      {product.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.image ? (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <Check className="h-4 w-4" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update product details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Price (CZK) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setImagePreview("");
                        setImageFile(null);
                        setFormData({ ...formData, image: "" });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="edit-status">Active</Label>
                <Switch
                  id="edit-status"
                  checked={formData.status === "active"}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      status: checked ? "active" : "inactive",
                    })
                  }
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUpdate} className="flex-1">
                  Update Product
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      name: "",
                      price: "",
                      currency: "CZK",
                      category: "",
                      description: "",
                      image: "",
                      status: "active",
                    });
                    setImagePreview("");
                    setImageFile(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
