"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  RefreshCw,
  BookOpen,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Activity,
  FileText,
  History,
} from "lucide-react"

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/compras", label: "Compras", icon: ShoppingBag },
  { href: "/cambios", label: "Cambios", icon: RefreshCw },
  { href: "/contabilidad", label: "Contabilidad", icon: BookOpen },
  { href: "/ingresos-egresos", label: "Ingresos/Egresos", icon: Wallet },
  { href: "/indicadores", label: "Indicadores", icon: Activity },
  { href: "/informes", label: "Informes", icon: FileText },
  { href: "/historial", label: "Historial", icon: History },
  { href: "/configuracion", label: "Configuración", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-black">
              <Image src="/images/logo-ownstyle.png" alt="OWNStyle Logo" width={40} height={40} className="object-cover" />
            </div>
            <span className="text-lg font-bold tracking-tight">OWNStyle</span>
          </Link>
        )}
        {collapsed && (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-black mx-auto">
            <Image src="/images/logo-ownstyle.png" alt="OWNStyle Logo" width={40} height={40} className="object-cover" />
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className={cn(
            "w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300",
            collapsed && "justify-center px-0",
          )}
          title={collapsed ? "Cerrar Sesión" : undefined}
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && (loggingOut ? "Saliendo..." : "Cerrar Sesión")}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" /> Colapsar
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
