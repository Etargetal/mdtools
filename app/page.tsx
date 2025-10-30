import { Navigation } from "@/components/navigation"
import { NavigationHub } from "@/components/navigation-hub"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <NavigationHub />
      </main>
    </div>
  )
}
