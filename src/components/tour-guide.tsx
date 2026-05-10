'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useDemoMode } from '@/lib/demo-mode';
import { cn } from '@/lib/utils';
import {
    X, ChevronRight, ChevronLeft,
    LayoutDashboard, Sparkles, Wallet, Coins, Users,
    Package, Warehouse, ShoppingBag, PartyPopper,
} from 'lucide-react';
import { BurgerIcon } from '@/components/icons';

type TourStep = {
    targetId: string;
    title: string;
    description: string;
    icon?: React.ReactNode;
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    path: string;
    action?: () => void;
};

// ==================== PASOS DEL TOUR (cubre todas las páginas) ====================
const TOUR_STEPS: TourStep[] = [
    // --- DASHBOARD ---
    {
        targetId: 'dashboard-header',
        title: 'Bienvenido a POS BIG JACK',
        description:
            'Este es tu centro de control. Desde aquí gestionas ventas, productos, clientes e inventario de tu negocio de comida rápida. Te daremos un recorrido por todas las secciones. ¡Vamos!',
        icon: <PartyPopper className="h-5 w-5 text-amber-500" />,
        position: 'center',
        path: '/dashboard',
    },
    {
        targetId: 'stats-cards',
        title: 'Panel Principal — Dashboard',
        description:
            'Aquí ves las métricas en tiempo real: ventas del día, comparativa con ayer, pedidos, ticket promedio y el detalle de ventas por hora, categoría, método de pago y canal de venta.',
        icon: <LayoutDashboard className="h-5 w-5" />,
        position: 'bottom',
        path: '/dashboard',
    },
    // --- INSIGHTS ---
    {
        targetId: 'nav-insights',
        title: 'Insights — Análisis Avanzado',
        description:
            'La sección de Insights te muestra KPIs históricos, tendencias de 90 días, productos más vendidos, análisis de horarios pico y rendimiento por cada día de la semana. Ideal para tomar decisiones estratégicas.',
        icon: <Sparkles className="h-5 w-5 text-violet-500" />,
        position: 'right',
        path: '/dashboard',
        action: () => { document.getElementById('nav-insights')?.click(); },
    },
    // --- CASH FLOW ---
    {
        targetId: 'nav-cash-flow',
        title: 'Caja — Flujo de Efectivo',
        description:
            'Registra ingresos y gastos diarios, controla el balance de caja por turno y visualiza el historial financiero. Cada movimiento queda registrado con categoría, método de pago y notas.',
        icon: <Wallet className="h-5 w-5 text-green-600" />,
        position: 'right',
        path: '/insights',
        action: () => { document.getElementById('nav-cash-flow')?.click(); },
    },
    // --- POS ---
    {
        targetId: 'nav-pos',
        title: 'Punto de Venta (POS)',
        description:
            'Desde el POS puedes crear ventas rápidamente: selecciona productos del catálogo, ajusta cantidades, aplica descuentos, elige método de pago (efectivo, Yape, Plin, tarjeta) y genera el ticket. Todo en pocos clics.',
        icon: <Coins className="h-5 w-5 text-amber-600" />,
        position: 'right',
        path: '/cash-flow',
        action: () => { document.getElementById('nav-pos')?.click(); },
    },
    {
        targetId: 'pos-products',
        title: 'Catálogo del POS',
        description:
            'El catálogo se organiza por categorías (hamburguesas, combos, bebidas, acompañamientos, etc.). Toca un producto para añadirlo al carrito. A la derecha verás la orden actual con el total y botón de cobrar.',
        icon: <ShoppingBag className="h-5 w-5 text-orange-500" />,
        position: 'center',
        path: '/pos',
    },
    // --- PRODUCTS ---
    {
        targetId: 'nav-products',
        title: 'Gestión de Productos',
        description:
            'Administra tu carta completa: crea, edita y elimina productos. Cada producto tiene SKU, precio de venta, categoría, foto, ingredientes asociados (para control de stock automático) y su stock producible.',
        icon: <BurgerIcon className="h-5 w-5 text-red-500" />,
        position: 'right',
        path: '/pos',
        action: () => { document.getElementById('nav-products')?.click(); },
    },
    // --- INVENTORY ---
    {
        targetId: 'nav-inventory',
        title: 'Inventario — Ingredientes y Suministros',
        description:
            'Controla tres tipos de inventario: ingredientes de cocina (con stock mínimo y alertas), productos terminados y artículos descartables (vasos, bolsas, servilletas). Actualiza stock rápidamente con el botón de edición rápida.',
        icon: <Warehouse className="h-5 w-5 text-cyan-600" />,
        position: 'right',
        path: '/products',
        action: () => { document.getElementById('nav-inventory')?.click(); },
    },
    // --- CUSTOMERS ---
    {
        targetId: 'nav-customers',
        title: 'Clientes — Fidelización',
        description:
            'Gestiona tu base de clientes con datos de contacto, alergias, preferencias y programa de fidelidad. Cada cliente acumula puntos de lealtad y puedes ver su historial de visitas y gasto total.',
        icon: <Users className="h-5 w-5 text-blue-500" />,
        position: 'right',
        path: '/inventory',
        action: () => { document.getElementById('nav-customers')?.click(); },
    },
    // --- INCOMING ORDERS ---
    {
        targetId: 'nav-orders',
        title: 'Pedidos — Vista de Cocina',
        description:
            'La pantalla de pedidos funciona como tablet de cocina: los pedidos llegan con estado "Nuevo", pasan a "En Preparación" y finalmente se marcan como "Listos". Incluye pedidos del POS, delivery y apps externas.',
        icon: <Package className="h-5 w-5 text-indigo-500" />,
        position: 'right',
        path: '/customers',
        action: () => { document.getElementById('nav-orders')?.click(); },
    },
    // --- FINAL ---
    {
        targetId: 'demo-mode-indicator',
        title: '¡Tour Completado! 🎉',
        description:
            'Ya conoces todas las secciones de POS BIG JACK. Estas en modo demo con datos de ejemplo. Explora libremente cada pagina. Para salir del modo demo, cierra sesion desde el menu superior.',
        icon: <PartyPopper className="h-5 w-5 text-amber-500" />,
        position: 'center',
        path: '/incoming-orders',
    },
];

export function TourGuide() {
    const isDemo = useDemoMode();
    const [currentStepIndex, setCurrentStepIndex] = useState(-1);
    const [isVisible, setIsVisible] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    // Auto-start tour for new demo users
    useEffect(() => {
        if (isDemo) {
            const hasSeenTour = localStorage.getItem('big-jack-tour-completed');
            if (!hasSeenTour) {
                setCurrentStepIndex(0);
                setIsVisible(true);
            }
        } else {
            setIsVisible(false);
            setCurrentStepIndex(-1);
        }
    }, [isDemo]);

    // Navigate when step requires a different page
    useEffect(() => {
        if (!isVisible || currentStepIndex < 0) return;

        const step = TOUR_STEPS[currentStepIndex];
        if (step && step.path !== pathname) {
            router.push(step.path);
        }
    }, [currentStepIndex, isVisible, pathname, router]);

    const nextStep = useCallback(() => {
        const next = currentStepIndex + 1;
        if (next < TOUR_STEPS.length) {
            const step = TOUR_STEPS[next];
            if (step.action) {
                // Small delay to allow animation
                setTimeout(() => step.action!(), 50);
            }
            setCurrentStepIndex(next);
        } else {
            finishTour();
        }
    }, [currentStepIndex]);

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            const prevIdx = currentStepIndex - 1;
            const step = TOUR_STEPS[prevIdx];
            // Navigate to the correct page for the previous step
            if (step.path !== pathname) {
                router.push(step.path);
            }
            setCurrentStepIndex(prevIdx);
        }
    }, [currentStepIndex, pathname, router]);

    const finishTour = useCallback(() => {
        setIsVisible(false);
        localStorage.setItem('big-jack-tour-completed', 'true');
        setCurrentStepIndex(-1);
        // Navigate back to dashboard
        router.push('/dashboard');
    }, [router]);

    const skipTour = useCallback(() => {
        finishTour();
    }, [finishTour]);

    // Allow restarting tour from outside
    useEffect(() => {
        const handleRestart = () => {
            localStorage.removeItem('big-jack-tour-completed');
            setCurrentStepIndex(0);
            setIsVisible(true);
            router.push('/dashboard');
        };
        window.addEventListener('restart-tour', handleRestart);
        return () => window.removeEventListener('restart-tour', handleRestart);
    }, [router]);

    if (!isVisible || !isDemo || currentStepIndex < 0 || currentStepIndex >= TOUR_STEPS.length) return null;

    const step = TOUR_STEPS[currentStepIndex];
    const progress = ((currentStepIndex + 1) / TOUR_STEPS.length) * 100;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 pointer-events-auto flex items-center justify-center">
            <Card className="w-[400px] max-w-[90vw] shadow-2xl border-primary border-2 animate-in fade-in zoom-in slide-in-from-bottom-5 duration-300">
                {/* Progress bar */}
                <div className="h-1 bg-muted rounded-t-xl overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <CardHeader className="pb-3">
                    <CardTitle className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                            {step.icon}
                            <span className="text-base leading-tight">{step.title}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={skipTour} className="h-7 w-7 shrink-0 -mt-1 -mr-2">
                            <X className="h-4 w-4" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    {/* Step dots */}
                    <div className="mt-4 flex gap-1 justify-center flex-wrap">
                        {TOUR_STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    'h-1.5 rounded-full transition-all duration-300',
                                    idx === currentStepIndex
                                        ? 'bg-primary w-4'
                                        : idx < currentStepIndex
                                            ? 'bg-primary/40 w-1.5'
                                            : 'bg-muted w-1.5'
                                )}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                        Paso {currentStepIndex + 1} de {TOUR_STEPS.length}
                    </p>
                </CardContent>
                <CardFooter className="flex justify-between pt-0">
                    <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStepIndex === 0}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                    </Button>
                    <Button variant="ghost" size="sm" onClick={skipTour} className="text-muted-foreground">
                        Saltar tour
                    </Button>
                    <Button size="sm" onClick={nextStep}>
                        {currentStepIndex === TOUR_STEPS.length - 1 ? '¡Listo!' : 'Siguiente'} <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
