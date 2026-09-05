import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CafeteriaService } from '../../services/cafeteria.service';
import { getVisualCarrera } from '../../models/cafeteria.models';
import { Beneficiario } from '../../models/cafeteria.models';

@Component({
  selector: 'app-beneficiarios',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="space-y-6">
      <!-- Top header with Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-bold text-slate-900 tracking-tight">Padron de Beneficiarios</h2>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
              {{ cafeteriaService.beneficiarios().length }} registrados
            </span>
          </div>
          <p class="text-xs text-slate-500 mt-1">
            Base maestra de estudiantes sincronizada con el sistema iVMS-4200
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-import-csv"
            type="button"
            (click)="showImportModal.set(true)"
            class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs"
          >
            <mat-icon class="text-sm">upload_file</mat-icon>
            <span>IMPORTAR CSV iVMS</span>
          </button>

          <button
            id="btn-add-beneficiario"
            type="button"
            (click)="openAddModal()"
            class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs"
          >
            <mat-icon class="text-sm">person_add</mat-icon>
            <span>NUEVO BENEFICIARIO</span>
          </button>

          <button
            id="btn-export-beneficiarios-csv"
            type="button"
            (click)="cafeteriaService.exportarBeneficiariosCsv()"
            class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all border border-slate-200"
          >
            <mat-icon class="text-sm">download</mat-icon>
            <span>EXPORTAR CSV</span>
          </button>

          <button
            id="btn-vaciar-padron"
            type="button"
            (click)="vaciarPadron()"
            class="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-2 transition-all border border-red-200"
          >
            <mat-icon class="text-sm">delete_sweep</mat-icon>
            <span>VACIAR PADRÓN</span>
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-5">
        <div class="flex flex-col md:flex-row md:items-end gap-4">
          <!-- Search -->
          <div class="flex-1 min-w-0">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Buscar</span>
            <div class="relative flex items-center">
              <mat-icon class="absolute left-3 text-slate-400 text-base">search</mat-icon>
              <input
                id="filter-beneficiarios-search"
                type="text"
                [value]="busqueda()"
                (input)="busqueda.set($any($event.target).value)"
                placeholder="Codigo, nombre, email o tarjeta..."
                class="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <!-- Subsidio Filter -->
          <div class="flex-1 min-w-0">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Tipo de Subsidio</span>
            <div class="bg-slate-100 p-1 rounded-lg grid grid-cols-3 gap-1 border border-slate-200">
              <button type="button" (click)="filtroSubsidio.set('Todos'); carreraFiltro.set('TODAS')"
                class="py-2 px-1 sm:px-2.5 rounded-md text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium overflow-hidden"
                [class.bg-white]="filtroSubsidio() === 'Todos'"
                [class.text-slate-900]="filtroSubsidio() === 'Todos'"
                [class.font-bold]="filtroSubsidio() === 'Todos'"
                [class.shadow-xs]="filtroSubsidio() === 'Todos'"
                [class.text-slate-600]="filtroSubsidio() !== 'Todos'">
                <mat-icon [style.fontSize.px]="20" class="shrink-0">layers</mat-icon><span class="hidden sm:inline truncate">Todos</span>
              </button>
              <button type="button" (click)="filtroSubsidio.set('Almuerzo'); carreraFiltro.set('TODAS')"
                class="py-2 px-1 sm:px-2.5 rounded-md text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium overflow-hidden"
                [class.bg-white]="filtroSubsidio() === 'Almuerzo'"
                [class.text-emerald-700]="filtroSubsidio() === 'Almuerzo'"
                [class.font-bold]="filtroSubsidio() === 'Almuerzo'"
                [class.shadow-xs]="filtroSubsidio() === 'Almuerzo'"
                [class.text-slate-600]="filtroSubsidio() !== 'Almuerzo'">
                <mat-icon [style.fontSize.px]="20" class="shrink-0">wb_sunny</mat-icon><span class="hidden sm:inline truncate">Almuerzo</span>
              </button>
              <button type="button" (click)="filtroSubsidio.set('Refrigerio'); carreraFiltro.set('TODAS')"
                class="py-2 px-1 sm:px-2.5 rounded-md text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-medium overflow-hidden"
                [class.bg-white]="filtroSubsidio() === 'Refrigerio'"
                [class.text-blue-700]="filtroSubsidio() === 'Refrigerio'"
                [class.font-bold]="filtroSubsidio() === 'Refrigerio'"
                [class.shadow-xs]="filtroSubsidio() === 'Refrigerio'"
                [class.text-slate-600]="filtroSubsidio() !== 'Refrigerio'">
                <mat-icon [style.fontSize.px]="20" class="shrink-0">nights_stay</mat-icon><span class="hidden sm:inline truncate">Refrigerio</span>
              </button>
            </div>
          </div>

          <!-- Carrera Filter -->
          <div class="flex-1 min-w-0">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Carrera</span>
            <select
              id="filter-beneficiarios-carrera"
              [value]="carreraFiltro()"
              (change)="carreraFiltro.set($any($event.target).value)"
              class="w-full py-2 px-3 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="TODAS">Todas las carreras</option>
              @for (c of carrerasFiltradas(); track c.id) {
                <option [value]="c.nombre">{{ c.nombre }} ({{ c.jornada }})</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Filter summary -->
      <div class="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200">
        @if (selectedCarreraVisual(); as visual) {
          <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border" [class]="visual.badgeClass">
            {{ filteredCount() }} / {{ totalCount() }}
          </span>
          <span class="text-xs font-semibold text-slate-600">
            {{ cafeteriaService.carreras().find(c => c.nombre === carreraFiltro())?.nombre }}
          </span>
        } @else if (filtroSubsidio() !== 'Todos') {
          <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border"
            [class]="filtroSubsidio() === 'Almuerzo' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'">
            {{ filteredCount() }} / {{ totalCount() }}
          </span>
          <span class="text-xs font-semibold text-slate-600">
            {{ filtroSubsidio() }}
          </span>
        } @else {
          <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 text-slate-700 border border-slate-300">
            {{ filteredCount() }} / {{ totalCount() }}
          </span>
          <span class="text-xs font-semibold text-slate-600">
            Todos los beneficiarios
          </span>
        }
      </div>

      <!-- Beneficiarios Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div class="overflow-x-auto">
          <table id="table-beneficiarios" class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('codigo')">
                  <span class="flex items-center gap-1">Codigo iVMS <span class="text-[9px] text-slate-400">{{ sortIcon('codigo') }}</span></span>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('nombre')">
                  <span class="flex items-center gap-1">Nombre Completo <span class="text-[9px] text-slate-400">{{ sortIcon('nombre') }}</span></span>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('genero')">
                  <span class="flex items-center gap-1">Genero <span class="text-[9px] text-slate-400">{{ sortIcon('genero') }}</span></span>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('carrera')">
                  <span class="flex items-center gap-1">Carrera <span class="text-[9px] text-slate-400">{{ sortIcon('carrera') }}</span></span>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('subsidio')">
                  <span class="flex items-center gap-1">Subsidio <span class="text-[9px] text-slate-400">{{ sortIcon('subsidio') }}</span></span>
                </th>
                <th class="py-3 px-4 cursor-pointer hover:bg-slate-200/50 select-none transition-colors" (click)="onSort('tarjeta')">
                  <span class="flex items-center gap-1">N. Tarjeta <span class="text-[9px] text-slate-400">{{ sortIcon('tarjeta') }}</span></span>
                </th>
                <th class="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @if (filteredBeneficiarios().length === 0) {
                <tr>
                  <td colspan="6" class="py-12 text-center text-slate-400">
                    <mat-icon class="text-3xl text-slate-300 mb-1">person_search</mat-icon>
                    <p class="font-medium">No se encontraron beneficiarios con los criterios especificados.</p>
                  </td>
                </tr>
              } @else {
                @for (ben of filteredBeneficiarios(); track ben.id || ben.codigo_id) {
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <!-- Código -->
                    <td class="py-3 px-4 font-mono font-bold text-slate-900">
                      <span class="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">{{ ben.codigo_id }}</span>
                    </td>

                    <!-- Nombre -->
                    <td class="py-3 px-4 font-bold text-slate-900">
                      {{ ben.nombre }}
                    </td>

                    <!-- Género -->
                    <td class="py-3 px-4 text-slate-600">
                      @if (ben.genero === 'H') {
                        <span class="inline-flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px] border border-blue-200">
                          <mat-icon class="text-[12px]">male</mat-icon>
                          Hombre
                        </span>
                      } @else if (ben.genero === 'M') {
                        <span class="inline-flex items-center gap-1 font-semibold text-pink-700 bg-pink-50 px-2 py-0.5 rounded text-[10px] border border-pink-200">
                          <mat-icon class="text-[12px]">female</mat-icon>
                          Mujer
                        </span>
                      } @else {
                        <span class="text-slate-400">—</span>
                      }
                    </td>

                    <!-- Carrera -->
                    <td class="py-3 px-4">
                      @if (ben.carrera_nombre) {
                        <span class="px-2 py-0.5 text-[10px] font-semibold rounded border" [class]="getVisualCarrera(ben.carrera_nombre).badgeClass">
                          {{ ben.carrera_nombre }}
                        </span>
                      } @else {
                        <span class="px-2 py-0.5 text-[10px] font-semibold rounded border bg-stone-100 text-stone-700 border-stone-200">
                          Sin Carrera
                        </span>
                      }
                    </td>

                    <!-- Subsidio -->
                    <td class="py-3 px-4">
                      @if (getTipoComidaNombre(ben.tipo_comida_id) === 'Almuerzo') {
                        <span class="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px]">
                          Almuerzo
                        </span>
                      } @else if (getTipoComidaNombre(ben.tipo_comida_id) === 'Refrigerio') {
                        <span class="font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[10px]">
                          Refrigerio
                        </span>
                      } @else {
                        <span class="font-semibold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full text-[10px]">
                          {{ getTipoComidaNombre(ben.tipo_comida_id) || 'Sin Asignar' }}
                        </span>
                      }
                    </td>

                    <!-- Tarjeta -->
                    <td class="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {{ ben.num_tarjeta || '—' }}
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-4 text-right">
                      <button
                        type="button"
                        (click)="openEditModal(ben)"
                        class="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar datos del beneficiario"
                      >
                        <mat-icon class="text-base">edit</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal: Import CSV iVMS-4200 -->
    @if (showImportModal()) {
      <div 
        id="import-csv-modal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in"
      >
        <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <mat-icon class="text-blue-700">upload_file</mat-icon>
              </div>
              <h3 class="font-bold text-base text-slate-900">Importar Padrón iVMS-4200 (CSV)</h3>
            </div>
            <button 
              (click)="showImportModal.set(false)"
              class="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- Format Specifications Box -->
          <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5 mb-4">
            <p class="font-bold text-slate-900">Especificaciones requeridas del archivo:</p>
            <ul class="list-disc pl-4 space-y-0.5 text-slate-600">
              <li>Delimitador: <strong>Punto y coma (;)</strong></li>
              <li>Cabeceras con asterisco (ej: <code>*ID de persona;*Organización;*Nombre de persona;*Sexo</code>)</li>
              <li>Sexo: <code>1</code> = Hombre, <code>2</code> = Mujer</li>
              <li>La carrera se extrae automáticamente del campo <code>Organización</code> (ej: <code>UNIVERSIDAD/estudiantes/INFORMATICA</code> &rarr; <strong>INFORMATICA</strong>).</li>
              <li>Actualización inteligente: No duplica registros existentes.</li>
            </ul>
          </div>

          <!-- Drag and Drop Dropzone -->
          <button 
            type="button"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onFileDrop($event)"
            (click)="fileInput.click()"
            (keydown.enter)="fileInput.click()"
            [class.border-blue-500]="isDragging()"
            [class.bg-blue-50/50]="isDragging()"
            class="w-full border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50 block"
          >
            <input 
              #fileInput 
              type="file" 
              accept=".csv,text/csv" 
              class="hidden" 
              (change)="onFileSelected($event)" 
            />
            <mat-icon class="text-3xl text-blue-600 mb-2">cloud_upload</mat-icon>
            <p class="text-xs font-bold text-slate-800">Haz clic o arrastra aquí el archivo CSV del iVMS-4200</p>
            <p class="text-[11px] text-slate-500 mt-1">Archivos compatibles: .csv con separador punto y coma (;)</p>
          </button>

          <!-- Sample CSV Quick Load Button -->
          <div class="mt-3 flex items-center justify-between text-xs pt-2">
            <span class="text-slate-500">¿No tienes el archivo a mano?</span>
            <button
              type="button"
              (click)="loadDemoCsvString()"
              class="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
            >
              Cargar CSV de prueba iVMS oficial
            </button>
          </div>

          @if (importStatusMessage()) {
            <div class="mt-4 p-3 rounded-xl text-xs font-medium" [class.bg-emerald-50]="!importError()" [class.text-emerald-800]="!importError()" [class.bg-red-50]="importError()" [class.text-red-800]="importError()">
              {{ importStatusMessage() }}
            </div>
          }

          <div class="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <button
              type="button"
              (click)="showImportModal.set(false)"
              class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Modal: Add / Edit Beneficiario -->
    @if (editingBeneficiario(); as ben) {
      <div 
        id="edit-beneficiario-modal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in"
      >
        <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <mat-icon class="text-emerald-800">person</mat-icon>
              </div>
              <h3 class="font-bold text-base text-slate-900">
                {{ isNewRecord() ? 'Nuevo Beneficiario' : 'Editar Beneficiario' }}
              </h3>
            </div>
            <button 
              (click)="editingBeneficiario.set(null)"
              class="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            >
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <form [formGroup]="beneficiarioForm" (ngSubmit)="saveBeneficiarioForm()" class="space-y-3.5 text-xs">
            <!-- Código ID -->
            <div>
              <label for="ben-codigo-input" class="block font-bold text-slate-700 mb-1">Código ID iVMS (5 dígitos) *</label>
              <input
                id="ben-codigo-input"
                type="text"
                formControlName="codigo_id"
                placeholder="Ej: 80969"
                class="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Nombre -->
            <div>
              <label for="ben-nombre-input" class="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
              <input
                id="ben-nombre-input"
                type="text"
                formControlName="nombre"
                placeholder="Ej: Camila Andrea Morales"
                class="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <!-- Carrera -->
              <div>
                <label for="ben-carrera-input" class="block font-bold text-slate-700 mb-1">Carrera</label>
                <select
                  id="ben-carrera-input"
                  formControlName="carrera_id"
                  class="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                >
                  <option [ngValue]="null">Seleccionar carrera...</option>
                  @for (c of cafeteriaService.carreras(); track c.id) {
                    <option [ngValue]="c.id">{{ c.nombre }} ({{ c.jornada }})</option>
                  }
                </select>
              </div>

              <!-- Género -->
              <div>
                <label for="ben-genero-input" class="block font-bold text-slate-700 mb-1">Género</label>
                <select
                  id="ben-genero-input"
                  formControlName="genero"
                  class="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                >
                  <option value="H">Hombre (H)</option>
                  <option value="M">Mujer (M)</option>
                </select>
              </div>
            </div>

            <!-- Email & Teléfono -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="ben-email-input" class="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  id="ben-email-input"
                  type="email"
                  formControlName="email"
                  placeholder="estudiante@universidad.edu.co"
                  class="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-900"
                />
              </div>
              <div>
                <label for="ben-telefono-input" class="block font-bold text-slate-700 mb-1">Teléfono</label>
                <input
                  id="ben-telefono-input"
                  type="text"
                  formControlName="telefono"
                  placeholder="310 123 4567"
                  class="w-full p-2.5 rounded-lg border border-slate-300 font-medium text-slate-900"
                />
              </div>
            </div>

            <!-- Activo switch -->
            <div class="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="check-activo"
                formControlName="activo"
                class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <label for="check-activo" class="font-bold text-slate-800 cursor-pointer">
                Beneficiario Activo (Permite recibir raciones)
              </label>
            </div>

            <div class="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                (click)="editingBeneficiario.set(null)"
                class="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="beneficiarioForm.invalid"
                class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <mat-icon class="text-xs">save</mat-icon>
                <span>Guardar Beneficiario</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class Beneficiarios {
  readonly cafeteriaService = inject(CafeteriaService);

  readonly busqueda = signal<string>('');
  readonly carreraFiltro = signal<string>('TODAS');
  readonly filtroSubsidio = signal<string>('Todos');

  readonly sortColumn = signal<string>('');
  readonly sortDirection = signal<'asc' | 'desc' | ''>('');

  readonly showImportModal = signal<boolean>(false);
  readonly isDragging = signal<boolean>(false);
  readonly filteredCount = computed(() => this.filteredBeneficiarios().length);
  readonly totalCount = computed(() => this.cafeteriaService.beneficiarios().length);
  readonly carrerasFiltradas = computed(() => {
    const subsidio = this.filtroSubsidio();
    const carreras = this.cafeteriaService.carreras();
    if (subsidio === 'Todos') return carreras;
    return carreras.filter(c => c.servicioDefecto === subsidio);
  });
  readonly selectedCarreraVisual = computed(() => {
    const carrera = this.carreraFiltro();
    if (carrera === 'TODAS') return null;
    return getVisualCarrera(carrera);
  });

  readonly importStatusMessage = signal<string>('');
  readonly importError = signal<boolean>(false);

  readonly editingBeneficiario = signal<Beneficiario | null>(null);
  readonly isNewRecord = signal<boolean>(false);

  readonly beneficiarioForm = new FormGroup({
    id: new FormControl<number | null>(null),
    codigo_id: new FormControl<string>('', [Validators.required]),
    nombre: new FormControl<string>('', [Validators.required]),
    carrera_id: new FormControl<number | null>(null),
    genero: new FormControl<'H' | 'M' | null>('H'),
    email: new FormControl<string | null>(null),
    telefono: new FormControl<string | null>(null),
    activo: new FormControl<boolean>(true)
  });

  readonly filteredBeneficiarios = computed(() => {
    const list = this.cafeteriaService.beneficiarios();
    const query = this.busqueda().toLowerCase().trim();
    const carrera = this.carreraFiltro();
    const subsidio = this.filtroSubsidio();
    const col = this.sortColumn();
    const dir = this.sortDirection();

    let result = list.filter(b => {
      if (subsidio !== 'Todos') {
        const tipoNombre = this.getTipoComidaNombre(b.tipo_comida_id);
        if (tipoNombre !== subsidio) return false;
      }
      if (query) {
        const normCode = this.cafeteriaService.normalizeCode(b.codigo_id);
        const matchCode = b.codigo_id.includes(query) || normCode.includes(query);
        const matchName = b.nombre?.toLowerCase().includes(query);
        const matchCarrera = (b.carrera_nombre || '').toLowerCase().includes(query);
        const matchEmail = b.email?.toLowerCase().includes(query);
        const matchTarjeta = b.num_tarjeta?.toLowerCase().includes(query);
        if (!matchCode && !matchName && !matchCarrera && !matchEmail && !matchTarjeta) return false;
      }
      if (carrera !== 'TODAS') {
        if (b.carrera_nombre !== carrera) return false;
      }
      return true;
    });

    if (col && dir) {
      result = [...result].sort((a, b) => {
        let av: string;
        let bv: string;
        switch (col) {
          case 'codigo': av = a.codigo_id; bv = b.codigo_id; break;
          case 'nombre': av = a.nombre || ''; bv = b.nombre || ''; break;
          case 'genero': av = a.genero || ''; bv = b.genero || ''; break;
          case 'carrera': av = a.carrera_nombre || ''; bv = b.carrera_nombre || ''; break;
          case 'subsidio': av = this.getTipoComidaNombre(a.tipo_comida_id); bv = this.getTipoComidaNombre(b.tipo_comida_id); break;
          case 'tarjeta': av = a.num_tarjeta || ''; bv = b.num_tarjeta || ''; break;
          default: return 0;
        }
        const cmp = av.localeCompare(bv, 'es', { sensitivity: 'base' });
        return dir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  });

  onSort(col: string): void {
    if (this.sortColumn() === col) {
      const dir = this.sortDirection();
      if (dir === '') { this.sortDirection.set('asc'); }
      else if (dir === 'asc') { this.sortDirection.set('desc'); }
      else { this.sortColumn.set(''); this.sortDirection.set(''); }
    } else {
      this.sortColumn.set(col);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(col: string): string {
    if (this.sortColumn() !== col) return '';
    return this.sortDirection() === 'asc' ? '\u25B2' : '\u25BC';
  }

  getVisualCarrera(carreraName?: string) {
    return getVisualCarrera(carreraName);
  }

  openAddModal(): void {
    this.isNewRecord.set(true);
    this.beneficiarioForm.reset({
      id: null,
      codigo_id: '',
      nombre: '',
      carrera_id: null,
      genero: 'H',
      email: null,
      telefono: null,
      activo: true
    });
    this.editingBeneficiario.set({
      codigo_id: '',
      nombre: '',
      activo: true
    });
  }

  openEditModal(ben: Beneficiario): void {
    this.isNewRecord.set(false);
    this.beneficiarioForm.patchValue({
      id: ben.id || null,
      codigo_id: ben.codigo_id,
      nombre: ben.nombre,
      carrera_id: ben.carrera_id || null,
      genero: ben.genero || 'H',
      email: ben.email || null,
      telefono: ben.telefono || null,
      activo: ben.activo
    });
    this.editingBeneficiario.set(ben);
  }

  async saveBeneficiarioForm(): Promise<void> {
    if (this.beneficiarioForm.invalid) return;

    const val = this.beneficiarioForm.value;
    const toSave: Beneficiario = {
      ...(val.id ? { id: val.id } : {}),
      codigo_id: val.codigo_id!,
      nombre: val.nombre!,
      carrera_id: val.carrera_id || null,
      genero: val.genero as 'H' | 'M',
      email: val.email || null,
      telefono: val.telefono || null,
      activo: val.activo ?? true
    };

    await this.cafeteriaService.saveBeneficiario(toSave);
    this.editingBeneficiario.set(null);
  }

  vaciarPadron(): void {
    if (confirm('¿Estás seguro de que deseas VACIAR todo el padrón de beneficiarios? Esta acción no se puede deshacer.')) {
      this.cafeteriaService.vaciarPadron();
    }
  }

  getTipoComidaNombre(tipoComidaId: number | null | undefined): string {
    if (!tipoComidaId) return '';
    const tipo = this.cafeteriaService.tiposComida().find(t => t.id === tipoComidaId);
    return tipo ? tipo.nombre : '';
  }

  // --- Drag & Drop CSV Handlers ---
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      this.readFileContent(file);
    }
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.readFileContent(file);
    }
  }

  private readFileContent(file: File): void {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        await this.processCsvText(text);
      }
    };
    reader.readAsText(file);
  }

  async loadDemoCsvString(): Promise<void> {
    const demoCsv = `*ID de persona;*Organización;*Nombre de persona;*Sexo;Tel.;Correo electrónico;Hora de vigencia;Hora de caducidad;N.° de tarjeta;N.° de habitación;Núm. de piso;confirmacion
00080969;UNIVERSIDAD/estudiantes/SBDIO CAFTERIA;Alexis David Pérez;1;3124567890;alexis.perez@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1001;;;
00042443;UNIVERSIDAD/estudiantes/ING INFORMATICA;Camila Andrea Morales;2;3109876543;camila.morales@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1002;;;
00076578;UNIVERSIDAD/estudiantes/AGROINDUSTRIAL;Tito Salazar Ramírez;1;3151112233;tito.salazar@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1003;;;
00055120;UNIVERSIDAD/estudiantes/MEDICINA;Valentina Restrepo Gil;2;3162223344;valentina.restrepo@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1004;;;
00000035;UNIVERSIDAD/estudiantes/ING AGRONOMICA;Mateo Gómez Castro;1;3173334455;mateo.gomez@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1005;;;
00088142;UNIVERSIDAD/estudiantes/ENFERMERIA;Daniela Ospina Ruiz;2;3184445566;daniela.ospina@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1006;;;
00091033;UNIVERSIDAD/estudiantes/ADMON FINANCIERA;Julián Andrés Echeverry;1;3195556677;julian.echeverry@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1007;;;
00064091;UNIVERSIDAD/estudiantes/TRABAJO SOCIAL;Sofía Londoño Arias;2;3206667788;sofia.londono@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1008;;;
00071402;UNIVERSIDAD/estudiantes/ADEA;Sebastián Betancur M.;1;3217778899;sebastian.betancur@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1009;;;
00099201;UNIVERSIDAD/estudiantes/REGENCIA;Mariana Caicedo Vélez;2;3228889900;mariana.caicedo@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1010;;;
00012399;UNIVERSIDAD/estudiantes/TECNICO EN PROCESOS;David Santiago Mora;1;3239990011;david.mora@universidad.edu.co;'2026/01/01 00:00:00;'2026/12/31 23:59:59;T1011;;;`;

    await this.processCsvText(demoCsv);
  }

  private async processCsvText(text: string): Promise<void> {
    try {
      this.importError.set(false);
      this.importStatusMessage.set('Procesando y validando líneas del CSV...');

      const result = await this.cafeteriaService.importarCsvIvms(text);
      this.importStatusMessage.set(`¡Éxito! Se procesaron ${result.totalProcessed} registros y se sincronizaron con el padrón.`);
      
      setTimeout(() => {
        this.showImportModal.set(false);
        this.importStatusMessage.set('');
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar el archivo CSV.';
      this.importError.set(true);
      this.importStatusMessage.set(message);
    }
  }
}
