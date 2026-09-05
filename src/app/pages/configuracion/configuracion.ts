import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CafeteriaService } from '../../services/cafeteria.service';
import { SupabaseService } from '../../services/supabase.service';
import { SUPABASE_CONFIG } from '../../data/initial-data';

@Component({
  selector: 'app-configuracion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-6">
      <!-- Top header -->
      <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 class="text-xl font-bold text-slate-900 tracking-tight">Configuración del Sistema</h2>
        <p class="text-xs text-slate-500 mt-1">
          Monitoreo de formularios de Google, estado de Supabase y sincronización offline
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Google Forms & Sheets Links (7 Cols) -->
        <div class="lg:col-span-7 space-y-6">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <mat-icon class="text-blue-700">dynamic_form</mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Formularios y Hojas de Google</h3>
                  <p class="text-[11px] text-slate-500">Google Form &rarr; Google Apps Script &rarr; Supabase</p>
                </div>
              </div>
              <span class="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                Sincronización Directa
              </span>
            </div>

            <!-- List of Forms -->
            <div class="space-y-3">
              @for (form of cafeteriaService.formularios(); track form.id) {
                <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors space-y-2.5">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <h4 class="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {{ form.nombre }}
                        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {{ form.tipo_jornada }}
                        </span>
                      </h4>
                      <p class="text-[11px] text-slate-500 mt-0.5">Horario habitual de ración: {{ form.horario }}</p>
                    </div>

                    <span class="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {{ form.total_respuestas }} respuestas
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    @if (form.url_form) {
                      <a
                        [href]="form.url_form"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                      >
                        <mat-icon class="text-xs">open_in_new</mat-icon>
                        <span>Abrir Formulario</span>
                      </a>
                    }
                    @if (form.url_sheet) {
                      <a
                        [href]="form.url_sheet"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                      >
                        <mat-icon class="text-xs">table_chart</mat-icon>
                        <span>Ver Google Sheet</span>
                      </a>
                    }
                  </div>

                  <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Última sincronización con script:</span>
                    <span class="font-mono text-slate-700 font-medium">
                      {{ form.ultima_sincronizacion ? (form.ultima_sincronizacion | date:'short') : 'Hoy en tiempo real' }}
                    </span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Academic Degrees Reference Table -->
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 class="text-sm font-bold text-slate-900 flex items-center gap-2">
              <mat-icon class="text-blue-600 text-base">school</mat-icon>
              <span>Matriz Oficial de Carreras y Servicios (11 Carreras)</span>
            </h3>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th class="py-2 px-3">ID</th>
                    <th class="py-2 px-3">Nombre Carrera</th>
                    <th class="py-2 px-3">Jornada</th>
                    <th class="py-2 px-3">Servicio Asignado</th>
                    <th class="py-2 px-3">Días de Atención</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (c of cafeteriaService.carreras(); track c.id) {
                    <tr>
                      <td class="py-2 px-3 font-mono font-bold text-slate-900">{{ c.id }}</td>
                      <td class="py-2 px-3 font-bold text-slate-800">{{ c.nombre }}</td>
                      <td class="py-2 px-3 text-slate-600">{{ c.jornada }}</td>
                      <td class="py-2 px-3">
                        <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                          {{ c.servicioDefecto }}
                        </span>
                      </td>
                      <td class="py-2 px-3 text-slate-500 font-mono text-[11px]">{{ c.diasServicio }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right: Supabase Connection & Offline Sync Tools (5 Cols) -->
        <div class="lg:col-span-5 space-y-6">
          <!-- Supabase Connection Card -->
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <mat-icon class="text-emerald-800">storage</mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Base de Datos Supabase</h3>
                  <p class="text-[11px] text-slate-500">PostgreSQL Cloud Database</p>
                </div>
              </div>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            <div class="space-y-2 text-xs">
              <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 break-all font-mono text-[11px] text-slate-700">
                <span class="text-slate-400 block text-[10px] font-bold uppercase font-sans">Project URL</span>
                {{ supabaseUrl }}
              </div>

              <!-- Connection Test Button -->
              <div class="pt-2">
                <button
                  type="button"
                  (click)="testSupabaseConnection()"
                  [disabled]="isTestingConnection()"
                  class="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <mat-icon [class.animate-spin]="isTestingConnection()" class="text-xs">network_check</mat-icon>
                  <span>{{ isTestingConnection() ? 'Verificando latencia...' : 'Probar Conexión con Supabase' }}</span>
                </button>
              </div>

              @if (connectionTestResult(); as res) {
                <div class="p-3 rounded-xl text-xs font-medium border" [class.bg-emerald-50]="res.success" [class.border-emerald-200]="res.success" [class.text-emerald-800]="res.success" [class.bg-red-50]="!res.success" [class.border-red-200]="!res.success" [class.text-red-800]="!res.success">
                  @if (res.success) {
                    <p class="font-bold flex items-center gap-1">
                      <mat-icon class="text-xs text-emerald-600">check_circle</mat-icon>
                      Conexión exitosa con Supabase
                    </p>
                    <p class="text-[11px] mt-0.5">Latencia de respuesta: <strong>{{ res.latencyMs }} ms</strong></p>
                  } @else {
                    <p class="font-bold flex items-center gap-1">
                      <mat-icon class="text-xs text-red-600">error</mat-icon>
                      Fallo de conexión
                    </p>
                    <p class="text-[11px] mt-0.5">{{ res.error }}</p>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Offline Storage & Sync Queue -->
          <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <mat-icon class="text-blue-800">phonelink_ring</mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-slate-900">Almacenamiento Local (Dexie.js)</h3>
                  <p class="text-[11px] text-slate-500">IndexedDB para funcionamiento offline</p>
                </div>
              </div>
            </div>

            <div class="space-y-3 text-xs">
              <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p class="font-bold text-slate-800">Cola de Sincronización</p>
                  <p class="text-[11px] text-slate-500">Entregas pendientes de subir a la nube</p>
                </div>
                <span class="text-sm font-mono font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                  {{ cafeteriaService.pendingSyncCount() }} items
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  (click)="cafeteriaService.sincronizarCola()"
                  [disabled]="cafeteriaService.isSyncing() || !cafeteriaService.isOnline()"
                  class="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <mat-icon [class.animate-spin]="cafeteriaService.isSyncing()" class="text-xs">sync</mat-icon>
                  <span>Forzar Sincronización</span>
                </button>

                <button
                  type="button"
                  (click)="cafeteriaService.resetToDemoData()"
                  class="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 transition-colors"
                  title="Restaura los 10 beneficiarios de prueba y 5 confirmaciones"
                >
                  <mat-icon class="text-xs">restore</mat-icon>
                  <span>Restaurar Datos Demo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class Configuracion {
  readonly cafeteriaService = inject(CafeteriaService);
  private supabase = inject(SupabaseService);

  readonly supabaseUrl = SUPABASE_CONFIG.url;
  readonly isTestingConnection = signal<boolean>(false);
  readonly connectionTestResult = signal<{ success: boolean; latencyMs: number; error?: string } | null>(null);

  async testSupabaseConnection(): Promise<void> {
    this.isTestingConnection.set(true);
    try {
      const result = await this.supabase.testConnection();
      this.connectionTestResult.set(result);
    } finally {
      this.isTestingConnection.set(false);
    }
  }
}
