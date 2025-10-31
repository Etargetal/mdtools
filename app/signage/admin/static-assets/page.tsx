"use client";

import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Home,
  Upload,
  Image as ImageIcon,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Id } from "@/convex/_generated/dataModel";
import type { Doc } from "@/convex/_generated/dataModel";

export default function StaticAssetsPage() {
  const staticAssets = useQuery(api.queries.getStaticAssets) ?? [];
  const createStaticAsset = useMutation(api.mutations.createStaticAsset);
  const deleteStaticAsset = useMutation(api.mutations.deleteStaticAsset);
  const generateUploadUrl = useAction(api.files.generateUploadUrl);
  const uploadFileAndGetUrl = useAction(api.files.uploadFileAndGetUrl);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"staticAssets"> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedAsset, setSelectedAsset] = useState<Doc<"staticAssets"> | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Invalid file type. Please upload JPG, PNG, or WebP images.");
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("File size exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    setUploadProgress(50);

    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) throw new Error("Upload failed");

      const { storageId } = await result.json();
      setUploadProgress(75);
      
      // Get storage URL
      const fileUrl = await uploadFileAndGetUrl({ storageId: storageId as Id<"_storage"> });
      
      setUploadProgress(90);
      
      // Create static asset record
      await createStaticAsset({
        name: file.name,
        fileUrl: fileUrl || "",
        fileSize: file.size,
        mimeType: file.type,
      });

      setUploadProgress(100);
      setIsUploadOpen(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteStaticAsset({ id: deletingId });
    setDeletingId(null);
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              <h2 className="text-3xl font-bold">Static Assets</h2>
              <p className="text-muted-foreground mt-2">
                Manage static images for display screens
              </p>
            </div>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Static Image</DialogTitle>
                  <DialogDescription>
                    Upload an image for static display mode. Supported formats: JPG, PNG, WebP (max 10MB)
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="file">Select Image</Label>
                    <Input
                      id="file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      disabled={uploading}
                    />
                    {uploading && (
                      <div className="mt-2">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Uploading... {uploadProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadOpen(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {staticAssets.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No static assets uploaded yet.
                  </p>
                  <Button onClick={() => setIsUploadOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Your First Image
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {staticAssets.map((asset) => (
                <Card key={asset._id} className="overflow-hidden">
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                    <img
                      src={asset.fileUrl}
                      alt={asset.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(asset.fileSize)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingId(asset._id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={asset.fileUrl}
                          readOnly
                          className="text-xs font-mono flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(asset.fileUrl)}
                        >
                          {copiedUrl === asset.fileUrl ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {formatDate(asset.createdAt)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedAsset(asset)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedAsset && (
            <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Asset Details</DialogTitle>
                  <DialogDescription>
                    View and manage static asset details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
                    <img
                      src={selectedAsset.fileUrl}
                      alt={selectedAsset.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={selectedAsset.name} readOnly />
                  </div>
                  <div className="grid gap-2">
                    <Label>File URL</Label>
                    <div className="flex gap-2">
                      <Input value={selectedAsset.fileUrl} readOnly className="font-mono text-xs" />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(selectedAsset.fileUrl)}
                      >
                        {copiedUrl === selectedAsset.fileUrl ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>File Size</Label>
                      <Input value={formatFileSize(selectedAsset.fileSize)} readOnly />
                    </div>
                    <div className="grid gap-2">
                      <Label>MIME Type</Label>
                      <Input value={selectedAsset.mimeType} readOnly />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Upload Date</Label>
                    <Input value={formatDate(selectedAsset.createdAt)} readOnly />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {deletingId && (
            <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Static Asset</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this static asset? This action cannot be undone.
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

