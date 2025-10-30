"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GeneratorNav } from "@/components/generator-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Home, Upload, Loader2, AlertCircle, CheckCircle2, Wand2, X, Download } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Available editing models
const EDITING_MODELS = [
    { value: "fal-ai/nano-banana/edit", label: "Nano Banana Edit", description: "Fast prompt-based editing" },
    // Add more editing models as they become available
];

// Temporary userId - will be replaced with auth later
const TEMP_USER_ID = "user-1";

function ImageEditorContent() {
    const searchParams = useSearchParams();
    const fileIdParam = searchParams.get("fileId");
    const imageUrlParam = searchParams.get("imageUrl");

    const [activeTab, setActiveTab] = useState<"upload" | "existing">(imageUrlParam ? "existing" : "upload");
    const [prompt, setPrompt] = useState("");
    const [selectedModel, setSelectedModel] = useState(EDITING_MODELS[0].value);
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(imageUrlParam || null);
    const [selectedFileId, setSelectedFileId] = useState<Id<"generatedFiles"> | null>(
        fileIdParam ? (fileIdParam as Id<"generatedFiles">) : null
    );

    const [isEditing, setIsEditing] = useState(false);
    const [editingError, setEditingError] = useState<string | null>(null);
    const [currentEditId, setCurrentEditId] = useState<Id<"imageGenerations"> | null>(null);

    // Convex hooks
    const editImageAction = useAction(api.generatorActions.editImage);
    const pollStatusAction = useAction(api.generatorActions.pollGenerationStatus);
    const downloadAndStoreAction = useAction(api.generatorActions.downloadAndStoreFile);
    const createGeneration = useMutation(api.mutations.createImageGeneration);
    const updateGenerationStatus = useMutation(api.mutations.updateImageGenerationStatus);
    const uploadFileAction = useAction(api.generatorActions.uploadFile);

    // Get existing file if fileId is provided
    const existingFile = useQuery(
        api.queries.getGeneratedFileById,
        selectedFileId ? { id: selectedFileId } : "skip"
    );

    // Get current edit status
    const currentEdit = useQuery(
        api.queries.getImageGenerationById,
        currentEditId ? { id: currentEditId } : "skip"
    );

    // Get generated files for current edit
    const editedFiles = useQuery(
        api.queries.getGeneratedFilesByGenerationId,
        currentEditId ? { generationId: currentEditId } : "skip"
    );

    // Update uploaded image URL if fileId param changes
    useEffect(() => {
        if (fileIdParam && existingFile) {
            setUploadedImageUrl(existingFile.fileUrl);
            setSelectedFileId(fileIdParam as Id<"generatedFiles">);
            setActiveTab("existing");
        } else if (imageUrlParam) {
            setUploadedImageUrl(imageUrlParam);
            setActiveTab("existing");
        }
    }, [fileIdParam, imageUrlParam, existingFile]);

    // Polling effect for async edits
    useEffect(() => {
        if (!currentEditId || !currentEdit) return;
        const shouldPoll =
            (currentEdit.status === "processing" || currentEdit.status === "pending") ||
            (currentEdit.status === "completed" && currentEdit.generatedFileIds.length === 0);

        if (!shouldPoll) return;

        const pollInterval = setInterval(async () => {
            if (!currentEdit.falRequestId || !currentEditId) return;

            try {
                const status = await pollStatusAction({
                    requestId: currentEdit.falRequestId,
                    model: currentEdit.model,
                });

                console.log("Poll edit status result:", status);

                if (status.isCompleted && status.images.length > 0) {
                    await handleCompletedEdit(status.images, currentEditId);
                } else if (status.isFailed) {
                    await updateGenerationStatus({
                        id: currentEditId,
                        status: "failed",
                        errorMessage: status.error || "Edit failed",
                    });
                    setIsEditing(false);
                    setEditingError(status.error || "Edit failed");
                }
            } catch (error: any) {
                console.error("Polling error:", error);
                setEditingError(error.message);
                setIsEditing(false);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [currentEditId, currentEdit, pollStatusAction, updateGenerationStatus]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            setUploadedImage(file);
            const url = URL.createObjectURL(file);
            setUploadedImageUrl(url);
            setSelectedFileId(null); // Clear existing file selection
            setActiveTab("upload");
        }
    };

    const handleRemoveImage = () => {
        if (uploadedImage) {
            URL.revokeObjectURL(uploadedImageUrl || "");
        }
        setUploadedImage(null);
        setUploadedImageUrl(null);
        setSelectedFileId(null);
    };

    const handleCompletedEdit = async (imageUrls: string[], generationId: Id<"imageGenerations">) => {
        if (!generationId) {
            console.error("❌ handleCompletedEdit called but no generationId provided");
            return;
        }

        console.log("🚀 handleCompletedEdit called with", imageUrls.length, "image(s):", imageUrls);

        try {
            const fileIds: Id<"generatedFiles">[] = [];

            // Download and store each edited image
            for (let i = 0; i < imageUrls.length; i++) {
                const imageUrl = imageUrls[i];
                console.log(`📥 Processing edited image ${i + 1}/${imageUrls.length}:`, imageUrl);

                try {
                    const stored = await downloadAndStoreAction({
                        url: imageUrl,
                        generationId: generationId,
                        generationType: "image",
                        width: undefined, // Will be determined from source image
                        height: undefined,
                    });
                    console.log(`✅ Stored edited image ${i + 1}, fileId:`, stored.fileId);
                    fileIds.push(stored.fileId);
                } catch (fileError: any) {
                    console.error(`❌ Error storing edited image ${i + 1}:`, fileError);
                    throw fileError;
                }
            }

            console.log(`✅ Successfully stored ${fileIds.length} edited file(s)`);

            // Update generation status
            await updateGenerationStatus({
                id: generationId,
                status: "completed",
                generatedFileIds: fileIds,
                completedAt: Date.now(),
            });

            console.log("✅ Edit status updated to completed");
            setIsEditing(false);
            setEditingError(null);
        } catch (error: any) {
            console.error("❌ Error storing edited files:", error);
            await updateGenerationStatus({
                id: generationId,
                status: "failed",
                errorMessage: error.message,
            });
            setIsEditing(false);
            setEditingError(error.message);
        }
    };

    const handleEdit = async () => {
        if (!prompt.trim()) {
            setEditingError("Please enter an edit prompt");
            return;
        }

        if (!uploadedImageUrl) {
            setEditingError("Please upload or select an image to edit");
            return;
        }

        setIsEditing(true);
        setEditingError(null);

        try {
            let imageUrlToUse = uploadedImageUrl;

            // If user uploaded a file, upload it to Convex first
            if (uploadedImage) {
                console.log("📤 Uploading file to Convex...");
                const uploadResult = await uploadFileAction({
                    file: await uploadedImage.arrayBuffer(),
                    fileName: uploadedImage.name,
                    mimeType: uploadedImage.type,
                });
                imageUrlToUse = uploadResult.fileUrl;
                console.log("✅ File uploaded:", uploadResult.fileUrl);
            }

            // Get image dimensions from existing file or uploaded image
            let width = 1024;
            let height = 1024;
            if (existingFile) {
                width = existingFile.width || 1024;
                height = existingFile.height || 1024;
            } else if (uploadedImageUrl) {
                // Get dimensions from image URL
                try {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => {
                            width = img.width;
                            height = img.height;
                            resolve();
                        };
                        img.onerror = reject;
                        img.src = uploadedImageUrl;
                    });
                } catch (error) {
                    console.warn("Could not get image dimensions, using defaults:", error);
                }
            }

            // Create generation record
            const generationId = await createGeneration({
                userId: TEMP_USER_ID,
                type: "free", // Using "free" type for edits
                model: selectedModel,
                prompt: prompt.trim(),
                negativePrompt: undefined, // Not supported by Nano Banana Edit API
                width: width,
                height: height,
                numImages: 1,
                seed: undefined,
                guidanceScale: undefined,
            });

            setCurrentEditId(generationId);

            // Call fal.ai API for image editing
            // Note: Nano Banana Edit API only supports prompt and image_urls
            // Other parameters (negativePrompt, strength, width, height) are not supported
            const result = await editImageAction({
                model: selectedModel,
                imageUrl: imageUrlToUse,
                prompt: prompt.trim(),
                numImages: 1,
                outputFormat: undefined, // Use default
                aspectRatio: undefined, // Use default (will match input image)
            });

            // Update with request ID
            await updateGenerationStatus({
                id: generationId,
                status: result.isCompleted ? "completed" : "processing",
                falRequestId: result.requestId,
            });

            setCurrentEditId(generationId);

            console.log("Edit result:", {
                isCompleted: result.isCompleted,
                imagesCount: result.images?.length || 0,
                images: result.images,
                requestId: result.requestId,
                generationId: generationId
            });

            if (result.isCompleted && result.images && result.images.length > 0) {
                console.log("✓ Synchronous edit completion with images");
                await handleCompletedEdit(result.images, generationId);
            } else if (!result.isCompleted) {
                console.log("→ Async edit, will poll for status");
            } else {
                console.warn("⚠ Completed but no images in initial response, starting polling");
            }
        } catch (error: any) {
            console.error("Edit error:", error);
            setEditingError(error.message);
            setIsEditing(false);
            if (currentEditId) {
                await updateGenerationStatus({
                    id: currentEditId,
                    status: "failed",
                    errorMessage: error.message,
                });
            }
        }
    };

    const handleDownload = async (fileUrl: string, fileName: string) => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName || `edited-image-${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download error:", error);
            alert("Failed to download image");
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b">
                <div className="flex h-16 items-center justify-between px-6">
                    <h1 className="text-2xl font-bold">Image Editor</h1>
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
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Editor Interface */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Edit Image</CardTitle>
                                <CardDescription>
                                    Upload an image or select from your gallery, then describe the edits you want to make
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Image Source Tabs */}
                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "existing")}>
                                    <TabsList>
                                        <TabsTrigger value="upload">Upload Image</TabsTrigger>
                                        <TabsTrigger value="existing">From Gallery</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="upload" className="space-y-4">
                                        {uploadedImageUrl ? (
                                            <div className="relative">
                                                <img
                                                    src={uploadedImageUrl}
                                                    alt="Uploaded"
                                                    className="max-w-full max-h-96 mx-auto rounded-lg border"
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={handleRemoveImage}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed rounded-lg p-12 text-center">
                                                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                                <Label htmlFor="image-upload" className="cursor-pointer">
                                                    <Button variant="outline" asChild>
                                                        <span>Click to upload or drag and drop</span>
                                                    </Button>
                                                </Label>
                                                <Input
                                                    id="image-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                />
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    PNG, JPG, GIF up to 10MB
                                                </p>
                                            </div>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="existing" className="space-y-4">
                                        {uploadedImageUrl ? (
                                            <div className="relative">
                                                <img
                                                    src={uploadedImageUrl}
                                                    alt="Selected"
                                                    className="max-w-full max-h-96 mx-auto rounded-lg border"
                                                />
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={handleRemoveImage}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center p-8 text-muted-foreground">
                                                <p>Select an image from your gallery</p>
                                                <p className="text-sm mt-2">Or use the "Edit" button on any generated image</p>
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>

                                {/* Edit Prompt */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit-prompt">Edit Prompt</Label>
                                    <textarea
                                        id="edit-prompt"
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Describe the edits you want to make... (e.g., 'Add a sunset in the background', 'Change the color to blue', 'Remove the person')"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        maxLength={2000}
                                    />
                                    <div className="text-xs text-muted-foreground text-right">
                                        {prompt.length}/2000 characters
                                    </div>
                                </div>

                                {/* Model Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="model">Editing Model</Label>
                                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                                        <SelectTrigger id="model">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EDITING_MODELS.map((model) => (
                                                <SelectItem key={model.value} value={model.value}>
                                                    <div>
                                                        <div className="font-medium">{model.label}</div>
                                                        <div className="text-xs text-muted-foreground">{model.description}</div>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Note: Nano Banana Edit uses prompt-based editing. The edit strength is automatically determined by the model.
                                    </p>
                                </div>

                                {/* Edit Button */}
                                <Button
                                    onClick={handleEdit}
                                    disabled={isEditing || !prompt.trim() || !uploadedImageUrl}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isEditing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Editing...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            Apply Edit
                                        </>
                                    )}
                                </Button>

                                {/* Error Display */}
                                {editingError && (
                                    <div className="flex items-center gap-2 p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
                                        <AlertCircle className="h-5 w-5" />
                                        <div className="flex-1">
                                            <div className="font-medium">Edit Failed</div>
                                            <div className="text-sm">{editingError}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Status Display */}
                                {currentEdit && (
                                    <div className="flex items-center gap-2 p-4 border rounded-md">
                                        {currentEdit.status === "processing" || currentEdit.status === "pending" ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                <div>
                                                    <div className="font-medium">Processing Edit...</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        This may take a few moments
                                                    </div>
                                                </div>
                                            </>
                                        ) : currentEdit.status === "completed" ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <div className="font-medium text-green-600">Edit Complete</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {editedFiles?.length || 0} edited image(s) generated
                                                    </div>
                                                </div>
                                            </>
                                        ) : null}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Results Display */}
                        {editedFiles && editedFiles.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Edited Images</CardTitle>
                                    <CardDescription>
                                        Your edited images are ready to download
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {editedFiles.map((file) => (
                                            <div
                                                key={file._id}
                                                className="relative group border rounded-lg overflow-hidden"
                                            >
                                                <img
                                                    src={file.fileUrl}
                                                    alt="Edited"
                                                    className="w-full h-auto"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center gap-2 justify-center opacity-0 group-hover:opacity-100">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() =>
                                                            handleDownload(file.fileUrl, `edited-${file._id}.png`)
                                                        }
                                                    >
                                                        <Download className="mr-2 h-4 w-4" />
                                                        Download
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        onClick={() => {
                                                            setUploadedImageUrl(file.fileUrl);
                                                            setSelectedFileId(file._id);
                                                            setActiveTab("existing");
                                                            setPrompt("");
                                                            setEditingError(null);
                                                        }}
                                                    >
                                                        <Wand2 className="mr-2 h-4 w-4" />
                                                        Edit Again
                                                    </Button>
                                                </div>
                                                <div className="p-2 bg-background/80 backdrop-blur-sm">
                                                    <div className="text-xs text-muted-foreground">
                                                        {file.width}x{file.height} •{" "}
                                                        {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default function ImageEditorPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <ImageEditorContent />
        </Suspense>
    );
}
