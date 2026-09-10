import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceService } from '../../services/attendance.service';
import { ValidAttendanceRecord } from '../../models/attendance.models';

interface WeekConfig {
  id: number;
  weeks: number;
  selectedWeeks: string[];
  selectedOrgs: Set<string>;
}

@Component({
  selector: 'app-monthly-matrix',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4">
      <!-- Filter and Control Toolbar -->
      <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        
        <!-- Top Row: Search and Actions -->
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <!-- Search box -->
          <div class="relative min-w-[240px] flex-1 max-w-sm">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <mat-icon class="text-lg">search</mat-icon>
            </span>
            <input
              type="text"
              id="input-search-beneficiary"
              [value]="service.searchTerm()"
              (input)="onSearchInput($event)"
              placeholder="Buscar por nombre, ID o código..."
              class="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" />
            @if (service.searchTerm()) {
              <button
                type="button"
                (click)="clearSearch()"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600">
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            }
          </div>

          <!-- Export Buttons -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="exportCsv()"
              id="btn-export-matrix-csv"
              class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs shadow-indigo-100">
              <mat-icon class="text-base">download</mat-icon>
              <span>CSV</span>
            </button>
            <div class="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
              <mat-icon class="text-sm text-emerald-600">date_range</mat-icon>
              <select
                [value]="service.exportWeeksCount()"
                (change)="onWeeksCountChange($event)"
                class="text-xs font-bold text-emerald-800 bg-transparent border-none outline-none cursor-pointer pr-1">
                <option [value]="1">1 semana</option>
                <option [value]="2">2 semanas</option>
                <option [value]="3">3 semanas</option>
                <option [value]="4">4 semanas</option>
                <option [value]="6">6 semanas</option>
                <option [value]="8">8 semanas</option>
              </select>
            </div>
            <button
              type="button"
              (click)="exportExcelByOrg()"
              id="btn-export-excel-org"
              class="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs shadow-emerald-100">
              <mat-icon class="text-base">table_chart</mat-icon>
              <span>Excel por Org</span>
            </button>
          </div>

          <!-- Visual Week Selector -->
          <div class="flex flex-wrap items-center gap-2 mt-3">
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Semanas disponibles:</span>
            <div class="flex gap-1">
              @for (week of service.availableWeeks(); track week.startDate; let i = $index) {
                @if (i >= service.currentWeekIndex() && i < service.currentWeekIndex() + service.exportWeeksCount()) {
                  <div class="px-2 py-1 text-[10px] font-bold rounded border-2 border-emerald-500 bg-emerald-100 text-emerald-700">
                    {{ formatWeekLabel(week.startDate) }}
                  </div>
                } @else {
                  <div class="px-2 py-1 text-[10px] font-medium rounded border border-slate-200 bg-slate-50 text-slate-400">
                    {{ formatWeekLabel(week.startDate) }}
                  </div>
                }
              }
            </div>
            <span class="text-[9px] text-slate-400 font-mono">(Seleccionadas: {{ service.exportWeeksCount() }})</span>
          </div>
        </div>

        <!-- Organization Pills/Chips Selection -->
        <div class="border-t border-slate-100 pt-4">
          <div class="flex items-center gap-2 mb-3">
            <mat-icon class="text-sm text-slate-400">business</mat-icon>
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filtrar por Organización/Carrera:</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <!-- ALL pill -->
            <button
              type="button"
              (click)="service.toggleOrganization('ALL')"
              [class]="service.selectedOrganizations().has('ALL') 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-100' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all cursor-pointer">
                <mat-icon class="text-xs">groups</mat-icon>
                <span>Todas</span>
                <span class="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  [class]="service.selectedOrganizations().has('ALL') ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'">
                  {{ service.beneficiaries().length }}
                </span>
            </button>
            
            <!-- Individual org pills -->
            @for (org of service.organizations(); track org) {
              <button
                type="button"
                (click)="service.toggleOrganization(org)"
                [class]="service.selectedOrganizations().has(org) 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-100' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all cursor-pointer">
                  <span>{{ formatOrgShort(org) }}</span>
                  <span class="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    [class]="service.selectedOrganizations().has(org) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'">
                    {{ getOrgCount(org) }}
                  </span>
              </button>
            }
          </div>
          @if (!service.selectedOrganizations().has('ALL')) {
            <div class="mt-2 text-[10px] text-slate-500 font-mono">
              Mostrando {{ getFilteredBeneficiaryCount() }} beneficiarios de {{ service.beneficiaries().length }} totales
            </div>
          }
        </div>

        <!-- Weeks per Career Configuration -->
        <div class="border-t border-slate-100 pt-4 mt-4">
          <div class="flex items-center gap-2 mb-3">
            <mat-icon class="text-sm text-slate-400">date_range</mat-icon>
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Semanas por Carrera (Exportación):</span>
          </div>
          
          <!-- Add week configuration button -->
          <button
            type="button"
            (click)="addWeekConfig()"
            class="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-600 transition-all cursor-pointer">
            <mat-icon class="text-sm">add</mat-icon>
            Agregar Configuración
          </button>

          <!-- Week configurations -->
          <div class="flex flex-col gap-3">
            @for (config of weekConfigs(); track config.id) {
              <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-slate-700">Configuración {{ config.id + 1 }}</span>
                    <span class="text-[9px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{{ config.weeks }} semana(s)</span>
                    <span class="text-[9px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{{ config.selectedOrgs.size }} carrera(s)</span>
                  </div>
                  <button
                    type="button"
                    (click)="removeWeekConfig(config.id)"
                    class="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer"
                    title="Eliminar configuración">
                    <mat-icon class="text-sm">close</mat-icon>
                  </button>
                </div>
                
                <!-- Week select -->
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-[10px] text-slate-600">Semanas:</span>
                  <select
                    [value]="config.weeks"
                    (change)="updateWeekConfigWeeks(config.id, $event)"
                    class="text-[11px] font-bold text-indigo-700 bg-white border border-slate-300 rounded px-2 py-1 outline-none cursor-pointer">
                    <option [value]="1">1 semana</option>
                    <option [value]="2">2 semanas</option>
                    <option [value]="3">3 semanas</option>
                    <option [value]="4">4 semanas</option>
                    <option [value]="6">6 semanas</option>
                    <option [value]="8">8 semanas</option>
                  </select>
                </div>

                <!-- Clickable week indicators -->
                <div class="flex flex-wrap gap-1.5 mb-2">
                  @for (week of service.availableWeeks(); track week.startDate; let wi = $index) {
                    @if (wi >= service.currentWeekIndex() && wi < service.currentWeekIndex() + service.exportWeeksCount()) {
                      <button
                        type="button"
                        (click)="toggleConfigWeek(config.id, week.startDate)"
                        [class]="isConfigWeekSelected(config.id, week.startDate) 
                          ? 'ring-2 ring-offset-1 scale-110' 
                          : 'opacity-30 hover:opacity-60'"
                        [style.background]="getWeekColor(wi)"
                        [style.ring-color]="isConfigWeekSelected(config.id, week.startDate) ? getWeekColor(wi) : 'transparent'"
                        class="w-5 h-5 rounded-full cursor-pointer transition-all border-0"
                        [title]="formatWeekLabel(week.startDate) + (isConfigWeekSelected(config.id, week.startDate) ? ' (seleccionada)' : ' (no seleccionada)')">
                      </button>
                    }
                  }
                </div>

                <!-- Organization selector -->
                <div class="border-t border-slate-200 pt-2 mt-2">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[10px] text-slate-600 font-medium">Carreras:</span>
                    <button
                      type="button"
                      (click)="selectAllOrgs(config.id)"
                      class="text-[9px] text-indigo-600 hover:text-indigo-800 underline cursor-pointer">
                      Seleccionar todas
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-1">
                    @for (org of service.organizations(); track org) {
                      <button
                        type="button"
                        (click)="toggleConfigOrg(config.id, org)"
                        [class]="isConfigOrgSelected(config.id, org)
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-slate-100 text-slate-400 border-slate-200 line-through'"
                        class="text-[9px] px-1.5 py-0.5 rounded border cursor-pointer transition-all truncate max-w-[120px]"
                        [title]="org">
                        {{ formatOrgShort(org) }}
                      </button>
                    }
                  </div>
                </div>
                
                <!-- Selected weeks preview -->
                <div class="mt-2 flex flex-wrap gap-1">
                  @for (weekStart of config.selectedWeeks; track weekStart) {
                    <span class="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                      {{ formatWeekLabel(weekStart) }}
                    </span>
                  }
                  @if (config.selectedWeeks.length === 0) {
                    <span class="text-[9px] text-slate-400 italic">Sin semanas seleccionadas</span>
                  }
                </div>
              </div>
            }
          </div>
          
          <div class="mt-2 text-[9px] text-slate-400 font-mono">
            Haz clic en los puntos para seleccionar semanas. Cada configuración exportará las semanas marcadas.
          </div>
        </div>
      </div>

      <!-- Week Navigation & Matrix Table Card -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        <!-- Week Navigation Header -->
        <div class="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex items-center bg-white rounded border border-slate-200 p-1">
              <button
                type="button"
                (click)="service.prevWeek()"
                [disabled]="service.currentWeekIndex() === 0"
                class="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Semana Anterior">
                <mat-icon class="text-lg">chevron_left</mat-icon>
              </button>
              <div class="px-3 text-center min-w-[180px]">
                <div class="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                  {{ formatWeekRange() }}
                </div>
                <div class="text-[10px] text-slate-500 font-mono">
                  Semana {{ service.currentWeekIndex() + 1 }} de {{ service.availableWeeks().length }}
                </div>
              </div>
              <button
                type="button"
                (click)="service.nextWeek()"
                [disabled]="service.currentWeekIndex() === service.availableWeeks().length - 1"
                class="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Semana Siguiente">
                <mat-icon class="text-lg">chevron_right</mat-icon>
              </button>
            </div>
          </div>

          <div class="flex items-center flex-wrap gap-3">
            <!-- Weekly Stats Counter -->
            @if (service.weeklyMatrix().totalBeneficiariesInMatrix > 0) {
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-mono font-bold">
                <mat-icon class="text-xs text-indigo-700">groups</mat-icon>
                <span class="text-indigo-700 uppercase text-[10px] tracking-wider">ASISTENCIA SEMANAL:</span>
                <span>{{ service.weeklyMatrix().beneficiariesWithAtLeastOneLunch }} / {{ service.weeklyMatrix().totalBeneficiariesInMatrix }}</span>
                <span class="text-indigo-600 font-normal">({{ service.weeklyMatrix().weeklyParticipationRate }}%)</span>
              </div>
            }

            <!-- Legend -->
            <div class="flex items-center gap-3 text-xs text-slate-600 font-medium">
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span class="text-[11px]">Almuerzo Servido</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                <span class="text-[11px]">Sin Asistencia</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Scrollable Table Container -->
        @if (service.weeklyMatrix().summaries.length > 0) {
          <div class="overflow-x-auto max-h-[600px] scrollbar-thin">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100 text-slate-700 sticky top-0 z-20 backdrop-blur-md border-b border-slate-200">
                <tr>
                  <th class="p-3 font-bold font-mono text-[11px] uppercase tracking-wider sticky left-0 bg-slate-100 z-20 min-w-[100px]">ID Persona</th>
                  <th class="p-3 font-bold font-mono text-[11px] uppercase tracking-wider sticky left-[100px] bg-slate-100 z-20 min-w-[200px]">Beneficiario</th>
                  <th class="p-3 font-bold font-mono text-[11px] uppercase tracking-wider min-w-[150px]">Organización</th>
                  <th class="p-3 font-bold font-mono text-[11px] uppercase tracking-wider text-center min-w-[100px]">Asistencia Semanal</th>
                  
                  <!-- Dynamic Columns for each day in week -->
                  @for (day of service.weeklyMatrix().days; track day) {
                    <th class="p-2 text-center min-w-[120px] border-l border-slate-200 font-mono">
                      <div class="text-[11px] font-bold text-slate-900">{{ formatDayHeader(day) }}</div>
                      <div class="text-[10px] text-slate-500 font-normal">{{ formatDateShort(day) }}</div>
                      @if (service.weeklyMatrix().dayAttendanceTotals[day]; as dayStat) {
                        <div class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-indigo-900 border border-slate-200 text-[10px] font-bold">
                          <span>{{ dayStat.attended }}/{{ dayStat.total }}</span>
                        </div>
                      }
                    </th>
                  }

                  <th class="p-3 font-bold font-mono text-[11px] uppercase tracking-wider text-center min-w-[90px]">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of service.weeklyMatrix().summaries; track item.beneficiary.normalizedId) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    
                    <!-- ID Cell (Sticky) -->
                    <td class="p-3 font-mono font-bold text-slate-900 sticky left-0 bg-white hover:bg-slate-50 z-10">
                      {{ item.beneficiary.normalizedId }}
                    </td>

                    <!-- Name Cell (Sticky) -->
                    <td class="p-3 font-semibold text-slate-900 sticky left-[100px] bg-white hover:bg-slate-50 z-10">
                      <div class="truncate max-w-[220px]" [title]="item.beneficiary.name">
                        {{ item.beneficiary.name }}
                      </div>
                    </td>

                    <!-- Organization -->
                    <td class="p-3 text-slate-600">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 truncate max-w-[160px]" [title]="item.beneficiary.organization">
                        {{ formatOrg(item.beneficiary.organization) }}
                      </span>
                    </td>

                    <!-- Attendance Summary Rate -->
                    <td class="p-3 text-center">
                      <div class="flex flex-col items-center gap-1">
                        <div class="flex items-center gap-1.5">
                          <span class="font-bold text-slate-900 font-mono">{{ item.daysAttended }}/{{ item.totalDaysWithLogs }}</span>
                          <span [class]="getRateBadgeClass(item.attendanceRate)" class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                            {{ item.attendanceRate }}%
                          </span>
                        </div>
                        <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            class="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                            [style.width.%]="item.attendanceRate">
                          </div>
                        </div>
                      </div>
                    </td>

                    <!-- Daily Cells -->
                    @for (day of service.weeklyMatrix().days; track day) {
                      <td class="p-2 text-center border-l border-slate-100">
                        @if (item.attendanceByDate[day]; as rec) {
                          <button
                            type="button"
                            class="inline-flex flex-col items-center justify-center p-2 rounded bg-green-50 border border-green-200 text-green-950 shadow-2xs hover:bg-green-100 transition-all cursor-pointer group relative w-full"
                            (click)="viewDayDetail(day)"
                            [title]="getTooltip(rec)">
                            <div class="flex items-center gap-1 font-bold font-mono text-[11px] text-green-800">
                              <mat-icon class="text-xs text-green-600">check_circle</mat-icon>
                              <span>{{ formatShortTime(rec.firstTimeStr) }}</span>
                            </div>
                            @if (rec.totalAttemptsToday > 1) {
                              <span class="text-[9px] font-mono font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded mt-0.5" title="Múltiples marcaciones registradas en el biométrico">
                                +{{ rec.totalAttemptsToday - 1 }} dup
                              </span>
                            }
                          </button>
                        } @else {
                          <div class="inline-flex items-center justify-center w-8 h-8 text-slate-300 font-mono text-xs">
                            —
                          </div>
                        }
                      </td>
                    }

                    <!-- Action Cell -->
                    <td class="p-3 text-center">
                      <button
                        type="button"
                        (click)="viewBeneficiaryCalendar(item.beneficiary.normalizedId)"
                        class="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                        title="Ver calendario individual de este beneficiario">
                        <mat-icon class="text-base">calendar_month</mat-icon>
                      </button>
                    </td>

                  </tr>
                }
              </tbody>
              <!-- Matrix Footer Row with Total Attendance Counts -->
              <tfoot class="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-20">
                <tr>
                  <td class="p-3 sticky left-0 bg-slate-100 z-20 text-[11px] uppercase tracking-wider text-slate-700" colspan="3">
                    TOTAL ASISTENCIA SEMANAL (ASISTIERON / DEL TOTAL)
                  </td>
                  <td class="p-3 text-center bg-slate-100 font-mono text-xs text-indigo-900">
                    {{ service.weeklyMatrix().beneficiariesWithAtLeastOneLunch }} / {{ service.weeklyMatrix().totalBeneficiariesInMatrix }}
                  </td>
                  @for (day of service.weeklyMatrix().days; track day) {
                    <td class="p-2.5 text-center border-l border-slate-200 bg-slate-100">
                      @if (service.weeklyMatrix().dayAttendanceTotals[day]; as dayStat) {
                        <div class="flex flex-col items-center">
                          <span class="text-xs font-bold text-slate-900">{{ dayStat.attended }} / {{ dayStat.total }}</span>
                          <span class="text-[10px] text-green-700 font-medium">({{ dayStat.percentage }}%)</span>
                        </div>
                      }
                    </td>
                  }
                  <td class="p-3 text-center bg-slate-100"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        } @else {
          <div class="p-12 text-center text-slate-500">
            @if (service.beneficiaries().length === 0) {
              <div class="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 mx-auto mb-3">
                <mat-icon class="text-2xl">cloud_upload</mat-icon>
              </div>
              <p class="text-sm font-bold text-slate-800 uppercase font-mono">Sin datos cargados en el sistema</p>
              <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Carga el archivo de <strong>Padrón de Beneficiarios</strong> y los <strong>Logs Diarios de Asistencia</strong> en el panel superior para generar la matriz semanal.
              </p>
            } @else {
              <mat-icon class="text-4xl text-slate-300 mb-2">search_off</mat-icon>
              <p class="text-sm font-medium text-slate-700">No se encontraron beneficiarios con los filtros aplicados</p>
              <p class="text-xs text-slate-400 mt-1">Prueba cambiando los términos de búsqueda o seleccionando otra organización.</p>
            }
          </div>
        }

      </div>
    </div>
  `
})
export class MonthlyMatrixComponent {
  readonly service = inject(AttendanceService);
  
  // Week configurations for export
  readonly weekConfigs = signal<WeekConfig[]>([]);
  private nextConfigId = 0;

  addWeekConfig() {
    const configs = this.weekConfigs();
    const allOrgs = new Set(this.service.organizations());
    const newConfig: WeekConfig = {
      id: this.nextConfigId++,
      weeks: 1,
      selectedWeeks: [],
      selectedOrgs: allOrgs
    };
    this.weekConfigs.set([...configs, newConfig]);
  }

  removeWeekConfig(id: number) {
    const configs = this.weekConfigs().filter(c => c.id !== id);
    this.weekConfigs.set(configs);
  }

  updateWeekConfigWeeks(id: number, event: Event) {
    const select = event.target as HTMLSelectElement;
    const weeks = parseInt(select.value, 10);
    const configs = this.weekConfigs().map(c => 
      c.id === id ? { ...c, weeks } : c
    );
    this.weekConfigs.set(configs);
  }

  toggleConfigOrg(configId: number, org: string) {
    const configs = this.weekConfigs().map(c => {
      if (c.id !== configId) return c;
      
      const selected = new Set(c.selectedOrgs);
      if (selected.has(org)) {
        selected.delete(org);
      } else {
        selected.add(org);
      }
      return { ...c, selectedOrgs: selected };
    });
    this.weekConfigs.set(configs);
  }

  isConfigOrgSelected(configId: number, org: string): boolean {
    const config = this.weekConfigs().find(c => c.id === configId);
    return config?.selectedOrgs.has(org) ?? true;
  }

  selectAllOrgs(configId: number) {
    const configs = this.weekConfigs().map(c => {
      if (c.id !== configId) return c;
      return { ...c, selectedOrgs: new Set(this.service.organizations()) };
    });
    this.weekConfigs.set(configs);
  }

  toggleConfigWeek(configId: number, weekStartDate: string) {
    const configs = this.weekConfigs().map(c => {
      if (c.id !== configId) return c;
      
      const selected = [...c.selectedWeeks];
      const idx = selected.indexOf(weekStartDate);
      if (idx >= 0) {
        selected.splice(idx, 1);
      } else {
        selected.push(weekStartDate);
        selected.sort();
      }
      return { ...c, selectedWeeks: selected };
    });
    this.weekConfigs.set(configs);
  }

  isConfigWeekSelected(configId: number, weekStartDate: string): boolean {
    const config = this.weekConfigs().find(c => c.id === configId);
    if (!config || config.selectedWeeks.length === 0) {
      // Default: select last N weeks
      const weeks = this.service.availableWeeks();
      const startIdx = this.service.currentWeekIndex();
      const endIdx = Math.min(startIdx + this.service.exportWeeksCount(), weeks.length);
      const orgStartIdx = Math.max(endIdx - config!.weeks, startIdx);
      return weeks.findIndex(w => w.startDate === weekStartDate) >= orgStartIdx;
    }
    return config.selectedWeeks.includes(weekStartDate);
  }

  onSearchInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.service.searchTerm.set(input.value);
  }

  clearSearch() {
    this.service.searchTerm.set('');
  }

  formatOrgShort(org: string): string {
    if (!org) return 'Sin Depto';
    const parts = org.replace(/^UNIVERSIDAD\//i, '').split('/');
    const lastPart = parts[parts.length - 1] || org;
    return lastPart.replace(/_/g, ' ').substring(0, 25);
  }

  formatWeekLabel(startDate: string): string {
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const startDay = start.getDate();
    const endDay = end.getDate();
    const monthShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][start.getMonth()];
    
    return `${startDay}-${endDay} ${monthShort}`;
  }

  getOrgWeekStartIndex(org: string): number {
    const orgWeeks = this.service.getOrgWeeks(org);
    const maxWeeks = this.service.exportWeeksCount();
    const totalWeeks = this.service.availableWeeks().length;
    const endIdx = Math.min(this.service.currentWeekIndex() + maxWeeks, totalWeeks);
    const startIdx = Math.max(endIdx - orgWeeks, this.service.currentWeekIndex());
    return startIdx;
  }

  getWeekColor(weekIndex: number): string {
    const colors = ['#16A34A', '#2563EB', '#D97706', '#DB2777', '#7C3AED', '#0D9488'];
    return colors[weekIndex % colors.length];
  }

  getOrgCount(org: string): number {
    return this.service.beneficiaries().filter(b => b.organization === org).length;
  }

  getFilteredBeneficiaryCount(): number {
    return this.service.weeklyMatrix().summaries.length;
  }

  formatWeekRange(): string {
    const weeks = this.service.availableWeeks();
    const idx = this.service.currentWeekIndex();
    if (weeks.length === 0 || !weeks[idx]) return 'Sin datos';
    
    const week = weeks[idx];
    const start = new Date(week.startDate + 'T12:00:00');
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const startStr = start.toLocaleDateString('es-ES', options);
    const endStr = end.toLocaleDateString('es-ES', options);
    
    return `${startStr} — ${endStr}`;
  }

  formatOrg(org: string): string {
    if (!org) return 'Sin Depto';
    return org.replace(/^UNIVERSIDAD\//i, '').replace(/_/g, ' ');
  }

  formatDayHeader(dateStr: string): string {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    try {
      const d = new Date(dateStr + 'T12:00:00');
      const dayName = days[d.getDay()];
      return dayName;
    } catch {
      return dateStr;
    }
  }

  formatDateShort(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  formatShortTime(timeStr: string): string {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  }

  getRateBadgeClass(rate: number): string {
    if (rate >= 80) return 'bg-emerald-100 text-emerald-800';
    if (rate >= 50) return 'bg-blue-100 text-blue-800';
    if (rate > 0) return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-600';
  }

  getTooltip(rec: ValidAttendanceRecord): string {
    let text = `Hora: ${rec.firstTimeStr}\nPunto: ${rec.verificationPoint}`;
    if (rec.totalAttemptsToday > 1) {
      text += `\nTotal intentos biométricos: ${rec.totalAttemptsToday} (1 válido + ${rec.totalAttemptsToday - 1} duplicados filtrados)`;
    }
    return text;
  }

  viewBeneficiaryCalendar(id: string) {
    this.service.selectedBeneficiaryId.set(id);
    this.service.activeTab.set('calendar');
  }

  viewDayDetail(dateStr: string) {
    this.service.selectedDate.set(dateStr);
    this.service.activeTab.set('daily');
  }

  exportCsv() {
    const csv = this.service.exportMatrixToCsv();
    const month = this.service.selectedMonth();
    this.service.downloadCsv(csv, `Reporte_Almuerzos_${month}.csv`);
  }

  onWeeksCountChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.service.exportWeeksCount.set(parseInt(select.value, 10));
  }

  onOrgWeeksChange(org: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    const weeks = parseInt(select.value, 10);
    this.service.setOrgWeeks(org, weeks);
  }

  exportExcelByOrg() {
    // Apply week configurations to service before export
    const configs = this.weekConfigs();
    const orgConfigsMap = new Map<string, { weeks: number; selectedWeeks: string[] }>();
    
    for (const config of configs) {
      for (const org of config.selectedOrgs) {
        orgConfigsMap.set(org, {
          weeks: config.weeks,
          selectedWeeks: config.selectedWeeks
        });
      }
    }
    
    this.service.setExportConfigs(orgConfigsMap);
    this.service.exportMatrixByOrganizationExcel();
  }
}
