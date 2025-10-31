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
import {
  Menu,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  GripVertical,
  Upload,
  Download,
  Image as ImageIcon,
  Trash2,
  Save,
  Monitor,
} from "lucide-react";
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

// Temporary userId - will be replaced with auth later
const TEMP_USER_ID = "user-1";

// Menu dimension presets
const MENU_DIMENSION_PRESETS = [
  { label: "Landscape (1920x1080)", width: 1920, height: 1080 },
  { label: "Portrait (1080x1920)", width: 1080, height: 1920 },
  { label: "Square (1024x1024)", width: 1024, height: 1024 },
  { label: "Wide Landscape (2560x1440)", width: 2560, height: 1440 },
];

// Available models for background generation
const BACKGROUND_MODELS = [
  { value: "fal-ai/imagen4/preview", label: "Google Imagen 4", description: "High-quality backgrounds" },
  { value: "fal-ai/nano-banana", label: "Nano Banana Flash", description: "Fast generation" },
];

interface MenuProduct {
  id: string;
  productId?: Id<"products">;
  name: string;
  price: number;
  imageId?: Id<"generatedFiles">;
  imagePrompt?: string;
  imageUrl?: string;
  imageSource: "generated" | "provided" | "none";
  order: number;
}

export default function MenuGenerationPage() {
  const router = useRouter();

  // Menu configuration
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [pricePosition, setPricePosition] = useState<"top" | "bottom" | "right" | "left">("bottom");
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([]);
  const [backgroundSource, setBackgroundSource] = useState<"generated" | "provided" | "none">("none");
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [backgroundModel, setBackgroundModel] = useState(BACKGROUND_MODELS[0].value);
  const [uploadedBackgroundImage, setUploadedBackgroundImage] = useState<File | null>(null);
  const [uploadedBackgroundPreview, setUploadedBackgroundPreview] = useState<string | null>(null);
  const [selectedBackgroundImageId, setSelectedBackgroundImageId] = useState<Id<"generatedFiles"> | null>(null);

  // Layout options
  const [layoutType, setLayoutType] = useState<"grid" | "list">("grid");
  const [gridColumns, setGridColumns] = useState(2);
  const [spacing, setSpacing] = useState(16);
  const [showPrices, setShowPrices] = useState(true);
  const [showImages, setShowImages] = useState(true);

  // Dimensions
  const [dimensionPreset, setDimensionPreset] = useState("0");
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [useCustomDimensions, setUseCustomDimensions] = useState(false);

  // Product selection
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [customProductDialogOpen, setCustomProductDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState("");
  const [selectedProductForImage, setSelectedProductForImage] = useState<string | null>(null);
  const [imagePromptDialogOpen, setImagePromptDialogOpen] = useState(false);
  const [productImagePrompt, setProductImagePrompt] = useState("");

  // Generation state
  const [currentGenerationId, setCurrentGenerationId] = useState<Id<"imageGenerations"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);

  // Convex hooks
  const activeProducts = useQuery(api.queries.getActiveProducts);
  const screens = useQuery(api.queries.getScreens);
  const generateImageAction = useAction(api.generatorActions.generateImage);
  const pollStatusAction = useAction(api.generatorActions.pollGenerationStatus);
  const downloadAndStoreAction = useAction(api.generatorActions.downloadAndStoreFile);
  const uploadFileAction = useAction(api.generatorActions.uploadFile);
  const createGeneration = useMutation(api.mutations.createImageGeneration);
  const updateGenerationStatus = useMutation(api.mutations.updateImageGenerationStatus);
  const updateScreen = useMutation(api.mutations.updateScreen);

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

      for (const imageUrl of imageUrls) {
        const width = useCustomDimensions ? customWidth : MENU_DIMENSION_PRESETS[parseInt(dimensionPreset)].width;
        const height = useCustomDimensions ? customHeight : MENU_DIMENSION_PRESETS[parseInt(dimensionPreset)].height;

        const stored = await downloadAndStoreAction({
          url: imageUrl,
          generationId: generationId,
          generationType: "image",
          width,
          height,
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

  const handleBackgroundUpload = async (file: File) => {
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
      setBackgroundSource("provided");
      setIsUploadingBackground(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      setIsUploadingBackground(false);
      setGenerationError(error.message);
    }
  };

  const handleGenerateBackground = async () => {
    if (!backgroundPrompt) {
      setGenerationError("Please enter a background prompt");
      return;
    }

    setIsGeneratingBackground(true);
    setGenerationError(null);

    try {
      const width = useCustomDimensions ? customWidth : MENU_DIMENSION_PRESETS[parseInt(dimensionPreset)].width;
      const height = useCustomDimensions ? customHeight : MENU_DIMENSION_PRESETS[parseInt(dimensionPreset)].height;

      const generationId = await createGeneration({
        userId: TEMP_USER_ID,
        type: "menu",
        model: backgroundModel,
        prompt: backgroundPrompt,
        width,
        height,
        numImages: 1,
      });

      const result = await generateImageAction({
        model: backgroundModel,
        prompt: backgroundPrompt,
        width,
        height,
        numImages: 1,
      });

      await updateGenerationStatus({
        id: generationId,
        status: result.isCompleted ? "completed" : "processing",
        falRequestId: result.requestId,
      });

      if (result.isCompleted && result.images.length > 0) {
        await handleCompletedGeneration(result.images, generationId);
        const files = await downloadAndStoreAction({
          url: result.images[0],
          generationId: generationId,
          generationType: "image",
          width,
          height,
        });
        setSelectedBackgroundImageId(files.fileId);
        setBackgroundSource("generated");
      } else {
        setCurrentGenerationId(generationId);
      }
    } catch (error: any) {
      console.error("Background generation error:", error);
      setGenerationError(error.message);
    } finally {
      setIsGeneratingBackground(false);
    }
  };

  const addProductFromSignage = (product: any) => {
    const newProduct: MenuProduct = {
      id: `product-${Date.now()}`,
      productId: product._id,
      name: product.name,
      price: product.price,
      imageSource: product.image ? "provided" : "none",
      imageUrl: product.image,
      order: menuProducts.length,
    };
    setMenuProducts([...menuProducts, newProduct]);
    setProductDialogOpen(false);
  };

  const addCustomProduct = () => {
    if (!newProductName || !newProductPrice) return;

    const newProduct: MenuProduct = {
      id: `custom-${Date.now()}`,
      name: newProductName,
      price: parseFloat(newProductPrice),
      imageSource: "none",
      order: menuProducts.length,
    };
    setMenuProducts([...menuProducts, newProduct]);
    setNewProductName("");
    setNewProductPrice("");
    setCustomProductDialogOpen(false);
  };

  const removeProduct = (id: string) => {
    setMenuProducts(menuProducts.filter((p) => p.id !== id).map((p, idx) => ({ ...p, order: idx })));
  };

  const moveProduct = (index: number, direction: "up" | "down") => {
    const newProducts = [...menuProducts];
    if (direction === "up" && index > 0) {
      [newProducts[index - 1], newProducts[index]] = [newProducts[index], newProducts[index - 1]];
    } else if (direction === "down" && index < newProducts.length - 1) {
      [newProducts[index], newProducts[index + 1]] = [newProducts[index + 1], newProducts[index]];
    }
    setMenuProducts(newProducts.map((p, idx) => ({ ...p, order: idx })));
  };

  const handleProductImagePrompt = () => {
    if (!selectedProductForImage || !productImagePrompt) return;

    setMenuProducts(
      menuProducts.map((p) =>
        p.id === selectedProductForImage
          ? { ...p, imagePrompt: productImagePrompt, imageSource: "generated" as const }
          : p
      )
    );
    setImagePromptDialogOpen(false);
    setProductImagePrompt("");
    setSelectedProductForImage(null);
  };

  const handleGenerateMenu = async () => {
    if (menuProducts.length === 0) {
      setGenerationError("Please add at least one product to the menu");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const width = useCustomDimensions ? customWidth : MENU_DIMENSION_PRESETS[parseInt(dimensionPreset)].width;
      const height = useCustomDimensions ? customHeight : MENU_DIMENSION_PRESETS[parseInt(dimensionPreset)].height;

      // Build menu prompt
      const productList = menuProducts
        .sort((a, b) => a.order - b.order)
        .map((p) => `${p.name} - ${p.price} CZK`)
        .join(", ");
      
      let menuPrompt = `Create a professional menu display for a restaurant/cafe. ${orientation} orientation. Products: ${productList}. `;
      
      if (backgroundSource === "generated" && backgroundPrompt) {
        menuPrompt += `Background: ${backgroundPrompt}. `;
      }
      
      menuPrompt += `Layout: ${layoutType} layout with ${gridColumns} columns. `;
      menuPrompt += `Price position: ${pricePosition}. `;
      menuPrompt += `Modern, clean design with good typography. Professional food photography style.`;

      // Create generation record
      const generationId = await createGeneration({
        userId: TEMP_USER_ID,
        type: "menu",
        model: backgroundModel,
        prompt: menuPrompt,
        width,
        height,
        numImages: 1,
        menuConfig: {
          orientation,
          pricePosition,
          useGeneratedImages: menuProducts.some((p) => p.imageSource === "generated"),
          useProvidedImages: menuProducts.some((p) => p.imageSource === "provided"),
          backgroundSource,
          backgroundImageId: selectedBackgroundImageId || undefined,
          products: menuProducts.map((p) => ({
            productId: p.productId,
            name: p.name,
            price: p.price,
            imageId: p.imageId,
            order: p.order,
          })),
        },
      });

      setCurrentGenerationId(generationId);

      // Generate menu image
      const result = await generateImageAction({
        model: backgroundModel,
        prompt: menuPrompt,
        width,
        height,
        numImages: 1,
      });

      await updateGenerationStatus({
        id: generationId,
        status: result.isCompleted ? "completed" : "processing",
        falRequestId: result.requestId,
      });

      if (result.isCompleted && result.images && result.images.length > 0) {
        await handleCompletedGeneration(result.images, generationId);
      }
    } catch (error: any) {
      console.error("Menu generation error:", error);
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

  const handleSaveToScreen = async (screenId: Id<"screens">) => {
    if (!generatedFiles || generatedFiles.length === 0) {
      setGenerationError("No generated menu to save");
      return;
    }

    try {
      await updateScreen({
        id: screenId,
        mode: "static",
        staticConfig: {
          imageUrl: generatedFiles[0].fileUrl,
        },
      });
      setGenerationError(null);
      // Show success message (you could add a toast notification here)
      alert("Menu saved to screen successfully!");
    } catch (error: any) {
      console.error("Error saving to screen:", error);
      setGenerationError(`Failed to save to screen: ${error.message}`);
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.click();
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-64 border-r bg-muted/40 p-4">
        <GeneratorNav />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Menu Generator</h1>
              <p className="text-muted-foreground mt-1">
                Create AI-generated menu displays for digital signage
              </p>
            </div>
            <Link href="/generator/admin">
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Menu Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Menu Configuration</CardTitle>
                  <CardDescription>Set up your menu layout and orientation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Orientation</Label>
                      <Select value={orientation} onValueChange={(v) => setOrientation(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="landscape">Landscape</SelectItem>
                          <SelectItem value="portrait">Portrait</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Price Position</Label>
                      <Select value={pricePosition} onValueChange={(v) => setPricePosition(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="left">Left</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Layout Type</Label>
                    <Select value={layoutType} onValueChange={(v) => setLayoutType(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grid">Grid</SelectItem>
                        <SelectItem value="list">List</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {layoutType === "grid" && (
                    <div>
                      <Label>Grid Columns</Label>
                      <Select value={gridColumns.toString()} onValueChange={(v) => setGridColumns(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Columns</SelectItem>
                          <SelectItem value="3">3 Columns</SelectItem>
                          <SelectItem value="4">4 Columns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>Add products to your menu</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={() => setProductDialogOpen(true)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add from Signage
                    </Button>
                    <Button onClick={() => setCustomProductDialogOpen(true)} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Product
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {menuProducts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No products added yet. Add products to get started.
                      </p>
                    ) : (
                      menuProducts
                        .sort((a, b) => a.order - b.order)
                        .map((product, index) => (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {product.price} CZK
                                </div>
                              </div>
                              {product.imageSource === "generated" && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                  AI Image
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {index > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveProduct(index, "up")}
                                >
                                  ↑
                                </Button>
                              )}
                              {index < menuProducts.length - 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => moveProduct(index, "down")}
                                >
                                  ↓
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedProductForImage(product.id);
                                  setImagePromptDialogOpen(true);
                                }}
                              >
                                <ImageIcon className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Background Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Background</CardTitle>
                  <CardDescription>Configure menu background</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Background Source</Label>
                    <Select value={backgroundSource} onValueChange={(v) => setBackgroundSource(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Background</SelectItem>
                        <SelectItem value="generated">Generate Background</SelectItem>
                        <SelectItem value="provided">Upload Background</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {backgroundSource === "generated" && (
                    <div className="space-y-4">
                      <div>
                        <Label>Background Prompt</Label>
                        <Input
                          value={backgroundPrompt}
                          onChange={(e) => setBackgroundPrompt(e.target.value)}
                          placeholder="e.g., Modern restaurant interior with warm lighting"
                        />
                      </div>
                      <div>
                        <Label>Model</Label>
                        <Select value={backgroundModel} onValueChange={setBackgroundModel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BACKGROUND_MODELS.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleGenerateBackground}
                        disabled={isGeneratingBackground || !backgroundPrompt}
                      >
                        {isGeneratingBackground ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Background
                          </>
                        )}
                      </Button>
                      {selectedBackgroundImageId && (
                        <div className="text-sm text-green-600 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Background generated successfully
                        </div>
                      )}
                    </div>
                  )}

                  {backgroundSource === "provided" && (
                    <div className="space-y-4">
                      <div>
                        <Label>Upload Background Image</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                setUploadedBackgroundPreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                              handleBackgroundUpload(file);
                            }
                          }}
                        />
                      </div>
                      {uploadedBackgroundPreview && (
                        <div className="border rounded-lg overflow-hidden">
                          <img
                            src={uploadedBackgroundPreview}
                            alt="Background preview"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dimensions */}
              <Card>
                <CardHeader>
                  <CardTitle>Dimensions</CardTitle>
                  <CardDescription>Set menu dimensions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Preset</Label>
                    <Select value={dimensionPreset} onValueChange={setDimensionPreset}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MENU_DIMENSION_PRESETS.map((preset, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useCustomDimensions}
                      onChange={(e) => setUseCustomDimensions(e.target.checked)}
                      className="rounded"
                    />
                    <Label>Use Custom Dimensions</Label>
                  </div>
                  {useCustomDimensions && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Width</Label>
                        <Input
                          type="number"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1920)}
                        />
                      </div>
                      <div>
                        <Label>Height</Label>
                        <Input
                          type="number"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Generate Button */}
              <Card>
                <CardContent className="pt-6">
                  <Button
                    onClick={handleGenerateMenu}
                    disabled={isGenerating || menuProducts.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Menu...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Menu
                      </>
                    )}
                  </Button>
                  {generationError && (
                    <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {generationError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Results */}
              {generatedFiles && generatedFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Menu</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {generatedFiles.map((file) => (
                      <div key={file._id} className="space-y-2">
                        <div className="border rounded-lg overflow-hidden">
                          <img
                            src={file.fileUrl}
                            alt="Generated menu"
                            className="w-full h-auto"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleDownload(file.fileUrl, `menu-${Date.now()}.png`)}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          {screens && screens.length > 0 && (
                            <Select onValueChange={(v) => handleSaveToScreen(v as Id<"screens">)}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Save to screen..." />
                              </SelectTrigger>
                              <SelectContent>
                                {screens.map((screen) => (
                                  <SelectItem key={screen._id} value={screen._id}>
                                    {screen.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>Live preview of your menu</CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border rounded-lg bg-muted/50 p-4 ${
                      orientation === "landscape" ? "aspect-video" : "aspect-[9/16]"
                    }`}
                  >
                    {menuProducts.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                        Add products to see preview
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {layoutType === "grid" ? (
                          <div
                            className={`grid gap-${spacing} ${
                              gridColumns === 2 ? "grid-cols-2" : gridColumns === 3 ? "grid-cols-3" : "grid-cols-4"
                            }`}
                          >
                            {menuProducts
                              .sort((a, b) => a.order - b.order)
                              .slice(0, gridColumns * 2)
                              .map((product) => (
                                <div
                                  key={product.id}
                                  className="border rounded p-2 bg-background text-xs"
                                >
                                  {showImages && (
                                    <div className="w-full h-16 bg-muted rounded mb-1 flex items-center justify-center">
                                      {product.imageUrl ? (
                                        <img
                                          src={product.imageUrl}
                                          alt={product.name}
                                          className="w-full h-full object-cover rounded"
                                        />
                                      ) : (
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                      )}
                                    </div>
                                  )}
                                  {pricePosition === "top" && showPrices && (
                                    <div className="font-bold">{product.price} CZK</div>
                                  )}
                                  <div className="font-medium">{product.name}</div>
                                  {pricePosition === "bottom" && showPrices && (
                                    <div className="font-bold">{product.price} CZK</div>
                                  )}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {menuProducts
                              .sort((a, b) => a.order - b.order)
                              .map((product) => (
                                <div
                                  key={product.id}
                                  className="border rounded p-2 bg-background flex items-center gap-2"
                                >
                                  {showImages && (
                                    <div className="w-16 h-16 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                                      {product.imageUrl ? (
                                        <img
                                          src={product.imageUrl}
                                          alt={product.name}
                                          className="w-full h-full object-cover rounded"
                                        />
                                      ) : (
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                      )}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{product.name}</div>
                                    {showPrices && (
                                      <div className="font-bold text-sm">
                                        {pricePosition === "right" ? (
                                          <span className="float-right">{product.price} CZK</span>
                                        ) : (
                                          `${product.price} CZK`
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select Products from Signage</DialogTitle>
            <DialogDescription>Choose products to add to your menu</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto space-y-2">
            {activeProducts && activeProducts.length > 0 ? (
              activeProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted"
                  onClick={() => addProductFromSignage(product)}
                >
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.price} {product.currency}
                    </div>
                  </div>
                  <Plus className="h-4 w-4" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active products found. Add products in the signage admin first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Product Dialog */}
      <Dialog open={customProductDialogOpen} onOpenChange={setCustomProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Product</DialogTitle>
            <DialogDescription>Add a custom product to your menu</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name</Label>
              <Input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="e.g., Burger Classic"
              />
            </div>
            <div>
              <Label>Price (CZK)</Label>
              <Input
                type="number"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                placeholder="150"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomProductDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addCustomProduct} disabled={!newProductName || !newProductPrice}>
              Add Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Image Prompt Dialog */}
      <Dialog open={imagePromptDialogOpen} onOpenChange={setImagePromptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Product Image</DialogTitle>
            <DialogDescription>Enter a prompt to generate an AI image for this product</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Image Prompt</Label>
              <Input
                value={productImagePrompt}
                onChange={(e) => setProductImagePrompt(e.target.value)}
                placeholder="e.g., Professional food photography of a burger"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImagePromptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProductImagePrompt} disabled={!productImagePrompt}>
              Generate Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

