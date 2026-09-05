import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../data/initial-data';
import { Beneficiario, Confirmacion, Entrega, Formulario, Carrera, TipoComida } from '../models/cafeteria.models';

interface SupabaseBeneficiarioRow {
  id?: number;
  codigo_id: string;
  nombre: string;
  genero?: 'H' | 'M' | null;
  carrera_id?: number | null;
  tipo_comida_id?: number | null;
  activo?: boolean;
  telefono?: string | null;
  email?: string | null;
  fecha_vigencia?: string | null;
  fecha_caducidad?: string | null;
  num_tarjeta?: string | null;
  num_habitacion?: string | null;
  num_piso?: string | null;
  carreras?: { nombre?: string; jornada?: string } | null;
}

interface SupabaseConfirmacionRow {
  id: number;
  codigo_id: string;
  beneficiario_id?: number;
  tipo_comida_id?: number;
  fecha: string;
  nombre_en_form?: string;
  carrera_en_form?: string;
  carrera_real?: string;
  es_beneficiario_valido?: boolean;
  motivo_alerta?: string;
  corregido?: boolean;
  corregido_por?: string;
  observacion?: string;
  origen?: 'GOOGLE_FORM' | 'MANUAL';
  entregado?: boolean;
  hora_entrega?: string;
  entregado_por?: string;
  beneficiarios?: {
    id: number;
    nombre: string;
    carrera_id?: number;
    carreras?: { nombre?: string; jornada?: string } | null;
  } | null;
  tipos_comida?: {
    id: number;
    nombre: string;
  } | null;
}

interface SupabaseEntregaRow {
  id: number;
  confirmacion_id?: number | null;
  codigo_id: string;
  beneficiario_id?: number | null;
  tipo_comida_id: number;
  fecha: string;
  hora: string;
  estado: 'PENDIENTE' | 'ENTREGADO' | 'REVERTIDO';
  entregado_por: string;
  beneficiarios?: {
    id: number;
    nombre: string;
    carreras?: { nombre?: string } | null;
  } | null;
  tipos_comida?: {
    id: number;
    nombre: string;
  } | null;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private client: SupabaseClient | null = null;
  private isConfigured = false;

  constructor() {
    try {
      if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
        this.client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false
          }
        });
        this.isConfigured = true;
        console.log('[Supabase] Cliente inicializado correctamente.');
      }
    } catch (err) {
      console.warn('[Supabase] Error al inicializar cliente:', err);
    }
  }

  get isConnected(): boolean {
    return this.isConfigured && this.client !== null;
  }

  async testConnection(): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    if (!this.client) {
      return { success: false, latencyMs: 0, error: 'Cliente de Supabase no configurado' };
    }
    const start = performance.now();
    try {
      const { error } = await this.client.from('tipos_comida').select('count').limit(1);
      const latencyMs = Math.round(performance.now() - start);
      if (error) {
        return { success: false, latencyMs, error: error.message };
      }
      return { success: true, latencyMs };
    } catch (e: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const message = e instanceof Error ? e.message : 'Error de red con Supabase';
      return { success: false, latencyMs, error: message };
    }
  }

  // --- Beneficiarios ---
  async fetchBeneficiarios(): Promise<Beneficiario[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('beneficiarios')
        .select('*, carreras(nombre)');
      if (error) throw error;
      return ((data || []) as unknown as SupabaseBeneficiarioRow[]).map(b => ({
        id: b.id,
        codigo_id: b.codigo_id,
        nombre: b.nombre,
        genero: b.genero,
        carrera_id: b.carrera_id,
        tipo_comida_id: b.tipo_comida_id,
        activo: b.activo ?? true,
        telefono: b.telefono,
        email: b.email,
        fecha_vigencia: b.fecha_vigencia,
        fecha_caducidad: b.fecha_caducidad,
        num_tarjeta: b.num_tarjeta,
        num_habitacion: b.num_habitacion,
        num_piso: b.num_piso,
        carrera_nombre: b.carreras?.nombre || ''
      }));
    } catch (err) {
      console.warn('[Supabase] fetchBeneficiarios falló:', err);
      throw err;
    }
  }

  async upsertBeneficiariosBatch(items: Partial<Beneficiario>[]): Promise<unknown> {
    if (!this.client) return null;

    const url = `${SUPABASE_CONFIG.url}/rest/v1/beneficiarios?on_conflict=codigo_id`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(items.map(b => ({
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
        num_tarjeta: b.num_tarjeta
      })))
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async updateBeneficiario(id: number, updates: Partial<Beneficiario>): Promise<unknown> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('beneficiarios')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    return data;
  }

  async deleteAllBeneficiarios(): Promise<void> {
    if (!this.client) return;
    // Primero eliminar confirmaciones (foreign key)
    await this.client.from('confirmaciones').delete().neq('id', 0);
    // Luego beneficiarios
    const { error } = await this.client
      .from('beneficiarios')
      .delete()
      .neq('id', 0);
    if (error) throw error;
  }

  // --- Confirmaciones ---
  async fetchConfirmaciones(fecha: string): Promise<Confirmacion[]> {
    if (!this.client) return [];
    try {
      // fecha es "YYYY-MM-DD" del selector; el campo en DB es "DD/MM/YYYY HH:mm:ss"
      const [y, m, d] = fecha.split('-');
      const fechaBusqueda = `${d}/${m}/${y}%`;
      const { data, error } = await this.client
        .from('confirmaciones')
        .select(`
          *,
          beneficiarios (
            id,
            nombre,
            carrera_id,
            carreras (nombre, jornada)
          ),
          tipos_comida (
            id,
            nombre
          )
        `)
        .like('fecha', fechaBusqueda);
      if (error) throw error;

      return ((data || []) as unknown as SupabaseConfirmacionRow[]).map(c => ({
        id: c.id,
        codigo_id: c.codigo_id,
        beneficiario_id: c.beneficiario_id,
        tipo_comida_id: c.tipo_comida_id || 2,
        fecha: c.fecha,
        carrera_en_form: c.carrera_en_form,
        carrera_real: c.carrera_real,
        es_beneficiario_valido: c.es_beneficiario_valido ?? true,
        motivo_alerta: (c.motivo_alerta as Confirmacion['motivo_alerta']) || null,
        corregido: c.corregido ?? false,
        corregido_por: c.corregido_por,
        observacion: c.observacion,
        origen: c.origen,
        entregado: c.entregado ?? false,
        hora_entrega: c.hora_entrega,
        entregado_por: c.entregado_por,
        beneficiario_nombre: c.beneficiarios?.nombre || c.nombre_en_form || (c.es_beneficiario_valido ? 'Desconocido' : 'No en padron'),
        nombre_en_form: c.nombre_en_form,
        carrera_nombre: c.beneficiarios?.carreras?.nombre || c.carrera_real || 'Sin Carrera',
        jornada: c.beneficiarios?.carreras?.jornada,
        tipo_comida_nombre: c.tipos_comida?.nombre || 'Almuerzo'
      }));
    } catch (err) {
      console.warn('[Supabase] fetchConfirmaciones falló:', err);
      throw err;
    }
  }

  async updateConfirmacion(id: number, updates: Partial<Confirmacion>): Promise<unknown> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('confirmaciones')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
    return data;
  }

  async rpc(fnName: string, params: Record<string, unknown>): Promise<{ data: any; error: any }> {
    if (!this.client) return { data: null, error: 'No client' };
    const { data, error } = await this.client.rpc(fnName, params);
    return { data, error };
  }

  // --- Entregas ---
  async fetchEntregas(fecha: string): Promise<Entrega[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('entregas')
        .select(`
          *,
          beneficiarios (
            id,
            nombre,
            carreras (nombre)
          ),
          tipos_comida (
            id,
            nombre
          )
        `)
        .eq('fecha', fecha)
        .order('hora', { ascending: false });
      if (error) throw error;

      return ((data || []) as unknown as SupabaseEntregaRow[]).map(e => ({
        id: e.id,
        confirmacion_id: e.confirmacion_id,
        codigo_id: e.codigo_id,
        beneficiario_id: e.beneficiario_id,
        tipo_comida_id: e.tipo_comida_id,
        fecha: e.fecha,
        hora: e.hora,
        estado: e.estado,
        entregado_por: e.entregado_por,
        beneficiario_nombre: e.beneficiarios?.nombre || '',
        carrera_nombre: e.beneficiarios?.carreras?.nombre || '',
        tipo_comida_nombre: e.tipos_comida?.nombre || ''
      }));
    } catch (err) {
      console.warn('[Supabase] fetchEntregas falló:', err);
      throw err;
    }
  }

  async insertEntrega(entrega: Partial<Entrega>): Promise<Entrega> {
    if (!this.client) throw new Error('Supabase no conectado');
    const { data, error } = await this.client
      .from('entregas')
      .upsert({
        confirmacion_id: entrega.confirmacion_id,
        codigo_id: entrega.codigo_id,
        beneficiario_id: entrega.beneficiario_id,
        tipo_comida_id: entrega.tipo_comida_id,
        fecha: entrega.fecha,
        hora: entrega.hora,
        estado: entrega.estado || 'ENTREGADO',
        entregado_por: entrega.entregado_por
      }, { onConflict: 'codigo_id,tipo_comida_id,fecha' })
      .select()
      .single();
    if (error) throw error;
    return data as Entrega;
  }

  async updateEstadoEntrega(id: number, estado: 'PENDIENTE' | 'ENTREGADO' | 'REVERTIDO'): Promise<unknown> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('entregas')
      .update({ estado })
      .eq('id', id);
    if (error) throw error;
    return data;
  }

  async deleteEntrega(id: number): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client
      .from('entregas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // --- Formularios ---
  async fetchFormularios(): Promise<Formulario[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client.from('formularios').select('*');
      if (error) throw error;
      return (data || []) as Formulario[];
    } catch (err) {
      console.warn('[Supabase] fetchFormularios falló:', err);
      return [];
    }
  }

  // --- Carreras & Tipos de Comida ---
  async fetchCarreras(): Promise<Carrera[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client.from('carreras').select('*').order('id');
      if (error) throw error;
      return (data || []) as Carrera[];
    } catch (err) {
      console.warn('[Supabase] fetchCarreras falló:', err);
      return [];
    }
  }

  async fetchTiposComida(): Promise<TipoComida[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client.from('tipos_comida').select('*').order('id');
      if (error) throw error;
      return (data || []) as TipoComida[];
    } catch (err) {
      console.warn('[Supabase] fetchTiposComida falló:', err);
      return [];
    }
  }

  async getConfirmacionById(id: number): Promise<any | null> {
    if (!this.client) return null;
    const { data, error } = await this.client
      .from('confirmaciones')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return data;
  }

  // --- Form Config ---
  async fetchFormConfig(): Promise<any[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client.from('form_config').select('*').order('id');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] fetchFormConfig falló:', err);
      return [];
    }
  }

  async updateFormConfig(id: number, updates: { activo?: boolean; hora_inicio?: string; hora_fin?: string }): Promise<void> {
    if (!this.client) return;
    try {
      const { error } = await this.client.from('form_config').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.warn('[Supabase] updateFormConfig falló:', err);
      throw err;
    }
  }

  async fetchWebConfirmaciones(formularioTipo: string): Promise<any[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client.from('confirmaciones')
        .select('*')
        .eq('origen', 'WEB_FORM')
        .eq('formulario_tipo', formularioTipo)
        .order('id', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[Supabase] fetchWebConfirmaciones falló:', err);
      return [];
    }
  }

  async fetchConfirmacionById(id: number): Promise<any | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('confirmaciones')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) return null;
      return data;
    } catch (err) {
      console.warn('[Supabase] fetchConfirmacionById falló:', err);
      return null;
    }
  }

  async searchByCodigo(codigoId: string): Promise<{ hoy: any | null; ultima: any | null }> {
    if (!this.client) return { hoy: null, ultima: null };
    try {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const todayPattern = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}%`;

      // Search for today's confirmation
      const { data: hoy } = await this.client.from('confirmaciones')
        .select('*')
        .eq('codigo_id', codigoId)
        .like('fecha', todayPattern)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Search for most recent confirmation (any day)
      const { data: ultima } = await this.client.from('confirmaciones')
        .select('*')
        .eq('codigo_id', codigoId)
        .eq('origen', 'WEB_FORM')
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      return { hoy: hoy || null, ultima: ultima || null };
    } catch (err) {
      console.warn('[Supabase] searchByCodigo falló:', err);
      return { hoy: null, ultima: null };
    }
  }

  async deleteConfirmacion(id: number): Promise<void> {
    if (!this.client) return;
    const { error } = await this.client.from('confirmaciones').delete().eq('id', id);
    if (error) throw error;
  }
}
