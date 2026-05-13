'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Product } from '@/lib/types';
import { useState, useEffect, useRef } from 'react';
import { Search, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuickSearchProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  addToOrder: (product: Product) => void;
  initialQuery?: string;
}

export function QuickSearch({ 
  isOpen, 
  onClose, 
  products, 
  addToOrder,
  initialQuery = ''
}: QuickSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrar productos por nombre o categoría
  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(query.toLowerCase()))
  ).slice(0, 8); // Solo mostrar los 8 primeros para mantener la rapidez

  // Resetear y enfocar cuando se abre
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSelectedIndex(0);
      // Timeout pequeño para asegurar que el DOM del modal esté listo
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        addToOrder(filtered[selectedIndex]);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border-primary/20 shadow-2xl bg-background/95 backdrop-blur-md">
        <div className="flex items-center border-b px-4 h-16 bg-muted/20">
          <Search className="h-6 w-6 text-primary mr-3 animate-pulse" />
          <Input 
            ref={inputRef}
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="¿Qué producto buscas? (Enter para añadir)..."
            className="border-0 focus-visible:ring-0 text-xl font-medium h-full w-full bg-transparent p-0 placeholder:text-muted-foreground/50"
          />
          <div className="hidden sm:flex items-center gap-1 ml-2">
             <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
               <span className="text-xs">↑↓</span> Navegar
             </kbd>
          </div>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-none">
          {filtered.map((product, idx) => (
            <button
              key={product.id}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-150 group ${
                idx === selectedIndex 
                ? 'bg-primary text-primary-foreground shadow-lg scale-[1.01] z-10' 
                : 'hover:bg-muted/50 border border-transparent'
              }`}
              onClick={() => {
                addToOrder(product);
                onClose();
              }}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div className="flex flex-col items-start min-w-0 flex-1 mr-4">
                <div className="flex items-center gap-2 max-w-full">
                  <span className="font-bold text-lg truncate uppercase tracking-tight">{product.name}</span>
                  {idx === selectedIndex && (
                     <Badge variant="outline" className="bg-white/20 text-white border-0 text-[10px] py-0">SELECCIONADO</Badge>
                  )}
                </div>
                <span className={`text-xs flex items-center gap-1 ${idx === selectedIndex ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  <Hash className="h-3 w-3" />
                  {product.category || 'Otros'}
                </span>
              </div>
              
              <div className="flex flex-col items-end">
                <span className="font-black text-2xl tabular-nums tracking-tighter">
                  S/ {(product.salePrice ?? 0).toFixed(2)}
                </span>
                {idx === selectedIndex && (
                  <span className="text-[10px] font-bold opacity-80">PRESIONA ENTER</span>
                )}
              </div>
            </button>
          ))}
          
          {filtered.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No encontramos "{query}"</p>
              <p className="text-xs text-muted-foreground/60">Prueba con otro nombre o revisa el catálogo</p>
            </div>
          )}
        </div>

        <div className="p-3 bg-muted/40 border-t flex justify-between items-center text-[10px] uppercase tracking-[0.15em] font-black text-muted-foreground/60">
           <div className="flex items-center gap-3">
             <span className="flex items-center gap-1"><span className="text-primary">●</span> ESC para salir</span>
             <span className="flex items-center gap-1"><span className="text-primary">●</span> ENTER para elegir</span>
           </div>
           <span>Big Jack RP POS</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
