"use client"

import { useState } from "react"
import { BarChart3, Rocket, Monitor, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const navigationItems = [
  {
    title: "Dashboards",
    icon: BarChart3,
    submenus: [
      { label: "Sales Dashboard", href: "/dashboards/sales" },
      { label: "Statistics Dashboard", href: "/dashboards/statistics" },
    ],
  },
  {
    title: "Product Launch",
    icon: Rocket,
    submenus: [
      { label: "AI Image Generator", href: "/product-launch/ai-generator" },
      { label: "Free Tier", href: "/product-launch/free-tier" },
    ],
  },
  {
    title: "Signage",
    icon: Monitor,
    submenus: [
      { label: "Signage Setup", href: "/signage/setup" },
      { label: "Signage Config", href: "/signage/config" },
    ],
  },
]

export function NavigationHub() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const toggleMenu = (title: string) => {
    setOpenMenu(openMenu === title ? null : title)
  }

  return (
    <section className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center px-4">
      <div className="grid w-full gap-6 md:grid-cols-3">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isOpen = openMenu === item.title

          return (
            <div key={item.title} className="relative">
              <Button
                onClick={() => toggleMenu(item.title)}
                className="group h-auto w-full flex-col gap-4 border border-border/50 bg-card/50 p-8 backdrop-blur transition-all hover:border-white/20 hover:bg-card/70 hover:shadow-lg hover:shadow-white/5"
                variant="outline"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-white transition-all group-hover:bg-white group-hover:text-black">
                  <Icon className="h-8 w-8" />
                </div>
                <span className="text-xl font-semibold">{item.title}</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </Button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border/50 bg-card/95 backdrop-blur-xl">
                  {item.submenus.map((submenu) => (
                    <Link
                      key={submenu.href}
                      href={submenu.href}
                      className="block border-b border-border/30 px-6 py-4 text-center transition-colors last:border-b-0 hover:bg-white/5"
                    >
                      {submenu.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
