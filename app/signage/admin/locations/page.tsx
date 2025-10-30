"use client";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Plus, Search, Edit, Trash2, Home } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function LocationsPage() {
  const locations = useQuery(api.queries.getLocations) ?? [];
  const createLocation = useMutation(api.mutations.createLocation);
  const updateLocation = useMutation(api.mutations.updateLocation);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<Id<"locations"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    primaryColor: "#FFDD00",
    secondaryColor: "#0066CC",
    font: "Inter",
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) return;
    
    await createLocation({
      name: formData.name,
      slug: formData.slug,
      branding: {
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        font: formData.font,
      },
    });
    
    setIsCreateOpen(false);
    setFormData({
      name: "",
      slug: "",
      primaryColor: "#FFDD00",
      secondaryColor: "#0066CC",
      font: "Inter",
    });
  };

  const handleEdit = (location: typeof locations[0]) => {
    setEditingId(location._id);
    setFormData({
      name: location.name,
      slug: location.slug,
      primaryColor: location.branding.primaryColor,
      secondaryColor: location.branding.secondaryColor,
      font: location.branding.font,
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    
    await updateLocation({
      id: editingId,
      name: formData.name,
      slug: formData.slug,
      branding: {
        primaryColor: formData.primaryColor,
        secondaryColor: formData.secondaryColor,
        font: formData.font,
      },
    });
    
    setEditingId(null);
    setFormData({
      name: "",
      slug: "",
      primaryColor: "#FFDD00",
      secondaryColor: "#0066CC",
      font: "Inter",
    });
  };

  const filteredLocations = locations.filter((location) =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <h2 className="text-3xl font-bold">Locations</h2>
              <p className="text-muted-foreground mt-2">
                Manage your locations and branding
              </p>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Location</DialogTitle>
                  <DialogDescription>
                    Add a new location to your digital signage system
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
                      placeholder="FK Teplice Stadium"
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
                      placeholder="fk-teplice"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, secondaryColor: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="font">Font</Label>
                    <Input
                      id="font"
                      value={formData.font}
                      onChange={(e) =>
                        setFormData({ ...formData, font: e.target.value })
                      }
                      placeholder="Inter"
                    />
                  </div>
                  <Button onClick={handleCreate}>Create Location</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Primary Color</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No locations found. Create your first location to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLocations.map((location) => (
                    <TableRow key={location._id}>
                      <TableCell className="font-medium">{location.name}</TableCell>
                      <TableCell>{location.slug}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            location.status === "active"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                          }`}
                        >
                          {location.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-4 w-4 rounded border"
                            style={{ backgroundColor: location.branding.primaryColor }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {location.branding.primaryColor}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(location)}
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Location</DialogTitle>
                  <DialogDescription>
                    Update location details
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
                    <Label htmlFor="edit-primaryColor">Primary Color</Label>
                    <Input
                      id="edit-primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, primaryColor: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-secondaryColor">Secondary Color</Label>
                    <Input
                      id="edit-secondaryColor"
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        setFormData({ ...formData, secondaryColor: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-font">Font</Label>
                    <Input
                      id="edit-font"
                      value={formData.font}
                      onChange={(e) =>
                        setFormData({ ...formData, font: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={handleUpdate}>Update Location</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
}

