
'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { BurgerIcon } from "@/components/icons";
import { setDemoMode } from "@/lib/demo-mode";
import { PlayCircle, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();

  const handleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setDemoMode(false);
      router.push("/dashboard");
    } catch (error: any) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  const handleDemoMode = () => {
    setDemoMode(true);
    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(245,126,66,0.20),transparent_32%),radial-gradient(circle_at_85%_90%,rgba(34,197,170,0.18),transparent_34%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="erp-surface hidden p-8 lg:block">
          <div className="mb-8 flex items-center gap-3 text-primary">
            <BurgerIcon className="h-8 w-8" />
            <p className="font-headline text-2xl font-bold tracking-tight">POS BIG JACK</p>
          </div>

          <h1 className="font-headline text-4xl font-semibold leading-tight text-foreground">
            Controla operaciones, ventas e inventario en tiempo real.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Plataforma profesional para gestionar tu negocio con una interfaz clara, moderna y orientada a decisiones.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Monitoreo</p>
              <p className="mt-1 text-lg font-semibold">Dashboard en vivo</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Flujo seguro</p>
              <p className="mt-1 text-lg font-semibold">Accesos autenticados</p>
            </div>
          </div>
        </div>

        <Card className="erp-surface border-primary/20">
          <CardHeader>
            <div className="mb-2 flex items-center justify-center gap-2 text-primary lg:hidden">
              <BurgerIcon className="h-7 w-7" />
              <span className="font-headline text-xl font-semibold tracking-tight">POS BIG JACK</span>
            </div>
            <CardTitle className="text-2xl font-headline">Iniciar Sesion</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al panel de administracion.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="h-12 text-base" placeholder="manager@posbigjack.com" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" className="h-12 text-base" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full h-12 text-base font-medium" onClick={handleSignIn} disabled={isLoading}>
              {isLoading ? 'Iniciando sesion...' : 'Iniciar sesion'}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O</span>
              </div>
            </div>
            <Button
              variant="outline"
              type="button"
              className="w-full h-12 text-base font-medium"
              onClick={handleDemoMode}
            >
              <PlayCircle className="mr-2 h-5 w-5 text-primary" />
              Explorar en Modo Demo
            </Button>

            <div className="rounded-xl border border-border/70 bg-secondary/50 p-3">
              <p className="flex items-center gap-2 text-xs font-medium text-secondary-foreground">
                <ShieldCheck className="h-4 w-4" />
                Sesion protegida con Firebase Auth
              </p>
            </div>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              El modo demo permite explorar funciones con datos de ejemplo.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
