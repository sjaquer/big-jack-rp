"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  UserCircle,
  LogOut,
  Users,
  Moon,
  Sun,
  FlaskConical,
  RotateCcw,
} from "lucide-react"
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button"
import { AnalyticsIcon, BurgerIcon, CashRegisterIcon, GrillIcon, InventoryCrateIcon, OrderTicketIcon } from "@/components/icons"
import { useUser, useAuth } from "@/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"
import { useDemoMode, clearDemoMode } from "@/lib/demo-mode"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Panel General', shortLabel: 'Panel', id: 'nav-dashboard' },
  { href: '/insights', icon: AnalyticsIcon, label: 'Analítica', shortLabel: 'Insights', id: 'nav-insights' },
  { href: '/cash-flow', icon: CashRegisterIcon, label: 'Caja y Flujo', shortLabel: 'Caja', id: 'nav-cash-flow' },
  { href: '/pos', icon: GrillIcon, label: 'Punto de Venta', shortLabel: 'POS', id: 'nav-pos' },
  { href: '/customers', icon: Users, label: 'Clientes', shortLabel: 'Clientes', id: 'nav-customers' },
  { href: '/products', icon: BurgerIcon, label: 'Productos', shortLabel: 'Productos', id: 'nav-products' },
  { href: '/inventory', icon: InventoryCrateIcon, label: 'Inventario', shortLabel: 'Inventario', id: 'nav-inventory' },
  { href: '/incoming-orders', icon: OrderTicketIcon, label: 'Pedidos', shortLabel: 'Pedidos', id: 'nav-orders' },
];

function UserMenu() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isDemo = useDemoMode();

  const handleSignOut = () => {
    // Limpiar modo demo si está activo
    if (isDemo) {
      clearDemoMode();
      router.push('/login');
      return;
    }
    signOut(auth).then(() => {
      router.push('/login');
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="overflow-hidden rounded-full h-10 w-10 sm:h-9 sm:w-9 lg:h-11 lg:w-11 touch-manipulation"
        >
          <Avatar className="h-9 w-9 sm:h-8 sm:w-8 lg:h-10 lg:w-10">
            <AvatarImage src={user?.photoURL ?? undefined} alt="@shadcn" />
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
            user?.email ?? 'Mi Cuenta'
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="py-3 text-base cursor-pointer">
          {theme === 'dark' ? <Sun className="mr-2 h-5 w-5" /> : <Moon className="mr-2 h-5 w-5" />}
          <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
        </DropdownMenuItem>
        {isDemo && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new Event('restart-tour'))}
              className="py-3 text-base cursor-pointer"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              <span>Reiniciar Tour</span>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="py-3 text-base cursor-pointer">
          <LogOut className="mr-2 h-5 w-5" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="hidden lg:flex h-screen border-r border-border/70 bg-card/70 backdrop-blur-xl">
      <SidebarHeader className="border-b border-border/70 p-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3 flex flex-row items-center justify-between group-data-[collapsible=icon]:justify-center h-[68px]">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
          <BurgerIcon className="h-6 w-6 text-primary shrink-0" />
          <span className="font-headline font-semibold text-lg whitespace-nowrap tracking-tight">POS BIG JACK</span>
        </Link>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="p-3 group-data-[collapsible=icon]:p-2 erp-grid-glow">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} size="lg" id={item.id} className="h-auto min-h-[46px] px-2 py-1.5 rounded-xl group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center">
                      <Link href={item.href} className="flex w-full items-center gap-2.5 rounded-xl group-data-[collapsible=icon]:justify-center">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg border border-transparent transition-colors",
                          "group-data-[collapsible=icon]:h-9 group-data-[collapsible=icon]:w-9",
                          isActive ? "bg-primary/15 text-primary border-primary/20" : "text-muted-foreground"
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="truncate text-sm font-medium leading-tight group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <span className="text-xs uppercase tracking-[0.12em] font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">Cuenta</span>
          <UserMenu />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border/70 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_26px_-18px_rgba(2,6,23,0.5)]">
      <div className="sm:hidden h-16 px-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-1 min-w-max">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl min-w-[68px] touch-manipulation transition-all active:scale-95",
                  isActive
                    ? "text-primary bg-primary/12 ring-1 ring-primary/30"
                    : "text-muted-foreground hover:text-primary hover:bg-muted"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
                <span className={cn("text-[9px] font-medium leading-tight text-center line-clamp-1", isActive ? "font-bold" : "")}>{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="hidden sm:grid grid-cols-8 gap-1 px-2 h-14 items-center">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg transition-all touch-manipulation",
                isActive
                    ? "bg-primary/12 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-[10px] leading-none font-medium">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MainNav({ children }: { children: React.ReactNode }) {
  const isDemo = useDemoMode();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-[100dvh] w-full bg-background">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-[100dvh]">
          {/* Demo Mode Banner */}
          {isDemo && (
            <div className="bg-amber-400/95 text-amber-950 text-center py-1.5 text-sm font-semibold flex items-center justify-center gap-2" id="demo-mode-indicator">
              <FlaskConical className="h-4 w-4" />
              <span>Modo Demostración - Datos de ejemplo para portafolio</span>
            </div>
          )}

          {/* Mobile Header */}
          <header className="lg:hidden flex-none h-14 sm:h-12 flex items-center gap-2 border-b border-border/70 bg-card/90 backdrop-blur px-2.5 sm:px-4 z-40 sticky top-0">
            <Link href="/dashboard" className="flex items-center gap-2">
              <BurgerIcon className="h-6 w-6 text-primary" />
              <span className="font-headline font-semibold text-sm sm:text-sm tracking-tight">POS BIG JACK</span>
            </Link>

            <div className="ml-auto flex items-center gap-1">
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
          </header>

          <main className="flex-1 overflow-auto erp-grid-glow p-2 sm:p-3 lg:p-6 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-6">
            {children}
          </main>

          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
