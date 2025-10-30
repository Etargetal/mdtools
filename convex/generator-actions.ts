import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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

    // Prepare request body based on model
    const requestBody: any = {
      prompt: args.prompt,
    };

    // Model-specific parameter handling
    const isImagen = args.model.includes("imagen");
    const isNanoBanana = args.model.includes("nano") || args.model.includes("banana");

    // Image size handling - different models use different formats
    if (isImagen) {
      // Imagen uses width and height as separate parameters
      requestBody.width = args.width;
      requestBody.height = args.height;
    } else {
      // Most other models use image_size
      requestBody.image_size = `${args.width}x${args.height}`;
    }

    // Add optional parameters
    if (args.negativePrompt) {
      requestBody.negative_prompt = args.negativePrompt;
    }
    if (args.seed !== undefined) {
      requestBody.seed = args.seed;
    }
    if (args.guidanceScale !== undefined) {
      if (isImagen) {
        // Imagen uses guidance_scale
        requestBody.guidance_scale = args.guidanceScale;
      } else {
        requestBody.guidance_scale = args.guidanceScale;
      }
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

      const data = await response.json();

      // Handle both sync and async responses
      if (data.status === "COMPLETED" || data.images || data.image_url || data.image) {
        // Synchronous response
        const images = data.images ||
          (data.image_url ? [data.image_url] : []) ||
          (data.image ? [data.image] : []);

        return {
          requestId: data.request_id || data.id || `sync-${Date.now()}`,
          status: "completed",
          images: images,
          isCompleted: true,
        };
      } else if (data.request_id) {
        // Asynchronous response - need to poll
        return {
          requestId: data.request_id,
          status: "processing",
          images: [],
          isCompleted: false,
        };
      } else {
        throw new Error("Unexpected response format from fal.ai");
      }
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
      const response = await fetch(`${FAL_API_BASE_URL}/${args.model}/requests/${args.requestId}`, {
        method: "GET",
        headers: {
          Authorization: `Key ${FAL_API_KEY}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Extract images from various possible response formats
      const images = data.images ||
        (data.image_url ? [data.image_url] : []) ||
        (data.image ? [data.image] : []) ||
        (Array.isArray(data.output) ? data.output : []);

      const status = data.status?.toLowerCase() || "processing";

      return {
        requestId: args.requestId,
        status: status,
        images: images,
        error: data.error || null,
        isCompleted: status === "completed" || status === "COMPLETED" || images.length > 0,
        isFailed: status === "failed" || status === "FAILED" || status === "error",
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
 * Generate video from text using fal.ai
 */
export const generateVideoFromText = action({
  args: {
    model: v.string(),
    prompt: v.string(),
    negativePrompt: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()),
    numFrames: v.optional(v.number()),
    fps: v.optional(v.number()),
    seed: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (!FAL_API_KEY) {
      throw new Error("FAL_API_KEY is not configured");
    }

    const requestBody: any = {
      prompt: args.prompt,
    };

    if (args.negativePrompt) {
      requestBody.negative_prompt = args.negativePrompt;
    }
    if (args.width && args.height) {
      requestBody.image_size = `${args.width}x${args.height}`;
    }
    if (args.duration) {
      requestBody.duration = args.duration;
    }
    if (args.numFrames) {
      requestBody.num_frames = args.numFrames;
    }
    if (args.fps) {
      requestBody.fps = args.fps;
    }
    if (args.seed !== undefined) {
      requestBody.seed = args.seed;
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
      console.error("fal.ai text-to-video error:", error);
      throw new Error(`Failed to generate video: ${error.message}`);
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
  handler: async (ctx, args) => {
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
      const fileId = await ctx.runMutation(api.mutations.createGeneratedFile, {
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

