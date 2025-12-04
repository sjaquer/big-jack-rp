"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Coins,
  Warehouse,
  Package,
  BrainCircuit,
  UserCircle,
  LogOut,
  Users,
  Wallet,
} from "lucide-react"
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button"
import { BurgerIcon } from "@/components/icons"
import { useUser, useAuth } from "@/firebase";
import { useIsMobile } from "@/hooks/use-mobile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

function UserMenu() {
    const { user } = useUser();
    const auth = useAuth();
    const router = useRouter();

    const handleSignOut = () => {
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
            className="overflow-hidden rounded-full h-11 w-11 touch-manipulation"
          >
             <Avatar className="h-10 w-10">
                <AvatarImage src={user?.photoURL ?? undefined} alt="@shadcn" />
                <AvatarFallback>
                    <UserCircle className="h-6 w-6" />
                </AvatarFallback>
             </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-base">{user?.email ?? 'Mi Cuenta'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} className="py-3 text-base cursor-pointer">
            <LogOut className="mr-2 h-5 w-5" />
            <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
}

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Panel de Informes' },
    { href: '/cash-flow', icon: Wallet, label: 'Flujo de Caja' },
    { href: '/pos', icon: Coins, label: 'Punto de Venta (POS)' },
    { href: '/customers', icon: Users, label: 'Clientes' },
    { href: '/products', icon: BurgerIcon, label: 'Registro de Productos' },
    { href: '/inventory', icon: Warehouse, label: 'Gestión de Inventario' },
    { href: '/incoming-orders', icon: Package, label: 'Pedidos Entrantes' },
    { href: '/cash-prediction', icon: BrainCircuit, label: 'Predicción de Efectivo' },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <BurgerIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Big Jack</span>
                  <span className="truncate text-xs">Manager</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => {
             const isActive = pathname.startsWith(item.href);
             return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* Optional footer content */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function MobileBottomNav() {
  const pathname = usePathname();
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
    { href: '/pos', icon: Coins, label: 'POS' },
    { href: '/incoming-orders', icon: Package, label: 'Pedidos' },
    { href: '/products', icon: BurgerIcon, label: 'Productos' },
    { href: '/inventory', icon: Warehouse, label: 'Inventario' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="flex items-center justify-around h-20 px-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg min-w-[72px] touch-manipulation transition-all active:scale-95",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MainNav({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  // En móvil/tablet usamos bottom nav en vez de sidebar
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen pb-20">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BurgerIcon className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Big Jack</span>
          </Link>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 p-4">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  // En desktop usamos sidebar colapsable
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
          </div>
          <div className="ml-auto px-4">
             <UserMenu />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
