import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { CafeteriaService } from '../../services/cafeteria.service';

interface RouteInfo {
  title: string;
  subtitle: string;
  icon: string;
}

const ROUTE_INFO_MAP: Record<string, RouteInfo> = {
  '/app': {
    title: 'Monitoreo de Confirmaciones',
    subtitle: 'Control de asistencia, despacho rapido y entregas en tiempo real',
    icon: 'how_to_reg'
  },
  '/entregas': {
    title: 'Registro de Raciones Entregadas',
    subtitle: 'Auditoria en tiempo real con hora exacta de entrega',
    icon: 'task_alt'
  },
  '/beneficiarios': {
    title: 'Padron de Beneficiarios',
    subtitle: 'Base maestra de estudiantes con subsidio alimentario activo',
    icon: 'badge'
  },
  '/formularios': {
    title: 'Gestion de Formularios Web',
    subtitle: 'Control de apertura, horarios y respuestas de formularios',
    icon: 'dynamic_form'
  },
  '/config': {
    title: 'Configuracion del Sistema',
    subtitle: 'Ajustes generales y parametros de operacion',
    icon: 'settings'
  }
};

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  host: {
    class: 'sticky top-0 z-40 block w-full'
  },
  template: `
    <header class="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
      <!-- Left: Mobile Menu Toggle & Page Identity -->
      <div class="flex items-center gap-3 sm:gap-4 min-w-0">
        <!-- Hamburger (mobile only) -->
        <button
          type="button"
          (click)="onMenuToggle()"
          class="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Abrir navegación"
        >
          <mat-icon [style.fontSize.px]="24">menu</mat-icon>
        </button>

        <!-- Current View Icon -->
        <div class="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
          <mat-icon [style.fontSize.px]="24">{{ currentInfo().icon }}</mat-icon>
        </div>

        <!-- Title & Subtitle -->
        <div class="flex flex-col min-w-0">
          <h1 class="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight truncate leading-tight">
            {{ currentInfo().title }}
          </h1>
          <p class="text-sm text-slate-500 truncate hidden sm:block">
            {{ currentInfo().subtitle }}
          </p>
        </div>
      </div>

      <!-- Right: Clock & Status -->
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <!-- Live Date & Clock -->
        <div class="hidden sm:flex items-center gap-2 bg-slate-100 rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-600 border border-slate-200">
          <mat-icon class="text-slate-400">schedule</mat-icon>
          <span>{{ currentDateFormatted() }} · {{ currentTime() }}</span>
        </div>

        <!-- Online/Offline Status -->
        @if (cafeteriaService.isOnline()) {
          <div 
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
            title="Conexión en tiempo real con Supabase activa"
          >
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="hidden md:inline">En Línea</span>
          </div>
        } @else {
          <div 
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm font-semibold bg-amber-50 text-amber-800 border border-amber-300"
            title="Modo Offline: Las entregas se guardan en el dispositivo"
          >
            <mat-icon class="text-amber-600">cloud_off</mat-icon>
            <span>Offline</span>
          </div>
        }

        <!-- Pending Sync Badge -->
        @if (cafeteriaService.pendingSyncCount() > 0) {
          <button 
            (click)="cafeteriaService.sincronizarCola()"
            [disabled]="cafeteriaService.isSyncing() || !cafeteriaService.isOnline()"
            class="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors border border-blue-300"
            title="Haz clic para sincronizar entregas pendientes"
          >
            <mat-icon [class.animate-spin]="cafeteriaService.isSyncing()" class="text-sm">sync</mat-icon>
            <span>{{ cafeteriaService.pendingSyncCount() }} pendientes</span>
          </button>
        }
      </div>
    </header>
  `
})
export class Header implements OnInit, OnDestroy {
  readonly cafeteriaService = inject(CafeteriaService);
  private router = inject(Router);

  currentTime = signal<string>('');
  currentDateFormatted = signal<string>('');
  currentUrl = signal<string>('/app');
  private timeInterval: ReturnType<typeof setInterval> | null = null;

  readonly currentInfo = computed<RouteInfo>(() => {
    const url = this.currentUrl();
    for (const [route, info] of Object.entries(ROUTE_INFO_MAP)) {
      if (route === '/app' && url === '/app') return info;
      if (route !== '/app' && url.startsWith(route)) return info;
    }
    return {
      title: 'Cafeteria Guarincito',
      subtitle: 'Sistema de Control de Subsidiados',
      icon: 'restaurant'
    };
  });

  ngOnInit(): void {
    this.updateClock();
    this.timeInterval = setInterval(() => this.updateClock(), 1000);

    this.currentUrl.set(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      });
  }

  ngOnDestroy(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    this.currentDateFormatted.set(now.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }));
  }

  onMenuToggle(): void {
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  }
}
