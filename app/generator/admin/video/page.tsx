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
import { Switch } from "@/components/ui/switch";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Home, Download, Loader2, Video, AlertCircle, CheckCircle2, Sparkles, Menu as MenuIcon } from "lucide-react";
import Link from "next/link";

// Available video models
const VIDEO_MODELS = [
    {
        value: "fal-ai/wan-25-preview/text-to-video",
        label: "WAN 2.5",
        description: "Best visual quality and motion stability (480p, 720p, 1080p, 5-10s)",
        defaultAspectRatio: "16:9" as const,
        defaultResolution: "480p" as const,
        defaultDuration: "5" as const,
    },
    {
        value: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video",
        label: "Kling v2.5",
        description: "Top-tier text-to-video with motion fluidity and cinematic visuals (5-10s)",
        defaultAspectRatio: "16:9" as const,
        defaultDuration: "5" as const,
    },
    {
        value: "fal-ai/sora-2/text-to-video",
        label: "Sora 2",
        description: "OpenAI's state-of-the-art video model (720p, 4-12s)",
        defaultAspectRatio: "16:9" as const,
        defaultResolution: "720p" as const,
        defaultDuration: "4" as const,
    },
    {
        value: "fal-ai/veo3/fast",
        label: "Veo 3 Fast",
        description: "Google's Veo 3 Fast model (720p/1080p, 4-8s)",
        defaultAspectRatio: "16:9" as const,
        defaultResolution: "720p" as const,
        defaultDuration: "4s" as const,
    },
];

// Temporary userId - will be replaced with auth later
const TEMP_USER_ID = "user-1";

export default function VideoGenerationPage() {
    const [selectedModel, setSelectedModel] = useState(VIDEO_MODELS[0].value);
    const [prompt, setPrompt] = useState("");
    const [negativePrompt, setNegativePrompt] = useState("");

    // WAN 2.5 specific
    const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
    const [resolution, setResolution] = useState<"480p" | "720p" | "1080p">("480p");
    const [duration, setDuration] = useState<"5" | "10">("5");
    const [audioUrl, setAudioUrl] = useState("");
    // Prompt expansion is always enabled, safety checker is always disabled
    const enablePromptExpansion = true;
    const enableSafetyChecker = false;

    // Sora 2 specific
    const [soraAspectRatio, setSoraAspectRatio] = useState<"16:9" | "9:16">("16:9");
    const [soraDuration, setSoraDuration] = useState<"4" | "8" | "12">("4");

    // Veo 3 Fast specific
    const [veoAspectRatio, setVeoAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
    const [veoResolution, setVeoResolution] = useState<"720p" | "1080p">("720p");
    const [veoDuration, setVeoDuration] = useState<"4s" | "6s" | "8s">("4s");
    const [enhancePrompt, setEnhancePrompt] = useState(true);
    const [autoFix, setAutoFix] = useState(true);
    const [generateAudio, setGenerateAudio] = useState(true);

    // Kling v2.5 specific
    const [klingAspectRatio, setKlingAspectRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
    const [klingDuration, setKlingDuration] = useState<"5" | "10">("5");
    const [cfgScale, setCfgScale] = useState<number>(0.5);
    const [klingNegativePrompt, setKlingNegativePrompt] = useState("blur, distort, and low quality");

    const [seed] = useState<number | undefined>(undefined);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [currentGenerationId, setCurrentGenerationId] = useState<Id<"videoGenerations"> | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // Convex hooks
    const generateVideoFromTextAction = useAction(api.generatorActions.generateVideoFromText);
    const pollStatusAction = useAction(api.generatorActions.pollGenerationStatus);
    const downloadAndStoreAction = useAction(api.generatorActions.downloadAndStoreFile);
    const createVideoGeneration = useMutation(api.mutations.createVideoGeneration);
    const updateVideoGenerationStatus = useMutation(api.mutations.updateVideoGenerationStatus);

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
                    model: currentGeneration.model,
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
        }, 5000); // Poll every 5 seconds for videos (WAN 2.5 takes 1-3 minutes)

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

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setGenerationError("Please enter a prompt");
            return;
        }

        // Model-specific validation
        if (selectedModel === "fal-ai/wan-25-preview/text-to-video" && prompt.length > 800) {
            setGenerationError("Prompt must be 800 characters or less for WAN 2.5");
            return;
        }
        if (selectedModel === "fal-ai/wan-25-preview/text-to-video" && negativePrompt && negativePrompt.length > 500) {
            setGenerationError("Negative prompt must be 500 characters or less for WAN 2.5");
            return;
        }

        setIsGenerating(true);
        setGenerationError(null);

        try {
            // Create generation record
            const generationId = await createVideoGeneration({
                userId: TEMP_USER_ID,
                type: "text-to-video",
                model: selectedModel,
                prompt: prompt.trim(),
                negativePrompt: selectedModel === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video"
                    ? (klingNegativePrompt.trim() || undefined)
                    : (negativePrompt.trim() || undefined),
                duration: selectedModel === "fal-ai/veo3/fast"
                    ? Number(veoDuration.replace("s", ""))
                    : selectedModel === "fal-ai/sora-2/text-to-video"
                        ? Number(soraDuration)
                        : selectedModel === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video"
                            ? Number(klingDuration)
                            : Number(duration),
            });

            // Generate video using selected model
            console.log("Generating video with model:", selectedModel);
            const result = await generateVideoFromTextAction({
                model: selectedModel,
                prompt: prompt.trim(),
                // WAN 2.5 parameters
                aspectRatio: selectedModel === "fal-ai/wan-25-preview/text-to-video" ? aspectRatio : undefined,
                resolution: selectedModel === "fal-ai/wan-25-preview/text-to-video" ? resolution : undefined,
                duration: selectedModel === "fal-ai/wan-25-preview/text-to-video" ? duration : undefined,
                negativePrompt: selectedModel === "fal-ai/wan-25-preview/text-to-video" ? (negativePrompt.trim() || undefined) : undefined,
                audioUrl: selectedModel === "fal-ai/wan-25-preview/text-to-video" ? (audioUrl.trim() || undefined) : undefined,
                enablePromptExpansion: selectedModel === "fal-ai/wan-25-preview/text-to-video" ? enablePromptExpansion : undefined,
                seed: selectedModel === "fal-ai/wan-25-preview/text-to-video" || selectedModel === "fal-ai/veo3/fast" ? seed : undefined,
                enableSafetyChecker: selectedModel === "fal-ai/wan-25-preview/text-to-video" ? enableSafetyChecker : undefined,
                // Kling v2.5 parameters
                klingAspectRatio: selectedModel === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" ? klingAspectRatio : undefined,
                klingDuration: selectedModel === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" ? klingDuration : undefined,
                klingNegativePrompt: selectedModel === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" ? (klingNegativePrompt.trim() || undefined) : undefined,
                cfgScale: selectedModel === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" ? cfgScale : undefined,
                // Sora 2 parameters
                soraAspectRatio: selectedModel === "fal-ai/sora-2/text-to-video" ? soraAspectRatio : undefined,
                soraDuration: selectedModel === "fal-ai/sora-2/text-to-video" ? soraDuration : undefined,
                // Veo 3 Fast parameters
                veoAspectRatio: selectedModel === "fal-ai/veo3/fast" ? veoAspectRatio : undefined,
                veoResolution: selectedModel === "fal-ai/veo3/fast" ? veoResolution : undefined,
                veoDuration: selectedModel === "fal-ai/veo3/fast" ? veoDuration : undefined,
                veoNegativePrompt: selectedModel === "fal-ai/veo3/fast" ? (negativePrompt.trim() || undefined) : undefined,
                enhancePrompt: selectedModel === "fal-ai/veo3/fast" ? enhancePrompt : undefined,
                autoFix: selectedModel === "fal-ai/veo3/fast" ? autoFix : undefined,
                generateAudio: selectedModel === "fal-ai/veo3/fast" ? generateAudio : undefined,
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
                        <h1 className="text-xl md:text-2xl font-bold">Video Generator</h1>
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
                        {/* Model Selection */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Video Model</CardTitle>
                                <CardDescription>Select the AI model to generate your video</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Select value={selectedModel} onValueChange={setSelectedModel}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {VIDEO_MODELS.map((model) => (
                                            <SelectItem key={model.value} value={model.value}>
                                                <div>
                                                    <div className="font-medium">{model.label}</div>
                                                    <div className="text-xs text-muted-foreground">{model.description}</div>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>

                        {/* Prompt Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Prompt</CardTitle>
                                <CardDescription>
                                    {selectedModel === "fal-ai/wan-25-preview/text-to-video" && "Supports Chinese and English, max 800 characters"}
                                    {selectedModel === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" && "Describe the video you want to generate with cinematic detail"}
                                    {selectedModel === "fal-ai/sora-2/text-to-video" && "Describe the video you want to generate"}
                                    {selectedModel === "fal-ai/veo3/fast" && "Be descriptive and clear. Include subject, context, action, style, camera motion, composition, and ambiance"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="prompt">Prompt</Label>
                                    <textarea
                                        id="prompt"
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Describe the video you want to generate..."
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        maxLength={selectedModel === "fal-ai/wan-25-preview/text-to-video" ? 800 : undefined}
                                    />
                                    {selectedModel === "fal-ai/wan-25-preview/text-to-video" && (
                                        <div className="text-xs text-muted-foreground text-right">
                                            {prompt.length}/800 characters
                                        </div>
                                    )}
                                </div>
                                {(selectedModel === "fal-ai/wan-25-preview/text-to-video" || selectedModel === "fal-ai/veo3/fast") && (
                                    <div className="space-y-2">
                                        <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
                                        <Input
                                            id="negative-prompt"
                                            placeholder="What to avoid in the video..."
                                            value={negativePrompt}
                                            onChange={(e) => setNegativePrompt(e.target.value)}
                                            maxLength={selectedModel === "fal-ai/wan-25-preview/text-to-video" ? 500 : undefined}
                                        />
                                        {selectedModel === "fal-ai/wan-25-preview/text-to-video" && (
                                            <div className="text-xs text-muted-foreground text-right">
                                                {negativePrompt.length}/500 characters
                                            </div>
                                        )}
                                    </div>
                                )}
                                {selectedModel === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="kling-negative-prompt">Negative Prompt</Label>
                                        <Input
                                            id="kling-negative-prompt"
                                            placeholder="blur, distort, and low quality"
                                            value={klingNegativePrompt}
                                            onChange={(e) => setKlingNegativePrompt(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Default: "blur, distort, and low quality"
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Video Settings - WAN 2.5 */}
                        {selectedModel === "fal-ai/wan-25-preview/text-to-video" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Video Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="aspect-ratio">Aspect Ratio</Label>
                                            <Select value={aspectRatio} onValueChange={(v) => setAspectRatio(v as "16:9" | "9:16" | "1:1")}>
                                                <SelectTrigger id="aspect-ratio">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="resolution">Resolution</Label>
                                            <Select value={resolution} onValueChange={(v) => setResolution(v as "480p" | "720p" | "1080p")}>
                                                <SelectTrigger id="resolution">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="480p">480p</SelectItem>
                                                    <SelectItem value="720p">720p</SelectItem>
                                                    <SelectItem value="1080p">1080p</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="duration">Duration</Label>
                                            <Select value={duration} onValueChange={(v) => setDuration(v as "5" | "10")}>
                                                <SelectTrigger id="duration">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="5">5 seconds</SelectItem>
                                                    <SelectItem value="10">10 seconds</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="audio-url">Audio URL (Optional)</Label>
                                        <Input
                                            id="audio-url"
                                            type="url"
                                            placeholder="https://example.com/audio.mp3"
                                            value={audioUrl}
                                            onChange={(e) => setAudioUrl(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            WAV or MP3 format, 3-30 seconds, up to 15MB
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Video Settings - Kling v2.5 */}
                        {selectedModel === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Video Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="kling-aspect-ratio">Aspect Ratio</Label>
                                            <Select value={klingAspectRatio} onValueChange={(v) => setKlingAspectRatio(v as "16:9" | "9:16" | "1:1")}>
                                                <SelectTrigger id="kling-aspect-ratio">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="kling-duration">Duration</Label>
                                            <Select value={klingDuration} onValueChange={(v) => setKlingDuration(v as "5" | "10")}>
                                                <SelectTrigger id="kling-duration">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="5">5 seconds</SelectItem>
                                                    <SelectItem value="10">10 seconds</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cfg-scale">CFG Scale: {cfgScale}</Label>
                                        <Input
                                            id="cfg-scale"
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={cfgScale}
                                            onChange={(e) => setCfgScale(Number(e.target.value))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            How closely the model should stick to your prompt (0-1). Default: 0.5
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Video Settings - Sora 2 */}
                        {selectedModel === "fal-ai/sora-2/text-to-video" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Video Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="sora-aspect-ratio">Aspect Ratio</Label>
                                            <Select value={soraAspectRatio} onValueChange={(v) => setSoraAspectRatio(v as "16:9" | "9:16")}>
                                                <SelectTrigger id="sora-aspect-ratio">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="sora-duration">Duration</Label>
                                            <Select value={soraDuration} onValueChange={(v) => setSoraDuration(v as "4" | "8" | "12")}>
                                                <SelectTrigger id="sora-duration">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="4">4 seconds</SelectItem>
                                                    <SelectItem value="8">8 seconds</SelectItem>
                                                    <SelectItem value="12">12 seconds</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Sora 2 generates videos at 720p resolution
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Video Settings - Veo 3 Fast */}
                        {selectedModel === "fal-ai/veo3/fast" && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Video Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="veo-aspect-ratio">Aspect Ratio</Label>
                                            <Select value={veoAspectRatio} onValueChange={(v) => setVeoAspectRatio(v as "16:9" | "9:16" | "1:1")}>
                                                <SelectTrigger id="veo-aspect-ratio">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                                                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                                                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="veo-resolution">Resolution</Label>
                                            <Select value={veoResolution} onValueChange={(v) => setVeoResolution(v as "720p" | "1080p")}>
                                                <SelectTrigger id="veo-resolution">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="720p">720p</SelectItem>
                                                    <SelectItem value="1080p">1080p</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="veo-duration">Duration</Label>
                                            <Select value={veoDuration} onValueChange={(v) => setVeoDuration(v as "4s" | "6s" | "8s")}>
                                                <SelectTrigger id="veo-duration">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="4s">4 seconds</SelectItem>
                                                    <SelectItem value="6s">6 seconds</SelectItem>
                                                    <SelectItem value="8s">8 seconds</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="enhance-prompt">Enhance Prompt</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Automatically enhance the prompt for better results
                                                </p>
                                            </div>
                                            <Switch
                                                id="enhance-prompt"
                                                checked={enhancePrompt}
                                                onCheckedChange={setEnhancePrompt}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="auto-fix">Auto Fix</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Automatically fix prompts that fail validation
                                                </p>
                                            </div>
                                            <Switch
                                                id="auto-fix"
                                                checked={autoFix}
                                                onCheckedChange={setAutoFix}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="generate-audio">Generate Audio</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Generate audio for the video (33% less credits if disabled)
                                                </p>
                                            </div>
                                            <Switch
                                                id="generate-audio"
                                                checked={generateAudio}
                                                onCheckedChange={setGenerateAudio}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Generate Button */}
                        <Card>
                            <CardContent className="pt-6">
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !prompt.trim()}
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

