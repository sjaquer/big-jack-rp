"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  Maximize2,
  LogOut,
  Moon,
  RotateCcw,
  Sun,
  UserCircle,
  Users,
} from "lucide-react"
import { signOut } from "firebase/auth"

import { AnalyticsIcon, BurgerIcon, CashRegisterIcon, GrillIcon, InventoryCrateIcon, OrderTicketIcon } from "@/components/icons"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth, useUser } from "@/firebase"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { clearDemoMode, useDemoMode } from "@/lib/demo-mode"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Panel", shortLabel: "Panel", description: "Resumen" },
  { href: "/insights", icon: AnalyticsIcon, label: "Datos", shortLabel: "Datos", description: "KPIs" },
  { href: "/cash-flow", icon: CashRegisterIcon, label: "Caja", shortLabel: "Caja", description: "Flujo" },
  { href: "/pos", icon: GrillIcon, label: "POS", shortLabel: "POS", description: "Venta" },
  { href: "/customers", icon: Users, label: "Clientes", shortLabel: "Clientes", description: "Perfil" },
  { href: "/products", icon: BurgerIcon, label: "Productos", shortLabel: "Productos", description: "Catálogo" },
  { href: "/inventory", icon: InventoryCrateIcon, label: "Stock", shortLabel: "Stock", description: "Existencias" },
  { href: "/incoming-orders", icon: OrderTicketIcon, label: "Pedidos", shortLabel: "Pedidos", description: "Cola" },
]

function UserMenu() {
  const { user } = useUser()
  const auth = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const isDemo = useDemoMode()

  const handleSignOut = () => {
    if (isDemo) {
      clearDemoMode()
      router.push("/login")
      return
    }

    signOut(auth).then(() => {
      router.push("/login")
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 overflow-hidden rounded-full touch-manipulation sm:h-9 sm:w-9 lg:h-11 lg:w-11"
        >
          <Avatar className="h-9 w-9 sm:h-8 sm:w-8 lg:h-10 lg:w-10">
            <AvatarImage src={user?.photoURL ?? undefined} alt="Cuenta" />
            <AvatarFallback>
              <UserCircle className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-base">
          {isDemo ? (
            <span className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-amber-500" />
              Modo Demo
            </span>
          ) : (
            user?.email ?? "Mi Cuenta"
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="cursor-pointer py-3 text-base"
        >
          {theme === "dark" ? <Sun className="mr-2 h-5 w-5" /> : <Moon className="mr-2 h-5 w-5" />}
          <span>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>
        </DropdownMenuItem>
        {isDemo && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new Event("restart-tour"))}
              className="cursor-pointer py-3 text-base"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              <span>Reiniciar Tour</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer py-3 text-base">
          <LogOut className="mr-2 h-5 w-5" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ModuleDock() {
  const pathname = usePathname()

  return (
    <nav className="hidden border-b border-border/70 bg-card/80 backdrop-blur-xl lg:block">
      <div className="erp-page py-3">
        <div className="grid grid-cols-4 gap-2 xl:grid-cols-8">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex min-h-[76px] items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all duration-150",
                  "hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-24px_rgba(15,23,42,0.45)]",
                  isActive
                    ? "border-primary/30 bg-primary/10 text-primary shadow-[0_16px_38px_-24px_rgba(59,130,246,0.65)]"
                    : "border-border/70 bg-background/70 text-foreground hover:border-primary/20 hover:bg-background"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                    isActive ? "border-primary/20 bg-primary/15 text-primary" : "border-border/60 bg-muted/40 text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold leading-tight">{item.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{item.description}</span>
                </span>
                <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform", isActive && "translate-x-0.5")} />
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}

function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_26px_-18px_rgba(2,6,23,0.5)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 lg:hidden">
      <div className="sm:hidden h-16 overflow-x-auto px-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-shrink-0 min-w-[68px] rounded-xl px-2 py-1.5 text-center transition-all active:scale-95",
                  isActive ? "bg-primary/12 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:bg-muted hover:text-primary"
                )}
              >
                <item.icon className={cn("mx-auto h-5 w-5", isActive && "fill-current")} />
                <span className={cn("mt-1 block text-[9px] font-medium leading-tight", isActive && "font-bold")}>{item.shortLabel}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="hidden h-14 grid-cols-8 gap-1 px-2 sm:grid">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg transition-all touch-manipulation",
                isActive ? "bg-primary/12 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-[10px] font-medium leading-none">{item.shortLabel}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function MainNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isDemo = useDemoMode()
  const [isFocusMode, setIsFocusMode] = React.useState(false)

  React.useEffect(() => {
    const syncFocusMode = () => {
      setIsFocusMode(Boolean(document.fullscreenElement))
    }

    document.addEventListener("fullscreenchange", syncFocusMode)

    return () => {
      document.removeEventListener("fullscreenchange", syncFocusMode)
    }
  }, [])

  const toggleFocusMode = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch (error) {
      console.error("[ERP] No se pudo cambiar el modo enfoque", error)
    }
  }

  return (
    <div className={cn("flex min-h-[100dvh] w-full flex-col text-foreground bg-transparent")}>
      {isDemo && (
        <div className="flex items-center justify-center gap-2 bg-amber-400/95 py-1.5 text-center text-sm font-semibold text-amber-950" id="demo-mode-indicator">
          <FlaskConical className="h-4 w-4" />
          <span>Modo Demostración - Datos de ejemplo para portafolio</span>
        </div>
      )}

      <header className={cn("sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl", isFocusMode && "hidden")}>
        <div className="erp-page flex items-center gap-3 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BurgerIcon className="h-6 w-6 text-primary" />
            <div className="leading-tight">
              <span className="block font-headline text-sm font-semibold tracking-tight sm:text-base">POS BIG JACK</span>
              <span className="block text-[11px] text-muted-foreground">Panel operativo</span>
            </div>
          </Link>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Link href="/pos">
              <Button variant="secondary" size="sm" className="gap-2 rounded-full px-4">
                <GrillIcon className="h-4 w-4" />
                POS
              </Button>
            </Link>
            <Link href="/incoming-orders">
              <Button variant="outline" size="sm" className="gap-2 rounded-full px-4">
                <OrderTicketIcon className="h-4 w-4" />
                Pedidos
              </Button>
            </Link>
            <UserMenu />
          </div>

          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <Link href="/pos">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <GrillIcon className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/incoming-orders">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <OrderTicketIcon className="h-4 w-4" />
              </Button>
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <div className={cn("border-b border-border/60 bg-background/70 backdrop-blur-xl", isFocusMode && "hidden")}>
        <div className="erp-page flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Modo enfoque</p>
            <p className="text-sm text-muted-foreground">Oculta la navegación para centrarte en la pantalla actual.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full px-4"
            onClick={toggleFocusMode}
          >
            <Maximize2 className="h-4 w-4" />
            Activar
          </Button>
        </div>
      </div>

      {!isFocusMode && <ModuleDock />}

      <main className={cn(
        "flex-1",
        isFocusMode
          ? "overflow-hidden p-0"
          : "overflow-auto p-2 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:p-3 sm:pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:p-0 lg:pb-6"
      )}>
        {children}
      </main>

      {!isFocusMode && <MobileBottomNav />}

      {isFocusMode && (
        <div className="fixed right-4 top-4 z-[60]">
          <Button
            variant="secondary"
            size="sm"
            className="gap-2 rounded-full px-4 shadow-lg"
            onClick={toggleFocusMode}
          >
            <Maximize2 className="h-4 w-4 rotate-45" />
            Salir del enfoque
          </Button>
        </div>
      )}
    </div>
  )
}
