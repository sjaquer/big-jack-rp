'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface LiveClockProps {
  shiftStart?: number; // Hora de inicio del turno (default 18 = 6PM)
  shiftEnd?: number; // Hora de fin del turno (default 2 = 2AM, equivalente a cierre 1:59AM)
  className?: string;
}

export function LiveClock({ shiftStart = 18, shiftEnd = 2, className }: LiveClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  
  // Determinar si estamos en horario de turno
  const isInShift = currentHour >= shiftStart || currentHour < shiftEnd;
  
  // Calcular horas transcurridas en el turno
  const getShiftProgress = () => {
    if (!isInShift) return { hoursWorked: 0, hoursRemaining: 0, progress: 0 };
    
    const totalShiftHours = (24 - shiftStart) + shiftEnd;
    let hoursWorked = 0;
    
    if (currentHour >= shiftStart) {
      // Estamos entre 6PM y 11:59PM
      hoursWorked = currentHour - shiftStart + (currentTime.getMinutes() / 60);
    } else {
      // Estamos entre 12AM y 1:59AM
      hoursWorked = (24 - shiftStart) + currentHour + (currentTime.getMinutes() / 60);
    }
    
    const hoursRemaining = Math.max(0, totalShiftHours - hoursWorked);
    const progress = (hoursWorked / totalShiftHours) * 100;
    
    return { hoursWorked, hoursRemaining, progress };
  };

  const shiftProgress = getShiftProgress();

  // Determinar el estado del turno para el color
  const getShiftStatus = () => {
    if (!isInShift) return 'outside';
    if (shiftProgress.progress < 25) return 'starting';
    if (shiftProgress.progress < 75) return 'active';
    return 'ending';
  };

  const shiftStatus = getShiftStatus();

  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 px-2.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-border/70 bg-card",
      className
    )}>
      {/* Reloj principal */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "p-1.5 sm:p-2 rounded-full",
          isInShift ? "bg-primary/10" : "bg-muted"
        )}>
          <Clock className={cn(
            "h-5 w-5",
            isInShift ? "text-primary animate-pulse" : "text-muted-foreground"
          )} />
        </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold font-mono tabular-nums leading-none">
            {format(currentTime, 'HH:mm:ss')}
          </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground capitalize truncate">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: es })}
          </p>
        </div>
      </div>

      {/* Separador */}
        <div className="hidden sm:block h-10 w-px bg-border/80" />

      {/* Estado del turno */}
        <div className="flex-1 min-w-0 w-full">
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className={cn(
            "text-[11px] sm:text-xs font-semibold",
            isInShift ? "text-primary" : "text-muted-foreground"
          )}>
            {isInShift ? '🟢 En turno' : '⚪ Fuera de turno'}
          </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
            Turno: 6:00 PM - 1:00 AM
          </span>
        </div>
        
        {isInShift ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {shiftProgress.hoursWorked.toFixed(1)}h trabajadas
              </span>
              <span className="font-medium">
                {shiftProgress.hoursRemaining.toFixed(1)}h restantes
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  shiftStatus === 'starting' && "bg-blue-500",
                  shiftStatus === 'active' && "bg-primary",
                  shiftStatus === 'ending' && "bg-amber-500"
                )}
                style={{ width: `${Math.min(shiftProgress.progress, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            El próximo turno comienza a las 6:00 PM
          </p>
        )}
      </div>

      {/* Indicador de fase del turno */}
      {isInShift && (
        <>
          <div className="hidden sm:block h-10 w-px bg-border" />
          <div className="hidden sm:block text-center shrink-0 min-w-[58px]">
            <p className={cn(
              "text-lg font-bold",
              shiftStatus === 'starting' && "text-blue-500",
              shiftStatus === 'active' && "text-primary",
              shiftStatus === 'ending' && "text-amber-500"
            )}>
              {shiftProgress.progress.toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              {shiftStatus === 'starting' && 'Iniciando'}
              {shiftStatus === 'active' && 'En curso'}
              {shiftStatus === 'ending' && 'Finalizando'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
