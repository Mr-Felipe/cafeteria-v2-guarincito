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
          <p class="text-sm text-slate-600">Busca por codigo o nombre y marca entrega al instante</p>
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
            <p class="text-sm font-bold text-amber-800">Cargando padron y confirmaciones...</p>
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
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Codigo o Nombre del Estudiante</label>
          <div class="relative">
            <mat-icon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" [style.fontSize.px]="28">search</mat-icon>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearch($event)"
              placeholder="Escribe codigo o nombre..."
              [disabled]="cafeteriaService.isLoadingData()"
              [attr.autofocus]="cafeteriaService.isLoadingData() ? null : ''"
              class="w-full pl-14 pr-14 py-4 text-2xl font-mono font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all placeholder:text-slate-300 placeholder:text-lg placeholder:font-normal disabled:opacity-50 disabled:cursor-not-allowed"
            />
            @if (searchQuery()) {
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

      <!-- SEARCH RESULTS LIST -->
      @if (searchResults().length > 0) {
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div class="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <mat-icon class="text-slate-400">search</mat-icon>
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Resultados</h3>
              <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">{{ searchResults().length }}</span>
            </div>
            <span class="text-xs text-slate-400">{{ searchQuery() }}</span>
          </div>
          <div class="max-h-[60vh] overflow-y-auto">
            <div class="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              @for (item of searchResults(); track item.codigo) {
                @let visual = getVisual(item.carrera);
                <div class="bg-white border rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all"
                  [class.border-emerald-200]="item.type === 'confirmed'"
                  [class.border-amber-200]="item.type === 'extraño'"
                  [class.border-slate-200]="item.type === 'no_confirmacion'"
                  [class.border-emerald-100]="item.alreadyDelivered"
                >
                  <div>
                    <div class="flex items-center justify-between gap-1.5 mb-2">
                      <span class="font-mono text-xs font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">ID: {{ item.codigo }}</span>
                      <div class="flex items-center gap-1">
                        <span class="px-2 py-0.5 text-[10px] font-semibold rounded border flex items-center gap-1 {{ visual.badgeClass }}">
                          <mat-icon [style.fontSize.px]="20" class="w-5 h-5 flex items-center justify-center">{{ visual.icono }}</mat-icon>
                          <span class="truncate max-w-[90px]">{{ item.carrera || 'Sin Carrera' }}</span>
                        </span>
                        @if (item.horaConfirmacion) {
                          <span class="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ item.horaConfirmacion }}</span>
                        }
                      </div>
                    </div>
                    <h4 class="font-semibold text-sm text-slate-900">{{ item.nombre }}</h4>
                    <div class="flex flex-wrap items-center gap-1.5 mt-2">
                      @if (item.type === 'confirmed') {
                        <span class="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">CONFIRMADO</span>
                      } @else if (item.type === 'extraño') {
                        <span class="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold">EXTERNO</span>
                      } @else {
                        <span class="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">SIN CONFIRMACION</span>
                      }
                      @if (item.tipoComida === 'Almuerzo') {
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Almuerzo</span>
                      } @else if (item.tipoComida === 'Refrigerio') {
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Refrigerio</span>
                      } @else if (item.tipoComida) {
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">{{ item.tipoComida }}</span>
                      }
                    </div>
                  </div>
                  <div class="mt-3 pt-2.5 border-t border-slate-100">
                    @if (item.alreadyDelivered) {
                      <div class="w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-100 text-emerald-700">
                        <mat-icon class="text-sm">check</mat-icon><span>Entregado {{ item.horaEntrega ? 'a las ' + item.horaEntrega.substring(0,5) : '' }}</span>
                      </div>
                    } @else {
                      <button
                        type="button"
                        (click)="deliverItem(item)"
                        [disabled]="deliveringCodigo() === item.codigo"
                        class="w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        [class.bg-emerald-600]="item.type === 'confirmed'"
                        [class.hover:bg-emerald-700]="item.type === 'confirmed'"
                        [class.text-white]="item.type === 'confirmed'"
                        [class.bg-amber-500]="item.type === 'extraño'"
                        [class.hover:bg-amber-600]="item.type === 'extraño'"
                        [class.bg-slate-600]="item.type === 'no_confirmacion'"
                        [class.hover:bg-slate-700]="item.type === 'no_confirmacion'"
                        [class.text-white]="true"
                      >
                        @if (deliveringCodigo() === item.codigo) {
                          <mat-icon class="animate-spin text-sm">refresh</mat-icon><span>Entregando...</span>
                        } @else {
                          <mat-icon class="text-sm">check_circle</mat-icon>
                          <span>{{ item.type === 'no_confirmacion' ? 'Entregar Sin Confirmar' : 'Marcar Entrega' }}</span>
                        }
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      } @else if (searchQuery() && searchQuery()!.length >= 3 && !cafeteriaService.isLoadingData()) {
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center">
          <mat-icon class="text-5xl text-slate-300 mb-3">search_off</mat-icon>
          <p class="text-sm font-semibold text-slate-500">Sin resultados para "{{ searchQuery() }}"</p>
          <p class="text-xs text-slate-400 mt-1">No se encontro nadie con ese codigo o nombre en el padron ni en las confirmaciones de hoy.</p>
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

  searchQuery = signal<string>('');
  deliveringCodigo = signal<string | null>(null);

  readonly searchResults = computed(() => {
    const q = this.searchQuery();
    if (!q || q.length < 3) return [];
    const lower = q.toLowerCase();
    const norm = this.cafeteriaService.normalizeCode(q);
    const isCode = /^\d+$/.test(q);
    const fecha = this.cafeteriaService.selectedDate();

    const results: Array<{
      codigo: string;
      nombre: string;
      carrera: string;
      tipoComida: string;
      type: 'confirmed' | 'extraño' | 'no_confirmacion';
      horaConfirmacion?: string;
      alreadyDelivered: boolean;
      horaEntrega?: string;
    }> = [];

    // 1. Check already delivered today
    const entregasHoy = this.cafeteriaService.entregas().filter(e =>
      e.estado === 'ENTREGADO' && e.fecha === fecha
    );

    // 2. Get all confirmations for today
    const confs = this.cafeteriaService.confirmaciones();
    const bens = this.cafeteriaService.beneficiarios();

    // Build matched codes set
    const matchedCodes = new Set<string>();

    // Search confirmations
    for (const c of confs) {
      const cNorm = this.cafeteriaService.normalizeCode(c.codigo_id);
      const matchesCode = cNorm === norm || c.codigo_id === q;
      const matchesName = !isCode && c.beneficiario_nombre && c.beneficiario_nombre.toLowerCase().includes(lower);
      if (!matchesCode && !matchesName) continue;

      const alreadyDelivered = entregasHoy.some(e => {
        const eNorm = this.cafeteriaService.normalizeCode(e.codigo_id);
        return eNorm === cNorm || e.codigo_id === c.codigo_id;
      });

      let type: 'confirmed' | 'extraño' | 'no_confirmacion' = 'confirmed';
      if (c.motivo_alerta && !c.corregido) {
        type = 'extraño';
      }

      results.push({
        codigo: c.codigo_id,
        nombre: c.beneficiario_nombre || c.nombre_en_form || 'Sin nombre',
        carrera: c.carrera_nombre || c.carrera_real || c.carrera_en_form || '',
        tipoComida: c.tipo_comida_nombre || '',
        type,
        horaConfirmacion: c.fecha ? this.getHora(c.fecha) : undefined,
        alreadyDelivered,
        horaEntrega: entregasHoy.find(e => {
          const eNorm = this.cafeteriaService.normalizeCode(e.codigo_id);
          return eNorm === cNorm || e.codigo_id === c.codigo_id;
        })?.hora
      });
      matchedCodes.add(c.codigo_id);
    }

    // 3. Search beneficiarios not in confirmations
    for (const b of bens) {
      if (matchedCodes.has(b.codigo_id)) continue;
      const bNorm = this.cafeteriaService.normalizeCode(b.codigo_id);
      const matchesCode = bNorm === norm || b.codigo_id === q;
      const matchesName = !isCode && b.nombre && b.nombre.toLowerCase().includes(lower);
      if (!matchesCode && !matchesName) continue;

      const alreadyDelivered = entregasHoy.some(e => {
        const eNorm = this.cafeteriaService.normalizeCode(e.codigo_id);
        return eNorm === bNorm || e.codigo_id === b.codigo_id;
      });

      const tipoComidaObj = this.cafeteriaService.tiposComida().find(t => t.id === b.tipo_comida_id);

      results.push({
        codigo: b.codigo_id,
        nombre: b.nombre,
        carrera: b.carrera_nombre || '',
        tipoComida: tipoComidaObj?.nombre || '',
        type: 'no_confirmacion',
        alreadyDelivered,
        horaEntrega: entregasHoy.find(e => {
          const eNorm = this.cafeteriaService.normalizeCode(e.codigo_id);
          return eNorm === bNorm || e.codigo_id === b.codigo_id;
        })?.hora
      });
      matchedCodes.add(b.codigo_id);
    }

    // Sort: not delivered first, then by name
    results.sort((a, b) => {
      if (a.alreadyDelivered !== b.alreadyDelivered) return a.alreadyDelivered ? 1 : -1;
      return a.nombre.localeCompare(b.nombre);
    });

    return results;
  });

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

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  async deliverItem(item: { codigo: string }): Promise<void> {
    if (this.deliveringCodigo()) return;
    this.deliveringCodigo.set(item.codigo);
    try {
      const result = await this.cafeteriaService.searchBeneficiarioOrConfirmacion(item.codigo);
      if (result) {
        await this.cafeteriaService.registrarEntrega(result);
      }
    } catch (e) {
      console.error('Error marking delivery:', e);
    } finally {
      this.deliveringCodigo.set(null);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
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
