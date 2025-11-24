

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
      { href: '/pos', icon: Coins, label: 'Punto de Venta (POS)' },
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive && "bg-muted text-primary"
                )}
                >
                <item.icon className="h-5 w-5" />
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
                <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
                <nav className="grid gap-6 text-lg font-medium">
                    <Link
                        href="#"
                        className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                        >
                        <BurgerIcon className="h-5 w-5 transition-all group-hover:scale-110" />
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
            className="overflow-hidden rounded-full"
          >
             <Avatar>
                <AvatarImage src={user?.photoURL ?? undefined} alt="@shadcn" />
                <AvatarFallback>
                    <UserCircle className="h-5 w-5" />
                </AvatarFallback>
             </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user?.email ?? 'Mi Cuenta'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
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
