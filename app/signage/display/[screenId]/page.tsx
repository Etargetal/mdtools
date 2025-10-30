"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import Image from "next/image";

interface DisplayPageProps {
  params: Promise<{
    screenId: string;
  }>;
}

export default function DisplayPage({ params }: DisplayPageProps) {
  const [screenId, setScreenId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    params.then((p) => setScreenId(p.screenId));
  }, [params]);

  const displayData = useQuery(
    api.queries.getScreenForDisplay,
    screenId ? { screenId } : "skip"
  );

  // Auto-refresh based on refresh interval
  useEffect(() => {
    if (!displayData?.screen) return;

    const interval = displayData.screen.layoutConfig.refreshInterval * 1000; // Convert to ms
    const timer = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, interval);

    return () => clearInterval(timer);
  }, [displayData?.screen?.layoutConfig.refreshInterval]);

  // Hide cursor after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      document.body.style.cursor = "default";
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        document.body.style.cursor = "none";
      }, 5000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    timeout = setTimeout(() => {
      document.body.style.cursor = "none";
    }, 5000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  if (!screenId) {
    return <LoadingScreen />;
  }

  if (displayData === undefined) {
    return <LoadingScreen />;
  }

  if (displayData === null) {
    return <NotFoundScreen screenId={screenId} />;
  }

  const { screen, location, template, products } = displayData;

  return (
    <DisplayContent
      screen={screen}
      location={location}
      template={template}
      products={products}
      refreshKey={refreshKey}
    />
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function NotFoundScreen({ screenId }: { screenId: string }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Screen Not Found</h1>
        <p className="text-xl text-gray-400">Screen ID: {screenId}</p>
        <p className="text-gray-500 mt-4">
          This screen is not configured or is inactive.
        </p>
      </div>
    </div>
  );
}

function DisplayContent({
  screen,
  location,
  template,
  products,
  refreshKey,
}: {
  screen: any;
  location: any;
  template: any;
  products: any[];
  refreshKey: number;
}) {
  const orientation = screen.layoutConfig.orientation;
  const branding = location.branding;

  // Determine background
  const backgroundImage =
    screen.mode === "dynamic" && screen.dynamicConfig?.backgroundImage
      ? screen.dynamicConfig.backgroundImage
      : branding.backgroundImage;

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${
        orientation === "portrait" ? "portrait" : "landscape"
      }`}
      style={{
        fontFamily: branding.font || "Inter, sans-serif",
        backgroundColor: branding.primaryColor,
      }}
      onContextMenu={(e) => e.preventDefault()}
      onSelectStart={(e) => e.preventDefault()}
    >
      {/* Background Image */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 h-full w-full">
        {screen.mode === "dynamic" ? (
          <DynamicDisplay
            screen={screen}
            location={location}
            template={template}
            products={products}
            key={refreshKey}
          />
        ) : (
          <StaticDisplay screen={screen} />
        )}
      </div>
    </div>
  );
}

function DynamicDisplay({
  screen,
  location,
  template,
  products,
}: {
  screen: any;
  location: any;
  template: any;
  products: any[];
}) {
  const branding = location.branding;

  if (!template) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-2xl mb-2">Template not found</p>
          <p className="text-gray-300">Please configure a template for this screen.</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-2xl mb-2">No products configured</p>
          <p className="text-gray-300">
            Please add products to this screen in the admin panel.
          </p>
        </div>
      </div>
    );
  }

  // Render based on template layout type
  switch (template.layoutType) {
    case "grid":
      return (
        <GridLayout
          products={products}
          template={template}
          branding={branding}
        />
      );
    case "list":
      return (
        <ListLayout
          products={products}
          template={template}
          branding={branding}
        />
      );
    case "featured":
      return (
        <FeaturedLayout
          products={products}
          template={template}
          branding={branding}
        />
      );
    case "columns":
      return (
        <ColumnsLayout
          products={products}
          template={template}
          branding={branding}
        />
      );
    default:
      return <GridLayout products={products} template={template} branding={branding} />;
  }
}

function GridLayout({
  products,
  template,
  branding,
}: {
  products: any[];
  template: any;
  branding: any;
}) {
  const columns = template.columns || 3;
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns] || "grid-cols-3";

  return (
    <div className="h-full w-full p-8 overflow-auto">
      <div className={`grid ${gridCols} gap-6 max-w-7xl mx-auto`}>
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            showImage={template.showImages}
            showPrice={template.showPrices}
            branding={branding}
          />
        ))}
      </div>
    </div>
  );
}

function ListLayout({
  products,
  template,
  branding,
}: {
  products: any[];
  template: any;
  branding: any;
}) {
  return (
    <div className="h-full w-full p-8 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {products.map((product) => (
          <div
            key={product._id}
            className="flex items-center gap-6 p-6 rounded-lg"
            style={{
              backgroundColor: branding.secondaryColor + "20",
            }}
          >
            {template.showImages && product.image && (
              <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                <ProductImage imageId={product.image} alt={product.name} />
              </div>
            )}
            <div className="flex-1">
              <h3
                className="text-2xl font-bold mb-2"
                style={{ color: branding.secondaryColor }}
              >
                {product.name}
              </h3>
              {product.description && (
                <p className="text-gray-300 mb-2">{product.description}</p>
              )}
              {template.showPrices && (
                <p className="text-xl font-semibold" style={{ color: branding.secondaryColor }}>
                  {product.price} {product.currency}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedLayout({
  products,
  template,
  branding,
}: {
  products: any[];
  template: any;
  branding: any;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, 5000); // Rotate every 5 seconds

    return () => clearInterval(interval);
  }, [products.length]);

  const currentProduct = products[currentIndex];

  if (!currentProduct) return null;

  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="max-w-4xl text-center">
        {template.showImages && currentProduct.image && (
          <div className="mb-8">
            <div className="w-full max-w-2xl mx-auto aspect-square rounded-lg overflow-hidden">
              <ProductImage imageId={currentProduct.image} alt={currentProduct.name} />
            </div>
          </div>
        )}
        <h2
          className="text-5xl font-bold mb-4"
          style={{ color: branding.secondaryColor }}
        >
          {currentProduct.name}
        </h2>
        {currentProduct.description && (
          <p className="text-2xl text-gray-300 mb-6">{currentProduct.description}</p>
        )}
        {template.showPrices && (
          <p className="text-4xl font-bold" style={{ color: branding.secondaryColor }}>
            {currentProduct.price} {currentProduct.currency}
          </p>
        )}
        {products.length > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {products.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-white"
                    : "bg-gray-500"
                }`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to product ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ColumnsLayout({
  products,
  template,
  branding,
}: {
  products: any[];
  template: any;
  branding: any;
}) {
  const config = (template.config as any) || {};
  const numberOfColumns = config.numberOfColumns || 3;
  const showHeader = config.showHeader || false;
  const headerLogo = config.headerLogo;
  const columnColors = config.columnColors || ["#FF8C00", "#FFD700"];
  const showSeparators = config.showColumnSeparators !== false;
  const separatorColor = config.separatorColor || "#000000";
  const columnPadding = config.columnPadding || 16;
  const textColor = config.textColor || "#000000";
  const priceColor = config.priceColor || "#000000";
  const imagePosition = config.imagePosition || "bottom";

  // Get logo URL if available
  const looksLikeStorageId = headerLogo && /^k[a-zA-Z0-9]+$/.test(headerLogo);
  const storageUrl = useQuery(
    api.files.getStorageUrl,
    looksLikeStorageId ? ({ storageId: headerLogo as Id<"_storage"> } as any) : "skip"
  );
  const logoUrl = looksLikeStorageId ? storageUrl : headerLogo;

  // Distribute products across columns (vertically)
  // Each column gets products in round-robin fashion
  const columns: any[][] = Array.from({ length: numberOfColumns }, () => []);
  products.forEach((product, index) => {
    columns[index % numberOfColumns].push(product);
  });

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header with Logo */}
      {showHeader && logoUrl && (
        <div className="flex-shrink-0 flex items-center justify-center p-8" style={{ backgroundColor: branding.primaryColor }}>
          <img src={logoUrl} alt="Logo" className="max-h-32 object-contain" />
        </div>
      )}

      {/* Columns Container */}
      <div className="flex-1 flex" style={{ height: showHeader ? "calc(100% - 200px)" : "100%" }}>
        {columns.map((columnProducts, columnIndex) => {
          const columnColor = columnColors[columnIndex % columnColors.length] || columnColors[0];
          
          return (
            <div
              key={columnIndex}
              className="flex-1 flex flex-col"
              style={{
                backgroundColor: columnColor,
                borderRight: showSeparators && columnIndex < numberOfColumns - 1
                  ? `2px solid ${separatorColor}`
                  : "none",
              }}
            >
              {columnProducts.map((product) => (
                <div
                  key={product._id}
                  className="flex-1 flex flex-col"
                  style={{ padding: `${columnPadding}px` }}
                >
                  {/* Image at top if configured */}
                  {template.showImages && imagePosition === "top" && product.image && (
                    <div className="flex-1 relative mb-4" style={{ minHeight: "200px" }}>
                      <ProductImage imageId={product.image} alt={product.name} />
                    </div>
                  )}

                  {/* Product Title */}
                  <h3
                    className="text-3xl font-bold mb-2"
                    style={{ color: textColor }}
                  >
                    {product.name}
                  </h3>

                  {/* Description */}
                  {product.description && (
                    <p
                      className="text-lg mb-4"
                      style={{ color: textColor }}
                    >
                      {product.description}
                    </p>
                  )}

                  {/* Price */}
                  {template.showPrices && (
                    <p
                      className="text-2xl font-bold mb-4"
                      style={{ color: priceColor }}
                    >
                      {product.price},-
                    </p>
                  )}

                  {/* Image at bottom if configured */}
                  {template.showImages && imagePosition === "bottom" && product.image && (
                    <div className="flex-1 relative mt-auto" style={{ minHeight: "200px" }}>
                      <ProductImage imageId={product.image} alt={product.name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductCard({
  product,
  showImage,
  showPrice,
  branding,
}: {
  product: any;
  showImage: boolean;
  showPrice: boolean;
  branding: any;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden transition-transform hover:scale-105"
      style={{
        backgroundColor: branding.secondaryColor + "30",
        border: `2px solid ${branding.secondaryColor}`,
      }}
    >
      {showImage && product.image && (
        <div className="w-full aspect-square bg-gray-800 relative">
          <ProductImage imageId={product.image} alt={product.name} />
        </div>
      )}
      <div className="p-4">
        <h3
          className="text-xl font-bold mb-2"
          style={{ color: branding.secondaryColor }}
        >
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-gray-300 mb-2 line-clamp-2">
            {product.description}
          </p>
        )}
        {showPrice && (
          <p className="text-lg font-semibold" style={{ color: branding.secondaryColor }}>
            {product.price} {product.currency}
          </p>
        )}
      </div>
    </div>
  );
}

function StaticDisplay({ screen }: { screen: any }) {
  const imageUrl = screen.staticConfig?.imageUrl;

  if (!imageUrl) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-2xl mb-2">No image configured</p>
          <p className="text-gray-300">
            Please configure a static image for this screen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center p-4">
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={imageUrl}
          alt="Static display"
          className="max-w-full max-h-full object-contain"
          style={{ imageRendering: "high-quality" }}
        />
      </div>
    </div>
  );
}

function ProductImage({ imageId, alt }: { imageId: string; alt: string }) {
  // Check if it looks like a storage ID (Convex storage IDs typically start with 'k')
  const looksLikeStorageId = imageId && /^k[a-zA-Z0-9]+$/.test(imageId);
  
  const storageUrl = useQuery(
    api.files.getStorageUrl,
    looksLikeStorageId ? ({ storageId: imageId as Id<"_storage"> } as any) : "skip"
  );

  const imageUrl = looksLikeStorageId ? storageUrl : imageId;

  if (!imageUrl) {
    return (
      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
        <span className="text-gray-400">No image</span>
      </div>
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      className="object-cover"
      unoptimized
      priority
    />
  );
}
