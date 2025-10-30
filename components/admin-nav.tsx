"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MapPin, Package, Monitor, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/signage/admin", icon: LayoutDashboard },
    { name: "Locations", href: "/signage/admin/locations", icon: MapPin },
    { name: "Products", href: "/signage/admin/products", icon: Package },
    { name: "Screens", href: "/signage/admin/screens", icon: Monitor },
    { name: "Templates", href: "/signage/admin/templates", icon: Palette },
];

export function AdminNav() {
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

