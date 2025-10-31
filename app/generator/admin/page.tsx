"use client";

import { GeneratorNav } from "@/components/generator-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Home, Image, Package, Menu, Video, Loader2 } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Temporary userId - will be replaced with auth later
const TEMP_USER_ID = "user-1";

export default function GeneratorDashboard() {
    const stats = useQuery(api.queries.getDashboardStats, { userId: TEMP_USER_ID });
    const recentGenerations = useQuery(api.queries.getRecentGenerations, { userId: TEMP_USER_ID, limit: 8 });

    return (
        <div className="min-h-screen bg-background">
            <div className="border-b">
                <div className="flex h-16 items-center justify-between px-6">
                    <h1 className="text-2xl font-bold">AI Generator Admin</h1>
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
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold">Dashboard</h2>
                        <p className="text-muted-foreground mt-2">
                            Overview of your AI generation platform
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Free Image Generation</CardTitle>
                                <CardDescription>Generate images using AI models</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-3xl font-bold">
                                            {stats ? stats.freeImageCount : <Loader2 className="h-6 w-6 animate-spin inline" />}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Total generations</p>
                                    </div>
                                    <Link href="/generator/admin/free-image">
                                        <Button>
                                            <Image className="mr-2 h-4 w-4" />
                                            Generate
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Product Images</CardTitle>
                                <CardDescription>Create product images with style</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-3xl font-bold">
                                            {stats ? stats.productImageCount : <Loader2 className="h-6 w-6 animate-spin inline" />}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Product images</p>
                                    </div>
                                    <Link href="/generator/admin/product-image">
                                        <Button>
                                            <Package className="mr-2 h-4 w-4" />
                                            Generate
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Menu Generator</CardTitle>
                                <CardDescription>Generate menus for signage</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-3xl font-bold">
                                            {stats ? stats.menuCount : <Loader2 className="h-6 w-6 animate-spin inline" />}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Menus generated</p>
                                    </div>
                                    <Link href="/generator/admin/menu">
                                        <Button>
                                            <Menu className="mr-2 h-4 w-4" />
                                            Generate
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Video Generator</CardTitle>
                                <CardDescription>Create videos with AI</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-3xl font-bold">
                                            {stats ? stats.videoCount : <Loader2 className="h-6 w-6 animate-spin inline" />}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Videos generated</p>
                                    </div>
                                    <Link href="/generator/admin/video">
                                        <Button>
                                            <Video className="mr-2 h-4 w-4" />
                                            Generate
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Gallery</CardTitle>
                                <CardDescription>View all generated content</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-3xl font-bold">
                                            {stats ? stats.totalFiles : <Loader2 className="h-6 w-6 animate-spin inline" />}
                                        </p>
                                        <p className="text-sm text-muted-foreground">Total files</p>
                                    </div>
                                    <Link href="/generator/admin/gallery">
                                        <Button variant="outline">
                                            View Gallery
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Total Generations</CardTitle>
                                <CardDescription>All image and video generations</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-3xl font-bold">
                                            {stats ? stats.totalGenerations : <Loader2 className="h-6 w-6 animate-spin inline" />}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {stats ? `${stats.totalImageGenerations} images, ${stats.totalVideoGenerations} videos` : "Loading..."}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Generations Gallery */}
                    {recentGenerations && recentGenerations.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Generations</CardTitle>
                                <CardDescription>Your latest generated content</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {recentGenerations.map((gen) => {
                                        const firstFile = gen.files && gen.files.length > 0 ? gen.files[0] : null;
                                        const typeLabel = gen.generationType === "image" 
                                            ? (gen.type === "free" ? "Free Image" : gen.type === "product" ? "Product" : "Menu")
                                            : "Video";
                                        
                                        return (
                                            <Link
                                                key={gen._id}
                                                href={
                                                    gen.generationType === "image"
                                                        ? `/generator/admin/free-image`
                                                        : `/generator/admin/video`
                                                }
                                                className="group relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                                            >
                                                {firstFile ? (
                                                    <img
                                                        src={firstFile.fileUrl}
                                                        alt={gen.prompt}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                                        <div className="text-center p-4">
                                                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                                                            <p className="text-xs text-muted-foreground">Processing...</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-2">
                                                    <div className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <p className="font-medium truncate">{typeLabel}</p>
                                                        <p className="truncate">{gen.prompt}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    );
}

