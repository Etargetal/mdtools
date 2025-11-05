"use client";

import { useState, useEffect, useRef } from "react";
import { GeneratorNav } from "@/components/generator-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Home, Download, Loader2, Video, AlertCircle, CheckCircle2, Sparkles, Menu as MenuIcon, Upload, X } from "lucide-react";
import Link from "next/link";

// Temporary userId - will be replaced with auth later
const TEMP_USER_ID = "user-1";
const MODEL = "fal-ai/wan-pro/image-to-video";

export default function ImageToVideoPage() {
    const [prompt, setPrompt] = useState("");
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [uploadedImageFileId, setUploadedImageFileId] = useState<Id<"generatedFiles"> | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [seed, setSeed] = useState<number | undefined>(undefined);
    const enableSafetyChecker = false; // Always disabled

    const [currentGenerationId, setCurrentGenerationId] = useState<Id<"videoGenerations"> | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Convex hooks
    const generateVideoFromImageAction = useAction(api.generatorActions.generateVideoFromImage);
    const pollStatusAction = useAction(api.generatorActions.pollGenerationStatus);
    const downloadAndStoreAction = useAction(api.generatorActions.downloadAndStoreFile);
    const uploadFileAction = useAction(api.generatorActions.uploadFile);
    const createVideoGeneration = useMutation(api.mutations.createVideoGeneration);
    const updateVideoGenerationStatus = useMutation(api.mutations.updateVideoGenerationStatus);

    // Get user's previous image generations for selection
    const userImageFiles = useQuery(api.queries.getGeneratedFiles, {
        userId: TEMP_USER_ID,
        fileType: "image",
    });

    // Get current generation status
    const currentGeneration = useQuery(
        api.queries.getVideoGenerationById,
        currentGenerationId ? { id: currentGenerationId } : "skip"
    );

    // Get generated files
    const generatedFiles = useQuery(
        api.queries.getGeneratedFilesByGenerationId,
        currentGenerationId ? { generationId: currentGenerationId } : "skip"
    );

    // Polling effect for async generations
    useEffect(() => {
        if (!currentGenerationId || !currentGeneration) return;
        const shouldPoll =
            (currentGeneration.status === "processing" || currentGeneration.status === "pending") ||
            (currentGeneration.status === "completed" && currentGeneration.generatedFileIds.length === 0);

        if (!shouldPoll) return;

        const pollInterval = setInterval(async () => {
            if (!currentGeneration.falRequestId || !currentGenerationId) return;

            try {
                const status = await pollStatusAction({
                    requestId: currentGeneration.falRequestId,
                    model: MODEL,
                });

                console.log("Poll video status result:", status);

                // Check for video URLs in the polling response
                const videoUrls: string[] = [];

                // Check if status has video URLs directly
                if ((status as any).videoUrl) {
                    videoUrls.push((status as any).videoUrl);
                }

                // Check if images array contains video URLs (polling might return videos as "images")
                if (status.images && status.images.length > 0) {
                    videoUrls.push(...status.images.filter(url => url && (url.includes('.mp4') || url.includes('video') || url.includes('fal.ai'))));
                }

                if (status.isCompleted && videoUrls.length > 0) {
                    await handleCompletedGeneration(videoUrls, currentGenerationId);
                } else if (status.isFailed) {
                    await updateVideoGenerationStatus({
                        id: currentGenerationId,
                        status: "failed",
                        errorMessage: status.error || "Generation failed",
                    });
                    setIsGenerating(false);
                    setGenerationError(status.error || "Generation failed");
                }
            } catch (error: any) {
                console.error("Polling error:", error);
                setGenerationError(error.message);
                setIsGenerating(false);
            }
        }, 5000); // Poll every 5 seconds

        return () => clearInterval(pollInterval);
    }, [currentGenerationId, currentGeneration, pollStatusAction, updateVideoGenerationStatus]);

    const handleCompletedGeneration = async (videoUrls: string[], generationId: Id<"videoGenerations">) => {
        try {
            const fileIds: Id<"generatedFiles">[] = [];

            for (const videoUrl of videoUrls) {
                const stored = await downloadAndStoreAction({
                    url: videoUrl,
                    generationId: generationId,
                    generationType: "video",
                    width: undefined,
                    height: undefined,
                });
                fileIds.push(stored.fileId);
            }

            const existingFileIds = currentGeneration?.generatedFileIds || [];
            await updateVideoGenerationStatus({
                id: generationId,
                status: "completed",
                generatedFileIds: [...existingFileIds, ...fileIds],
                completedAt: Date.now(),
            });

            setIsGenerating(false);
            setGenerationError(null);
        } catch (error: any) {
            console.error("Error storing video:", error);
            await updateVideoGenerationStatus({
                id: generationId,
                status: "failed",
                errorMessage: error.message,
            });
            setIsGenerating(false);
            setGenerationError(error.message);
        }
    };

    const handleImageUpload = async (file: File) => {
        setIsUploading(true);
        setGenerationError(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await uploadFileAction({
                file: arrayBuffer,
                fileName: file.name,
                mimeType: file.type,
            });

            setUploadedImageUrl(result.fileUrl);
            setUploadedImage(file);

            // Create a generated file record for the uploaded image
            // Note: We'll need to store this separately or use it directly
            // For now, we'll just use the URL
        } catch (error: any) {
            console.error("Upload error:", error);
            setGenerationError(`Failed to upload image: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = (file: Id<"generatedFiles">) => {
        const selectedFile = userImageFiles?.find(f => f._id === file);
        if (selectedFile) {
            setUploadedImageUrl(selectedFile.fileUrl);
            setUploadedImageFileId(selectedFile._id);
            setUploadedImage(null);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setGenerationError("Please enter a prompt");
            return;
        }

        if (!uploadedImageUrl) {
            setGenerationError("Please upload or select an image");
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            // Create generation record
            const generationId = await createVideoGeneration({
                userId: TEMP_USER_ID,
                type: "image-to-video",
                model: MODEL,
                prompt: prompt.trim(),
                sourceImageId: uploadedImageFileId || undefined,
            });

            // Generate video from image
            const result = await generateVideoFromImageAction({
                model: MODEL,
                imageUrl: uploadedImageUrl,
                prompt: prompt.trim(),
                seed: seed,
                enableSafetyChecker: enableSafetyChecker,
            });

            // Update with request ID
            await updateVideoGenerationStatus({
                id: generationId,
                status: result.isCompleted ? "completed" : "processing",
                falRequestId: result.requestId,
            });

            setCurrentGenerationId(generationId);

            if (result.isCompleted && result.videoUrl) {
                await handleCompletedGeneration([result.videoUrl], generationId);
            }
        } catch (error: any) {
            console.error("Generation error:", error);
            setGenerationError(error.message);
            setIsGenerating(false);
            if (currentGenerationId) {
                await updateVideoGenerationStatus({
                    id: currentGenerationId,
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
            a.download = fileName || `video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download error:", error);
            alert("Failed to download video");
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
                        <h1 className="text-xl md:text-2xl font-bold">Image to Video</h1>
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
                        {/* Image Upload Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Source Image</CardTitle>
                                <CardDescription>Upload an image or select from your gallery</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {uploadedImageUrl ? (
                                    <div className="space-y-2">
                                        <div className="relative border rounded-lg overflow-hidden">
                                            <img
                                                src={uploadedImageUrl}
                                                alt="Uploaded"
                                                className="w-full h-auto max-h-96 object-contain"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-2 right-2"
                                                onClick={() => {
                                                    setUploadedImageUrl(null);
                                                    setUploadedImage(null);
                                                    setUploadedImageFileId(null);
                                                    if (fileInputRef.current) {
                                                        fileInputRef.current.value = "";
                                                    }
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Image selected
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                            <Label htmlFor="image-upload" className="cursor-pointer">
                                                <span className="text-sm font-medium text-primary hover:underline">
                                                    Click to upload an image
                                                </span>
                                                <Input
                                                    id="image-upload"
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleImageUpload(file);
                                                        }
                                                    }}
                                                />
                                            </Label>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                PNG, JPG, WEBP up to 10MB
                                            </p>
                                        </div>

                                        {userImageFiles && userImageFiles.length > 0 && (
                                            <div className="space-y-2">
                                                <Label>Or select from gallery</Label>
                                                <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                                                    {userImageFiles.slice(0, 20).map((file) => (
                                                        <button
                                                            key={file._id}
                                                            onClick={() => handleFileSelect(file._id)}
                                                            className="relative aspect-square rounded-lg overflow-hidden border-2 hover:border-primary transition-colors"
                                                        >
                                                            <img
                                                                src={file.fileUrl}
                                                                alt="Gallery image"
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Prompt Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Prompt</CardTitle>
                                <CardDescription>
                                    Describe the motion and action you want in the video
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="prompt">Prompt</Label>
                                    <textarea
                                        id="prompt"
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="A stylish woman walks down a Tokyo street filled with warm glowing neon and animated city signage..."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="seed">Seed (Optional)</Label>
                                    <Input
                                        id="seed"
                                        type="number"
                                        placeholder="Leave empty for random"
                                        value={seed || ""}
                                        onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : undefined)}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Random seed for reproducibility
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Generate Button */}
                        <Card>
                            <CardContent className="pt-6">
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !prompt.trim() || !uploadedImageUrl || isUploading}
                                    className="w-full"
                                    size="lg"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating Video...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Generate Video
                                        </>
                                    )}
                                </Button>

                                {generationError && (
                                    <div className="flex items-center gap-2 p-4 border border-destructive rounded-md bg-destructive/10 text-destructive mt-4">
                                        <AlertCircle className="h-5 w-5" />
                                        <div className="flex-1">
                                            <div className="font-medium">Generation Failed</div>
                                            <div className="text-sm">{generationError}</div>
                                        </div>
                                    </div>
                                )}

                                {currentGeneration && (
                                    <div className="flex items-center gap-2 p-4 border rounded-md mt-4">
                                        {currentGeneration.status === "processing" || currentGeneration.status === "pending" ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                                <div>
                                                    <div className="font-medium">Processing Video...</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        This may take several minutes
                                                    </div>
                                                </div>
                                            </>
                                        ) : currentGeneration.status === "completed" ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                <div>
                                                    <div className="font-medium text-green-600">Generation Complete</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {generatedFiles?.length || 0} video(s) generated
                                                    </div>
                                                </div>
                                            </>
                                        ) : null}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Generated Videos */}
                        {generatedFiles && generatedFiles.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Generated Videos</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {generatedFiles.map((file) => (
                                        <div key={file._id} className="space-y-2">
                                            <div className="border rounded-lg overflow-hidden">
                                                <video
                                                    src={file.fileUrl}
                                                    controls
                                                    className="w-full h-auto"
                                                >
                                                    Your browser does not support the video tag.
                                                </video>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDownload(file.fileUrl, `video-${file._id}.mp4`)}
                                                className="w-full"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Download Video
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

