import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const FAL_API_BASE_URL = "https://fal.run";
const FAL_API_KEY = process.env.FAL_API_KEY || "";

/**
 * Call fal.ai API for image generation
 * Supports Google Imagen 4 and Nano Banana Flash models
 */
export const generateImage = action({
  args: {
    model: v.string(),
    prompt: v.string(),
    negativePrompt: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    numImages: v.optional(v.number()),
    seed: v.optional(v.number()),
    guidanceScale: v.optional(v.number()),
    // Model-specific parameters
    imageUrl: v.optional(v.string()), // For style transfer or image-to-image
    strength: v.optional(v.number()), // For style transfer strength
  },
  handler: async (ctx, args) => {
    if (!FAL_API_KEY) {
      throw new Error("FAL_API_KEY is not configured");
    }

    // Model-specific parameter handling
    const isImagen = args.model.includes("imagen");
    const isNanoBanana = args.model.includes("nano-banana") || args.model.includes("banana");

    // Helper function to calculate aspect ratio from width/height
    const getAspectRatio = (width: number, height: number): string => {
      const ratio = width / height;
      if (Math.abs(ratio - 1.0) < 0.1) return "1:1";
      if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
      if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";
      if (Math.abs(ratio - 3 / 4) < 0.1) return "3:4";
      if (Math.abs(ratio - 4 / 3) < 0.1) return "4:3";
      // Default to closest match
      if (ratio > 1.3) return "16:9";
      if (ratio < 0.7) return "9:16";
      return "1:1";
    };

    // Helper function to determine resolution
    const getResolution = (width: number, height: number): string => {
      const maxDimension = Math.max(width, height);
      return maxDimension >= 1920 ? "2K" : "1K";
    };

    // Prepare request body based on model
    let requestBody: any;

    if (isImagen) {
      // Imagen 4 uses aspect_ratio/resolution (direct HTTP API, not SDK wrapper)
      requestBody = {
        prompt: args.prompt,
        aspect_ratio: getAspectRatio(args.width, args.height),
        resolution: getResolution(args.width, args.height),
      };

      if (args.negativePrompt) {
        requestBody.negative_prompt = args.negativePrompt;
      }
      if (args.seed !== undefined) {
        requestBody.seed = args.seed;
      }
      if (args.numImages && args.numImages > 1) {
        requestBody.num_images = args.numImages;
      }
    } else {
      // Other models use direct parameters
      requestBody = {
        prompt: args.prompt,
        image_size: `${args.width}x${args.height}`,
      };

      // Add optional parameters
      if (args.negativePrompt) {
        requestBody.negative_prompt = args.negativePrompt;
      }
      if (args.seed !== undefined) {
        requestBody.seed = args.seed;
      }
      if (args.guidanceScale !== undefined) {
        requestBody.guidance_scale = args.guidanceScale;
      }
      if (args.numImages && args.numImages > 1) {
        // Only some models support num_images
        if (!isNanoBanana) {
          requestBody.num_images = args.numImages;
        }
      }

      // Add model-specific parameters
      if (args.imageUrl) {
        requestBody.image_url = args.imageUrl;
      }
      if (args.strength !== undefined) {
        requestBody.strength = args.strength;
      }
    }

    try {
      // Call fal.ai API
      const response = await fetch(`${FAL_API_BASE_URL}/${args.model}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log("fal.ai generateImage response:", JSON.stringify(responseData, null, 2));

      // Helper function to extract URLs from various response formats
      const extractImageUrls = (images: any): string[] => {
        if (!images) return [];
        if (typeof images === "string") return [images];
        if (Array.isArray(images)) {
          return images.map((img: any) => {
            if (typeof img === "string") return img;
            if (img && typeof img === "object" && img.url) return img.url;
            return null;
          }).filter((url: string | null): url is string => url !== null);
        }
        if (typeof images === "object" && images.url) {
          return [images.url];
        }
        return [];
      };

      // Handle response - check if it's wrapped in 'data' (SDK format) or direct
      const data = responseData.data || responseData;

      // Handle both sync and async responses
      // Check if we have images or a request_id
      let images: string[] = [];
      if (data.images) {
        images = extractImageUrls(data.images);
        console.log("Extracted from data.images:", images);
      }
      if (images.length === 0 && data.output) {
        images = extractImageUrls(data.output);
        console.log("Extracted from data.output:", images);
      }
      if (images.length === 0 && data.image_url) {
        images = extractImageUrls([data.image_url]);
        console.log("Extracted from data.image_url:", images);
      }
      if (images.length === 0 && data.image) {
        images = extractImageUrls([data.image]);
        console.log("Extracted from data.image:", images);
      }

      // Check if output is directly an object (not in an array)
      if (images.length === 0 && data.output && typeof data.output === "object" && !Array.isArray(data.output)) {
        images = extractImageUrls([data.output]);
        console.log("Extracted from data.output (single object):", images);
      }

      console.log("Final extracted images array:", images);

      // Get requestId from responseData or data
      const requestId = responseData.requestId || data.request_id || data.id || `sync-${Date.now()}`;

      // PRIORITY: If we have images, return them immediately (even if there's a request_id)
      if (images.length > 0) {
        // We have images - synchronous response
        console.log("Returning completed response with", images.length, "image(s)");
        return {
          requestId: requestId,
          status: "completed",
          images: images,
          isCompleted: true,
        };
      }

      // No images found - check if we need to poll
      if (data.request_id || responseData.requestId) {
        // Asynchronous response - need to poll
        console.log("No images found, will poll async with requestId:", data.request_id || responseData.requestId);
        return {
          requestId: data.request_id || responseData.requestId,
          status: "processing",
          images: [],
          isCompleted: false,
        };
      }

      // Check status field
      if (data.status === "COMPLETED" || data.status === "completed") {
        // Status says completed but no images found - might need polling
        if (data.request_id || responseData.requestId) {
          console.log("Status completed but no images, will poll with requestId:", data.request_id || responseData.requestId);
          return {
            requestId: data.request_id || responseData.requestId,
            status: "processing",
            images: [],
            isCompleted: false,
          };
        }
        throw new Error("Generation completed but no images found in response");
      }

      // Log the full response for debugging
      console.error("Unexpected response format:", JSON.stringify(responseData, null, 2));
      throw new Error(`Unexpected response format from fal.ai: ${JSON.stringify(responseData)}`);
    } catch (error: any) {
      console.error("fal.ai API error:", error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  },
});

/**
 * Poll fal.ai API for generation status
 */
export const pollGenerationStatus = action({
  args: {
    requestId: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    if (!FAL_API_KEY) {
      throw new Error("FAL_API_KEY is not configured");
    }

    // Skip polling if requestId starts with "sync-" (synchronous response)
    if (args.requestId.startsWith("sync-")) {
      return {
        requestId: args.requestId,
        status: "completed",
        images: [],
        error: null,
        isCompleted: true,
        isFailed: false,
      };
    }

    try {
      // Video models use queue.fal.run for status polling
      // Check if this is a video model (contains "video" in the model path)
      const isVideoModel = args.model.includes("/video") || args.model.includes("text-to-video");

      // For video models, use the /requests/{id} endpoint format
      // This seems to be the correct format based on fal.ai queue API
      let endpoint: string;
      let response: Response;

      if (isVideoModel) {
        // Try queue.fal.run with /requests/{id} format first
        endpoint = `https://queue.fal.run/${args.model}/requests/${args.requestId}`;
        console.log("Polling video model status URL:", endpoint);
        console.log("Model:", args.model);
        console.log("Request ID:", args.requestId);

        response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Key ${FAL_API_KEY}`,
          },
        });

        // If that fails, try without model path (request ID might be globally unique)
        if (!response.ok && response.status === 404) {
          endpoint = `https://queue.fal.run/requests/${args.requestId}`;
          console.log("Trying alternative endpoint:", endpoint);
          response = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Key ${FAL_API_KEY}`,
            },
          });
        }
      } else {
        // For image models, use the standard /queue/status format
        endpoint = `${FAL_API_BASE_URL}/${args.model}/queue/status`;
        response = await fetch(`${endpoint}?request_id=${args.requestId}`, {
          method: "GET",
          headers: {
            Authorization: `Key ${FAL_API_KEY}`,
          },
        });
      }

      let statusData: any = null;
      let usingResultEndpoint = false;

      // If status check is successful, parse the status
      if (response.ok) {
        statusData = await response.json();
        const status = statusData.status?.toLowerCase();

        // If status is completed, fetch the result
        if (status === "completed" || status === "COMPLETED") {
          // For video models, result might be in the same response
          // Otherwise, try to fetch from result endpoint
          if (isVideoModel && statusData.output) {
            // Result is already in the status response
            usingResultEndpoint = false;
          } else {
            // Try fetching result endpoint
            const resultEndpoint = isVideoModel
              ? `https://queue.fal.run/${args.model}/requests/${args.requestId}`
              : `${FAL_API_BASE_URL}/${args.model}/queue/result?request_id=${args.requestId}`;
            response = await fetch(resultEndpoint, {
              method: "GET",
              headers: {
                Authorization: `Key ${FAL_API_KEY}`,
              },
            });
            usingResultEndpoint = true;
          }
        } else {
          // Status is still IN_PROGRESS or PENDING, use status data
          const data = statusData;
          const status = data.status?.toLowerCase() || "processing";
          const isCompleted = status === "completed" || status === "COMPLETED";
          const isFailed = status === "failed" || status === "FAILED" || status === "error";

          return {
            requestId: args.requestId,
            status: status,
            images: [],
            videoUrl: null,
            error: data.error || null,
            isCompleted: isCompleted,
            isFailed: isFailed,
          };
        }
      } else {
        // If status check fails, try /queue/result (for completed requests)
        if (isVideoModel) {
          endpoint = `https://queue.fal.run/${args.model}/requests/${args.requestId}`;
        } else {
          endpoint = `${FAL_API_BASE_URL}/${args.model}/queue/result`;
        }
        response = await fetch(isVideoModel ? endpoint : `${endpoint}?request_id=${args.requestId}`, {
          method: "GET",
          headers: {
            Authorization: `Key ${FAL_API_KEY}`,
          },
        });
        usingResultEndpoint = true;
      }

      // If all primary methods fail, try alternative endpoint formats
      if (!response.ok && response.status === 404 && isVideoModel) {
        // Try /status endpoint format as fallback
        endpoint = `https://queue.fal.run/${args.model}/status?request_id=${args.requestId}`;
        console.log("Trying fallback endpoint:", endpoint);
        response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Key ${FAL_API_KEY}`,
          },
        });

        if (response.ok) {
          statusData = await response.json();
          const status = statusData.status?.toLowerCase();
          if (status === "completed" || status === "COMPLETED") {
            // Try result endpoint
            endpoint = `https://queue.fal.run/${args.model}/result?request_id=${args.requestId}`;
            response = await fetch(endpoint, {
              method: "GET",
              headers: {
                Authorization: `Key ${FAL_API_KEY}`,
              },
            });
            usingResultEndpoint = true;
          }
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Polling error details:", {
          status: response.status,
          statusText: response.statusText,
          url: endpoint,
          model: args.model,
          requestId: args.requestId,
          errorText: errorText,
        });
        throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log("fal.ai pollGenerationStatus response:", JSON.stringify(responseData, null, 2));

      // Handle response - check if it's wrapped in 'data' (SDK format) or direct
      // If we got status data first, use it; otherwise use response data
      const data = usingResultEndpoint ? (responseData.data || responseData) : (statusData || responseData.data || responseData);

      // Helper function to extract URLs from various response formats
      const extractImageUrls = (images: any): string[] => {
        if (!images) return [];
        if (typeof images === "string") return [images];
        if (Array.isArray(images)) {
          return images.map((img: any) => {
            if (typeof img === "string") return img;
            if (img && typeof img === "object" && img.url) return img.url;
            return null;
          }).filter((url: string | null): url is string => url !== null);
        }
        if (typeof images === "object" && images.url) {
          return [images.url];
        }
        return [];
      };

      // Extract images from various possible response formats
      let images: string[] = [];
      if (data.images) {
        images = extractImageUrls(data.images);
        console.log("Poll: Extracted from data.images:", images);
      }
      if (images.length === 0 && data.output) {
        // Try output as array first
        images = extractImageUrls(data.output);
        console.log("Poll: Extracted from data.output (array):", images);
        // If still empty and output is an object, try as single object
        if (images.length === 0 && typeof data.output === "object" && !Array.isArray(data.output)) {
          images = extractImageUrls([data.output]);
          console.log("Poll: Extracted from data.output (single object):", images);
        }
      }
      if (images.length === 0 && data.image_url) {
        images = extractImageUrls([data.image_url]);
        console.log("Poll: Extracted from data.image_url:", images);
      }
      if (images.length === 0 && data.image) {
        images = extractImageUrls([data.image]);
        console.log("Poll: Extracted from data.image:", images);
      }

      console.log("Poll: Final extracted images array:", images);

      // Also check for video URLs (for WAN 2.5 and other video models)
      let videoUrl: string | null = null;
      if (data.video?.url) {
        videoUrl = data.video.url;
      } else if (data.data?.video?.url) {
        videoUrl = data.data.video.url;
      } else if (data.video_url) {
        videoUrl = data.video_url;
      } else if (data.data?.video_url) {
        videoUrl = data.data.video_url;
      } else if (data.output?.video?.url) {
        videoUrl = data.output.video.url;
      } else if (data.output?.video_url) {
        videoUrl = data.output.video_url;
      }

      // Check if images array contains video URLs (some APIs return videos as "images")
      if (!videoUrl && images.length > 0) {
        const videoInImages = images.find((url: string) =>
          url && (url.includes('.mp4') || url.includes('video') || url.includes('.webm') || url.includes('fal.ai'))
        );
        if (videoInImages) {
          videoUrl = videoInImages;
        }
      }

      const status = data.status?.toLowerCase() || "processing";

      // Check if completed based on status or if we have images/videos
      const isCompleted = status === "completed" || status === "COMPLETED" || images.length > 0 || videoUrl !== null;
      const isFailed = status === "failed" || status === "FAILED" || status === "error";

      console.log("Poll result:", {
        status,
        imagesCount: images.length,
        videoUrl,
        isCompleted,
        isFailed,
      });

      return {
        requestId: args.requestId,
        status: status,
        images: images,
        videoUrl: videoUrl,
        error: data.error || null,
        isCompleted: isCompleted,
        isFailed: isFailed,
      };
    } catch (error: any) {
      console.error("fal.ai polling error:", error);
      throw new Error(`Failed to poll generation status: ${error.message}`);
    }
  },
});

/**
 * Generate video from image using fal.ai
 */
export const generateVideoFromImage = action({
  args: {
    model: v.string(),
    imageUrl: v.string(),
    prompt: v.string(),
    motionStrength: v.optional(v.number()),
    duration: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!FAL_API_KEY) {
      throw new Error("FAL_API_KEY is not configured");
    }

    const requestBody: any = {
      image_url: args.imageUrl,
      prompt: args.prompt,
    };

    if (args.motionStrength !== undefined) {
      requestBody.motion_bucket_id = Math.floor(args.motionStrength * 127); // Typical range 0-127
    }
    if (args.duration) {
      requestBody.duration = args.duration;
    }
    if (args.width && args.height) {
      requestBody.image_size = `${args.width}x${args.height}`;
    }

    try {
      const response = await fetch(`${FAL_API_BASE_URL}/${args.model}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.status === "COMPLETED" || data.video_url) {
        return {
          requestId: data.request_id || data.id,
          status: "completed",
          videoUrl: data.video_url || data.video,
          isCompleted: true,
        };
      } else if (data.request_id) {
        return {
          requestId: data.request_id,
          status: "processing",
          videoUrl: null,
          isCompleted: false,
        };
      } else {
        throw new Error("Unexpected response format from fal.ai");
      }
    } catch (error: any) {
      console.error("fal.ai video generation error:", error);
      throw new Error(`Failed to generate video: ${error.message}`);
    }
  },
});

/**
 * Generate video from text using fal.ai video models
 * Supports: WAN 2.5, Kling v2.5, Sora 2, Veo 3 Fast
 */
export const generateVideoFromText = action({
  args: {
    model: v.string(),
    prompt: v.string(),
    // WAN 2.5 parameters
    aspectRatio: v.optional(v.union(v.literal("16:9"), v.literal("9:16"), v.literal("1:1"))),
    resolution: v.optional(v.union(v.literal("480p"), v.literal("720p"), v.literal("1080p"))),
    duration: v.optional(v.union(v.literal("5"), v.literal("10"))),
    negativePrompt: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    enablePromptExpansion: v.optional(v.boolean()),
    seed: v.optional(v.number()),
    enableSafetyChecker: v.optional(v.boolean()),
    // Kling v2.5 parameters
    klingAspectRatio: v.optional(v.union(v.literal("16:9"), v.literal("9:16"), v.literal("1:1"))),
    klingDuration: v.optional(v.union(v.literal("5"), v.literal("10"))),
    klingNegativePrompt: v.optional(v.string()),
    cfgScale: v.optional(v.number()),
    // Sora 2 parameters
    soraAspectRatio: v.optional(v.union(v.literal("16:9"), v.literal("9:16"))),
    soraDuration: v.optional(v.union(v.literal("4"), v.literal("8"), v.literal("12"))),
    // Veo 3 Fast parameters
    veoAspectRatio: v.optional(v.union(v.literal("16:9"), v.literal("9:16"), v.literal("1:1"))),
    veoResolution: v.optional(v.union(v.literal("720p"), v.literal("1080p"))),
    veoDuration: v.optional(v.union(v.literal("4s"), v.literal("6s"), v.literal("8s"))),
    veoNegativePrompt: v.optional(v.string()),
    enhancePrompt: v.optional(v.boolean()),
    autoFix: v.optional(v.boolean()),
    generateAudio: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (!FAL_API_KEY) {
      throw new Error("FAL_API_KEY is not configured");
    }

    const model = args.model;
    let requestBody: any = {
      prompt: args.prompt,
    };

    // Build request body based on model
    if (model === "fal-ai/wan-25-preview/text-to-video") {
      // WAN 2.5 parameters
      requestBody.aspect_ratio = args.aspectRatio || "16:9";
      requestBody.resolution = args.resolution || "1080p";
      requestBody.duration = args.duration || "5";
      if (args.negativePrompt) {
        requestBody.negative_prompt = args.negativePrompt;
      }
      if (args.audioUrl) {
        requestBody.audio_url = args.audioUrl;
      }
      requestBody.enable_prompt_expansion = args.enablePromptExpansion !== undefined ? args.enablePromptExpansion : true;
      if (args.seed !== undefined) {
        requestBody.seed = args.seed;
      }
      requestBody.enable_safety_checker = args.enableSafetyChecker !== undefined ? args.enableSafetyChecker : true;
    } else if (model === "fal-ai/kling-video/v2.5-turbo/pro/text-to-video") {
      // Kling v2.5 parameters
      requestBody.aspect_ratio = args.klingAspectRatio || "16:9";
      requestBody.duration = args.klingDuration || "5";
      requestBody.negative_prompt = args.klingNegativePrompt || "blur, distort, and low quality";
      requestBody.cfg_scale = args.cfgScale !== undefined ? args.cfgScale : 0.5;
    } else if (model === "fal-ai/sora-2/text-to-video") {
      // Sora 2 parameters
      requestBody.aspect_ratio = args.soraAspectRatio || "16:9";
      requestBody.duration = args.soraDuration ? Number(args.soraDuration) : 4;
      requestBody.resolution = "720p"; // Sora 2 only supports 720p
    } else if (model === "fal-ai/veo3/fast") {
      // Veo 3 Fast parameters
      requestBody.aspect_ratio = args.veoAspectRatio || "16:9";
      requestBody.resolution = args.veoResolution || "720p";
      requestBody.duration = args.veoDuration || "8s";
      if (args.veoNegativePrompt) {
        requestBody.negative_prompt = args.veoNegativePrompt;
      }
      requestBody.enhance_prompt = args.enhancePrompt !== undefined ? args.enhancePrompt : true;
      requestBody.auto_fix = args.autoFix !== undefined ? args.autoFix : true;
      requestBody.generate_audio = args.generateAudio !== undefined ? args.generateAudio : true;
      if (args.seed !== undefined) {
        requestBody.seed = args.seed;
      }
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }

    try {
      // Video models use direct endpoint format (like image generation)
      // The endpoint format is: https://fal.run/{model}
      const submitUrl = `${FAL_API_BASE_URL}/${model}`;

      console.log("Submitting video generation request to:", submitUrl);
      console.log("Model:", model);
      console.log("Request body:", JSON.stringify(requestBody, null, 2));

      const submitResponse = await fetch(submitUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        console.error("Submit error response:", errorText);
        throw new Error(`fal.ai API error: ${submitResponse.status} - ${errorText}`);
      }

      const responseData = await submitResponse.json();
      console.log("Video generation submit response:", JSON.stringify(responseData, null, 2));

      // Handle response - check if it's wrapped in 'data' (SDK format) or direct
      const data = responseData.data || responseData;

      // Check if we have a video URL immediately (synchronous response)
      let videoUrl: string | null = null;
      if (data.video?.url) {
        videoUrl = data.video.url;
      } else if (data.data?.video?.url) {
        videoUrl = data.data.video.url;
      } else if (data.video_url) {
        videoUrl = data.video_url;
      } else if (data.data?.video_url) {
        videoUrl = data.data.video_url;
      } else if (data.output?.video?.url) {
        videoUrl = data.output.video.url;
      } else if (data.output?.video_url) {
        videoUrl = data.output.video_url;
      }

      // Also check if images array contains video URLs (some APIs return videos as "images")
      if (!videoUrl && data.images && Array.isArray(data.images)) {
        const videoInImages = data.images.find((url: string) =>
          url && (url.includes('.mp4') || url.includes('video') || url.includes('.webm'))
        );
        if (videoInImages) {
          videoUrl = typeof videoInImages === 'string' ? videoInImages : videoInImages.url;
        }
      }

      // Get request ID from response
      const requestId = responseData.request_id || data.request_id || responseData.requestId || data.requestId || data.id || `sync-${Date.now()}`;

      // If we have a video URL immediately, return completed response
      if (videoUrl) {
        console.log("Video generation completed synchronously, videoUrl:", videoUrl);
        return {
          requestId: requestId,
          status: "completed",
          videoUrl: videoUrl,
          isCompleted: true,
          seed: data.seed || data.data?.seed,
          actualPrompt: data.actual_prompt || data.data?.actual_prompt,
        };
      }

      // Check if there's a request_id for async polling
      if (requestId && !requestId.startsWith("sync-")) {
        console.log("Video generation request submitted, requestId:", requestId);
        return {
          requestId: requestId,
          status: "processing",
          videoUrl: null,
          isCompleted: false,
        };
      }

      // If no request ID and no video URL, it's an error
      console.error("Unexpected response format:", JSON.stringify(responseData, null, 2));
      throw new Error(`Unexpected response format from fal.ai: no video URL or request_id found`);
    } catch (error: any) {
      console.error("fal.ai video generation error:", error);
      throw new Error(`Failed to generate video: ${error.message}`);
    }
  },
});

/**
 * Edit image using fal.ai (prompt-based editing)
 * Supports image-to-image editing with models like nano-banana/edit
 * API docs: https://fal.ai/models/fal-ai/nano-banana/edit/api
 */
export const editImage = action({
  args: {
    model: v.string(),
    imageUrl: v.string(),
    prompt: v.string(),
    numImages: v.optional(v.number()),
    outputFormat: v.optional(v.union(v.literal("jpeg"), v.literal("png"), v.literal("webp"))),
    aspectRatio: v.optional(v.string()),
    additionalImageUrls: v.optional(v.array(v.string())), // For multiple image remixing
  },
  handler: async (ctx, args) => {
    if (!FAL_API_KEY) {
      throw new Error("FAL_API_KEY is not configured");
    }

    // Upload images to fal.ai storage to get publicly accessible URLs
    // This is required because fal.ai APIs need publicly accessible URLs
    const uploadToFalStorage = async (url: string): Promise<string> => {
      try {
        // Check if it's a storage ID (short string without http/https/data, typically starts with 'k' for Convex)
        // Storage IDs are usually 20-30 characters and don't contain slashes or colons
        const isStorageId = !url.startsWith("http://") &&
          !url.startsWith("https://") &&
          !url.startsWith("data:") &&
          url.length > 10 &&
          url.length < 50 &&
          !url.includes("/") &&
          !url.includes(":");

        if (isStorageId) {
          // It's likely a Convex storage ID, convert it to a URL
          try {
            const storageId = url as Id<"_storage">;
            const storageUrl = await ctx.storage.getUrl(storageId);
            if (!storageUrl) {
              throw new Error(`Failed to get URL for storage ID: ${url}`);
            }
            url = storageUrl;
          } catch (error: any) {
            throw new Error(`Invalid storage ID: ${url}. Error: ${error.message}`);
          }
        }

        // Check if URL is already a publicly accessible URL (like from fal.ai or other CDN)
        if (url.startsWith("https://storage.googleapis.com/") ||
          url.startsWith("https://fal.ai/") ||
          (url.startsWith("https://") && (url.includes("googleapis.com") || url.includes("fal.ai")))) {
          return url; // Already a public URL
        }

        // Convex storage URLs are publicly accessible, so we can use them directly
        // fal.ai APIs can fetch images from any publicly accessible HTTPS URL
        if (url.startsWith("https://")) {
          // Use the URL directly - fal.ai should be able to fetch it
          return url;
        }

        // If not HTTPS, we can't use it
        throw new Error(`Image URL must be publicly accessible HTTPS URL. Got: ${url}`);
      } catch (error: any) {
        console.error("Error processing image URL:", error);
        throw new Error(`Failed to process image URL: ${error.message}`);
      }
    };

    // Upload all images to fal.ai storage
    const baseImageUrl = await uploadToFalStorage(args.imageUrl);
    const additionalUrls: string[] = [];

    if (args.additionalImageUrls && args.additionalImageUrls.length > 0) {
      for (const url of args.additionalImageUrls) {
        const publicUrl = await uploadToFalStorage(url);
        additionalUrls.push(publicUrl);
      }
    }

    // Prepare request body for image editing
    // According to API docs: prompt and image_urls (array) are required
    // nano-banana/edit supports multiple images for remixing
    const imageUrls = [baseImageUrl, ...additionalUrls];

    const requestBody: any = {
      prompt: args.prompt,
      image_urls: imageUrls, // Array of publicly accessible images for remixing
    };

    // Add optional parameters
    if (args.numImages !== undefined && args.numImages > 0) {
      requestBody.num_images = args.numImages;
    }
    if (args.outputFormat) {
      requestBody.output_format = args.outputFormat;
    }
    if (args.aspectRatio) {
      requestBody.aspect_ratio = args.aspectRatio;
    }

    try {
      // Call fal.ai API for image editing
      const response = await fetch(`${FAL_API_BASE_URL}/${args.model}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${FAL_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log("fal.ai editImage response:", JSON.stringify(responseData, null, 2));

      // Helper function to extract URLs from various response formats
      const extractImageUrls = (images: any): string[] => {
        if (!images) return [];
        if (typeof images === "string") return [images];
        if (Array.isArray(images)) {
          return images.map((img: any) => {
            if (typeof img === "string") return img;
            if (img && typeof img === "object" && img.url) return img.url;
            return null;
          }).filter((url: string | null): url is string => url !== null);
        }
        if (typeof images === "object" && images.url) {
          return [images.url];
        }
        return [];
      };

      // Handle response - check if it's wrapped in 'data' (SDK format) or direct
      // According to API docs, response should have: { images: File[], description: string }
      const data = responseData.data || responseData;

      // Extract images (API docs show images is an array of File objects)
      let images: string[] = [];
      if (data.images) {
        images = extractImageUrls(data.images);
        console.log("Edit: Extracted from data.images:", images);
      }
      if (images.length === 0 && data.output) {
        images = extractImageUrls(data.output);
        console.log("Edit: Extracted from data.output:", images);
      }
      if (images.length === 0 && data.image_url) {
        images = extractImageUrls([data.image_url]);
        console.log("Edit: Extracted from data.image_url:", images);
      }
      if (images.length === 0 && data.image) {
        images = extractImageUrls([data.image]);
        console.log("Edit: Extracted from data.image:", images);
      }

      console.log("Edit: Final extracted images array:", images);

      // Get requestId from responseData or data
      const requestId = responseData.requestId || data.request_id || data.id || `sync-${Date.now()}`;

      // PRIORITY: If we have images, return them immediately
      if (images.length > 0) {
        console.log("Returning completed edit response with", images.length, "image(s)");
        return {
          requestId: requestId,
          status: "completed",
          images: images,
          isCompleted: true,
        };
      }

      // No images found - check if we need to poll
      if (data.request_id || responseData.requestId) {
        console.log("No images found, will poll async with requestId:", data.request_id || responseData.requestId);
        return {
          requestId: data.request_id || responseData.requestId,
          status: "processing",
          images: [],
          isCompleted: false,
        };
      }

      // Log the full response for debugging
      console.error("Unexpected response format:", JSON.stringify(responseData, null, 2));
      throw new Error(`Unexpected response format from fal.ai: ${JSON.stringify(responseData)}`);
    } catch (error: any) {
      console.error("fal.ai editImage error:", error);
      throw new Error(`Failed to edit image: ${error.message}`);
    }
  },
});

/**
 * Upload a file to Convex storage and return the URL
 */
export const uploadFile = action({
  args: {
    file: v.any(), // ArrayBuffer
    fileName: v.string(),
    mimeType: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Convert ArrayBuffer to Blob
      const blob = new Blob([args.file], { type: args.mimeType });

      // Upload to Convex storage
      const storageId = await ctx.storage.store(blob);

      // Get the storage URL
      const fileUrl = await ctx.storage.getUrl(storageId);
      if (!fileUrl) {
        throw new Error("Failed to get storage URL");
      }

      return {
        storageId,
        fileUrl,
        fileSize: blob.size,
        mimeType: args.mimeType,
      };
    } catch (error: any) {
      console.error("File upload error:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  },
});

/**
 * Download image/video from URL and upload to Convex storage
 */
export const downloadAndStoreFile = action({
  args: {
    url: v.string(),
    generationId: v.union(v.id("imageGenerations"), v.id("videoGenerations")),
    generationType: v.union(v.literal("image"), v.literal("video")),
    fileName: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    fileId: Id<"generatedFiles">;
    storageId: Id<"_storage">;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }> => {
    try {
      // Download the file
      const response = await fetch(args.url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer]);

      // Get MIME type from response or infer from URL
      const contentType = response.headers.get("content-type") ||
        (args.generationType === "image" ? "image/png" : "video/mp4");

      // Upload to Convex storage
      const storageId = await ctx.storage.store(blob);

      // Get the storage URL
      const fileUrl = await ctx.storage.getUrl(storageId);
      if (!fileUrl) {
        throw new Error("Failed to get storage URL");
      }

      // Create generated file record via mutation
      const fileId: Id<"generatedFiles"> = await ctx.runMutation(api.mutations.createGeneratedFile, {
        storageId,
        fileUrl,
        fileType: args.generationType,
        mimeType: contentType,
        fileSize: arrayBuffer.byteLength,
        width: args.width,
        height: args.height,
        generationId: args.generationId,
        generationType: args.generationType,
        isOriginal: true,
      });

      return {
        fileId,
        storageId,
        fileUrl,
        fileSize: arrayBuffer.byteLength,
        mimeType: contentType,
      };
    } catch (error: any) {
      console.error("File download/store error:", error);
      throw new Error(`Failed to download and store file: ${error.message}`);
    }
  },
});


