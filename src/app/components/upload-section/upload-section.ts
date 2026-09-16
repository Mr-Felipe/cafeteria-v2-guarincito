import { ChangeDetectionStrategy, Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceService } from '../../services/attendance.service';
import { FileBrowserComponent } from '../file-browser/file-browser';

@Component({
  selector: 'app-upload-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, FileBrowserComponent],
  template: `
    <section class="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 mb-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <mat-icon class="text-lg">cloud_upload</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-bold text-slate-900">Carga de Datos</h2>
            <p class="text-[10px] text-slate-400">Almacenamiento en Supabase Storage</p>
          </div>
        </div>
      </div>

      <!-- Compact selector cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Padrón -->
        <div class="flex items-center gap-3 p-3 rounded-lg border transition-colors"
             [class]="service.uploadedBeneficiariesFile() ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
               [class]="service.uploadedBeneficiariesFile() ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'">
            <mat-icon class="text-lg">{{ service.uploadedBeneficiariesFile() ? 'check_circle' : 'badge' }}</mat-icon>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold text-slate-800">Padrón Beneficiarios</div>
            @if (service.uploadedBeneficiariesFile(); as bFile) {
              <div class="text-[10px] text-green-700 font-mono truncate">{{ bFile.name }}</div>
              <div class="text-[9px] text-slate-400">{{ bFile.validRows }} registros cargados</div>
            } @else {
              <div class="text-[10px] text-slate-400">Sin cargar</div>
            }
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button (click)="abrirModalPadron()"
              class="px-3 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
              title="Subir nuevo archivo">
              CARGAR
            </button>
            <button (click)="abrirNavegadorPadron()"
              class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Ver archivos en Storage">
              <mat-icon class="text-base">folder_open</mat-icon>
            </button>
          </div>
        </div>

        <!-- Asistencia -->
        <div class="flex items-center gap-3 p-3 rounded-lg border transition-colors"
             [class]="service.uploadedAttendanceFiles().length > 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'">
          <div class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
               [class]="service.uploadedAttendanceFiles().length > 0 ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'">
            <mat-icon class="text-lg">{{ service.uploadedAttendanceFiles().length > 0 ? 'check_circle' : 'fingerprint' }}</mat-icon>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold text-slate-800">Logs de Asistencia</div>
            @if (service.uploadedAttendanceFiles().length > 0) {
              <div class="text-[10px] text-green-700 font-mono">{{ service.uploadedAttendanceFiles().length }} archivos cargados</div>
              <div class="text-[9px] text-slate-400">{{ service.stats().totalRawLogs }} registros</div>
            } @else {
              <div class="text-[10px] text-slate-400">Sin cargar</div>
            }
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button (click)="abrirModalAsistencia()"
              class="px-3 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
              title="Subir nuevos archivos">
              CARGAR
            </button>
            <button (click)="abrirNavegadorAsistencia()"
              class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="Ver archivos en Storage">
              <mat-icon class="text-base">folder_open</mat-icon>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ========== MODAL PADRÓN ========== -->
    @if (modalPadron()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
           (click)="cerrarModalPadron()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="bg-gradient-to-r from-indigo-600 to-indigo-700 p-4 flex items-center justify-between shrink-0">
            <div>
              <h3 class="text-base font-bold text-white">Subir Padrón de Beneficiarios</h3>
              <p class="text-indigo-200 text-[10px]">CSV con lista de beneficiarios</p>
            </div>
            <button (click)="cerrarModalPadron()" class="p-1 text-white/70 hover:text-white cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="p-4 space-y-4 overflow-y-auto">
            <!-- Drag & Drop zone -->
            <label
              (dragover)="onDragOverPadron($event)"
              (dragleave)="dragOverPadron.set(false)"
              (drop)="onDropPadron($event)"
              class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2"
              [class]="dragOverPadron() ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'">
              <input type="file" accept=".csv,.txt" class="hidden" (change)="onPadronFileSelected($event)" />
              <mat-icon class="text-2xl" [class]="dragOverPadron() ? 'text-indigo-600' : 'text-slate-400'">cloud_upload</mat-icon>
              <div class="text-sm font-semibold text-slate-700">Arrastra un CSV aquí</div>
              <div class="text-[10px] text-slate-400">o haz clic para seleccionar</div>
            </label>

            <!-- Upload log -->
            @if (uploadLogPadron().length > 0) {
              <div class="space-y-1.5">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Últimas subidas</div>
                @for (log of uploadLogPadron(); track log.time) {
                  <div class="flex items-center gap-2 p-2 rounded-lg text-[11px]"
                       [class]="log.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'">
                    <mat-icon class="text-sm">{{ log.ok ? 'check_circle' : 'error' }}</mat-icon>
                    <span class="font-mono truncate flex-1">{{ log.name }}</span>
                    <span class="text-[9px] opacity-60 shrink-0">{{ log.time }}</span>
                  </div>
                }
              </div>
            }

            <!-- Already loaded in memory -->
            @if (service.uploadedBeneficiariesFile(); as bFile) {
              <div class="p-2.5 bg-green-50 rounded-lg border border-green-100 text-[11px] text-green-800 flex items-center gap-2">
                <mat-icon class="text-green-600 text-sm">check_circle</mat-icon>
                <span>Cargado en memoria: <strong class="font-mono">{{ bFile.name }}</strong> ({{ bFile.validRows }} registros)</span>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <!-- ========== MODAL ASISTENCIA ========== -->
    @if (modalAsistencia()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
           (click)="cerrarModalAsistencia()">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[85vh] flex flex-col" (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between shrink-0">
            <div>
              <h3 class="text-base font-bold text-white">Subir Logs de Asistencia</h3>
              <p class="text-blue-200 text-[10px]">CSVs exportados de IVMS-4200</p>
            </div>
            <button (click)="cerrarModalAsistencia()" class="p-1 text-white/70 hover:text-white cursor-pointer">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="p-4 space-y-4 overflow-y-auto">
            <!-- Drag & Drop zone -->
            <label
              (dragover)="onDragOverAsistencia($event)"
              (dragleave)="dragOverAsistencia.set(false)"
              (drop)="onDropAsistencia($event)"
              class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2"
              [class]="dragOverAsistencia() ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'">
              <input type="file" accept=".csv,.txt" multiple class="hidden" (change)="onAsistenciaFilesSelected($event)" />
              <mat-icon class="text-2xl" [class]="dragOverAsistencia() ? 'text-blue-600' : 'text-slate-400'">cloud_upload</mat-icon>
              <div class="text-sm font-semibold text-slate-700">Arrastra CSVs aquí</div>
              <div class="text-[10px] text-slate-400">Múltiples archivos permitidos</div>
            </label>

            <!-- Upload log -->
            @if (uploadLogAsistencia().length > 0) {
              <div class="space-y-1.5">
                <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Últimas subidas</div>
                @for (log of uploadLogAsistencia(); track log.time) {
                  <div class="flex items-center gap-2 p-2 rounded-lg text-[11px]"
                       [class]="log.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'">
                    <mat-icon class="text-sm">{{ log.ok ? 'check_circle' : 'error' }}</mat-icon>
                    <span class="font-mono truncate flex-1">{{ log.name }}</span>
                    <span class="text-[9px] opacity-60 shrink-0">{{ log.time }}</span>
                  </div>
                }
              </div>
            }

            <!-- Already loaded in memory -->
            @if (service.uploadedAttendanceFiles().length > 0) {
              <div class="p-2.5 bg-green-50 rounded-lg border border-green-100 text-[11px] text-green-800 flex items-center gap-2">
                <mat-icon class="text-green-600 text-sm">check_circle</mat-icon>
                <span>En memoria: <strong>{{ service.uploadedAttendanceFiles().length }}</strong> archivos · {{ service.stats().totalRawLogs }} registros</span>
              </div>
            }
          </div>
        </div>
      </div>
    }

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
  readonly loading = signal(false);

  readonly modalPadron = signal(false);
  readonly modalAsistencia = signal(false);
  readonly dragOverPadron = signal(false);
  readonly dragOverAsistencia = signal(false);

  readonly uploadLogPadron = signal<{ name: string; ok: boolean; time: string }[]>([]);
  readonly uploadLogAsistencia = signal<{ name: string; ok: boolean; time: string }[]>([]);

  @ViewChild('browserPadron') browserPadron!: FileBrowserComponent;
  @ViewChild('browserAsistencia') browserAsistencia!: FileBrowserComponent;

  private nowStr(): string {
    return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  // ---- MODALS ----

  abrirModalPadron() {
    this.modalPadron.set(true);
  }

  cerrarModalPadron() {
    this.modalPadron.set(false);
    this.dragOverPadron.set(false);
  }

  abrirModalAsistencia() {
    this.modalAsistencia.set(true);
  }

  cerrarModalAsistencia() {
    this.modalAsistencia.set(false);
    this.dragOverAsistencia.set(false);
  }

  // ---- BROWSER (Storage) ----

  abrirNavegadorPadron() {
    this.browserPadron.open(this.service.archivosPadron());
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

  abrirNavegadorAsistencia() {
    this.browserAsistencia.open(this.service.archivosAsistencia());
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

  // ---- PADRÓN UPLOAD ----

  onDragOverPadron(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverPadron.set(true);
  }

  onDropPadron(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverPadron.set(false);
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
      this.uploadLogPadron.update(logs => [{ name: file.name, ok: true, time: this.nowStr() }, ...logs].slice(0, 10));
    } catch {
      this.uploadLogPadron.update(logs => [{ name: file.name, ok: false, time: this.nowStr() }, ...logs].slice(0, 10));
    } finally {
      this.loading.set(false);
    }
  }

  // ---- ASISTENCIA UPLOAD ----

  onDragOverAsistencia(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverAsistencia.set(true);
  }

  onDropAsistencia(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverAsistencia.set(false);
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
        this.uploadLogAsistencia.update(logs => [{ name: file.name, ok: true, time: this.nowStr() }, ...logs].slice(0, 10));
      }
    } catch {
      this.uploadLogAsistencia.update(logs => [{ name: 'Error en lote', ok: false, time: this.nowStr() }, ...logs].slice(0, 10));
    } finally {
      this.loading.set(false);
    }
  }

  // ---- HELPERS ----

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsText(file, 'UTF-8');
    });
  }
}
