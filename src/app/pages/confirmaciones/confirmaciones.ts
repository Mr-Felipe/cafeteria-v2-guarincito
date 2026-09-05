import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CafeteriaService } from '../../services/cafeteria.service';
import { SupabaseService } from '../../services/supabase.service';
import { Beneficiario, Confirmacion, getVisualCarrera } from '../../models/cafeteria.models';

@Component({
  selector: 'app-confirmaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- HEADER -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span class="w-2 h-2 rounded-full bg-blue-500"></span>
            Monitoreo en Tiempo Real
          </span>
          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Monitoreo de Confirmaciones</h2>
          <p class="text-sm text-slate-600">Control de asistencia y entregas sincronizado con Google Forms y Padrón iVMS-4200.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <a routerLink="/entregas" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
            <mat-icon class="text-base">task_alt</mat-icon><span>Ver Entregadas</span>
          </a>
          <button type="button" (click)="cafeteriaService.exportarConfirmacionesCsv()" class="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm cursor-pointer">
            <mat-icon class="text-base text-slate-500">download</mat-icon><span>CSV</span>
          </button>
        </div>
      </div>

      <!-- FEEDBACK BANNER -->
      @if (cafeteriaService.lastActionNotification()) {
        <div class="p-4 rounded-xl border flex items-center justify-between gap-3 shadow-sm transition-all"
          [class.bg-emerald-50]="cafeteriaService.lastActionNotification()?.type === 'success'"
          [class.border-emerald-200]="cafeteriaService.lastActionNotification()?.type === 'success'"
          [class.text-emerald-900]="cafeteriaService.lastActionNotification()?.type === 'success'"
          [class.bg-red-50]="cafeteriaService.lastActionNotification()?.type === 'error'"
          [class.border-red-200]="cafeteriaService.lastActionNotification()?.type === 'error'"
          [class.text-red-900]="cafeteriaService.lastActionNotification()?.type === 'error'"
        >
          <div class="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <mat-icon class="text-lg">{{ cafeteriaService.lastActionNotification()?.type === 'success' ? 'check_circle' : 'error' }}</mat-icon>
            <span>{{ cafeteriaService.lastActionNotification()?.title }}: {{ cafeteriaService.lastActionNotification()?.message }}</span>
          </div>
          <button type="button" (click)="cafeteriaService.lastActionNotification.set(null)" class="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <mat-icon class="text-base">close</mat-icon>
          </button>
        </div>
      }

      <!-- FILTROS: TIPO + FECHA -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5">
        <div class="flex flex-col md:flex-row md:items-end gap-4">
          <!-- Tipo de Subsidio -->
          <div class="flex-1">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tipo de Subsidio</span>
            <div class="bg-slate-100 p-1 rounded-lg grid gap-1 border border-slate-200" [class.grid-cols-3]="subsidioOpciones().length === 3" [class.grid-cols-4]="subsidioOpciones().length === 4">
              @for (op of subsidioOpciones(); track op.key) {
                <button type="button" (click)="filtroSubsidio.set(op.key)" class="py-2 px-1 sm:px-2.5 rounded-md text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium overflow-hidden" [class.bg-white]="filtroSubsidio() === op.key" [class.text-slate-900]="op.color === 'slate' && filtroSubsidio() === op.key" [class.text-emerald-700]="op.color === 'emerald' && filtroSubsidio() === op.key" [class.text-blue-700]="op.color === 'blue' && filtroSubsidio() === op.key" [class.text-orange-700]="op.color === 'orange' && filtroSubsidio() === op.key" [class.font-bold]="filtroSubsidio() === op.key" [class.shadow-xs]="filtroSubsidio() === op.key" [class.text-slate-600]="filtroSubsidio() !== op.key">
                  <mat-icon [style.fontSize.px]="20" class="shrink-0">{{ op.icon }}</mat-icon><span class="hidden sm:inline truncate">{{ op.label }}</span>
                </button>
              }
            </div>
          </div>
          <!-- Fecha -->
          <div class="w-full md:w-auto md:min-w-[280px]">
            <label for="filtro-fecha-input" class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fecha de Servicio</label>
            <div class="flex items-center gap-1.5">
              <button type="button" (click)="shiftDate(-1)" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"><mat-icon [style.fontSize.px]="20">chevron_left</mat-icon></button>
              <input id="filtro-fecha-input" type="date" [value]="cafeteriaService.selectedDate()" (change)="onDateChange($event)" class="flex-1 min-w-0 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"/>
              <button type="button" (click)="shiftDate(1)" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0"><mat-icon [style.fontSize.px]="20">chevron_right</mat-icon></button>
              <button type="button" (click)="setTodayDate()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer shrink-0">Hoy</button>
            </div>
          </div>
        </div>
      </div>

      <!-- KPIS -->
      <section class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div><div class="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Confirmados</div><div class="text-2xl font-bold text-slate-900">{{ totalConfirmadosPorSubsidio() }}</div></div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden"><div class="bg-blue-500 h-full" [style.width.%]="cafeteriaService.beneficiarios().length > 0 ? (totalConfirmadosPorSubsidio() / cafeteriaService.beneficiarios().length * 100) : 0"></div></div>
        </div>
        <a routerLink="/entregas" class="bg-white hover:bg-emerald-50/50 transition-colors p-5 rounded-xl border border-slate-200 hover:border-emerald-300 shadow-sm flex flex-col justify-between group cursor-pointer">
          <div><div class="flex items-center justify-between"><span class="text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-1">Entregadas</span><mat-icon class="text-xs text-emerald-500 group-hover:translate-x-0.5 transition-transform">arrow_forward</mat-icon></div><div class="text-2xl font-bold text-slate-900">{{ entregadasPorSubsidio() }}</div></div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden"><div class="bg-emerald-500 h-full" [style.width.%]="totalConfirmadosPorSubsidio() > 0 ? (entregadasPorSubsidio() / totalConfirmadosPorSubsidio() * 100) : 0"></div></div>
        </a>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div><div class="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Pendientes</div><div class="text-2xl font-bold text-slate-900">{{ pendientesPorSubsidio() }}</div></div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden"><div class="bg-orange-500 h-full" [style.width.%]="totalConfirmadosPorSubsidio() > 0 ? (pendientesPorSubsidio() / totalConfirmadosPorSubsidio() * 100) : 0"></div></div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div><div class="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">En Padrón</div><div class="text-2xl font-bold text-slate-900">{{ cafeteriaService.beneficiarios().length }}</div></div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden"><div class="bg-blue-500 h-full" [style.width.%]="100"></div></div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between" [class.bg-purple-50]="extranosPorSubsidio() > 0" [class.border-purple-200]="extranosPorSubsidio() > 0">
          <div><div class="text-xs font-semibold uppercase tracking-wider mb-1" [class.text-purple-800]="extranosPorSubsidio() > 0" [class.text-slate-500]="extranosPorSubsidio() === 0">Extraños</div><div class="text-2xl font-bold" [class.text-purple-950]="extranosPorSubsidio() > 0" [class.text-slate-900]="extranosPorSubsidio() === 0">{{ extranosPorSubsidio() }}</div></div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden"><div class="bg-purple-500 h-full" [style.width.%]="extranosPorSubsidio() > 0 ? 100 : 0"></div></div>
        </div>
        <div class="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between" [class.bg-amber-50]="entregadosSinConfirmar().length > 0" [class.border-amber-300]="entregadosSinConfirmar().length > 0">
          <div><div class="text-xs font-semibold uppercase tracking-wider mb-1" [class.text-amber-800]="entregadosSinConfirmar().length > 0" [class.text-slate-500]="entregadosSinConfirmar().length === 0">Entregados Sin Confirmar</div><div class="text-2xl font-bold" [class.text-amber-900]="entregadosSinConfirmar().length > 0" [class.text-slate-900]="entregadosSinConfirmar().length === 0">{{ entregadosSinConfirmar().length }}</div></div>
          <div class="text-xs text-amber-600 mt-2 font-medium">{{ noConfirmaronPorSubsidio() }} en padrón sin confirmar</div>
        </div>
      </section>

      <!-- DESPACHO POR BUSQUEDA -->
      <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 sm:p-5 text-white shadow-md">
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="flex items-center gap-3 shrink-0">
            <div class="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <mat-icon [style.fontSize.px]="24">qr_code_scanner</mat-icon>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white leading-tight">Despacho Rapido</h3>
              <p class="text-xs text-slate-300">Buscar y entregar al instante</p>
            </div>
          </div>
          <div class="flex-1 flex items-center gap-2">
            <div class="relative flex-1">
              <input type="text" [formControl]="busquedaDespacho" (input)="buscarParaDespachar()" placeholder="Codigo ID o nombre del estudiante..." class="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-white placeholder-slate-400 text-sm rounded-lg px-3 py-2 pl-9 font-mono uppercase transition-all"/>
              <mat-icon class="absolute left-2.5 top-2.5 text-slate-400 text-sm">search</mat-icon>
            </div>
          </div>
        </div>
        @if (resultadoDespacho()) {
          <div class="mt-3 p-3 rounded-lg border flex items-center justify-between gap-3"
            [class.bg-emerald-900/40]="resultadoDespacho()!.success && resultadoDespacho()!.tipo === 'confirmado'"
            [class.border-emerald-700]="resultadoDespacho()!.success && resultadoDespacho()!.tipo === 'confirmado'"
            [class.bg-amber-900/40]="resultadoDespacho()!.tipo === 'sin_confirmar'"
            [class.border-amber-700]="resultadoDespacho()!.tipo === 'sin_confirmar'"
            [class.bg-red-900/40]="resultadoDespacho()!.tipo === 'no_encontrado' || (!resultadoDespacho()!.success && resultadoDespacho()!.tipo !== 'sin_confirmar')"
            [class.border-red-700]="resultadoDespacho()!.tipo === 'no_encontrado' || (!resultadoDespacho()!.success && resultadoDespacho()!.tipo !== 'sin_confirmar')">
            <div class="flex items-center gap-3">
              @if (resultadoDespacho()!.conf) {
                @let c = resultadoDespacho()!.conf!;
                @let visual = getVisual(c.carrera_nombre || c.carrera_real || c.carrera_en_form || '');
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" [class]="resultadoDespacho()!.success ? 'bg-emerald-600' : 'bg-red-600'">
                  {{ getInitials(c.beneficiario_nombre || '') }}
                </div>
                <div>
                  <p class="text-sm font-bold text-white">{{ c.beneficiario_nombre }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="font-mono text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">ID: {{ c.codigo_id }}</span>
                    <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded border" [class]="visual.badgeClass">{{ c.carrera_nombre || 'Sin Carrera' }}</span>
                  </div>
                </div>
              } @else if (resultadoDespacho()!.tipo === 'sin_confirmar' && resultadoDespacho()!.beneficiario) {
                @let b = resultadoDespacho()!.beneficiario!;
                @let visual = getVisual(b.carrera_nombre || '');
                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 bg-amber-600">
                  {{ getInitials(b.nombre || '') }}
                </div>
                <div>
                  <p class="text-sm font-bold text-white">{{ b.nombre }}</p>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="font-mono text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">ID: {{ b.codigo_id }}</span>
                    <span class="px-1.5 py-0.5 text-[10px] font-semibold rounded border" [class]="visual.badgeClass">{{ b.carrera_nombre || 'Sin Carrera' }}</span>
                    <span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-800 text-amber-200">SIN CONFIRMAR</span>
                  </div>
                </div>
              } @else {
                <mat-icon class="text-lg" [class.text-emerald-400]="resultadoDespacho()!.success" [class.text-red-400]="!resultadoDespacho()!.success">{{ resultadoDespacho()!.success ? 'check_circle' : 'warning' }}</mat-icon>
                <p class="text-sm font-semibold text-white">{{ resultadoDespacho()!.message }}</p>
              }
            </div>
            <div class="flex items-center gap-2 shrink-0">
              @if (resultadoDespacho()!.tipo === 'confirmado' && resultadoDespacho()!.conf && !resultadoDespacho()!.conf!.entregado) {
                <button type="button" (click)="entregarDesdeBusqueda()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer">
                  <mat-icon class="text-sm">check_circle</mat-icon><span>Entregar</span>
                </button>
              } @else if (resultadoDespacho()!.tipo === 'sin_confirmar') {
                <button type="button" (click)="entregarSinConfirmacion()" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer">
                  <mat-icon class="text-sm">add_circle</mat-icon><span>Entregar Sin Confirmación</span>
                </button>
              }
              <button type="button" (click)="resultadoDespacho.set(null)" class="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"><mat-icon class="text-base">close</mat-icon></button>
            </div>
          </div>
        }
      </div>

      <!-- ACORDEONES -->
      <div class="space-y-4">

        <!-- 1: CONFIRMADOS VALIDOS -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden max-h-[calc(100vh-4rem)] flex flex-col">
          <button type="button" class="w-full text-left p-4 sm:p-5 hover:bg-slate-100/70 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-200 shrink-0 bg-slate-50" (click)="toggleAccordionValidos()">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center shrink-0"><mat-icon [style.fontSize.px]="24">verified</mat-icon></div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Confirmaciones Validas</h3>
                  <span class="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">{{ confirmadosValidosFiltrados().length }}</span>
                </div>
                <p class="text-xs text-slate-500">Estudiantes verificados en el padrón, pendientes de entrega</p>
              </div>
            </div>
            <mat-icon class="text-slate-400 transition-transform duration-200" [class.rotate-180]="accordionValidosOpen()">expand_more</mat-icon>
          </button>
          @if (accordionValidosOpen()) {
            <div class="flex flex-col flex-1 overflow-y-auto min-h-0">
              <div class="sticky top-0 z-10 p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div class="relative flex-1 max-w-md">
                    <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</mat-icon>
                    <input #busqValidos type="text" [value]="busquedaValidos()" (input)="busquedaValidos.set($any($event.target).value)" placeholder="Buscar por codigo, nombre..." class="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
                    @if (busquedaValidos()) {
                      <button type="button" (click)="busquedaValidos.set(''); busqValidos.focus()" class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"><mat-icon class="text-base">close</mat-icon></button>
                    }
                  </div>
                  <select [ngModel]="carreraValidos()" (ngModelChange)="carreraValidos.set($event)" class="p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none">
                    <option value="TODAS">Todas las carreras</option>
                    @for (c of carrerasEnConfirmaciones(); track c) { <option [value]="c">{{ c }}</option> }
                  </select>
                </div>
              </div>
              <div class="p-4 sm:p-5 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  @for (c of confirmadosValidosFiltrados(); track c.id || c.codigo_id) {
                  @let visual = getVisual(c.carrera_nombre || c.carrera_real || c.carrera_en_form || '');
                  <div class="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
                    <div>
                      <div class="flex items-center justify-between gap-1.5 mb-2">
                        <span class="font-mono text-xs font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">ID: {{ c.codigo_id }}</span>
                        <div class="flex items-center gap-1">
                          <span class="px-2 py-0.5 text-[10px] font-semibold rounded border flex items-center gap-1 {{ visual.badgeClass }}">
                            <mat-icon [style.fontSize.px]="20" class="w-5 h-5 flex items-center justify-center">{{ visual.icono }}</mat-icon>
                            <span class="truncate max-w-[90px]">{{ c.carrera_nombre || 'Sin Carrera' }}</span>
                          </span>
                          <span class="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ getHoraConfirmacion(c.fecha) }}</span>
                        </div>
                      </div>
                      <h4 class="font-semibold text-sm text-slate-900">{{ c.beneficiario_nombre }}</h4>
                      <div class="flex flex-wrap items-center gap-1.5 mt-2">
                        <span class="px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">VERIFICADO</span>
                        @if (c.tipo_comida_nombre === 'Almuerzo') {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Almuerzo</span>
                        } @else if (c.tipo_comida_nombre === 'Refrigerio') {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Refrigerio</span>
                        } @else {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">Desayuno</span>
                        }
                      </div>
                    </div>
                    <div class="mt-3 pt-2.5 border-t border-slate-100">
                      @if (c.entregado) {
                        <div class="w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-100 text-emerald-700">
                          <mat-icon class="text-sm">check</mat-icon><span>Entregado {{ c.hora_entrega ? 'a las ' + c.hora_entrega.substring(0,5) : '' }}</span>
                        </div>
                      } @else {
                        <button type="button" (click)="entregarDirecto(c)" class="w-full px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
                          <mat-icon class="text-sm">check_circle</mat-icon><span>Marcar Entrega</span>
                        </button>
                      }
                    </div>
                  </div>
                }
                @if (confirmadosValidosFiltrados().length === 0) {
                  <div class="col-span-full p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-500">
                    <mat-icon class="text-4xl text-slate-400 mb-1">sentiment_dissatisfied</mat-icon>
                    <p class="text-sm font-semibold">No hay confirmados validos para el filtro actual.</p>
                  </div>
                }
              </div>
              </div>
            </div>
          }
        </div>

        <!-- 2: EXTRANOS -->
        <div class="bg-amber-50/30 border border-amber-200 rounded-xl shadow-sm overflow-hidden max-h-[calc(100vh-4rem)] flex flex-col">
          <button type="button" class="w-full text-left p-4 sm:p-5 hover:bg-amber-50/50 transition-colors flex items-center justify-between cursor-pointer border-b border-amber-200 shrink-0 bg-amber-50" (click)="toggleAccordionExtranos()">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0"><mat-icon [style.fontSize.px]="24">warning_amber</mat-icon></div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Confirmaciones Externas</h3>
                  <span class="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">{{ confirmadosExtranos().length }}</span>
                </div>
                <p class="text-xs text-slate-500">Su codigo no figura en el padrón o la carrera no coincide</p>
              </div>
            </div>
            <mat-icon class="text-slate-400 transition-transform duration-200" [class.rotate-180]="accordionExtranosOpen()">expand_more</mat-icon>
          </button>
          @if (accordionExtranosOpen()) {
            <div class="flex flex-col flex-1 overflow-y-auto min-h-0">
              <div class="sticky top-0 z-10 p-4 sm:p-5 bg-amber-50 border-b border-amber-200">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div class="relative flex-1 max-w-md">
                    <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</mat-icon>
                    <input #busqExtr type="text" [value]="busquedaExtranos()" (input)="busquedaExtranos.set($any($event.target).value)" placeholder="Buscar por codigo, nombre..." class="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"/>
                    @if (busquedaExtranos()) {
                      <button type="button" (click)="busquedaExtranos.set(''); busqExtr.focus()" class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"><mat-icon class="text-base">close</mat-icon></button>
                    }
                  </div>
                  <select [ngModel]="carreraExtranos()" (ngModelChange)="carreraExtranos.set($event)" class="p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none">
                    <option value="TODAS">Todas las carreras</option>
                    @for (c of carrerasEnExtranos(); track c) { <option [value]="c">{{ c }}</option> }
                  </select>
                </div>
              </div>
              <div class="p-4 sm:p-5 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  @for (c of confirmadosExtranosFiltrados(); track c.id || c.codigo_id) {
                  @let visual = getVisual(c.carrera_en_form || c.carrera_real || c.carrera_nombre || '');
                  <div class="bg-white border border-amber-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all">
                    <div>
                      <div class="flex items-center justify-between gap-1.5 mb-2">
                        <span class="font-mono text-xs font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">{{ c.codigo_id }}</span>
                        <div class="flex items-center gap-1">
                          <span class="px-2 py-0.5 text-[10px] font-semibold rounded border flex items-center gap-1 {{ visual.badgeClass }}">
                            <mat-icon [style.fontSize.px]="20" class="w-5 h-5 flex items-center justify-center">{{ visual.icono }}</mat-icon>
                            <span class="truncate max-w-[90px]">{{ c.carrera_en_form || c.carrera_nombre || 'Sin Carrera' }}</span>
                          </span>
                          <span class="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ getHoraConfirmacion(c.fecha) }}</span>
                        </div>
                      </div>
                      <h4 class="font-semibold text-sm text-slate-900">{{ c.beneficiario_nombre || 'Sin Nombre' }}</h4>
                      @if (c.motivo_alerta) {
                        <div class="mt-1.5 p-2 rounded-lg text-[11px] font-medium flex items-start gap-1.5"
                          [class.bg-amber-50]="c.motivo_alerta === 'no_en_padron'"
                          [class.text-amber-700]="c.motivo_alerta === 'no_en_padron'"
                          [class.bg-red-50]="c.motivo_alerta === 'carrera_diferente' || c.motivo_alerta === 'carrera_form_vs_padron'"
                          [class.text-red-700]="c.motivo_alerta === 'carrera_diferente' || c.motivo_alerta === 'carrera_form_vs_padron'"
                          [class.bg-orange-50]="c.motivo_alerta !== 'no_en_padron' && c.motivo_alerta !== 'carrera_diferente' && c.motivo_alerta !== 'carrera_form_vs_padron'"
                          [class.text-orange-700]="c.motivo_alerta !== 'no_en_padron' && c.motivo_alerta !== 'carrera_diferente' && c.motivo_alerta !== 'carrera_form_vs_padron'">
                          <mat-icon class="text-sm mt-0.5 shrink-0">
                            @if (c.motivo_alerta === 'no_en_padron') { person_off }
                            @else if (c.motivo_alerta === 'carrera_diferente' || c.motivo_alerta === 'carrera_form_vs_padron') { school }
                            @else { warning }
                          </mat-icon>
                          <span>
                            @if (c.motivo_alerta === 'no_en_padron') {
                              El ID <strong>{{ c.codigo_id }}</strong> no esta registrado en el padron de beneficiarios
                            }
                            @else if (c.motivo_alerta === 'carrera_form_vs_padron') {
                              ID valido, pero pertenece a <strong>{{ c.carrera_nombre }}</strong>, no a <strong>{{ c.carrera_en_form }}</strong>
                            }
                            @else if (c.motivo_alerta === 'carrera_diferente') {
                              Carrera del formulario (<strong>{{ c.carrera_en_form }}</strong>) no coincide con el padron (<strong>{{ c.carrera_nombre }}</strong>)
                            }
                            @else if (c.motivo_alerta === 'nombre_difiere') {
                              El nombre en el formulario (<strong>{{ c.nombre_en_form }}</strong>) difiere del padron (<strong>{{ c.beneficiario_nombre }}</strong>)
                            }
                            @else {
                              {{ c.motivo_alerta }}
                            }
                          </span>
                        </div>
                      }
                      @if (c.observacion) {
                        <p class="text-[11px] text-slate-500 font-medium mt-1 italic">{{ c.observacion }}</p>
                      }
                    </div>
                    <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button type="button" (click)="abrirModalCorreccion(c)" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1">
                        <mat-icon class="text-sm">settings</mat-icon><span>Corregir</span>
                      </button>
                      <button type="button" (click)="eliminarExtrano(c)" class="px-2 py-1.5 rounded-lg text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer flex items-center gap-1" title="Eliminar">
                        <mat-icon class="text-sm">delete</mat-icon>
                      </button>
                      <span class="text-[11px] font-medium text-slate-600">{{ c.entregado ? 'Autorizado (' + (c.hora_entrega || 'OK') + ')' : 'Sin Autorizar' }}</span>
                      @if (!c.entregado) {
                        <button type="button" (click)="entregarExtrano(c)" class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                          Autorizar Entrega
                        </button>
                      } @else {
                        <span class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white">Racion Autorizada</span>
                      }
                    </div>
                  </div>
                }
                @if (confirmadosExtranosFiltrados().length === 0) {
                  <div class="col-span-full p-6 text-center text-slate-500 text-xs font-semibold bg-white rounded-xl border border-dashed border-slate-200">No se detectan estudiantes externos para este filtro.</div>
                }
              </div>
              </div>
            </div>
          }
        </div>

        <!-- 3: NO CONFIRMARON -->
        <div class="bg-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden max-h-[calc(100vh-4rem)] flex flex-col">
          <button type="button" class="w-full text-left p-4 sm:p-5 hover:bg-slate-100/70 transition-colors flex items-center justify-between cursor-pointer border-b border-slate-200 shrink-0 bg-slate-50" (click)="toggleAccordionNoConfirmaron()">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0"><mat-icon [style.fontSize.px]="24">person_off</mat-icon></div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Beneficiarios Sin Confirmar</h3>
                  <span class="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-bold">{{ noConfirmaron().length }}</span>
                </div>
                <p class="text-xs text-slate-500">Estudiantes con derecho a subsidio que aun no han registrado confirmacion</p>
              </div>
            </div>
            <mat-icon class="text-slate-400 transition-transform duration-200" [class.rotate-180]="accordionNoConfirmaronOpen()">expand_more</mat-icon>
          </button>
          @if (accordionNoConfirmaronOpen()) {
            <div class="flex flex-col flex-1 overflow-y-auto min-h-0">
              <div class="sticky top-0 z-10 p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div class="relative flex-1 max-w-md">
                    <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</mat-icon>
                    <input #busqNoConf type="text" [value]="busquedaNoConfirmaron()" (input)="busquedaNoConfirmaron.set($any($event.target).value)" placeholder="Buscar por codigo, nombre..." class="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
                    @if (busquedaNoConfirmaron()) {
                      <button type="button" (click)="busquedaNoConfirmaron.set(''); busqNoConf.focus()" class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"><mat-icon class="text-base">close</mat-icon></button>
                    }
                  </div>
                  <select [ngModel]="carreraNoConfirmaron()" (ngModelChange)="carreraNoConfirmaron.set($event)" class="p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none">
                    <option value="TODAS">Todas las carreras</option>
                    @for (c of carrerasEnNoConfirmaron(); track c) { <option [value]="c">{{ c }}</option> }
                  </select>
                </div>
              </div>
              <div class="p-4 sm:p-5 space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                @for (b of noConfirmaronFiltrados(); track b.codigo_id) {
                  @let visual = getVisual(b.carrera_nombre || '');
                  @let yaEntregado = cafeteriaService.entregas().some(e => e.codigo_id === b.codigo_id && e.estado === 'ENTREGADO' && e.fecha === cafeteriaService.selectedDate());
                  <div class="bg-white border rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition-all"
                    [class.border-slate-200]="!yaEntregado"
                    [class.border-amber-300]="yaEntregado"
                    [class.bg-amber-50]="yaEntregado">
                    <div>
                      <div class="flex items-center justify-between gap-1.5 mb-1.5">
                        <span class="font-mono text-xs font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700">ID: {{ b.codigo_id }}</span>
                        @if (yaEntregado) {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">Entregado</span>
                        } @else {
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Sin Confirmar</span>
                        }
                      </div>
                      <h4 class="font-semibold text-sm text-slate-900">{{ b.nombre }}</h4>
                      <div class="flex items-center gap-1 mt-1">
                        <span class="px-2 py-0.5 text-[10px] font-semibold rounded border flex items-center gap-1 {{ visual.badgeClass }}">
                          <mat-icon [style.fontSize.px]="20" class="w-5 h-5 flex items-center justify-center">{{ visual.icono }}</mat-icon>{{ b.carrera_nombre || 'Sin Carrera' }}
                        </span>
                      </div>
                    </div>
                    <div class="mt-3 pt-2.5 border-t border-slate-100">
                      @if (yaEntregado) {
                        <span class="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 flex items-center justify-center gap-1.5">
                          <mat-icon class="text-sm">check_circle</mat-icon> Ya Entregado
                        </span>
                      } @else {
                        <button type="button" (click)="entregarDesdeNoConfirmaron(b)"
                          class="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5">
                          <mat-icon class="text-sm">add_circle</mat-icon> Entregar Sin Confirmar
                        </button>
                      }
                    </div>
                  </div>
                }
                @if (noConfirmaronFiltrados().length === 0) {
                  <div class="col-span-full p-6 text-center text-slate-500 text-xs font-semibold bg-white rounded-xl border border-dashed border-slate-200">Excelente! Todos los estudiantes han confirmado.</div>
                }
              </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- MODAL CORRECCION -->
      @if (modalCorreccion()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" (click)="cerrarModalCorreccion()">
          <div class="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col" (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex items-center justify-between shrink-0">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <mat-icon class="text-white text-xl">build</mat-icon>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-white">Corregir Confirmacion</h3>
                  <p class="text-amber-100 text-xs">{{ String(modalCorreccion()?.conf?.id || 0).padStart(4, '0') }}</p>
                </div>
              </div>
              <button (click)="cerrarModalCorreccion()" class="p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer">
                <mat-icon class="text-white">close</mat-icon>
              </button>
            </div>

            <!-- Content: Split View -->
            <div class="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
              <!-- LEFT: Registro con problema -->
              <div class="p-6 space-y-4">
                <div class="flex items-center gap-2 mb-3">
                  <mat-icon class="text-red-500">error</mat-icon>
                  <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Registro con Problema</h4>
                </div>
                @if (modalCorreccion()?.conf) {
                  <div class="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="font-mono text-sm font-bold text-red-700">ID: {{ modalCorreccion()!.conf!.codigo_id }}</span>
                      <span class="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">PROBLEMA</span>
                    </div>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-slate-500">Nombre (form):</span>
                        <span class="font-semibold text-slate-800">{{ modalCorreccion()!.conf!.nombre_en_form }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-500">Carrera (form):</span>
                        <span class="font-semibold text-red-700">{{ modalCorreccion()!.conf!.carrera_en_form }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-500">Tipo comida:</span>
                        <span class="font-semibold text-slate-800">{{ modalCorreccion()!.conf!.tipo_comida_nombre }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-slate-500">Fecha envio:</span>
                        <span class="font-mono text-xs text-slate-700">{{ modalCorreccion()!.conf!.fecha }}</span>
                      </div>
                    </div>
                    <div class="p-2 bg-white rounded-lg border border-red-100">
                      <p class="text-xs font-medium text-red-700 flex items-center gap-1.5">
                        <mat-icon class="text-sm">warning</mat-icon>
                        @if (modalCorreccion()!.conf!.motivo_alerta === 'no_en_padron') {
                          Este ID no esta registrado en el padron de beneficiarios
                        }
                        @else if (modalCorreccion()!.conf!.motivo_alerta === 'carrera_form_vs_padron') {
                          ID valido, pero pertenece a <strong class="mx-0.5">{{ modalCorreccion()!.conf!.carrera_nombre }}</strong>, no a <strong class="mx-0.5">{{ modalCorreccion()!.conf!.carrera_en_form }}</strong>
                        }
                        @else if (modalCorreccion()!.conf!.motivo_alerta === 'carrera_diferente') {
                          Carrera del formulario no coincide con el padron
                        }
                        @else {
                          {{ modalCorreccion()!.conf!.motivo_alerta }}
                        }
                      </p>
                    </div>
                  </div>
                }
              </div>

              <!-- RIGHT: Buscar y corregir -->
              <div class="p-6 space-y-4">
                <div class="flex items-center gap-2 mb-3">
                  <mat-icon class="text-emerald-500">search</mat-icon>
                  <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Buscar en Padron</h4>
                </div>

                <!-- Search -->
                <div class="relative">
                  <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</mat-icon>
                  <input type="text" [value]="busquedaCorreccion()" (input)="busquedaCorreccion.set($any($event.target).value)"
                    placeholder="Buscar por codigo o nombre..."
                    class="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                </div>

                <!-- Resultados -->
                <div class="space-y-2 max-h-64 overflow-y-auto">
                  @for (b of beneficiariosEncontrados(); track b.codigo_id) {
                    <div class="bg-white border border-slate-200 rounded-xl p-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer"
                         (click)="seleccionarBeneficiario(b)">
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="font-mono text-xs font-bold text-slate-700">{{ b.codigo_id }}</span>
                            <span class="text-sm font-semibold text-slate-800 truncate">{{ b.nombre }}</span>
                          </div>
                          <p class="text-[11px] text-slate-500 mt-0.5">{{ b.carrera_nombre }}</p>
                        </div>
                        <mat-icon class="text-emerald-500 shrink-0">add_circle</mat-icon>
                      </div>
                    </div>
                  }
                  @if (busquedaCorreccion().length >= 2 && beneficiariosEncontrados().length === 0) {
                    <div class="p-4 text-center text-slate-400 text-xs">
                      <mat-icon class="text-2xl mb-1">person_search</mat-icon>
                      <p>No se encontraron resultados</p>
                    </div>
                  }
                </div>

                <!-- Beneficiario seleccionado -->
                @if (beneficiarioSeleccionado()) {
                  <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-bold text-emerald-800 uppercase tracking-wider">Padron Seleccionado</span>
                      <mat-icon class="text-emerald-600">check_circle</mat-icon>
                    </div>
                    <div class="space-y-2 text-sm">
                      <div class="flex justify-between">
                        <span class="text-emerald-600">ID:</span>
                        <span class="font-mono font-bold text-emerald-800">{{ beneficiarioSeleccionado()!.codigo_id }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-emerald-600">Nombre:</span>
                        <span class="font-semibold text-emerald-800">{{ beneficiarioSeleccionado()!.nombre }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-emerald-600">Carrera:</span>
                        <span class="font-semibold text-emerald-800">{{ beneficiarioSeleccionado()!.carrera_nombre }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Acciones -->
                  <div class="flex gap-3 pt-2">
                    <button (click)="aplicarCorreccion('asociar')"
                      [disabled]="!beneficiarioSeleccionado()"
                      class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                      <mat-icon class="text-lg">link</mat-icon>
                      Asociar y Corregir
                    </button>
                    <button (click)="aplicarCorreccion('ignorar')"
                      class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer">
                      <mat-icon class="text-lg">visibility_off</mat-icon>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class Confirmaciones {
  readonly cafeteriaService = inject(CafeteriaService);
  private readonly supabase = inject(SupabaseService);

  readonly filtroSubsidio = signal<string>('Todos');

  readonly subsidioOpciones = computed(() => {
    const dow = this.cafeteriaService.selectedDayOfWeek();
    if (dow === 0) {
      return [
        { key: 'Todos', label: 'Todos', icon: 'layers', color: 'slate' },
        { key: 'Almuerzo', label: 'Almuerzo', icon: 'wb_sunny', color: 'emerald' },
        { key: 'Desayuno', label: 'Desayuno', icon: 'free_breakfast', color: 'orange' }
      ];
    }
    return [
      { key: 'Todos', label: 'Todos', icon: 'layers', color: 'slate' },
      { key: 'Almuerzo', label: 'Almuerzo', icon: 'wb_sunny', color: 'emerald' },
      { key: 'Refrigerio', label: 'Refrigerio', icon: 'nights_stay', color: 'blue' }
    ];
  });

  modalPegarOpen = signal<boolean>(false);

  accordionValidosOpen = signal<boolean>(true);
  accordionExtranosOpen = signal<boolean>(true);
  accordionNoConfirmaronOpen = signal<boolean>(true);

  readonly busquedaDespacho = new FormControl('');
  readonly resultadoDespacho = signal<{ success: boolean; message: string; conf?: Confirmacion; beneficiario?: Beneficiario; tipo: 'confirmado' | 'sin_confirmar' | 'no_encontrado' } | null>(null);

  busquedaValidos = signal('');
  carreraValidos = signal('TODAS');
  busquedaExtranos = signal('');
  carreraExtranos = signal('TODAS');
  busquedaNoConfirmaron = signal('');
  carreraNoConfirmaron = signal('TODAS');

  // Modal correccion
  readonly modalCorreccion = signal<{ conf: Confirmacion | null } | null>(null);
  readonly busquedaCorreccion = signal('');
  readonly beneficiarioSeleccionado = signal<Beneficiario | null>(null);

  readonly String = String;

  readonly dayName = computed(() => {
    const fecha = this.cafeteriaService.selectedDate();
    const d = new Date(fecha + 'T12:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    return days[d.getDay()];
  });

  readonly confirmadosValidos = computed(() => {
    const all = this.cafeteriaService.confirmaciones().filter(c =>
      c.es_beneficiario_valido && !c.motivo_alerta && !c.entregado
    );
    // Keep only the latest confirmation per codigo_id
    const latestByCode = new Map<string, typeof all[0]>();
    for (const c of all) {
      const existing = latestByCode.get(c.codigo_id);
      if (!existing || (c.id && existing.id && c.id > existing.id)) {
        latestByCode.set(c.codigo_id, c);
      }
    }
    return Array.from(latestByCode.values()).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  });

  readonly totalConfirmados = computed(() => {
    return this.confirmadosValidos().length + this.confirmadosExtranos().length;
  });

  readonly totalConfirmadosPorSubsidio = computed(() => {
    const tipo = this.filtroSubsidio();
    const validos = tipo === 'Todos' ? this.confirmadosValidos() : this.confirmadosValidos().filter(c => c.tipo_comida_nombre === tipo);
    const extranos = tipo === 'Todos' ? this.confirmadosExtranos() : this.confirmadosExtranos().filter(c => c.tipo_comida_nombre === tipo);
    return validos.length + extranos.length;
  });

  readonly extranosPorSubsidio = computed(() => {
    const tipo = this.filtroSubsidio();
    return tipo === 'Todos' ? this.confirmadosExtranos().length : this.confirmadosExtranos().filter(c => c.tipo_comida_nombre === tipo).length;
  });

  readonly noConfirmaronPorSubsidio = computed(() => {
    return this.noConfirmaron().length;
  });

  readonly entregadasPorSubsidio = computed(() => {
    const tipo = this.filtroSubsidio();
    const confs = this.cafeteriaService.confirmaciones();
    const ents = this.cafeteriaService.activeEntregas();
    const confCodes = tipo === 'Todos'
      ? new Set(confs.map(c => c.codigo_id))
      : new Set(confs.filter(c => c.tipo_comida_nombre === tipo).map(c => c.codigo_id));
    return ents.filter(e => confCodes.has(e.codigo_id)).length;
  });

  readonly pendientesPorSubsidio = computed(() => {
    const tipo = this.filtroSubsidio();
    const confs = this.cafeteriaService.confirmaciones().filter(c => c.es_beneficiario_valido && !c.motivo_alerta);
    const filtered = tipo === 'Todos' ? confs : confs.filter(c => c.tipo_comida_nombre === tipo);
    const entregados = this.entregadasPorSubsidio();
    return Math.max(0, filtered.length - entregados);
  });

  readonly confirmadosExtranos = computed(() => {
    return this.cafeteriaService.confirmaciones().filter(c =>
      (!c.es_beneficiario_valido || c.motivo_alerta)
    ).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  });

  readonly noConfirmaron = computed(() => {
    const confCodes = new Set(this.cafeteriaService.confirmaciones().map(c => c.codigo_id));
    const tipoFiltro = this.filtroSubsidio();
    return this.cafeteriaService.filteredBeneficiarios().filter(b => {
      if (confCodes.has(b.codigo_id)) return false;
      if (tipoFiltro !== 'Todos') {
        const tipoBen = b.tipo_comida_id === 2 ? 'Almuerzo' : b.tipo_comida_id === 3 ? 'Refrigerio' : 'Desayuno';
        if (tipoBen !== tipoFiltro) return false;
      }
      return true;
    });
  });

  readonly entregadosSinConfirmar = computed(() => {
    const confCodes = new Set(this.cafeteriaService.confirmaciones().map(c => c.codigo_id));
    return this.cafeteriaService.entregas().filter(e =>
      e.estado === 'ENTREGADO' && !confCodes.has(e.codigo_id)
    );
  });

  readonly carrerasEnConfirmaciones = computed(() => {
    const confs = this.confirmadosValidos();
    return [...new Set(confs.map(c => c.carrera_nombre).filter(Boolean))].sort() as string[];
  });

  readonly carrerasEnExtranos = computed(() => {
    const confs = this.confirmadosExtranos();
    return [...new Set(confs.map(c => c.carrera_en_form || c.carrera_nombre).filter(Boolean))].sort() as string[];
  });

  readonly carrerasEnNoConfirmaron = computed(() => {
    const bens = this.noConfirmaron();
    return [...new Set(bens.map(b => b.carrera_nombre).filter(Boolean))].sort() as string[];
  });

  readonly confirmadosValidosFiltrados = computed(() => {
    let list = this.confirmadosValidos();
    const busq = this.busquedaValidos().toLowerCase().trim();
    const carrera = this.carreraValidos();
    const tipoFiltro = this.filtroSubsidio();

    if (tipoFiltro !== 'Todos') {
      list = list.filter(c => c.tipo_comida_nombre === tipoFiltro);
    }
    if (carrera !== 'TODAS') {
      list = list.filter(c => c.carrera_nombre === carrera);
    }
    if (busq) {
      list = list.filter(c =>
        c.codigo_id.toLowerCase().includes(busq) ||
        (c.beneficiario_nombre && c.beneficiario_nombre.toLowerCase().includes(busq)) ||
        (c.carrera_nombre && c.carrera_nombre.toLowerCase().includes(busq))
      );
    }
    return list;
  });

  readonly confirmadosExtranosFiltrados = computed(() => {
    let list = this.confirmadosExtranos();
    const busq = this.busquedaExtranos().toLowerCase().trim();
    const carrera = this.carreraExtranos();

    if (carrera !== 'TODAS') {
      list = list.filter(c => (c.carrera_en_form || c.carrera_nombre) === carrera);
    }
    if (busq) {
      list = list.filter(c =>
        c.codigo_id.toLowerCase().includes(busq) ||
        (c.beneficiario_nombre && c.beneficiario_nombre.toLowerCase().includes(busq))
      );
    }
    return list;
  });

  readonly noConfirmaronFiltrados = computed(() => {
    let list = this.noConfirmaron();
    const busq = this.busquedaNoConfirmaron().toLowerCase().trim();
    const carrera = this.carreraNoConfirmaron();
    if (carrera !== 'TODAS') {
      list = list.filter(b => b.carrera_nombre === carrera);
    }
    if (busq) {
      list = list.filter(b =>
        b.codigo_id.toLowerCase().includes(busq) ||
        b.nombre.toLowerCase().includes(busq) ||
        (b.carrera_nombre && b.carrera_nombre.toLowerCase().includes(busq))
      );
    }
    return list;
  });

  toggleAccordionValidos(): void { this.accordionValidosOpen.update(v => { if (!v) { this.accordionExtranosOpen.set(false); this.accordionNoConfirmaronOpen.set(false); } return !v; }); }
  toggleAccordionExtranos(): void { this.accordionExtranosOpen.update(v => { if (!v) { this.accordionValidosOpen.set(false); this.accordionNoConfirmaronOpen.set(false); } return !v; }); }
  toggleAccordionNoConfirmaron(): void { this.accordionNoConfirmaronOpen.update(v => { if (!v) { this.accordionValidosOpen.set(false); this.accordionExtranosOpen.set(false); } return !v; }); }

  getVisual(carrera: string) {
    return getVisualCarrera(carrera);
  }

  getHoraConfirmacion(fecha: string): string {
    // Formato: "1/9/2026 20:46:11" → extrae "20:46:11"
    if (!fecha) return '';
    const parts = fecha.split(' ');
    return parts.length > 1 ? parts[1] : fecha;
  }

  getInitials(name: string): string {
    if (!name) return 'ES';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  onDateChange(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    if (val) this.cafeteriaService.setSelectedDate(val);
  }

  setTodayDate(): void {
    const now = new Date();
    const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.cafeteriaService.setSelectedDate(dStr);
  }

  shiftDate(days: number): void {
    const current = this.cafeteriaService.selectedDate();
    const d = new Date(current + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.cafeteriaService.setSelectedDate(dStr);
  }

  buscarParaDespachar(): void {
    const raw = this.busquedaDespacho.value?.trim();
    if (!raw) { this.resultadoDespacho.set(null); return; }
    const code = raw.toLowerCase().replace(/^0+/g, '');
    const all = this.cafeteriaService.confirmaciones();
    const match = all.find(c => c.codigo_id.trim().toLowerCase().replace(/^0+/g, '') === code || (c.beneficiario_nombre && c.beneficiario_nombre.toLowerCase().includes(code)));
    if (match) {
      this.resultadoDespacho.set({ success: !match.entregado, message: match.entregado ? `Ya entregado a las ${match.hora_entrega}` : 'Listo para entregar', conf: match, tipo: 'confirmado' });
    } else {
      // Buscar en padrón (sin importar si confirmó o no)
      const padron = this.cafeteriaService.beneficiarios().find(b => b.codigo_id.trim().toLowerCase().replace(/^0+/g, '') === code || b.nombre.toLowerCase().includes(code));
      if (padron) {
        // Verificar si ya se le entregó hoy
        const yaEntregado = this.cafeteriaService.entregas().some(e =>
          e.codigo_id === padron.codigo_id && e.estado === 'ENTREGADO' && e.fecha === this.cafeteriaService.selectedDate()
        );
        if (yaEntregado) {
          this.resultadoDespacho.set({ success: false, message: `${padron.nombre} ya recibió su ración hoy.`, tipo: 'no_encontrado' });
        } else {
          this.resultadoDespacho.set({ success: true, message: `${padron.nombre} - ${padron.carrera_nombre || 'Sin carrera'} (sin confirmar)`, beneficiario: padron, tipo: 'sin_confirmar' });
        }
      } else {
        this.resultadoDespacho.set({ success: false, message: `Codigo [${raw}] no encontrado en padrón.`, tipo: 'no_encontrado' });
      }
    }
  }

  entregarDesdeBusqueda(): void {
    const res = this.resultadoDespacho();
    if (res?.conf && !res.conf.entregado) {
      this.entregarDirecto(res.conf);
      this.resultadoDespacho.set({ success: true, message: `Entregado! ${res.conf.beneficiario_nombre}`, conf: { ...res.conf, entregado: true }, tipo: 'confirmado' });
      this.busquedaDespacho.setValue('');
    }
  }

  async entregarDirecto(c: Confirmacion): Promise<void> {
    const result = await this.cafeteriaService.searchBeneficiarioOrConfirmacion(c.codigo_id);
    if (result) {
      await this.cafeteriaService.registrarEntrega(result);
    }
  }

  async entregarSinConfirmacion(): Promise<void> {
    const res = this.resultadoDespacho();
    if (res?.tipo === 'sin_confirmar' && res.beneficiario) {
      const result = await this.cafeteriaService.searchBeneficiarioOrConfirmacion(res.beneficiario.codigo_id);
      if (result) {
        await this.cafeteriaService.registrarEntrega(result);
        this.resultadoDespacho.set({ success: true, message: `Entregado a ${res.beneficiario.nombre} (sin confirmación)`, tipo: 'confirmado' });
        this.busquedaDespacho.setValue('');
      }
    }
  }

  async entregarDesdeNoConfirmaron(b: Beneficiario): Promise<void> {
    const result = await this.cafeteriaService.searchBeneficiarioOrConfirmacion(b.codigo_id);
    if (result) {
      await this.cafeteriaService.registrarEntrega(result);
    }
  }

  async entregarExtrano(c: Confirmacion): Promise<void> {
    const result = await this.cafeteriaService.searchBeneficiarioOrConfirmacion(c.codigo_id);
    if (result) {
      await this.cafeteriaService.registrarEntrega(result);
    }
  }

  async eliminarExtrano(c: Confirmacion): Promise<void> {
    if (!c.id) return;
    try {
      await this.supabase.deleteConfirmacion(c.id);
      this.cafeteriaService.confirmaciones.update(list =>
        list.filter(x => x.id !== c.id)
      );
    } catch (err) {
      console.error('[Confirmaciones] Error eliminando extrano:', err);
    }
  }

  // Modal correccion methods
  readonly beneficiariosEncontrados = computed(() => {
    const busq = this.busquedaCorreccion().toLowerCase().trim();
    if (busq.length < 2) return [];
    return this.cafeteriaService.beneficiarios().filter(b =>
      b.codigo_id.toLowerCase().includes(busq) ||
      b.nombre.toLowerCase().includes(busq)
    ).slice(0, 10);
  });

  abrirModalCorreccion(conf: Confirmacion): void {
    this.modalCorreccion.set({ conf });
    this.busquedaCorreccion.set('');
    this.beneficiarioSeleccionado.set(null);
  }

  cerrarModalCorreccion(): void {
    this.modalCorreccion.set(null);
    this.busquedaCorreccion.set('');
    this.beneficiarioSeleccionado.set(null);
  }

  seleccionarBeneficiario(b: Beneficiario): void {
    this.beneficiarioSeleccionado.set(b);
  }

  async aplicarCorreccion(accion: 'asociar' | 'ignorar'): Promise<void> {
    const conf = this.modalCorreccion()?.conf;
    if (!conf?.id) return;

    if (accion === 'asociar') {
      const ben = this.beneficiarioSeleccionado();
      if (!ben) return;

      // Update the confirmation record (also fix codigo_id if it differs)
      await this.supabase.updateConfirmacion(conf.id, {
        codigo_id: ben.codigo_id,
        beneficiario_id: parseInt(ben.id as any),
        motivo_alerta: null,
        es_beneficiario_valido: true,
        carrera_real: ben.carrera_nombre
      });

      // Update local state
      this.cafeteriaService.confirmaciones.update(confs =>
        confs.map(c => c.id === conf.id ? {
          ...c,
          codigo_id: ben.codigo_id,
          beneficiario_id: parseInt(ben.id as any),
          motivo_alerta: null,
          es_beneficiario_valido: true,
          carrera_nombre: ben.carrera_nombre,
          beneficiario_nombre: ben.nombre,
          carrera_real: ben.carrera_nombre
        } : c)
      );

      this.cafeteriaService.notify('success', 'Correccion Aplicada', `${String(conf.id).padStart(4, '0')} ahora esta vinculado a ${ben.nombre}`);
    } else {
      // Just ignore - mark as resolved
      await this.supabase.updateConfirmacion(conf.id, {
        motivo_alerta: null,
        es_beneficiario_valido: true
      });

      this.cafeteriaService.confirmaciones.update(confs =>
        confs.map(c => c.id === conf.id ? {
          ...c,
          motivo_alerta: null,
          es_beneficiario_valido: true
        } : c)
      );

      this.cafeteriaService.notify('success', 'Marcado como Resuelto', `${String(conf.id).padStart(4, '0')} marcado como resuelto`);
    }

    this.cerrarModalCorreccion();
  }
}
