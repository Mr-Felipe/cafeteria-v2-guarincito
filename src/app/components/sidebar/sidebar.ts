import { ChangeDetectionStrategy, Component, inject, signal, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CafeteriaService } from '../../services/cafeteria.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule],
  styles: [`
    .active-nav-link {
      background-color: #1e293b !important;
      color: #ffffff !important;
      font-weight: 600 !important;
      border-right: 4px solid #3b82f6 !important;
      border-radius: 0.5rem 0 0 0.5rem !important;
    }
    .active-nav-link mat-icon {
      color: #60a5fa !important;
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
    aside {
      overflow: hidden;
    }
  `],
  template: `
    <!-- Mobile Backdrop -->
    @if (mobileOpen()) {
      <button 
        type="button"
        aria-label="Cerrar navegación lateral"
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity border-0 p-0 w-full h-full cursor-pointer"
        (click)="closeMobileSidebar()"
      ></button>
    }

    <!-- Sidebar Container -->
    <aside 
      class="fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out text-slate-300"
      [class.w-72]="!collapsed() || mobileOpen()"
      [class.w-20]="collapsed() && !mobileOpen()"
      [class.-translate-x-full]="!mobileOpen()"
      [class.translate-x-0]="mobileOpen()"
      [class.lg:translate-x-0]="true"
    >
      <!-- Brand Header -->
      <div class="h-18 flex items-center px-5 justify-between border-b border-slate-800 shrink-0">
        <div class="flex items-center gap-3 overflow-hidden">
          <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm">
            <span class="font-black">A</span>
          </div>
          
          @if (!collapsed() || mobileOpen()) {
            <div class="flex flex-col min-w-0">
              <span class="font-bold text-white text-lg tracking-tight truncate">AlimentaCheck</span>
              <span class="text-xs font-medium text-slate-400 truncate">Cafetería Guarincito</span>
            </div>
          }
        </div>

        <!-- Desktop Collapse Button -->
        <button 
          type="button"
          (click)="toggleCollapse()"
          class="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          [title]="collapsed() ? 'Expandir menú' : 'Colapsar menú'"
        >
          <mat-icon class="text-xl">{{ collapsed() ? 'last_page' : 'first_page' }}</mat-icon>
        </button>

        <!-- Mobile Close Button -->
        <button 
          type="button"
          (click)="closeMobileSidebar()"
          class="flex lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
        >
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 overflow-y-auto py-4 px-3 space-y-5 custom-scrollbar">
        @if (!collapsed() || mobileOpen()) {
          <div class="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Módulos del Sistema
          </div>
        } @else {
          <div class="w-full h-px bg-slate-800 my-2"></div>
        }

        <nav class="space-y-1">
          @for (item of navItems; track item.route) {
            <a
              [routerLink]="item.route"
              (click)="onItemClick()"
              routerLinkActive="active-nav-link"
              [routerLinkActiveOptions]="{exact: item.route === '/confirmaciones'}"
              class="group relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors duration-150 cursor-pointer"
              [class.justify-center]="collapsed() && !mobileOpen()"
            >
              <mat-icon [style.fontSize.px]="24" class="shrink-0 transition-transform group-hover:scale-105">
                {{ item.icon }}
              </mat-icon>

              @if (!collapsed() || mobileOpen()) {
                <span class="truncate flex-1">{{ item.label }}</span>
                @if (item.badge) {
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0"
                    [class.bg-emerald-500/20]="item.badge === 'En Vivo'"
                    [class.text-emerald-300]="item.badge === 'En Vivo'"
                    [class.border]="true"
                    [class.border-emerald-400/30]="item.badge === 'En Vivo'"
                    [class.bg-blue-900/60]="item.badge !== 'En Vivo'"
                    [class.text-blue-300]="item.badge !== 'En Vivo'"
                    [class.border-blue-700/50]="item.badge !== 'En Vivo'"
                  >
                    @if (item.badge === 'En Vivo') {
                      <span class="flex items-center gap-1">
                        <span class="relative flex h-1.5 w-1.5">
                          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                        </span>
                        En Vivo
                      </span>
                    } @else {
                      {{ item.badge }}
                    }
                  </span>
                }
              }

              <!-- Floating Tooltip when Collapsed -->
              @if (collapsed() && !mobileOpen()) {
                <div class="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-950 text-white text-xs font-semibold rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-800">
                  {{ item.label }}
                </div>
              }
            </a>
          }
        </nav>
      </div>

      <!-- Footer / Live Sync Status -->
      <div class="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-0.5">
              <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              @if (!collapsed() || mobileOpen()) {
                <span class="truncate">{{ cafeteriaService.isOnline() ? 'Sincronizado en Vivo' : 'Modo Offline' }}</span>
              }
            </div>
            @if (!collapsed() || mobileOpen()) {
              <div class="text-[10px] text-slate-500 truncate">
                {{ cafeteriaService.isOnline() ? 'Conexión con Supabase activa' : 'Guardando en IndexedDB local' }}
              </div>
            }
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              (click)="limpiarCache()"
              title="Limpiar caché local y recargar"
              class="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <mat-icon class="text-sm">delete_sweep</mat-icon>
            </button>
            <button
              type="button"
              (click)="cafeteriaService.syncWithSupabase()"
              [disabled]="cafeteriaService.isSyncing()"
              title="Sincronizar con Supabase"
              class="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <mat-icon [class.animate-spin]="cafeteriaService.isSyncing()" class="text-sm">refresh</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </aside>
  `
})
export class Sidebar implements OnInit, OnDestroy {
  readonly cafeteriaService = inject(CafeteriaService);
  private router = inject(Router);

  readonly collapsed = signal<boolean>(false);
  readonly mobileOpen = signal<boolean>(false);
  closeMobile = output<void>();
  private routerSub?: ReturnType<typeof import('rxjs').Observable.prototype.subscribe>;

  ngOnInit(): void {
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.mobileOpen()) {
          this.mobileOpen.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  readonly navItems = [
    { label: 'Confirmaciones', route: '/confirmaciones', icon: 'how_to_reg', badge: 'Principal' },
    { label: 'Entregas del Dia', route: '/entregas', icon: 'task_alt' },
    { label: 'Beneficiarios', route: '/beneficiarios', icon: 'badge' },
    { label: 'Formularios', route: '/formularios', icon: 'dynamic_form' },
    { label: 'Configuracion', route: '/config', icon: 'settings' }
  ];

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
  }

  toggleMobile(): void {
    this.mobileOpen.update(v => !v);
  }

  closeMobileSidebar(): void {
    this.mobileOpen.set(false);
  }

  onItemClick(): void {
    this.mobileOpen.set(false);
  }

  async limpiarCache(): Promise<void> {
    if (confirm('¿Borrar toda la caché local? La app se recargará y volverá a sincronizar con Supabase.')) {
      await this.cafeteriaService.clearLocalCacheAndReload();
    }
  }
}
