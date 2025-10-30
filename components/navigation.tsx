"use client"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export function Navigation() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-center px-4">
        <div className="flex items-center gap-8 lg:gap-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white">
              <span className="text-lg font-bold text-black">T</span>
            </div>
            <span className="text-xl font-semibold">Tools</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-base">
                  Dashboards
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/dashboards/sales" className="cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">Sales</div>
                      <div className="text-xs text-muted-foreground">View sales metrics and analytics</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboards/statistics" className="cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">Statistics</div>
                      <div className="text-xs text-muted-foreground">Comprehensive data insights</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-base">
                  Product Launch
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuItem asChild>
                  <Link href="/product-launch/generator" className="cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">Product Picture Generator</div>
                      <div className="text-xs text-muted-foreground">Generate product images with AI</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/product-launch/free-generator" className="cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">Free Generator</div>
                      <div className="text-xs text-muted-foreground">Free tier image generation</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-base">
                  Signage
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/signage/manage" className="cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">Manage Signage</div>
                      <div className="text-xs text-muted-foreground">Edit and update signage content</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/signage/setup" className="cursor-pointer">
                    <div className="flex flex-col gap-1">
                      <div className="font-medium">Setup Signage</div>
                      <div className="text-xs text-muted-foreground">Configure new signage displays</div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  )
}
