"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, ImageIcon, LayoutDashboard, LogOut, User, Target, Users } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "@/lib/auth"
import { Button } from "./ui/button"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Target },
  { name: "Audiences", href: "/audiences", icon: Users },
  { name: "Creative", href: "/assets", icon: ImageIcon },
  { name: "Reporting", href: "/reporting", icon: BarChart3 },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <nav className="bg-card border-r border-border w-64 min-h-screen p-6 flex flex-col">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">biddable.</h1>
          <p className="text-sm text-muted-foreground mt-1">run your own ads.</p>
        </div>
        <ThemeToggle />
      </div>

      <ul className="space-y-2 flex-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            </li>
          )
        })}
      </ul>

      {user && (
        <div className="mt-auto pt-4 border-t border-border space-y-3">
          <Link
            href="/profile"
            className="flex items-center space-x-3 px-4 py-2 hover:bg-muted transition-colors rounded-md cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
            </div>
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      )}
    </nav>
  )
}
