"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
import { Home, Upload, Loader2, AlertCircle, CheckCircle2, Wand2, X, Download, Menu as MenuIcon, History, Plus, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

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
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Edit history navigation
    const [currentActiveFileIndex, setCurrentActiveFileIndex] = useState(0);

    // Additional images for remixing
    const [additionalImages, setAdditionalImages] = useState<Array<{ id: string; url: string; fileId?: Id<"generatedFiles"> }>>([]);
    const [showAdditionalImages, setShowAdditionalImages] = useState(false);

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

    // Get all image generations for the user to find which generation contains the file
    const allImageGenerations = useQuery(api.queries.getImageGenerationsByUser, {
        userId: TEMP_USER_ID,
        type: "free", // Edits use "free" type
    });

    // Find the generation that contains the existing file
    useEffect(() => {
        if (fileIdParam && existingFile && !currentEditId) {
            // Find which generation contains this file
            const generationWithFile = allImageGenerations?.find((gen) =>
                gen.generatedFileIds.includes(existingFile._id)
            );

            if (generationWithFile) {
                setCurrentEditId(generationWithFile._id);
            } else if (existingFile.generationId) {
                // If file has a generationId, use it directly
                setCurrentEditId(existingFile.generationId as Id<"imageGenerations">);
            }
        }
    }, [fileIdParam, existingFile, allImageGenerations]);

    // Get current edit status
    const currentEdit = useQuery(
        api.queries.getImageGenerationById,
        currentEditId ? { id: currentEditId } : "skip"
    );

    // Get user's previous image generations for additional image selection
    const userImageFiles = useQuery(api.queries.getGeneratedFiles, {
        userId: TEMP_USER_ID,
        fileType: "image",
    });

    // Get generated files for current edit
    const editedFiles = useQuery(
        api.queries.getGeneratedFilesByGenerationId,
        currentEditId ? { generationId: currentEditId } : "skip"
    );

    // Sort files by createdAt (oldest first) to ensure chronological order
    // This matches the menu generator behavior - all files from the same generation shown together
    const sortedFiles = editedFiles
        ? [...editedFiles].sort((a, b) => a.createdAt - b.createdAt)
        : null;

    // Reset active file index when generatedFiles change (new generation or new edit)
    // Always show the latest file (last in array) when new files are added
    useEffect(() => {
        if (sortedFiles && sortedFiles.length > 0) {
            // Always show the latest file (last in array)
            const newIndex = sortedFiles.length - 1;
            // Only update if index actually changed to prevent infinite loops
            if (currentActiveFileIndex !== newIndex) {
                setCurrentActiveFileIndex(newIndex);
            }
        }
    }, [sortedFiles?.length]); // Only depend on length, not the array itself

    // Update active file when index changes (for navigation)
    // Use a ref to track the last file ID to prevent unnecessary updates
    const prevFileIdRef = useRef<Id<"generatedFiles"> | null>(null);

    useEffect(() => {
        if (sortedFiles && sortedFiles.length > 0 && sortedFiles[currentActiveFileIndex]) {
            const currentFile = sortedFiles[currentActiveFileIndex];
            // Only update if file actually changed to prevent infinite loops
            if (currentFile._id !== prevFileIdRef.current) {
                setUploadedImageUrl(currentFile.fileUrl);
                setSelectedFileId(currentFile._id);
                prevFileIdRef.current = currentFile._id;
            }
        }
    }, [currentActiveFileIndex, sortedFiles?.length]); // Only depend on index and length

    // Get the currently active file
    const activeFile = sortedFiles && sortedFiles.length > 0
        ? sortedFiles[currentActiveFileIndex]
        : null;

    // Update uploaded image URL if fileId param changes - but don't interfere with navigation
    useEffect(() => {
        // Only update if we're loading a new file from params (not navigating internally)
        if (fileIdParam && existingFile && fileIdParam !== selectedFileId) {
            setUploadedImageUrl(existingFile.fileUrl);
            setSelectedFileId(fileIdParam as Id<"generatedFiles">);
            setAdditionalImages([]);
            // Don't reset currentEditId here - let the other useEffect find it
        } else if (imageUrlParam && !fileIdParam) {
            setUploadedImageUrl(imageUrlParam);
            // Reset edit session when loading a new file from URL
            setCurrentEditId(null);
            setCurrentActiveFileIndex(0);
            setAdditionalImages([]);
        }
    }, [fileIdParam, imageUrlParam, existingFile?._id]);

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
                        generationId: generationId, // Use the same generationId for all files
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

            // Get existing fileIds from the current generation to append to them
            // Use the currentEdit query result to get the latest fileIds
            const existingFileIds = currentEdit?.generatedFileIds || [];

            // Update generation status - APPEND new fileIds to existing ones (like menu generator)
            await updateGenerationStatus({
                id: generationId,
                status: "completed",
                generatedFileIds: [...existingFileIds, ...fileIds], // Append instead of replace
                completedAt: Date.now(),
            });

            console.log("✅ Edit status updated to completed");
            setIsEditing(false);
            setEditingError(null);
            // Clear additional images after successful edit
            setAdditionalImages([]);
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

        // Use the currently active file as the base image
        const imageUrlToUse = activeFile?.fileUrl || uploadedImageUrl;
        if (!imageUrlToUse) {
            setEditingError("Please load an image to edit");
            return;
        }

        setIsEditing(true);
        setEditingError(null);

        try {
            // If user uploaded a file, upload it to Convex first
            if (uploadedImage && !activeFile) {
                console.log("📤 Uploading file to Convex...");
                const uploadResult = await uploadFileAction({
                    file: await uploadedImage.arrayBuffer(),
                    fileName: uploadedImage.name,
                    mimeType: uploadedImage.type,
                });
                setUploadedImageUrl(uploadResult.fileUrl);
                console.log("✅ File uploaded:", uploadResult.fileUrl);
            }

            // Get image dimensions from active file or uploaded image
            let width = 1024;
            let height = 1024;
            if (activeFile) {
                width = activeFile.width || 1024;
                height = activeFile.height || 1024;
            } else if (imageUrlToUse) {
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
                        img.src = imageUrlToUse;
                    });
                } catch (error) {
                    console.warn("Could not get image dimensions, using defaults:", error);
                }
            }

            // Use the existing generation if we have one, otherwise create a new one
            // This ensures all edits of the same image stay in the same generation
            let editGenerationId: Id<"imageGenerations">;

            if (currentEditId) {
                // Reuse existing generation - all edits will be in the same generation
                editGenerationId = currentEditId;
            } else {
                // Create a new generation for this edit session
                editGenerationId = await createGeneration({
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
                setCurrentEditId(editGenerationId);
            }

            // Collect additional image URLs
            const additionalImageUrls = additionalImages.map((img) => img.url);

            // Call fal.ai API for image editing with additional images if provided
            const result = await editImageAction({
                model: selectedModel,
                imageUrl: imageUrlToUse,
                prompt: prompt.trim(),
                numImages: 1,
                outputFormat: undefined, // Use default
                aspectRatio: undefined, // Use default (will match input image)
                additionalImageUrls: additionalImageUrls.length > 0 ? additionalImageUrls : undefined,
            });

            // Update with request ID - use editGenerationId to ensure files are added to the same generation
            await updateGenerationStatus({
                id: editGenerationId,
                status: result.isCompleted ? "completed" : "processing",
                falRequestId: result.requestId,
            });

            setCurrentEditId(editGenerationId);

            console.log("Edit result:", {
                isCompleted: result.isCompleted,
                imagesCount: result.images?.length || 0,
                images: result.images,
                requestId: result.requestId,
                generationId: editGenerationId
            });

            if (result.isCompleted && result.images && result.images.length > 0) {
                console.log("✓ Synchronous edit completion with images");
                await handleCompletedEdit(result.images, editGenerationId);
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

    const handleGoBack = () => {
        if (currentActiveFileIndex > 0 && sortedFiles) {
            setCurrentActiveFileIndex(currentActiveFileIndex - 1);
        }
    };

    const handleGoForward = () => {
        if (sortedFiles && currentActiveFileIndex < sortedFiles.length - 1) {
            setCurrentActiveFileIndex(currentActiveFileIndex + 1);
        }
    };

    const handleAddAdditionalImage = (fileUrl: string, fileId?: Id<"generatedFiles">) => {
        const newId = `additional-${Date.now()}`;
        setAdditionalImages([...additionalImages, { id: newId, url: fileUrl, fileId }]);
        setShowAdditionalImages(false);
    };

    const handleRemoveAdditionalImage = (id: string) => {
        setAdditionalImages(additionalImages.filter((img) => img.id !== id));
    };

    const handleAdditionalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("image/")) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const uploaded = await uploadFileAction({
                    file: arrayBuffer,
                    fileName: file.name,
                    mimeType: file.type,
                });
                handleAddAdditionalImage(uploaded.fileUrl);
            } catch (error: any) {
                setEditingError(`Failed to upload additional image: ${error.message}`);
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
                        <h1 className="text-xl md:text-2xl font-bold">Image Editor</h1>
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
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Edit Prompt Section - First */}
                        <Card>
                            <CardContent className="space-y-6 pt-6">
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
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                                e.preventDefault();
                                                handleEdit();
                                            }
                                        }}
                                    />
                                    <div className="text-xs text-muted-foreground text-right">
                                        {prompt.length}/2000 characters (Press Cmd/Ctrl+Enter to edit)
                                    </div>
                                </div>

                                {/* Apply Edit Button */}
                                <Button
                                    onClick={handleEdit}
                                    disabled={isEditing || !prompt.trim() || !activeFile}
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

                        {/* Results Display - Below Prompt */}
                        {sortedFiles && sortedFiles.length > 0 ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Edited Image</CardTitle>
                                    {sortedFiles && sortedFiles.length > 1 && (
                                        <CardDescription>
                                            Version {currentActiveFileIndex + 1} of {sortedFiles.length}
                                            {currentActiveFileIndex === 0 && " (Original)"}
                                            {currentActiveFileIndex > 0 && ` (Edit ${currentActiveFileIndex})`}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Display current active file */}
                                    {activeFile && (
                                        <div className="space-y-2">
                                            <div className="border rounded-lg overflow-hidden">
                                                <img
                                                    src={activeFile.fileUrl}
                                                    alt={`Edited image ${currentActiveFileIndex === 0 ? "original" : `edit ${currentActiveFileIndex}`}`}
                                                    className="w-full h-auto"
                                                />
                                            </div>
                                            <div className="flex gap-2 flex-wrap">
                                                {/* Navigation buttons */}
                                                {sortedFiles && sortedFiles.length > 1 && (
                                                    <>
                                                        <Button
                                                            onClick={handleGoBack}
                                                            disabled={currentActiveFileIndex === 0}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            <History className="h-4 w-4 mr-2" />
                                                            Back
                                                        </Button>
                                                        <Button
                                                            onClick={handleGoForward}
                                                            disabled={currentActiveFileIndex === sortedFiles.length - 1}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            Forward
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDownload(activeFile.fileUrl, `edited-${activeFile._id}.png`)}
                                                    className="flex-1 min-w-[100px]"
                                                >
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Download
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                    <h3 className="text-lg font-semibold mb-2">No image loaded</h3>
                                    <p className="text-muted-foreground mb-4">
                                        Open an image from the gallery or use the "Edit" button on any generated image to get started.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            // Navigate to gallery
                                            window.location.href = "/generator/admin/gallery";
                                        }}
                                    >
                                        Go to Gallery
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Additional Images Section - Bottom */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Additional Images (Optional)</CardTitle>
                                <CardDescription>
                                    Add additional images to incorporate into the edit (for remixing/combining)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {showAdditionalImages && (
                                    <div className="space-y-3">
                                        {/* Upload Additional Image */}
                                        <div className="space-y-2">
                                            <Label className="text-sm">Upload Image</Label>
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleAdditionalImageUpload}
                                                className="text-sm"
                                            />
                                        </div>
                                        {/* Select from Gallery */}
                                        {userImageFiles && userImageFiles.length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="text-sm">Select from Gallery</Label>
                                                <Select onValueChange={(value) => {
                                                    const file = userImageFiles.find((f) => f._id === value);
                                                    if (file) {
                                                        handleAddAdditionalImage(file.fileUrl, file._id);
                                                    }
                                                }}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Choose an image..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {userImageFiles.slice(0, 20).map((file) => (
                                                            <SelectItem key={file._id} value={file._id}>
                                                                <div className="flex items-center gap-2">
                                                                    <ImageIcon className="h-4 w-4" />
                                                                    {file.width}x{file.height} - {new Date(file.createdAt).toLocaleDateString()}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        {/* Display Added Images */}
                                        {additionalImages.length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="text-sm">Added Images ({additionalImages.length})</Label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {additionalImages.map((img) => (
                                                        <div key={img.id} className="relative border rounded overflow-hidden">
                                                            <img
                                                                src={img.url}
                                                                alt="Additional"
                                                                className="w-full h-24 object-cover"
                                                            />
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                className="absolute top-1 right-1 h-6 w-6"
                                                                onClick={() => handleRemoveAdditionalImage(img.id)}
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {!showAdditionalImages && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowAdditionalImages(true)}
                                        className="w-full"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Additional Images
                                    </Button>
                                )}
                                {showAdditionalImages && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => setShowAdditionalImages(false)}
                                        className="w-full"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Hide Additional Images
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Model Selection - Bottom */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Editing Model</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
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
                            </CardContent>
                        </Card>
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
