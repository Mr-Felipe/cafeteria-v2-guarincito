import { ChangeDetectionStrategy, Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CafeteriaService } from '../../services/cafeteria.service';
import { SupabaseService } from '../../services/supabase.service';
import { SUPABASE_CONFIG } from '../../data/initial-data';

interface FormConfig {
  id: number;
  tipo: string;
  activo: boolean;
  hora_inicio: string;
  hora_fin: string;
  dias_activos?: string[];
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
  selector: 'app-configuracion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <style>
      .anim-fade-in { animation: fadeSlideIn 150ms ease-out; }
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: scale(0.92) translateX(4px); }
        to { opacity: 1; transform: scale(1) translateX(0); }
      }
    </style>
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs gap-4">
        <div>
          <h2 class="text-xl font-bold text-slate-900 tracking-tight">Configuracion del Sistema</h2>
          <p class="text-xs text-slate-500 mt-1">
            Control de formularios, monitoreo de Supabase y sincronizacion offline
          </p>
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
            <span class="text-sm font-medium">Cargando configuracion...</span>
          </div>
        </div>
      }

      @if (!loading()) {
        <!-- SECTION 1: Configuracion de Formularios -->
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
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
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-slate-400 text-[18px]">calendar_today</mat-icon>
                        <span class="text-xs text-slate-500">{{ formatDias(almuerzoConfig()?.dias_activos) }}</span>
                      </div>
                      <button (click)="openDiasModal('almuerzo')"
                        class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer">
                        <mat-icon class="text-[16px]">calendar_month</mat-icon>
                      </button>
                    </div>
                    <div class="flex items-end gap-2">
                      <div class="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                        @if (editingAlmuerzo()) {
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                            <input type="time" [value]="almuerzoConfig()?.hora_inicio"
                              (input)="editingAlmuerzoInicio.set($any($event.target).value)"
                              class="w-full py-2 px-3 text-sm rounded-xl bg-emerald-50 border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-700">
                          </div>
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                            <input type="time" [value]="almuerzoConfig()?.hora_fin"
                              (input)="editingAlmuerzoFin.set($any($event.target).value)"
                              class="w-full py-2 px-3 text-sm rounded-xl bg-emerald-50 border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-700">
                          </div>
                        } @else {
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                            <input type="time" [value]="almuerzoConfig()?.hora_inicio" disabled
                              class="w-full py-2 px-3 text-sm rounded-xl bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                          </div>
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                            <input type="time" [value]="almuerzoConfig()?.hora_fin" disabled
                              class="w-full py-2 px-3 text-sm rounded-xl bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                          </div>
                        }
                      </div>
                      @if (editingAlmuerzo()) {
                        <div class="anim-fade-in flex items-center gap-1 flex-shrink-0">
                          <button (click)="saveCardHours('almuerzo', editingAlmuerzoInicio() || almuerzoConfig()?.hora_inicio, editingAlmuerzoFin() || almuerzoConfig()?.hora_fin, 'almuerzo')"
                            class="p-2 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer">
                            <mat-icon class="text-[18px]">check</mat-icon>
                          </button>
                          <button (click)="editingAlmuerzo.set(false)"
                            class="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                            <mat-icon class="text-[18px]">close</mat-icon>
                          </button>
                        </div>
                      } @else {
                        <button class="anim-fade-in p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer flex-shrink-0"
                          (click)="editingAlmuerzo.set(true); editingAlmuerzoInicio.set(almuerzoConfig()?.hora_inicio || ''); editingAlmuerzoFin.set(almuerzoConfig()?.hora_fin || '')">
                          <mat-icon class="text-[18px]">edit</mat-icon>
                        </button>
                      }
                    </div>
                    <button (click)="toggleExpandAlmuerzo()"
                      class="flex items-center gap-2 w-full py-2 px-3 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
                      <mat-icon class="text-[18px] transition-transform duration-300" [class.rotate-180]="expandedAlmuerzo()">expand_more</mat-icon>
                      Horarios por carrera
                      @if (getCustomCount(almuerzoHorarios(), almuerzoConfig()?.hora_fin) > 0) {
                        <span class="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">{{ getCustomCount(almuerzoHorarios(), almuerzoConfig()?.hora_fin) }} personalizado{{ getCustomCount(almuerzoHorarios(), almuerzoConfig()?.hora_fin) > 1 ? 's' : '' }}</span>
                      }
                    </button>
                    <div class="overflow-hidden transition-all duration-300 ease-in-out" [style.max-height]="expandedAlmuerzo() ? '500px' : '0px'" [style.opacity]="expandedAlmuerzo() ? '1' : '0'">
                      <div class="border border-slate-200 rounded-xl mt-2">
                        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Horario de cierre por carrera</span>
                          <p class="text-[9px] text-slate-400 mt-0.5">Hora a la que deja de estar disponible cada carrera</p>
                        </div>
                        <div class="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex-1">Carrera</span>
                          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 w-32 text-center">Cierre</span>
                          <span class="w-8"></span>
                        </div>
                        <div class="max-h-48 overflow-y-auto">
                          @for (h of almuerzoHorarios(); track h.id) {
                            <div class="flex items-center gap-2 px-3 py-2 border-b border-slate-100 last:border-0">
                              <span class="text-sm text-slate-700 flex-1 truncate">{{ h.carreras?.nombre || 'ID: ' + h.carrera_id }}</span>
                              @if (editingHorarioId() === h.id) {
                                <div class="anim-fade-in flex items-center gap-2">
                                  <input type="time" [value]="h.hora_cierre"
                                    (input)="editingHorarioValue.set($any($event.target).value)"
                                    class="w-32 py-1 px-2 text-xs rounded-lg bg-emerald-50 border border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-slate-700">
                                  <button (click)="saveHorario(h.id, editingHorarioValue() || h.hora_cierre)"
                                    class="p-1 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer">
                                    <mat-icon class="text-[16px]">check</mat-icon>
                                  </button>
                                  <button (click)="cancelEditHorario()"
                                    class="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                                    <mat-icon class="text-[16px]">close</mat-icon>
                                  </button>
                                </div>
                              } @else {
                                <div class="anim-fade-in flex items-center gap-2">
                                  <input type="time" [value]="h.hora_cierre" disabled
                                    class="w-32 py-1 px-2 text-xs rounded-lg bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                                  <button (click)="editingHorarioId.set(h.id); editingHorarioValue.set(h.hora_cierre)"
                                    class="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer">
                                    <mat-icon class="text-[16px]">edit</mat-icon>
                                  </button>
                                </div>
                              }
                            </div>
                          }
                          @if (almuerzoHorarios().length === 0) {
                            <div class="px-3 py-4 text-center text-xs text-slate-400">No hay carreras configuradas</div>
                          }
                        </div>
                      </div>
                      @if (almuerzoHorarios().length > 0) {
                        <button (click)="resetHorariosDefault('almuerzo')"
                          class="mt-2 w-full py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 border border-amber-300 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                          <mat-icon class="text-[14px]">restart_alt</mat-icon>
                          Restablecer horarios por defecto
                        </button>
                      }
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
                          <h4 class="text-base font-bold text-white">Refrigerio Noche</h4>
                          <p class="text-blue-100 text-[10px]">Nocturno (L-V)</p>
                        </div>
                      </div>
                      <span [class]="refrigerioConfig()?.activo ? 'px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white' : 'px-2 py-0.5 bg-red-500/80 rounded-full text-[10px] font-bold text-white'">
                        {{ refrigerioConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                      </span>
                    </div>
                  </div>
                  <div class="p-4 space-y-3 bg-white">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-slate-400 text-[18px]">calendar_today</mat-icon>
                        <span class="text-xs text-slate-500">{{ formatDias(refrigerioConfig()?.dias_activos) }}</span>
                      </div>
                      <button (click)="openDiasModal('refrigerio')"
                        class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer">
                        <mat-icon class="text-[16px]">calendar_month</mat-icon>
                      </button>
                    </div>
                    <div class="flex items-end gap-2">
                      <div class="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                        @if (editingGeneralHours()) {
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                            <input type="time" [value]="refrigerioConfig()?.hora_inicio"
                              (input)="editingGeneralInicio.set($any($event.target).value)"
                              class="w-full py-2 px-3 text-sm rounded-xl bg-blue-50 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-700">
                          </div>
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                            <input type="time" [value]="refrigerioConfig()?.hora_fin"
                              (input)="editingGeneralFin.set($any($event.target).value)"
                              class="w-full py-2 px-3 text-sm rounded-xl bg-blue-50 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-700">
                          </div>
                        } @else {
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                            <input type="time" [value]="refrigerioConfig()?.hora_inicio" disabled
                              class="w-full py-2 px-3 text-sm rounded-xl bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                          </div>
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                            <input type="time" [value]="refrigerioConfig()?.hora_fin" disabled
                              class="w-full py-2 px-3 text-sm rounded-xl bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                          </div>
                        }
                      </div>
                      @if (editingGeneralHours()) {
                        <div class="anim-fade-in flex items-center gap-1 flex-shrink-0">
                          <button (click)="saveGeneralHours('refrigerio', editingGeneralInicio() || refrigerioConfig()?.hora_inicio, editingGeneralFin() || refrigerioConfig()?.hora_fin)"
                            class="p-2 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer">
                            <mat-icon class="text-[18px]">check</mat-icon>
                          </button>
                          <button (click)="editingGeneralHours.set(false)"
                            class="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                            <mat-icon class="text-[18px]">close</mat-icon>
                          </button>
                        </div>
                      } @else {
                        <button class="anim-fade-in p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer flex-shrink-0"
                          (click)="editingGeneralHours.set(true); editingGeneralInicio.set(refrigerioConfig()?.hora_inicio || ''); editingGeneralFin.set(refrigerioConfig()?.hora_fin || '')">
                          <mat-icon class="text-[18px]">edit</mat-icon>
                        </button>
                      }
                    </div>
                    <button (click)="toggleExpandForm('refrigerio')"
                      class="flex items-center gap-2 w-full py-2 px-3 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
                      <mat-icon class="text-[18px] transition-transform duration-300" [class.rotate-180]="expandedForm() === 'refrigerio'">expand_more</mat-icon>
                      Horarios por carrera
                      @if (carrerasCustomCount() > 0) {
                        <span class="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">{{ carrerasCustomCount() }} personalizado{{ carrerasCustomCount() > 1 ? 's' : '' }}</span>
                      }
                    </button>
                    <div class="overflow-hidden transition-all duration-300 ease-in-out" [style.max-height]="expandedForm() === 'refrigerio' ? '500px' : '0px'" [style.opacity]="expandedForm() === 'refrigerio' ? '1' : '0'">
                      <div class="border border-slate-200 rounded-xl mt-2">
                        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Horario de cierre por carrera</span>
                          <p class="text-[9px] text-slate-400 mt-0.5">Hora a la que deja de estar disponible cada carrera</p>
                        </div>
                        <div class="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex-1">Carrera</span>
                          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 w-20 text-center">Cierre</span>
                          <span class="w-8"></span>
                        </div>
                        <div class="max-h-48 overflow-y-auto">
                          @for (h of carrerasHorarios(); track h.id) {
                            <div class="flex items-center gap-2 px-3 py-2 border-b border-slate-100 last:border-0">
                              <span class="text-sm text-slate-700 flex-1 truncate">{{ h.carreras?.nombre || 'ID: ' + h.carrera_id }}</span>
                              @if (editingHorarioId() === h.id) {
                                <div class="anim-fade-in flex items-center gap-2">
                                  <input type="time" [value]="h.hora_cierre"
                                    (input)="editingHorarioValue.set($any($event.target).value)"
                                    class="w-32 py-1 px-2 text-xs rounded-lg bg-blue-50 border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-slate-700">
                                  <button (click)="saveHorario(h.id, editingHorarioValue() || h.hora_cierre)"
                                    class="p-1 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer">
                                    <mat-icon class="text-[16px]">check</mat-icon>
                                  </button>
                                  <button (click)="cancelEditHorario()"
                                    class="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                                    <mat-icon class="text-[16px]">close</mat-icon>
                                  </button>
                                </div>
                              } @else {
                                <div class="anim-fade-in flex items-center gap-2">
                                  <input type="time" [value]="h.hora_cierre" disabled
                                    class="w-32 py-1 px-2 text-xs rounded-lg bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                                  <button (click)="editingHorarioId.set(h.id); editingHorarioValue.set(h.hora_cierre)"
                                    class="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">
                                    <mat-icon class="text-[16px]">edit</mat-icon>
                                  </button>
                                </div>
                              }
                            </div>
                          }
                          @if (carrerasHorarios().length === 0) {
                            <div class="px-3 py-4 text-center text-xs text-slate-400">No hay carreras configuradas para este formulario</div>
                          }
                        </div>
                      </div>
                      @if (carrerasHorarios().length > 0) {
                        <button (click)="resetHorariosDefault('refrigerio')"
                          class="mt-2 w-full py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 border border-amber-300 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                          <mat-icon class="text-[14px]">restart_alt</mat-icon>
                          Restablecer horarios por defecto
                        </button>
                      }
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
                      <div class="flex items-center gap-2">
                        <mat-icon class="text-slate-400 text-[18px]">calendar_today</mat-icon>
                        <span class="text-xs text-slate-500">{{ formatDias(adeaConfig()?.dias_activos) }}</span>
                      </div>
                      <button (click)="openDiasModal('almuerzo_adea')"
                        class="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all cursor-pointer">
                        <mat-icon class="text-[16px]">calendar_month</mat-icon>
                      </button>
                    </div>
                    <div class="flex items-end gap-2">
                      <div class="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                        @if (editingAdea()) {
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                            <input type="time" [value]="adeaConfig()?.hora_inicio"
                              (input)="editingAdeaInicio.set($any($event.target).value)"
                              class="w-full py-2 px-3 text-sm rounded-xl bg-amber-50 border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-700">
                          </div>
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                            <input type="time" [value]="adeaConfig()?.hora_fin"
                              (input)="editingAdeaFin.set($any($event.target).value)"
                              class="w-full py-2 px-3 text-sm rounded-xl bg-amber-50 border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-slate-700">
                          </div>
                        } @else {
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                            <input type="time" [value]="adeaConfig()?.hora_inicio" disabled
                              class="w-full py-2 px-3 text-sm rounded-xl bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                          </div>
                          <div class="flex-1">
                            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                            <input type="time" [value]="adeaConfig()?.hora_fin" disabled
                              class="w-full py-2 px-3 text-sm rounded-xl bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                          </div>
                        }
                      </div>
                      @if (editingAdea()) {
                        <div class="anim-fade-in flex items-center gap-1 flex-shrink-0">
                          <button (click)="saveCardHours('almuerzo_adea', editingAdeaInicio() || adeaConfig()?.hora_inicio, editingAdeaFin() || adeaConfig()?.hora_fin, 'adea')"
                            class="p-2 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer">
                            <mat-icon class="text-[18px]">check</mat-icon>
                          </button>
                          <button (click)="editingAdea.set(false)"
                            class="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                            <mat-icon class="text-[18px]">close</mat-icon>
                          </button>
                        </div>
                      } @else {
                        <button class="anim-fade-in p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer flex-shrink-0"
                          (click)="editingAdea.set(true); editingAdeaInicio.set(adeaConfig()?.hora_inicio || ''); editingAdeaFin.set(adeaConfig()?.hora_fin || '')">
                          <mat-icon class="text-[18px]">edit</mat-icon>
                        </button>
                      }
                    </div>
                    <button (click)="toggleExpandAdea()"
                      class="flex items-center gap-2 w-full py-2 px-3 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer">
                      <mat-icon class="text-[18px] transition-transform duration-300" [class.rotate-180]="expandedAdea()">expand_more</mat-icon>
                      Horarios por carrera
                      @if (getCustomCount(adeaHorarios(), adeaConfig()?.hora_fin) > 0) {
                        <span class="ml-auto px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">{{ getCustomCount(adeaHorarios(), adeaConfig()?.hora_fin) }} personalizado{{ getCustomCount(adeaHorarios(), adeaConfig()?.hora_fin) > 1 ? 's' : '' }}</span>
                      }
                    </button>
                    <div class="overflow-hidden transition-all duration-300 ease-in-out" [style.max-height]="expandedAdea() ? '500px' : '0px'" [style.opacity]="expandedAdea() ? '1' : '0'">
                      <div class="border border-slate-200 rounded-xl mt-2">
                        <div class="bg-slate-50 px-3 py-2 border-b border-slate-200">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">Horario de cierre por carrera</span>
                          <p class="text-[9px] text-slate-400 mt-0.5">Hora a la que deja de estar disponible cada carrera</p>
                        </div>
                        <div class="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex">
                          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex-1">Carrera</span>
                          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 w-32 text-center">Cierre</span>
                          <span class="w-8"></span>
                        </div>
                        <div class="max-h-48 overflow-y-auto">
                          @for (h of adeaHorarios(); track h.id) {
                            <div class="flex items-center gap-2 px-3 py-2 border-b border-slate-100 last:border-0">
                              <span class="text-sm text-slate-700 flex-1 truncate">{{ h.carreras?.nombre || 'ID: ' + h.carrera_id }}</span>
                              @if (editingHorarioId() === h.id) {
                                <div class="anim-fade-in flex items-center gap-2">
                                  <input type="time" [value]="h.hora_cierre"
                                    (input)="editingHorarioValue.set($any($event.target).value)"
                                    class="w-32 py-1 px-2 text-xs rounded-lg bg-amber-50 border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-slate-700">
                                  <button (click)="saveHorario(h.id, editingHorarioValue() || h.hora_cierre)"
                                    class="p-1 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer">
                                    <mat-icon class="text-[16px]">check</mat-icon>
                                  </button>
                                  <button (click)="cancelEditHorario()"
                                    class="p-1 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                                    <mat-icon class="text-[16px]">close</mat-icon>
                                  </button>
                                </div>
                              } @else {
                                <div class="anim-fade-in flex items-center gap-2">
                                  <input type="time" [value]="h.hora_cierre" disabled
                                    class="w-32 py-1 px-2 text-xs rounded-lg bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                                  <button (click)="editingHorarioId.set(h.id); editingHorarioValue.set(h.hora_cierre)"
                                    class="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer">
                                    <mat-icon class="text-[16px]">edit</mat-icon>
                                  </button>
                                </div>
                              }
                            </div>
                          }
                          @if (adeaHorarios().length === 0) {
                            <div class="px-3 py-4 text-center text-xs text-slate-400">No hay carreras configuradas</div>
                          }
                        </div>
                      </div>
                      @if (adeaHorarios().length > 0) {
                        <button (click)="resetHorariosDefault('almuerzo_adea')"
                          class="mt-2 w-full py-2 text-xs font-medium text-amber-700 hover:bg-amber-50 border border-amber-300 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2">
                          <mat-icon class="text-[14px]">restart_alt</mat-icon>
                          Restablecer horarios por defecto
                        </button>
                      }
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
                          <p class="text-violet-100 text-[10px]">Sab Refri + Dom Desayuno</p>
                        </div>
                      </div>
                      <span [class]="findeConfig()?.activo ? 'px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold text-white' : 'px-2 py-0.5 bg-red-500/80 rounded-full text-[10px] font-bold text-white'">
                        {{ findeConfig()?.activo ? 'ABIERTO' : 'CERRADO' }}
                      </span>
                    </div>
                  </div>
                  <div class="p-4 space-y-3 bg-white">
                    <!-- Sabado Schedule -->
                    <div class="p-3 bg-violet-50 rounded-xl space-y-2">
                      <div class="flex items-center justify-between mb-1">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-violet-600">Sabado - Refrigerio</p>
                        <div class="flex items-center gap-1">
                          <button (click)="openDiasModal('refrigerio_finde')"
                            class="p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-100 rounded-lg cursor-pointer">
                            <mat-icon class="text-[14px]">calendar_month</mat-icon>
                          </button>
                        </div>
                      </div>
                      <p class="text-[9px] text-slate-400">{{ formatDias(findeConfig()?.dias_activos) || 'Sábado' }}</p>
                      @if (editingFindeSabado()) {
                        <div class="anim-fade-in flex items-end gap-2">
                          <div class="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                            <div class="flex-1">
                              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                              <input type="time" [value]="findeConfig()?.hora_inicio"
                                (input)="editingFindeSabadoInicio.set($any($event.target).value)"
                                class="w-full py-2 px-3 text-sm rounded-xl bg-white border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-slate-700">
                            </div>
                            <div class="flex-1">
                              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                              <input type="time" [value]="findeConfig()?.hora_fin"
                                (input)="editingFindeSabadoFin.set($any($event.target).value)"
                                class="w-full py-2 px-3 text-sm rounded-xl bg-white border border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono text-slate-700">
                            </div>
                          </div>
                          <div class="flex items-center gap-1 flex-shrink-0">
                            <button (click)="saveCardHours('refrigerio_finde', editingFindeSabadoInicio() || findeConfig()?.hora_inicio, editingFindeSabadoFin() || findeConfig()?.hora_fin, 'fin_de_semana_sabado')"
                              class="p-2 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer">
                              <mat-icon class="text-[18px]">check</mat-icon>
                            </button>
                            <button (click)="editingFindeSabado.set(false)"
                              class="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                              <mat-icon class="text-[18px]">close</mat-icon>
                            </button>
                          </div>
                        </div>
                      } @else {
                        <div class="flex items-end gap-2">
                          <div class="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                            <div class="flex-1">
                              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                              <input type="time" [value]="findeConfig()?.hora_inicio" disabled
                                class="w-full py-2 px-3 text-sm rounded-xl bg-white/60 border border-violet-200 font-mono text-slate-400 cursor-not-allowed">
                            </div>
                            <div class="flex-1">
                              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                              <input type="time" [value]="findeConfig()?.hora_fin" disabled
                                class="w-full py-2 px-3 text-sm rounded-xl bg-white/60 border border-violet-200 font-mono text-slate-400 cursor-not-allowed">
                            </div>
                          </div>
                          <button class="anim-fade-in p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-100 rounded-lg cursor-pointer flex-shrink-0"
                            (click)="editingFindeSabado.set(true); editingFindeSabadoInicio.set(findeConfig()?.hora_inicio || ''); editingFindeSabadoFin.set(findeConfig()?.hora_fin || '')">
                            <mat-icon class="text-[18px]">edit</mat-icon>
                          </button>
                        </div>
                      }
                      <!-- Sabado Horarios expandable -->
                      <button (click)="toggleExpandFindeSabado()"
                        class="flex items-center gap-2 w-full py-1.5 px-2 text-xs text-slate-600 hover:bg-white/60 rounded-lg transition-all cursor-pointer">
                        <mat-icon class="text-[14px] transition-transform duration-300" [class.rotate-180]="expandedFindeSabado()">expand_more</mat-icon>
                        Horarios por carrera
                        @if (getCustomCount(findeSabadoHorarios(), findeConfig()?.hora_fin) > 0) {
                          <span class="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full">{{ getCustomCount(findeSabadoHorarios(), findeConfig()?.hora_fin) }}personalizado</span>
                        }
                      </button>
                      <div class="overflow-hidden transition-all duration-300 ease-in-out" [style.max-height]="expandedFindeSabado() ? '400px' : '0px'" [style.opacity]="expandedFindeSabado() ? '1' : '0'">
                        <div class="border border-violet-200 rounded-lg mt-1 bg-white">
                          <div class="bg-slate-50 px-2 py-1.5 border-b border-slate-200">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500">Horario de cierre por carrera</span>
                            <p class="text-[8px] text-slate-400 mt-0.5">Hora a la que deja de estar disponible cada carrera</p>
                          </div>
                          <div class="bg-slate-50 px-2 py-1.5 border-b border-slate-200 flex">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex-1">Carrera</span>
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500 w-28 text-center">Cierre</span>
                            <span class="w-7"></span>
                          </div>
                          <div class="max-h-40 overflow-y-auto">
                            @for (h of findeSabadoHorarios(); track h.id) {
                              <div class="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-100 last:border-0">
                                <span class="text-xs text-slate-700 flex-1 truncate">{{ h.carreras?.nombre || 'ID: ' + h.carrera_id }}</span>
                                @if (editingHorarioId() === h.id) {
                                  <div class="anim-fade-in flex items-center gap-1">
                                    <input type="time" [value]="h.hora_cierre"
                                      (input)="editingHorarioValue.set($any($event.target).value)"
                                      class="w-28 py-0.5 px-1.5 text-[11px] rounded bg-violet-50 border border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono text-slate-700">
                                    <button (click)="saveHorario(h.id, editingHorarioValue() || h.hora_cierre)"
                                      class="p-0.5 text-green-600 hover:bg-green-50 rounded cursor-pointer">
                                      <mat-icon class="text-[14px]">check</mat-icon>
                                    </button>
                                    <button (click)="cancelEditHorario()"
                                      class="p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer">
                                      <mat-icon class="text-[14px]">close</mat-icon>
                                    </button>
                                  </div>
                                } @else {
                                  <div class="anim-fade-in flex items-center gap-1">
                                    <input type="time" [value]="h.hora_cierre" disabled
                                      class="w-28 py-0.5 px-1.5 text-[11px] rounded bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                                    <button (click)="editingHorarioId.set(h.id); editingHorarioValue.set(h.hora_cierre)"
                                      class="p-0.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded cursor-pointer">
                                      <mat-icon class="text-[14px]">edit</mat-icon>
                                    </button>
                                  </div>
                                }
                              </div>
                            }
                            @if (findeSabadoHorarios().length === 0) {
                              <div class="px-2 py-3 text-center text-[10px] text-slate-400">No hay carreras configuradas</div>
                            }
                          </div>
                        </div>
                        @if (findeSabadoHorarios().length > 0) {
                          <button (click)="resetHorariosDefault('refrigerio_finde')"
                            class="mt-1 w-full py-1.5 text-[10px] font-medium text-amber-700 hover:bg-amber-50 border border-amber-300 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1">
                            <mat-icon class="text-[12px]">restart_alt</mat-icon>
                            Restablecer por defecto
                          </button>
                        }
                      </div>
                    </div>
                    <!-- Domingo Schedule -->
                    <div class="p-3 bg-indigo-50 rounded-xl space-y-2">
                      <div class="flex items-center justify-between mb-1">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Domingo - Desayuno</p>
                        <div class="flex items-center gap-1">
                          <button (click)="openDiasModal('desayuno_finde')"
                            class="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg cursor-pointer">
                            <mat-icon class="text-[14px]">calendar_month</mat-icon>
                          </button>
                        </div>
                      </div>
                      <p class="text-[9px] text-slate-400">{{ formatDias(desayunoConfig()?.dias_activos) || 'Domingo' }}</p>
                      @if (editingFindeDomingo()) {
                        <div class="anim-fade-in flex items-end gap-2">
                          <div class="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                            <div class="flex-1">
                              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                              <input type="time" [value]="desayunoConfig()?.hora_inicio"
                                (input)="editingFindeDomingoInicio.set($any($event.target).value)"
                                class="w-full py-2 px-3 text-sm rounded-xl bg-white border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-700">
                            </div>
                            <div class="flex-1">
                              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                              <input type="time" [value]="desayunoConfig()?.hora_fin"
                                (input)="editingFindeDomingoFin.set($any($event.target).value)"
                                class="w-full py-2 px-3 text-sm rounded-xl bg-white border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-700">
                            </div>
                          </div>
                          <div class="flex items-center gap-1 flex-shrink-0">
                            <button (click)="saveCardHours('desayuno_finde', editingFindeDomingoInicio() || desayunoConfig()?.hora_inicio, editingFindeDomingoFin() || desayunoConfig()?.hora_fin, 'fin_de_semana_domingo')"
                              class="p-2 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer">
                              <mat-icon class="text-[18px]">check</mat-icon>
                            </button>
                            <button (click)="editingFindeDomingo.set(false)"
                              class="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer">
                              <mat-icon class="text-[18px]">close</mat-icon>
                            </button>
                          </div>
                        </div>
                      } @else {
                        <div class="flex items-end gap-2">
                          <div class="flex-1 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                            <div class="flex-1">
                              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Inicio</label>
                              <input type="time" [value]="desayunoConfig()?.hora_inicio" disabled
                                class="w-full py-2 px-3 text-sm rounded-xl bg-white/60 border border-indigo-200 font-mono text-slate-400 cursor-not-allowed">
                            </div>
                            <div class="flex-1">
                              <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Fin</label>
                              <input type="time" [value]="desayunoConfig()?.hora_fin" disabled
                                class="w-full py-2 px-3 text-sm rounded-xl bg-white/60 border border-indigo-200 font-mono text-slate-400 cursor-not-allowed">
                            </div>
                          </div>
                          <button class="anim-fade-in p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg cursor-pointer flex-shrink-0"
                            (click)="editingFindeDomingo.set(true); editingFindeDomingoInicio.set(desayunoConfig()?.hora_inicio || ''); editingFindeDomingoFin.set(desayunoConfig()?.hora_fin || '')">
                            <mat-icon class="text-[18px]">edit</mat-icon>
                          </button>
                        </div>
                      }
                      <!-- Domingo Horarios expandable -->
                      <button (click)="toggleExpandFindeDomingo()"
                        class="flex items-center gap-2 w-full py-1.5 px-2 text-xs text-slate-600 hover:bg-white/60 rounded-lg transition-all cursor-pointer">
                        <mat-icon class="text-[14px] transition-transform duration-300" [class.rotate-180]="expandedFindeDomingo()">expand_more</mat-icon>
                        Horarios por carrera
                        @if (getCustomCount(findeDomingoHorarios(), desayunoConfig()?.hora_fin) > 0) {
                          <span class="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full">{{ getCustomCount(findeDomingoHorarios(), desayunoConfig()?.hora_fin) }}personalizado</span>
                        }
                      </button>
                      <div class="overflow-hidden transition-all duration-300 ease-in-out" [style.max-height]="expandedFindeDomingo() ? '400px' : '0px'" [style.opacity]="expandedFindeDomingo() ? '1' : '0'">
                        <div class="border border-indigo-200 rounded-lg mt-1 bg-white">
                          <div class="bg-slate-50 px-2 py-1.5 border-b border-slate-200">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500">Horario de cierre por carrera</span>
                            <p class="text-[8px] text-slate-400 mt-0.5">Hora a la que deja de estar disponible cada carrera</p>
                          </div>
                          <div class="bg-slate-50 px-2 py-1.5 border-b border-slate-200 flex">
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500 flex-1">Carrera</span>
                            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500 w-28 text-center">Cierre</span>
                            <span class="w-7"></span>
                          </div>
                          <div class="max-h-40 overflow-y-auto">
                            @for (h of findeDomingoHorarios(); track h.id) {
                              <div class="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-100 last:border-0">
                                <span class="text-xs text-slate-700 flex-1 truncate">{{ h.carreras?.nombre || 'ID: ' + h.carrera_id }}</span>
                                @if (editingHorarioId() === h.id) {
                                  <div class="anim-fade-in flex items-center gap-1">
                                    <input type="time" [value]="h.hora_cierre"
                                      (input)="editingHorarioValue.set($any($event.target).value)"
                                      class="w-28 py-0.5 px-1.5 text-[11px] rounded bg-indigo-50 border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-700">
                                    <button (click)="saveHorario(h.id, editingHorarioValue() || h.hora_cierre)"
                                      class="p-0.5 text-green-600 hover:bg-green-50 rounded cursor-pointer">
                                      <mat-icon class="text-[14px]">check</mat-icon>
                                    </button>
                                    <button (click)="cancelEditHorario()"
                                      class="p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer">
                                      <mat-icon class="text-[14px]">close</mat-icon>
                                    </button>
                                  </div>
                                } @else {
                                  <div class="anim-fade-in flex items-center gap-1">
                                    <input type="time" [value]="h.hora_cierre" disabled
                                      class="w-28 py-0.5 px-1.5 text-[11px] rounded bg-slate-100 border border-slate-200 font-mono text-slate-400 cursor-not-allowed">
                                    <button (click)="editingHorarioId.set(h.id); editingHorarioValue.set(h.hora_cierre)"
                                      class="p-0.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer">
                                      <mat-icon class="text-[14px]">edit</mat-icon>
                                    </button>
                                  </div>
                                }
                              </div>
                            }
                            @if (findeDomingoHorarios().length === 0) {
                              <div class="px-2 py-3 text-center text-[10px] text-slate-400">No hay carreras configuradas</div>
                            }
                          </div>
                        </div>
                        @if (findeDomingoHorarios().length > 0) {
                          <button (click)="resetHorariosDefault('desayuno_finde')"
                            class="mt-1 w-full py-1.5 text-[10px] font-medium text-amber-700 hover:bg-amber-50 border border-amber-300 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1">
                            <mat-icon class="text-[12px]">restart_alt</mat-icon>
                            Restablecer por defecto
                          </button>
                        }
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

        <!-- SECTION 2: Matriz + Supabase + Offline -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Left: Matriz de Carreras (7 Cols) -->
          <div class="lg:col-span-7 space-y-6">
            <!-- Academic Degrees Table - Editable -->
            <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <mat-icon class="text-blue-700">school</mat-icon>
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-slate-900">Carreras y Servicios</h3>
                    <p class="text-[11px] text-slate-500">Editar nombre, jornada y estado de cada carrera</p>
                  </div>
                </div>
                <span class="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                  {{ cafeteriaService.carreras().length }} carreras
                </span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th class="py-2 px-3">ID</th>
                      <th class="py-2 px-3">Nombre Carrera</th>
                      <th class="py-2 px-3">Jornada</th>
                      <th class="py-2 px-3">Servicio</th>
                      <th class="py-2 px-3">Estado</th>
                      <th class="w-20"></th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    @for (c of cafeteriaService.carreras(); track c.id) {
                      <tr [class.bg-blue-50]="editingCarreraId() === c.id">
                        <td class="py-2 px-3 font-mono font-bold text-slate-900">{{ c.id }}</td>
                        <td class="py-2 px-3">
                          @if (editingCarreraId() === c.id) {
                            <input type="text" [value]="editingCarreraNombre()"
                              (input)="editingCarreraNombre.set($any($event.target).value)"
                              class="w-full py-1 px-2 text-xs rounded-lg bg-blue-50 border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-800">
                          } @else {
                            <span class="font-bold text-slate-800">{{ c.nombre }}</span>
                          }
                        </td>
                        <td class="py-2 px-3">
                          @if (editingCarreraId() === c.id) {
                            <select [value]="editingCarreraJornada()"
                              (change)="editingCarreraJornada.set($any($event.target).value)"
                              class="w-full py-1 px-2 text-xs rounded-lg bg-blue-50 border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700">
                              <option value="Diurna">Diurna</option>
                              <option value="Nocturna">Nocturna</option>
                              <option value="Fin de semana">Fin de semana</option>
                            </select>
                          } @else {
                            <span class="text-slate-600">{{ c.jornada }}</span>
                          }
                        </td>
                        <td class="py-2 px-3">
                          <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                            {{ c.servicioDefecto }}
                          </span>
                        </td>
                        <td class="py-2 px-3">
                          @if (editingCarreraId() === c.id) {
                            <label class="flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" [checked]="editingCarreraActivo()"
                                (change)="editingCarreraActivo.set($any($event.target).checked)"
                                class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                              <span class="text-[10px] font-medium text-slate-600">{{ editingCarreraActivo() ? 'Activa' : 'Inactiva' }}</span>
                            </label>
                          } @else {
                            @if (c.activo !== false) {
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                <mat-icon class="text-[10px]">check_circle</mat-icon> Activa
                              </span>
                            } @else {
                              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-full">
                                <mat-icon class="text-[10px]">cancel</mat-icon> Inactiva
                              </span>
                            }
                          }
                        </td>
                        <td class="py-2 px-3">
                          @if (editingCarreraId() === c.id) {
                            <div class="flex items-center gap-1">
                              <button (click)="saveCarrera(c.id)"
                                class="p-1 text-green-600 hover:bg-green-50 rounded cursor-pointer">
                                <mat-icon class="text-[16px]">check</mat-icon>
                              </button>
                              <button (click)="cancelEditCarrera()"
                                class="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer">
                                <mat-icon class="text-[16px]">close</mat-icon>
                              </button>
                            </div>
                          } @else {
                            <button (click)="startEditCarrera(c)"
                              class="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer">
                              <mat-icon class="text-[16px]">edit</mat-icon>
                            </button>
                          }
                        </td>
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

                <div class="pt-2">
                  <button
                    type="button"
                    (click)="testSupabaseConnection()"
                    [disabled]="isTestingConnection()"
                    class="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <mat-icon [class.animate-spin]="isTestingConnection()" class="text-xs">network_check</mat-icon>
                    <span>{{ isTestingConnection() ? 'Verificando latencia...' : 'Probar Conexion con Supabase' }}</span>
                  </button>
                </div>

                @if (connectionTestResult(); as res) {
                  <div class="p-3 rounded-xl text-xs font-medium border" [class.bg-emerald-50]="res.success" [class.border-emerald-200]="res.success" [class.text-emerald-800]="res.success" [class.bg-red-50]="!res.success" [class.border-red-200]="!res.success" [class.text-red-800]="!res.success">
                    @if (res.success) {
                      <p class="font-bold flex items-center gap-1">
                        <mat-icon class="text-xs text-emerald-600">check_circle</mat-icon>
                        Conexion exitosa con Supabase
                      </p>
                      <p class="text-[11px] mt-0.5">Latencia de respuesta: <strong>{{ res.latencyMs }} ms</strong></p>
                    } @else {
                      <p class="font-bold flex items-center gap-1">
                        <mat-icon class="text-xs text-red-600">error</mat-icon>
                        Fallo de conexion
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
                    <p class="font-bold text-slate-800">Cola de Sincronizacion</p>
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
                    <span>Forzar Sincronizacion</span>
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

    <!-- Dias Modal -->
    @if (modalDias()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
            <h3 class="text-lg font-bold text-white">Dias de {{ modalDias()?.tipo }}</h3>
            <p class="text-blue-100 text-xs mt-0.5">Selecciona los dias que funciona</p>
          </div>
          <div class="p-4 space-y-2">
            @for (dia of ALL_DAYS; track dia) {
              <label class="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-all"
                [class.bg-blue-50]="modalDias()?.dias?.includes(dia)"
                [class.border]="modalDias()?.dias?.includes(dia)"
                [class.border-blue-300]="modalDias()?.dias?.includes(dia)">
                <input type="checkbox" [checked]="modalDias()?.dias?.includes(dia)"
                  (change)="toggleDiaModal(dia)"
                  class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
                <span class="text-sm font-medium text-slate-700 capitalize">{{ dia }}</span>
              </label>
            }
          </div>
          <div class="flex gap-2 p-4 border-t border-slate-100">
            <button (click)="closeDiasModal()"
              class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl transition-all cursor-pointer">
              Cancelar
            </button>
            <button (click)="saveDiasModal()"
              class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-all cursor-pointer">
              Guardar
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class Configuracion implements OnInit {
  readonly cafeteriaService = inject(CafeteriaService);
  private readonly supabase = inject(SupabaseService);
  readonly String = String;

  readonly supabaseUrl = SUPABASE_CONFIG.url;
  readonly isTestingConnection = signal<boolean>(false);
  readonly connectionTestResult = signal<{ success: boolean; latencyMs: number; error?: string } | null>(null);

  readonly loading = signal(true);
  readonly configExpanded = signal(true);
  readonly config = signal<FormConfig[]>([]);
  readonly respuestas = computed(() => this.cafeteriaService.webConfirmaciones() as WebConfirmacion[]);
  readonly filtroTipo = signal<'todos' | 'almuerzo' | 'refrigerio' | 'adea' | 'fin_de_semana'>('todos');
  readonly filtroGeneral = signal('');
  readonly filtroConf = signal('');
  readonly filtroFecha = signal(this.getTodayString());
  readonly highlightConf = signal<number | null>(null);
  readonly carrerasHorarios = signal<any[]>([]);
  readonly carrerasDisponibles = signal<any[]>([]);
  readonly expandedForm = signal<string | null>(null);
  readonly modalDias = signal<{ tipo: string; dias: string[] } | null>(null);
  readonly editingHorarioId = signal<string | number | null>(null);
  readonly editingGeneralHours = signal<boolean>(false);
  readonly editingHorarioValue = signal<string>('');
  readonly editingGeneralInicio = signal<string>('');
  readonly editingGeneralFin = signal<string>('');
  readonly editingAlmuerzo = signal<boolean>(false);
  readonly editingAlmuerzoInicio = signal<string>('');
  readonly editingAlmuerzoFin = signal<string>('');
  readonly editingAdea = signal<boolean>(false);
  readonly editingAdeaInicio = signal<string>('');
  readonly editingAdeaFin = signal<string>('');
  readonly editingFindeSabado = signal<boolean>(false);
  readonly editingFindeSabadoInicio = signal<string>('');
  readonly editingFindeSabadoFin = signal<string>('');
  readonly editingFindeDomingo = signal<boolean>(false);
  readonly editingFindeDomingoInicio = signal<string>('');
  readonly editingFindeDomingoFin = signal<string>('');
  readonly almuerzoHorarios = signal<any[]>([]);
  readonly expandedAlmuerzo = signal<boolean>(false);
  readonly adeaHorarios = signal<any[]>([]);
  readonly expandedAdea = signal<boolean>(false);
  readonly findeSabadoHorarios = signal<any[]>([]);
  readonly expandedFindeSabado = signal<boolean>(false);
  readonly findeDomingoHorarios = signal<any[]>([]);
  readonly expandedFindeDomingo = signal<boolean>(false);

  readonly editingCarreraId = signal<number | null>(null);
  readonly editingCarreraNombre = signal<string>('');
  readonly editingCarreraJornada = signal<string>('');
  readonly editingCarreraActivo = signal<boolean>(true);

  readonly ALL_DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

  formatDias(dias: string[] | undefined): string {
    if (!dias || dias.length === 0) return 'No configurado';
    const weekdayDays = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
    const isWeekday = weekdayDays.every(d => dias.includes(d)) && dias.length === 5;
    if (isWeekday) return 'Lunes a Viernes';
    if (dias.length === 1) {
      const d = dias[0];
      return d.charAt(0).toUpperCase() + d.slice(1);
    }
    return dias.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
  }

  readonly carrerasCustomCount = computed(() => {
    const defaultHora = (this.refrigerioConfig()?.hora_fin || '19:00').substring(0, 5);
    return this.carrerasHorarios().filter(h => h.hora_cierre?.substring(0, 5) !== defaultHora).length;
  });
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
  readonly desayunoConfig = computed(() => this.config().find(c => c.tipo === 'desayuno_finde') || null);

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

  startEditCarrera(carrera: any) {
    this.editingCarreraId.set(carrera.id);
    this.editingCarreraNombre.set(carrera.nombre);
    this.editingCarreraJornada.set(carrera.jornada);
    this.editingCarreraActivo.set(carrera.activo !== false);
  }

  cancelEditCarrera() {
    this.editingCarreraId.set(null);
  }

  async saveCarrera(id: number) {
    try {
      const updates = {
        nombre: this.editingCarreraNombre(),
        jornada: this.editingCarreraJornada() as 'Diurna' | 'Nocturna' | 'Fines de Semana' | 'Fin de semana',
        activo: this.editingCarreraActivo()
      };
      await this.supabase.updateCarrera(id, updates);
      this.cafeteriaService.carreras.update(carreras =>
        carreras.map(c => c.id === id ? { ...c, ...updates } : c)
      );
      this.editingCarreraId.set(null);
      this.cafeteriaService.notify('success', 'Carrera actualizada', 'Los cambios se guardaron correctamente');
    } catch (err) {
      console.error('[Configuracion] Error updating carrera:', err);
      this.cafeteriaService.notify('error', 'Error', 'No se pudo actualizar la carrera');
    }
  }

  async testSupabaseConnection(): Promise<void> {
    this.isTestingConnection.set(true);
    try {
      const result = await this.supabase.testConnection();
      this.connectionTestResult.set(result);
    } finally {
      this.isTestingConnection.set(false);
    }
  }

  async refreshAll() {
    this.loading.set(true);
    try {
      const [configData, respuestasData, carrerasData, horariosData] = await Promise.all([
        this.supabase.fetchFormConfig(),
        Promise.all([
          this.supabase.fetchWebConfirmaciones('almuerzo'),
          this.supabase.fetchWebConfirmaciones('refrigerio'),
          this.supabase.fetchWebConfirmaciones('adea'),
          this.supabase.fetchWebConfirmaciones('fin_de_semana')
        ]).then(([a, r, ad, fs]) => [...a, ...r, ...ad, ...fs]),
        this.supabase.fetchCarreras(),
        this.supabase.fetchCarreraHorarios('refrigerio')
      ]);
      this.config.set(configData);
      this.cafeteriaService.webConfirmaciones.set(respuestasData);
      this.carrerasDisponibles.set(carrerasData);
      this.carrerasHorarios.set(horariosData);
    } catch (err) {
      console.error('[Configuracion] Error loading data:', err);
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
      this.cafeteriaService.notify('success', 'Formulario ' + estado, `El formulario de ${tipo} ahora esta ${estado}`);
    } catch (err) {
      console.error('[Configuracion] Error toggling:', err);
      this.cafeteriaService.notify('error', 'Error', 'No se pudo cambiar el estado del formulario');
    }
  }

  async updateTime(tipo: string, field: string, value: string) {
    const cfg = this.config().find(c => c.tipo === tipo);
    if (!cfg) return;
    try {
      await this.supabase.updateFormConfig(cfg.id, { [field]: value });
      this.config.update(configs =>
        configs.map(c => c.tipo === tipo ? { ...c, [field]: value } : c)
      );
      this.cafeteriaService.notify('success', 'Horario actualizado', `Horario del formulario ${tipo} actualizado`);
    } catch (err) {
      console.error('[Configuracion] Error updating time:', err);
      this.cafeteriaService.notify('error', 'Error', 'No se pudo actualizar el horario');
    }
  }

  toggleExpandForm(formTipo: string) {
    if (this.expandedForm() === formTipo) {
      this.expandedForm.set(null);
    } else {
      this.expandedForm.set(formTipo);
      this.loadCarreraHorarios(formTipo);
    }
  }

  async saveCardHours(configTipo: string, horaInicio: string | undefined, horaFin: string | undefined, editSignalType: string) {
    const cfg = this.config().find(c => c.tipo === configTipo);
    if (!cfg) return;
    try {
      const patch: any = {};
      if (horaInicio) patch.hora_inicio = horaInicio;
      if (horaFin) patch.hora_fin = horaFin;
      await this.supabase.updateFormConfig(cfg.id, patch);
      this.config.update(cfgs => cfgs.map(c => c.tipo === configTipo ? { ...c, ...patch } : c));
      if (editSignalType === 'almuerzo') this.editingAlmuerzo.set(false);
      else if (editSignalType === 'adea') this.editingAdea.set(false);
      else if (editSignalType === 'fin_de_semana_sabado') this.editingFindeSabado.set(false);
      else if (editSignalType === 'fin_de_semana_domingo') this.editingFindeDomingo.set(false);
      this.cafeteriaService.notify('success', 'Horario actualizado', 'Horarios actualizados');
    } catch (err) {
      console.error('[Configuracion] Error updating card hours:', err);
      this.cafeteriaService.notify('error', 'Error', 'No se pudo actualizar el horario');
    }
  }

  openDiasModal(tipo: string) {
    const cfg = this.config().find(c => c.tipo === tipo);
    const dias = cfg?.dias_activos || [];
    this.modalDias.set({ tipo, dias: [...dias] });
  }

  closeDiasModal() {
    this.modalDias.set(null);
  }

  toggleDiaModal(dia: string) {
    const m = this.modalDias();
    if (!m) return;
    const idx = m.dias.indexOf(dia);
    if (idx >= 0) {
      m.dias.splice(idx, 1);
    } else {
      m.dias.push(dia);
    }
    this.modalDias.set({ ...m, dias: [...m.dias] });
  }

  async saveDiasModal() {
    const m = this.modalDias();
    if (!m) return;
    try {
      const cfg = this.config().find(c => c.tipo === m.tipo);
      if (cfg) {
        await this.supabase.updateFormConfig(cfg.id, { dias_activos: m.dias });
        this.config.update(configs =>
          configs.map(c => c.tipo === m.tipo ? { ...c, dias_activos: m.dias } : c)
        );
        this.cafeteriaService.notify('success', 'Dias actualizados', `Dias del formulario ${m.tipo} actualizados`);
      }
      this.closeDiasModal();
    } catch (err) {
      console.error('[Configuracion] Error saving dias:', err);
      this.cafeteriaService.notify('error', 'Error', 'No se pudieron guardar los dias');
    }
  }

  toggleExpandAlmuerzo() {
    if (this.expandedAlmuerzo()) {
      this.expandedAlmuerzo.set(false);
    } else {
      this.expandedAlmuerzo.set(true);
      this.loadCardHorarios('almuerzo', this.almuerzoHorarios);
    }
  }

  toggleExpandAdea() {
    if (this.expandedAdea()) {
      this.expandedAdea.set(false);
    } else {
      this.expandedAdea.set(true);
      this.loadCardHorarios('almuerzo_adea', this.adeaHorarios);
    }
  }

  toggleExpandFindeSabado() {
    if (this.expandedFindeSabado()) {
      this.expandedFindeSabado.set(false);
    } else {
      this.expandedFindeSabado.set(true);
      this.loadCardHorarios('refrigerio_finde', this.findeSabadoHorarios);
    }
  }

  toggleExpandFindeDomingo() {
    if (this.expandedFindeDomingo()) {
      this.expandedFindeDomingo.set(false);
    } else {
      this.expandedFindeDomingo.set(true);
      this.loadCardHorarios('desayuno_finde', this.findeDomingoHorarios);
    }
  }

  async loadCardHorarios(formTipo: string, targetSignal: typeof this.carrerasHorarios) {
    try {
      const data = await this.supabase.fetchCarreraHorarios(formTipo);
      targetSignal.set(data);
    } catch (err) {
      console.error(`[Configuracion] Error loading horarios for ${formTipo}:`, err);
    }
  }

  getCustomCount(horarios: any[], defaultHoraFin: string | undefined): number {
    const defaultHora = (defaultHoraFin || '').substring(0, 5);
    return horarios.filter(h => h.hora_cierre?.substring(0, 5) !== defaultHora).length;
  }

  async resetHorariosDefault(formTipo: string) {
    const cfg = this.config().find(c => c.tipo === formTipo);
    const defaultHora = cfg?.hora_fin || '19:00';
    try {
      for (const h of this.carrerasHorarios()) {
        if (h.hora_cierre !== defaultHora) {
          await this.supabase.updateCarreraHorario(h.id, { hora_cierre: defaultHora });
        }
      }
      await this.loadCarreraHorarios(formTipo);
      this.cafeteriaService.notify('success', 'Horarios restablecidos', 'Todas las carreras ahora usan la hora general');
    } catch (err) {
      console.error('[Configuracion] Error resetting:', err);
      this.cafeteriaService.notify('error', 'Error', 'No se pudieron restablecer los horarios');
    }
  }

  async loadCarreraHorarios(formTipo: string) {
    try {
      const servicioId = formTipo === 'refrigerio' ? 3 : 2;
      const [horarios, servicios] = await Promise.all([
        this.supabase.fetchCarreraHorarios(formTipo),
        this.supabase.fetchCarreraServicio(servicioId)
      ]);

      const servicioCarreras = new Set(servicios.map((s: any) => s.carrera_id));
      const filtrados = horarios.filter((h: any) => servicioCarreras.has(h.carrera_id));
      this.carrerasHorarios.set(filtrados);
    } catch (err) {
      console.error('[Configuracion] Error loading horarios:', err);
    }
  }

  async saveHorario(horarioId: string | number, horaCierre: string) {
    try {
      await this.supabase.updateCarreraHorario(Number(horarioId), { hora_cierre: horaCierre });
      this.carrerasHorarios.update(hs => hs.map(h => h.id === horarioId ? { ...h, hora_cierre: horaCierre } : h));
      this.editingHorarioId.set(null);
      this.cafeteriaService.notify('success', 'Horario actualizado', 'Hora de cierre actualizada');
    } catch (err) {
      console.error('[Configuracion] Error updating horario:', err);
      this.cafeteriaService.notify('error', 'Error', 'No se pudo actualizar el horario');
    }
  }

  cancelEditHorario() {
    this.editingHorarioId.set(null);
  }

  async saveGeneralHours(tipo: string, horaInicio: string | undefined, horaFin: string | undefined) {
    const cfg = this.config().find(c => c.tipo === tipo);
    if (!cfg) return;
    try {
      const patch: any = {};
      if (horaInicio) patch.hora_inicio = horaInicio;
      if (horaFin) patch.hora_fin = horaFin;
      await this.supabase.updateFormConfig(cfg.id, patch);
      this.config.update(cfgs => cfgs.map(c => c.tipo === tipo ? { ...c, ...patch } : c));
      this.editingGeneralHours.set(false);
      this.cafeteriaService.notify('success', 'Horario actualizado', 'Horarios generales actualizados');
    } catch (err) {
      console.error('[Configuracion] Error updating general hours:', err);
      this.cafeteriaService.notify('error', 'Error', 'No se pudo actualizar el horario');
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
      this.cafeteriaService.webConfirmaciones.update(list => list.filter((r: any) => r.id !== id));
      this.cafeteriaService.confirmaciones.update(list => list.filter(c => c.id !== id));
      this.cafeteriaService.notify('success', 'Eliminado', 'Registro eliminado correctamente');
    } catch (err) {
      console.error('[Configuracion] Error eliminando:', err);
      this.cafeteriaService.notify('error', 'Error', 'No se pudo eliminar el registro');
    }
  }
}
