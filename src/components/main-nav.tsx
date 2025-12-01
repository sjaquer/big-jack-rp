

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
  PanelLeft,
  UserCircle,
  LogOut,
  Users,
  Wallet,
} from "lucide-react"
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";


import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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


function NavItems() {
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
        <>
        {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
                <Link
                key={item.href}
                href={item.href}
                className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm sm:text-base font-medium text-muted-foreground transition-all hover:text-primary touch-manipulation active:scale-[0.98]",
                    isActive && "bg-muted text-primary shadow-sm"
                )}
                >
                <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                {item.label}
                </Link>
            )
        })}
        </>
    )
}

function MobileNav() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden h-11 w-11 touch-manipulation">
                <PanelLeft className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs w-[85vw]">
                <nav className="grid gap-3 text-lg font-medium">
                    <Link
                        href="/dashboard"
                        className="group flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base mb-4"
                        >
                        <BurgerIcon className="h-6 w-6 transition-all group-hover:scale-110" />
                        <span className="sr-only">Big Jack Manager</span>
                    </Link>
                    <NavItems />
                </nav>
            </SheetContent>
        </Sheet>
    )
}

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

export function MainNav({ children }: { children: React.ReactNode }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-headline text-lg font-semibold text-primary">
                <BurgerIcon className="h-7 w-7 text-primary" />
                <span>Big Jack Manager</span>
            </Link>
        </div>
        <nav className="flex flex-col gap-2 p-4 text-sm font-medium">
          <NavItems />
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <MobileNav />
            <div className="ml-auto">
                <UserMenu />
            </div>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </>
  );
}
