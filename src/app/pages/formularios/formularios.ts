import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SupabaseService } from '../../services/supabase.service';
import { CafeteriaService } from '../../services/cafeteria.service';

interface FormConfig {
  id: number;
  tipo: string;
  activo: boolean;
  hora_inicio: string;
  hora_fin: string;
}

interface WebConfirmacion {
  id: number;
  codigo_id: string;
  nombre_en_form: string;
  carrera_en_form: string;
  fecha: string;
  tipo_comida_id: number;
  es_beneficiario_valido: boolean;
  formulario_tipo?: string;
}

@Component({
  selector: 'app-formularios',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Gestion de Formularios</h2>
          <p class="text-xs text-slate-500 mt-0.5">Control de apertura, horarios y respuestas web</p>
        </div>
        <button (click)="refreshAll()" [disabled]="loading()"
          class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
          <mat-icon class="text-[18px]" [class.animate-spin]="loading()">refresh</mat-icon>
          Actualizar
        </button>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="flex items-center gap-3 text-slate-500">
            <mat-icon class="animate-spin">autorenew</mat-icon>
            <span class="text-sm font-medium">Cargando formularios...</span>
          </div>
        </div>
      }

      @if (!loading()) {
        <!-- ACCORDION: Config de formularios -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <button (click)="configExpanded.set(!configExpanded())"
            class="w-full flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <mat-icon class="text-indigo-600 text-xl">settings</mat-icon>
              </div>
              <div class="text-left">
                <h3 class="text-lg font-bold text-slate-800">Configuracion de Formularios</h3>
                <p class="text-xs text-slate-500">Abrir/cerrar formularios y ajustar horarios</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              @if (!configExpanded()) {
                <div class="flex items-center gap-2 flex-wrap">
                  <span [class]="almuerzoConfig()?.activo ? 'px-2 py-0.5 bg-emerald-100 text-emerald-700' : 'px-2 py-0.5 bg-red-100 text-red-700'"
                    class="text-[10px] font-bold rounded-full">
                    Almuerzo: {{ almuerzoConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                  </span>
                  <span [class]="refrigerioConfig()?.activo ? 'px-2 py-0.5 bg-blue-100 text-blue-700' : 'px-2 py-0.5 bg-red-100 text-red-700'"
                    class="text-[10px] font-bold rounded-full">
                    Refri: {{ refrigerioConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                  </span>
                  <span [class]="adeaConfig()?.activo ? 'px-2 py-0.5 bg-amber-100 text-amber-700' : 'px-2 py-0.5 bg-red-100 text-red-700'"
                    class="text-[10px] font-bold rounded-full">
                    ADEA: {{ adeaConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                  </span>
                  <span [class]="findeConfig()?.activo ? 'px-2 py-0.5 bg-violet-100 text-violet-700' : 'px-2 py-0.5 bg-red-100 text-red-700'"
                    class="text-[10px] font-bold rounded-full">
                    Finde: {{ findeConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                  </span>
                </div>
              }
              <mat-icon class="text-slate-400 transition-transform" [class.rotate-180]="configExpanded()">expand_more</mat-icon>
            </div>
          </button>

          @if (configExpanded()) {
            <div class="px-5 pb-5 border-t border-slate-100 pt-5">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- ALMUERZO CARD -->
                <div class="rounded-2xl border border-emerald-200 overflow-hidden">
                  <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 p-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                          <mat-icon class="text-white text-lg">restaurant</mat-icon>
                        </div>
                        <div>
                          <h4 class="text-base font-bold text-white">Almuerzo</h4>
                          <p class="text-emerald-100 text-[10px]">Diurno (L-V)</p>
                        </div>
                      </div>
                      <span [class]="almuerzoConfig()?.activo ? 'px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white' : 'px-2 py-0.5 bg-red-500/80 rounded-full text-[10px] font-bold text-white'">
                        {{ almuerzoConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                      </span>
                    </div>
                  </div>
                  <div class="p-4 space-y-3 bg-white">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-slate-700">Estado</span>
                      <button (click)="toggleActivo('almuerzo')"
                        [class]="almuerzoConfig()?.activo ? 'bg-emerald-500' : 'bg-slate-300'"
                        class="relative w-12 h-6 rounded-full transition-colors cursor-pointer">
                        <div [class]="almuerzoConfig()?.activo ? 'translate-x-6' : 'translate-x-0'"
                          class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"></div>
                      </button>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="flex-1">
                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                        <input type="time" [ngModel]="almuerzoConfig()?.hora_inicio"
                          (ngModelChange)="updateTime('almuerzo', 'hora_inicio', $event)"
                          class="w-full py-2 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-700">
                      </div>
                      <div class="flex-1">
                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                        <input type="time" [ngModel]="almuerzoConfig()?.hora_fin"
                          (ngModelChange)="updateTime('almuerzo', 'hora_fin', $event)"
                          class="w-full py-2 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-700">
                      </div>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                      <span class="text-sm text-emerald-700">Respuestas hoy</span>
                      <span class="text-lg font-bold text-emerald-800">{{ almuerzoCount() }}</span>
                    </div>
                    <a [href]="almuerzoUrl" target="_blank"
                      class="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium text-sm rounded-xl transition-all cursor-pointer">
                      <mat-icon class="text-[18px]">open_in_new</mat-icon>
                      Abrir formulario
                    </a>
                  </div>
                </div>

                <!-- REFRIGERIO CARD -->
                <div class="rounded-2xl border border-blue-200 overflow-hidden">
                  <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                          <mat-icon class="text-white text-lg">local_cafe</mat-icon>
                        </div>
                        <div>
                          <h4 class="text-base font-bold text-white">Refrigerio</h4>
                          <p class="text-blue-100 text-[10px]">Nocturno (L-V) + Sabado</p>
                        </div>
                      </div>
                      <span [class]="refrigerioConfig()?.activo ? 'px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white' : 'px-2 py-0.5 bg-red-500/80 rounded-full text-[10px] font-bold text-white'">
                        {{ refrigerioConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                      </span>
                    </div>
                  </div>
                  <div class="p-4 space-y-3 bg-white">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-slate-700">Estado</span>
                      <button (click)="toggleActivo('refrigerio')"
                        [class]="refrigerioConfig()?.activo ? 'bg-blue-500' : 'bg-slate-300'"
                        class="relative w-12 h-6 rounded-full transition-colors cursor-pointer">
                        <div [class]="refrigerioConfig()?.activo ? 'translate-x-6' : 'translate-x-0'"
                          class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"></div>
                      </button>
                    </div>
                    <!-- L-V Schedule -->
                    <div class="p-2 bg-blue-50 rounded-xl">
                      <p class="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2">Lunes - Viernes</p>
                      <div class="flex items-center gap-3">
                        <div class="flex-1">
                          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                          <input type="time" [ngModel]="refrigerioConfig()?.hora_inicio"
                            (ngModelChange)="updateTime('refrigerio', 'hora_inicio', $event)"
                            class="w-full py-2 px-3 text-sm rounded-xl bg-white border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-700">
                        </div>
                        <div class="flex-1">
                          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                          <input type="time" [ngModel]="refrigerioConfig()?.hora_fin"
                            (ngModelChange)="updateTime('refrigerio', 'hora_fin', $event)"
                            class="w-full py-2 px-3 text-sm rounded-xl bg-white border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-700">
                        </div>
                      </div>
                    </div>
                    <!-- Sabado Schedule -->
                    <div class="p-2 bg-violet-50 rounded-xl">
                      <p class="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-2">Sabado</p>
                      <div class="flex items-center gap-3">
                        <div class="flex-1">
                          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                          <input type="time" [ngModel]="findeConfig()?.hora_inicio"
                            (ngModelChange)="updateTime('refrigerio_finde', 'hora_inicio', $event)"
                            class="w-full py-2 px-3 text-sm rounded-xl bg-white border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-slate-700">
                        </div>
                        <div class="flex-1">
                          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                          <input type="time" [ngModel]="findeConfig()?.hora_fin"
                            (ngModelChange)="updateTime('refrigerio_finde', 'hora_fin', $event)"
                            class="w-full py-2 px-3 text-sm rounded-xl bg-white border border-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-slate-700">
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                      <span class="text-sm text-blue-700">Respuestas hoy</span>
                      <span class="text-lg font-bold text-blue-800">{{ refrigerioCount() }}</span>
                    </div>
                    <a [href]="refrigerioUrl" target="_blank"
                      class="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-sm rounded-xl transition-all cursor-pointer">
                      <mat-icon class="text-[18px]">open_in_new</mat-icon>
                      Abrir formulario
                    </a>
                  </div>
                </div>

                <!-- ADEA CARD -->
                <div class="rounded-2xl border border-amber-200 overflow-hidden">
                  <div class="bg-gradient-to-r from-amber-500 to-amber-600 p-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                          <mat-icon class="text-white text-lg">school</mat-icon>
                        </div>
                        <div>
                          <h4 class="text-base font-bold text-white">ADEA - Almuerzo</h4>
                          <p class="text-amber-100 text-[10px]">Sabados 5AM - 10:08AM</p>
                        </div>
                      </div>
                      <span [class]="adeaConfig()?.activo ? 'px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white' : 'px-2 py-0.5 bg-red-500/80 rounded-full text-[10px] font-bold text-white'">
                        {{ adeaConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                      </span>
                    </div>
                  </div>
                  <div class="p-4 space-y-3 bg-white">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-slate-700">Estado</span>
                      <button (click)="toggleActivo('almuerzo_adea')"
                        [class]="adeaConfig()?.activo ? 'bg-amber-500' : 'bg-slate-300'"
                        class="relative w-12 h-6 rounded-full transition-colors cursor-pointer">
                        <div [class]="adeaConfig()?.activo ? 'translate-x-6' : 'translate-x-0'"
                          class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"></div>
                      </button>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="flex-1">
                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                        <input type="time" [ngModel]="adeaConfig()?.hora_inicio"
                          (ngModelChange)="updateTime('almuerzo_adea', 'hora_inicio', $event)"
                          class="w-full py-2 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-700">
                      </div>
                      <div class="flex-1">
                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                        <input type="time" [ngModel]="adeaConfig()?.hora_fin"
                          (ngModelChange)="updateTime('almuerzo_adea', 'hora_fin', $event)"
                          class="w-full py-2 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-700">
                      </div>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                      <span class="text-sm text-amber-700">Respuestas hoy</span>
                      <span class="text-lg font-bold text-amber-800">{{ adeaCount() }}</span>
                    </div>
                    <a [href]="adeaUrl" target="_blank"
                      class="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium text-sm rounded-xl transition-all cursor-pointer">
                      <mat-icon class="text-[18px]">open_in_new</mat-icon>
                      Abrir formulario
                    </a>
                  </div>
                </div>

                <!-- FIN DE SEMANA CARD -->
                <div class="rounded-2xl border border-violet-200 overflow-hidden">
                  <div class="bg-gradient-to-r from-violet-600 to-violet-700 p-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                          <mat-icon class="text-white text-lg">weekend</mat-icon>
                        </div>
                        <div>
                          <h4 class="text-base font-bold text-white">Fin de Semana</h4>
                          <p class="text-violet-100 text-[10px]">Sab Refri 5AM-6PM | Dom Des 5AM-8:30AM</p>
                        </div>
                      </div>
                      <span [class]="findeConfig()?.activo ? 'px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white' : 'px-2 py-0.5 bg-red-500/80 rounded-full text-[10px] font-bold text-white'">
                        {{ findeConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                      </span>
                    </div>
                  </div>
                  <div class="p-4 space-y-3 bg-white">
                    <div class="flex items-center justify-between">
                      <span class="text-sm font-medium text-slate-700">Estado</span>
                      <button (click)="toggleActivo('refrigerio_finde')"
                        [class]="findeConfig()?.activo ? 'bg-violet-500' : 'bg-slate-300'"
                        class="relative w-12 h-6 rounded-full transition-colors cursor-pointer">
                        <div [class]="findeConfig()?.activo ? 'translate-x-6' : 'translate-x-0'"
                          class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"></div>
                      </button>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="flex-1">
                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                        <input type="time" [ngModel]="findeConfig()?.hora_inicio"
                          (ngModelChange)="updateTime('refrigerio_finde', 'hora_inicio', $event)"
                          class="w-full py-2 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-slate-700">
                      </div>
                      <div class="flex-1">
                        <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                        <input type="time" [ngModel]="findeConfig()?.hora_fin"
                          (ngModelChange)="updateTime('refrigerio_finde', 'hora_fin', $event)"
                          class="w-full py-2 px-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-slate-700">
                      </div>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-violet-50 rounded-xl">
                      <span class="text-sm text-violet-700">Respuestas hoy</span>
                      <span class="text-lg font-bold text-violet-800">{{ findeCount() }}</span>
                    </div>
                    <a [href]="findeUrl" target="_blank"
                      class="flex items-center justify-center gap-2 w-full py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 font-medium text-sm rounded-xl transition-all cursor-pointer">
                      <mat-icon class="text-[18px]">open_in_new</mat-icon>
                      Abrir formulario
                    </a>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- SEARCH SECTION -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- General Search -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="p-5">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <mat-icon class="text-slate-600 text-xl">person_search</mat-icon>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-slate-800">Buscar Estudiante</h3>
                  <p class="text-xs text-slate-500">Por codigo o nombre en la tabla</p>
                </div>
              </div>
              <div class="flex gap-3">
                <div class="relative flex-1">
                  <input type="text" [value]="filtroGeneral()" (input)="filtroGeneral.set($any($event.target).value)"
                    placeholder="Codigo (79794) o nombre..."
                    class="w-full py-2.5 px-4 pr-10 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 font-medium text-slate-700 placeholder:text-slate-300">
                  @if (filtroGeneral()) {
                    <button (click)="limpiarBusqueda()"
                      class="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg cursor-pointer transition-colors">
                      <mat-icon class="text-[14px]">close</mat-icon>
                    </button>
                  }
                </div>
              </div>
              @if (filtroGeneral()) {
                <div class="flex items-center gap-2 mt-2">
                  <mat-icon class="text-[14px] text-slate-400">filter_list</mat-icon>
                  <span class="text-xs text-slate-500">{{ respuestasFiltradas().length }} resultado(s) para "{{ filtroGeneral() }}"</span>
                </div>
              }
            </div>
          </div>

          <!-- CONF Code Search -->
          <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div class="p-5">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <mat-icon class="text-emerald-600 text-xl">confirmation_number</mat-icon>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-slate-800">Buscar por CONF</h3>
                  <p class="text-xs text-slate-500">Codigo unico de confirmacion</p>
                </div>
              </div>
              <div class="flex gap-3">
                <div class="flex items-center flex-1">
                  <span class="px-3 py-2.5 bg-emerald-50 border border-r-0 border-emerald-200 rounded-l-xl text-sm font-bold text-emerald-700">ID</span>
                  <input type="text" [value]="filtroConf()" (input)="onConfInput($any($event.target).value)"
                    (keyup.enter)="buscarConf()" placeholder="0425" maxlength="6"
                    class="flex-1 py-2.5 px-3 text-sm rounded-r-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-700 placeholder:text-slate-300"
                    inputmode="numeric">
                </div>
                <button (click)="buscarConf()" [disabled]="!filtroConf()"
                  class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
                  <mat-icon class="text-[18px]">search</mat-icon>
                  Buscar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- RESPONSES TABLE -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div class="p-5 border-b border-slate-100">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 class="text-lg font-bold text-slate-800">Respuestas</h3>
                <p class="text-xs text-slate-500 mt-0.5">Confirmaciones enviadas desde formularios web</p>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <!-- Date filter -->
                <div class="flex items-center gap-2">
                  <mat-icon class="text-slate-400 text-[18px]">calendar_today</mat-icon>
                  <input type="date" [value]="filtroFecha()" (input)="filtroFecha.set($any($event.target).value)"
                    class="py-1.5 px-3 text-xs font-medium rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 text-slate-700 cursor-pointer">
                  @if (filtroFecha()) {
                    <button (click)="filtroFecha.set('')"
                      class="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-md cursor-pointer transition-colors">
                      <mat-icon class="text-[12px]">close</mat-icon>
                    </button>
                  }
                </div>
                <!-- Type filter -->
                <div class="flex items-center gap-2">
                  <button (click)="filtroTipo.set('todos')"
                    [class]="filtroTipo() === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer">
                    Todos ({{ totalRespuestas() }})
                  </button>
                  <button (click)="filtroTipo.set('almuerzo')"
                    [class]="filtroTipo() === 'almuerzo' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer">
                    Almuerzo ({{ almuerzoCount() }})
                  </button>
                  <button (click)="filtroTipo.set('refrigerio')"
                    [class]="filtroTipo() === 'refrigerio' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer">
                    Refrigerio ({{ refrigerioCount() }})
                  </button>
                  <button (click)="filtroTipo.set('adea')"
                    [class]="filtroTipo() === 'adea' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer">
                    ADEA ({{ adeaCount() }})
                  </button>
                  <button (click)="filtroTipo.set('fin_de_semana')"
                    [class]="filtroTipo() === 'fin_de_semana' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'"
                    class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer">
                    Fin de Semana ({{ findeCount() }})
                  </button>
                </div>
              </div>
            </div>
          </div>

          @if (respuestasFiltradas().length === 0) {
            <div class="p-12 text-center">
              <mat-icon class="text-4xl text-slate-300 mb-2">inbox</mat-icon>
              <p class="text-sm text-slate-500">{{ getMensajeVacio() }}</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-slate-100 bg-slate-50/50">
                    <th class="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">CONF</th>
                    <th class="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Codigo</th>
                    <th class="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                    <th class="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Carrera</th>
                    <th class="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipo</th>
                    <th class="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha/Hora</th>
                    <th class="text-center py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                    <th class="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of respuestasFiltradas(); track r.id) {
                    <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                        [class.bg-emerald-50]="highlightConf() === r.id"
                        [class.border-emerald-200]="highlightConf() === r.id">
                      <td class="py-3 px-4">
                        <span class="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-mono font-bold rounded-md border border-slate-200">
                          {{ String(r.id).padStart(4, '0') }}
                        </span>
                      </td>
                      <td class="py-3 px-4 font-mono font-bold text-slate-800">{{ r.codigo_id }}</td>
                      <td class="py-3 px-4 font-medium text-slate-700">{{ r.nombre_en_form || 'Sin nombre' }}</td>
                      <td class="py-3 px-4 text-slate-600 text-xs">{{ r.carrera_en_form || 'Sin carrera' }}</td>
                      <td class="py-3 px-4">
                        @if (r.tipo_comida_id === 2) {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                            <mat-icon class="text-[10px]">restaurant</mat-icon> Almuerzo
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full">
                            <mat-icon class="text-[10px]">local_cafe</mat-icon> Refrigerio
                          </span>
                        }
                      </td>
                      <td class="py-3 px-4 text-left">
                        <div class="text-xs font-bold text-slate-700">{{ r.fecha }}</div>
                      </td>
                      <td class="py-3 px-4 text-center">
                        @if (r.es_beneficiario_valido) {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full">
                            <mat-icon class="text-[10px]">check_circle</mat-icon> Validado
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full">
                            <mat-icon class="text-[10px]">warning</mat-icon> Sin padron
                          </span>
                        }
                      </td>
                      <td class="py-3 px-1">
                        <button (click)="eliminarConfirmacion(r.id)"
                          class="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Eliminar">
                          <mat-icon class="text-[16px]">delete</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>

    <!-- CONF SEARCH MODAL -->
    @if (modalConf()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in"
           (click)="cerrarModal()">
        <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full border overflow-hidden" (click)="$event.stopPropagation()"
             [class.border-emerald-200]="modalConf()?.estado === 'hoy'"
             [class.border-amber-200]="modalConf()?.estado === 'otro_dia'"
             [class.border-red-200]="modalConf()?.estado === 'no_existe'">
          <!-- Header -->
          @if (modalConf()?.estado === 'hoy') {
            <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 text-center">
              <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <mat-icon class="text-white text-3xl">check_circle</mat-icon>
              </div>
              <h3 class="text-xl font-bold text-white">{{ modalConf()?.confId }}</h3>
              <p class="text-emerald-100 text-sm mt-1">Confirmacion valida de HOY</p>
            </div>
          } @else if (modalConf()?.estado === 'otro_dia') {
            <div class="bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-center">
              <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <mat-icon class="text-white text-3xl">schedule</mat-icon>
              </div>
              <h3 class="text-xl font-bold text-white">{{ modalConf()?.confId }}</h3>
              <p class="text-amber-100 text-sm mt-1">Confirmacion del {{ modalConf()?.fechaConfirmacion }}</p>
            </div>
          } @else {
            <div class="bg-gradient-to-r from-red-500 to-red-600 p-5 text-center">
              <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <mat-icon class="text-white text-3xl">cancel</mat-icon>
              </div>
              <h3 class="text-xl font-bold text-white">No Encontrado</h3>
              <p class="text-red-100 text-sm mt-1">{{ modalConf()?.mensaje }}</p>
            </div>
          }
          <!-- Body -->
          @if (modalConf()?.estado !== 'no_existe') {
            <div class="p-5 space-y-3">
              <div class="flex justify-between text-sm py-2 border-b border-slate-100">
                <span class="text-slate-500">Codigo estudiante:</span>
                <span class="font-mono font-bold text-slate-800">{{ modalConf()?.codigo }}</span>
              </div>
              <div class="flex justify-between text-sm py-2 border-b border-slate-100">
                <span class="text-slate-500">Nombre:</span>
                <span class="font-semibold text-slate-800">{{ modalConf()?.nombre }}</span>
              </div>
              <div class="flex justify-between text-sm py-2 border-b border-slate-100">
                <span class="text-slate-500">Carrera:</span>
                <span class="font-semibold text-slate-800">{{ modalConf()?.carrera }}</span>
              </div>
              <div class="flex justify-between text-sm py-2 border-b border-slate-100">
                <span class="text-slate-500">Tipo:</span>
                <span class="font-semibold text-slate-800">{{ modalConf()?.tipo }}</span>
              </div>
              <div class="flex justify-between text-sm py-2">
                <span class="text-slate-500">Hora envio:</span>
                <span class="font-mono font-bold text-slate-800">{{ modalConf()?.hora }}</span>
              </div>
            </div>
          }
          <!-- Actions -->
          <div class="p-4 border-t border-slate-100">
            <button (click)="cerrarModal()"
              class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class Formularios implements OnInit {
  private readonly supabase = inject(SupabaseService);
  private readonly cafeteria = inject(CafeteriaService);
  readonly String = String;

  readonly loading = signal(true);
  readonly configExpanded = signal(false);
  readonly config = signal<FormConfig[]>([]);
  readonly respuestas = computed(() => this.cafeteria.webConfirmaciones() as WebConfirmacion[]);
  readonly filtroTipo = signal<'todos' | 'almuerzo' | 'refrigerio' | 'adea' | 'fin_de_semana'>('todos');
  readonly filtroGeneral = signal('');
  readonly filtroConf = signal('');
  readonly filtroFecha = signal(this.getTodayString());
  readonly highlightConf = signal<number | null>(null);
  readonly modalConf = signal<{
    existe: boolean;
    estado: 'hoy' | 'otro_dia' | 'no_existe';
    confId?: number;
    codigo?: string;
    nombre?: string;
    carrera?: string;
    hora?: string;
    tipo?: string;
    fechaConfirmacion?: string;
    mensaje?: string;
  } | null>(null);

  readonly almuerzoUrl = 'https://formulario-almuerzo-guarincito.onrender.com';
  readonly refrigerioUrl = 'https://formulario-refrigerio-guarincito.onrender.com';
  readonly adeaUrl = 'https://formulario-adea-guarincito.onrender.com';
  readonly findeUrl = 'https://formulario-fin-de-semana-guarincito.onrender.com';

  readonly almuerzoConfig = computed(() => this.config().find(c => c.tipo === 'almuerzo') || null);
  readonly refrigerioConfig = computed(() => this.config().find(c => c.tipo === 'refrigerio') || null);
  readonly adeaConfig = computed(() => this.config().find(c => c.tipo === 'almuerzo_adea') || null);
  readonly findeConfig = computed(() => this.config().find(c => c.tipo === 'refrigerio_finde') || null);

  readonly almuerzoCount = computed(() => this.respuestas().filter(r => r.formulario_tipo === 'almuerzo').length);
  readonly refrigerioCount = computed(() => this.respuestas().filter(r => r.formulario_tipo === 'refrigerio').length);
  readonly adeaCount = computed(() => this.respuestas().filter(r => r.formulario_tipo === 'adea').length);
  readonly findeCount = computed(() => this.respuestas().filter(r => r.formulario_tipo === 'fin_de_semana').length);
  readonly totalRespuestas = computed(() => this.respuestas().length);

  readonly respuestasFiltradas = computed(() => {
    const tipo = this.filtroTipo();
    const busqueda = this.filtroGeneral().toLowerCase().trim();
    const conf = this.filtroConf().trim();
    const fechaFiltro = this.filtroFecha();
    let all = this.respuestas();

    if (tipo === 'almuerzo') all = all.filter(r => r.formulario_tipo === 'almuerzo');
    if (tipo === 'refrigerio') all = all.filter(r => r.formulario_tipo === 'refrigerio');
    if (tipo === 'adea') all = all.filter(r => r.formulario_tipo === 'adea');
    if (tipo === 'fin_de_semana') all = all.filter(r => r.formulario_tipo === 'fin_de_semana');

    if (fechaFiltro) {
      const parts = fechaFiltro.split('-');
      const fechaFmt = `${parts[2]}/${parts[1]}/${parts[0]}`;
      all = all.filter(r => r.fecha?.startsWith(fechaFmt));
    }

    if (busqueda) {
      all = all.filter(r =>
        r.codigo_id?.toLowerCase().includes(busqueda) ||
        r.nombre_en_form?.toLowerCase().includes(busqueda)
      );
    }

    if (conf) {
      all = all.filter(r => String(r.id).padStart(4, '0') === conf.padStart(4, '0'));
    }

    return all;
  });

  ngOnInit() {
    this.refreshAll();
  }

  async refreshAll() {
    this.loading.set(true);
    try {
      const [configData, respuestasData] = await Promise.all([
        this.supabase.fetchFormConfig(),
        Promise.all([
          this.supabase.fetchWebConfirmaciones('almuerzo'),
          this.supabase.fetchWebConfirmaciones('refrigerio'),
          this.supabase.fetchWebConfirmaciones('adea'),
          this.supabase.fetchWebConfirmaciones('fin_de_semana')
        ]).then(([a, r, ad, fs]) => [...a, ...r, ...ad, ...fs])
      ]);
      this.config.set(configData);
      this.cafeteria.webConfirmaciones.set(respuestasData);
    } catch (err) {
      console.error('[Formularios] Error loading data:', err);
    } finally {
      this.loading.set(false);
    }
  }

  limpiarBusqueda() {
    this.filtroGeneral.set('');
    this.filtroConf.set('');
    this.filtroFecha.set(this.getTodayString());
    this.filtroTipo.set('todos');
    this.highlightConf.set(null);
  }

  onConfInput(value: string) {
    const numeric = value.replace(/\D/g, '');
    this.filtroConf.set(numeric);
    this.filtroGeneral.set('');
    this.filtroFecha.set(this.getTodayString());
    this.highlightConf.set(null);
  }

  async toggleActivo(tipo: string) {
    const cfg = this.config().find(c => c.tipo === tipo);
    if (!cfg) return;
    try {
      await this.supabase.updateFormConfig(cfg.id, { activo: !cfg.activo });
      this.config.update(configs =>
        configs.map(c => c.tipo === tipo ? { ...c, activo: !c.activo } : c)
      );
      const estado = !cfg.activo ? 'ABIERTO' : 'CERRADO';
      this.cafeteria.notify('success', 'Formulario ' + estado, `El formulario de ${tipo} ahora esta ${estado}`);
    } catch (err) {
      console.error('[Formularios] Error toggling:', err);
      this.cafeteria.notify('error', 'Error', 'No se pudo cambiar el estado del formulario');
    }
  }

  async updateTime(tipo: string, field: 'hora_inicio' | 'hora_fin', value: string) {
    const cfg = this.config().find(c => c.tipo === tipo);
    if (!cfg) return;
    try {
      await this.supabase.updateFormConfig(cfg.id, { [field]: value });
      this.config.update(configs =>
        configs.map(c => c.tipo === tipo ? { ...c, [field]: value } : c)
      );
      this.cafeteria.notify('success', 'Horario actualizado', `Horario del formulario ${tipo} actualizado`);
    } catch (err) {
      console.error('[Formularios] Error updating time:', err);
      this.cafeteria.notify('error', 'Error', 'No se pudo actualizar el horario');
    }
  }

  extractTime(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.split(' ');
    return parts.length > 1 ? parts[1] : fecha;
  }

  private getTodayString(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  private isToday(fecha: string): boolean {
    if (!fecha) return false;
    const parts = fecha.split(' ')[0].split('/');
    if (parts.length !== 3) return false;
    const now = new Date();
    return now.getDate() === parseInt(parts[0], 10)
      && (now.getMonth() + 1) === parseInt(parts[1], 10)
      && now.getFullYear() === parseInt(parts[2], 10);
  }

  getMensajeVacio(): string {
    if (this.filtroGeneral() || this.filtroConf()) return 'No se encontraron resultados';
    if (this.filtroFecha()) return 'No hay respuestas para esta fecha';
    return 'No hay respuestas para mostrar';
  }

  async buscarConf() {
    const input = this.filtroConf().trim();
    if (!input) return;

    const confId = parseInt(input, 10);
    if (isNaN(confId)) return;

    this.filtroGeneral.set('');
    this.filtroFecha.set('');

    const data = await this.supabase.fetchConfirmacionById(confId);
    if (data) {
      const tipo = data.tipo_comida_id === 2 ? 'Almuerzo' : 'Refrigerio';
      const esHoy = this.isToday(data.fecha);
      this.highlightConf.set(data.id);

      this.modalConf.set({
        existe: true,
        estado: esHoy ? 'hoy' : 'otro_dia',
        confId: data.id,
        codigo: data.codigo_id,
        nombre: data.nombre_en_form || 'Sin nombre',
        carrera: data.carrera_en_form || 'Sin carrera',
        hora: this.extractTime(data.fecha),
        tipo,
        fechaConfirmacion: data.fecha?.split(' ')[0] || ''
      });
    } else {
      this.highlightConf.set(null);
      this.modalConf.set({
        existe: false,
        estado: 'no_existe',
        mensaje: `No se encontro la confirmacion ${String(confId).padStart(4, '0')}.`
      });
    }
  }

  cerrarModal() {
    this.modalConf.set(null);
  }

  async eliminarConfirmacion(id: number) {
    try {
      await this.supabase.deleteConfirmacion(id);
      this.cafeteria.webConfirmaciones.update(list => list.filter((r: any) => r.id !== id));
      this.cafeteria.confirmaciones.update(list => list.filter(c => c.id !== id));
      this.cafeteria.notify('success', 'Eliminado', 'Registro eliminado correctamente');
    } catch (err) {
      console.error('[Formularios] Error eliminando:', err);
      this.cafeteria.notify('error', 'Error', 'No se pudo eliminar el registro');
    }
  }
}
