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
      if (Math.abs(ratio - 16/9) < 0.1) return "16:9";
      if (Math.abs(ratio - 9/16) < 0.1) return "9:16";
      if (Math.abs(ratio - 3/4) < 0.1) return "3:4";
      if (Math.abs(ratio - 4/3) < 0.1) return "4:3";
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
      // Try multiple possible endpoint formats
      // First try /queue/result (preferred for completed requests)
      let endpoint = `${FAL_API_BASE_URL}/${args.model}/queue/result`;
      let response = await fetch(`${endpoint}?request_id=${args.requestId}`, {
        method: "GET",
        headers: {
          Authorization: `Key ${FAL_API_KEY}`,
        },
      });

      // If that fails, try /requests/{id} format
      if (!response.ok && response.status === 404) {
        endpoint = `${FAL_API_BASE_URL}/${args.model}/requests/${args.requestId}`;
        response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Key ${FAL_API_KEY}`,
          },
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log("fal.ai pollGenerationStatus response:", JSON.stringify(responseData, null, 2));

      // Handle response - check if it's wrapped in 'data' (SDK format) or direct
      const data = responseData.data || responseData;

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

      const status = data.status?.toLowerCase() || "processing";
      
      // Check if completed based on status or if we have images
      const isCompleted = status === "completed" || status === "COMPLETED" || images.length > 0;
      const isFailed = status === "failed" || status === "FAILED" || status === "error";
      
      console.log("Poll result:", {
        status,
        imagesCount: images.length,
        isCompleted,
        isFailed,
      });

      return {
        requestId: args.requestId,
        status: status,
        images: images,
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


