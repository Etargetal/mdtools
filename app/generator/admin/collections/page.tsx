"use client";

import { useState } from "react";
import { GeneratorNav } from "@/components/generator-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Home,
  FolderOpen,
  Plus,
  Trash2,
  Loader2,
  X,
  Video,
  Edit,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Temporary userId - will be replaced with auth later
const TEMP_USER_ID = "user-1";

export default function CollectionsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<Id<"userCollections"> | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<Id<"userCollections"> | null>(null);

  const collections = useQuery(api.queries.getCollectionsByUser, { userId: TEMP_USER_ID });
  
  const selectedCollection = useQuery(
    api.queries.getCollectionById,
    selectedCollectionId ? { id: selectedCollectionId } : "skip"
  );

  const createCollection = useMutation(api.mutations.createCollection);
  const updateCollection = useMutation(api.mutations.updateCollection);
  const deleteCollection = useMutation(api.mutations.deleteCollection);

  const handleCreateCollection = async () => {
    if (!collectionName.trim()) return;

    await createCollection({
      userId: TEMP_USER_ID,
      name: collectionName,
      description: collectionDescription || undefined,
      fileIds: [],
      isPublic: false,
    });

    setCollectionName("");
    setCollectionDescription("");
    setIsCreateOpen(false);
  };

  const handleEditCollection = (collectionId: Id<"userCollections">) => {
    const collection = collections?.find((c) => c._id === collectionId);
    if (!collection) return;

    setEditingCollectionId(collectionId);
    setCollectionName(collection.name);
    setCollectionDescription(collection.description || "");
    setIsEditOpen(true);
  };

  const handleUpdateCollection = async () => {
    if (!editingCollectionId || !collectionName.trim()) return;

    await updateCollection({
      id: editingCollectionId,
      name: collectionName,
      description: collectionDescription || undefined,
    });

    setEditingCollectionId(null);
    setCollectionName("");
    setCollectionDescription("");
    setIsEditOpen(false);
  };

  const handleDeleteCollection = async (collectionId: Id<"userCollections">) => {
    if (confirm("Are you sure you want to delete this collection? Files will not be deleted.")) {
      await deleteCollection({ id: collectionId });
      if (selectedCollectionId === collectionId) {
        setSelectedCollectionId(null);
      }
    }
  };

  const handleRemoveFile = async (fileId: Id<"generatedFiles">) => {
    if (!selectedCollectionId || !selectedCollection) return;

    const fileIds = selectedCollection.fileIds.filter((id) => id !== fileId);
    await updateCollection({
      id: selectedCollectionId,
      fileIds,
    });
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Collections</h1>
          <Link href="/">
            <Button variant="ghost" size="icon" title="Go to Home">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex">
        <aside className="w-64 border-r p-4">
          <GeneratorNav />
        </aside>
        <main className="flex-1 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Collections</h2>
              <p className="text-muted-foreground">
                Organize your generated files into collections
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Collection
            </Button>
          </div>

          {collections === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : collections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No collections yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a collection to organize your generated files
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Collection
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections.map((collection) => (
                <Card
                  key={collection._id}
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    selectedCollectionId === collection._id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedCollectionId(collection._id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate">{collection.name}</CardTitle>
                        {collection.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {collection.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCollection(collection._id);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCollection(collection._id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{collection.fileIds.length} file{collection.fileIds.length !== 1 ? "s" : ""}</span>
                      <span>{formatDate(collection.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Collection Details */}
          {selectedCollectionId && selectedCollection && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{selectedCollection.name}</CardTitle>
                {selectedCollection.description && (
                  <CardDescription>{selectedCollection.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedCollection.fileIds.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No files in this collection
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedCollection.fileIds.map((fileId) => (
                      <FileThumbnail
                        key={fileId}
                        fileId={fileId}
                        onRemove={() => handleRemoveFile(fileId)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Create Collection Dialog */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collection</DialogTitle>
                <DialogDescription>
                  Create a new collection to organize your files
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="My Collection"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    value={collectionDescription}
                    onChange={(e) => setCollectionDescription(e.target.value)}
                    placeholder="A collection of..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCollection} disabled={!collectionName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Collection Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Collection</DialogTitle>
                <DialogDescription>
                  Update collection details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editName">Name</Label>
                  <Input
                    id="editName"
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="My Collection"
                  />
                </div>
                <div>
                  <Label htmlFor="editDescription">Description (Optional)</Label>
                  <Input
                    id="editDescription"
                    value={collectionDescription}
                    onChange={(e) => setCollectionDescription(e.target.value)}
                    placeholder="A collection of..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateCollection} disabled={!collectionName.trim()}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}

// File thumbnail component
function FileThumbnail({
  fileId,
  onRemove,
}: {
  fileId: Id<"generatedFiles">;
  onRemove: () => void;
}) {
  const file = useQuery(api.queries.getGeneratedFileById, { id: fileId });

  if (!file) {
    return (
      <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden border">
      {file.fileType === "image" ? (
        <img
          src={file.fileUrl}
          alt="Collection file"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Video className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
        <Button
          variant="destructive"
          size="icon"
          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

