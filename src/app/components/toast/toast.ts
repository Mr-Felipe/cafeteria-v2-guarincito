import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CafeteriaService } from '../../services/cafeteria.service';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule],
  template: `
    @if (cafeteriaService.lastActionNotification(); as notif) {
      <div 
        id="toast-notification"
        class="fixed bottom-4 right-4 z-50 max-w-md w-full animate-in fade-in slide-in-from-bottom-3 duration-300"
      >
        <div 
          class="rounded-xl p-4 shadow-xl border flex items-start gap-3 text-slate-900 bg-white"
          [class.border-emerald-200]="notif.type === 'success'"
          [class.bg-emerald-50]="notif.type === 'success'"
          [class.border-amber-200]="notif.type === 'alert'"
          [class.bg-amber-50]="notif.type === 'alert'"
          [class.border-red-200]="notif.type === 'error'"
          [class.bg-red-50]="notif.type === 'error'"
          [class.border-blue-200]="notif.type === 'info'"
          [class.bg-blue-50]="notif.type === 'info'"
        >
          <div class="mt-0.5">
            @if (notif.type === 'success') {
              <div class="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <mat-icon class="text-white text-base">check</mat-icon>
              </div>
            } @else if (notif.type === 'alert') {
              <div class="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center">
                <mat-icon class="text-white text-base">warning</mat-icon>
              </div>
            } @else if (notif.type === 'error') {
              <div class="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center">
                <mat-icon class="text-white text-base">error</mat-icon>
              </div>
            } @else {
              <div class="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <mat-icon class="text-white text-base">info</mat-icon>
              </div>
            }
          </div>

          <div class="flex-1">
            <h4 class="text-xs font-bold uppercase tracking-wider"
              [class.text-emerald-900]="notif.type === 'success'"
              [class.text-amber-900]="notif.type === 'alert'"
              [class.text-red-900]="notif.type === 'error'"
              [class.text-blue-900]="notif.type === 'info'"
            >
              {{ notif.title }}
            </h4>
            <p class="text-xs text-slate-700 mt-0.5 leading-relaxed">{{ notif.message }}</p>
          </div>

          <button 
            (click)="cafeteriaService.lastActionNotification.set(null)"
            class="text-slate-400 hover:text-slate-700 p-1 rounded"
          >
            <mat-icon class="text-sm">close</mat-icon>
          </button>
        </div>
      </div>
    }
  `
})
export class Toast {
  readonly cafeteriaService = inject(CafeteriaService);
}
