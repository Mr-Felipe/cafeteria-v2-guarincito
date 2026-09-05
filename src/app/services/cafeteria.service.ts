import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { OfflineDbService } from './offline-db.service';
import {
  Beneficiario,
  Confirmacion,
  DeliverySearchResult,
  Entrega,
  Formulario,
  Carrera,
  TipoComida,
  Operador
} from '../models/cafeteria.models';
import {
  CARRERAS_INIT,
  FORMULARIOS_INIT,
  OPERADORES_PREDETERMINADOS,
  TIPOS_COMIDA_INIT,
  getTodayDateStr
} from '../data/initial-data';
import confetti from 'canvas-confetti';

@Injectable({
  providedIn: 'root'
})
export class CafeteriaService {
  private supabase = inject(SupabaseService);
  private offlineDb = inject(OfflineDbService);

  // Core Reactive Signals
  readonly beneficiarios = signal<Beneficiario[]>([]);
  readonly confirmaciones = signal<Confirmacion[]>([]);
  readonly entregas = signal<Entrega[]>([]);
  readonly carreras = signal<Carrera[]>(CARRERAS_INIT);
  readonly tiposComida = signal<TipoComida[]>(TIPOS_COMIDA_INIT);
  readonly formularios = signal<Formulario[]>(FORMULARIOS_INIT);
  
  readonly operadores = signal<Operador[]>(OPERADORES_PREDETERMINADOS);
  readonly currentOperador = signal<Operador>(OPERADORES_PREDETERMINADOS[0]);
  readonly selectedDate = signal<string>(getTodayDateStr());

  readonly isWeekendDay = computed(() => {
    const d = new Date(this.selectedDate() + 'T12:00:00');
    const day = d.getDay();
    return day === 0 || day === 6;
  });

  readonly isSaturday = computed(() => {
    const d = new Date(this.selectedDate() + 'T12:00:00');
    return d.getDay() === 6;
  });

  readonly isSunday = computed(() => {
    const d = new Date(this.selectedDate() + 'T12:00:00');
    return d.getDay() === 0;
  });

  readonly selectedDayOfWeek = computed(() => {
    const d = new Date(this.selectedDate() + 'T12:00:00');
    return d.getDay();
  });

  readonly weekendCarreras = computed(() => {
    if (this.isSaturday()) {
      return ['ADEA', 'REGENCIA', 'TECNICO EN PROCESOS'];
    }
    if (this.isSunday()) {
      return ['REGENCIA', 'TECNICO EN PROCESOS'];
    }
    return [];
  });

  readonly filteredBeneficiarios = computed(() => {
    const all = this.beneficiarios();
    if (!this.isWeekendDay()) {
      return all.filter(b => {
        const tc = b.tipo_comida_id;
        return tc === 1 || tc === 2 || tc === 3;
      });
    }
    const carreras = this.weekendCarreras();
    if (this.isSunday()) {
      return all.filter(b => {
        const cn = (b.carrera_nombre || '').toUpperCase().trim();
        return carreras.includes(cn);
      });
    }
    return all.filter(b => {
      const cn = (b.carrera_nombre || '').toUpperCase().trim();
      return carreras.includes(cn);
    });
  });

  // Connection & Sync States
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly isSyncing = signal<boolean>(false);
  readonly pendingSyncCount = signal<number>(0);
  readonly lastSyncTimestamp = signal<Date | null>(new Date());
  readonly lastActionNotification = signal<{ type: 'success' | 'alert' | 'error' | 'info'; title: string; message: string; timestamp: number } | null>(null);

  // Computeds
  readonly activeEntregas = computed(() => {
    return this.entregas().filter(e => e.estado === 'ENTREGADO');
  });

  readonly stats = computed(() => {
    const confs = this.confirmaciones();
    const ents = this.activeEntregas();
    const totalConfirmados = confs.length;
    const totalEntregados = ents.length;
    const totalPendientes = Math.max(0, totalConfirmados - totalEntregados);
    const totalAlertas = confs.filter(c => c.motivo_alerta !== null && !c.corregido).length;
    const totalSinPadron = confs.filter(c => c.motivo_alerta === 'no_en_padron').length;

    let primeraEntrega = '--:--';
    let ultimaEntrega = '--:--';
    if (ents.length > 0) {
      const horasSorted = [...ents].map(e => e.hora).filter(Boolean).sort();
      if (horasSorted.length > 0) {
        primeraEntrega = horasSorted[0].substring(0, 5);
        ultimaEntrega = horasSorted[horasSorted.length - 1].substring(0, 5);
      }
    }

    const porcentaje = totalConfirmados > 0 ? Math.round((totalEntregados / totalConfirmados) * 100) : 0;

    return {
      totalConfirmados,
      totalEntregados,
      totalPendientes,
      totalAlertas,
      totalSinPadron,
      primeraEntrega,
      ultimaEntrega,
      porcentaje
    };
  });

  constructor() {
    this.initNetworkListeners();
    this.initData();
    effect(() => {
      const fecha = this.selectedDate();
      this.loadFechaData(fecha);
    });
  }

  private async loadFechaData(fecha: string): Promise<void> {
    try {
      const [remoteConfs, remoteEnts] = await Promise.allSettled([
        this.supabase.fetchConfirmaciones(fecha),
        this.supabase.fetchEntregas(fecha)
      ]);
      if (remoteConfs.status === 'fulfilled') {
        this.confirmaciones.set(remoteConfs.value);
      }
      if (remoteEnts.status === 'fulfilled') {
        this.entregas.set(remoteEnts.value);
      }
    } catch (err) {
      console.warn('[CafeteriaService] Error cargando datos por fecha:', err);
    }
  }

  private initNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline.set(true);
        this.notify('info', 'Conexión Restablecida', 'El sistema ha detectado conexión a internet. Sincronizando datos...');
        this.sincronizarCola();
      });
      window.addEventListener('offline', () => {
        this.isOnline.set(false);
        this.notify('alert', 'Modo Offline Activado', 'Operando sin conexión. Las entregas se guardarán localmente y se sincronizarán al volver.');
      });
    }
  }

  async initData(): Promise<void> {
    try {
      // 1. Initialize local DB if empty
      await this.offlineDb.initializeDatabaseIfEmpty();

      // 2. Load from local IndexedDB first (instant UI)
      await this.loadFromLocalDatabase();

      // 3. If online, fetch fresh data from Supabase & sync
      if (this.isOnline() && this.supabase.isConnected) {
        await this.syncWithSupabase();
      }

      // 4. Update sync queue count
      await this.refreshPendingSyncCount();
    } catch (err) {
      console.warn('[CafeteriaService] Error en initData:', err);
    }
  }

  async loadFromLocalDatabase(): Promise<void> {
    const fecha = this.selectedDate();
    const bens = await this.offlineDb.getBeneficiarios();
    const confs = await this.offlineDb.getConfirmacionesByFecha(fecha);
    const ents = await this.offlineDb.getEntregasByFecha(fecha);

    this.beneficiarios.set(bens);
    this.confirmaciones.set(confs);
    this.entregas.set(ents);
  }

  async syncWithSupabase(): Promise<void> {
    if (this.isSyncing()) return;
    this.isSyncing.set(true);

    try {
      const fecha = this.selectedDate();

      // Fetch master tables
      const [remoteBens, remoteConfs, remoteEnts, remoteCarreras, remoteTipos, remoteForms] = await Promise.allSettled([
        this.supabase.fetchBeneficiarios(),
        this.supabase.fetchConfirmaciones(fecha),
        this.supabase.fetchEntregas(fecha),
        this.supabase.fetchCarreras(),
        this.supabase.fetchTiposComida(),
        this.supabase.fetchFormularios()
      ]);

      if (remoteCarreras.status === 'fulfilled' && remoteCarreras.value.length > 0) {
        const CARRERA_SERVICIO: Record<string, string> = {
          'ADEA': 'Almuerzo', 'ADMON FINANCIERA': 'Refrigerio', 'AGROINDUSTRIAL': 'Almuerzo',
          'ENFERMERIA': 'Almuerzo', 'ING AGRONOMICA': 'Almuerzo', 'ING ALIMENTOS': 'Almuerzo',
          'ING INFORMATICA': 'Almuerzo', 'MEDICINA': 'Almuerzo', 'REGENCIA': 'Refrigerio',
          'SBDIO CAFTERIA': 'Almuerzo', 'TECNICO EN PROCESOS': 'Refrigerio', 'TRABAJO SOCIAL': 'Refrigerio',
        };
        const enriched = remoteCarreras.value.map(c => ({
          ...c,
          servicioDefecto: CARRERA_SERVICIO[c.nombre] || 'Almuerzo'
        }));
        this.carreras.set(enriched);
      }
      if (remoteTipos.status === 'fulfilled' && remoteTipos.value.length > 0) {
        this.tiposComida.set(remoteTipos.value);
      }
      if (remoteForms.status === 'fulfilled' && remoteForms.value.length > 0) {
        this.formularios.set(remoteForms.value);
      }

      if (remoteBens.status === 'fulfilled' && remoteBens.value.length > 0) {
        this.beneficiarios.set(remoteBens.value);
        await this.offlineDb.upsertBeneficiarios(remoteBens.value);
      }

      if (remoteConfs.status === 'fulfilled' && remoteConfs.value.length > 0) {
        this.confirmaciones.set(remoteConfs.value);
        await this.offlineDb.saveConfirmaciones(remoteConfs.value);
      }

      if (remoteEnts.status === 'fulfilled' && remoteEnts.value.length > 0) {
        this.entregas.set(remoteEnts.value);
      }

      // Process any pending offline sync queue
      await this.sincronizarCola();
      this.lastSyncTimestamp.set(new Date());
    } catch (err) {
      console.warn('[CafeteriaService] Error sincronizando con Supabase:', err);
    } finally {
      this.isSyncing.set(false);
      await this.refreshPendingSyncCount();
    }
  }

  async refreshPendingSyncCount(): Promise<void> {
    const queue = await this.offlineDb.getSyncQueue();
    this.pendingSyncCount.set(queue.length);
  }

  // --- Search Engine for Entrega Rápida ---
  normalizeCode(code: string): string {
    if (!code) return '';
    const trimmed = code.trim();
    const withoutLeadingZeros = trimmed.replace(/^0+/, '');
    return withoutLeadingZeros || '0';
  }

  searchBeneficiarioOrConfirmacion(query: string): DeliverySearchResult | null {
    if (!query || !query.trim()) return null;

    const raw = query.trim();
    const norm = this.normalizeCode(raw);
    const lower = raw.toLowerCase();
    const fecha = this.selectedDate();

    // 1. Search in confirmations of today first
    const confMatch = this.confirmaciones().find(c => {
      const cNorm = this.normalizeCode(c.codigo_id);
      if (cNorm === norm || c.codigo_id === raw) return true;
      if (c.beneficiario_nombre && c.beneficiario_nombre.toLowerCase().includes(lower)) return true;
      return false;
    });

    // 2. Search in master beneficiarios
    const benMatch = this.beneficiarios().find(b => {
      const bNorm = this.normalizeCode(b.codigo_id);
      if (bNorm === norm || b.codigo_id === raw) return true;
      if (b.nombre && b.nombre.toLowerCase().includes(lower)) return true;
      return false;
    });

    // Code to target
    const targetCode = confMatch ? confMatch.codigo_id : (benMatch ? benMatch.codigo_id : raw);
    const targetNorm = this.normalizeCode(targetCode);

    // 3. Search if already delivered today
    const entregaMatch = this.entregas().find(e => {
      const eNorm = this.normalizeCode(e.codigo_id);
      return (eNorm === targetNorm || e.codigo_id === targetCode) && e.estado === 'ENTREGADO' && e.fecha === fecha;
    });

    const tipoComidaId = confMatch?.tipo_comida_id || benMatch?.tipo_comida_id || 2;
    const tipoComidaObj = this.tiposComida().find(t => t.id === tipoComidaId);
    const tipoComidaNombre = confMatch?.tipo_comida_nombre || tipoComidaObj?.nombre || 'Almuerzo';

    // Case A: Already delivered today
    if (entregaMatch) {
      return {
        status: 'ALREADY_DELIVERED',
        codigo_id: targetCode,
        normalized_code: targetNorm,
        beneficiario: benMatch,
        confirmacion: confMatch,
        entrega: entregaMatch,
        tipoComidaNombre,
        tipoComidaId,
        message: `Ración de ${tipoComidaNombre} ya entregada hoy a las ${entregaMatch.hora.substring(0, 5)} por ${entregaMatch.entregado_por || 'Recepcionista'}.`
      };
    }

    // Case B: Confirmed with alert (Carrera diferente, no en padrón, nombre difiere)
    if (confMatch) {
      if (confMatch.motivo_alerta && !confMatch.corregido) {
        let alertDetails = '';
        if (confMatch.motivo_alerta === 'carrera_diferente') {
          alertDetails = `Carrera seleccionada en Form (${confMatch.carrera_en_form}) difiere del Padrón (${confMatch.carrera_real || confMatch.carrera_nombre}).`;
        } else if (confMatch.motivo_alerta === 'no_en_padron') {
          alertDetails = `Código ${confMatch.codigo_id} no está registrado en el Padrón de Beneficiarios (Extraño).`;
        } else {
          alertDetails = confMatch.observacion || 'Confirmación con discrepancia detectada.';
        }

        return {
          status: 'VALID_ALERT',
          codigo_id: targetCode,
          normalized_code: targetNorm,
          beneficiario: benMatch,
          confirmacion: confMatch,
          tipoComidaNombre,
          tipoComidaId,
          alertType: confMatch.motivo_alerta,
          alertDetails,
          message: `Confirmación con Alerta: ${alertDetails}`
        };
      }

      // Case C: Valid normal confirmation ready for delivery
      return {
        status: 'VALID_READY',
        codigo_id: targetCode,
        normalized_code: targetNorm,
        beneficiario: benMatch,
        confirmacion: confMatch,
        tipoComidaNombre,
        tipoComidaId,
        message: `Confirmación Válida (${tipoComidaNombre}). Listo para entregar.`
      };
    }

    // Case D: In padrón but didn't confirm today
    if (benMatch) {
      return {
        status: 'NOT_CONFIRMED',
        codigo_id: targetCode,
        normalized_code: targetNorm,
        beneficiario: benMatch,
        tipoComidaNombre,
        tipoComidaId,
        message: `Estudiante registrado en padrón (${benMatch.nombre} - ${benMatch.carrera_nombre || 'Carrera'}) pero NO llenó el formulario de confirmación para hoy.`
      };
    }

    // Case E: Not in padrón and no confirmation
    return {
      status: 'NOT_IN_PADRON',
      codigo_id: raw,
      normalized_code: norm,
      tipoComidaNombre: 'Almuerzo',
      tipoComidaId: 2,
      message: `Código o nombre '${raw}' no encontrado en el padrón ni en las confirmaciones de hoy.`
    };
  }

  // --- Register Delivery Action ---
  async registrarEntrega(item: DeliverySearchResult): Promise<boolean> {
    try {
      const operadorName = this.currentOperador().nombre;
      const now = new Date();
      const horaStr = now.toTimeString().split(' ')[0];

      // Local optimistic update
      const nuevaEntrega: Entrega = {
        confirmacion_id: item.confirmacion?.id || null,
        codigo_id: item.codigo_id,
        beneficiario_id: item.beneficiario?.id || item.confirmacion?.beneficiario_id || null,
        tipo_comida_id: item.tipoComidaId,
        fecha: this.selectedDate(),
        hora: horaStr,
        estado: 'ENTREGADO',
        entregado_por: operadorName,
        beneficiario_nombre: item.beneficiario?.nombre || item.confirmacion?.beneficiario_nombre || 'Estudiante',
        carrera_nombre: item.beneficiario?.carrera_nombre || item.confirmacion?.carrera_nombre || 'Universidad',
        tipo_comida_nombre: item.tipoComidaNombre,
        created_offline: !this.isOnline()
      };

      const localId = await this.offlineDb.addEntrega(nuevaEntrega);
      nuevaEntrega.id = localId;
      this.entregas.update(prev => [nuevaEntrega, ...prev]);
      if (item.confirmacion?.id) {
        this.confirmaciones.update(prev => prev.map(c =>
          c.id === item.confirmacion!.id
            ? { ...c, entregado: true, hora_entrega: horaStr, entregado_por: operadorName }
            : c
        ));
      }

      this.triggerSuccessCelebration();
      this.notify('success', 'Entrega Registrada', `Ración entregada a ${nuevaEntrega.beneficiario_nombre} (${nuevaEntrega.codigo_id}).`);

      // Use database function for atomic operation
      if (this.isOnline() && this.supabase.isConnected) {
        try {
          const { data, error } = await this.supabase.rpc('fn_registrar_entrega', {
            p_confirmacion_id: item.confirmacion?.id || null,
            p_codigo_id: item.codigo_id,
            p_beneficiario_id: item.beneficiario?.id || item.confirmacion?.beneficiario_id || null,
            p_tipo_comida_id: item.tipoComidaId,
            p_entregado_por: operadorName
          });
          if (error) throw error;
          if (data?.[0]?.resultado === 'YA_ENTREGADO') {
            this.notify('alert', 'Ya Entregado', `Este estudiante ya recibió su ración hoy.`);
          } else if (data?.[0]?.entrega_id) {
            // Guardar ID de Supabase en el registro local
            const supabaseId = data[0].entrega_id;
            await this.offlineDb.updateEntrega(localId, { supabase_id: supabaseId, created_offline: false });
            this.entregas.update(prev => prev.map(e =>
              e.id === localId ? { ...e, supabase_id: supabaseId, created_offline: false } : e
            ));
          }
        } catch (e) {
          console.warn('[CafeteriaService] Error en DB, encolando offline:', e);
          await this.offlineDb.addToSyncQueue({
            tabla: 'entregas', operacion: 'INSERT', datos: { ...nuevaEntrega, id: localId }
          });
          await this.refreshPendingSyncCount();
        }
      } else {
        await this.offlineDb.addToSyncQueue({
          tabla: 'entregas', operacion: 'INSERT', datos: { ...nuevaEntrega, id: localId }
        });
        await this.refreshPendingSyncCount();
      }

      return true;
    } catch (err: unknown) {
      console.error('[CafeteriaService] Error al registrar entrega:', err);
      const message = err instanceof Error ? err.message : 'Ocurrió un problema inesperado.';
      this.notify('error', 'Error al Registrar Entrega', message);
      return false;
    }
  }

  // --- Revert Delivery Action ---
  async revertirEntrega(entregaId: number): Promise<boolean> {
    try {
      const entrega = this.entregas().find(e => e.id === entregaId);

      // Local optimistic update
      await this.offlineDb.deleteEntrega(entregaId);
      this.entregas.update(prev => prev.filter(e => e.id !== entregaId));
      if (entrega?.confirmacion_id) {
        this.confirmaciones.update(prev =>
          prev.map(c => (c.id === entrega.confirmacion_id
            ? { ...c, entregado: false, hora_entrega: undefined, entregado_por: undefined }
            : c
          ))
        );
      }

      this.notify('alert', 'Entrega Revertida', 'La entrega fue eliminada del registro.');

      // Use database function for atomic operation
      if (this.isOnline() && this.supabase.isConnected) {
        try {
          const supabaseId = entrega?.supabase_id || entregaId;
          await this.supabase.rpc('fn_revertir_entrega', { p_entrega_id: supabaseId });
        } catch {
          await this.offlineDb.addToSyncQueue({
            tabla: 'entregas', operacion: 'DELETE', datos: { id: entregaId, supabase_id: entrega?.supabase_id }
          });
          if (entrega?.confirmacion_id) {
            await this.offlineDb.addToSyncQueue({
              tabla: 'confirmaciones', operacion: 'UPDATE',
              datos: { id: entrega.confirmacion_id, entregado: false }
            });
          }
          await this.refreshPendingSyncCount();
        }
      } else {
        await this.offlineDb.addToSyncQueue({
          tabla: 'entregas', operacion: 'DELETE', datos: { id: entregaId, supabase_id: entrega?.supabase_id }
        });
        if (entrega?.confirmacion_id) {
          await this.offlineDb.addToSyncQueue({
            tabla: 'confirmaciones', operacion: 'UPDATE',
            datos: { id: entrega.confirmacion_id, entregado: false }
          });
        }
        await this.refreshPendingSyncCount();
      }

      return true;
    } catch (err: unknown) {
      console.error('[CafeteriaService] Error al revertir entrega:', err);
      const message = err instanceof Error ? err.message : 'No se pudo completar la reversión.';
      this.notify('error', 'Error al Revertir Entrega', message);
      return false;
    }
  }

  // --- Correct Confirmation Alert ---
  async corregirConfirmacion(
    confirmacionId: number,
    correccion: { observacion: string; carreraReal?: string }
  ): Promise<boolean> {
    try {
      const operadorName = this.currentOperador().nombre;
      const updates: Partial<Confirmacion> = {
        corregido: true,
        corregido_por: operadorName,
        observacion: correccion.observacion,
        ...(correccion.carreraReal ? { carrera_real: correccion.carreraReal } : {})
      };

      await this.offlineDb.updateConfirmacion(confirmacionId, updates);

      this.confirmaciones.update(prev =>
        prev.map(c => (c.id === confirmacionId ? { ...c, ...updates } : c))
      );

      this.notify('success', 'Confirmación Corregida', `La confirmación fue aprobada y anotada por ${operadorName}.`);

      if (this.isOnline() && this.supabase.isConnected) {
        try {
          await this.supabase.updateConfirmacion(confirmacionId, updates);
        } catch {
          await this.offlineDb.addToSyncQueue({
            tabla: 'confirmaciones',
            operacion: 'UPDATE',
            datos: { id: confirmacionId, ...updates }
          });
          await this.refreshPendingSyncCount();
        }
      } else {
        await this.offlineDb.addToSyncQueue({
          tabla: 'confirmaciones',
          operacion: 'UPDATE',
          datos: { id: confirmacionId, ...updates }
        });
        await this.refreshPendingSyncCount();
      }

      return true;
    } catch (err: unknown) {
      console.error('[CafeteriaService] Error corrigiendo confirmación:', err);
      const message = err instanceof Error ? err.message : 'No se pudo guardar la corrección.';
      this.notify('error', 'Error en Corrección', message);
      return false;
    }
  }

  // --- Import iVMS-4200 CSV ---
  async importarCsvIvms(csvContent: string): Promise<{ totalProcessed: number; updatedCount: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;
    const parsedBeneficiarios: Beneficiario[] = [];

    const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) {
      throw new Error('El archivo CSV está vacío o no contiene filas de datos.');
    }

    // Header line check
    const headerLine = lines[0];
    const headers = headerLine.split(';').map(h => h.trim().replace(/^\*/, ''));

    const idIdx = headers.findIndex(h => h.toLowerCase().includes('id de persona') || h.toLowerCase() === 'id');
    const orgIdx = headers.findIndex(h => h.toLowerCase().includes('organizaci') || h.toLowerCase().includes('organizacion'));
    const nameIdx = headers.findIndex(h => h.toLowerCase().includes('nombre de persona') || h.toLowerCase().includes('nombre'));
    const sexIdx = headers.findIndex(h => h.toLowerCase().includes('sexo') || h.toLowerCase().includes('genero'));
    const telIdx = headers.findIndex(h => h.toLowerCase().includes('tel'));
    const emailIdx = headers.findIndex(h => h.toLowerCase().includes('correo') || h.toLowerCase().includes('email'));
    const vigIdx = headers.findIndex(h => h.toLowerCase().includes('vigencia'));
    const cadIdx = headers.findIndex(h => h.toLowerCase().includes('caducidad'));
    const tarjIdx = headers.findIndex(h => h.toLowerCase().includes('tarjeta'));
    const habIdx = headers.findIndex(h => h.toLowerCase().includes('habitación') || h.toLowerCase().includes('habitacion'));
    const pisoIdx = headers.findIndex(h => h.toLowerCase().includes('piso'));

    if (idIdx === -1 || nameIdx === -1) {
      throw new Error('Formato inválido: El CSV debe contener las columnas "*ID de persona" y "*Nombre de persona".');
    }

    const currentCarreras = this.carreras();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split(';').map(c => c.trim().replace(/^["']/, '').replace(/["']$/, ''));

      const rawId = cols[idIdx];
      const rawName = cols[nameIdx];
      if (!rawId || !rawName) continue;

      const normId = this.normalizeCode(rawId);
      const rawOrg = orgIdx !== -1 ? cols[orgIdx] : '';
      const rawSex = sexIdx !== -1 ? cols[sexIdx] : '';

      // Parse Gender: 1 = H, 2 = M
      let genero: 'H' | 'M' | null = null;
      if (rawSex === '1' || rawSex?.toUpperCase() === 'H' || rawSex?.toUpperCase() === 'HOMBRE') genero = 'H';
      else if (rawSex === '2' || rawSex?.toUpperCase() === 'M' || rawSex?.toUpperCase() === 'MUJER') genero = 'M';

      // Parse Carrera from Organización:
      // e.g. "UNIVERSIDAD/estudiantes/INFORMATICA" -> "INFORMATICA"
      let carreraNombreExtraida = '';
      if (rawOrg) {
        const parts = rawOrg.split('/').map(p => p.trim());
        carreraNombreExtraida = parts[parts.length - 1];
      }

      // Mapping de nombres del CSV a nombres de la base de datos
      const CARRERA_ALIAS: Record<string, string> = {
        'ING ALIMENTOS': 'ING ALIMENTOS',
        'REGENCIA DE FARMACIA': 'REGENCIA',
        'TEC.PROCESOS DE SEGURIDAD': 'TECNICO EN PROCESOS',
        'TEC. PROCESOS DE SEGURIDAD': 'TECNICO EN PROCESOS',
      };
      const carreraNormalizada = CARRERA_ALIAS[carreraNombreExtraida.toUpperCase()] || carreraNombreExtraida;

      // Match with known carreras - intento exacto primero, luego parcial
      let matchedCarrera = currentCarreras.find(c =>
        c.nombre.toUpperCase() === carreraNormalizada.toUpperCase()
      );
      if (!matchedCarrera) {
        matchedCarrera = currentCarreras.find(c =>
          carreraNormalizada.toUpperCase().includes(c.nombre.toUpperCase()) ||
          c.nombre.toUpperCase().includes(carreraNormalizada.toUpperCase())
        );
      }

      // Default food service by jornada / carrera
      let defaultTipoComidaId = 2; // Almuerzo
      if (matchedCarrera) {
        if (matchedCarrera.jornada === 'Nocturna') defaultTipoComidaId = 3; // Refrigerio
        else if (matchedCarrera.id === 10 || matchedCarrera.id === 11) defaultTipoComidaId = 3; // Regencia/Técnico
      }

      parsedBeneficiarios.push({
        codigo_id: normId,
        nombre: rawName,
        genero,
        carrera_id: matchedCarrera ? matchedCarrera.id : null,
        tipo_comida_id: defaultTipoComidaId,
        activo: true,
        telefono: telIdx !== -1 ? cols[telIdx] : null,
        email: emailIdx !== -1 ? cols[emailIdx] : null,
        fecha_vigencia: vigIdx !== -1 ? cols[vigIdx] : null,
        fecha_caducidad: cadIdx !== -1 ? cols[cadIdx] : null,
        num_tarjeta: tarjIdx !== -1 ? cols[tarjIdx] : null,
        num_habitacion: habIdx !== -1 ? cols[habIdx] : null,
        num_piso: pisoIdx !== -1 ? cols[pisoIdx] : null,
        carrera_nombre: matchedCarrera ? matchedCarrera.nombre : (carreraNombreExtraida || 'Sin Carrera')
      });
      processed++;
    }

    if (parsedBeneficiarios.length > 0) {
      // Upsert in Dexie
      await this.offlineDb.upsertBeneficiarios(parsedBeneficiarios);
      const updatedList = await this.offlineDb.getBeneficiarios();
      this.beneficiarios.set(updatedList);

      // Upsert in Supabase if online
      if (this.isOnline() && this.supabase.isConnected) {
        try {
          await this.supabase.upsertBeneficiariosBatch(
            parsedBeneficiarios.map(b => ({
              codigo_id: b.codigo_id,
              nombre: b.nombre,
              genero: b.genero,
              carrera_id: b.carrera_id,
              tipo_comida_id: b.tipo_comida_id,
              activo: b.activo,
              telefono: b.telefono,
              email: b.email,
              fecha_vigencia: b.fecha_vigencia,
              fecha_caducidad: b.fecha_caducidad,
              num_tarjeta: b.num_tarjeta,
              num_habitacion: b.num_habitacion,
              num_piso: b.num_piso
            }))
          );
        } catch (e: unknown) {
          console.warn('[CafeteriaService] Error enviando batch de beneficiarios a Supabase:', e);
          errors.push('No se pudo sincronizar inmediatamente con Supabase, pero se guardó en local.');
        }
      }

      this.notify('success', 'Importación Completada', `Se procesaron ${processed} registros del iVMS-4200 exitosamente.`);
    }

    return {
      totalProcessed: processed,
      updatedCount: parsedBeneficiarios.length,
      errors
    };
  }

  // --- Add/Edit Single Beneficiario ---
  async saveBeneficiario(item: Beneficiario): Promise<void> {
    const norm = this.normalizeCode(item.codigo_id);
    const carrera = this.carreras().find(c => c.id === item.carrera_id);
    const toSave: Beneficiario = {
      ...item,
      codigo_id: norm,
      carrera_nombre: carrera ? carrera.nombre : item.carrera_nombre
    };

    await this.offlineDb.upsertBeneficiarios([toSave]);
    const list = await this.offlineDb.getBeneficiarios();
    this.beneficiarios.set(list);

    if (this.isOnline() && this.supabase.isConnected) {
      try {
        await this.supabase.upsertBeneficiariosBatch([toSave]);
      } catch (e) {
        console.warn('Error syncing single beneficiario to supabase:', e);
      }
    }

    this.notify('success', 'Beneficiario Guardado', `Registro de ${toSave.nombre} (${toSave.codigo_id}) actualizado.`);
  }

  // --- Vaciar Padrón ---
  async vaciarPadron(): Promise<void> {
    // Eliminar de Supabase si hay conexión
    if (this.isOnline() && this.supabase.isConnected) {
      try {
        await this.supabase.deleteAllBeneficiarios();
      } catch (e) {
        console.warn('[CafeteriaService] Error eliminando beneficiarios de Supabase:', e);
      }
    }
    await this.offlineDb.clearBeneficiarios();
    this.beneficiarios.set([]);
    this.notify('info', 'Padrón Vacío', 'Se han eliminado todos los registros del padrón de beneficiarios.');
  }

  // --- Process Offline Sync Queue ---
  async sincronizarCola(): Promise<void> {
    if (!this.isOnline() || !this.supabase.isConnected) return;

    const queue = await this.offlineDb.getSyncQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        if (item.tabla === 'entregas' && item.operacion === 'INSERT') {
          const datos = item.datos as Entrega;
          // Usar RPC para mantener consistencia con el flujo online
          const { data, error } = await this.supabase.rpc('fn_registrar_entrega', {
            p_confirmacion_id: datos.confirmacion_id || null,
            p_codigo_id: datos.codigo_id,
            p_beneficiario_id: datos.beneficiario_id || null,
            p_tipo_comida_id: datos.tipo_comida_id,
            p_entregado_por: datos.entregado_por
          });
          if (error) throw error;
          if (data?.[0]?.resultado === 'YA_ENTREGADO') {
            console.log(`[Sync] Entrega duplicada ignorada: ${datos.codigo_id}`);
            // Si era duplicada, eliminar la cola y el registro local
            if (item.id) await this.offlineDb.removeSyncQueueItem(item.id);
            if (datos.id) await this.offlineDb.deleteEntrega(datos.id);
          } else if (data?.[0]?.entrega_id) {
            // Actualizar registro local con ID de Supabase
            const supabaseId = data[0].entrega_id;
            if (datos.id) {
              await this.offlineDb.updateEntrega(datos.id, { supabase_id: supabaseId, created_offline: false });
            }
            if (item.id) await this.offlineDb.removeSyncQueueItem(item.id);
          }
        } else if (item.tabla === 'entregas' && item.operacion === 'DELETE') {
          const rawData = item.datos as Record<string, unknown>;
          const localId = rawData['id'] as number;
          // Buscar la entrega local para obtener el supabase_id
          const entregaLocal = await this.offlineDb.rawDb.entregas.get(localId);
          const supabaseId = entregaLocal?.supabase_id || rawData['supabase_id'];
          if (supabaseId) {
            await this.supabase.rpc('fn_revertir_entrega', { p_entrega_id: supabaseId });
          }
          if (item.id) await this.offlineDb.removeSyncQueueItem(item.id);
        } else if (item.tabla === 'confirmaciones' && item.operacion === 'UPDATE') {
          const rawData = item.datos as Record<string, unknown>;
          await this.supabase.updateConfirmacion(Number(rawData['id']), rawData as Partial<Confirmacion>);
          if (item.id) await this.offlineDb.removeSyncQueueItem(item.id);
        }
      } catch (err: unknown) {
        console.warn(`[CafeteriaService] Error sincronizando item #${item.id}:`, err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        if (item.id) {
          await this.offlineDb.updateSyncQueueItem(item.id, {
            reintentos: (item.reintentos || 0) + 1,
            error: errorMessage
          });
        }
      }
    }

    await this.refreshPendingSyncCount();
  }

  // --- Export CSV utilities ---
  exportarConfirmacionesCsv(): void {
    const confs = this.confirmaciones();
    if (confs.length === 0) {
      this.notify('info', 'Sin Datos', 'No hay confirmaciones para la fecha seleccionada.');
      return;
    }

    const headers = ['Código', 'Nombre Beneficiario', 'Carrera Padrón', 'Carrera Formulario', 'Estado Semáforo', 'Entregado', 'Hora Entrega', 'Observación'];
    const rows = confs.map(c => [
      `"${c.codigo_id || ''}"`,
      `"${(c.beneficiario_nombre || '').replace(/"/g, '""')}"`,
      `"${(c.carrera_nombre || '').replace(/"/g, '""')}"`,
      `"${(c.carrera_en_form || '').replace(/"/g, '""')}"`,
      `"${c.semaforo_color || 'VERDE'}"`,
      `"${c.entregado ? 'SI' : 'NO'}"`,
      `"${c.hora_entrega || ''}"`,
      `"${(c.observacion || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    this.downloadCsvFile(csvContent, `confirmaciones_guarincito_${this.selectedDate()}.csv`);
    this.notify('success', 'Exportación Exitosa', 'El archivo CSV de confirmaciones se ha descargado.');
  }

  async sincronizarGoogleForms(): Promise<void> {
    this.isSyncing.set(true);
    this.notify('info', 'Sincronizando Forms', 'Consultando respuestas de Google Forms en tiempo real...');
    try {
      if (this.isOnline() && this.supabase.isConnected) {
        await this.syncWithSupabase();
      }
      this.notify('success', 'Sincronización Completa', 'Las confirmaciones de Google Forms están al día.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error de sincronización';
      this.notify('error', 'Error al Sincronizar', msg);
    } finally {
      this.isSyncing.set(false);
    }
  }

  exportarEntregasCsv(): void {
    const entregas = this.entregas();
    if (entregas.length === 0) {
      this.notify('info', 'Sin Datos', 'No hay entregas registradas para la fecha seleccionada.');
      return;
    }

    const headers = ['Hora', 'Código', 'Nombre Beneficiario', 'Carrera', 'Tipo Comida', 'Estado', 'Entregado Por', 'Fecha'];
    const rows = entregas.map(e => [
      `"${e.hora || ''}"`,
      `"${e.codigo_id || ''}"`,
      `"${(e.beneficiario_nombre || '').replace(/"/g, '""')}"`,
      `"${(e.carrera_nombre || '').replace(/"/g, '""')}"`,
      `"${e.tipo_comida_nombre || ''}"`,
      `"${e.estado || ''}"`,
      `"${(e.entregado_por || '').replace(/"/g, '""')}"`,
      `"${e.fecha || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    this.downloadCsvFile(csvContent, `entregas_guarincito_${this.selectedDate()}.csv`);
    this.notify('success', 'Exportación Exitosa', 'El archivo CSV de entregas se ha descargado.');
  }

  exportarBeneficiariosCsv(): void {
    const bens = this.beneficiarios();
    if (bens.length === 0) {
      this.notify('info', 'Sin Datos', 'No hay beneficiarios en el padrón.');
      return;
    }

    const headers = ['ID Persona', 'Nombre', 'Género', 'Carrera', 'Activo', 'Email', 'Teléfono', 'Tarjeta'];
    const rows = bens.map(b => [
      `"${b.codigo_id || ''}"`,
      `"${(b.nombre || '').replace(/"/g, '""')}"`,
      `"${b.genero || ''}"`,
      `"${(b.carrera_nombre || '').replace(/"/g, '""')}"`,
      `"${b.activo ? 'SI' : 'NO'}"`,
      `"${b.email || ''}"`,
      `"${b.telefono || ''}"`,
      `"${b.num_tarjeta || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    this.downloadCsvFile(csvContent, `padron_beneficiarios_guarincito_${getTodayDateStr()}.csv`);
    this.notify('success', 'Exportación Exitosa', 'El archivo CSV de beneficiarios se ha descargado.');
  }

  private downloadCsvFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Visual celebration & audio chime
  private triggerSuccessCelebration(): void {
    try {
      if (typeof window !== 'undefined') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#059669', '#10B981', '#34D399', '#3B82F6']
        });
      }
    } catch {
      // Audio or canvas optional
    }
  }

  notify(type: 'success' | 'alert' | 'error' | 'info', title: string, message: string): void {
    this.lastActionNotification.set({
      type,
      title,
      message,
      timestamp: Date.now()
    });

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      const current = this.lastActionNotification();
      if (current && Date.now() - current.timestamp >= 3900) {
        this.lastActionNotification.set(null);
      }
    }, 4000);
  }

  setCurrentOperador(op: Operador): void {
    this.currentOperador.set(op);
    this.notify('info', 'Operador Seleccionado', `Sesión activa como: ${op.nombre} (${op.rol})`);
  }

  setSelectedDate(dateStr: string): void {
    this.selectedDate.set(dateStr);
    this.loadFromLocalDatabase();
    if (this.isOnline()) {
      this.syncWithSupabase();
    }
  }

  async resetToDemoData(): Promise<void> {
    await this.offlineDb.clearAllLocalData();
    await this.loadFromLocalDatabase();
    this.notify('success', 'Datos Restaurados', 'Se han restablecido los datos demo predeterminados.');
  }

  async clearLocalCacheAndReload(): Promise<void> {
    await this.offlineDb.clearAllLocalData();
    window.location.reload();
  }
}
