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
  Edit,
  Eraser,
  History,
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
  { value: "fal-ai/nano-banana", label: "Nano Banana Flash", description: "Fast generation with accurate text" },
  { value: "fal-ai/imagen4/preview", label: "Google Imagen 4", description: "High-quality backgrounds" },
];

// Default logo URL
const DEFAULT_LOGO_URL = "https://aromatic-eagle-73.convex.cloud/api/storage/3fa84262-92ab-4549-9953-df0194de804b";

interface MenuProduct {
  id: string;
  productId?: Id<"products">;
  name: string;
  price: number;
  imageId?: Id<"generatedFiles">;
  imagePrompt?: string;
  imageStyle?: "photorealistic" | "cartoonish" | "text-only";
  imageUrl?: string;
  imageSource: "generated" | "provided" | "none";
  position?: string; // Position description for where product should be placed
  order: number;
}

export default function MenuGenerationPage() {
  const router = useRouter();

  // Menu configuration
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const [pricePosition, setPricePosition] = useState<"top" | "bottom" | "right" | "left">("bottom");
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([]);
  const [backgroundSource, setBackgroundSource] = useState<"generated" | "provided">("generated");
  const [backgroundPrompt, setBackgroundPrompt] = useState("");
  const [backgroundModel, setBackgroundModel] = useState(BACKGROUND_MODELS[0].value); // Default to nano-banana for text accuracy
  const [uploadedBackgroundImage, setUploadedBackgroundImage] = useState<File | null>(null);
  const [uploadedBackgroundPreview, setUploadedBackgroundPreview] = useState<string | null>(null);
  const [selectedBackgroundImageId, setSelectedBackgroundImageId] = useState<Id<"generatedFiles"> | null>(null);

  // Logo state
  const [includeLogo, setIncludeLogo] = useState(true); // Default to including logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // Layout options - removed, not needed
  // const [layoutType, setLayoutType] = useState<"grid" | "list">("grid");
  // const [gridColumns, setGridColumns] = useState(2);
  // const [spacing, setSpacing] = useState(16);
  // const [showPrices, setShowPrices] = useState(true);
  // const [showImages, setShowImages] = useState(true);

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
  const [productImageStyle, setProductImageStyle] = useState<"photorealistic" | "cartoonish" | "text-only">("photorealistic");

  // Generation state
  const [currentGenerationId, setCurrentGenerationId] = useState<Id<"imageGenerations"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingMenuId, setEditingMenuId] = useState<Id<"imageGenerations"> | null>(null);
  const [preserveBackground, setPreserveBackground] = useState(false);
  const [originalBackgroundUrl, setOriginalBackgroundUrl] = useState<string | null>(null);
  const [editMenuDialogOpen, setEditMenuDialogOpen] = useState(false);
  const [editingProductPosition, setEditingProductPosition] = useState<string | null>(null);

  // Convex hooks
  const activeProducts = useQuery(api.queries.getActiveProducts);
  const screens = useQuery(api.queries.getScreens);
  const generateImageAction = useAction(api.generatorActions.generateImage);
  const pollStatusAction = useAction(api.generatorActions.pollGenerationStatus);
  const downloadAndStoreAction = useAction(api.generatorActions.downloadAndStoreFile);
  const uploadFileAction = useAction(api.generatorActions.uploadFile);
  const editImageAction = useAction(api.generatorActions.editImage);
  const createGeneration = useMutation(api.mutations.createImageGeneration);
  const updateGenerationStatus = useMutation(api.mutations.updateImageGenerationStatus);
  const updateScreen = useMutation(api.mutations.updateScreen);
  const menuGenerations = useQuery(api.queries.getImageGenerationsByUser, {
    userId: TEMP_USER_ID,
    type: "menu",
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

  // Load background file when selectedBackgroundImageId changes
  const backgroundFile = useQuery(
    api.queries.getGeneratedFileById,
    selectedBackgroundImageId ? { id: selectedBackgroundImageId } : "skip"
  );

  useEffect(() => {
    if (backgroundFile) {
      setUploadedBackgroundPreview(backgroundFile.fileUrl);
    }
  }, [backgroundFile]);

  // Load original menu image when in edit mode
  const originalMenuFile = useQuery(
    api.queries.getGeneratedFileById,
    isEditMode && editingMenuId && menuGenerations?.find((g) => g._id === editingMenuId)?.generatedFileIds[0]
      ? { id: menuGenerations.find((g) => g._id === editingMenuId)!.generatedFileIds[0] }
      : "skip"
  );

  useEffect(() => {
    if (originalMenuFile && preserveBackground) {
      setOriginalBackgroundUrl(originalMenuFile.fileUrl);
    }
  }, [originalMenuFile, preserveBackground]);

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

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uploaded = await uploadFileAction({
        file: arrayBuffer,
        fileName: file.name,
        mimeType: file.type,
      });

      const previewUrl = uploaded.fileUrl;
      setLogoPreview(previewUrl);
      setLogoUrl(previewUrl);
      setLogoFile(file);
      setIsUploadingLogo(false);
    } catch (error: any) {
      console.error("Logo upload error:", error);
      setIsUploadingLogo(false);
      setGenerationError(error.message);
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
    if (!selectedProductForImage) return;

    // For text-only style, we don't need a prompt
    if (productImageStyle === "text-only") {
      setMenuProducts(
        menuProducts.map((p) =>
          p.id === selectedProductForImage
            ? { ...p, imageStyle: "text-only", imageSource: "generated" as const, imagePrompt: undefined }
            : p
        )
      );
    } else if (productImagePrompt) {
      setMenuProducts(
        menuProducts.map((p) =>
          p.id === selectedProductForImage
            ? { ...p, imagePrompt: productImagePrompt, imageStyle: productImageStyle, imageSource: "generated" as const }
            : p
        )
      );
    } else {
      return; // Need prompt for photorealistic or cartoonish
    }

    setImagePromptDialogOpen(false);
    setProductImagePrompt("");
    setProductImageStyle("photorealistic");
    setSelectedProductForImage(null);
  };

  const updateProductPosition = (productId: string, position: string) => {
    setMenuProducts(
      menuProducts.map((p) => (p.id === productId ? { ...p, position } : p))
    );
  };

  const loadMenuForEditing = async (generationId: Id<"imageGenerations">) => {
    // Use the query hook result - menuGenerations already contains the data
    const gen = menuGenerations?.find((g) => g._id === generationId);
    if (!gen || gen.type !== "menu" || !gen.menuConfig) return;

    // Load menu configuration
    setOrientation(gen.menuConfig.orientation);
    setPricePosition(gen.menuConfig.pricePosition);
    setBackgroundSource(gen.menuConfig.backgroundSource === "none" ? "generated" : gen.menuConfig.backgroundSource);
    setMenuProducts(
      gen.menuConfig.products.map((p, idx) => ({
        id: `product-${idx}`,
        productId: p.productId,
        name: p.name,
        price: p.price,
        imageId: p.imageId,
        imageSource: gen.menuConfig!.useGeneratedImages && p.imageId ? "generated" : gen.menuConfig!.useProvidedImages && p.imageId ? "provided" : "none",
        order: p.order,
      }))
    );

    // Load background if exists
    if (gen.menuConfig.backgroundImageId) {
      setSelectedBackgroundImageId(gen.menuConfig.backgroundImageId);
    }

    // Enable preserve background option
    if (gen.generatedFileIds.length > 0) {
      setPreserveBackground(true);
    }

    setEditingMenuId(generationId);
    setIsEditMode(true);
    setEditMenuDialogOpen(false);
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

      // If preserving background and editing, use image-to-image editing
      if (preserveBackground && originalBackgroundUrl && isEditMode) {
        const productList = menuProducts
          .sort((a, b) => a.order - b.order)
          .map((p) => `${p.name} - ${p.price},-`)
          .join(", ");

        const logoToUse = includeLogo ? (logoUrl || DEFAULT_LOGO_URL) : null;
        let editPrompt = `Update the menu to show these products: ${productList}. Price position: ${pricePosition}. Keep the background exactly the same. Only update the product cards and text. Ensure text is accurate and readable. Maintain minimalist design with good contrast. `;
        editPrompt += `IMPORTANT: Integrate all elements seamlessly into the background. No boxes, cards, or borders around elements. `;
        editPrompt += `Product images and text should blend naturally with the background design. `;
        if (logoToUse) {
          editPrompt += `Include the company logo prominently, seamlessly integrated into the background. Logo URL: ${logoToUse}. `;
        }

        const generationId = await createGeneration({
          userId: TEMP_USER_ID,
          type: "menu",
          model: "fal-ai/nano-banana/edit",
          prompt: editPrompt,
          width,
          height,
          numImages: 1,
          menuConfig: {
            orientation,
            pricePosition,
            useGeneratedImages: menuProducts.some((p) => p.imageSource === "generated"),
            useProvidedImages: menuProducts.some((p) => p.imageSource === "provided"),
            backgroundSource: preserveBackground ? "provided" : (backgroundSource === "provided" ? "provided" : "generated"),
            backgroundImageId: preserveBackground && selectedBackgroundImageId ? selectedBackgroundImageId : undefined,
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

        const result = await editImageAction({
          model: "fal-ai/nano-banana/edit",
          imageUrl: originalBackgroundUrl,
          prompt: editPrompt,
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
      } else {
        // Normal generation
        const productList = menuProducts
          .sort((a, b) => a.order - b.order)
          .map((p) => `${p.name} - ${p.price},-`)
          .join(", ");

        let menuPrompt = `Create a professional, minimalist menu display for a restaurant/cafe. ${orientation} orientation. `;
        menuPrompt += `Design requirements: Minimalist, clean design with excellent contrast. `;
        menuPrompt += `Text must be accurate and clearly readable. Use a modern, simple layout. `;
        menuPrompt += `CRITICAL: Integrate all elements seamlessly into the background. NO boxes, cards, borders, or containers around ANY elements. `;
        menuPrompt += `The logo, products, and text should blend naturally with the background design as one cohesive piece. `;
        menuPrompt += `Avoid creating separate containers or boxes - everything should feel like part of one unified design. `;
        menuPrompt += `Product images should appear naturally within the background, not in separate boxes or cards. `;

        // Include logo if enabled
        const logoToUseNormal = includeLogo ? (logoUrl || DEFAULT_LOGO_URL) : null;
        if (logoToUseNormal) {
          menuPrompt += `Integrate the company logo naturally into the design - place it at the top center or top left, make it visible but seamlessly blended with the background. The logo image URL is: ${logoToUseNormal}. `;
          menuPrompt += `Do not put the logo in a box or container - integrate it directly into the background design. `;
        }

        // Build product descriptions with image styles
        const productDescriptions = menuProducts
          .sort((a, b) => a.order - b.order)
          .map((p) => {
            let desc = `${p.name} - ${p.price},-`;
            if (p.imageStyle === "text-only") {
              desc += ` (display as text only, no image, no box)`;
            } else if (p.imageStyle === "photorealistic") {
              desc += ` (photorealistic product image${p.imagePrompt ? `: ${p.imagePrompt}` : ""}, seamlessly integrated into background, no box or container around it)`;
            } else if (p.imageStyle === "cartoonish") {
              desc += ` (cartoonish/stylized product image${p.imagePrompt ? `: ${p.imagePrompt}` : ""}, seamlessly integrated into background, no box or container around it)`;
            }
            return desc;
          });

        menuPrompt += `Products: ${productDescriptions.join(", ")}. `;
        menuPrompt += `IMPORTANT: Do not create boxes, cards, or borders around product images or text. `;
        menuPrompt += `Integrate product images naturally into the background. Product images should blend seamlessly with the design. `;
        menuPrompt += `Text should be placed directly on the background with good contrast for readability. `;

        // Add product positions if specified
        const productPositions = menuProducts
          .sort((a, b) => a.order - b.order)
          .filter((p) => p.position)
          .map((p) => `${p.name}: ${p.position}`)
          .join(", ");

        if (productPositions) {
          menuPrompt += `Product positions: ${productPositions}. `;
        }

        if (backgroundSource === "generated" && backgroundPrompt) {
          menuPrompt += `Background: ${backgroundPrompt}. `;
        } else if (backgroundSource === "provided") {
          menuPrompt += `Use the uploaded background image. `;
        } else {
          menuPrompt += `Use a clean, minimal background with good contrast - avoid busy patterns, use solid colors or subtle gradients. `;
        }

        menuPrompt += `Price position: ${pricePosition}. `;
        menuPrompt += `Ensure all text is perfectly readable and accurate. Minimalist aesthetic with high contrast. `;
        menuPrompt += `Professional food photography style but keep it clean and simple. `;
        menuPrompt += `Focus on readability and consistency - all product names and prices must be clearly visible and accurate. `;
        menuPrompt += `Design should feel like one cohesive piece - no separate boxes, cards, or containers. `;
        menuPrompt += `Everything should flow naturally together as part of the background design. `;

        // Collect all images to remix: background, logo, and product images
        const imageUrls: string[] = [];

        // Add logo FIRST if enabled - this ensures we always have at least one image for nano-banana/edit
        const logoToUseImages = includeLogo ? (logoUrl || DEFAULT_LOGO_URL) : null;
        if (logoToUseImages) {
          imageUrls.push(logoToUseImages);
        }

        // Add background image if provided
        if (backgroundSource === "provided" && uploadedBackgroundPreview) {
          imageUrls.push(uploadedBackgroundPreview);
        }

        // Add product images if available
        menuProducts.forEach((product) => {
          if (product.imageUrl) {
            imageUrls.push(product.imageUrl);
          }
        });

        const generationId = await createGeneration({
          userId: TEMP_USER_ID,
          type: "menu",
          model: "fal-ai/nano-banana/edit",
          prompt: menuPrompt,
          width,
          height,
          numImages: 1,
          menuConfig: {
            orientation,
            pricePosition,
            useGeneratedImages: menuProducts.some((p) => p.imageSource === "generated"),
            useProvidedImages: menuProducts.some((p) => p.imageSource === "provided"),
            backgroundSource: backgroundSource === "provided" ? "provided" : "generated",
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

        // ALWAYS use nano-banana/edit when logo is included (which is by default)
        // Since logo is included by default, imageUrls should always have at least one element
        if (imageUrls.length > 0) {
          // Use the first image as the base and pass remaining images for remixing
          const result = await editImageAction({
            model: "fal-ai/nano-banana/edit",
            imageUrl: imageUrls[0], // Base image (logo if no background, or background if provided)
            prompt: menuPrompt,
            numImages: 1,
            additionalImageUrls: imageUrls.slice(1), // Additional images for remixing
          });

          await updateGenerationStatus({
            id: generationId,
            status: result.isCompleted ? "completed" : "processing",
            falRequestId: result.requestId,
          });

          if (result.isCompleted && result.images && result.images.length > 0) {
            await handleCompletedGeneration(result.images, generationId);
          }
        } else {
          // This should NEVER happen since logo is included by default
          // But if logo is disabled, we still need to generate something
          console.warn("No images available for menu generation - logo must be disabled");
          const result = await generateImageAction({
            model: "fal-ai/nano-banana",
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
        }
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
            <div className="flex gap-2">
              {isEditMode && (
                <Button
                  onClick={() => {
                    setIsEditMode(false);
                    setEditingMenuId(null);
                    setPreserveBackground(false);
                    setOriginalBackgroundUrl(null);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Exit Edit Mode
                </Button>
              )}
              {menuGenerations && menuGenerations.length > 0 && !isEditMode && (
                <Button onClick={() => setEditMenuDialogOpen(true)} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Existing Menu
                </Button>
              )}
              <Link href="/generator/admin">
                <Button variant="ghost" size="sm">
                  <X className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Menu Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Menu Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
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
                  <div>
                    <Label>Dimensions</Label>
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useCustomDimensions}
                    onChange={(e) => setUseCustomDimensions(e.target.checked)}
                    className="rounded"
                  />
                  <Label>Use Custom Dimensions</Label>
                </div>
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
                        <div key={product.id} className="space-y-2">
                          <div className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                            <div className="flex items-center gap-2 flex-1">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {product.price},-
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
                          <div className="pl-8">
                            {editingProductPosition === product.id ? (
                              <Input
                                placeholder="e.g., Top left corner, Center, Bottom right"
                                value={product.position || ""}
                                onChange={(e) => updateProductPosition(product.id, e.target.value)}
                                onBlur={() => setEditingProductPosition(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    setEditingProductPosition(null);
                                  }
                                }}
                                autoFocus
                                className="text-sm"
                              />
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingProductPosition(product.id)}
                                className="text-xs text-muted-foreground h-auto py-1"
                              >
                                {product.position ? `📍 ${product.position}` : "+ Add position"}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Logo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Company Logo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="includeLogo"
                      checked={includeLogo}
                      onChange={(e) => {
                        setIncludeLogo(e.target.checked);
                        if (!e.target.checked) {
                          // Clear custom logo when unchecking
                          setLogoPreview(null);
                          setLogoUrl(null);
                          setLogoFile(null);
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="includeLogo" className="cursor-pointer">
                      Include logo in menu
                    </Label>
                  </div>
                  {includeLogo && (
                    <>
                      {logoUrl ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-16 border rounded overflow-hidden bg-muted/50 flex items-center justify-center">
                            <img
                              src={logoPreview || logoUrl}
                              alt="Logo preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">
                              Custom logo uploaded
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLogoPreview(null);
                              setLogoUrl(null);
                              setLogoFile(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Using default logo. Upload a custom logo to replace it.
                          </p>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setLogoPreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                                handleLogoUpload(file);
                              }
                            }}
                            disabled={isUploadingLogo}
                          />
                        </div>
                      )}
                      {isUploadingLogo && (
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading logo...
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Background */}
            <Card>
              <CardHeader>
                <CardTitle>Background</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={backgroundSource === "generated" ? "default" : "outline"}
                    onClick={() => setBackgroundSource("generated")}
                    className="flex-1"
                  >
                    Generate
                  </Button>
                  <Button
                    variant={backgroundSource === "provided" ? "default" : "outline"}
                    onClick={() => setBackgroundSource("provided")}
                    className="flex-1"
                  >
                    Upload
                  </Button>
                </div>

                {backgroundSource === "generated" && (
                  <div>
                    <Label>Background Prompt</Label>
                    <Input
                      value={backgroundPrompt}
                      onChange={(e) => setBackgroundPrompt(e.target.value)}
                      placeholder="e.g., Modern restaurant interior with warm lighting"
                    />
                  </div>
                )}

                {backgroundSource === "provided" && (
                  <div className="space-y-3">
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

            {/* Generate Button */}
            <Card>
              <CardContent className="pt-6">
                {isEditMode && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={preserveBackground}
                        onChange={(e) => setPreserveBackground(e.target.checked)}
                        className="mt-1 rounded"
                        id="preserve-background"
                      />
                      <Label htmlFor="preserve-background" className="cursor-pointer">
                        <div className="font-medium">Preserve Background</div>
                        <div className="text-sm text-muted-foreground">
                          Keep the existing background and only update products
                        </div>
                      </Label>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleGenerateMenu}
                  disabled={isGenerating || menuProducts.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditMode ? "Updating Menu..." : "Generating Menu..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isEditMode ? "Update Menu" : "Generate Menu"}
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
              <Label>Price</Label>
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
            <DialogDescription>Choose how to display this product in the menu</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Image Style</Label>
              <Select value={productImageStyle} onValueChange={(value: "photorealistic" | "cartoonish" | "text-only") => setProductImageStyle(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="photorealistic">Photorealistic</SelectItem>
                  <SelectItem value="cartoonish">Cartoonish/Stylized</SelectItem>
                  <SelectItem value="text-only">Text Only (No Image)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {productImageStyle !== "text-only" && (
              <div>
                <Label>Image Prompt</Label>
                <Input
                  value={productImagePrompt}
                  onChange={(e) => setProductImagePrompt(e.target.value)}
                  placeholder={productImageStyle === "photorealistic"
                    ? "e.g., Professional food photography of a burger on a wooden table"
                    : "e.g., Cute cartoon burger with big eyes and smile"}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {productImageStyle === "photorealistic"
                    ? "Describe a realistic, professional food photograph"
                    : "Describe a stylized, cartoon-style illustration"}
                </p>
              </div>
            )}
            {productImageStyle === "text-only" && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  The product will be displayed as text only: <strong>{menuProducts.find(p => p.id === selectedProductForImage)?.name} - {menuProducts.find(p => p.id === selectedProductForImage)?.price},-</strong>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImagePromptDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProductImagePrompt}
              disabled={productImageStyle !== "text-only" && !productImagePrompt}
            >
              {productImageStyle === "text-only" ? "Set as Text Only" : "Generate Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Dialog */}
      <Dialog open={editMenuDialogOpen} onOpenChange={setEditMenuDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Existing Menu</DialogTitle>
            <DialogDescription>Select a menu to edit</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-auto space-y-2">
            {menuGenerations && menuGenerations.length > 0 ? (
              menuGenerations
                .filter((gen) => gen.type === "menu" && gen.status === "completed")
                .map((gen) => {
                  const productsCount = gen.menuConfig?.products.length || 0;
                  return (
                    <div
                      key={gen._id}
                      className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted"
                      onClick={() => loadMenuForEditing(gen._id)}
                    >
                      <div>
                        <div className="font-medium">
                          Menu with {productsCount} product{productsCount !== 1 ? "s" : ""}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {gen.menuConfig?.orientation} orientation • {new Date(gen.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Edit className="h-4 w-4" />
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No completed menus found. Generate a menu first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMenuDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

