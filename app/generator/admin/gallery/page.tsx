"use client";

import { useState, useMemo } from "react";
import { GeneratorNav } from "@/components/generator-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Home,
  Search,
  Grid3x3,
  List,
  Image as ImageIcon,
  Video,
  Download,
  Trash2,
  FolderPlus,
  Loader2,
  Calendar,
  FileText,
  Settings,
  Clock,
  FileImage,
  Film,
  X,
  Plus,
  FolderOpen,
  Wand2,
  Menu as MenuIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { Doc } from "@/convex/_generated/dataModel";

// Temporary userId - will be replaced with auth later
const TEMP_USER_ID = "user-1";

export default function GalleryPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<string>("all");
  const [generationTypeFilter, setGenerationTypeFilter] = useState<string>("all");
  const [imageTypeFilter, setImageTypeFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "fileSize">("newest");
  const [selectedFileId, setSelectedFileId] = useState<Id<"generatedFiles"> | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCollectionDialogOpen, setIsCollectionDialogOpen] = useState(false);
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Convex queries
  const filesWithDetails = useQuery(
    api.queries.getFilesWithDetails,
    {
      userId: TEMP_USER_ID,
      fileType: fileTypeFilter !== "all" ? (fileTypeFilter as "image" | "video") : undefined,
      generationType:
        generationTypeFilter !== "all" ? (generationTypeFilter as "image" | "video") : undefined,
      imageGenerationType:
        imageTypeFilter !== "all"
          ? (imageTypeFilter as "free" | "product" | "menu")
          : undefined,
      modelFilter: modelFilter !== "all" ? modelFilter : undefined,
      searchQuery: searchQuery || undefined,
      sortBy,
    }
  );

  const availableModels = useQuery(api.queries.getAvailableModels, { userId: TEMP_USER_ID });

  const fileDetails = useQuery(
    api.queries.getFileWithFullDetails,
    selectedFileId ? { fileId: selectedFileId } : "skip"
  );

  const collections = useQuery(api.queries.getCollectionsByUser, { userId: TEMP_USER_ID });

  // Mutations
  const deleteFile = useMutation(api.mutations.deleteGeneratedFile);
  const updateCollection = useMutation(api.mutations.updateCollection);
  const createCollection = useMutation(api.mutations.createCollection);
  const deleteCollection = useMutation(api.mutations.deleteCollection);

  const handleFileClick = (fileId: Id<"generatedFiles">) => {
    setSelectedFileId(fileId);
    setIsDetailsOpen(true);
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteFile = async (fileId: Id<"generatedFiles">) => {
    if (confirm("Are you sure you want to delete this file?")) {
      await deleteFile({ id: fileId });
      if (selectedFileId === fileId) {
        setIsDetailsOpen(false);
        setSelectedFileId(null);
      }
    }
  };

  const handleAddToCollection = async (collectionId: Id<"userCollections">) => {
    if (!selectedFileId) return;

    const collection = collections?.find((c) => c._id === collectionId);
    if (!collection) return;

    const fileIds = collection.fileIds.includes(selectedFileId)
      ? collection.fileIds
      : [...collection.fileIds, selectedFileId];

    await updateCollection({
      id: collectionId,
      fileIds,
    });

    setIsCollectionDialogOpen(false);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !selectedFileId) return;

    await createCollection({
      userId: TEMP_USER_ID,
      name: newCollectionName,
      description: newCollectionDescription || undefined,
      fileIds: [selectedFileId],
      isPublic: false,
    });

    setNewCollectionName("");
    setNewCollectionDescription("");
    setIsCreateCollectionOpen(false);
  };

  const handleRemoveFromCollection = async (
    collectionId: Id<"userCollections">,
    fileId: Id<"generatedFiles">
  ) => {
    const collection = collections?.find((c) => c._id === collectionId);
    if (!collection) return;

    const fileIds = collection.fileIds.filter((id) => id !== fileId);
    await updateCollection({
      id: collectionId,
      fileIds,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getGenerationTypeLabel = (generation: Doc<"imageGenerations"> | Doc<"videoGenerations"> | null | undefined): string => {
    if (!generation) return "Unknown";
    
    if ("type" in generation) {
      if (generation.type === "free") return "Free Image";
      if (generation.type === "product") return "Product Image";
      if (generation.type === "menu") return "Menu";
      if (generation.type === "image-to-video") return "Image-to-Video";
      if (generation.type === "video-remix") return "Video Remix";
      if (generation.type === "text-to-video") return "Text-to-Video";
      if (generation.type === "video-to-video") return "Video-to-Video";
    }
    
    return "Unknown";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden"
            >
              <MenuIcon className="h-5 w-5" />
            </Button>
            <h1 className="text-xl md:text-2xl font-bold">Gallery</h1>
          </div>
          <Link href="/">
            <Button variant="ghost" size="icon" title="Go to Home">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex flex-col md:flex-row">
        <aside className={sidebarOpen ? "w-full md:w-64 border-r p-4 md:block fixed md:relative inset-0 md:inset-auto z-50 md:z-auto bg-background md:bg-transparent" : "w-full md:w-64 border-r p-4 hidden md:block"}>
          <GeneratorNav isOpen={sidebarOpen} onToggle={() => setSidebarOpen(false)} />
        </aside>
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Generated Content</h2>
            <p className="text-muted-foreground">
              Browse and manage all your generated images and videos
            </p>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by prompt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="File Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Files</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={generationTypeFilter} onValueChange={setGenerationTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Generation Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Image Generations</SelectItem>
                    <SelectItem value="video">Video Generations</SelectItem>
                  </SelectContent>
                </Select>

                {generationTypeFilter === "image" || generationTypeFilter === "all" ? (
                  <Select value={imageTypeFilter} onValueChange={setImageTypeFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Image Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Image Types</SelectItem>
                      <SelectItem value="free">Free Images</SelectItem>
                      <SelectItem value="product">Product Images</SelectItem>
                      <SelectItem value="menu">Menus</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div />
                )}

                <Select value={modelFilter} onValueChange={setModelFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {availableModels?.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model.split("/").pop()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="fileSize">Largest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results and View Toggle */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {filesWithDetails ? (
                    <>
                      Showing {filesWithDetails.length} file{filesWithDetails.length !== 1 ? "s" : ""}
                    </>
                  ) : (
                    "Loading..."
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Content */}
          {filesWithDetails === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filesWithDetails.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No files found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || fileTypeFilter !== "all" || generationTypeFilter !== "all"
                    ? "Try adjusting your filters to see more results."
                    : "Start generating images and videos to see them here."}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filesWithDetails.map(({ file, generation }) => (
                <Card
                  key={file._id}
                  className="group cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleFileClick(file._id)}
                >
                  <CardContent className="p-0">
                    <div className="relative aspect-square overflow-hidden rounded-t-lg">
                      {file.fileType === "image" ? (
                        <img
                          src={file.fileUrl}
                          alt={generation?.prompt || "Generated image"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Video className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-2">
                        <div className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="font-medium truncate">
                            {getGenerationTypeLabel(generation)}
                          </p>
                          {generation && "model" in generation && generation.model && (
                            <p className="truncate text-[10px] opacity-90">
                              {generation.model.split("/").pop()}
                            </p>
                          )}
                          <p className="truncate">{generation?.prompt || "No prompt"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="space-y-1">
                        {generation && "model" in generation && generation.model && (
                          <div className="text-xs font-medium text-foreground truncate">
                            {generation.model.split("/").pop()}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>{formatDate(file.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filesWithDetails.map(({ file, generation }) => (
                <Card
                  key={file._id}
                  className="group cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleFileClick(file._id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-24 h-24 shrink-0 rounded overflow-hidden">
                        {file.fileType === "image" ? (
                          <img
                            src={file.fileUrl}
                            alt={generation?.prompt || "Generated image"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <Video className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {getGenerationTypeLabel(generation)}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {generation?.prompt || "No prompt"}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          {generation && "model" in generation && generation.model && (
                            <span className="font-medium text-foreground">
                              {generation.model.split("/").pop()}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {formatFileSize(file.fileSize)}
                          </span>
                          {file.width && file.height && (
                            <span>
                              {file.width} × {file.height}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(file.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* File Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
              {fileDetails ? (
                <>
                  <DialogHeader>
                    <DialogTitle>{getGenerationTypeLabel(fileDetails.generation)}</DialogTitle>
                    <DialogDescription>
                      Generated on {formatDate(fileDetails.file.createdAt)}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Preview - Larger */}
                    <div className="space-y-4">
                      <div className="relative w-full rounded-lg overflow-hidden border bg-muted/50">
                        {fileDetails.file.fileType === "image" ? (
                          <img
                            src={fileDetails.file.fileUrl}
                            alt={fileDetails.generation?.prompt || "Generated image"}
                            className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                          />
                        ) : (
                          <video
                            src={fileDetails.file.fileUrl}
                            controls
                            className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                          />
                        )}
                      </div>

                      {/* Action Buttons - All consistent styling */}
                      <div className="flex gap-2 flex-wrap justify-center">
                        <Button
                          variant="outline"
                          onClick={() =>
                            handleDownload(
                              fileDetails.file.fileUrl,
                              `generated-${fileDetails.file._id}.${fileDetails.file.fileType === "image" ? "png" : "mp4"}`
                            )
                          }
                          className="flex-1 min-w-[140px]"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        {fileDetails.file.fileType === "image" && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              router.push(`/generator/admin/image-editor?fileId=${fileDetails.file._id}&imageUrl=${encodeURIComponent(fileDetails.file.fileUrl)}`);
                              setIsDetailsOpen(false);
                            }}
                            className="flex-1 min-w-[140px]"
                          >
                            <Wand2 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => setIsCollectionDialogOpen(true)}
                          className="flex-1 min-w-[140px]"
                        >
                          <FolderPlus className="mr-2 h-4 w-4" />
                          Add to Collection
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDeleteFile(fileDetails.file._id)}
                          className="flex-1 min-w-[140px] border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">Generation Details</h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Prompt:</span>
                            <p className="mt-1">{fileDetails.generation?.prompt || "N/A"}</p>
                          </div>
                          {fileDetails.generation && "negativePrompt" in fileDetails.generation && fileDetails.generation.negativePrompt && (
                            <div>
                              <span className="text-muted-foreground">Negative Prompt:</span>
                              <p className="mt-1">{fileDetails.generation.negativePrompt}</p>
                            </div>
                          )}
                          {fileDetails.generation && "model" in fileDetails.generation && (
                            <div>
                              <span className="text-muted-foreground">Model:</span>
                                <p className="mt-1">{fileDetails.generation.model.split("/").pop()}</p>
                            </div>
                          )}
                        </div>
                      </div>

                        {/* Collections */}
                        {fileDetails.collections && fileDetails.collections.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-2">Collections</h3>
                            <div className="space-y-1">
                              {fileDetails.collections.map((collection) => (
                                <div
                                  key={collection._id}
                                  className="flex items-center justify-between text-sm p-2 rounded bg-muted"
                                >
                                  <span>{collection.name}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveFromCollection(collection._id, fileDetails.file._id);
                                    }}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold mb-2">File Information</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">File Size:</span>
                            <span>{formatFileSize(fileDetails.file.fileSize)}</span>
                          </div>
                          {fileDetails.file.width && fileDetails.file.height && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Dimensions:</span>
                              <span>
                                {fileDetails.file.width} × {fileDetails.file.height}
                              </span>
                            </div>
                          )}
                          {fileDetails.file.duration && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Duration:</span>
                              <span>{fileDetails.file.duration}s</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">MIME Type:</span>
                            <span>{fileDetails.file.mimeType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Created:</span>
                            <span>{formatDate(fileDetails.file.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Edit History */}
                      {fileDetails.editHistory && fileDetails.editHistory.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2">Edit History</h3>
                          <div className="space-y-2">
                            {fileDetails.editHistory.map((edit) => (
                              <div
                                key={edit._id}
                                className="text-sm p-2 rounded bg-muted"
                              >
                                <div className="flex justify-between">
                                  <span className="font-medium capitalize">{edit.editType}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {formatDate(edit.createdAt)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Add to Collection Dialog */}
          <Dialog open={isCollectionDialogOpen} onOpenChange={setIsCollectionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Collection</DialogTitle>
                <DialogDescription>
                  Select a collection or create a new one
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {collections && collections.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {collections.map((collection) => (
                      <Button
                        key={collection._id}
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleAddToCollection(collection._id)}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        {collection.name}
                        {collection.fileIds.includes(selectedFileId!) && (
                          <span className="ml-auto text-xs text-muted-foreground">(Added)</span>
                        )}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No collections yet
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setIsCollectionDialogOpen(false);
                    setIsCreateCollectionOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Collection
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Collection Dialog */}
          <Dialog open={isCreateCollectionOpen} onOpenChange={setIsCreateCollectionOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Collection</DialogTitle>
                <DialogDescription>
                  Create a new collection for organizing your files
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="collectionName">Name</Label>
                  <Input
                    id="collectionName"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="My Collection"
                  />
                </div>
                <div>
                  <Label htmlFor="collectionDescription">Description (Optional)</Label>
                  <Input
                    id="collectionDescription"
                    value={newCollectionDescription}
                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                    placeholder="A collection of..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateCollectionOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCollection} disabled={!newCollectionName.trim()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}

