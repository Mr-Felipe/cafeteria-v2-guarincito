import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Beneficiario, Confirmacion, Entrega, SyncQueueItem, Carrera, TipoComida, Formulario } from '../models/cafeteria.models';
import { BENEFICIARIOS_SEED, CARRERAS_INIT, FORMULARIOS_INIT, generateSeedConfirmaciones, generateSeedEntregas, TIPOS_COMIDA_INIT } from '../data/initial-data';

export class CafeteriaDexieDB extends Dexie {
  beneficiarios!: Table<Beneficiario, number>;
  confirmaciones!: Table<Confirmacion, number>;
  entregas!: Table<Entrega, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  carreras!: Table<Carrera, number>;
  tiposComida!: Table<TipoComida, number>;
  formularios!: Table<Formulario, number>;

  constructor() {
    super('CafeteriaDB');
    this.version(2).stores({
      beneficiarios: '++id, codigo_id, carrera_id, activo, nombre',
      confirmaciones: '++id, codigo_id, fecha, [codigo_id+fecha], tipo_comida_id, es_beneficiario_valido, motivo_alerta',
      entregas: '++id, supabase_id, codigo_id, fecha, [codigo_id+fecha], estado, tipo_comida_id',
      syncQueue: '++id, tabla, operacion, timestamp, reintentos',
      carreras: '++id, nombre, jornada',
      tiposComida: '++id, nombre',
      formularios: '++id, slug'
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
        await this.db.formularios.bulkPut(FORMULARIOS_INIT);
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
    return await this.db.confirmaciones
      .filter(c => c.fecha.startsWith(prefijo))
      .toArray();
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
          // Don't pass id - let Dexie auto-generate it
          const { id: _supabaseId, ...confWithoutId } = conf;
          await this.db.confirmaciones.add({ 
            ...confWithoutId, 
            codigo_id: norm 
          });
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

  async clearAllLocalData(): Promise<void> {
    await this.db.confirmaciones.clear();
    await this.db.entregas.clear();
    await this.db.beneficiarios.clear();
    await this.db.syncQueue.clear();
    await this.initializeDatabaseIfEmpty();
  }
}
