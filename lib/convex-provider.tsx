"use client";

import { ConvexProvider as BaseConvexProvider } from "convex/react";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

// During build time, allow missing URL but warn
if (!convexUrl && typeof window === "undefined") {
  console.warn(
    "NEXT_PUBLIC_CONVEX_URL is not set. This is required for runtime. " +
    "Set it in your environment variables for deployment."
  );
}

// For build time, use a dummy URL if not available
// This will be replaced at runtime with the actual URL
const convex = convexUrl
  ? new ConvexReactClient(convexUrl)
  : new ConvexReactClient("https://placeholder.convex.cloud");

export function ConvexProvider({ children }: { children: ReactNode }) {
  // Validate URL at runtime (client-side)
  if (typeof window !== "undefined" && !convexUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_CONVEX_URL. " +
      "Please set this environment variable in your deployment settings."
    );
  }

  return <BaseConvexProvider client={convex}>{children}</BaseConvexProvider>;
}
