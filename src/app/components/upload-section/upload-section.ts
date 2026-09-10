import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-upload-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
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
              Carga de Datos IVMS-4200 (Hikvision)
            </h2>
          </div>
        </div>

        <button
          type="button"
          (click)="isExpanded.set(!isExpanded())"
          id="btn-toggle-upload"
          class="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded border border-slate-200 transition-colors">
          <span>{{ isExpanded() ? 'Ocultar Carga' : 'Mostrar Panel de Ingestión' }}</span>
          <mat-icon class="text-base">{{ isExpanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
        </button>
      </div>

      @if (isExpanded()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- PARAMETER 1: BENEFICIARIES CSV -->
          <div class="flex flex-col h-full bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-indigo-600 rounded text-white text-[10px] font-bold font-mono flex items-center justify-center">1</span>
                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Padrón Base de Beneficiarios
                </span>
              </div>
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                CSV ( ; )
              </span>
            </div>

            <p class="text-[11px] text-slate-500">
              Formato oficial: <code class="text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[10px]">*ID de persona;*Organización;*Nombre...</code>
            </p>

            <!-- Drop Zone for Beneficiaries -->
            <label
              (dragover)="onDragOver($event)"
              (drop)="onDropBeneficiaries($event)"
              class="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-white flex-1 min-h-[120px]">
              <input
                type="file"
                id="input-beneficiaries-file"
                accept=".csv,.txt"
                class="hidden"
                (change)="onBeneficiariesFileSelected($event)" />
              <mat-icon class="text-2xl text-indigo-600">badge</mat-icon>
              <div class="text-xs font-semibold text-slate-700">
                Beneficiarios (.csv)
              </div>
              <div class="text-[10px] text-slate-400">ID, Org, Nombre, Período de vigencia</div>
              <span class="mt-1 inline-block px-3 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-indigo-600 hover:bg-slate-50 shadow-2xs">
                CARGAR PADRÓN
              </span>
            </label>

            <!-- Status info for Beneficiaries -->
            @if (service.uploadedBeneficiariesFile(); as bFile) {
              <div class="p-3 bg-green-50 rounded border border-green-200 flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 text-xs text-green-900">
                  <mat-icon class="text-green-700 text-base">check_circle</mat-icon>
                  <div>
                    <div class="font-bold text-slate-900 font-mono text-[11px]">{{ bFile.name }}</div>
                    <div class="text-green-700 text-[10px] font-medium">
                      {{ bFile.validRows }} beneficiarios activos registrados
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-mono font-bold">
                    {{ service.organizations().length }} facultades/áreas
                  </span>
                  <button
                    type="button"
                    (click)="removeBeneficiariesFile()"
                    class="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    title="Eliminar padrón de beneficiarios">
                    <mat-icon class="text-sm">delete</mat-icon>
                  </button>
                </div>
              </div>
            } @else {
              <div class="p-2.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
                <mat-icon class="text-amber-600 text-sm">info</mat-icon>
                <span>Padrón pendiente. Carga el CSV o pulsa "Cargar Demo" arriba.</span>
              </div>
            }
          </div>

          <!-- PARAMETER 2: DAILY ATTENDANCE CSVs (MULTIPLE) -->
          <div class="flex flex-col h-full bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 bg-indigo-600 rounded text-white text-[10px] font-bold font-mono flex items-center justify-center">2</span>
                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Logs Diarios de Asistencia
                </span>
              </div>
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                CSV Multi-Archivo
              </span>
            </div>

            <p class="text-[11px] text-slate-500">
              Formato biométrico: <code class="text-slate-800 bg-white px-1 py-0.5 rounded border border-slate-200 font-mono text-[10px]">ID, Nombre, Departamento, Hora, Punto...</code>
            </p>

            <!-- Drop Zone for Attendance Logs -->
            <label
              (dragover)="onDragOver($event)"
              (drop)="onDropAttendance($event)"
              class="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-5 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-white flex-1 min-h-[120px]">
              <input
                type="file"
                id="input-attendance-files"
                accept=".csv,.txt"
                multiple
                class="hidden"
                (change)="onAttendanceFilesSelected($event)" />
              <mat-icon class="text-2xl text-indigo-600">fingerprint</mat-icon>
              <div class="text-xs font-semibold text-slate-700">
                Subir Múltiples CSVs Diarios
              </div>
              <div class="text-[10px] text-slate-400">Marcaciones biométricas, horas y dispositivos</div>
              <span class="mt-1 inline-block px-3 py-1 bg-white border border-slate-200 rounded text-[10px] font-bold text-indigo-600 hover:bg-slate-50 shadow-2xs">
                CARGAR DIARIOS
              </span>
            </label>

            <!-- Multi-file Ingestion List -->
            @if (service.uploadedAttendanceFiles().length > 0) {
              <div class="bg-white p-3 rounded border border-slate-200">
                <div class="flex items-center justify-between text-xs font-bold text-slate-800 mb-1.5">
                  <span class="text-[10px] uppercase tracking-wider text-slate-400 font-mono">ARCHIVOS INGESTADOS:</span>
                  <span class="text-[10px] text-indigo-700 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    {{ service.availableDates().length }} fechas procesadas
                  </span>
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
                          <span class="px-1.5 py-0.2 bg-white border border-slate-200 text-indigo-700 rounded font-mono font-bold">
                            {{ file.detectedDate }}
                          </span>
                        }
                        <span class="text-slate-500 font-mono font-semibold">{{ file.validRows }} reg</span>
                        <button
                          type="button"
                          (click)="removeAttendanceFile(file.name)"
                          class="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          [title]="'Eliminar archivo ' + file.name">
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

        <!-- Automatic Deduplication Notice & Progress bar -->
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
                Se toma la <strong>primera marcación cronológica</strong> de cada beneficiario por día como el almuerzo oficial. Reintentos o lecturas repetidas se aíslan de forma segura.
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
  `
})
export class UploadSectionComponent {
  readonly service = inject(AttendanceService);
  readonly isExpanded = signal<boolean>(true);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDropBeneficiaries(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.readFileContent(file, (content) => {
        this.service.parseBeneficiariesCsv(content, file.name);
      });
    }
  }

  onBeneficiariesFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.readFileContent(file, (content) => {
        this.service.parseBeneficiariesCsv(content, file.name);
      });
    }
  }

  onDropAttendance(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processAttendanceFiles(Array.from(event.dataTransfer.files));
    }
  }

  onAttendanceFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processAttendanceFiles(Array.from(input.files));
    }
  }

  private processAttendanceFiles(files: File[]) {
    const parsedFiles: { name: string; content: string; size: number }[] = [];
    let readCount = 0;

    for (const file of files) {
      this.readFileContent(file, (content) => {
        parsedFiles.push({
          name: file.name,
          content,
          size: file.size
        });
        readCount++;
        if (readCount === files.length) {
          this.service.parseAttendanceCsvs(parsedFiles, true);
        }
      });
    }
  }

  removeBeneficiariesFile() {
    if (confirm('¿Estás seguro de eliminar el padrón de beneficiarios? Se borrarán todos los datos de beneficiarios.')) {
      this.service.removeBeneficiariesFile();
    }
  }

  removeAttendanceFile(fileName: string) {
    if (confirm(`¿Eliminar el archivo ${fileName}? Se borrarán los registros de asistencia de este archivo.`)) {
      this.service.removeAttendanceFile(fileName);
    }
  }

  private readFileContent(file: File, callback: (content: string) => void) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      callback(text);
    };
    reader.readAsText(file, 'UTF-8');
  }
}
