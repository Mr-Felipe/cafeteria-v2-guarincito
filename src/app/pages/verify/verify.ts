import { Component, inject, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [MatIcon],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 flex items-center justify-center p-4">

      <!-- Verify Form -->
      @if (view() === 'form') {
        <div class="w-full max-w-sm fade-in">
          <div class="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
            <div class="bg-gradient-to-r from-slate-700 to-slate-800 p-6 text-center">
              <div class="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <mat-icon class="text-white text-3xl">verified_user</mat-icon>
              </div>
              <h1 class="text-xl font-bold text-white">Verificar Codigo</h1>
              <p class="text-slate-300 text-sm mt-1">Ingresa el codigo de 4 digitos del estudiante</p>
            </div>

            <form (submit)="verify($event)" class="p-6 space-y-4">
              <div>
                <input type="text" #codeInput required placeholder="0000"
                  class="w-full py-3 px-4 text-center text-lg rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-500 font-mono font-bold text-slate-700 placeholder:text-slate-300"
                  maxlength="4" inputmode="numeric">
              </div>

              @if (error()) {
                <div class="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{{ error() }}</div>
              }

              <button type="submit"
                class="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                [disabled]="loading()">
                @if (loading()) {
                  <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Verificando...
                } @else {
                  <mat-icon class="text-xl">check_circle</mat-icon>
                  Verificar
                }
              </button>
            </form>
          </div>
        </div>
      }

      <!-- Result: Valid -->
      @if (view() === 'valid') {
        <div class="w-full max-w-sm fade-in">
          <div class="bg-white rounded-2xl shadow-xl border border-emerald-200 overflow-hidden">
            <div class="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 text-center">
              <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 pulse-green">
                <mat-icon class="text-white" style="font-size: 48px">check_circle</mat-icon>
              </div>
              <h2 class="text-2xl font-bold text-white">VALIDO</h2>
              <p class="text-emerald-100 text-sm mt-1">Codigo verificado correctamente</p>
            </div>
            <div class="p-6 space-y-3">
              <div class="flex justify-between text-sm py-2 border-b border-slate-100">
                <span class="text-slate-500">Codigo:</span>
                <span class="font-mono font-bold text-slate-800">{{ result()?.id }}</span>
              </div>
              <div class="flex justify-between text-sm py-2 border-b border-slate-100">
                <span class="text-slate-500">Nombre:</span>
                <span class="font-semibold text-slate-800">{{ result()?.nombre_en_form || result()?.beneficiario_nombre }}</span>
              </div>
              <div class="flex justify-between text-sm py-2 border-b border-slate-100">
                <span class="text-slate-500">Carrera:</span>
                <span class="font-semibold text-slate-800">{{ result()?.carrera_en_form || result()?.carrera_nombre }}</span>
              </div>
              <div class="flex justify-between text-sm py-2 border-b border-slate-100">
                <span class="text-slate-500">Tipo:</span>
                <span class="font-semibold text-slate-800">{{ result()?.tipo_comida_nombre }}</span>
              </div>
              <div class="flex justify-between text-sm py-2">
                <span class="text-slate-500">Enviado:</span>
                <span class="font-semibold text-slate-800">{{ result()?.fecha }}</span>
              </div>
            </div>
            <div class="p-4 border-t border-slate-100">
              <button (click)="reset()"
                class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer">
                Verificar otro codigo
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Result: Invalid -->
      @if (view() === 'invalid') {
        <div class="w-full max-w-sm fade-in">
          <div class="bg-white rounded-2xl shadow-xl border border-red-200 overflow-hidden">
            <div class="bg-gradient-to-r from-red-500 to-red-600 p-6 text-center">
              <div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 pulse-red">
                <mat-icon class="text-white" style="font-size: 48px">cancel</mat-icon>
              </div>
              <h2 class="text-2xl font-bold text-white">NO VALIDO</h2>
              <p class="text-red-100 text-sm mt-1">{{ invalidReason() }}</p>
            </div>
            <div class="p-4">
              <button (click)="reset()"
                class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all cursor-pointer">
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.4s ease-in; }
    @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    .pulse-green { animation: pulseGreen 2s infinite; }
    @keyframes pulseGreen { 0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); } 50% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); } }
    .pulse-red { animation: pulseRed 2s infinite; }
    @keyframes pulseRed { 0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); } }
  `]
})
export class Verify {
  private supabase = inject(SupabaseService);

  view = signal<'form' | 'valid' | 'invalid'>('form');
  loading = signal(false);
  error = signal('');
  result = signal<any>(null);
  invalidReason = signal('');

  private parseCode(input: string): number | null {
    const cleaned = input.trim();
    if (/^\d{1,4}$/.test(cleaned)) {
      return parseInt(cleaned, 10);
    }
    return null;
  }

  private isToday(fechaStr: string): boolean {
    if (!fechaStr) return false;
    const parts = fechaStr.split(' ')[0].split('/');
    if (parts.length !== 3) return false;
    const now = new Date();
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return now.getDate() === day && now.getMonth() === month && now.getFullYear() === year;
  }

  async verify(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector('input') as HTMLInputElement;
    const code = input.value;
    const id = this.parseCode(code);

    this.error.set('');
    this.loading.set(true);

    if (!id) {
      this.error.set('Formato invalido. Ingresa solo los 4 digitos (ej: 0042)');
      this.loading.set(false);
      return;
    }

    try {
      const data = await this.supabase.getConfirmacionById(id);

      if (!data) {
        this.view.set('invalid');
        this.invalidReason.set('Codigo no encontrado en el sistema');
        this.loading.set(false);
        return;
      }

      if (!this.isToday(data.fecha)) {
        this.view.set('invalid');
        this.invalidReason.set('Este codigo no es de hoy. Codigo expirado.');
        this.loading.set(false);
        return;
      }

      this.result.set(data);
      this.view.set('valid');
    } catch {
      this.error.set('Error al verificar. Intenta de nuevo.');
    }

    this.loading.set(false);
  }

  reset() {
    this.view.set('form');
    this.error.set('');
    this.result.set(null);
    this.invalidReason.set('');
  }
}
