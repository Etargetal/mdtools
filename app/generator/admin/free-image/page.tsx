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
import { Home, Download, Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

// Available models
const MODELS = [
  { value: "google/imagen-4", label: "Google Imagen 4", description: "High-quality photorealistic images" },
  { value: "banana/nano-flash", label: "Nano Banana Flash", description: "Ultra-fast generation" },
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

export default function FreeImageGenerationPage() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0].value);
  const [dimensionPreset, setDimensionPreset] = useState("0");
  const [customWidth, setCustomWidth] = useState(1024);
  const [customHeight, setCustomHeight] = useState(1024);
  const [useCustomDimensions, setUseCustomDimensions] = useState(false);
  const [numImages, setNumImages] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [guidanceScale, setGuidanceScale] = useState<number | undefined>(undefined);
  
  const [currentGenerationId, setCurrentGenerationId] = useState<Id<"imageGenerations"> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Convex hooks
  const generateImageAction = useAction(api.generatorActions.generateImage);
  const pollStatusAction = useAction(api.generatorActions.pollGenerationStatus);
  const downloadAndStoreAction = useAction(api.generatorActions.downloadAndStoreFile);
  const createGeneration = useMutation(api.mutations.createImageGeneration);
  const updateGenerationStatus = useMutation(api.mutations.updateImageGenerationStatus);
  
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
    if (currentGeneration.status !== "processing" && currentGeneration.status !== "pending") return;

    const pollInterval = setInterval(async () => {
      if (!currentGeneration.falRequestId || !currentGenerationId) return;

      try {
        const status = await pollStatusAction({
          requestId: currentGeneration.falRequestId,
          model: currentGeneration.model,
        });

        if (status.isCompleted && status.images.length > 0) {
          // Generation completed, download and store files
          await handleCompletedGeneration(status.images);
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
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentGenerationId, currentGeneration, pollStatusAction, updateGenerationStatus]);

  const handleCompletedGeneration = async (imageUrls: string[]) => {
    if (!currentGenerationId) return;

    try {
      const fileIds: Id<"generatedFiles">[] = [];

      // Download and store each image
      for (const imageUrl of imageUrls) {
        const stored = await downloadAndStoreAction({
          url: imageUrl,
          generationId: currentGenerationId,
          generationType: "image",
          width: useCustomDimensions ? customWidth : DIMENSION_PRESETS[parseInt(dimensionPreset)].width,
          height: useCustomDimensions ? customHeight : DIMENSION_PRESETS[parseInt(dimensionPreset)].height,
        });
        fileIds.push(stored.fileId);
      }

      // Update generation status
      await updateGenerationStatus({
        id: currentGenerationId,
        status: "completed",
        generatedFileIds: fileIds,
        completedAt: Date.now(),
      });

      setIsGenerating(false);
      setGenerationError(null);
    } catch (error: any) {
      console.error("Error storing files:", error);
      await updateGenerationStatus({
        id: currentGenerationId,
        status: "failed",
        errorMessage: error.message,
      });
      setIsGenerating(false);
      setGenerationError(error.message);
    }
  };

  const handleGenerate = async () => {
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

      // Create generation record
      const generationId = await createGeneration({
        userId: TEMP_USER_ID,
        type: "free",
        model: selectedModel,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        width: dimensions.width,
        height: dimensions.height,
        numImages: numImages,
        seed: seed,
        guidanceScale: guidanceScale,
      });

      setCurrentGenerationId(generationId);

      // Call fal.ai API
      const result = await generateImageAction({
        model: selectedModel,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim() || undefined,
        width: dimensions.width,
        height: dimensions.height,
        numImages: numImages > 1 ? numImages : undefined,
        seed: seed,
        guidanceScale: guidanceScale,
      });

      // Update with request ID
      await updateGenerationStatus({
        id: generationId,
        status: result.isCompleted ? "completed" : "processing",
        falRequestId: result.requestId,
      });

      // If completed synchronously, handle immediately
      if (result.isCompleted && result.images.length > 0) {
        await handleCompletedGeneration(result.images);
      } else if (!result.isCompleted) {
        // Will be handled by polling effect
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
      a.download = fileName || `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download image");
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
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Free Image Generation</h1>
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
            {/* Generation Form */}
            <Card>
              <CardHeader>
                <CardTitle>Generate Image</CardTitle>
                <CardDescription>
                  Create images using AI models. Enter a prompt describing what you want to generate.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                {/* Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt</Label>
                  <textarea
                    id="prompt"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe the image you want to generate..."
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

                {/* Number of Images */}
                <div className="space-y-2">
                  <Label htmlFor="numImages">Number of Images: {numImages}</Label>
                  <input
                    id="numImages"
                    type="range"
                    min={1}
                    max={4}
                    value={numImages}
                    onChange={(e) => setNumImages(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>1</span>
                    <span>4</span>
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
                        <div className="text-xs text-muted-foreground">
                          Use the same seed to reproduce similar results
                        </div>
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
                  disabled={isGenerating || !prompt.trim()}
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
                      Generate Image
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
                  <CardTitle>Generated Images</CardTitle>
                  <CardDescription>
                    Your generated images are ready to download
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
                          alt="Generated"
                          className="w-full h-auto"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleDownload(file.fileUrl, `generated-${file._id}.png`)
                            }
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
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

