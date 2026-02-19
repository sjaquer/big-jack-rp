
'use client';
import * as React from 'react';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { MainNav } from '@/components/main-nav';
import { Loader2 } from 'lucide-react';
import { useDemoMode } from '@/lib/demo-mode';
import { TourGuide } from '@/components/tour-guide';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const isDemo = useDemoMode();

  React.useEffect(() => {
    if (!isUserLoading && !user && !isDemo) {
      router.push('/login');
    }
  }, [user, isUserLoading, router, isDemo]);

  if (isUserLoading || (!user && !isDemo)) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <MainNav>
      <TourGuide />
      {children}
    </MainNav>
  );
}
