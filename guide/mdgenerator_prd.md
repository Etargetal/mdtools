# Product Requirements Document (PRD)
## AI Generator Module - Image & Video Generation Platform

---

## Document Information

**Project Name:** AI Generator Module  
**Version:** 1.0  
**Created:** 2025  
**Status:** Planning Phase  
**Tech Stack:** Next.js, Convex, fal.ai API  
**Note:** Authentication will be handled at the application level, not within this module.

---

## Executive Summary

An AI-powered image and video generation platform integrated with fal.ai API. The system provides free image generation using Google Imagen and Nano Banana Flash models, specialized product image generation with style transfer capabilities, menu generation for digital signage integration, and comprehensive video generation tools. All generated content is stored in Convex with full version history and edit tracking.

---

## Problem Statement

Users need a centralized platform to:
- Generate images using state-of-the-art AI models without technical complexity
- Create product images with consistent styles and branding
- Generate menu displays for digital signage with customizable layouts
- Create and edit videos using AI-powered tools (image-to-video, video remixes, etc.)
- Track all generated content and maintain version history
- Access previously generated content for reuse and modification

---

## Target Users

1. **Content Creators** - Generating images and videos for various purposes
2. **Product Managers** - Creating product images with consistent styling
3. **Signage Administrators** - Generating menu displays for digital signage
4. **Marketing Teams** - Creating visual content for campaigns

---

## System Architecture

### High-Level Components

```
┌──────────────────────┐
│   Generator Portal   │ ← Users generate content
│   /generator/admin   │
└──────────┬───────────┘
           │
      ┌────▼─────┐
      │  Convex  │ ← Stores generations, history, edits
      │ Backend  │
      └────┬─────┘
           │
      ┌────▼─────┐
      │  fal.ai  │ ← AI generation API
      │   API    │
      └──────────┘
```

### Tech Stack

- **Frontend/Backend:** Next.js 15+ (App Router)
- **Database/Backend:** Convex
- **AI Provider:** fal.ai API
- **Media Storage:** Convex file storage
- **Deployment:** Vercel

---

## Data Model (Convex Schema)

### Tables

#### `imageGenerations`
```typescript
{
  _id: Id<"imageGenerations">,
  userId: string,                    // User identifier (from auth)
  type: "free" | "product" | "menu", // Generation type
  model: string,                     // fal.ai model name (e.g., "google/imagen-3", "banana/nano-flash")
  
  // Generation parameters
  prompt: string,
  negativePrompt?: string,
  style?: string,                    // Style description or reference
  styleImageId?: Id<"generatedFiles">, // Reference to style image for product generation
  width: number,                      // Image width
  height: number,                     // Image height
  numImages: number,                  // Number of images to generate
  seed?: number,                      // Random seed for reproducibility
  guidanceScale?: number,             // Model-specific guidance
  
  // Menu-specific parameters
  menuConfig?: {
    orientation: "portrait" | "landscape",
    pricePosition: "top" | "bottom" | "right" | "left",
    useGeneratedImages: boolean,      // Use AI-generated product images
    useProvidedImages: boolean,       // Use uploaded product images
    backgroundSource: "generated" | "provided" | "none",
    backgroundImageId?: Id<"generatedFiles">,
    products: Array<{
      productId?: Id<"products">,     // Reference to signage product
      name: string,
      price: number,
      imageId?: Id<"generatedFiles">, // Generated or provided image
      order: number,
    }>,
  },
  
  // Product-specific parameters
  productConfig?: {
    productName: string,
    productDescription?: string,
    styleReferenceId?: Id<"generatedFiles">, // Style image to copy
    styleStrength?: number,           // 0.0 to 1.0
    backgroundType: "transparent" | "generated" | "provided",
    backgroundImageId?: Id<"generatedFiles">,
  },
  
  // Generation status and results
  status: "pending" | "processing" | "completed" | "failed",
  falRequestId?: string,              // fal.ai request ID
  errorMessage?: string,
  
  // Results
  generatedFileIds: Id<"generatedFiles">[], // Generated images
  
  createdAt: number,
  updatedAt: number,
  completedAt?: number,
}
```

#### `videoGenerations`
```typescript
{
  _id: Id<"videoGenerations">,
  userId: string,
  type: "image-to-video" | "video-remix" | "text-to-video" | "video-to-video",
  
  // Input parameters
  prompt: string,
  negativePrompt?: string,
  
  // Image-to-video
  sourceImageId?: Id<"generatedFiles">,
  motionStrength?: number,            // 0.0 to 1.0
  duration?: number,                  // Video duration in seconds
  
  // Video remix
  sourceVideoId?: Id<"generatedFiles">,
  remixStyle?: string,
  
  // Text-to-video
  width?: number,
  height?: number,
  
  // Video-to-video
  videoStyleId?: Id<"generatedFiles">, // Reference style video
  
  // Model selection
  model: string,                      // fal.ai video model name
  
  // Generation status
  status: "pending" | "processing" | "completed" | "failed",
  falRequestId?: string,
  errorMessage?: string,
  
  // Results
  generatedFileIds: Id<"generatedFiles">[], // Generated videos
  
  createdAt: number,
  updatedAt: number,
  completedAt?: number,
}
```

#### `generatedFiles`
```typescript
{
  _id: Id<"generatedFiles">,
  storageId: Id<"_storage">,          // Convex storage ID
  fileUrl: string,                    // Public URL
  fileType: "image" | "video",
  mimeType: string,                   // "image/png", "video/mp4", etc.
  fileSize: number,                   // Bytes
  width?: number,                     // For images/videos
  height?: number,                     // For images/videos
  duration?: number,                   // For videos (seconds)
  
  // Metadata
  generationId: Id<"imageGenerations"> | Id<"videoGenerations">,
  generationType: "image" | "video",
  isOriginal: boolean,                // True if original generation, false if edited variant
  
  // Version tracking
  parentFileId?: Id<"generatedFiles">, // If this is an edit, reference original
  editHistory: Array<{
    editType: string,                  // "crop", "filter", "style-transfer", etc.
    parameters: object,
    timestamp: number,
  }>,
  
  createdAt: number,
}
```

#### `editHistory`
```typescript
{
  _id: Id<"editHistory">,
  userId: string,
  fileId: Id<"generatedFiles">,
  editType: "crop" | "resize" | "filter" | "style-transfer" | "color-adjust" | "text-overlay" | "remove-background" | "upscale",
  
  // Edit parameters (varies by editType)
  parameters: {
    // Crop
    x?: number,
    y?: number,
    width?: number,
    height?: number,
    
    // Resize
    newWidth?: number,
    newHeight?: number,
    
    // Filter
    filterName?: string,
    intensity?: number,
    
    // Style transfer
    styleImageId?: Id<"generatedFiles">,
    strength?: number,
    
    // Color adjust
    brightness?: number,
    contrast?: number,
    saturation?: number,
    
    // Text overlay
    text?: string,
    position?: string,
    fontSize?: number,
    color?: string,
    
    // Upscale
    scaleFactor?: number,
    model?: string,
  },
  
  // Result
  resultFileId: Id<"generatedFiles">,
  
  createdAt: number,
}
```

#### `userCollections`
```typescript
{
  _id: Id<"userCollections">,
  userId: string,
  name: string,
  description?: string,
  fileIds: Id<"generatedFiles">[],
  isPublic: boolean,
  createdAt: number,
  updatedAt: number,
}
```

---

## Feature Requirements

### 1. Admin Portal (`/generator/admin`)

#### 1.1 Dashboard
- [x] Quick actions (generate image, generate video)
- [x] Overview of recent generations
- [x] Quick stats (total generations, images generated, videos generated)
- [x] Recent generations gallery
- [ ] Storage usage indicator

#### 1.2 Free Image Generation

**Interface**
- [x] Model selector (Google Imagen 4, Nano Banana Flash - easily extensible)
- [x] Prompt input (textarea with character counter)
- [x] Negative prompt input (optional)
- [x] Image dimensions selector (predefined presets: 1024x1024, 1024x768, 768x1024, custom)
- [x] Number of images slider (1-4)
- [x] Advanced parameters panel (collapsible):
  - [x] Seed input (for reproducibility)
  - [x] Guidance scale slider
  - [x] Model-specific parameters
- [x] Generate button with loading state
- [x] Generation progress indicator
- [x] Results display with download options

**Functionality**
- [x] Integration with fal.ai API
- [x] Polling for generation status
- [x] Real-time status updates
- [x] Error handling and retry logic
- [x] Save generation to history
- [x] Quick download options
- [x] Add to collection button

**Models Supported**
- [x] Google Imagen 4 
- [x] Nano Banana Flash 
- [x] Model-specific parameter handling
- [x] Other state of the art models (easily extensible)

#### 1.3 Product Picture Generation

**List View**
- [ ] All product generations with thumbnails
- [ ] Filter by product name
- [ ] Filter by style
- [ ] Sort by date, name

**Generation Interface**
- [ ] Product name input
- [ ] Product description input (optional)
- [ ] Style selection:
  - [ ] Upload style reference image
  - [ ] Select from previous generations
  - [ ] Style strength slider (0.0 to 1.0)
- [ ] Background options:
  - [ ] Transparent background
  - [ ] Generated background (with prompt)
  - [ ] Upload background image
- [ ] Model selector
- [ ] Image dimensions selector
- [ ] Generate button
- [ ] Preview before generation

**Style Transfer**
- [ ] Upload style reference image
- [ ] Preview style transfer effect
- [ ] Adjust style strength
- [ ] Generate with style applied

**Results**
- [ ] Generated product images gallery
- [ ] Download options (PNG, JPG, WebP)
- [ ] Quick edit options
- [ ] Add to product library
- [ ] Link to signage products

#### 1.4 Menu Generation for Signage

**Menu Configuration**
- [ ] Orientation selector (Portrait/Landscape)
- [ ] Price position selector (Top/Bottom/Right/Left)
- [ ] Product list manager:
  - [ ] Add products from signage product library
  - [ ] Add custom products
  - [ ] Reorder products (drag-and-drop)
  - [ ] Remove products
- [ ] Image options:
  - [ ] Use AI-generated product images (with prompt per product)
  - [ ] Use provided/uploaded images
  - [ ] Mix both options
- [ ] Background options:
  - [ ] Generate background (with prompt)
  - [ ] Upload background image
  - [ ] No background (solid color)
- [ ] Menu template selector (if templates exist)
- [ ] Preview pane (live preview)

**Layout Options**
- [ ] Grid layout options (2x2, 3x2, etc.)
- [ ] List layout options
- [ ] Featured product highlight
- [ ] Spacing controls
- [ ] Typography settings

**Generation**
- [ ] Generate menu button
- [ ] Progress indicator
- [ ] Results display
- [ ] Export options:
  - [ ] Export as image
  - [ ] Save to signage screen
  - [ ] Download as PNG/JPG

**Integration with Signage**
- [ ] Link to signage products
- [ ] Save menu directly to screen
- [ ] Use as static asset in signage

#### 1.5 Video Generator

**Navigation Tabs**
- [ ] Image-to-Video
- [ ] Video Remix
- [ ] Text-to-Video
- [ ] Video-to-Video

**Image-to-Video Tab**
- [ ] Upload source image
- [ ] Select from previous generations
- [ ] Prompt input (describe motion/scene)
- [ ] Motion strength slider (0.0 to 1.0)
- [ ] Duration selector (5s, 10s, 15s, 30s)
- [ ] Model selector
- [ ] Aspect ratio selector
- [ ] Generate button
- [ ] Preview and download

**Video Remix Tab**
- [ ] Upload source video
- [ ] Select from previous generations
- [ ] Remix style selector
- [ ] Prompt input (describe remix style)
- [ ] Intensity slider
- [ ] Generate button
- [ ] Preview and download

**Text-to-Video Tab**
- [ ] Prompt input
- [ ] Negative prompt
- [ ] Duration selector
- [ ] Aspect ratio selector (16:9, 9:16, 1:1)
- [ ] Resolution selector
- [ ] Model selector
- [ ] Advanced parameters
- [ ] Generate button

**Video-to-Video Tab**
- [ ] Upload source video
- [ ] Upload style reference video
- [ ] Style transfer strength
- [ ] Generate button

**Video Management**
- [ ] Video gallery with thumbnails
- [ ] Play preview in modal
- [ ] Download options (MP4, WebM)
- [ ] Edit options (trim, add effects)
- [ ] Add to collection

#### 1.6 Generated Content Management

**Gallery View**
- [x] Grid/list view toggle
- [x] Filter by type (image/video)
- [x] Filter by generation type (free/product/menu/video)
- [x] Filter by model
- [ ] Filter by date range
- [x] Search by prompt/keywords
- [x] Sort options (newest, oldest, file size)

**File Details**
- [x] Full-size preview
- [x] Metadata display:
  - [x] Generation parameters
  - [x] Model used
  - [x] Generation date
  - [x] File size and dimensions
- [x] Edit history timeline
- [x] Download options
- [x] Delete confirmation
- [x] Add to collection

**Collections**
- [x] Create collection
- [x] Add files to collection
- [x] Remove files from collection
- [x] Delete collection
- [ ] Share collection (if public)
- [x] View collection gallery

**Edit History**
- [x] View all edits for a file
- [ ] Navigate through edit history
- [ ] Revert to previous version
- [ ] Download specific version
- [ ] Compare versions side-by-side

#### 1.7 Edit Tools

**Image Editing**
- [ ] Crop tool
- [ ] Resize tool
- [ ] Filters gallery
- [ ] Color adjustments (brightness, contrast, saturation)
- [ ] Style transfer (apply style from another image)
- [ ] Text overlay
- [ ] Remove background
- [ ] Upscale (using AI models)

**Video Editing**
- [ ] Trim video
- [ ] Add transitions
- [ ] Apply filters
- [ ] Add text overlay
- [ ] Combine videos
- [ ] Extract frames

**Edit Interface**
- [ ] Side-by-side before/after preview
- [ ] Undo/redo functionality
- [ ] Save edit as new version
- [ ] Save edit as new file

---

## Technical Specifications

### fal.ai Integration

**API Endpoints**
- [ ] Image generation endpoints
- [ ] Video generation endpoints
- [ ] Status polling endpoints
- [ ] Result retrieval endpoints

**API Configuration**
- [x] Environment variable for API key
- [ ] Rate limiting handling
- [x] Error handling and retries
- [ ] Webhook support (if available) for async operations

**Models Integration**
- [ ] Google Imagen 3 (`google/imagen-3`)
- [ ] Nano Banana Flash (`banana/nano-flash`)
- [ ] Video generation models (to be determined based on fal.ai availability)
- [ ] Model-specific parameter mapping

### Convex Setup

**Schema**
- [x] Define all tables (imageGenerations, videoGenerations, generatedFiles, editHistory, userCollections)
- [x] Set up indexes for common queries
- [ ] File storage configuration

**Queries**
- [x] Get user generations
- [x] Get generation by ID
- [x] Get file by ID
- [x] Get edit history
- [x] Get collections
- [x] Search generations

**Mutations**
- [x] Create image generation
- [x] Create video generation
- [x] Update generation status
- [x] Create generated file record
- [x] Create edit history entry
- [x] Create/update collection

**Actions**
- [x] Call fal.ai API for image generation
- [x] Call fal.ai API for video generation
- [x] Poll fal.ai for generation status
- [ ] Process webhook callbacks (if supported)
- [x] Upload files to Convex storage

### Next.js Configuration

**Pages Structure**
- [x] `/generator/admin` - Main dashboard
- [x] `/generator/admin/free-image` - Free image generation
- [ ] `/generator/admin/product-image` - Product image generation
- [ ] `/generator/admin/menu` - Menu generation
- [ ] `/generator/admin/video` - Video generation
- [x] `/generator/admin/gallery` - Content gallery
- [x] `/generator/admin/collections` - Collections management

**Components**
- [x] GeneratorNav - Left sidebar navigation
- [ ] GenerationForm - Base form component
- [ ] ImagePreview - Image preview component
- [ ] VideoPlayer - Video preview component
- [ ] GalleryGrid - Gallery display component
- [ ] EditTools - Editing interface component
- [ ] GenerationHistory - History timeline component

### UI/UX Requirements

**Design Consistency**
- [x] Match signage module design
- [x] Left sidebar navigation (like signage admin)
- [ ] Consistent card components
- [ ] Consistent form styling
- [ ] Consistent button styles

**User Experience**
- [ ] Loading states for all async operations
- [ ] Progress indicators for long-running operations
- [ ] Error messages with actionable feedback
- [ ] Success notifications
- [ ] Confirmation dialogs for destructive actions
- [ ] Responsive design (mobile, tablet, desktop)

**Performance**
- [ ] Image lazy loading
- [ ] Video lazy loading
- [ ] Thumbnail generation for large files
- [ ] Optimized image formats (WebP)
- [ ] Pagination for large galleries

---

## Development Phases

### Phase 1: Foundation & Free Image Generation (MVP)

**Week 1-2: Setup**
- [x] Update root navigation ("Product Launch" → "Generator")
- [x] Create generator admin layout structure
- [x] Create GeneratorNav component (left sidebar)
- [x] Set up Convex schema (imageGenerations, generatedFiles)
- [x] Set up fal.ai API integration (actions)
- [x] Create dashboard page

**Week 3-4: Free Image Generation**
- [x] Build free image generation form
- [x] Implement Google Imagen 4 integration
- [x] Implement Nano Banana Flash integration
- [x] Build generation status polling
- [x] Build results display
- [x] Implement file saving to Convex
- [x] Add download functionality
- [x] Add to collection functionality
- [x] Dashboard stats (total generations, images, videos)
- [x] Recent generations gallery on dashboard

**Week 5-6: Gallery & History**
- [x] Build gallery view
- [x] Implement filtering and search
- [x] Build file details page
- [x] Implement edit history tracking
- [x] Add collections feature

### Phase 2: Product Image Generation

**Week 7-8: Product Generation**
- [ ] Extend schema for product generation
- [ ] Build product generation form
- [ ] Implement style upload and reference
- [ ] Implement style transfer integration
- [ ] Build background options
- [ ] Integrate with signage products (optional)

### Phase 3: Menu Generation

**Week 9-10: Menu Generation**
- [ ] Extend schema for menu generation
- [ ] Build menu configuration interface
- [ ] Implement product selection from signage
- [ ] Build layout options
- [ ] Implement background generation/upload
- [ ] Build preview pane
- [ ] Integrate with signage screens

### Phase 4: Video Generation

**Week 11-12: Video Generation Foundation**
- [ ] Extend schema for video generation
- [ ] Build video generation tabs
- [ ] Implement image-to-video
- [ ] Implement video remix
- [ ] Build video preview player
- [ ] Implement video download

**Week 13-14: Advanced Video Features**
- [ ] Implement text-to-video
- [ ] Implement video-to-video
- [ ] Build video editing tools
- [ ] Add video collections

### Phase 5: Edit Tools & Polish

**Week 15-16: Editing Tools**
- [ ] Build image editing interface
- [ ] Implement crop, resize, filters
- [ ] Implement style transfer editing
- [ ] Build video editing tools
- [ ] Add version comparison

**Week 17-18: Polish & Testing**
- [ ] UI/UX polish
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Testing across all features
- [ ] Documentation

---

## Success Criteria

- [ ] User can generate an image in <30 seconds from prompt to result
- [ ] All generations are saved with full metadata
- [ ] Edit history is fully tracked and navigable
- [ ] Generated menus can be directly used in signage module
- [ ] Video generation completes successfully for all types
- [ ] Gallery displays 100+ files without performance issues
- [ ] API errors are handled gracefully with retry logic
- [ ] File downloads work reliably for all formats

---

## Security Considerations

- [ ] API key stored in environment variables
- [ ] Rate limiting on API calls
- [ ] File upload validation (type, size)
- [ ] Input sanitization (XSS prevention)
- [ ] User data isolation (user-specific queries)
- [ ] HTTPS enforcement
- [ ] Regular dependency updates

---

## Testing Requirements

- [ ] Unit tests for API integration functions
- [ ] Unit tests for Convex mutations/queries
- [ ] Integration tests for generation flows
- [ ] E2E tests for critical flows:
  - [ ] Free image generation
  - [ ] Product image generation
  - [ ] Menu generation
  - [ ] Video generation
  - [ ] Edit operations
- [ ] Performance tests for large galleries
- [ ] Error handling tests

---

## Future Enhancements

- [ ] Batch generation
- [ ] Scheduled generations
- [ ] API access for external integrations
- [ ] Advanced style presets
- [ ] Template marketplace
- [ ] Collaborative collections
- [ ] Generation analytics
- [ ] Cost tracking per user
- [ ] Advanced video effects
- [ ] 3D asset generation

---

**End of PRD - Generator Module**

---

