import { ChangeDetectionStrategy, Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceService } from '../../services/attendance.service';
import { FileBrowserComponent, FileBrowserFile } from '../file-browser/file-browser';

@Component({
  selector: 'app-upload-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, FileBrowserComponent],
  template: `
    <section class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 mb-6">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <mat-icon class="text-lg">cloud_upload</mat-icon>
          </div>
          <div>
            <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400">CONFIGURACIÓN & INGESTIÓN</div>
            <h2 class="text-sm sm:text-base font-bold text-slate-900">
              Archivos Almacenados (Supabase Storage)
            </h2>
          </div>
        </div>

        <button
          type="button"
          (click)="isExpanded.set(!isExpanded())"
          class="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded border border-slate-200 transition-colors">
          <span>{{ isExpanded() ? 'Ocultar Panel' : 'Mostrar Panel' }}</span>
          <mat-icon class="text-base">{{ isExpanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
      </div>

      @if (isExpanded()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- PADRÓN DE BENEFICIARIOS -->
          <div class="flex flex-col h-full bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-indigo-600 rounded text-white text-[10px] font-bold font-mono flex items-center justify-center">1</span>
                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Padrón de Beneficiarios
                </span>
              </div>
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                STORAGE
              </span>
            </div>

            <!-- Stored padron count -->
            @if (service.archivosPadron().length > 0) {
              <div class="bg-white p-3 rounded border border-slate-200">
                <div class="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-2">
                  <span>ALMACENADOS: {{ service.archivosPadron().length }}</span>
                </div>
                <!-- Show last 3 files as preview -->
                <div class="space-y-1">
                  @for (file of service.archivosPadron().slice(0, 3); track file.path) {
                    <div class="flex items-center gap-2 p-1.5 bg-slate-50 rounded border border-slate-100 text-[11px]">
                      <mat-icon class="text-slate-400 text-sm">description</mat-icon>
                      <span class="font-mono font-medium text-slate-700 truncate">{{ file.name }}</span>
                      <span class="text-slate-400 text-[9px] ml-auto shrink-0">{{ formatSize(file.size) }}</span>
                    </div>
                  }
                  @if (service.archivosPadron().length > 3) {
                    <div class="text-[9px] text-slate-400 text-center">+{{ service.archivosPadron().length - 3 }} más</div>
                  }
                </div>
                <!-- Ver todos -->
                <button
                  type="button"
                  (click)="abrirNavegadorPadron()"
                  class="mt-2 w-full py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded transition-colors cursor-pointer">
                  NAVEGAR ARCHIVOS
                </button>
              </div>
            } @else {
              <div class="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                <mat-icon class="text-amber-600 text-sm">info</mat-icon>
                <span>No hay padrón almacenado. Sube un CSV para comenzar.</span>
              </div>
            }

            <!-- Upload new padron -->
            <label
              (dragover)="onDragOver($event)"
              (drop)="onDropPadron($event)"
              class="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-white">
              <input
                type="file"
                accept=".csv,.txt"
                class="hidden"
                (change)="onPadronFileSelected($event)" />
              <mat-icon class="text-xl text-indigo-600">cloud_upload</mat-icon>
              <div class="text-xs font-semibold text-slate-700">Subir nuevo padrón CSV</div>
              <div class="text-[10px] text-slate-400">Se guardará en Supabase Storage</div>
            </label>

            <!-- Currently loaded in memory -->
            @if (service.uploadedBeneficiariesFile(); as bFile) {
              <div class="p-2 bg-green-50 rounded border border-green-100 text-[10px] text-green-800 flex items-center gap-1.5">
                <mat-icon class="text-green-600 text-sm">check_circle</mat-icon>
                <span>Cargado en memoria: <strong class="font-mono">{{ bFile.name }}</strong> ({{ bFile.validRows }} registros)</span>
              </div>
            }
          </div>

          <!-- LOGS DE ASISTENCIA -->
          <div class="flex flex-col h-full bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-indigo-600 rounded text-white text-[10px] font-bold font-mono flex items-center justify-center">2</span>
                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Logs de Asistencia
                </span>
              </div>
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                {{ service.archivosAsistencia().length }} ARCHIVOS
              </span>
            </div>

            <!-- Stored attendance count -->
            @if (service.archivosAsistencia().length > 0) {
              <div class="bg-white p-3 rounded border border-slate-200">
                <div class="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-mono font-bold mb-2">
                  <span>ALMACENADOS: {{ service.archivosAsistencia().length }}</span>
                </div>
                <!-- Show last 3 files as preview -->
                <div class="space-y-1">
                  @for (file of service.archivosAsistencia().slice(0, 3); track file.path) {
                    <div class="flex items-center gap-2 p-1.5 bg-slate-50 rounded border border-slate-100 text-[11px]">
                      <mat-icon class="text-slate-400 text-sm">description</mat-icon>
                      <span class="font-mono font-medium text-slate-700 truncate">{{ file.name }}</span>
                      <span class="text-slate-400 text-[9px] ml-auto shrink-0">{{ formatSize(file.size) }}</span>
                    </div>
                  }
                  @if (service.archivosAsistencia().length > 3) {
                    <div class="text-[9px] text-slate-400 text-center">+{{ service.archivosAsistencia().length - 3 }} más</div>
                  }
                </div>
                <!-- Ver todos -->
                <button
                  type="button"
                  (click)="abrirNavegadorAsistencia()"
                  class="mt-2 w-full py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded transition-colors cursor-pointer">
                  NAVEGAR ARCHIVOS
                </button>
              </div>
            } @else {
              <div class="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                <mat-icon class="text-amber-600 text-sm">info</mat-icon>
                <span>No hay archivos de asistencia almacenados. Sube uno o varios CSVs.</span>
              </div>
            }

            <!-- Upload new attendance files -->
            <label
              (dragover)="onDragOver($event)"
              (drop)="onDropAsistencia($event)"
              class="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-4 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-white">
              <input
                type="file"
                accept=".csv,.txt"
                multiple
                class="hidden"
                (change)="onAsistenciaFilesSelected($event)" />
              <mat-icon class="text-xl text-indigo-600">cloud_upload</mat-icon>
              <div class="text-xs font-semibold text-slate-700">Subir CSVs de asistencia</div>
              <div class="text-[10px] text-slate-400">Múltiples archivos permitidos</div>
            </label>

            <!-- Currently loaded in memory -->
            @if (service.uploadedAttendanceFiles().length > 0) {
              <div class="p-2 bg-green-50 rounded border border-green-100 text-[10px] text-green-800 flex items-center gap-1.5">
                <mat-icon class="text-green-600 text-sm">check_circle</mat-icon>
                <span>En memoria: <strong>{{ service.uploadedAttendanceFiles().length }}</strong> archivos · {{ service.stats().totalRawLogs }} registros</span>
              </div>
            }
          </div>

        </div>

        <!-- Stats bar -->
        <div class="mt-5 p-3.5 bg-indigo-50/60 rounded-lg border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950">
          <div class="flex items-start gap-3">
            <div class="p-1.5 bg-indigo-100 rounded text-indigo-700 shrink-0">
              <mat-icon class="text-base">verified_user</mat-icon>
            </div>
            <div>
              <div class="font-bold text-indigo-950 text-xs">
                Filtro Automático de Doble Lectura Biometría & Deduplicación
              </div>
              <p class="text-indigo-800 text-[11px] leading-relaxed mt-0.5">
                Se toma la <strong>primera marcación cronológica</strong> de cada beneficiario por día como el almuerzo oficial.
              </p>
            </div>
          </div>
          
          <div class="shrink-0 sm:min-w-[180px]">
            <div class="flex justify-between items-center mb-1 text-[10px] font-mono">
              <span class="font-bold text-indigo-900 uppercase">LOGS VALIDADOS</span>
              <span class="text-indigo-600 font-bold">{{ service.stats().totalValidLunches }}/{{ service.stats().totalRawLogs }}</span>
            </div>
            <div class="w-full h-1.5 bg-indigo-200 rounded-full overflow-hidden">
              <div
                class="h-full bg-indigo-600 transition-all duration-500"
                [style.width.%]="service.stats().totalRawLogs > 0 ? ((service.stats().totalValidLunches / service.stats().totalRawLogs) * 100) : 100">
              </div>
            </div>
          </div>
        </div>
      }
    </section>

    <!-- File Browser Modals -->
    <app-file-browser
      #browserPadron
      tipo="padron"
      (selectionConfirm)="onPadronSelected($event)"
      (fileDeleted)="onPadronFileDeleted($event)">
    </app-file-browser>

    <app-file-browser
      #browserAsistencia
      tipo="asistencia"
      (selectionConfirm)="onAsistenciaSelected($event)"
      (fileDeleted)="onAsistenciaFileDeleted($event)">
    </app-file-browser>
  `
})
export class UploadSectionComponent {
  readonly service = inject(AttendanceService);
  readonly isExpanded = signal(true);
  readonly loading = signal(false);

  @ViewChild('browserPadron') browserPadron!: FileBrowserComponent;
  @ViewChild('browserAsistencia') browserAsistencia!: FileBrowserComponent;

  // ---- PADRÓN ----

  abrirNavegadorPadron() {
    const files = this.service.archivosPadron();
    this.browserPadron.open(files);
  }

  onPadronSelected(paths: string[]) {
    if (paths.length > 0) {
      this.loading.set(true);
      this.service.cargarPadronDesdeStorage(paths[0]).finally(() => this.loading.set(false));
    }
  }

  onPadronFileDeleted(path: string) {
    this.service.eliminarArchivoPadron(path);
  }

  onDropPadron(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files?.length) {
      this.processPadronFile(event.dataTransfer.files[0]);
    }
  }

  onPadronFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.processPadronFile(input.files[0]);
      input.value = '';
    }
  }

  private async processPadronFile(file: File) {
    this.loading.set(true);
    try {
      const content = await this.readFileContent(file);
      await this.service.subirPadron(file.name, content);
    } finally {
      this.loading.set(false);
    }
  }

  // ---- ASISTENCIA ----

  abrirNavegadorAsistencia() {
    const files = this.service.archivosAsistencia();
    this.browserAsistencia.open(files);
  }

  onAsistenciaSelected(paths: string[]) {
    if (paths.length > 0) {
      this.loading.set(true);
      this.service.cargarAsistenciaDesdeStorage(paths).finally(() => this.loading.set(false));
    }
  }

  onAsistenciaFileDeleted(path: string) {
    this.service.eliminarArchivoAsistencia(path);
  }

  onDropAsistencia(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files?.length) {
      this.processAsistenciaFiles(Array.from(event.dataTransfer.files));
    }
  }

  onAsistenciaFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.processAsistenciaFiles(Array.from(input.files));
      input.value = '';
    }
  }

  private async processAsistenciaFiles(files: File[]) {
    this.loading.set(true);
    try {
      for (const file of files) {
        const content = await this.readFileContent(file);
        await this.service.subirAsistencia(file.name, content);
      }
    } finally {
      this.loading.set(false);
    }
  }

  // ---- HELPERS ----

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsText(file, 'UTF-8');
    });
  }
}
