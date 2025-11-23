import * as React from 'react';

import { MainNav } from '@/components/main-nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <MainNav>
        {children}
      </MainNav>
    </div>
  );
}
