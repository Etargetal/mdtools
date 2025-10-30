"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Image, Package, Menu, Video, FolderOpen, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/generator/admin", icon: LayoutDashboard },
    { name: "Free Image", href: "/generator/admin/free-image", icon: Image },
    { name: "Image Editor", href: "/generator/admin/image-editor", icon: Wand2 },
    { name: "Product Image", href: "/generator/admin/product-image", icon: Package },
    { name: "Menu Generator", href: "/generator/admin/menu", icon: Menu },
    { name: "Video Generator", href: "/generator/admin/video", icon: Video },
    { name: "Gallery", href: "/generator/admin/gallery", icon: FolderOpen },
];

export function GeneratorNav() {
    const pathname = usePathname();

    return (
        <nav className="grid gap-1 px-2">
            {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            isActive
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                    </Link>
                );
            })}
        </nav>
    );
}

