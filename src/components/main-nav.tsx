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

function UniversalBottomNav() {
  const pathname = usePathname();
  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Panel' },
    { href: '/cash-flow', icon: Wallet, label: 'Caja' },
    { href: '/pos', icon: Coins, label: 'POS' },
    { href: '/customers', icon: Users, label: 'Clientes' },
    { href: '/products', icon: BurgerIcon, label: 'Productos' },
    { href: '/inventory', icon: Warehouse, label: 'Inventario' },
    { href: '/incoming-orders', icon: Package, label: 'Pedidos' },
    { href: '/cash-prediction', icon: BrainCircuit, label: 'Predicción' },
  ];

  return (
    <nav className="flex-none h-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 overflow-x-auto">
      <div className="flex items-center h-full px-2 gap-2 min-w-max mx-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg min-w-[72px] touch-manipulation transition-all active:scale-95",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "text-muted-foreground hover:text-primary hover:bg-muted"
              )}
            >
              <item.icon className={cn("h-6 w-6", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium leading-tight text-center line-clamp-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MainNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <header className="flex-none h-14 flex items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BurgerIcon className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Big Jack</span>
        </Link>
        <div className="ml-auto">
          <UserMenu />
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden p-2 md:p-4">
        {children}
      </main>
      <UniversalBottomNav />
    </div>
  );
}
