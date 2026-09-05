import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CafeteriaService } from '../../services/cafeteria.service';
import { SupabaseService } from '../../services/supabase.service';
import { Entrega } from '../../models/cafeteria.models';
import { getVisualCarrera } from '../../models/cafeteria.models';

@Component({
  selector: 'app-entregas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, MatIconModule],
  template: `
    <div class="space-y-6">
      <!-- HEADER -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-semibold uppercase tracking-wider mb-1.5">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            Auditoria en Tiempo Real - Cafeteria Guarincito
          </span>
          <h2 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Registro de Raciones Entregadas</h2>
          <p class="text-sm text-slate-600">
            Control cronologico y auditoria con hora exacta de entrega por estudiante y programa academico.
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Exportar CSV -->
          <button
            id="btn-export-entregas-csv"
            type="button"
            (click)="cafeteriaService.exportarEntregasCsv()"
            [disabled]="filteredEntregas().length === 0"
            class="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            title="Descargar lista de entregas con hora en formato Excel / CSV"
          >
            <mat-icon [style.fontSize.px]="18" class="text-emerald-600">download</mat-icon>
            <span>Exportar Reporte (CSV)</span>
          </button>

          <!-- Imprimir -->
          <button
            id="btn-print-entregas"
            type="button"
            (click)="imprimir()"
            [disabled]="filteredEntregas().length === 0"
            class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <mat-icon [style.fontSize.px]="18">print</mat-icon>
            <span>Imprimir Reporte</span>
          </button>

          <!-- Ir a Confirmados -->
          <a
            routerLink="/app"
            class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
          >
            <mat-icon [style.fontSize.px]="18">how_to_reg</mat-icon>
            <span>Ver Confirmados</span>
          </a>
        </div>
      </div>

      <!-- STATS KPIS CARDS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. Total Entregadas -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Raciones Entregadas</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
              <mat-icon [style.fontSize.px]="20">task_alt</mat-icon>
            </div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-extrabold text-slate-900">{{ cafeteriaService.stats().totalEntregados }}</span>
            <span class="text-xs font-medium text-slate-500">
              de {{ cafeteriaService.stats().totalConfirmados }} confirmados ({{ cafeteriaService.stats().porcentaje }}%)
            </span>
          </div>
          <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
            <div
              class="bg-emerald-500 h-full rounded-full transition-all duration-500"
              [style.width.%]="cafeteriaService.stats().porcentaje"
            ></div>
          </div>
        </div>

        <!-- 2. Almuerzos Entregados -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Almuerzos (Diurno)</span>
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
              <mat-icon [style.fontSize.px]="20">lunch_dining</mat-icon>
            </div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-extrabold text-slate-900">{{ almuerzosEntregados() }}</span>
            <span class="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
              11:30 AM - 2:30 PM
            </span>
          </div>
          <p class="text-[11px] text-slate-400 mt-2">9 Programas academicos diurnos</p>
        </div>

        <!-- 3. Refrigerios Entregados -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Refrigerios (Noche)</span>
            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center">
              <mat-icon [style.fontSize.px]="20">nightlife</mat-icon>
            </div>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-2xl sm:text-3xl font-extrabold text-slate-900">{{ refrigeriosEntregados() }}</span>
            <span class="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              5:30 PM - 8:00 PM
            </span>
          </div>
          <p class="text-[11px] text-slate-400 mt-2">Admon Financiera y Trabajo Social</p>
        </div>

        <!-- 4. Rango de Horas Operativas -->
        <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horario de Entregas</span>
            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
              <mat-icon [style.fontSize.px]="20">schedule</mat-icon>
            </div>
          </div>
          <div class="mt-2 space-y-1">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 font-medium">Primera entrega:</span>
              <span class="font-semibold text-slate-800">{{ cafeteriaService.stats().primeraEntrega || 'Sin registros' }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500 font-medium">Ultima entrega:</span>
              <span class="font-semibold text-slate-800">{{ cafeteriaService.stats().ultimaEntrega || 'Sin registros' }}</span>
            </div>
          </div>
          <div class="text-[11px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
            <mat-icon [style.fontSize.px]="14">bolt</mat-icon>
            <span>Registro en tiempo real</span>
          </div>
        </div>
      </div>

      <!-- FILTROS -->
      <div class="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <!-- Tipo de Subsidio -->
          <div class="md:col-span-5">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tipo de Subsidio</span>
            <div class="bg-slate-100 p-1 rounded-lg flex items-center gap-1 border border-slate-200">
              <button type="button" (click)="filtroSubsidio.set('Todos')" class="flex-1 py-1.5 px-2.5 rounded-md text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium overflow-hidden" [class.bg-white]="filtroSubsidio() === 'Todos'" [class.text-slate-900]="filtroSubsidio() === 'Todos'" [class.font-bold]="filtroSubsidio() === 'Todos'" [class.shadow-xs]="filtroSubsidio() === 'Todos'" [class.text-slate-600]="filtroSubsidio() !== 'Todos'">
                <mat-icon [style.fontSize.px]="18" class="shrink-0">layers</mat-icon><span class="hidden sm:inline truncate">Todos</span>
              </button>
              <button type="button" (click)="filtroSubsidio.set('Almuerzo')" class="flex-1 py-1.5 px-2.5 rounded-md text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium overflow-hidden" [class.bg-white]="filtroSubsidio() === 'Almuerzo'" [class.text-emerald-700]="filtroSubsidio() === 'Almuerzo'" [class.font-bold]="filtroSubsidio() === 'Almuerzo'" [class.shadow-xs]="filtroSubsidio() === 'Almuerzo'" [class.text-slate-600]="filtroSubsidio() !== 'Almuerzo'">
                <mat-icon [style.fontSize.px]="18" class="shrink-0">wb_sunny</mat-icon><span class="hidden sm:inline truncate">Almuerzo</span>
              </button>
              <button type="button" (click)="filtroSubsidio.set('Refrigerio')" class="flex-1 py-1.5 px-2.5 rounded-md text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium overflow-hidden" [class.bg-white]="filtroSubsidio() === 'Refrigerio'" [class.text-blue-700]="filtroSubsidio() === 'Refrigerio'" [class.font-bold]="filtroSubsidio() === 'Refrigerio'" [class.shadow-xs]="filtroSubsidio() === 'Refrigerio'" [class.text-slate-600]="filtroSubsidio() !== 'Refrigerio'">
                <mat-icon [style.fontSize.px]="18" class="shrink-0">nights_stay</mat-icon><span class="hidden sm:inline truncate">Refrigerio</span>
              </button>
              <button type="button" (click)="filtroSubsidio.set('Desayuno')" class="flex-1 py-1.5 px-2.5 rounded-md text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium overflow-hidden" [class.bg-white]="filtroSubsidio() === 'Desayuno'" [class.text-orange-700]="filtroSubsidio() === 'Desayuno'" [class.font-bold]="filtroSubsidio() === 'Desayuno'" [class.shadow-xs]="filtroSubsidio() === 'Desayuno'" [class.text-slate-600]="filtroSubsidio() !== 'Desayuno'">
                <mat-icon [style.fontSize.px]="18" class="shrink-0">free_breakfast</mat-icon><span class="hidden sm:inline truncate">Desayuno</span>
              </button>
            </div>
          </div>
          <!-- Fecha -->
          <div class="md:col-span-4">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fecha de Entrega</span>
            <div class="flex items-center gap-1.5">
              <button type="button" (click)="shiftDate(-1)" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"><mat-icon [style.fontSize.px]="18">chevron_left</mat-icon></button>
              <input id="filter-entregas-fecha" type="date" [value]="cafeteriaService.selectedDate()" (change)="onDateChange($event)" class="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"/>
              <button type="button" (click)="shiftDate(1)" class="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200 transition-colors cursor-pointer"><mat-icon [style.fontSize.px]="18">chevron_right</mat-icon></button>
              <button type="button" (click)="setTodayDate()" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer">Hoy</button>
            </div>
          </div>
          <!-- Carrera -->
          <div class="md:col-span-3">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Carrera</span>
            <select id="filter-entregas-carrera" [formControl]="carreraControl" class="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none cursor-pointer">
              <option value="TODAS">Todas las carreras</option>
              @for (c of carrerasDisponibles(); track c) { <option [value]="c">{{ c }}</option> }
            </select>
          </div>
        </div>

        <!-- Busqueda + Orden -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 border-t border-slate-100">
          <div class="relative flex-1 max-w-md">
            <mat-icon [style.fontSize.px]="20" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</mat-icon>
            <input
              id="filter-entregas-search"
              type="text"
              [formControl]="searchControl"
              placeholder="Buscar por nombre, codigo o carrera..."
              class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <!-- CONF Code Search -->
          <div class="flex items-center gap-2">
            <div class="flex items-center">
              <span class="px-2.5 py-2 bg-emerald-50 border border-r-0 border-emerald-200 rounded-l-lg text-xs font-bold text-emerald-700">ID</span>
              <input type="text" [value]="busquedaConf()" (input)="busquedaConf.set($any($event.target).value)"
                (keyup.enter)="buscarConf()" placeholder="0425" maxlength="6"
                class="w-20 py-2 px-2 bg-white border border-slate-200 rounded-r-lg text-xs font-mono font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                inputmode="numeric">
            </div>
            <button (click)="buscarConf()" [disabled]="!busquedaConf()"
              class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50">
              <mat-icon [style.fontSize.px]="16">search</mat-icon>
            </button>
          </div>
          <div class="flex items-center gap-1.5 text-xs ml-auto">
            <span class="text-slate-400 font-semibold">Ordenar:</span>
            <select id="filter-entregas-orden" [formControl]="ordenControl" class="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-md px-2 py-1.5 focus:bg-white cursor-pointer">
              <option value="hora_desc">Mas recientes</option>
              <option value="hora_asc">Mas antiguos</option>
              <option value="nombre">Nombre (A-Z)</option>
              <option value="codigo">Codigo ID</option>
            </select>
          </div>
        </div>
      </div>

      <!-- TABLA DE ENTREGADOS CON HORA -->
      <div class="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center gap-2">
            <mat-icon [style.fontSize.px]="20" class="text-emerald-600">fact_check</mat-icon>
            <h3 class="text-sm font-bold text-slate-800">
              Listado de Raciones Despachadas ({{ filteredEntregas().length }})
            </h3>
          </div>
          <span class="text-xs text-slate-500 font-medium">
            Fecha: {{ cafeteriaService.selectedDate() }}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table id="table-entregas" class="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr class="bg-slate-100/75 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <th class="py-3 px-4">#</th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('hora')">
                  <span class="flex items-center gap-1">Hora de Entrega <span class="text-[9px] text-slate-400">{{ sortIcon('hora') }}</span></span>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('codigo')">
                  <span class="flex items-center gap-1">Codigo ID <span class="text-[9px] text-slate-400">{{ sortIcon('codigo') }}</span></span>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('nombre')">
                  <span class="flex items-center gap-1">Nombre del Estudiante <span class="text-[9px] text-slate-400">{{ sortIcon('nombre') }}</span></span>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('carrera')">
                  <span class="flex items-center gap-1">Programa Academico <span class="text-[9px] text-slate-400">{{ sortIcon('carrera') }}</span></span>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('tipo')">
                  <span class="flex items-center gap-1">Tipo Servicio <span class="text-[9px] text-slate-400">{{ sortIcon('tipo') }}</span></span>
                </th>
                <th class="py-3 px-4">Confirmacion</th>
                <th class="py-3 px-4">Estado</th>
                <th class="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-normal text-slate-700">
              @if (filteredEntregas().length === 0) {
                <tr>
                  <td colspan="9" class="py-12 text-center text-slate-400">
                    <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <mat-icon [style.fontSize.px]="32">task_alt</mat-icon>
                    </div>
                    <h4 class="text-base font-bold text-slate-800 mb-1">No hay raciones entregadas aun</h4>
                    <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
                      Las raciones entregadas apareceran en esta lista en tiempo real con su hora exacta una vez comiences a despachar a los estudiantes.
                    </p>
                    <div class="flex flex-wrap items-center justify-center gap-2">
                      <a
                        routerLink="/app"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <mat-icon [style.fontSize.px]="16">how_to_reg</mat-icon>
                        <span>Ir al Panel de Confirmados</span>
                      </a>
                    </div>
                  </td>
                </tr>
              } @else {
                @for (entrega of filteredEntregas(); track entrega.id || entrega.codigo_id; let idx = $index) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <!-- Indice -->
                    <td class="py-3 px-4 text-slate-400 text-xs font-mono">
                      {{ idx + 1 }}
                    </td>

                    <!-- Hora de Entrega -->
                    <td class="py-3 px-4 whitespace-nowrap">
                      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold font-mono">
                        <mat-icon [style.fontSize.px]="14" class="text-emerald-600">schedule</mat-icon>
                        <span>{{ entrega.hora.substring(0, 5) }}</span>
                      </div>
                    </td>

                    <!-- Codigo ID -->
                    <td class="py-3 px-4 whitespace-nowrap font-mono font-semibold text-slate-900">
                      <div class="flex items-center gap-1.5">
                        {{ entrega.codigo_id }}
                        @if (!entrega.confirmacion_id) {
                          <span class="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-full border border-amber-300">EXC</span>
                        }
                      </div>
                    </td>

                    <!-- Nombre Estudiante -->
                    <td class="py-3 px-4 font-semibold text-slate-900">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {{ getInitials(entrega.beneficiario_nombre || '') }}
                        </div>
                        <span class="truncate max-w-[200px] sm:max-w-xs">{{ entrega.beneficiario_nombre }}</span>
                      </div>
                    </td>

                    <!-- Carrera -->
                    <td class="py-3 px-4">
                      <div class="flex items-center gap-1.5">
                        @let visual = getVisual(entrega.carrera_nombre || '');
                        <span class="px-2 py-0.5 rounded text-[11px] font-semibold {{ visual.badgeClass }}">
                          {{ visual.nombre }}
                        </span>
                        <span class="text-[10px] text-slate-400">({{ visual.jornada }})</span>
                      </div>
                    </td>

                    <!-- Tipo Subsidio -->
                    <td class="py-3 px-4 whitespace-nowrap">
                      @if (entrega.tipo_comida_nombre === 'Almuerzo') {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <mat-icon [style.fontSize.px]="14">lunch_dining</mat-icon>
                          Almuerzo
                        </span>
                      } @else if (entrega.tipo_comida_nombre === 'Refrigerio') {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          <mat-icon [style.fontSize.px]="14">nightlife</mat-icon>
                          Refrigerio
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                          <mat-icon [style.fontSize.px]="14">free_breakfast</mat-icon>
                          Desayuno
                        </span>
                      }
                    </td>

                    <!-- Confirmacion -->
                    <td class="py-3 px-4 whitespace-nowrap">
                      @if (entrega.confirmacion_id) {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <mat-icon [style.fontSize.px]="12">verified</mat-icon>
                          CONFIRMADO
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <mat-icon [style.fontSize.px]="12">warning</mat-icon>
                          SIN CONFIRMAR
                        </span>
                      }
                    </td>

                    <!-- Estado -->
                    <td class="py-3 px-4">
                      @if (entrega.estado === 'ENTREGADO') {
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <mat-icon [style.fontSize.px]="12">check</mat-icon>
                          ENTREGADO
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-red-100 text-red-800 border border-red-300">
                          <mat-icon [style.fontSize.px]="12">undo</mat-icon>
                          REVERTIDO
                        </span>
                      }
                    </td>

                    <!-- Acciones -->
                    <td class="py-3 px-4 text-center whitespace-nowrap">
                      @if (entrega.estado === 'ENTREGADO' && entrega.id) {
                        <button
                          type="button"
                          (click)="confirmRevert(entrega)"
                          class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Revertir si se cometio una equivocacion al entregar"
                        >
                          <mat-icon [style.fontSize.px]="18">undo</mat-icon>
                        </button>
                      } @else {
                        <span class="text-[11px] text-slate-400 italic">Revertida</span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Revert Confirmation Modal -->
    @if (selectedForRevert(); as ent) {
      <div
        id="revert-modal-confirm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in"
      >
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
          <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
            <mat-icon [style.fontSize.px]="24">warning</mat-icon>
          </div>
          <h3 class="text-center font-bold text-base text-slate-900">Revertir Entrega de Racion?</h3>
          <p class="text-center text-xs text-slate-600 mt-2 leading-relaxed">
            Estas a punto de cancelar el registro de entrega de <strong>{{ ent.beneficiario_nombre }}</strong> (Codigo {{ ent.codigo_id }}) realizado a las {{ ent.hora.substring(0, 5) }}.
          </p>

          <div class="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              (click)="selectedForRevert.set(null)"
              class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="executeRevert(ent.id!)"
              class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
            >
              <mat-icon [style.fontSize.px]="16">undo</mat-icon>
              <span>Si, Revertir Entrega</span>
            </button>
          </div>
        </div>
      </div>
    }

    <!-- CONF SEARCH RESULT MODAL -->
    @if (resultadoConf()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full border" [class]="resultadoConf()?.existe ? 'border-emerald-200' : 'border-red-200'">
          @if (resultadoConf()?.existe) {
            <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 text-center rounded-t-2xl">
              <mat-icon class="text-white text-4xl mb-2">check_circle</mat-icon>
              <h3 class="text-lg font-bold text-white">{{ resultadoConf()?.confId }}</h3>
              <p class="text-emerald-100 text-sm">Confirmacion valida</p>
            </div>
            <div class="p-5 space-y-3">
              <div class="flex justify-between text-sm"><span class="text-slate-500">Codigo:</span><span class="font-mono font-bold text-slate-800">{{ resultadoConf()?.codigo }}</span></div>
              <div class="flex justify-between text-sm"><span class="text-slate-500">Nombre:</span><span class="font-semibold text-slate-800">{{ resultadoConf()?.nombre }}</span></div>
              <div class="flex justify-between text-sm"><span class="text-slate-500">Carrera:</span><span class="font-semibold text-slate-800">{{ resultadoConf()?.carrera }}</span></div>
              <div class="flex justify-between text-sm"><span class="text-slate-500">Tipo:</span><span class="font-semibold text-slate-800">{{ resultadoConf()?.tipo }}</span></div>
              <div class="flex justify-between text-sm"><span class="text-slate-500">Hora:</span><span class="font-mono font-bold text-slate-800">{{ resultadoConf()?.hora }}</span></div>
            </div>
          } @else {
            <div class="bg-gradient-to-r from-red-500 to-red-600 p-5 text-center rounded-t-2xl">
              <mat-icon class="text-white text-4xl mb-2">cancel</mat-icon>
              <h3 class="text-lg font-bold text-white">No Encontrado</h3>
              <p class="text-red-100 text-sm">{{ resultadoConf()?.mensaje }}</p>
            </div>
          }
          <div class="p-4 border-t border-slate-100">
            <button (click)="resultadoConf.set(null)" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer">Cerrar</button>
          </div>
        </div>
      </div>
    }
  `
})
export class Entregas {
  readonly cafeteriaService = inject(CafeteriaService);
  private readonly supabase = inject(SupabaseService);

  readonly searchControl = new FormControl<string>('');
  readonly carreraControl = new FormControl<string>('TODAS', { nonNullable: true });
  readonly ordenControl = new FormControl<string>('hora_desc', { nonNullable: true });

  readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  readonly selectedCarrera = toSignal(this.carreraControl.valueChanges, { initialValue: 'TODAS' });
  readonly selectedOrden = toSignal(this.ordenControl.valueChanges, { initialValue: 'hora_desc' });
  readonly filtroSubsidio = signal<string>('Todos');
  readonly busquedaConf = signal('');
  readonly resultadoConf = signal<{existe: boolean; confId?: number; codigo?: string; nombre?: string; carrera?: string; hora?: string; tipo?: string; mensaje?: string} | null>(null);

  readonly selectedForRevert = signal<Entrega | null>(null);
  readonly sortColumn = signal<string>('hora');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  readonly carrerasDisponibles = computed(() => {
    const list = this.cafeteriaService.beneficiarios();
    const carreras = [...new Set(list.map(b => b.carrera_nombre).filter(c => c && c !== 'PROGRAMA ACADEMICO'))];
    return carreras.sort();
  });

  readonly almuerzosEntregados = computed(() =>
    this.cafeteriaService.entregas().filter(e => e.tipo_comida_nombre === 'Almuerzo').length
  );

  readonly refrigeriosEntregados = computed(() =>
    this.cafeteriaService.entregas().filter(e => e.tipo_comida_nombre === 'Refrigerio').length
  );

  readonly filteredEntregas = computed(() => {
    const list = this.cafeteriaService.entregas();
    const query = (this.searchQuery() || '').trim().toLowerCase();
    const carrera = this.selectedCarrera() || 'TODAS';
    const subsidio = this.filtroSubsidio();
    const orden = this.selectedOrden() || 'hora_desc';

    let filtered = list.filter(e => {
      if (query) {
        const normCode = this.cafeteriaService.normalizeCode(e.codigo_id);
        const matchCode = e.codigo_id.includes(query) || normCode.includes(query);
        const matchName = e.beneficiario_nombre?.toLowerCase().includes(query);
        const matchCarrera = e.carrera_nombre?.toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchCarrera) return false;
      }

      if (carrera !== 'TODAS') {
        if (e.carrera_nombre !== carrera) return false;
      }

      if (subsidio !== 'Todos') {
        if (e.tipo_comida_nombre !== subsidio) return false;
      }

      return true;
    });

    // Sort
    const [col, dir] = orden.split('_');
    if (col && dir) {
      filtered.sort((a, b) => {
        let av: string;
        let bv: string;
        switch (col) {
          case 'hora': av = a.hora; bv = b.hora; break;
          case 'codigo': av = a.codigo_id; bv = b.codigo_id; break;
          case 'nombre': av = a.beneficiario_nombre || ''; bv = b.beneficiario_nombre || ''; break;
          case 'carrera': av = a.carrera_nombre || ''; bv = b.carrera_nombre || ''; break;
          default: return 0;
        }
        const cmp = av.localeCompare(bv, 'es', { sensitivity: 'base' });
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    return filtered;
  });

  onSort(col: string): void {
    if (this.sortColumn() === col) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(col: string): string {
    if (this.sortColumn() !== col) return '';
    return this.sortDirection() === 'asc' ? '\u25B2' : '\u25BC';
  }

  getVisual(carrera: string) {
    return getVisualCarrera(carrera);
  }

  getInitials(name: string): string {
    if (!name) return 'ES';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  onDateChange(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    if (val) this.cafeteriaService.selectedDate.set(val);
  }

  setTodayDate(): void {
    const now = new Date();
    const dStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.cafeteriaService.selectedDate.set(dStr);
  }

  shiftDate(days: number): void {
    const current = this.cafeteriaService.selectedDate();
    const d = new Date(current + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.cafeteriaService.selectedDate.set(dStr);
  }

  confirmRevert(entrega: Entrega): void {
    this.selectedForRevert.set(entrega);
  }

  async executeRevert(entregaId: number): Promise<void> {
    await this.cafeteriaService.revertirEntrega(entregaId);
    this.selectedForRevert.set(null);
  }

  imprimir(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  async buscarConf() {
    const input = this.busquedaConf().trim();
    if (!input) {
      this.resultadoConf.set(null);
      return;
    }

    const confId = parseInt(input, 10);
    if (isNaN(confId)) {
      this.resultadoConf.set({ existe: false, mensaje: 'Ingresa solo numeros (ej: 0425)' });
      return;
    }

    const data = await this.supabase.fetchConfirmacionById(confId);
    if (data) {
      const tipo = data.tipo_comida_id === 2 ? 'Almuerzo' : 'Refrigerio';
      this.resultadoConf.set({
        existe: true,
        confId: data.id,
        codigo: data.codigo_id,
        nombre: data.nombre_en_form || data.beneficiario_nombre || 'Sin nombre',
        carrera: data.carrera_en_form || data.carrera_nombre || 'Sin carrera',
        hora: data.fecha?.split(' ')[1] || '',
        tipo
      });
    } else {
      this.resultadoConf.set({
        existe: false,
        mensaje: `No se encontro la confirmacion ${String(confId).padStart(4, '0')}.`
      });
    }
  }
}
