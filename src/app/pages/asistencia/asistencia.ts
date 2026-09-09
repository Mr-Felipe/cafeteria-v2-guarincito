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
  selector: 'app-asistencia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-slate-50 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold font-mono shadow-xs">LR</div>
          <div>
            <h1 class="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Control de Asistencia
              <span class="text-xs font-normal text-slate-400">|</span>
              <span class="text-sm font-semibold text-slate-700">LunchReport</span>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">IVMS-4200</span>
            </h1>
            <p class="text-[11px] text-slate-500">Conciliación de beneficiarios y registros biométricos con filtro de duplicados</p>
          </div>
        </div>
      </div>

      <!-- Quick Stats Bar -->
      @if (service.stats().totalBeneficiaries > 0 || service.stats().totalRawLogs > 0) {
        <div class="py-2 px-3 mb-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div class="flex items-center flex-wrap gap-2.5 sm:gap-3.5">
            <div class="flex items-center gap-2">
              <div class="flex -space-x-1.5">
                <div class="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600">U</div>
                <div class="w-6 h-6 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-[8px] font-bold text-slate-700">A</div>
                <div class="w-6 h-6 rounded-full border-2 border-white bg-indigo-600 flex items-center justify-center text-[8px] text-white font-bold font-mono">+{{ service.beneficiaries().length > 3 ? service.beneficiaries().length - 2 : service.beneficiaries().length }}</div>
              </div>
              <span class="text-xs font-semibold text-slate-800 font-mono">{{ service.stats().totalBeneficiaries }} <span class="font-sans font-normal text-slate-500">en padrón</span></span>
            </div>
            <div class="h-4 w-px bg-slate-200 hidden sm:block"></div>
            <div class="px-2.5 py-1 bg-indigo-50 text-indigo-900 text-xs font-bold rounded border border-indigo-200 flex items-center gap-1.5">
              <mat-icon class="text-xs text-indigo-700">how_to_reg</mat-icon>
              <span class="font-mono text-indigo-700 uppercase text-[10px] tracking-wider">ASISTENCIA:</span>
              <span class="font-mono font-extrabold text-indigo-900">{{ service.stats().totalBeneficiariesAttended }} / {{ service.stats().totalBeneficiaries }}</span>
              <span class="text-[10px] text-indigo-600 font-mono">({{ service.stats().overallAttendanceRate }}%)</span>
            </div>
            <div class="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded border border-green-200 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <span>{{ service.stats().totalValidLunches }} Almuerzos Servidos</span>
            </div>
            @if (service.stats().totalDuplicatesFiltered > 0) {
              <div class="px-2.5 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded border border-amber-200 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                <span>{{ service.stats().totalDuplicatesFiltered }} Duplicados Filtrados</span>
              </div>
            }
            @if (service.stats().totalUnregisteredPersons > 0) {
              <div class="px-2.5 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded border border-rose-200 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                <span>{{ service.stats().totalUnregisteredPersons }} No Registrados</span>
              </div>
            }
          </div>
          @if (service.stats().dateRange; as range) {
            <div class="flex items-center gap-1.5 text-slate-500 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
              <mat-icon class="text-xs text-slate-400">date_range</mat-icon>
              <span>{{ range.start }} → {{ range.end }}</span>
            </div>
          }
        </div>
      }

      <!-- Action Buttons -->
      <div class="flex items-center flex-wrap gap-2 mb-4">
        <button type="button" (click)="loadDemo()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded text-slate-700 bg-white hover:bg-slate-50 transition-colors border border-slate-200 cursor-pointer shadow-2xs">
          <mat-icon class="text-base text-indigo-600">playlist_add_check</mat-icon>
          <span>Cargar Demo</span>
        </button>
        <button type="button" (click)="exportCsv()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs shadow-indigo-100">
          <mat-icon class="text-base">file_download</mat-icon>
          <span>Exportar CSV</span>
        </button>
        <div class="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
          <mat-icon class="text-sm text-emerald-600">date_range</mat-icon>
          <select [value]="service.exportWeeksCount()" (change)="onWeeksCountChange($event)" class="text-xs font-bold text-emerald-800 bg-transparent border-none outline-none cursor-pointer pr-1">
            <option [value]="1">1 semana</option>
            <option [value]="2">2 semanas</option>
            <option [value]="3">3 semanas</option>
            <option [value]="4">4 semanas</option>
            <option [value]="6">6 semanas</option>
            <option [value]="8">8 semanas</option>
          </select>
        </div>
        <button type="button" (click)="exportExcelByOrg()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs shadow-emerald-100">
          <mat-icon class="text-base">table_chart</mat-icon>
          <span>Excel por Org</span>
        </button>
        <button type="button" (click)="clearData()" class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200 cursor-pointer">
          <mat-icon class="text-base text-rose-600">delete_sweep</mat-icon>
          <span>Limpiar</span>
        </button>
      </div>

      <!-- Upload Section (Collapsible) -->
      <section class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 mb-6">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
              <mat-icon class="text-lg">cloud_upload</mat-icon>
            </div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400">CONFIGURACIÓN & INGESTIÓN</div>
              <h2 class="text-sm sm:text-base font-bold text-slate-900">Carga de Datos IVMS-4200 (Hikvision)</h2>
            </div>
          </div>
          <button type="button" (click)="uploadExpanded.set(!uploadExpanded())" class="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded border border-slate-200 transition-colors">
            <span>{{ uploadExpanded() ? 'Ocultar' : 'Mostrar Panel' }}</span>
            <mat-icon class="text-base">{{ uploadExpanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
          </button>
        </div>

        @if (uploadExpanded()) {
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Beneficiaries CSV -->
            <div class="flex flex-col h-full bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 bg-indigo-600 rounded text-white text-[10px] font-bold font-mono flex items-center justify-center">1</span>
                  <span class="text-[10px] font-bold uppercase tracking-widest text-slate-600">Padrón Base de Beneficiarios</span>
                </div>
                <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">CSV ( ; )</span>
              </div>
              <p class="text-[11px] text-slate-500">Formato: <code class="text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[10px]">*ID;*Organización;*Nombre...</code></p>
              <label (dragover)="onDragOver($event)" (drop)="onDropBeneficiaries($event)" class="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-white flex-1 min-h-[120px]">
                <input type="file" accept=".csv,.txt" class="hidden" (change)="onBeneficiariesFileSelected($event)" />
                <mat-icon class="text-2xl text-indigo-600">badge</mat-icon>
                <div class="text-xs font-semibold text-slate-700">Beneficiarios (.csv)</div>
                <div class="text-[10px] text-slate-400">ID, Org, Nombre, Período de vigencia</div>
                <span class="mt-1 inline-block px-3 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-indigo-600 hover:bg-slate-50">CARGAR PADRÓN</span>
              </label>
              @if (service.uploadedBeneficiariesFile(); as bFile) {
                <div class="p-3 bg-green-50 rounded border border-green-200 flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2 text-xs text-green-900">
                    <mat-icon class="text-green-700 text-base">check_circle</mat-icon>
                    <div>
                      <div class="font-bold text-slate-900 font-mono text-[11px]">{{ bFile.name }}</div>
                      <div class="text-green-700 text-[10px] font-medium">{{ bFile.validRows }} beneficiarios activos</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono font-bold">{{ service.organizations().length }} facultades</span>
                    <button type="button" (click)="removeBeneficiariesFile()" class="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer" title="Eliminar padrón">
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </div>
                </div>
              } @else {
                <div class="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                  <mat-icon class="text-amber-600 text-sm">info</mat-icon>
                  <span>Padrón pendiente. Carga el CSV o pulsa "Cargar Demo".</span>
                </div>
              }
            </div>

            <!-- Attendance CSVs -->
            <div class="flex flex-col h-full bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 bg-indigo-600 rounded text-white text-[10px] font-bold font-mono flex items-center justify-center">2</span>
                  <span class="text-[10px] font-bold uppercase tracking-widest text-slate-600">Logs Diarios de Asistencia</span>
                </div>
                <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">CSV Multi-Archivo</span>
              </div>
              <p class="text-[11px] text-slate-500">Formato biométrico: <code class="text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[10px]">ID, Nombre, Depto, Hora, Punto...</code></p>
              <label (dragover)="onDragOver($event)" (drop)="onDropAttendance($event)" class="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-white flex-1 min-h-[120px]">
                <input type="file" accept=".csv,.txt" multiple class="hidden" (change)="onAttendanceFilesSelected($event)" />
                <mat-icon class="text-2xl text-indigo-600">fingerprint</mat-icon>
                <div class="text-xs font-semibold text-slate-700">Subir Múltiples CSVs Diarios</div>
                <div class="text-[10px] text-slate-400">Marcaciones biométricas, horas y dispositivos</div>
                <span class="mt-1 inline-block px-3 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-indigo-600 hover:bg-slate-50">CARGAR DIARIOS</span>
              </label>
              @if (service.uploadedAttendanceFiles().length > 0) {
                <div class="bg-white p-3 rounded border border-slate-200">
                  <div class="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                    <span class="text-[10px] uppercase tracking-wider text-slate-400 font-mono">ARCHIVOS INGESTADOS:</span>
                    <span class="text-[10px] text-indigo-700 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">{{ service.availableDates().length }} fechas</span>
                  </div>
                  <div class="max-h-28 overflow-y-auto space-y-1 pr-1 text-xs">
                    @for (file of service.uploadedAttendanceFiles(); track file.name + $index) {
                      <div class="flex items-center justify-between p-1.5 bg-slate-50 rounded border border-slate-100 text-slate-700">
                        <div class="flex items-center gap-1.5 truncate max-w-[60%]">
                          <mat-icon class="text-slate-400 text-sm">description</mat-icon>
                          <span class="truncate font-mono text-[11px] font-medium">{{ file.name }}</span>
                        </div>
                        <div class="flex items-center gap-2 text-[10px]">
                          @if (file.detectedDate) {
                            <span class="px-1.5 py-0.2 bg-white border border-slate-200 text-indigo-700 rounded font-mono font-bold">{{ file.detectedDate }}</span>
                          }
                          <span class="text-slate-500 font-mono font-semibold">{{ file.validRows }} reg</span>
                          <button type="button" (click)="removeAttendanceFile(file.name)" class="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer" [title]="'Eliminar ' + file.name">
                            <mat-icon class="text-sm">close</mat-icon>
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                  <mat-icon class="text-amber-600 text-sm">info</mat-icon>
                  <span>No hay archivos diarios cargados. Arrastra uno o varios CSVs.</span>
                </div>
              }
            </div>
          </div>

          <!-- Dedup Notice -->
          <div class="mt-5 p-3.5 bg-indigo-50/60 rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950">
            <div class="flex items-start gap-3">
              <div class="p-1.5 bg-indigo-100 rounded text-indigo-700 shrink-0">
                <mat-icon class="text-base">verified_user</mat-icon>
              </div>
              <div>
                <div class="font-bold text-indigo-950 text-xs">Filtro Automático de Doble Lectura Biometría & Deduplicación</div>
                <p class="text-indigo-800 text-[11px] leading-relaxed mt-0.5">Se toma la <strong>primera marcación cronológica</strong> de cada beneficiario por día como el almuerzo oficial.</p>
              </div>
            </div>
            <div class="shrink-0 sm:min-w-[180px]">
              <div class="flex justify-between items-center mb-1 text-[10px] font-mono">
                <span class="font-bold text-indigo-900 uppercase">LOGS VALIDADOS</span>
                <span class="text-indigo-600 font-bold">{{ service.stats().totalValidLunches }}/{{ service.stats().totalRawLogs }}</span>
              </div>
              <div class="w-full h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-600 transition-all duration-500" [style.width.%]="service.stats().totalRawLogs > 0 ? ((service.stats().totalValidLunches / service.stats().totalRawLogs) * 100) : 100"></div>
              </div>
            </div>
          </div>
        }
      </section>

      <!-- Filter & Matrix Controls -->
      <div class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs mb-4">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <div class="relative min-w-[240px] flex-1 max-w-sm">
            <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <mat-icon class="text-lg">search</mat-icon>
            </span>
            <input type="text" [value]="service.searchTerm()" (input)="onSearchInput($event)" placeholder="Buscar por nombre, ID o código..." class="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" />
            @if (service.searchTerm()) {
              <button type="button" (click)="service.searchTerm.set('')" class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600">
                <mat-icon class="text-sm">close</mat-icon>
              </button>
            }
          </div>
        </div>

        <!-- Org Pills -->
        <div class="border-t border-slate-100 pt-4">
          <div class="flex items-center gap-2 mb-3">
            <mat-icon class="text-sm text-slate-400">business</mat-icon>
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Filtrar por Carrera:</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" (click)="service.toggleOrganization('ALL')" [class]="service.selectedOrganizations().has('ALL') ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all cursor-pointer">
              <mat-icon class="text-xs">groups</mat-icon>
              <span>Todas</span>
              <span class="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold" [class]="service.selectedOrganizations().has('ALL') ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'">{{ service.beneficiaries().length }}</span>
            </button>
            @for (org of service.organizations(); track org) {
              <button type="button" (click)="service.toggleOrganization(org)" [class]="service.selectedOrganizations().has(org) ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-100' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600'" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all cursor-pointer">
                <span>{{ formatOrgShort(org) }}</span>
                <span class="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold" [class]="service.selectedOrganizations().has(org) ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'">{{ getOrgCount(org) }}</span>
              </button>
            }
          </div>
        </div>

        <!-- Week Configs -->
        <div class="border-t border-slate-100 pt-4 mt-4">
          <div class="flex items-center gap-2 mb-3">
            <mat-icon class="text-sm text-slate-400">date_range</mat-icon>
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Semanas por Carrera (Exportación):</span>
          </div>
          <button type="button" (click)="addWeekConfig()" class="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white rounded-lg text-[11px] font-bold hover:bg-indigo-600 transition-all cursor-pointer">
            <mat-icon class="text-sm">add</mat-icon> Agregar Configuración
          </button>
          <div class="flex flex-col gap-3">
            @for (config of weekConfigs(); track config.id) {
              <div class="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] font-bold text-slate-700">Config {{ config.id + 1 }}</span>
                    <span class="text-[9px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">{{ config.weeks }} sem</span>
                    <span class="text-[9px] text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{{ config.selectedOrgs.size }} carrera(s)</span>
                  </div>
                  <button type="button" (click)="removeWeekConfig(config.id)" class="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer">
                    <mat-icon class="text-sm">close</mat-icon>
                  </button>
                </div>
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-[10px] text-slate-600">Semanas:</span>
                  <select [value]="config.weeks" (change)="updateWeekConfigWeeks(config.id, $event)" class="text-[11px] font-bold text-indigo-700 bg-white border border-slate-300 rounded px-2 py-1 outline-none cursor-pointer">
                    <option [value]="1">1</option><option [value]="2">2</option><option [value]="3">3</option>
                    <option [value]="4">4</option><option [value]="6">6</option><option [value]="8">8</option>
                  </select>
                </div>
                <div class="flex flex-wrap gap-1.5 mb-2">
                  @for (week of service.availableWeeks(); track week.startDate; let wi = $index) {
                    @if (wi >= service.currentWeekIndex() && wi < service.currentWeekIndex() + service.exportWeeksCount()) {
                      <button type="button" (click)="toggleConfigWeek(config.id, week.startDate)" [class]="isConfigWeekSelected(config.id, week.startDate) ? 'ring-2 ring-offset-1 scale-110' : 'opacity-30 hover:opacity-60'" [style.background]="getWeekColor(wi)" class="w-5 h-5 rounded-full cursor-pointer transition-all border-0" [title]="formatWeekLabel(week.startDate)"></button>
                    }
                  }
                </div>
                <div class="border-t border-slate-200 pt-2 mt-2">
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[10px] text-slate-600 font-medium">Carreras:</span>
                    <button type="button" (click)="selectAllOrgs(config.id)" class="text-[9px] text-indigo-600 hover:text-indigo-800 underline cursor-pointer">Seleccionar todas</button>
                  </div>
                  <div class="flex flex-wrap gap-1">
                    @for (org of service.organizations(); track org) {
                      <button type="button" (click)="toggleConfigOrg(config.id, org)" [class]="isConfigOrgSelected(config.id, org) ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-slate-100 text-slate-400 border-slate-200 line-through'" class="text-[9px] px-1.5 py-0.5 rounded border cursor-pointer transition-all truncate max-w-[120px]" [title]="org">{{ formatOrgShort(org) }}</button>
                    }
                  </div>
                </div>
                <div class="mt-2 flex flex-wrap gap-1">
                  @for (weekStart of config.selectedWeeks; track weekStart) {
                    <span class="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">{{ formatWeekLabel(weekStart) }}</span>
                  }
                  @if (config.selectedWeeks.length === 0) {
                    <span class="text-[9px] text-slate-400 italic">Sin semanas seleccionadas</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Week Navigation & Matrix Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex items-center bg-white rounded border border-slate-200 p-1">
              <button type="button" (click)="service.prevWeek()" [disabled]="service.currentWeekIndex() === 0" class="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                <mat-icon class="text-lg">chevron_left</mat-icon>
              </button>
              <div class="px-3 text-center min-w-[180px]">
                <div class="text-xs sm:text-sm font-bold text-slate-900 font-mono">{{ formatWeekRange() }}</div>
                <div class="text-[10px] text-slate-500 font-mono">Semana {{ service.currentWeekIndex() + 1 }} de {{ service.availableWeeks().length }}</div>
              </div>
              <button type="button" (click)="service.nextWeek()" [disabled]="service.currentWeekIndex() === service.availableWeeks().length - 1" class="p-1.5 rounded hover:bg-slate-100 text-slate-700 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                <mat-icon class="text-lg">chevron_right</mat-icon>
              </button>
            </div>
          </div>
          <div class="flex items-center flex-wrap gap-3">
            @if (service.weeklyMatrix().totalBeneficiariesInMatrix > 0) {
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-mono font-bold">
                <mat-icon class="text-xs text-indigo-700">groups</mat-icon>
                <span class="text-indigo-700 uppercase text-[10px] tracking-wider">SEMANAL:</span>
                <span>{{ service.weeklyMatrix().beneficiariesWithAtLeastOneLunch }} / {{ service.weeklyMatrix().totalBeneficiariesInMatrix }}</span>
                <span class="text-indigo-600 font-normal">({{ service.weeklyMatrix().weeklyParticipationRate }}%)</span>
              </div>
            }
            <div class="flex items-center gap-3 text-xs text-slate-600 font-medium">
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-green-500"></span><span class="text-[11px]">Almuerzo Servido</span></div>
              <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-slate-300"></span><span class="text-[11px]">Sin Asistencia</span></div>
            </div>
          </div>
        </div>

        @if (service.weeklyMatrix().summaries.length > 0) {
          <div class="overflow-x-auto max-h-[600px] scrollbar-thin">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-100 text-slate-700 sticky top-0 z-20 backdrop-blur-md border-b border-slate-200">
                <tr>
                  <th class="p-3 font-bold font-mono text-[11px] uppercase tracking-wider sticky left-0 bg-slate-100 z-20 min-w-[100px]">ID</th>
                  <th class="p-3 font-bold font-mono text-[11px] uppercase tracking-wider sticky left-[100px] bg-slate-100 z-20 min-w-[200px]">Beneficiario</th>
                  <th class="p-3 font-bold font-mono text-[11px] uppercase tracking-wider min-w-[150px]">Organización</th>
                  <th class="p-3 font-bold font-mono text-[11px] uppercase tracking-wider text-center min-w-[100px]">Asistencia</th>
                  @for (day of service.weeklyMatrix().days; track day) {
                    <th class="p-2 text-center min-w-[120px] border-l border-slate-200 font-mono">
                      <div class="text-[11px] font-bold text-slate-900">{{ formatDayHeader(day) }}</div>
                      <div class="text-[10px] text-slate-500 font-normal">{{ formatDateShort(day) }}</div>
                      @if (service.weeklyMatrix().dayAttendanceTotals[day]; as dayStat) {
                        <div class="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-indigo-900 border border-slate-200 text-[10px] font-bold">{{ dayStat.attended }}/{{ dayStat.total }}</div>
                      }
                    </th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of service.weeklyMatrix().summaries; track item.beneficiary.normalizedId) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="p-3 font-mono font-bold text-slate-900 sticky left-0 bg-white hover:bg-slate-50 z-10">{{ item.beneficiary.normalizedId }}</td>
                    <td class="p-3 font-semibold text-slate-900 sticky left-[100px] bg-white hover:bg-slate-50 z-10">
                      <div class="truncate max-w-[220px]" [title]="item.beneficiary.name">{{ item.beneficiary.name }}</div>
                    </td>
                    <td class="p-3 text-slate-600">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 truncate max-w-[160px]" [title]="item.beneficiary.organization">{{ formatOrg(item.beneficiary.organization) }}</span>
                    </td>
                    <td class="p-3 text-center">
                      <div class="flex flex-col items-center gap-1">
                        <div class="flex items-center gap-1.5">
                          <span class="font-bold text-slate-900 font-mono">{{ item.daysAttended }}/{{ item.totalDaysWithLogs }}</span>
                          <span [class]="getRateBadgeClass(item.attendanceRate)" class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">{{ item.attendanceRate }}%</span>
                        </div>
                        <div class="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div class="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" [style.width.%]="item.attendanceRate"></div>
                        </div>
                      </div>
                    </td>
                    @for (day of service.weeklyMatrix().days; track day) {
                      <td class="p-2 text-center border-l border-slate-100">
                        @if (item.attendanceByDate[day]; as rec) {
                          <div class="inline-flex flex-col items-center justify-center p-2 rounded bg-green-50 border border-green-200 text-green-950" [title]="getTooltip(rec)">
                            <div class="flex items-center gap-1 font-bold font-mono text-[11px] text-green-800">
                              <mat-icon class="text-xs text-green-600">check_circle</mat-icon>
                              <span>{{ formatShortTime(rec.firstTimeStr) }}</span>
                            </div>
                            @if (rec.totalAttemptsToday > 1) {
                              <span class="text-[9px] font-mono font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded mt-0.5">+{{ rec.totalAttemptsToday - 1 }} dup</span>
                            }
                          </div>
                        } @else {
                          <div class="inline-flex items-center justify-center w-8 h-8 text-slate-300 font-mono text-xs">—</div>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
              <tfoot class="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300 sticky bottom-0 z-20">
                <tr>
                  <td class="p-3 sticky left-0 bg-slate-100 z-20 text-[11px] uppercase tracking-wider text-slate-700" colspan="3">TOTAL ASISTENCIA SEMANAL</td>
                  <td class="p-3 text-center bg-slate-100 font-mono text-xs text-indigo-900">{{ service.weeklyMatrix().beneficiariesWithAtLeastOneLunch }} / {{ service.weeklyMatrix().totalBeneficiariesInMatrix }}</td>
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
              <p class="text-sm font-bold text-slate-800 uppercase font-mono">Sin datos cargados</p>
              <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">Carga el padrón de beneficiarios y los logs de asistencia en el panel superior.</p>
            } @else {
              <mat-icon class="text-4xl text-slate-300 mb-2">search_off</mat-icon>
              <p class="text-sm font-medium text-slate-700">No se encontraron beneficiarios con los filtros aplicados</p>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class Asistencia {
  readonly service = inject(AttendanceService);
  readonly uploadExpanded = signal(true);
  readonly weekConfigs = signal<WeekConfig[]>([]);
  private nextConfigId = 0;

  onDragOver(e: DragEvent) { e.preventDefault(); e.stopPropagation(); }

  onDropBeneficiaries(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer?.files?.length) {
      const file = e.dataTransfer.files[0];
      this.readFile(file, c => this.service.parseBeneficiariesCsv(c, file.name));
    }
  }

  onBeneficiariesFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.readFile(file, c => this.service.parseBeneficiariesCsv(c, file.name));
    }
  }

  onDropAttendance(e: DragEvent) {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer?.files?.length) this.processAttendanceFiles(Array.from(e.dataTransfer.files));
  }

  onAttendanceFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.processAttendanceFiles(Array.from(input.files));
  }

  private processAttendanceFiles(files: File[]) {
    const parsed: { name: string; content: string; size: number }[] = [];
    let done = 0;
    for (const f of files) {
      this.readFile(f, c => {
        parsed.push({ name: f.name, content: c, size: f.size });
        done++;
        if (done === files.length) this.service.parseAttendanceCsvs(parsed, true);
      });
    }
  }

  private readFile(file: File, cb: (content: string) => void) {
    const reader = new FileReader();
    reader.onload = e => cb(e.target?.result as string);
    reader.readAsText(file, 'UTF-8');
  }

  removeBeneficiariesFile() {
    if (confirm('¿Eliminar el padrón de beneficiarios?')) this.service.removeBeneficiariesFile();
  }

  removeAttendanceFile(name: string) {
    if (confirm(`¿Eliminar ${name}?`)) this.service.removeAttendanceFile(name);
  }

  loadDemo() { this.service.loadDemoData(); }

  clearData() {
    if (confirm('¿Limpiar todos los datos?')) this.service.clearAll();
  }

  exportCsv() {
    const csv = this.service.exportMatrixToCsv();
    this.service.downloadCsv(csv, `Reporte_Almuerzos_${this.service.selectedMonth()}.csv`);
  }

  onWeeksCountChange(e: Event) {
    this.service.exportWeeksCount.set(parseInt((e.target as HTMLSelectElement).value, 10));
  }

  onSearchInput(e: Event) {
    this.service.searchTerm.set((e.target as HTMLInputElement).value);
  }

  addWeekConfig() {
    const allOrgs = new Set(this.service.organizations());
    this.weekConfigs.set([...this.weekConfigs(), { id: this.nextConfigId++, weeks: 1, selectedWeeks: [], selectedOrgs: allOrgs }]);
  }

  removeWeekConfig(id: number) { this.weekConfigs.set(this.weekConfigs().filter(c => c.id !== id)); }

  updateWeekConfigWeeks(id: number, e: Event) {
    const weeks = parseInt((e.target as HTMLSelectElement).value, 10);
    this.weekConfigs.set(this.weekConfigs().map(c => c.id === id ? { ...c, weeks } : c));
  }

  toggleConfigOrg(configId: number, org: string) {
    this.weekConfigs.set(this.weekConfigs().map(c => {
      if (c.id !== configId) return c;
      const s = new Set(c.selectedOrgs);
      s.has(org) ? s.delete(org) : s.add(org);
      return { ...c, selectedOrgs: s };
    }));
  }

  isConfigOrgSelected(configId: number, org: string): boolean {
    return this.weekConfigs().find(c => c.id === configId)?.selectedOrgs.has(org) ?? true;
  }

  selectAllOrgs(configId: number) {
    this.weekConfigs.set(this.weekConfigs().map(c => c.id === configId ? { ...c, selectedOrgs: new Set(this.service.organizations()) } : c));
  }

  toggleConfigWeek(configId: number, weekStartDate: string) {
    this.weekConfigs.set(this.weekConfigs().map(c => {
      if (c.id !== configId) return c;
      const sel = [...c.selectedWeeks];
      const idx = sel.indexOf(weekStartDate);
      idx >= 0 ? sel.splice(idx, 1) : (sel.push(weekStartDate), sel.sort());
      return { ...c, selectedWeeks: sel };
    }));
  }

  isConfigWeekSelected(configId: number, weekStartDate: string): boolean {
    const config = this.weekConfigs().find(c => c.id === configId);
    if (!config || config.selectedWeeks.length === 0) {
      const weeks = this.service.availableWeeks();
      const startIdx = this.service.currentWeekIndex();
      const endIdx = Math.min(startIdx + this.service.exportWeeksCount(), weeks.length);
      const orgStartIdx = Math.max(endIdx - config!.weeks, startIdx);
      return weeks.findIndex(w => w.startDate === weekStartDate) >= orgStartIdx;
    }
    return config.selectedWeeks.includes(weekStartDate);
  }

  formatOrgShort(org: string): string {
    if (!org) return 'Sin Depto';
    return org.replace(/^UNIVERSIDAD\//i, '').split('/').pop()?.replace(/_/g, ' ').substring(0, 25) || org;
  }

  formatWeekLabel(startDate: string): string {
    const s = new Date(startDate + 'T12:00:00');
    const e = new Date(s); e.setDate(s.getDate() + 6);
    const m = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][s.getMonth()];
    return `${s.getDate()}-${e.getDate()} ${m}`;
  }

  getWeekColor(i: number): string {
    return ['#16A34A','#2563EB','#D97706','#DB2777','#7C3AED','#0D9488'][i % 6];
  }

  getOrgCount(org: string): number {
    return this.service.beneficiaries().filter(b => b.organization === org).length;
  }

  formatWeekRange(): string {
    const weeks = this.service.availableWeeks();
    const idx = this.service.currentWeekIndex();
    if (!weeks.length || !weeks[idx]) return 'Sin datos';
    const s = new Date(weeks[idx].startDate + 'T12:00:00');
    const e = new Date(s); e.setDate(s.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    return `${s.toLocaleDateString('es-ES', opts)} — ${e.toLocaleDateString('es-ES', opts)}`;
  }

  formatOrg(org: string): string {
    return org?.replace(/^UNIVERSIDAD\//i, '').replace(/_/g, ' ') || 'Sin Depto';
  }

  formatDayHeader(dateStr: string): string {
    try { return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(dateStr + 'T12:00:00').getDay()]; }
    catch { return dateStr; }
  }

  formatDateShort(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getDate()} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]}`;
  }

  formatShortTime(t: string): string { return t?.substring(0, 5) || ''; }

  getRateBadgeClass(r: number): string {
    if (r >= 80) return 'bg-emerald-100 text-emerald-800';
    if (r >= 50) return 'bg-blue-100 text-blue-800';
    if (r > 0) return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-600';
  }

  getTooltip(rec: ValidAttendanceRecord): string {
    let t = `Hora: ${rec.firstTimeStr}\nPunto: ${rec.verificationPoint}`;
    if (rec.totalAttemptsToday > 1) t += `\nIntentos: ${rec.totalAttemptsToday} (1 válido + ${rec.totalAttemptsToday - 1} duplicados)`;
    return t;
  }

  exportExcelByOrg() {
    const configs = this.weekConfigs();
    const map = new Map<string, { weeks: number; selectedWeeks: string[] }>();
    for (const c of configs) {
      for (const org of c.selectedOrgs) map.set(org, { weeks: c.weeks, selectedWeeks: c.selectedWeeks });
    }
    this.service.setExportConfigs(map);
    this.service.exportMatrixByOrganizationExcel();
  }
}
