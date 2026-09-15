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
        <button
          type="button"
          (click)="isExpanded.set(!isExpanded())"
          class="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded border border-slate-200 transition-colors">
          <span>{{ isExpanded() ? 'Ocultar' : 'Configurar' }}</span>
          <mat-icon class="text-base">{{ isExpanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
      </div>

      <!-- Compact selector cards (always visible) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
            <button
              type="button"
              (click)="abrirNavegadorPadron()"
              class="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
              title="Seleccionar de Storage">
              <mat-icon class="text-base">folder_open</mat-icon>
            </button>
            <label
              (dragover)="onDragOver($event)"
              (drop)="onDropPadron($event)"
              class="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Subir nuevo archivo">
              <input type="file" accept=".csv,.txt" class="hidden" (change)="onPadronFileSelected($event)" />
              <mat-icon class="text-base">cloud_upload</mat-icon>
            </label>
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
            <button
              type="button"
              (click)="abrirNavegadorAsistencia()"
              class="p-1.5 rounded-md text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
              title="Seleccionar de Storage">
              <mat-icon class="text-base">folder_open</mat-icon>
            </button>
            <label
              (dragover)="onDragOver($event)"
              (drop)="onDropAsistencia($event)"
              class="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Subir nuevo archivo">
              <input type="file" accept=".csv,.txt" multiple class="hidden" (change)="onAsistenciaFilesSelected($event)" />
              <mat-icon class="text-base">cloud_upload</mat-icon>
            </label>
          </div>
        </div>
      </div>

      <!-- Expanded config panel -->
      @if (isExpanded()) {
        <div class="border-t border-slate-100 pt-4 space-y-4">
          <!-- Storage info -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Padrón files in storage -->
            <div class="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Storage: Padrón</span>
                <span class="text-[9px] font-mono text-slate-500">{{ service.archivosPadron().length }} archivo(s)</span>
              </div>
              @if (service.archivosPadron().length === 0) {
                <div class="text-[10px] text-slate-400 text-center py-2">Vacío</div>
              } @else {
                <div class="space-y-1 max-h-24 overflow-y-auto">
                  @for (file of service.archivosPadron(); track file.path) {
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-600">
                      <mat-icon class="text-slate-400 text-xs">description</mat-icon>
                      <span class="truncate font-mono flex-1">{{ file.name }}</span>
                      <span class="text-slate-400 shrink-0">{{ formatSize(file.size) }}</span>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Asistencia files in storage -->
            <div class="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Storage: Asistencia</span>
                <span class="text-[9px] font-mono text-slate-500">{{ service.archivosAsistencia().length }} archivo(s)</span>
              </div>
              @if (service.archivosAsistencia().length === 0) {
                <div class="text-[10px] text-slate-400 text-center py-2">Vacío</div>
              } @else {
                <div class="space-y-1 max-h-24 overflow-y-auto">
                  @for (file of service.archivosAsistencia(); track file.path) {
                    <div class="flex items-center gap-1.5 text-[10px] text-slate-600">
                      <mat-icon class="text-slate-400 text-xs">description</mat-icon>
                      <span class="truncate font-mono flex-1">{{ file.name }}</span>
                      <span class="text-slate-400 shrink-0">{{ formatSize(file.size) }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Dedup notice -->
          <div class="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-start gap-3 text-xs text-indigo-950">
            <div class="p-1.5 bg-indigo-100 rounded text-indigo-700 shrink-0">
              <mat-icon class="text-base">verified_user</mat-icon>
            </div>
            <div>
              <div class="font-bold text-indigo-950 text-xs">Deduplicación Automática</div>
              <p class="text-indigo-800 text-[10px] leading-relaxed mt-0.5">
                Se toma la <strong>primera marcación cronológica</strong> de cada beneficiario por día como el almuerzo oficial.
              </p>
            </div>
            <div class="shrink-0 ml-auto">
              <div class="text-[9px] font-mono text-right">
                <div class="font-bold text-indigo-900">{{ service.stats().totalValidLunches }}/{{ service.stats().totalRawLogs }}</div>
                <div class="text-indigo-500">validados</div>
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
  readonly isExpanded = signal(false);
  readonly loading = signal(false);

  @ViewChild('browserPadron') browserPadron!: FileBrowserComponent;
  @ViewChild('browserAsistencia') browserAsistencia!: FileBrowserComponent;

  // ---- PADRÓN ----

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
