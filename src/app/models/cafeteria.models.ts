export interface Carrera {
  id: number;
  nombre: string;
  jornada: 'Diurna' | 'Nocturna' | 'Fines de Semana' | 'Fin de semana';
  diasServicio: string; // e.g. "Lunes a Viernes", "Sábados y Domingos"
  servicioDefecto: string; // "Almuerzo", "Refrigerio"
  activo?: boolean;
}

export interface TipoComida {
  id: number;
  nombre: string; // "Desayuno", "Almuerzo", "Refrigerio"
  hora_inicio?: string; // "11:30:00"
  hora_fin?: string; // "14:00:00"
  activo?: boolean;
}

export interface Beneficiario {
  id?: number;
  codigo_id: string; // "80969"
  nombre: string;
  genero?: 'H' | 'M' | null;
  carrera_id?: number | null;
  tipo_comida_id?: number | null;
  activo: boolean;
  telefono?: string | null;
  email?: string | null;
  fecha_vigencia?: string | null;
  fecha_caducidad?: string | null;
  num_tarjeta?: string | null;
  num_habitacion?: string | null;
  num_piso?: string | null;
  carrera_nombre?: string;
  created_at?: string;
  updated_at?: string;
}

export type MotivoAlerta = 'carrera_diferente' | 'no_en_padron' | 'nombre_difiere' | 'duplicado' | 'carrera_form_vs_padron' | null;

export interface Confirmacion {
  id?: number;
  codigo_id: string;
  beneficiario_id?: number | null;
  tipo_comida_id: number;
  fecha: string; // DD/MM/YYYY HH:mm:ss (marca temporal del formulario)
  carrera_en_form?: string | null;
  carrera_real?: string | null;
  es_beneficiario_valido: boolean;
  motivo_alerta?: MotivoAlerta;
  corregido: boolean;
  corregido_por?: string | null;
  observacion?: string | null;
  origen?: string;
  
  // Joined or calculated fields for UI
  beneficiario_nombre?: string;
  nombre_en_form?: string | null;
  tipo_comida_nombre?: string;
  carrera_nombre?: string;
  jornada?: string;
  hora_estimada?: string;
  entregado?: boolean;
  entrega_id?: number;
  hora_entrega?: string;
  entregado_por?: string;
  email?: string | null;
  semaforo_color?: 'VERDE' | 'AMARILLO' | 'ROJO' | 'CORREGIDO';
  alerta_carrera?: boolean;
  alerta_duplicado?: boolean;
  alerta_no_en_padron?: boolean;
}

export type EstadoEntrega = 'PENDIENTE' | 'ENTREGADO' | 'REVERTIDO';

export interface Entrega {
  id?: number;
  supabase_id?: number | null;
  confirmacion_id?: number | null;
  codigo_id: string;
  beneficiario_id?: number | null;
  tipo_comida_id: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm:ss
  estado: EstadoEntrega;
  entregado_por: string;
  
  // Joined fields for UI
  beneficiario_nombre?: string;
  carrera_nombre?: string;
  tipo_comida_nombre?: string;
  created_offline?: boolean;
}

export interface Formulario {
  id: number;
  nombre: string;
  slug: string;
  tipo_comida_id: number;
  tipo_jornada?: string;
  url_sheet: string;
  url_form?: string;
  horario?: string;
  activo: boolean;
  ultima_sincronizacion?: string;
  total_respuestas: number;
}

export interface SyncQueueItem {
  id?: number;
  tabla: 'entregas' | 'confirmaciones' | 'beneficiarios';
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  datos: Record<string, unknown> | Entrega | Partial<Confirmacion> | Partial<Beneficiario>;
  timestamp: number;
  reintentos: number;
  error?: string;
}

export interface Operador {
  id: string;
  nombre: string;
  rol: string;
}

export interface DeliverySearchResult {
  status: 'VALID_READY' | 'VALID_ALERT' | 'ALREADY_DELIVERED' | 'NOT_CONFIRMED' | 'NOT_IN_PADRON';
  codigo_id: string;
  normalized_code: string;
  beneficiario?: Beneficiario;
  confirmacion?: Confirmacion;
  entrega?: Entrega;
  tipoComidaNombre: string;
  tipoComidaId: number;
  message: string;
  alertType?: MotivoAlerta;
  alertDetails?: string;
}

export interface CarreraVisual {
  nombre: string;
  icono: string;
  badgeClass: string;
  pillActive: string;
  pillCount: string;
  color: string;
  jornada: string;
}

export const CARRERA_VISUAL_MAP: Record<string, CarreraVisual> = {
  'ADMINISTRACIÓN DE EMPRESAS': {
    nombre: 'ADMINISTRACIÓN DE EMPRESAS', icono: 'business',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-200',
    pillActive: 'bg-blue-600 text-white', pillCount: 'bg-blue-700 text-white',
    color: 'bg-blue-100 text-blue-800', jornada: 'Diurna'
  },
  'CONTADURÍA': {
    nombre: 'CONTADURÍA', icono: 'account_balance',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    pillActive: 'bg-emerald-600 text-white', pillCount: 'bg-emerald-700 text-white',
    color: 'bg-emerald-100 text-emerald-800', jornada: 'Diurna'
  },
  'DERECHO': {
    nombre: 'DERECHO', icono: 'gavel',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
    pillActive: 'bg-purple-600 text-white', pillCount: 'bg-purple-700 text-white',
    color: 'bg-purple-100 text-purple-800', jornada: 'Diurna'
  },
  'ECONOMÍA': {
    nombre: 'ECONOMÍA', icono: 'show_chart',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    pillActive: 'bg-amber-600 text-white', pillCount: 'bg-amber-700 text-white',
    color: 'bg-amber-100 text-amber-800', jornada: 'Diurna'
  },
  'INGENIERÍA DE SISTEMAS': {
    nombre: 'INGENIERÍA DE SISTEMAS', icono: 'computer',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-200',
    pillActive: 'bg-cyan-600 text-white', pillCount: 'bg-cyan-700 text-white',
    color: 'bg-cyan-100 text-cyan-800', jornada: 'Diurna'
  },
  'INGENIERÍA ELECTRÓNICA': {
    nombre: 'INGENIERÍA ELECTRÓNICA', icono: 'memory',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-200',
    pillActive: 'bg-rose-600 text-white', pillCount: 'bg-rose-700 text-white',
    color: 'bg-rose-100 text-rose-800', jornada: 'Diurna'
  },
  'INGENIERÍA INDUSTRIAL': {
    nombre: 'INGENIERÍA INDUSTRIAL', icono: 'settings',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-200',
    pillActive: 'bg-orange-600 text-white', pillCount: 'bg-orange-700 text-white',
    color: 'bg-orange-100 text-orange-800', jornada: 'Diurna'
  },
  'LICENCIATURA EN INGLÉS': {
    nombre: 'LICENCIATURA EN INGLÉS', icono: 'translate',
    badgeClass: 'bg-teal-100 text-teal-900 border-teal-200',
    pillActive: 'bg-teal-600 text-white', pillCount: 'bg-teal-700 text-white',
    color: 'bg-teal-100 text-teal-800', jornada: 'Diurna'
  },
  'PSICOLOGÍA': {
    nombre: 'PSICOLOGÍA', icono: 'psychology',
    badgeClass: 'bg-pink-100 text-pink-900 border-pink-200',
    pillActive: 'bg-pink-600 text-white', pillCount: 'bg-pink-700 text-white',
    color: 'bg-pink-100 text-pink-800', jornada: 'Diurna'
  },
  'TRABAJO SOCIAL': {
    nombre: 'TRABAJO SOCIAL', icono: 'groups',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    pillActive: 'bg-indigo-600 text-white', pillCount: 'bg-indigo-700 text-white',
    color: 'bg-indigo-100 text-indigo-800', jornada: 'Nocturna'
  },
  'ADMINISTRACIÓN FINANCIERA': {
    nombre: 'ADMINISTRACIÓN FINANCIERA', icono: 'paid',
    badgeClass: 'bg-lime-100 text-lime-900 border-lime-200',
    pillActive: 'bg-lime-600 text-white', pillCount: 'bg-lime-700 text-white',
    color: 'bg-lime-100 text-lime-800', jornada: 'Nocturna'
  },
  'ING AGRONOMICA': {
    nombre: 'ING AGRONOMICA', icono: 'eco',
    badgeClass: 'bg-lime-100 text-lime-900 border-lime-200',
    pillActive: 'bg-lime-600 text-white', pillCount: 'bg-lime-700 text-white',
    color: 'bg-lime-100 text-lime-800', jornada: 'Diurna'
  },
  'AGROINDUSTRIAL': {
    nombre: 'AGROINDUSTRIAL', icono: 'agriculture',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    pillActive: 'bg-emerald-600 text-white', pillCount: 'bg-emerald-700 text-white',
    color: 'bg-emerald-100 text-emerald-800', jornada: 'Diurna'
  },
  'ADEA': {
    nombre: 'ADEA', icono: 'menu_book',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    pillActive: 'bg-amber-600 text-white', pillCount: 'bg-amber-700 text-white',
    color: 'bg-amber-100 text-amber-800', jornada: 'Fin de semana'
  },
  'REGENCIA': {
    nombre: 'REGENCIA', icono: 'medical_services',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-200',
    pillActive: 'bg-cyan-600 text-white', pillCount: 'bg-cyan-700 text-white',
    color: 'bg-cyan-100 text-cyan-800', jornada: 'Fin de semana'
  },
  'TECNICO EN PROCESOS': {
    nombre: 'TECNICO EN PROCESOS', icono: 'biotech',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    pillActive: 'bg-indigo-600 text-white', pillCount: 'bg-indigo-700 text-white',
    color: 'bg-indigo-100 text-indigo-800', jornada: 'Fin de semana'
  }
};

export const DEFAULT_CARRERA_VISUAL: CarreraVisual = {
  nombre: 'PROGRAMA ACADÉMICO', icono: 'school',
  badgeClass: 'bg-stone-100 text-stone-900 border-stone-200',
  pillActive: 'bg-stone-600 text-white', pillCount: 'bg-stone-700 text-white',
  color: 'bg-stone-100 text-stone-800', jornada: 'N/A'
};

export function getVisualCarrera(carreraName?: string): CarreraVisual {
  if (!carreraName) return DEFAULT_CARRERA_VISUAL;
  const upper = carreraName.trim().toUpperCase();

  if (CARRERA_VISUAL_MAP[upper]) return CARRERA_VISUAL_MAP[upper];

  for (const [key, visual] of Object.entries(CARRERA_VISUAL_MAP)) {
    if (upper.includes(key) || key.includes(upper)) return visual;
  }

  if (upper.includes('SISTEMA')) return CARRERA_VISUAL_MAP['INGENIERÍA DE SISTEMAS'];
  if (upper.includes('ELECTR')) return CARRERA_VISUAL_MAP['INGENIERÍA ELECTRÓNICA'];
  if (upper.includes('INDUST')) return CARRERA_VISUAL_MAP['INGENIERÍA INDUSTRIAL'];
  if (upper.includes('FINANCIER')) return CARRERA_VISUAL_MAP['ADMINISTRACIÓN FINANCIERA'];
  if (upper.includes('EMPRESA') || upper.includes('ADMON')) return CARRERA_VISUAL_MAP['ADMINISTRACIÓN DE EMPRESAS'];
  if (upper.includes('CONTAD')) return CARRERA_VISUAL_MAP['CONTADURÍA'];
  if (upper.includes('DERECH')) return CARRERA_VISUAL_MAP['DERECHO'];
  if (upper.includes('ECONOM')) return CARRERA_VISUAL_MAP['ECONOMÍA'];
  if (upper.includes('INGL') || upper.includes('LICENC')) return CARRERA_VISUAL_MAP['LICENCIATURA EN INGLÉS'];
  if (upper.includes('PSICOL')) return CARRERA_VISUAL_MAP['PSICOLOGÍA'];
  if (upper.includes('TRABAJO') || upper.includes('SOCIAL')) return CARRERA_VISUAL_MAP['TRABAJO SOCIAL'];
  if (upper.includes('INFORMAT') || upper.includes('INFORMÁT')) return CARRERA_VISUAL_MAP['INGENIERÍA DE SISTEMAS'];
  if (upper.includes('MEDIC')) return CARRERA_VISUAL_MAP['DERECHO'];
  if (upper.includes('ENFERM')) return CARRERA_VISUAL_MAP['TRABAJO SOCIAL'];
  if (upper.includes('AGRON') && !upper.includes('AGROIND')) return CARRERA_VISUAL_MAP['ING AGRONOMICA'];
  if (upper.includes('AGROIND')) return CARRERA_VISUAL_MAP['AGROINDUSTRIAL'];
  if (upper.includes('ALIMENT')) return CARRERA_VISUAL_MAP['ADEA'];
  if (upper === 'ADEA') return CARRERA_VISUAL_MAP['ADEA'];
  if (upper.includes('REGENC')) return CARRERA_VISUAL_MAP['REGENCIA'];
  if (upper.includes('TECNICO') && (upper.includes('PROCESO') || upper.includes('SALUD'))) return CARRERA_VISUAL_MAP['TECNICO EN PROCESOS'];
  if (upper.includes('TECNICO')) return CARRERA_VISUAL_MAP['TECNICO EN PROCESOS'];

  return { ...DEFAULT_CARRERA_VISUAL, nombre: carreraName };
}
