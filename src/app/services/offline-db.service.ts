import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Beneficiario, Confirmacion, Entrega, SyncQueueItem, Carrera, TipoComida } from '../models/cafeteria.models';
import { BENEFICIARIOS_SEED, CARRERAS_INIT, generateSeedConfirmaciones, generateSeedEntregas, TIPOS_COMIDA_INIT } from '../data/initial-data';

export class CafeteriaDexieDB extends Dexie {
  beneficiarios!: Table<Beneficiario, number>;
  confirmaciones!: Table<Confirmacion, number>;
  entregas!: Table<Entrega, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  carreras!: Table<Carrera, number>;
  tiposComida!: Table<TipoComida, number>;

  constructor() {
    super('CafeteriaDB');
    this.version(2).stores({
      beneficiarios: '++id, codigo_id, carrera_id, activo, nombre',
      confirmaciones: '++id, codigo_id, fecha, [codigo_id+fecha], tipo_comida_id, es_beneficiario_valido, motivo_alerta',
      entregas: '++id, supabase_id, codigo_id, fecha, [codigo_id+fecha], estado, tipo_comida_id',
      syncQueue: '++id, tabla, operacion, timestamp, reintentos',
      carreras: '++id, nombre, jornada',
      tiposComida: '++id, nombre'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class OfflineDbService {
  private db: CafeteriaDexieDB;

  constructor() {
    this.db = new CafeteriaDexieDB();
  }

  get rawDb(): CafeteriaDexieDB {
    return this.db;
  }

  async initializeDatabaseIfEmpty(): Promise<void> {
    try {
      const benCount = await this.db.beneficiarios.count();
      if (benCount === 0) {
        console.log('[OfflineDB] Inicializando datos base en IndexedDB...');
        // Use bulkPut which handles existing records gracefully
        await this.db.carreras.bulkPut(CARRERAS_INIT);
        await this.db.tiposComida.bulkPut(TIPOS_COMIDA_INIT);
        console.log('[OfflineDB] Base de datos local inicializada con éxito.');
      }
    } catch (err) {
      console.warn('[OfflineDB] Error inicializando DB local:', err);
    }
  }

  // --- Beneficiarios ---
  async getBeneficiarios(): Promise<Beneficiario[]> {
    return await this.db.beneficiarios.toArray();
  }

  async getBeneficiarioByCodigo(codigoId: string): Promise<Beneficiario | undefined> {
    const normalized = codigoId.replace(/^0+/, '') || '0';
    // Buscamos exacto o normalizado
    const all = await this.db.beneficiarios.toArray();
    return all.find(b => {
      const bNorm = (b.codigo_id || '').replace(/^0+/, '') || '0';
      return bNorm === normalized;
    });
  }

  async upsertBeneficiarios(items: Beneficiario[]): Promise<void> {
    await this.db.transaction('rw', this.db.beneficiarios, async () => {
      for (const item of items) {
        const norm = (item.codigo_id || '').replace(/^0+/, '') || '0';
        // Use index lookup instead of full table scan
        const existing = await this.db.beneficiarios
          .where('codigo_id')
          .equals(norm)
          .first();

        if (existing && existing.id) {
          await this.db.beneficiarios.update(existing.id, {
            ...item,
            id: existing.id, // Keep local ID
            codigo_id: norm,
            updated_at: new Date().toISOString()
          });
        } else {
          // Don't pass id - let Dexie auto-generate it
          const { id: _supabaseId, ...itemWithoutId } = item;
          await this.db.beneficiarios.add({
            ...itemWithoutId,
            codigo_id: norm,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }
    });
  }

  async clearBeneficiarios(): Promise<void> {
    await this.db.beneficiarios.clear();
  }

  // --- Confirmaciones ---
  async getConfirmacionesByFecha(fecha: string): Promise<Confirmacion[]> {
    // fecha es "YYYY-MM-DD"; el campo en DB es "DD/MM/YYYY HH:mm:ss"
    const [y, m, d] = fecha.split('-');
    const prefijo = `${d}/${m}/${y}`;
    const confs = await this.db.confirmaciones
      .filter(c => c.fecha.startsWith(prefijo))
      .toArray();
    return this.enrichConfirmaciones(confs);
  }

  private async enrichConfirmaciones(confs: Confirmacion[]): Promise<Confirmacion[]> {
    if (confs.length === 0) return confs;
    const allBen = await this.db.beneficiarios.toArray();
    const allCarreras = await this.db.carreras.toArray();
    const benByCodigo = new Map<string, typeof allBen[0]>();
    for (const b of allBen) {
      benByCodigo.set(String(b.codigo_id), b);
    }
    const carreraById = new Map<number, typeof allCarreras[0]>();
    for (const c of allCarreras) {
      if (c.id) carreraById.set(c.id, c);
    }
    return confs.map(c => {
      const ben = benByCodigo.get(String(c.codigo_id));
      const carrera = ben?.carrera_id ? carreraById.get(ben.carrera_id) : null;
      return {
        ...c,
        beneficiario_nombre: ben?.nombre || c.beneficiario_nombre || (c.es_beneficiario_valido ? 'Desconocido' : 'No en padron'),
        carrera_nombre: carrera?.nombre || c.carrera_real || c.carrera_nombre || 'Sin Carrera'
      };
    });
  }

  async saveConfirmaciones(confirmaciones: Confirmacion[]): Promise<void> {
    await this.db.transaction('rw', this.db.confirmaciones, async () => {
      for (const conf of confirmaciones) {
        const norm = (conf.codigo_id || '').replace(/^0+/, '') || '0';
        // Use compound index for efficient lookup
        const existing = await this.db.confirmaciones
          .where('[codigo_id+fecha]')
          .equals([norm, conf.fecha])
          .filter(c => c.tipo_comida_id === conf.tipo_comida_id)
          .first();

        if (existing && existing.id) {
          await this.db.confirmaciones.update(existing.id, { 
            ...conf, 
            id: existing.id, // Keep local ID
            codigo_id: norm 
          });
        } else {
          // Use Supabase ID if available for consistency with remote data
          await this.db.confirmaciones.add({ ...conf, codigo_id: norm });
        }
      }
    });
  }

  async updateConfirmacion(id: number, data: Partial<Confirmacion>): Promise<void> {
    await this.db.confirmaciones.update(id, data);
  }

  // --- Entregas ---
  async getEntregasByFecha(fecha: string): Promise<Entrega[]> {
    return await this.db.entregas.where('fecha').equals(fecha).toArray();
  }

  async saveEntregas(entregas: Entrega[]): Promise<void> {
    if (entregas.length === 0) return;
    const fecha = entregas[0].fecha;
    // Delete old local entries for this date, then insert fresh from Supabase
    await this.db.entregas.where('fecha').equals(fecha).delete();
    for (const e of entregas) {
      const { id: _localId, ...rest } = e;
      await this.db.entregas.add(rest);
    }
  }

  async addEntrega(entrega: Entrega): Promise<number> {
    const id = await this.db.entregas.add(entrega);
    return id as number;
  }

  async updateEntrega(id: number, data: Partial<Entrega>): Promise<void> {
    await this.db.entregas.update(id, data);
  }

  async deleteEntrega(id: number): Promise<void> {
    await this.db.entregas.delete(id);
  }

  // --- Sync Queue ---
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'reintentos'>): Promise<number> {
    const record: SyncQueueItem = {
      ...item,
      timestamp: Date.now(),
      reintentos: 0
    };
    const id = await this.db.syncQueue.add(record);
    return id as number;
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return await this.db.syncQueue.toArray();
  }

  async removeSyncQueueItem(id: number): Promise<void> {
    await this.db.syncQueue.delete(id);
  }

  async updateSyncQueueItem(id: number, updates: Partial<SyncQueueItem>): Promise<void> {
    await this.db.syncQueue.update(id, updates);
  }

  async removePendingInsertsForCodigo(codigoId: string, fecha: string): Promise<void> {
    const norm = (codigoId || '').replace(/^0+/, '') || '0';
    const pending = await this.db.syncQueue
      .where('tabla').equals('entregas')
      .and(item => item.operacion === 'INSERT')
      .toArray();
    for (const item of pending) {
      const datos = item.datos as Record<string, unknown>;
      if (datos['codigo_id'] === norm && datos['fecha'] === fecha && item.id) {
        await this.db.syncQueue.delete(item.id);
      }
    }
  }

  async clearAllLocalData(): Promise<void> {
    await this.db.confirmaciones.clear();
    await this.db.entregas.clear();
    await this.db.beneficiarios.clear();
    await this.db.syncQueue.clear();
    await this.initializeDatabaseIfEmpty();
  }
}
