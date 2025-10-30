# Product Requirements Document (PRD)
## Digital Signage Management System - First Module

---

## Document Information

**Project Name:** Digital Signage Management System  
**Version:** 1.0  
**Created:** October 30, 2025  
**Status:** Planning Phase  
**Tech Stack:** Next.js, Convex, Raspberry Pi  
**Note:** Authentication will be handled at the application level, not within this module.

---

## Executive Summary

A cloud-based digital signage management system for managing and displaying content across multiple locations. The system supports two display modes: **Dynamic** (product-based menu generation) and **Static** (image display). Content is managed through a web-based admin interface and displayed on Raspberry Pi devices in kiosk mode.

---

## Problem Statement

Currently, updating digital signage content requires physical presence or complex remote desktop setups. The system needs a centralized, web-based solution to:

- Update product content and prices in real-time across multiple locations
- Display either dynamic product menus or static images on screens
- Support location-specific branding and custom backgrounds
- Reduce manual intervention for content updates
- Support multiple screens per location

---

## Target Users

1. **Admin Users** - Staff managing content, products, and screen configurations
2. **Display Screens** - Raspberry Pi devices running Chromium in kiosk mode
3. **End Customers** - Viewing the digital signage displays (indirect users)

---

## System Architecture

### High-Level Components

```
┌──────────────────────┐
│   Admin Portal       │ ← Staff manages content
│   /signage/admin     │
└──────────┬───────────┘
           │
      ┌────▼─────┐
      │  Convex  │ ← Central database & real-time sync
      │ Backend  │
      └────┬─────┘
           │
┌──────────▼──────────────────┐
│  Display Endpoints          │ ← Raspberry Pi screens
│  /signage/display/[screenId]│
└─────────────────────────────┘
```

### Tech Stack

- **Frontend/Backend:** Next.js 14+ (App Router)
- **Database/Backend:** Convex
- **Deployment:** Vercel
- **Display Hardware:** Raspberry Pi (Chromium kiosk mode)
- **Media Storage:** Convex file storage

---

## Data Model (Convex Schema)

### Tables

#### `locations`
```typescript
{
  _id: Id<"locations">,
  name: string,              // "FK Teplice Stadium"
  slug: string,              // "fk-teplice"
  branding: {
    primaryColor: string,    // "#FFDD00"
    secondaryColor: string,  // "#0066CC"
    logo?: string,           // URL or file ID
    font: string,           // "Inter", "Roboto"
    backgroundImage?: string, // URL or file ID for location background
  },
  status: "active" | "inactive",
  createdAt: number,
  updatedAt: number,
}
```

#### `products`
```typescript
{
  _id: Id<"products">,
  name: string,              // "Burger Classic"
  price: number,             // 150 (in CZK)
  currency: string,          // "CZK" (default)
  category?: string,         // "food" | "drinks" | "specials"
  description?: string,
  image?: string,            // URL or file ID
  status: "active" | "inactive",
  order: number,            // Display order
  createdAt: number,
  updatedAt: number,
}
```

#### `templates`
```typescript
{
  _id: Id<"templates">,
  name: string,              // "Grid 3 Columns"
  slug: string,              // "grid-3-columns"
  layoutType: "grid" | "list" | "featured",
  columns?: number,          // 2, 3, 4 (for grid layout)
  showPrices: boolean,
  showImages: boolean,
  config: object,            // Additional layout-specific config
  isDefault: boolean,        // Default template for auto-generated menus
  createdAt: number,
  updatedAt: number,
}
```

#### `screens`
```typescript
{
  _id: Id<"screens">,
  screenId: string,         // "teplice-main-left" (used in URL)
  name: string,              // "Teplice - Main Left Screen"
  locationId: Id<"locations">,
  mode: "dynamic" | "static",
  
  // Dynamic mode configuration
  dynamicConfig?: {
    productIds: Id<"products">[],  // Products to display
    templateId: Id<"templates">,   // Layout template to use
    backgroundImage?: string,       // Optional background image override
  },
  
  // Static mode configuration
  staticConfig?: {
    imageUrl: string,        // Static image URL or file ID
  },
  
  layoutConfig: {
    orientation: "landscape" | "portrait",
    refreshInterval: number, // seconds (default: 300)
  },
  
  status: "active" | "inactive" | "maintenance",
  createdAt: number,
  updatedAt: number,
}
```

#### `staticAssets`
```typescript
{
  _id: Id<"staticAssets">,
  name: string,
  fileUrl: string,           // Convex storage URL
  fileSize: number,
  mimeType: string,          // "image/jpeg", "image/png"
  createdAt: number,
}
```

---

## Feature Requirements

### 1. Admin Portal (`/signage/admin`)

#### 1.1 Dashboard
- [ ] Overview of all locations and active screens
- [ ] Quick stats (total products, active screens, locations)
- [ ] Quick actions (add product, create screen)
- [ ] List of screens grouped by location

#### 1.2 Location Management

**List View**
- [x] Display all locations with screen count
- [x] Filter by status
- [x] Search by name

**Create/Edit Location**
- [x] Name and slug
- [x] Branding configuration
  - [x] Primary color picker
  - [x] Secondary color picker
  - [ ] Logo upload (optional)
  - [x] Font selector
  - [ ] Background image upload (for location default background)
- [x] Status toggle

#### 1.3 Product Management (Dynamic Mode)

**Easy Interface - Quick Product Entry**
- [x] Simple form with:
  - [x] Product name (required)
  - [x] Price in CZK (required)
  - [x] Add button
- [x] Products automatically added to default template
- [x] List of recently added products
- [x] Quick edit/delete actions

**Advanced Interface - Full Product Management**
- [x] **List View**
  - [x] Display all products in sortable table
  - [x] Columns: Name, Price, Category, Status, Order
  - [x] Filter by category, status
  - [x] Search by name
  - [x] Bulk actions (delete, activate/deactivate)
  - [ ] Drag-and-drop reordering

- [x] **Create/Edit Product**
  - [x] Name (required)
  - [x] Price in CZK (required, positive number)
  - [x] Currency (default: CZK)
  - [x] Category dropdown (optional)
  - [x] Description (optional)
  - [x] Image upload (with preview, optional)
  - [x] Active/Inactive status
  - [x] Display order (drag-and-drop)

- [x] **Validation**
  - [x] Required fields: name, price
  - [x] Image size limits (max 5MB)
  - [x] Price must be positive number
  - [x] Image formats: JPG, PNG, WebP

#### 1.4 Template Management (Dynamic Mode)

**List View**
- [ ] All templates with preview
- [ ] Mark default template
- [ ] Clone template functionality

**Create/Edit Template**
- [ ] Template name and slug
- [ ] Layout type selector (grid, list, featured)
- [ ] Column count (2-4 for grid layout)
- [ ] Toggle: show prices, show images
- [ ] Additional layout-specific settings
- [ ] Live preview panel
- [ ] Set as default template

**Default Templates Included**
- [ ] Grid 2 Columns (default)
- [ ] Grid 3 Columns
- [ ] Grid 4 Columns
- [ ] List Layout
- [ ] Featured Layout (hero-style)

#### 1.5 Screen Management

**List View**
- [ ] All screens grouped by location
- [ ] Display mode indicator (Dynamic/Static)
- [ ] Status indicators (Active/Inactive/Maintenance)
- [ ] Quick actions (edit, preview, duplicate)

**Create/Edit Screen**
- [ ] Screen ID (URL slug, required, unique)
- [ ] Friendly name
- [ ] Location assignment (required)
- [ ] **Display Mode Selection**
  - [ ] Radio buttons: Dynamic or Static
  
- [ ] **Dynamic Mode Configuration** (shown when Dynamic selected)
  - [ ] Product selector (multi-select with search)
  - [ ] Template selector (dropdown)
  - [ ] Optional background image upload (overrides location default)
  
- [ ] **Static Mode Configuration** (shown when Static selected)
  - [ ] Image upload/selector
  - [ ] Image preview
  - [ ] Replace image option

- [ ] **General Settings**
  - [ ] Orientation (landscape/portrait)
  - [ ] Refresh interval (seconds, default: 300)
  - [ ] Status toggle

**Screen Preview**
- [ ] Live preview of screen as it appears on display
- [ ] Refresh button to reload preview
- [ ] Open preview in new window/tab
- [ ] Toggle between modes in preview

#### 1.6 Static Content Management (Static Mode)

**Gallery View**
- [ ] Grid of all uploaded static images
- [ ] Image previews
- [ ] Filter by upload date
- [ ] Search by name

**Upload**
- [ ] Drag-and-drop upload area
- [ ] Single file upload
- [ ] Supported formats: JPG, PNG, WebP
- [ ] File size limit: 10MB max
- [ ] Progress indicator
- [ ] Upload validation and error messages

**Asset Details**
- [ ] Full-size image preview
- [ ] Metadata (size, dimensions, upload date)
- [ ] Copy URL button
- [ ] Delete confirmation
- [ ] Usage indicator (which screens use this image)

---

### 2. Display Endpoint (`/signage/display/[screenId]`)

#### 2.1 Screen Rendering
- [ ] Fetch screen config from Convex by `screenId`
- [ ] Handle 404 for invalid screen IDs
- [ ] Apply location branding (colors, logo, fonts, background)
- [ ] Determine display mode (dynamic or static)
- [ ] Auto-scale to 1080p (or configured resolution)
- [ ] Fullscreen-optimized layout (no scroll, no controls)

#### 2.2 Dynamic Mode Rendering

**Template-Based Layout**
- [ ] **Grid Layout**
  - [ ] Responsive grid (2-4 columns based on template)
  - [ ] Product cards with image (if available), name, price
  - [ ] Cards respect location branding colors
  - [ ] Background image from location or screen override
  
- [ ] **List Layout**
  - [ ] Vertical list with larger product images
  - [ ] Description text support (if available)
  - [ ] Spacing and typography based on location branding
  
- [ ] **Featured Layout**
  - [ ] Hero-style large product displays
  - [ ] Rotating spotlight items
  - [ ] Background image support

**Product Display**
- [ ] Show product name prominently
- [ ] Display price in CZK format (e.g., "150 Kč")
- [ ] Show product image if available
- [ ] Fallback styling if image missing
- [ ] Respect display order

#### 2.3 Static Mode Rendering
- [ ] Display uploaded static image fullscreen
- [ ] Maintain aspect ratio
- [ ] Center image on screen
- [ ] Handle different orientations (landscape/portrait)
- [ ] Support image formats: JPG, PNG, WebP

#### 2.4 Real-Time Updates
- [ ] Subscribe to Convex reactive queries
- [ ] Automatically reflect changes when:
  - [ ] Product prices updated
  - [ ] Products added/removed from screen
  - [ ] Screen config changed (mode switch, template change)
  - [ ] Static image replaced
  - [ ] Location branding updated
- [ ] Smooth transitions (no jarring reloads)
- [ ] Refresh based on configured interval

#### 2.5 Display Optimizations
- [ ] Disable browser sleep/screensaver via JavaScript
- [ ] Prevent text selection
- [ ] Disable context menu (right-click)
- [ ] Hide cursor after inactivity (5 seconds)
- [ ] Optimized font loading
- [ ] Image lazy loading with priority hints
- [ ] Preload critical assets

#### 2.6 Offline Fallback
- [ ] Show cached content if connection lost
- [ ] Display "Connecting..." indicator (subtle)
- [ ] Retry logic with exponential backoff
- [ ] Resume display when connection restored

---

## Technical Specifications

### Next.js Configuration
- [x] Use App Router (Next.js 15+)
- [x] TypeScript strict mode
- [x] ESLint + Prettier setup
- [x] Tailwind CSS for styling
- [x] Shadcn/ui component library (optional)

### Convex Setup
- [x] Initialize Convex project
- [x] Define schema with typed IDs
- [x] Set up queries, mutations, actions
- [x] Enable file storage for images
- [ ] Real-time subscriptions for display updates

### Display Requirements
- [ ] Target resolution: 1920×1080 (1080p)
- [ ] Support for 4K displays (3840×2160)
- [ ] Orientation: Landscape (primary), Portrait (secondary)
- [ ] Refresh rate: Configurable (default 5 minutes)

### Raspberry Pi Setup
- [ ] Raspberry Pi 4 (4GB+ RAM recommended)
- [ ] Raspberry Pi OS Lite or Full
- [ ] Chromium in kiosk mode
- [ ] Auto-start on boot
- [ ] Disable screen blanking
- [ ] SSH access for remote management

### Performance Targets
- [ ] Admin page load: <2s
- [ ] Display page load: <3s
- [ ] Image optimization: WebP format preferred, max 500KB per product image
- [ ] Static image optimization: Max 10MB, automatic compression
- [ ] Database query latency: <100ms
- [ ] Real-time update latency: <500ms

---

## Development Phases

### Phase 1: Core MVP (First Module)

**Week 1-2: Foundation**
- [x] Set up Next.js project with App Router
- [x] Initialize Convex with schema
- [x] Create basic admin layout (`/signage/admin`)
- [x] Create basic display layout (`/signage/display/[screenId]`)

**Week 3-4: Location & Product Management**
- [x] Location CRUD operations
- [x] Product management (easy interface)
- [x] Product management (advanced interface)
- [x] Image upload functionality

**Week 5-6: Templates & Screens**
- [ ] Template management system
- [ ] Screen management (create/edit)
- [ ] Mode selection (Dynamic/Static)
- [ ] Static content upload/management

**Week 7-8: Display Rendering**
- [ ] Dynamic mode rendering with templates
- [ ] Static mode rendering
- [ ] Real-time updates via Convex subscriptions
- [ ] Display optimizations

**Week 9-10: Polish & Testing**
- [ ] Admin UI polish
- [ ] Display UI polish
- [ ] Testing on Raspberry Pi
- [ ] Bug fixes and performance optimization
- [ ] Documentation

---

## Success Criteria

- [ ] Admin can add a product with price in <10 seconds using easy interface
- [ ] Admin can switch a screen between Dynamic and Static modes
- [ ] Changes appear on screens within configured refresh interval (default 5 min)
- [ ] System supports minimum 10 concurrent screens
- [ ] Display pages load in <3 seconds
- [ ] Screens auto-recover from temporary network issues
- [ ] Multiple locations can have different branding and backgrounds

---

## Security Considerations

- [ ] HTTPS enforcement
- [ ] Input sanitization (XSS prevention)
- [ ] File upload validation (type, size)
- [ ] Rate limiting on API endpoints
- [ ] Environment variables for secrets
- [ ] Regular dependency updates
- [ ] Note: Authentication handled at application level

---

## Testing Requirements

- [ ] Unit tests for utilities and helpers
- [ ] Integration tests for Convex mutations
- [ ] E2E tests for critical admin flows:
  - [ ] Create location
  - [ ] Add product (easy interface)
  - [ ] Add product (advanced interface)
  - [ ] Create screen with Dynamic mode
  - [ ] Create screen with Static mode
  - [ ] Switch screen modes
- [ ] Visual regression tests for display layouts
- [ ] Raspberry Pi field testing
- [ ] Cross-browser testing (Chromium focus)

---

## Deployment Checklist

### Vercel (Next.js)
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Set up preview deployments
- [ ] Configure custom domain
- [ ] Enable Edge caching

### Convex
- [ ] Deploy production database
- [ ] Configure file storage
- [ ] Set up backups
- [ ] Monitor usage

### Raspberry Pi
- [ ] Document kiosk mode setup
- [ ] Create deployment script
- [ ] Test network recovery
- [ ] Document SSH access

---

## Documentation Requirements

- [ ] README with project overview and setup instructions
- [ ] Admin user guide (how to use admin interface)
- [ ] Display mode guide (Dynamic vs Static)
- [ ] Raspberry Pi setup guide
- [ ] Troubleshooting guide
- [ ] Code documentation (JSDoc/TSDoc comments)

---

## Future Enhancements (Post-First Module)

- [ ] Promo banners for Dynamic mode
- [ ] Video content support
- [ ] Health monitoring and ping system
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Advanced animations
- [ ] Scheduled content switching
- [ ] Mobile app for quick updates
- [ ] Inventory integration
- [ ] QR code ordering integration

---

**End of PRD - First Module**

---