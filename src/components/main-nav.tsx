"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Coins,
  Warehouse,
  Package,
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
  { href: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
  { href: '/cash-flow', icon: Wallet, label: 'Caja' },
  { href: '/pos', icon: Coins, label: 'POS' },
  { href: '/customers', icon: Users, label: 'Clientes' },
  { href: '/products', icon: BurgerIcon, label: 'Productos' },
  { href: '/inventory', icon: Warehouse, label: 'Inventario' },
  { href: '/incoming-orders', icon: Package, label: 'Pedidos' },
];

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

function AppSidebar() {
    const pathname = usePathname();
    
    return (
        <Sidebar collapsible="icon" className="hidden md:flex h-screen border-r bg-background">
            <SidebarHeader className="border-b p-4 flex flex-row items-center justify-between group-data-[collapsible=icon]:justify-center h-[60px]">
                 <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden group-data-[collapsible=icon]:hidden">
                    <BurgerIcon className="h-6 w-6 text-primary shrink-0" />
                    <span className="font-semibold text-lg whitespace-nowrap">Big Jack</span>
                </Link>
                <SidebarTrigger />
            </SidebarHeader>
            <SidebarContent className="p-2">
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} size="lg">
                                            <Link href={item.href} className="flex items-center gap-3">
                                                <item.icon className="h-5 w-5" />
                                                <span className="text-base font-medium group-data-[collapsible=icon]:hidden">{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                 <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
                     <span className="text-sm font-medium text-muted-foreground group-data-[collapsible=icon]:hidden">Cuenta</span>
                     <UserMenu /> 
                 </div>
            </SidebarFooter>
        </Sidebar>
    )
}

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden flex-none h-16 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 overflow-x-auto">
      <div className="flex items-center h-full px-4 gap-1 justify-between min-w-max mx-auto w-full">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-lg min-w-[64px] touch-manipulation transition-all active:scale-95",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className={cn("text-[10px] font-medium leading-tight text-center line-clamp-1", isActive ? "font-bold" : "")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MainNav({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
             {/* Mobile Header */}
             <header className="md:hidden flex-none h-14 flex items-center gap-4 border-b bg-background/95 backdrop-blur px-4 z-40">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <BurgerIcon className="h-6 w-6 text-primary" />
                  <span className="font-semibold text-lg">Big Jack</span>
                </Link>
                <div className="ml-auto">
                  <UserMenu />
                </div>
             </header>

            <main className="flex-1 overflow-auto p-2 md:p-6">
                {children}
            </main>

            <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}
