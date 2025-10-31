import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Get all locations
export const getLocations = query({
  handler: async (ctx) => {
    return await ctx.db.query("locations").collect();
  },
});

// Get location by slug
export const getLocationBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get all products
export const getProducts = query({
  handler: async (ctx) => {
    return await ctx.db.query("products").collect();
  },
});

// Get active products
export const getActiveProducts = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("products")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

// Get screen by screenId
export const getScreenById = query({
  args: { screenId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("screens")
      .withIndex("by_screenId", (q) => q.eq("screenId", args.screenId))
      .first();
  },
});

// Get all screens
export const getScreens = query({
  handler: async (ctx) => {
    return await ctx.db.query("screens").collect();
  },
});

// Get templates
export const getTemplates = query({
  handler: async (ctx) => {
    return await ctx.db.query("templates").collect();
  },
});

// Get default template
export const getDefaultTemplate = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("templates")
      .withIndex("by_default", (q) => q.eq("isDefault", true))
      .first();
  },
});

// Get products by category
export const getProductsByCategory = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .collect();
    }
    return await ctx.db.query("products").collect();
  },
});

// Get product by ID
export const getProductById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get template by ID
export const getTemplateById = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get screens by location
export const getScreensByLocation = query({
  args: { locationId: v.id("locations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("screens")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .collect();
  },
});

// Get screen with location details
export const getScreenWithLocation = query({
  args: { screenId: v.string() },
  handler: async (ctx, args) => {
    const screen = await ctx.db
      .query("screens")
      .withIndex("by_screenId", (q) => q.eq("screenId", args.screenId))
      .first();
    if (!screen) return null;
    const location = await ctx.db.get(screen.locationId);
    return { screen, location };
  },
});

// Get all static assets
export const getStaticAssets = query({
  handler: async (ctx) => {
    return await ctx.db.query("staticAssets").collect();
  },
});

// Get static asset by ID
export const getStaticAssetById = query({
  args: { id: v.id("staticAssets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get complete screen data for display
export const getScreenForDisplay = query({
  args: { screenId: v.string() },
  handler: async (ctx, args) => {
    const screen = await ctx.db
      .query("screens")
      .withIndex("by_screenId", (q) => q.eq("screenId", args.screenId))
      .first();

    if (!screen || screen.status !== "active") return null;

    const location = await ctx.db.get(screen.locationId);
    if (!location || location.status !== "active") return null;

    let template = null;
    const products: Array<{
      _id: any;
      name: string;
      price: number;
      currency: string;
      category?: string;
      description?: string;
      image?: string;
      status: "active" | "inactive";
      order: number;
    }> = [];

    if (screen.mode === "dynamic" && screen.dynamicConfig) {
      // Get template
      template = await ctx.db.get(screen.dynamicConfig.templateId);

      // Get products
      if (screen.dynamicConfig.productIds.length > 0) {
        const productPromises = screen.dynamicConfig.productIds
          .filter((id) => id !== null)
          .map((id) => ctx.db.get(id));
        const fetchedProducts = await Promise.all(productPromises);
        const validProducts = fetchedProducts
          .filter((p): p is NonNullable<typeof p> => p !== null && p.status === "active")
          .sort((a, b) => a.order - b.order);
        products.push(...validProducts);
      }
    }

    return {
      screen,
      location,
      template,
      products,
    };
  },
});

// ========== Generator Module Queries ==========

// Get image generations by user
export const getImageGenerationsByUser = query({
  args: {
    userId: v.string(),
    type: v.optional(v.union(v.literal("free"), v.literal("product"), v.literal("menu"))),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("imageGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId));

    if (args.type) {
      return (await query.collect()).filter((gen) => gen.type === args.type);
    }

    return await query.collect();
  },
});

// Get image generation by ID
export const getImageGenerationById = query({
  args: {
    id: v.id("imageGenerations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get video generations by user
export const getVideoGenerationsByUser = query({
  args: {
    userId: v.string(),
    type: v.optional(
      v.union(
        v.literal("image-to-video"),
        v.literal("video-remix"),
        v.literal("text-to-video"),
        v.literal("video-to-video")
      )
    ),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("videoGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId));

    if (args.type) {
      return (await query.collect()).filter((gen) => gen.type === args.type);
    }

    return await query.collect();
  },
});

// Get video generation by ID
export const getVideoGenerationById = query({
  args: {
    id: v.id("videoGenerations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get generated files by generation ID
export const getGeneratedFilesByGenerationId = query({
  args: {
    generationId: v.union(v.id("imageGenerations"), v.id("videoGenerations")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("generatedFiles")
      .withIndex("by_generationId", (q) => q.eq("generationId", args.generationId))
      .collect();
  },
});

// Get generated file by ID
export const getGeneratedFileById = query({
  args: {
    id: v.id("generatedFiles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get all generated files (for gallery)
export const getGeneratedFiles = query({
  args: {
    userId: v.optional(v.string()),
    fileType: v.optional(v.union(v.literal("image"), v.literal("video"))),
    generationType: v.optional(v.union(v.literal("image"), v.literal("video"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let files;

    if (args.fileType) {
      files = await ctx.db
        .query("generatedFiles")
        .withIndex("by_fileType", (q) => q.eq("fileType", args.fileType!))
        .collect();
    } else if (args.generationType) {
      files = await ctx.db
        .query("generatedFiles")
        .withIndex("by_generationType", (q) => q.eq("generationType", args.generationType!))
        .collect();
    } else {
      files = await ctx.db
        .query("generatedFiles")
        .withIndex("by_createdAt")
        .collect();
    }

    // Filter by userId if generation is linked to user
    if (args.userId) {
      const imageGens = await ctx.db
        .query("imageGenerations")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
        .collect();
      const videoGens = await ctx.db
        .query("videoGenerations")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
        .collect();

      const userGenIds = new Set([
        ...imageGens.map((g) => g._id),
        ...videoGens.map((g) => g._id),
      ]);

      files = files.filter((f) => userGenIds.has(f.generationId));
    }

    // Sort by createdAt descending
    files.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    if (args.limit) {
      files = files.slice(0, args.limit);
    }

    return files;
  },
});

// Get edit history for a file
export const getEditHistoryByFileId = query({
  args: {
    fileId: v.id("generatedFiles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("editHistory")
      .withIndex("by_fileId", (q) => q.eq("fileId", args.fileId))
      .collect();
  },
});

// Get user collections
export const getCollectionsByUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userCollections")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get collection by ID
export const getCollectionById = query({
  args: {
    id: v.id("userCollections"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get pending/processing generations
export const getPendingGenerations = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const pendingImageGens = await ctx.db
      .query("imageGenerations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const processingImageGens = await ctx.db
      .query("imageGenerations")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .collect();

    const pendingVideoGens = await ctx.db
      .query("videoGenerations")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const processingVideoGens = await ctx.db
      .query("videoGenerations")
      .withIndex("by_status", (q) => q.eq("status", "processing"))
      .collect();

    let allPending = [
      ...pendingImageGens,
      ...processingImageGens,
      ...pendingVideoGens,
      ...processingVideoGens,
    ];

    if (args.userId) {
      allPending = allPending.filter((gen) => gen.userId === args.userId);
    }

    return allPending;
  },
});

// Get dashboard stats for a user
export const getDashboardStats = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all image generations for user
    const imageGenerations = await ctx.db
      .query("imageGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Get all video generations for user
    const videoGenerations = await ctx.db
      .query("videoGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Count by type
    const freeImageCount = imageGenerations.filter((g) => g.type === "free").length;
    const productImageCount = imageGenerations.filter((g) => g.type === "product").length;
    const menuCount = imageGenerations.filter((g) => g.type === "menu").length;
    const videoCount = videoGenerations.length;

    // Get all generated files for user
    const allImageFiles = await ctx.db
      .query("generatedFiles")
      .withIndex("by_generationType", (q) => q.eq("generationType", "image"))
      .collect();

    const allVideoFiles = await ctx.db
      .query("generatedFiles")
      .withIndex("by_generationType", (q) => q.eq("generationType", "video"))
      .collect();

    // Filter files by user's generations
    const userImageGenIds = new Set(imageGenerations.map((g) => g._id));
    const userVideoGenIds = new Set(videoGenerations.map((g) => g._id));

    // Type guard: image files filtered by generationType="image" should only have imageGeneration IDs
    const userImageFiles = allImageFiles.filter((f) => {
      const genId = f.generationId as Id<"imageGenerations">;
      return userImageGenIds.has(genId);
    });

    // Type guard: video files filtered by generationType="video" should only have videoGeneration IDs
    const userVideoFiles = allVideoFiles.filter((f) => {
      const genId = f.generationId as Id<"videoGenerations">;
      return userVideoGenIds.has(genId);
    });

    return {
      totalImageGenerations: imageGenerations.length,
      totalVideoGenerations: videoGenerations.length,
      totalGenerations: imageGenerations.length + videoGenerations.length,
      freeImageCount,
      productImageCount,
      menuCount,
      videoCount,
      totalImageFiles: userImageFiles.length,
      totalVideoFiles: userVideoFiles.length,
      totalFiles: userImageFiles.length + userVideoFiles.length,
    };
  },
});

// Get recent generations for dashboard
export const getRecentGenerations = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get recent image generations
    const imageGenerations = await ctx.db
      .query("imageGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Get recent video generations
    const videoGenerations = await ctx.db
      .query("videoGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Combine and sort by createdAt
    const allGenerations = [
      ...imageGenerations.map((g) => ({
        ...g,
        generationType: "image" as const,
      })),
      ...videoGenerations.map((g) => ({
        ...g,
        generationType: "video" as const,
      })),
    ].sort((a, b) => b.createdAt - a.createdAt);

    // Get files for each generation
    const recentGenerations = await Promise.all(
      allGenerations.slice(0, limit).map(async (gen) => {
        const files = await ctx.db
          .query("generatedFiles")
          .withIndex("by_generationId", (q) => q.eq("generationId", gen._id))
          .collect();

        return {
          ...gen,
          files: files.slice(0, 1), // Just get first file for thumbnail
        };
      })
    );

    return recentGenerations;
  },
});

// Get files with generation details for gallery (with search and filters)
export const getFilesWithDetails = query({
  args: {
    userId: v.string(),
    fileType: v.optional(v.union(v.literal("image"), v.literal("video"))),
    generationType: v.optional(v.union(v.literal("image"), v.literal("video"))),
    imageGenerationType: v.optional(v.union(v.literal("free"), v.literal("product"), v.literal("menu"))),
    modelFilter: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"), v.literal("fileSize"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all user's generations
    const imageGenerations = await ctx.db
      .query("imageGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const videoGenerations = await ctx.db
      .query("videoGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter generations by type if specified
    let filteredImageGens = imageGenerations;
    if (args.imageGenerationType) {
      filteredImageGens = imageGenerations.filter((g) => g.type === args.imageGenerationType);
    }

    // Filter by model if specified
    if (args.modelFilter) {
      filteredImageGens = filteredImageGens.filter((g) => g.model === args.modelFilter);
      const filteredVideoGens = videoGenerations.filter((g) => g.model === args.modelFilter);
      videoGenerations.splice(0, videoGenerations.length, ...filteredVideoGens);
    }

    // Filter by search query if provided
    if (args.searchQuery) {
      const searchLower = args.searchQuery.toLowerCase();
      filteredImageGens = filteredImageGens.filter((g) =>
        g.prompt.toLowerCase().includes(searchLower)
      );
      const filteredVideoGens = videoGenerations.filter((g) =>
        g.prompt.toLowerCase().includes(searchLower)
      );
      videoGenerations.splice(0, videoGenerations.length, ...filteredVideoGens);
    }

    // Filter by date range if provided
    if (args.dateFrom) {
      filteredImageGens = filteredImageGens.filter((g) => g.createdAt >= args.dateFrom!);
      const filteredVideoGens = videoGenerations.filter((g) => g.createdAt >= args.dateFrom!);
      videoGenerations.splice(0, videoGenerations.length, ...filteredVideoGens);
    }
    if (args.dateTo) {
      filteredImageGens = filteredImageGens.filter((g) => g.createdAt <= args.dateTo!);
      const filteredVideoGens = videoGenerations.filter((g) => g.createdAt <= args.dateTo!);
      videoGenerations.splice(0, videoGenerations.length, ...filteredVideoGens);
    }

    const userGenIds = new Set([
      ...filteredImageGens.map((g) => g._id),
      ...videoGenerations.map((g) => g._id),
    ]);

    // Get all files
    let files;
    if (args.fileType) {
      files = await ctx.db
        .query("generatedFiles")
        .withIndex("by_fileType", (q) => q.eq("fileType", args.fileType!))
        .collect();
    } else if (args.generationType) {
      files = await ctx.db
        .query("generatedFiles")
        .withIndex("by_generationType", (q) => q.eq("generationType", args.generationType!))
        .collect();
    } else {
      files = await ctx.db
        .query("generatedFiles")
        .withIndex("by_createdAt")
        .collect();
    }

    // Filter files by user's generations
    files = files.filter((f) => userGenIds.has(f.generationId));

    // Sort files
    const sortBy = args.sortBy || "newest";
    if (sortBy === "newest") {
      files.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortBy === "oldest") {
      files.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortBy === "fileSize") {
      files.sort((a, b) => b.fileSize - a.fileSize);
    }

    // Apply limit
    if (args.limit) {
      files = files.slice(0, args.limit);
    }

    // Get generation details for each file
    const filesWithDetails = await Promise.all(
      files.map(async (file) => {
        let generation;
        if (file.generationType === "image") {
          generation = await ctx.db.get(file.generationId as Id<"imageGenerations">);
        } else {
          generation = await ctx.db.get(file.generationId as Id<"videoGenerations">);
        }

        return {
          file,
          generation,
        };
      })
    );

    return filesWithDetails;
  },
});

// Get file with full details (for file details view)
export const getFileWithFullDetails = query({
  args: {
    fileId: v.id("generatedFiles"),
  },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.fileId);
    if (!file) return null;

    let generation;
    if (file.generationType === "image") {
      generation = await ctx.db.get(file.generationId as Id<"imageGenerations">);
    } else {
      generation = await ctx.db.get(file.generationId as Id<"videoGenerations">);
    }

    // Get edit history
    const editHistory = await ctx.db
      .query("editHistory")
      .withIndex("by_fileId", (q) => q.eq("fileId", args.fileId))
      .collect();

    // Get parent file if exists
    let parentFile = null;
    if (file.parentFileId) {
      parentFile = await ctx.db.get(file.parentFileId);
    }

    // Get collections that include this file
    const collections = await ctx.db
      .query("userCollections")
      .collect();
    const collectionsWithFile = collections.filter((c) => c.fileIds.includes(args.fileId));

    return {
      file,
      generation,
      editHistory,
      parentFile,
      collections: collectionsWithFile,
    };
  },
});

// Get available models for a user (for filter dropdown)
export const getAvailableModels = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all user's generations
    const imageGenerations = await ctx.db
      .query("imageGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const videoGenerations = await ctx.db
      .query("videoGenerations")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    // Extract unique models
    const models = new Set<string>();
    imageGenerations.forEach((g) => models.add(g.model));
    videoGenerations.forEach((g) => models.add(g.model));

    // Sort models alphabetically
    return Array.from(models).sort();
  },
});
