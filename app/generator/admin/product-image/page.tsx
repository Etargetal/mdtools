"use client";

import { useState, useEffect } from "react";
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
import { Home, Download, Loader2, Sparkles, AlertCircle, CheckCircle2, Wand2, FolderPlus, Upload, X, Image as ImageIcon, Menu as MenuIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Available models for product generation
const MODELS = [
  { value: "fal-ai/imagen4/preview", label: "Google Imagen 4", description: "High-quality photorealistic images" },
  { value: "fal-ai/nano-banana", label: "Nano Banana Flash", description: "Ultra-fast generation" },
];

// Image dimension presets
const DIMENSION_PRESETS = [
  { label: "Square (1024x1024)", width: 1024, height: 1024 },
  { label: "Landscape (1024x768)", width: 1024, height: 768 },
  { label: "Portrait (768x1024)", width: 768, height: 1024 },
  { label: "Wide Landscape (1280x720)", width: 1280, height: 720 },
  { label: "Tall Portrait (720x1280)", width: 720, height: 1280 },
];

// Temporary userId - will be replaced with auth later
const TEMP_USER_ID = "user-1";

export default function ProductImageGenerationPage() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0].value);
  const [dimensionPreset, setDimensionPreset] = useState("0");
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);
  const [useCustomDimensions, setUseCustomDimensions] = useState(false);

  // Style options
  const [styleSource, setStyleSource] = useState<"none" | "upload" | "previous">("none");
  const [uploadedStyleImage, setUploadedStyleImage] = useState<File | null>(null);
  const [uploadedStylePreview, setUploadedStylePreview] = useState<string | null>(null);
  const [selectedStyleImageId, setSelectedStyleImageId] = useState<Id<"generatedFiles"> | null>(null);
  const [styleStrength, setStyleStrength] = useState(0.7);

  // Background options
  const [backgroundType, setBackgroundType] = useState<"transparent" | "generated" | "provided">("transparent");
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [uploadedBackgroundImage, setUploadedBackgroundImage] = useState<File | null>(null);
  const [uploadedBackgroundPreview, setUploadedBackgroundPreview] = useState<string | null>(null);
  const [selectedBackgroundImageId, setSelectedBackgroundImageId] = useState<Id<"generatedFiles"> | null>(null);

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [guidanceScale, setGuidanceScale] = useState<number | undefined>(undefined);

  const [currentGenerationId, setCurrentGenerationId] = useState<Id<"imageGenerations"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<Id<"generatedFiles"> | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isUploadingStyle, setIsUploadingStyle] = useState(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Convex hooks
  const generateImageAction = useAction(api.generatorActions.generateImage);
  const pollStatusAction = useAction(api.generatorActions.pollGenerationStatus);
  const downloadAndStoreAction = useAction(api.generatorActions.downloadAndStoreFile);
  const uploadFileAction = useAction(api.generatorActions.uploadFile);
  const createGeneration = useMutation(api.mutations.createImageGeneration);
  const updateGenerationStatus = useMutation(api.mutations.updateImageGenerationStatus);
  const createCollection = useMutation(api.mutations.createCollection);
  const updateCollection = useMutation(api.mutations.updateCollection);
  const collections = useQuery(api.queries.getCollectionsByUser, { userId: TEMP_USER_ID });
  const generateUploadUrl = useAction(api.files.generateUploadUrl);

  // Get user's previous image generations for style selection
  const userImageFiles = useQuery(api.queries.getGeneratedFiles, {
    userId: TEMP_USER_ID,
    fileType: "image",
  });

  // Get current generation status
  const currentGeneration = useQuery(
    api.queries.getImageGenerationById,
    currentGenerationId ? { id: currentGenerationId } : "skip"
  );

  // Get generated files
  const generatedFiles = useQuery(
    api.queries.getGeneratedFilesByGenerationId,
    currentGenerationId ? { generationId: currentGenerationId } : "skip"
  );

  // Handle style image upload
  const handleStyleImageUpload = async (file: File) => {
    setIsUploadingStyle(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uploaded = await uploadFileAction({
        file: arrayBuffer,
        fileName: file.name,
        mimeType: file.type,
      });

      // Create a temporary generated file record for style reference
      // Note: This is a simplified approach - in production, you might want a separate table
      const previewUrl = uploaded.fileUrl;
      setUploadedStylePreview(previewUrl);
      setUploadedStyleImage(file);
      setIsUploadingStyle(false);
    } catch (error: any) {
      console.error("Style upload error:", error);
      setGenerationError(`Failed to upload style image: ${error.message}`);
      setIsUploadingStyle(false);
    }
  };

  // Handle background image upload
  const handleBackgroundImageUpload = async (file: File) => {
    setIsUploadingBackground(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uploaded = await uploadFileAction({
        file: arrayBuffer,
        fileName: file.name,
        mimeType: file.type,
      });

      const previewUrl = uploaded.fileUrl;
      setUploadedBackgroundPreview(previewUrl);
      setUploadedBackgroundImage(file);
      setIsUploadingBackground(false);
    } catch (error: any) {
      console.error("Background upload error:", error);
      setGenerationError(`Failed to upload background image: ${error.message}`);
      setIsUploadingBackground(false);
    }
  };

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
          model: currentGeneration.model,
        });

        if (status.isCompleted && status.images.length > 0) {
          await handleCompletedGeneration(status.images, currentGenerationId);
        } else if (status.isFailed) {
          await updateGenerationStatus({
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
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [currentGenerationId, currentGeneration, pollStatusAction, updateGenerationStatus]);

  const handleCompletedGeneration = async (imageUrls: string[], generationId: Id<"imageGenerations">) => {
    if (!generationId || !imageUrls || imageUrls.length === 0) return;

    try {
      const fileIds: Id<"generatedFiles">[] = [];
      const dimensions = useCustomDimensions
        ? { width: customWidth, height: customHeight }
        : DIMENSION_PRESETS[parseInt(dimensionPreset)];

      for (const imageUrl of imageUrls) {
        const stored = await downloadAndStoreAction({
          url: imageUrl,
          generationId: generationId,
          generationType: "image",
          width: dimensions.width,
          height: dimensions.height,
        });
        fileIds.push(stored.fileId);
      }

      await updateGenerationStatus({
        id: generationId,
        status: "completed",
        generatedFileIds: fileIds,
        completedAt: Date.now(),
      });

      setIsGenerating(false);
      setGenerationError(null);
    } catch (error: any) {
      console.error("Error storing files:", error);
      await updateGenerationStatus({
        id: generationId,
        status: "failed",
        errorMessage: error.message,
      });
      setIsGenerating(false);
      setGenerationError(error.message);
    }
  };

  const handleGenerate = async () => {
    if (!productName.trim()) {
      setGenerationError("Please enter a product name");
      return;
    }

    if (!prompt.trim()) {
      setGenerationError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const dimensions = useCustomDimensions
        ? { width: customWidth, height: customHeight }
        : DIMENSION_PRESETS[parseInt(dimensionPreset)];

      // Build the prompt with product info
      let finalPrompt = prompt;
      if (productDescription) {
        finalPrompt = `${productName}. ${productDescription}. ${prompt}`;
      } else {
        finalPrompt = `${productName}. ${prompt}`;
      }

      // Add background prompt if generating background
      if (backgroundType === "generated" && backgroundPrompt.trim()) {
        finalPrompt = `${finalPrompt}. Background: ${backgroundPrompt.trim()}`;
      }

      // Handle style reference image URL
      let styleImageUrl: string | undefined;
      let styleReferenceId: Id<"generatedFiles"> | undefined;

      if (styleSource === "upload" && uploadedStylePreview) {
        styleImageUrl = uploadedStylePreview;
      } else if (styleSource === "previous" && selectedStyleImageId) {
        const styleFile = userImageFiles?.find((f) => f._id === selectedStyleImageId);
        if (styleFile) {
          styleImageUrl = styleFile.fileUrl;
          styleReferenceId = selectedStyleImageId;
        }
      }

      // Handle background image URL
      let backgroundImageUrl: string | undefined;
      let backgroundImageId: Id<"generatedFiles"> | undefined;

      if (backgroundType === "provided" && uploadedBackgroundPreview) {
        backgroundImageUrl = uploadedBackgroundPreview;
      } else if (backgroundType === "provided" && selectedBackgroundImageId) {
        const bgFile = userImageFiles?.find((f) => f._id === selectedBackgroundImageId);
        if (bgFile) {
          backgroundImageUrl = bgFile.fileUrl;
          backgroundImageId = selectedBackgroundImageId;
        }
      }

      // Create generation record
      const generationId = await createGeneration({
        userId: TEMP_USER_ID,
        type: "product",
        model: selectedModel,
        prompt: finalPrompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        width: dimensions.width,
        height: dimensions.height,
        numImages: 1,
        seed: seed,
        guidanceScale: guidanceScale,
        styleImageId: styleReferenceId,
        productConfig: {
          productName: productName.trim(),
          productDescription: productDescription.trim() || undefined,
          styleReferenceId: styleReferenceId,
          styleStrength: styleSource !== "none" ? styleStrength : undefined,
          backgroundType: backgroundType,
          backgroundImageId: backgroundImageId,
        },
      });

      setCurrentGenerationId(generationId);

      // Call fal.ai API with style transfer if applicable
      const result = await generateImageAction({
        model: selectedModel,
        prompt: finalPrompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        width: dimensions.width,
        height: dimensions.height,
        seed: seed,
        guidanceScale: guidanceScale,
        imageUrl: styleImageUrl,
        strength: styleSource !== "none" ? styleStrength : undefined,
      });

      // Update with request ID
      await updateGenerationStatus({
        id: generationId,
        status: result.isCompleted ? "completed" : "processing",
        falRequestId: result.requestId,
      });

      setCurrentGenerationId(generationId);

      if (result.isCompleted && result.images && result.images.length > 0) {
        await handleCompletedGeneration(result.images, generationId);
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      setGenerationError(error.message);
      setIsGenerating(false);
      if (currentGenerationId) {
        await updateGenerationStatus({
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
      a.download = fileName || `product-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download image");
    }
  };

  const handleAddToCollection = (fileId: Id<"generatedFiles">) => {
    setSelectedFileId(fileId);
    setCollectionDialogOpen(true);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || !selectedFileId) return;

    try {
      await createCollection({
        userId: TEMP_USER_ID,
        name: newCollectionName.trim(),
        description: undefined,
        fileIds: [selectedFileId],
        isPublic: false,
      });
      setNewCollectionName("");
      setCollectionDialogOpen(false);
      setSelectedFileId(null);
    } catch (error: any) {
      console.error("Error creating collection:", error);
      alert("Failed to create collection");
    }
  };

  const handleAddToExistingCollection = async (collectionId: Id<"userCollections">) => {
    if (!selectedFileId) return;

    const collection = collections?.find((c) => c._id === collectionId);
    if (!collection) return;

    try {
      const updatedFileIds = collection.fileIds.includes(selectedFileId)
        ? collection.fileIds
        : [...collection.fileIds, selectedFileId];

      await updateCollection({
        id: collectionId,
        fileIds: updatedFileIds,
      });

      setCollectionDialogOpen(false);
      setSelectedFileId(null);
    } catch (error: any) {
      console.error("Error updating collection:", error);
      alert("Failed to add to collection");
    }
  };

  const getDimensionDisplay = () => {
    if (useCustomDimensions) {
      return `${customWidth}x${customHeight}`;
    }
    const preset = DIMENSION_PRESETS[parseInt(dimensionPreset)];
    return `${preset.width}x${preset.height}`;
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
            <h1 className="text-xl md:text-2xl font-bold">Product Image Generation</h1>
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
            {/* Generation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Product Image</CardTitle>
                <CardDescription>
                  Create product images with style transfer and customizable backgrounds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      placeholder="e.g., Coffee Mug, T-Shirt, Watch"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productDescription">Product Description (Optional)</Label>
                    <textarea
                      id="productDescription"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Describe the product features, materials, or characteristics..."
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      maxLength={500}
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {productDescription.length}/500 characters
                    </div>
                  </div>
                </div>

                {/* Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">Generation Prompt *</Label>
                  <textarea
                    id="prompt"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe how you want the product to appear in the image..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    maxLength={2000}
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {prompt.length}/2000 characters
                  </div>
                </div>

                {/* Negative Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
                  <Input
                    id="negativePrompt"
                    placeholder="What to avoid in the image..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    maxLength={500}
                  />
                </div>

                {/* Style Selection */}
                <div className="space-y-4">
                  <Label>Style Transfer</Label>
                  <Select
                    value={styleSource}
                    onValueChange={(value: "none" | "upload" | "previous") => {
                      setStyleSource(value);
                      if (value === "none") {
                        setUploadedStyleImage(null);
                        setUploadedStylePreview(null);
                        setSelectedStyleImageId(null);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No style transfer</SelectItem>
                      <SelectItem value="upload">Upload style image</SelectItem>
                      <SelectItem value="previous">Select from previous generations</SelectItem>
                    </SelectContent>
                  </Select>

                  {styleSource === "upload" && (
                    <div className="space-y-2">
                      <Label>Upload Style Image</Label>
                      <div className="border-2 border-dashed rounded-lg p-4">
                        {uploadedStylePreview ? (
                          <div className="relative">
                            <img
                              src={uploadedStylePreview}
                              alt="Style preview"
                              className="max-h-48 mx-auto rounded"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => {
                                setUploadedStyleImage(null);
                                setUploadedStylePreview(null);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <Label htmlFor="styleUpload" className="cursor-pointer">
                              <Button variant="outline" disabled={isUploadingStyle}>
                                {isUploadingStyle ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Choose Style Image
                                  </>
                                )}
                              </Button>
                            </Label>
                            <input
                              id="styleUpload"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleStyleImageUpload(file);
                                }
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {styleSource === "previous" && (
                    <div className="space-y-2">
                      <Label>Select Style Image</Label>
                      <Select
                        value={selectedStyleImageId || ""}
                        onValueChange={(value) => setSelectedStyleImageId(value as Id<"generatedFiles">)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an image..." />
                        </SelectTrigger>
                        <SelectContent>
                          {userImageFiles?.slice(0, 20).map((file) => (
                            <SelectItem key={file._id} value={file._id}>
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" />
                                {file.width}x{file.height} - {new Date(file.createdAt).toLocaleDateString()}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedStyleImageId && (
                        <div className="mt-2">
                          {(() => {
                            const selectedFile = userImageFiles?.find((f) => f._id === selectedStyleImageId);
                            return selectedFile ? (
                              <img
                                src={selectedFile.fileUrl}
                                alt="Style preview"
                                className="max-h-48 rounded border"
                              />
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {styleSource !== "none" && (
                    <div className="space-y-2">
                      <Label htmlFor="styleStrength">
                        Style Strength: {styleStrength.toFixed(2)}
                      </Label>
                      <input
                        id="styleStrength"
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={styleStrength}
                        onChange={(e) => setStyleStrength(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>0.0 (Subtle)</span>
                        <span>1.0 (Strong)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Background Options */}
                <div className="space-y-4">
                  <Label>Background</Label>
                  <Select
                    value={backgroundType}
                    onValueChange={(value: "transparent" | "generated" | "provided") => {
                      setBackgroundType(value);
                      if (value === "transparent") {
                        setUploadedBackgroundImage(null);
                        setUploadedBackgroundPreview(null);
                        setSelectedBackgroundImageId(null);
                        setBackgroundPrompt("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transparent">Transparent Background</SelectItem>
                      <SelectItem value="generated">Generate Background</SelectItem>
                      <SelectItem value="provided">Upload Background Image</SelectItem>
                    </SelectContent>
                  </Select>

                  {backgroundType === "generated" && (
                    <div className="space-y-2">
                      <Label htmlFor="backgroundPrompt">Background Prompt</Label>
                      <Input
                        id="backgroundPrompt"
                        placeholder="Describe the background you want..."
                        value={backgroundPrompt}
                        onChange={(e) => setBackgroundPrompt(e.target.value)}
                      />
                    </div>
                  )}

                  {backgroundType === "provided" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Upload Background Image</Label>
                        <div className="border-2 border-dashed rounded-lg p-4">
                          {uploadedBackgroundPreview ? (
                            <div className="relative">
                              <img
                                src={uploadedBackgroundPreview}
                                alt="Background preview"
                                className="max-h-48 mx-auto rounded"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => {
                                  setUploadedBackgroundImage(null);
                                  setUploadedBackgroundPreview(null);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Upload className="h-8 w-8 text-muted-foreground" />
                              <Label htmlFor="backgroundUpload" className="cursor-pointer">
                                <Button variant="outline" disabled={isUploadingBackground}>
                                  {isUploadingBackground ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="mr-2 h-4 w-4" />
                                      Choose Background Image
                                    </>
                                  )}
                                </Button>
                              </Label>
                              <input
                                id="backgroundUpload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleBackgroundImageUpload(file);
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Or Select from Previous Generations</Label>
                        <Select
                          value={selectedBackgroundImageId || ""}
                          onValueChange={(value) => setSelectedBackgroundImageId(value as Id<"generatedFiles">)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an image..." />
                          </SelectTrigger>
                          <SelectContent>
                            {userImageFiles?.slice(0, 20).map((file) => (
                              <SelectItem key={file._id} value={file._id}>
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="h-4 w-4" />
                                  {file.width}x{file.height} - {new Date(file.createdAt).toLocaleDateString()}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedBackgroundImageId && (
                          <div className="mt-2">
                            {(() => {
                              const selectedFile = userImageFiles?.find((f) => f._id === selectedBackgroundImageId);
                              return selectedFile ? (
                                <img
                                  src={selectedFile.fileUrl}
                                  alt="Background preview"
                                  className="max-h-48 rounded border"
                                />
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODELS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div>
                            <div className="font-medium">{model.label}</div>
                            <div className="text-xs text-muted-foreground">{model.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dimensions */}
                <div className="space-y-4">
                  <Label>Image Dimensions</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useCustom"
                      checked={useCustomDimensions}
                      onChange={(e) => setUseCustomDimensions(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="useCustom" className="cursor-pointer">
                      Use custom dimensions
                    </Label>
                  </div>

                  {useCustomDimensions ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="width">Width</Label>
                        <Input
                          id="width"
                          type="number"
                          min={256}
                          max={2048}
                          step={64}
                          value={customWidth}
                          onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1024)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="height">Height</Label>
                        <Input
                          id="height"
                          type="number"
                          min={256}
                          max={2048}
                          step={64}
                          value={customHeight}
                          onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1024)}
                        />
                      </div>
                    </div>
                  ) : (
                    <Select value={dimensionPreset} onValueChange={setDimensionPreset}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIMENSION_PRESETS.map((preset, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Selected: {getDimensionDisplay()}
                  </div>
                </div>

                {/* Advanced Parameters */}
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {showAdvanced ? "Hide" : "Show"} Advanced Parameters
                  </button>

                  {showAdvanced && (
                    <div className="space-y-4 pl-4 border-l-2">
                      <div className="space-y-2">
                        <Label htmlFor="seed">Seed (Optional)</Label>
                        <Input
                          id="seed"
                          type="number"
                          placeholder="Leave empty for random"
                          value={seed || ""}
                          onChange={(e) =>
                            setSeed(e.target.value ? parseInt(e.target.value) : undefined)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="guidanceScale">
                          Guidance Scale: {guidanceScale || "Default"}
                        </Label>
                        <input
                          id="guidanceScale"
                          type="range"
                          min={1}
                          max={20}
                          step={0.5}
                          value={guidanceScale || 7.5}
                          onChange={(e) =>
                            setGuidanceScale(parseFloat(e.target.value))
                          }
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground flex justify-between">
                          <span>1 (More creative)</span>
                          <span>20 (More accurate)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !productName.trim() || !prompt.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Product Image
                    </>
                  )}
                </Button>

                {/* Error Display */}
                {generationError && (
                  <div className="flex items-center gap-2 p-4 border border-destructive rounded-md bg-destructive/10 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <div className="flex-1">
                      <div className="font-medium">Generation Failed</div>
                      <div className="text-sm">{generationError}</div>
                    </div>
                  </div>
                )}

                {/* Status Display */}
                {currentGeneration && (
                  <div className="flex items-center gap-2 p-4 border rounded-md">
                    {currentGeneration.status === "processing" || currentGeneration.status === "pending" ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <div>
                          <div className="font-medium">Processing...</div>
                          <div className="text-sm text-muted-foreground">
                            This may take a few moments
                          </div>
                        </div>
                      </>
                    ) : currentGeneration.status === "completed" ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <div className="font-medium text-green-600">Generation Complete</div>
                          <div className="text-sm text-muted-foreground">
                            {generatedFiles?.length || 0} image(s) generated
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Display */}
            {generatedFiles && generatedFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Generated Product Images</CardTitle>
                  <CardDescription>
                    Your generated product images are ready to download
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generatedFiles.map((file) => (
                      <div
                        key={file._id}
                        className="relative group border rounded-lg overflow-hidden"
                      >
                        <img
                          src={file.fileUrl}
                          alt="Generated product"
                          className="w-full h-auto"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center gap-2 justify-center opacity-0 group-hover:opacity-100">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleDownload(file.fileUrl, `product-${file._id}.png`)
                            }
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              router.push(`/generator/admin/image-editor?fileId=${file._id}&imageUrl=${encodeURIComponent(file.fileUrl)}`);
                            }}
                          >
                            <Wand2 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddToCollection(file._id)}
                          >
                            <FolderPlus className="mr-2 h-4 w-4" />
                            Add to Collection
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

            {/* Add to Collection Dialog */}
            <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Collection</DialogTitle>
                  <DialogDescription>
                    Select an existing collection or create a new one
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {collections && collections.length > 0 && (
                    <div className="space-y-2">
                      <Label>Existing Collections</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {collections.map((collection) => (
                          <Button
                            key={collection._id}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleAddToExistingCollection(collection._id)}
                          >
                            <FolderPlus className="mr-2 h-4 w-4" />
                            {collection.name}
                            {collection.fileIds.length > 0 && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {collection.fileIds.length} file(s)
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="collection-name">Create New Collection</Label>
                    <div className="flex gap-2">
                      <Input
                        id="collection-name"
                        placeholder="Collection name"
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newCollectionName.trim()) {
                            handleCreateCollection();
                          }
                        }}
                      />
                      <Button
                        onClick={handleCreateCollection}
                        disabled={!newCollectionName.trim()}
                      >
                        <FolderPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCollectionDialogOpen(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}

