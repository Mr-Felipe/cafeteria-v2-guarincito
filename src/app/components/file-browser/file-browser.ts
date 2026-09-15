import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface FileBrowserFile {
  name: string;
  path: string;
  size: number;
  createdAt: string;
}

@Component({
  selector: 'app-file-browser',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" (click)="close()"></div>
        
        <!-- Modal -->
        <div class="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <mat-icon class="text-lg">{{ tipo === 'padron' ? 'badge' : 'fingerprint' }}</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-slate-900">
                  {{ tipo === 'padron' ? 'Seleccionar Padrón' : 'Seleccionar Logs de Asistencia' }}
                </h3>
                <p class="text-[10px] text-slate-400">
                  {{ tipo === 'padron' ? 'Archivos almacenados en Supabase Storage' : 'Selecciona uno o varios archivos para cargar' }}
                </p>
              </div>
            </div>
            <button
              type="button"
              (click)="close()"
              class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
              <mat-icon class="text-lg">close</mat-icon>
            </button>
          </div>

          <!-- File list -->
          <div class="flex-1 overflow-y-auto px-5 py-3">
            @if (files().length === 0) {
              <div class="py-8 text-center">
                <mat-icon class="text-4xl text-slate-300 mb-2">folder_open</mat-icon>
                <p class="text-sm text-slate-400">No hay archivos almacenados</p>
                <p class="text-[10px] text-slate-300 mt-1">Sube un CSV primero para que aparezca aquí</p>
              </div>
            } @else {
              <div class="space-y-1.5">
                @for (file of files(); track file.path) {
                  <div
                    class="flex items-center justify-between p-2.5 rounded-lg border transition-colors cursor-pointer"
                    [class]="isSelected(file.path) 
                      ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200' 
                      : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'"
                    (click)="toggleSelection(file)">
                    
                    <div class="flex items-center gap-3 truncate">
                      @if (tipo === 'asistencia') {
                        <input
                          type="checkbox"
                          [checked]="isSelected(file.path)"
                          class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0" />
                      } @else {
                        <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                             [class]="isSelected(file.path) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'">
                          @if (isSelected(file.path)) {
                            <mat-icon class="text-white text-xs">check</mat-icon>
                          }
                        </div>
                      }
                      <div class="truncate">
                        <div class="font-mono text-xs font-medium text-slate-800 truncate">{{ file.name }}</div>
                        <div class="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{{ formatSize(file.size) }}</span>
                          @if (file.createdAt) {
                            <span>· {{ formatDate(file.createdAt) }}</span>
                          }
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      (click)="deleteFile(file, $event)"
                      class="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                      title="Eliminar archivo">
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Footer -->
          <div class="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50 rounded-b-xl">
            <span class="text-[10px] text-slate-400">
              {{ selectedPaths.size }} de {{ files().length }} seleccionado(s)
            </span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="close()"
                class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                Cancelar
              </button>
              <button
                type="button"
                (click)="confirmSelection()"
                [disabled]="selectedPaths.size === 0"
                class="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1.5">
                <mat-icon class="text-sm">download</mat-icon>
                Cargar {{ selectedPaths.size > 0 ? '(' + selectedPaths.size + ')' : '' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class FileBrowserComponent {
  @Input() tipo: 'padron' | 'asistencia' = 'asistencia';
  @Output() selectionConfirm = new EventEmitter<string[]>();
  @Output() fileDeleted = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  readonly isOpen = signal(false);
  readonly files = signal<FileBrowserFile[]>([]);
  readonly selectedPaths = new Set<string>();

  open(files: FileBrowserFile[]) {
    this.files.set(files);
    this.selectedPaths.clear();
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.closed.emit();
  }

  isSelected(path: string): boolean {
    return this.selectedPaths.has(path);
  }

  toggleSelection(file: FileBrowserFile) {
    if (this.tipo === 'padron') {
      // Single selection for padrón
      this.selectedPaths.clear();
      this.selectedPaths.add(file.path);
    } else {
      // Multi selection for attendance
      if (this.selectedPaths.has(file.path)) {
        this.selectedPaths.delete(file.path);
      } else {
        this.selectedPaths.add(file.path);
      }
    }
  }

  confirmSelection() {
    const paths = Array.from(this.selectedPaths);
    if (paths.length > 0) {
      this.selectionConfirm.emit(paths);
      this.close();
    }
  }

  deleteFile(file: FileBrowserFile, event: Event) {
    event.stopPropagation();
    if (confirm(`¿Eliminar "${file.name}"?`)) {
      this.fileDeleted.emit(file.path);
    }
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  }
}
