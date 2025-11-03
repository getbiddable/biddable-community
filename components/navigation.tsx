"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BarChart3, ImageIcon, LayoutDashboard, LogOut, User, Target, Users, Menu, X } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { signOut } from "@/lib/auth"
import { Button } from "./ui/button"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Target },
  { name: "Audiences", href: "/audiences", icon: Users },
  { name: "Creative", href: "/assets", icon: ImageIcon },
  { name: "Reporting", href: "/reporting", icon: BarChart3, disabled: true },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-md"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-foreground" />
        ) : (
          <Menu className="h-6 w-6 text-foreground" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={closeMobileMenu}
        />
      )}

      {/* Navigation sidebar */}
      <nav className={`
        bg-card border-r border-border w-64 min-h-screen p-6 flex flex-col
        fixed md:static top-0 left-0 z-40 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
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
          const isDisabled = item.disabled

          if (isDisabled) {
            return (
              <li key={item.name}>
                <div
                  className="flex items-center px-4 py-3 text-sm font-medium text-muted-foreground/50 cursor-not-allowed"
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span className="flex-1">{item.name}</span>
                  <span className="text-xs italic">Coming Soon</span>
                </div>
              </li>
            )
          }

          return (
            <li key={item.name}>
              <Link
                href={item.href}
                onClick={closeMobileMenu}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors rounded-md ${
                  isActive || pathname?.startsWith(item.href) && item.href !== "/"
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
            onClick={closeMobileMenu}
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
    </>
  )
}
