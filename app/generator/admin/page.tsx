"use client";

import { GeneratorNav } from "@/components/generator-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Home, Image, Package, Menu, Video } from "lucide-react";
import Link from "next/link";

export default function GeneratorDashboard() {
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

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <CardTitle>Free Image Generation</CardTitle>
                                <CardDescription>Generate images using AI models</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-3xl font-bold">0</p>
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
                                        <p className="text-3xl font-bold">0</p>
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
                                        <p className="text-3xl font-bold">0</p>
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
                                        <p className="text-3xl font-bold">0</p>
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
                                        <p className="text-3xl font-bold">0</p>
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
                    </div>
                </main>
            </div>
        </div>
    );
}

