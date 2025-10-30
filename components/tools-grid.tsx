import { BarChart3, Rocket, Monitor, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const tools = [
  {
    title: "Dashboards",
    description: "Access comprehensive analytics and insights with our sales and statistics dashboards.",
    icon: BarChart3,
    href: "/dashboards",
    features: ["Sales Analytics", "Statistics Overview", "Real-time Data"],
  },
  {
    title: "Generator",
    description: "Generate stunning images and videos using AI models. Create product images, menus for signage, and videos with ease.",
    icon: Sparkles,
    href: "/generator/admin",
    features: ["AI Image Generation", "Free Tier Access", "Video Generation"],
  },
  {
    title: "Signage",
    description: "Manage and configure digital signage displays across your organization with ease.",
    icon: Monitor,
    href: "/signage",
    features: ["Content Management", "Display Setup", "Remote Control"],
  },
]

export function ToolsGrid() {
  return (
    <section className="container mx-auto max-w-7xl px-4 pb-20">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Card
              key={tool.title}
              className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur transition-all hover:border-white/20 hover:shadow-lg hover:shadow-white/5"
            >
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white transition-all group-hover:bg-white group-hover:text-black">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl">{tool.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2">
                  {tool.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full">
                  <Link href={tool.href}>Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
