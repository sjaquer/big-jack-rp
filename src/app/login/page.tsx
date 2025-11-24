
'use client'
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const auth = useAuth();

  const handleSignIn = async () => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
        <div className="w-full max-w-md space-y-4 text-center">
            <div className="flex justify-center items-center gap-2 font-headline text-2xl font-semibold text-primary mb-4">
                 <BurgerIcon className="h-8 w-8 text-primary" />
                <span>Big Jack Manager</span>
            </div>
            <Card>
                <CardHeader>
                <CardTitle className="text-2xl font-headline">Iniciar Sesión</CardTitle>
                <CardDescription>
                    Ingresa tus credenciales para acceder al panel de administración.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2 text-left">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="manager@bigjack.com" required value={email} onChange={e => setEmail(e.target.value)}/>
                </div>
                <div className="space-y-2 text-left">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                <Button type="submit" className="w-full" onClick={handleSignIn}>
                    Iniciar Sesión
                </Button>
                </CardContent>
            </Card>
             <div className="mt-4 text-center text-sm">
                ¿No tienes una cuenta?{" "}
                <Link href="/signup" className="underline">
                    Regístrate
                </Link>
            </div>
        </div>
    </div>
  )
}
