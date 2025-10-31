"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Image, Package, Menu, Video, FolderOpen, Wand2, FolderPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
    { name: "Dashboard", href: "/generator/admin", icon: LayoutDashboard },
    { name: "Free Image", href: "/generator/admin/free-image", icon: Image },
    { name: "Image Editor", href: "/generator/admin/image-editor", icon: Wand2 },
    { name: "Product Image", href: "/generator/admin/product-image", icon: Package },
    { name: "Menu Generator", href: "/generator/admin/menu", icon: Menu },
    { name: "Video Generator", href: "/generator/admin/video", icon: Video },
    { name: "Gallery", href: "/generator/admin/gallery", icon: FolderOpen },
    { name: "Collections", href: "/generator/admin/collections", icon: FolderPlus },
];

interface GeneratorNavProps {
    isOpen?: boolean;
    onToggle?: () => void;
}

export function GeneratorNav({ isOpen, onToggle }: GeneratorNavProps) {
    const pathname = usePathname();

    return (
        <nav className={cn(
            "grid gap-1 px-2",
            "md:block",
            isOpen ? "block" : "hidden"
        )}>
            {onToggle && (
                <div className="flex items-center justify-between mb-2 md:hidden">
                    <span className="text-sm font-semibold">Navigation</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggle}
                        className="h-8 w-8"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
            {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => {
                            // Close sidebar on mobile when link is clicked
                            if (onToggle && typeof window !== "undefined" && window.innerWidth < 768) {
                                onToggle();
                            }
                        }}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.name}
                    </Link>
                );
            })}
        </nav>
    );
}
