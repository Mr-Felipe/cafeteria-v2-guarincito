import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CafeteriaService } from '../../services/cafeteria.service';
import { DeliverySearchResult } from '../../models/cafeteria.models';

@Component({
  selector: 'app-entrega-rapida',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      <!-- Top banner / Operation Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold">
            <mat-icon class="text-blue-600 text-xl">qr_code_scanner</mat-icon>
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-900 tracking-tight">Entrega Rápida de Raciones</h2>
            <p class="text-xs text-slate-500">Escanea o escribe el código de 5 dígitos del estudiante</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <mat-icon class="text-xs text-emerald-600">verified</mat-icon>
            Lector y Registro Activo
          </span>
        </div>
      </div>

      <!-- Main Interaction Grid: Left Search & Card, Right Recent Stream -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Search Box & Verification Card (8 Cols) -->
        <div class="lg:col-span-8 space-y-4">
          <!-- Search Input Bar -->
          <div class="bg-white rounded-2xl p-4 border-2 border-blue-500/20 shadow-sm focus-within:border-blue-600 transition-all">
            <label for="search-student-input" class="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Búsqueda por Código iVMS o Nombre
            </label>
            <div class="relative flex items-center">
              <div class="absolute left-3.5 text-slate-400 flex items-center pointer-events-none">
                <mat-icon class="text-2xl text-slate-400">search</mat-icon>
              </div>
              <input
                #searchInput
                id="search-student-input"
                type="text"
                [formControl]="searchControl"
                placeholder="Ej: 80969, 42443, 00035 o nombre..."
                autocomplete="off"
                (keydown.enter)="handleEnterKey()"
                class="w-full pl-12 pr-10 py-3 text-lg sm:text-xl font-bold font-mono text-slate-900 placeholder:text-slate-300 rounded-xl focus:outline-none bg-slate-50 border border-slate-200"
              />
              @if (searchControl.value) {
                <button
                  id="btn-clear-search"
                  type="button"
                  (click)="clearSearch()"
                  class="absolute right-3 text-slate-400 hover:text-slate-700 p-1 rounded-md"
                  aria-label="Limpiar búsqueda"
                >
                  <mat-icon class="text-base">close</mat-icon>
                </button>
              }
            </div>

            <!-- Quick Demo Code Pills -->
            <div class="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
              <span class="text-[11px] font-semibold text-slate-400 mr-1">Probar códigos:</span>
              <button 
                type="button" 
                (click)="setSearchCode('42443')" 
                class="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Camila Morales (Almuerzo Válido)"
              >
                42443 (Válido)
              </button>
              <button 
                type="button" 
                (click)="setSearchCode('80969')" 
                class="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                title="Alexis Pérez (Alerta: Carrera diferente)"
              >
                80969 (Alerta Carrera)
              </button>
              <button 
                type="button" 
                (click)="setSearchCode('76578')" 
                class="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 transition-colors"
                title="Tito Salazar (Ya entregado)"
              >
                76578 (Entregado)
              </button>
              <button 
                type="button" 
                (click)="setSearchCode('00035')" 
                class="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Mateo Gómez (Normaliza ceros)"
              >
                00035 (No confirmó)
              </button>
              <button 
                type="button" 
                (click)="setSearchCode('99999')" 
                class="px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 transition-colors"
                title="No está en padrón"
              >
                99999 (Sin Padrón)
              </button>
            </div>
          </div>

          <!-- Live Result Card / Semáforo Status -->
          @if (currentResult(); as res) {
            <div 
              id="verification-result-card" 
              class="rounded-2xl p-6 border-2 transition-all shadow-md animate-in fade-in slide-in-from-bottom-2"
              [class.bg-emerald-50/70]="res.status === 'VALID_READY'"
              [class.border-emerald-500]="res.status === 'VALID_READY'"
              [class.bg-amber-50/70]="res.status === 'VALID_ALERT'"
              [class.border-amber-500]="res.status === 'VALID_ALERT'"
              [class.bg-blue-50/70]="res.status === 'ALREADY_DELIVERED'"
              [class.border-blue-500]="res.status === 'ALREADY_DELIVERED'"
              [class.bg-red-50/70]="res.status === 'NOT_CONFIRMED' || res.status === 'NOT_IN_PADRON'"
              [class.border-red-500]="res.status === 'NOT_CONFIRMED' || res.status === 'NOT_IN_PADRON'"
            >
              <!-- Status Header Pill -->
              <div class="flex items-center justify-between gap-2 mb-4 pb-3 border-b"
                [class.border-emerald-200]="res.status === 'VALID_READY'"
                [class.border-amber-200]="res.status === 'VALID_ALERT'"
                [class.border-blue-200]="res.status === 'ALREADY_DELIVERED'"
                [class.border-red-200]="res.status === 'NOT_CONFIRMED' || res.status === 'NOT_IN_PADRON'"
              >
                <div class="flex items-center gap-2">
                  @if (res.status === 'VALID_READY') {
                    <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <mat-icon class="text-white text-lg">check_circle</mat-icon>
                    </div>
                    <div>
                      <span class="text-xs font-black uppercase tracking-wider text-emerald-800">CONFIRMACIÓN VÁLIDA</span>
                      <p class="text-[11px] text-emerald-700">Listo para entrega inmediata</p>
                    </div>
                  } @else if (res.status === 'VALID_ALERT') {
                    <div class="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center">
                      <mat-icon class="text-white text-lg">warning</mat-icon>
                    </div>
                    <div>
                      <span class="text-xs font-black uppercase tracking-wider text-amber-800">CONFIRMADO CON ALERTA</span>
                      <p class="text-[11px] text-amber-700">Requiere verificación de carrera o nombre</p>
                    </div>
                  } @else if (res.status === 'ALREADY_DELIVERED') {
                    <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <mat-icon class="text-white text-lg">done_all</mat-icon>
                    </div>
                    <div>
                      <span class="text-xs font-black uppercase tracking-wider text-blue-800">RACIÓN YA ENTREGADA</span>
                      <p class="text-[11px] text-blue-700">Registro duplicado bloqueado</p>
                    </div>
                  } @else {
                    <div class="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center">
                      <mat-icon class="text-white text-lg">block</mat-icon>
                    </div>
                    <div>
                      <span class="text-xs font-black uppercase tracking-wider text-red-800">NO SE PUEDE ENTREGAR</span>
                      <p class="text-[11px] text-red-700">
                        {{ res.status === 'NOT_CONFIRMED' ? 'Estudiante no confirmó ración para hoy' : 'Código no encontrado en el padrón' }}
                      </p>
                    </div>
                  }
                </div>

                <!-- Meal Type Badge -->
                <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white shadow-2xs border border-slate-200 text-slate-800">
                  {{ res.tipoComidaNombre }}
                </span>
              </div>

              <!-- Student Profile Details -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <!-- Name & Code -->
                <div>
                  <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre del Beneficiario</p>
                  <p class="text-xl font-black text-slate-900 leading-snug">
                    {{ res.beneficiario?.nombre || res.confirmacion?.beneficiario_nombre || 'No Registrado' }}
                  </p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700">
                      ID: {{ res.codigo_id }} (Norm: {{ res.normalized_code }})
                    </span>
                    @if (res.beneficiario?.genero) {
                      <span class="text-[11px] font-semibold text-slate-500">
                        Género: {{ res.beneficiario?.genero === 'H' ? 'Hombre' : 'Mujer' }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Academic Info -->
                <div class="bg-white/70 p-3 rounded-xl border border-slate-200/60">
                  <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Carrera y Jornada</p>
                  <p class="text-sm font-bold text-slate-800">
                    {{ res.beneficiario?.carrera_nombre || res.confirmacion?.carrera_nombre || 'Sin Carrera Asignada' }}
                  </p>
                  @if (res.confirmacion?.carrera_en_form && res.confirmacion?.carrera_en_form !== res.beneficiario?.carrera_nombre) {
                    <p class="text-xs text-amber-700 font-medium mt-1">
                      ⚠️ En Form eligió: <strong class="underline">{{ res.confirmacion?.carrera_en_form }}</strong>
                    </p>
                  }
                  <p class="text-[11px] text-slate-500 mt-1">
                    Servicio habitual: {{ res.tipoComidaNombre }}
                  </p>
                </div>
              </div>

              <!-- Alert Details Box if any -->
              @if (res.alertDetails) {
                <div class="mb-5 p-3.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                  <mat-icon class="text-amber-700 text-base shrink-0 mt-0.5">report_problem</mat-icon>
                  <div>
                    <strong class="font-bold">Detalle de la Alerta:</strong> {{ res.alertDetails }}
                  </div>
                </div>
              }

              <!-- Action Buttons Area -->
              <div class="pt-2">
                @if (res.status === 'VALID_READY') {
                  <button
                    #deliverButton
                    id="btn-confirm-delivery"
                    type="button"
                    (click)="submitDelivery(res)"
                    [disabled]="isSubmitting()"
                    class="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-lg sm:text-xl uppercase tracking-wider shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3 transition-all cursor-pointer focus:outline-none focus:ring-4 focus:ring-emerald-400"
                  >
                    <mat-icon class="text-2xl">check_circle</mat-icon>
                    <span>{{ isSubmitting() ? 'REGISTRANDO...' : 'ENTREGAR RACIÓN' }}</span>
                  </button>
                  <p class="text-center text-xs text-emerald-800 font-semibold mt-2">
                    (Presiona <kbd class="px-1.5 py-0.5 bg-white rounded border text-[11px]">Enter</kbd> para entregar de inmediato)
                  </p>
                } @else if (res.status === 'VALID_ALERT') {
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      id="btn-deliver-with-alert"
                      type="button"
                      (click)="submitDelivery(res)"
                      [disabled]="isSubmitting()"
                      class="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <mat-icon>check</mat-icon>
                      <span>ENTREGAR CON ALERTA</span>
                    </button>
                    <button
                      id="btn-open-correct-modal"
                      type="button"
                      (click)="openCorrectionModal(res)"
                      class="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <mat-icon>edit_note</mat-icon>
                      <span>CORREGIR Y ANOTAR</span>
                    </button>
                  </div>
                } @else if (res.status === 'ALREADY_DELIVERED') {
                  <div class="bg-blue-100/80 p-4 rounded-xl border border-blue-300 text-blue-950 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-blue-700">info</mat-icon>
                      <span class="text-xs font-medium">Entregada hoy a las <strong>{{ res.entrega?.hora?.substring(0, 5) }}</strong> por <strong>{{ res.entrega?.entregado_por }}</strong></span>
                    </div>
                    @if (res.entrega?.id) {
                      <button
                        id="btn-revert-from-card"
                        type="button"
                        (click)="revertEntrega(res.entrega!.id!)"
                        class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-all"
                      >
                        <mat-icon class="text-xs">undo</mat-icon>
                        <span>Revertir</span>
                      </button>
                    }
                  </div>
                } @else {
                  <div class="space-y-3">
                    @if (res.status === 'NOT_CONFIRMED') {
                      <div class="bg-red-100/90 p-4 rounded-xl border border-red-300 text-red-950 flex items-center gap-3">
                        <mat-icon class="text-red-700 text-xl">warning</mat-icon>
                        <div>
                          <p class="text-xs font-bold">{{ res.message }}</p>
                          <p class="text-[11px] text-red-800 mt-0.5">Este estudiante no confirmó su ración, pero puedes entregar de forma excepcional.</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        (click)="submitDelivery(res)"
                        [disabled]="isSubmitting()"
                        class="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-sm uppercase tracking-wider shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <mat-icon>add_circle</mat-icon>
                        <span>{{ isSubmitting() ? 'REGISTRANDO...' : 'ENTREGA EXCEPCIONAL (SIN CONFIRMACIÓN)' }}</span>
                      </button>
                    } @else {
                      <div class="bg-red-100/90 p-4 rounded-xl border border-red-300 text-red-950 flex items-center gap-3">
                        <mat-icon class="text-red-700 text-xl">error</mat-icon>
                        <div>
                          <p class="text-xs font-bold">{{ res.message }}</p>
                          <p class="text-[11px] text-red-800 mt-0.5">Código no encontrado en el padrón de beneficiarios. No se puede entregar.</p>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          } @else {
            <!-- Empty state illustration / Guide -->
            <div class="bg-white rounded-2xl p-10 border border-slate-200 text-center flex flex-col items-center justify-center min-h-[300px]">
              <div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <mat-icon class="text-3xl">badge</mat-icon>
              </div>
              <h3 class="text-base font-bold text-slate-800">Listo para la entrega</h3>
              <p class="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Ingresa el código o pasa el carné por el lector de código de barras para verificar en tiempo real si el estudiante confirmó su ración.
              </p>
            </div>
          }
        </div>

        <!-- Right: Real-Time Deliveries Stream (4 Cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col h-full min-h-[460px]">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <mat-icon class="text-emerald-600">history</mat-icon>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">Últimas Entregas</h3>
              </div>
              <span class="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {{ cafeteriaService.stats().totalEntregados }} hoy
              </span>
            </div>

            <!-- List of recent deliveries -->
            <div class="flex-1 overflow-y-auto divide-y divide-slate-100 py-1 max-h-[500px]">
              @if (cafeteriaService.activeEntregas().length === 0) {
                <div class="py-12 text-center text-xs text-slate-400">
                  <mat-icon class="text-slate-300 text-3xl mb-1">hourglass_empty</mat-icon>
                  <p>No hay entregas registradas hoy aún.</p>
                </div>
              } @else {
                @for (entrega of cafeteriaService.activeEntregas().slice(0, 15); track entrega.id || entrega.codigo_id) {
                  <div class="py-2.5 px-2 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between gap-2 text-xs">
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-mono font-bold text-slate-900">{{ entrega.codigo_id }}</span>
                        @if (!entrega.confirmacion_id) {
                          <span class="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-full">EXC</span>
                        }
                        <span class="text-slate-400">•</span>
                        <span class="font-semibold text-slate-800 truncate">{{ entrega.beneficiario_nombre }}</span>
                      </div>
                      <p class="text-[11px] text-slate-500 truncate">{{ entrega.carrera_nombre }}</p>
                    </div>
                    <div class="text-right shrink-0">
                      <span class="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {{ entrega.hora.substring(0, 5) }}
                      </span>
                    </div>
                  </div>
                }
              }
            </div>

            <!-- Quick Jump to all deliveries -->
            <div class="pt-3 border-t border-slate-100 text-center">
              <a 
                routerLink="/entregas" 
                class="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1"
              >
                <span>Ver registro completo de entregas</span>
                <mat-icon class="text-xs">arrow_forward</mat-icon>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Modal for Correction -->
    @if (selectedForCorrection(); as corr) {
      <div 
        id="correction-modal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in"
      >
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <mat-icon class="text-amber-800">edit_note</mat-icon>
              </div>
              <h3 class="font-bold text-base text-slate-900">Corregir y Anotar Confirmación</h3>
            </div>
            <button 
              (click)="selectedForCorrection.set(null)"
              class="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="space-y-4 text-xs">
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p class="text-slate-500 font-semibold">Estudiante: <strong class="text-slate-800">{{ corr.beneficiario?.nombre || corr.confirmacion?.beneficiario_nombre }}</strong></p>
              <p class="text-slate-500 font-semibold">Código: <strong class="font-mono text-slate-800">{{ corr.codigo_id }}</strong></p>
              <p class="text-slate-500 font-semibold">Alerta detectada: <strong class="text-amber-700">{{ corr.alertDetails }}</strong></p>
            </div>

            <div>
              <label for="carrera-select-input" class="block font-bold text-slate-700 mb-1">Carrera Real / Aprobada</label>
              <select 
                #carreraSelect
                id="carrera-select-input"
                [value]="corr.beneficiario?.carrera_nombre || corr.confirmacion?.carrera_real || ''"
                class="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-800 bg-white"
              >
                @for (c of cafeteriaService.carreras(); track c.id) {
                  <option [value]="c.nombre">{{ c.nombre }} ({{ c.jornada }})</option>
                }
              </select>
            </div>

            <div>
              <label for="obs-textarea-input" class="block font-bold text-slate-700 mb-1">Observación / Motivo de Aprobación *</label>
              <textarea
                #obsTextarea
                id="obs-textarea-input"
                rows="3"
                placeholder="Ej: Autorizado por coordinador. Alexis pertenece a SBDIO CAFETERIA y se le entrega su ración."
                class="w-full p-2.5 rounded-lg border border-slate-300 text-slate-800 focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              (click)="selectedForCorrection.set(null)"
              class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="saveCorrectionAndDeliver(corr, carreraSelect.value, obsTextarea.value)"
              class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <mat-icon class="text-xs">save</mat-icon>
              <span>Guardar y Entregar</span>
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class EntregaRapida {
  readonly cafeteriaService = inject(CafeteriaService);
  
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('deliverButton') deliverButton?: ElementRef<HTMLButtonElement>;

  readonly searchControl = new FormControl<string>('');
  readonly currentResult = signal<DeliverySearchResult | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly selectedForCorrection = signal<DeliverySearchResult | null>(null);

  constructor() {
    this.searchControl.valueChanges.subscribe(val => {
      if (val && val.trim().length > 0) {
        const result = this.cafeteriaService.searchBeneficiarioOrConfirmacion(val);
        this.currentResult.set(result);
      } else {
        this.currentResult.set(null);
      }
    });
  }

  setSearchCode(code: string): void {
    this.searchControl.setValue(code);
    this.focusInput();
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.currentResult.set(null);
    this.focusInput();
  }

  focusInput(): void {
    setTimeout(() => {
      this.searchInput?.nativeElement?.focus();
    }, 50);
  }

  handleEnterKey(): void {
    const res = this.currentResult();
    if (res && res.status === 'VALID_READY') {
      this.submitDelivery(res);
    } else if (res && res.status === 'VALID_ALERT') {
      this.submitDelivery(res);
    }
  }

  async submitDelivery(item: DeliverySearchResult): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    try {
      const success = await this.cafeteriaService.registrarEntrega(item);
      if (success) {
        // Clear input ready for next student
        this.searchControl.setValue('');
        this.currentResult.set(null);
        this.focusInput();
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async revertEntrega(entregaId: number): Promise<void> {
    await this.cafeteriaService.revertirEntrega(entregaId);
    if (this.searchControl.value) {
      const refreshed = this.cafeteriaService.searchBeneficiarioOrConfirmacion(this.searchControl.value);
      this.currentResult.set(refreshed);
    }
  }

  openCorrectionModal(item: DeliverySearchResult): void {
    this.selectedForCorrection.set(item);
  }

  async saveCorrectionAndDeliver(item: DeliverySearchResult, carreraReal: string, observacion: string): Promise<void> {
    if (!observacion || !observacion.trim()) {
      alert('Por favor escribe el motivo u observación de la corrección.');
      return;
    }

    if (item.confirmacion?.id) {
      await this.cafeteriaService.corregirConfirmacion(item.confirmacion.id, {
        carreraReal,
        observacion: observacion.trim()
      });
    }

    this.selectedForCorrection.set(null);
    await this.submitDelivery(item);
  }
}
