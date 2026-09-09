import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { CafeteriaService } from '../../services/cafeteria.service';
import { getVisualCarrera } from '../../models/cafeteria.models';

@Component({
  selector: 'app-entrega-rapida',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule, RouterLink],
  template: `
    <div class="space-y-6">
      <!-- HEADER -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            Despacho Rapido
          </span>
          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Entrega Rapida</h2>
          <p class="text-sm text-slate-600">Busca por codigo y marca entrega al instante</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <a routerLink="/confirmaciones" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
            <mat-icon class="text-base">how_to_reg</mat-icon><span>Confirmaciones</span>
          </a>
        </div>
      </div>

      <!-- LOADING DATA BANNER -->
      @if (cafeteriaService.isLoadingData()) {
        <div class="bg-amber-50 border border-amber-200 rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <mat-icon class="text-amber-500 animate-spin">sync</mat-icon>
          <div>
            <p class="text-sm font-bold text-amber-800">Cargando padrón y confirmaciones...</p>
            <p class="text-xs text-amber-600">Espera un momento antes de buscar.</p>
          </div>
        </div>
      }

      <!-- SEARCH BOX -->
      <div class="bg-white border-2 rounded-2xl shadow-sm p-6 sm:p-8 transition-colors"
        [class.border-slate-200]="!cafeteriaService.isLoadingData()"
        [class.border-amber-200]="cafeteriaService.isLoadingData()"
      >
        <div class="max-w-xl mx-auto">
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Codigo del Estudiante</label>
          <div class="relative">
            <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" [style.fontSize.px]="28">search</mat-icon>
            <input
              type="text"
              [(ngModel)]="searchCode"
              (ngModelChange)="onSearch($event)"
              placeholder="Escribe el codigo..."
              maxlength="6"
              inputmode="numeric"
              [disabled]="cafeteriaService.isLoadingData()"
              [attr.autofocus]="cafeteriaService.isLoadingData() ? null : ''"
              class="w-full pl-14 pr-14 py-4 text-2xl font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            @if (searchCode()) {
              <button type="button" (click)="clearSearch()" class="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                <mat-icon [style.fontSize.px]="24">close</mat-icon>
              </button>
            }
          </div>
          @if (cafeteriaService.isLoadingData()) {
            <p class="text-xs text-amber-600 mt-2 text-center">Busca una vez que se complete la carga</p>
          }
        </div>
      </div>

      <!-- SEARCH RESULT -->
      @if (searchResult()) {
        <div class="bg-white border rounded-2xl shadow-sm overflow-hidden transition-all"
          [class.border-emerald-200]="searchResult()!.type === 'confirmed'"
          [class.border-amber-200]="searchResult()!.type === 'extraño'"
          [class.border-slate-200]="searchResult()!.type === 'no_confirmacion'"
        >
          <!-- Result Header -->
          <div class="p-5 sm:p-6"
            [class.bg-emerald-50]="searchResult()!.type === 'confirmed'"
            [class.bg-amber-50]="searchResult()!.type === 'extraño'"
            [class.bg-slate-50]="searchResult()!.type === 'no_confirmacion'"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-4">
                <!-- Avatar -->
                <div class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                  [class.bg-emerald-100]="searchResult()!.type === 'confirmed'"
                  [class.bg-emerald-700]="searchResult()!.type === 'confirmed'"
                  [class.bg-amber-100]="searchResult()!.type === 'extraño'"
                  [class.bg-amber-700]="searchResult()!.type === 'extraño'"
                  [class.bg-slate-200]="searchResult()!.type === 'no_confirmacion'"
                  [class.text-white]="searchResult()!.type === 'confirmed' || searchResult()!.type === 'extraño'"
                  [class.text-slate-500]="searchResult()!.type === 'no_confirmacion'"
                >
                  @if (searchResult()!.type === 'confirmed') {
                    <mat-icon [style.fontSize.px]="32">verified</mat-icon>
                  } @else if (searchResult()!.type === 'extraño') {
                    <mat-icon [style.fontSize.px]="32">warning_amber</mat-icon>
                  } @else {
                    <mat-icon [style.fontSize.px]="32">person_off</mat-icon>
                  }
                </div>
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-mono text-sm font-bold"
                      [class.text-emerald-700]="searchResult()!.type === 'confirmed'"
                      [class.text-amber-700]="searchResult()!.type === 'extraño'"
                      [class.text-slate-700]="searchResult()!.type === 'no_confirmacion'"
                    >ID: {{ searchResult()!.codigo }}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      [class.bg-emerald-100]="searchResult()!.type === 'confirmed'"
                      [class.text-emerald-700]="searchResult()!.type === 'confirmed'"
                      [class.bg-amber-100]="searchResult()!.type === 'extraño'"
                      [class.text-amber-700]="searchResult()!.type === 'extraño'"
                      [class.bg-slate-100]="searchResult()!.type === 'no_confirmacion'"
                      [class.text-slate-600]="searchResult()!.type === 'no_confirmacion'"
                    >
                      {{ searchResult()!.type === 'confirmed' ? 'CONFIRMADO' : searchResult()!.type === 'extraño' ? 'EXTERNO' : 'SIN CONFIRMACION' }}
                    </span>
                  </div>
                  <h3 class="text-lg font-bold text-slate-900">{{ searchResult()!.nombre }}</h3>
                  <div class="flex items-center gap-2 mt-1">
                    @if (searchResult()!.carrera) {
                      @let v = getVisual(searchResult()!.carrera);
                      <span class="px-2 py-0.5 text-[10px] font-semibold rounded border flex items-center gap-1" [class]="v.badgeClass">
                        <mat-icon [style.fontSize.px]="16">{{ v.icono }}</mat-icon>
                        {{ searchResult()!.carrera }}
                      </span>
                    }
                    @if (searchResult()!.tipoComida) {
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        [class.bg-emerald-50]="searchResult()!.tipoComida === 'Almuerzo'"
                        [class.text-emerald-700]="searchResult()!.tipoComida === 'Almuerzo'"
                        [class.border]="true"
                        [class.border-emerald-200]="searchResult()!.tipoComida === 'Almuerzo'"
                        [class.bg-blue-50]="searchResult()!.tipoComida === 'Refrigerio'"
                        [class.text-blue-700]="searchResult()!.tipoComida === 'Refrigerio'"
                        [class.border-blue-200]="searchResult()!.tipoComida === 'Refrigerio'"
                        [class.bg-orange-50]="searchResult()!.tipoComida === 'Desayuno'"
                        [class.text-orange-700]="searchResult()!.tipoComida === 'Desayuno'"
                        [class.border-orange-200]="searchResult()!.tipoComida === 'Desayuno'"
                      >{{ searchResult()!.tipoComida }}</span>
                    }
                  </div>
                </div>
              </div>
              @if (searchResult()!.horaConfirmacion) {
                <span class="text-xs text-slate-400 font-mono shrink-0">{{ searchResult()!.horaConfirmacion }}</span>
              }
            </div>
          </div>

          <!-- Result Actions -->
          <div class="p-4 sm:p-5 border-t"
            [class.border-emerald-100]="searchResult()!.type === 'confirmed'"
            [class.border-amber-100]="searchResult()!.type === 'extraño'"
            [class.border-slate-100]="searchResult()!.type === 'no_confirmacion'"
          >
            @if (searchResult()!.alreadyDelivered) {
              <div class="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm">
                <mat-icon>check_circle</mat-icon>
                Ya fue entregado a las {{ searchResult()!.horaEntrega }}
              </div>
            } @else if (searchResult()!.type === 'confirmed' || searchResult()!.type === 'extraño') {
              <button
                type="button"
                (click)="markDelivery()"
                [disabled]="delivering()"
                class="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                [class.bg-emerald-600]="searchResult()!.type === 'confirmed'"
                [class.hover:bg-emerald-700]="searchResult()!.type === 'confirmed'"
                [class.text-white]="searchResult()!.type === 'confirmed'"
                [class.bg-amber-500]="searchResult()!.type === 'extraño'"
                [class.hover:bg-amber-600]="searchResult()!.type === 'extraño'"
                [class.text-white]="searchResult()!.type === 'extraño'"
              >
                @if (delivering()) {
                  <mat-icon class="animate-spin">refresh</mat-icon>
                  <span>Entregando...</span>
                } @else {
                  <mat-icon>check_circle</mat-icon>
                  <span>Marcar Entrega</span>
                }
              </button>
            } @else {
              <button
                type="button"
                (click)="markDelivery()"
                [disabled]="delivering()"
                class="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm bg-slate-600 hover:bg-slate-700 text-white"
              >
                @if (delivering()) {
                  <mat-icon class="animate-spin">refresh</mat-icon>
                  <span>Entregando...</span>
                } @else {
                  <mat-icon>add_circle</mat-icon>
                  <span>Entregar Sin Confirmar</span>
                }
              </button>
            }
          </div>
        </div>
      }

      <!-- KPIS -->
      <section class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Hoy Entregadas</div>
          <div class="text-2xl font-bold text-slate-900">{{ totalEntregadas() }}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Pendientes</div>
          <div class="text-2xl font-bold text-orange-600">{{ totalPendientes() }}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Confirmados</div>
          <div class="text-2xl font-bold text-blue-600">{{ totalConfirmados() }}</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">En Padron</div>
          @if (cafeteriaService.isLoadingData()) {
            <div class="text-2xl font-bold text-slate-300 animate-pulse">...</div>
          } @else {
            <div class="text-2xl font-bold text-slate-900">{{ cafeteriaService.beneficiarios().length }}</div>
          }
        </div>
      </section>

      <!-- ULTIMAS ENTREGAS -->
      <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <mat-icon class="text-slate-400">history</mat-icon>
            <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Ultimas Entregas</h3>
          </div>
          <span class="text-xs text-slate-400">{{ ultimasEntregas().length }} registros</span>
        </div>
        @if (ultimasEntregas().length === 0) {
          <div class="p-12 text-center text-slate-400">
            <mat-icon class="text-4xl text-slate-300 mb-2">inbox</mat-icon>
            <p class="text-sm font-medium">No hay entregas registradas hoy</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            @for (e of ultimasEntregas(); track e.id) {
              @let v = getVisual(e.carrera_nombre || '');
              <div class="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold" [class]="v.badgeClass">
                  <mat-icon [style.fontSize.px]="18">{{ v.icono }}</mat-icon>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-bold text-slate-700">{{ e.codigo_id }}</span>
                    <span class="text-sm font-semibold text-slate-900 truncate">{{ e.beneficiario_nombre }}</span>
                  </div>
                  <div class="text-xs text-slate-400">{{ e.carrera_nombre || 'Sin carrera' }}</div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-xs font-mono text-slate-500">{{ e.hora }}</div>
                  <div class="text-[10px] text-slate-400">{{ e.tipo_comida_nombre }}</div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class EntregaRapida {
  readonly cafeteriaService = inject(CafeteriaService);

  searchCode = signal<string>('');
  delivering = signal<boolean>(false);

  searchResult = signal<{
    codigo: string;
    nombre: string;
    carrera: string;
    tipoComida: string;
    type: 'confirmed' | 'extraño' | 'no_confirmacion';
    confirmacionId?: number;
    horaConfirmacion?: string;
    alreadyDelivered?: boolean;
    horaEntrega?: string;
  } | null>(null);

  readonly totalEntregadas = computed(() => {
    return this.cafeteriaService.entregas().filter(e => e.estado === 'ENTREGADO').length;
  });

  readonly totalConfirmados = computed(() => {
    return this.cafeteriaService.confirmaciones().filter(c => !c.entregado && c.es_beneficiario_valido && !c.motivo_alerta).length;
  });

  readonly totalPendientes = computed(() => {
    return Math.max(0, this.totalConfirmados() - this.totalEntregadas());
  });

  readonly ultimasEntregas = computed(() => {
    const entregas = this.cafeteriaService.entregas()
      .filter(e => e.estado === 'ENTREGADO')
      .sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    return entregas.slice(0, 20);
  });

  onSearch(code: string): void {
    this.searchCode.set(code);
    if (!code || code.length < 3 || this.cafeteriaService.isLoadingData()) {
      this.searchResult.set(null);
      return;
    }

    const result = this.cafeteriaService.searchBeneficiarioOrConfirmacion(code);
    if (!result || result.status === 'NOT_IN_PADRON') {
      this.searchResult.set(null);
      return;
    }

    const alreadyDelivered = result.status === 'ALREADY_DELIVERED';
    const benef = result.beneficiario;
    const conf = result.confirmacion;

    let type: 'confirmed' | 'extraño' | 'no_confirmacion' = 'confirmed';
    if (result.status === 'VALID_READY' || result.status === 'VALID_ALERT') {
      type = (!conf?.es_beneficiario_valido || conf?.motivo_alerta) ? 'extraño' : 'confirmed';
    } else if (result.status === 'NOT_CONFIRMED') {
      type = 'no_confirmacion';
    }

    this.searchResult.set({
      codigo: result.codigo_id,
      nombre: benef?.nombre || conf?.beneficiario_nombre || conf?.nombre_en_form || 'Sin nombre',
      carrera: benef?.carrera_nombre || conf?.carrera_nombre || conf?.carrera_en_form || '',
      tipoComida: result.tipoComidaNombre || conf?.tipo_comida_nombre || '',
      type,
      confirmacionId: conf?.id,
      horaConfirmacion: conf?.fecha ? this.getHora(conf.fecha) : undefined,
      alreadyDelivered,
      horaEntrega: result.entrega?.hora || ''
    });
  }

  async markDelivery(): Promise<void> {
    const result = this.searchResult();
    if (!result || this.delivering()) return;

    this.delivering.set(true);
    try {
      const searchResult = this.cafeteriaService.searchBeneficiarioOrConfirmacion(result.codigo);
      if (searchResult) {
        await this.cafeteriaService.registrarEntrega(searchResult);
      }
      // Refresh search to show delivered status
      this.onSearch(this.searchCode());
    } catch (e) {
      console.error('Error marking delivery:', e);
    } finally {
      this.delivering.set(false);
    }
  }

  clearSearch(): void {
    this.searchCode.set('');
    this.searchResult.set(null);
  }

  getVisual(carrera: string) {
    return getVisualCarrera(carrera);
  }

  private getHora(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.split(' ');
    return parts.length > 1 ? parts[1].substring(0, 5) : '';
  }
}
