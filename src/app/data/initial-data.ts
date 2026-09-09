import { Carrera, TipoComida, Beneficiario, Confirmacion, Entrega, Operador } from '../models/cafeteria.models';

export const SUPABASE_CONFIG = {
  url: 'https://doztchubrnjlcxpzbhgt.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvenRjaHVicm5qbGN4cHpiaGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMDM1NjQsImV4cCI6MjEwMzg3OTU2NH0._dlpaCg91GX--eoBkC9kFnM_CJbmgYNQ7TapBrUHpLo'
};

export const OPERADORES_PREDETERMINADOS: Operador[] = [
  { id: 'op1', nombre: 'Tito Salazar', rol: 'Recepcionista Principal' },
  { id: 'op2', nombre: 'Marta Gómez', rol: 'Recepcionista Turno Tarde' },
  { id: 'op3', nombre: 'Carlos Mendoza', rol: 'Coordinador Cafetería' },
  { id: 'op4', nombre: 'Laura Rojas', rol: 'Auxiliar de Entrega' },
  { id: 'op5', nombre: 'Admin Guarincito', rol: 'Supervisión' }
];

export const TIPOS_COMIDA_INIT: TipoComida[] = [
  { id: 1, nombre: 'Desayuno' },
  { id: 2, nombre: 'Almuerzo' },
  { id: 3, nombre: 'Refrigerio' }
];

export const CARRERAS_INIT: Carrera[] = [
  { id: 1, nombre: 'AGROINDUSTRIAL', jornada: 'Diurna', activo: true, servicioDefecto: 'Almuerzo', diasServicio: 'Lunes a Viernes' },
  { id: 2, nombre: 'ING AGRONOMICA', jornada: 'Diurna', activo: true, servicioDefecto: 'Almuerzo', diasServicio: 'Lunes a Viernes' },
  { id: 3, nombre: 'MEDICINA', jornada: 'Diurna', activo: true, servicioDefecto: 'Almuerzo', diasServicio: 'Lunes a Viernes' },
  { id: 4, nombre: 'ENFERMERIA', jornada: 'Diurna', activo: true, servicioDefecto: 'Almuerzo', diasServicio: 'Lunes a Viernes' },
  { id: 5, nombre: 'SBDIO CAFTERIA', jornada: 'Diurna', activo: true, servicioDefecto: 'Almuerzo', diasServicio: 'Lunes a Viernes' },
  { id: 6, nombre: 'ING INFORMATICA', jornada: 'Diurna', activo: true, servicioDefecto: 'Almuerzo', diasServicio: 'Lunes a Viernes' },
  { id: 7, nombre: 'ADMON FINANCIERA', jornada: 'Nocturna', activo: true, servicioDefecto: 'Refrigerio', diasServicio: 'Lunes a Viernes' },
  { id: 8, nombre: 'TRABAJO SOCIAL', jornada: 'Nocturna', activo: true, servicioDefecto: 'Refrigerio', diasServicio: 'Lunes a Viernes' },
  { id: 9, nombre: 'ADEA', jornada: 'Fin de semana', activo: true, servicioDefecto: 'Almuerzo', diasServicio: 'Sábados' },
  { id: 10, nombre: 'REGENCIA', jornada: 'Fin de semana', activo: true, servicioDefecto: 'Refrigerio/Desayuno', diasServicio: 'Sáb (Ref) / Dom (Des)' },
  { id: 11, nombre: 'TECNICO EN PROCESOS', jornada: 'Fin de semana', activo: true, servicioDefecto: 'Refrigerio/Desayuno', diasServicio: 'Sáb (Ref) / Dom (Des)' }
];

export const BENEFICIARIOS_SEED: Beneficiario[] = [
  { id: 1, codigo_id: '80969', nombre: 'Alexis David Pérez', genero: 'H', carrera_id: 5, tipo_comida_id: 2, activo: true, email: 'alexis.perez@universidad.edu.co', carrera_nombre: 'SBDIO CAFTERIA' },
  { id: 2, codigo_id: '42443', nombre: 'Camila Andrea Morales', genero: 'M', carrera_id: 6, tipo_comida_id: 2, activo: true, email: 'camila.morales@universidad.edu.co', carrera_nombre: 'ING INFORMATICA' },
  { id: 3, codigo_id: '76578', nombre: 'Tito Salazar Ramírez', genero: 'H', carrera_id: 1, tipo_comida_id: 2, activo: true, email: 'tito.salazar@universidad.edu.co', carrera_nombre: 'AGROINDUSTRIAL' },
  { id: 4, codigo_id: '55120', nombre: 'Valentina Restrepo Gil', genero: 'M', carrera_id: 3, tipo_comida_id: 2, activo: true, email: 'valentina.restrepo@universidad.edu.co', carrera_nombre: 'MEDICINA' },
  { id: 5, codigo_id: '35', nombre: 'Mateo Gómez Castro', genero: 'H', carrera_id: 2, tipo_comida_id: 2, activo: true, email: 'mateo.gomez@universidad.edu.co', carrera_nombre: 'ING AGRONOMICA' },
  { id: 6, codigo_id: '88142', nombre: 'Daniela Ospina Ruiz', genero: 'M', carrera_id: 4, tipo_comida_id: 2, activo: true, email: 'daniela.ospina@universidad.edu.co', carrera_nombre: 'ENFERMERIA' },
  { id: 7, codigo_id: '91033', nombre: 'Julián Andrés Echeverry', genero: 'H', carrera_id: 7, tipo_comida_id: 3, activo: true, email: 'julian.echeverry@universidad.edu.co', carrera_nombre: 'ADMON FINANCIERA' },
  { id: 8, codigo_id: '64091', nombre: 'Sofía Londoño Arias', genero: 'M', carrera_id: 8, tipo_comida_id: 3, activo: true, email: 'sofia.londono@universidad.edu.co', carrera_nombre: 'TRABAJO SOCIAL' },
  { id: 9, codigo_id: '71402', nombre: 'Sebastián Betancur M.', genero: 'H', carrera_id: 9, tipo_comida_id: 2, activo: true, email: 'sebastian.betancur@universidad.edu.co', carrera_nombre: 'ADEA' },
  { id: 10, codigo_id: '99201', nombre: 'Mariana Caicedo Vélez', genero: 'M', carrera_id: 10, tipo_comida_id: 3, activo: true, email: 'mariana.caicedo@universidad.edu.co', carrera_nombre: 'REGENCIA' }
];

export function getTodayDateStr(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).formatToParts(now);
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}

export function generateSeedConfirmaciones(): Confirmacion[] {
  const today = getTodayDateStr();
  return [
    {
      id: 1,
      codigo_id: '80969',
      beneficiario_id: 1,
      tipo_comida_id: 2,
      fecha: today,
      carrera_en_form: 'ING AGRONOMICA',
      carrera_real: 'SBDIO CAFTERIA',
      es_beneficiario_valido: true,
      motivo_alerta: 'carrera_diferente',
      corregido: false,
      observacion: 'Alexis es de SBDIO CAFTERIA pero seleccionó ING AGRONOMICA en el form',
      origen: 'GoogleForms',
      beneficiario_nombre: 'Alexis David Pérez',
      carrera_nombre: 'SBDIO CAFTERIA',
      tipo_comida_nombre: 'Almuerzo'
    },
    {
      id: 2,
      codigo_id: '42443',
      beneficiario_id: 2,
      tipo_comida_id: 2,
      fecha: today,
      carrera_en_form: 'ING INFORMATICA',
      carrera_real: 'ING INFORMATICA',
      es_beneficiario_valido: true,
      motivo_alerta: null,
      corregido: false,
      origen: 'GoogleForms',
      beneficiario_nombre: 'Camila Andrea Morales',
      carrera_nombre: 'ING INFORMATICA',
      tipo_comida_nombre: 'Almuerzo'
    },
    {
      id: 3,
      codigo_id: '76578',
      beneficiario_id: 3,
      tipo_comida_id: 2,
      fecha: today,
      carrera_en_form: 'AGROINDUSTRIAL',
      carrera_real: 'AGROINDUSTRIAL',
      es_beneficiario_valido: true,
      motivo_alerta: null,
      corregido: false,
      origen: 'GoogleForms',
      beneficiario_nombre: 'Tito Salazar Ramírez',
      carrera_nombre: 'AGROINDUSTRIAL',
      tipo_comida_nombre: 'Almuerzo'
    },
    {
      id: 4,
      codigo_id: '55120',
      beneficiario_id: 4,
      tipo_comida_id: 2,
      fecha: today,
      carrera_en_form: 'MEDICINA',
      carrera_real: 'MEDICINA',
      es_beneficiario_valido: true,
      motivo_alerta: null,
      corregido: false,
      origen: 'GoogleForms',
      beneficiario_nombre: 'Valentina Restrepo Gil',
      carrera_nombre: 'MEDICINA',
      tipo_comida_nombre: 'Almuerzo'
    },
    {
      id: 5,
      codigo_id: '99999',
      beneficiario_id: null,
      tipo_comida_id: 2,
      fecha: today,
      carrera_en_form: 'ING INFORMATICA',
      carrera_real: null,
      es_beneficiario_valido: false,
      motivo_alerta: 'no_en_padron',
      corregido: false,
      observacion: 'Código 99999 no existe en el padrón de beneficiarios del iVMS',
      origen: 'GoogleForms',
      beneficiario_nombre: 'Desconocido (No en padron)',
      carrera_nombre: 'Sin Padrón',
      tipo_comida_nombre: 'Almuerzo'
    }
  ];
}

export function generateSeedEntregas(): Entrega[] {
  const today = getTodayDateStr();
  return [
    {
      id: 1,
      confirmacion_id: 3,
      codigo_id: '76578',
      beneficiario_id: 3,
      tipo_comida_id: 2,
      fecha: today,
      hora: '12:15:32',
      estado: 'ENTREGADO',
      entregado_por: 'Tito Salazar',
      beneficiario_nombre: 'Tito Salazar Ramírez',
      carrera_nombre: 'AGROINDUSTRIAL',
      tipo_comida_nombre: 'Almuerzo'
    },
    {
      id: 2,
      confirmacion_id: 4,
      codigo_id: '55120',
      beneficiario_id: 4,
      tipo_comida_id: 2,
      fecha: today,
      hora: '12:22:04',
      estado: 'ENTREGADO',
      entregado_por: 'Tito Salazar',
      beneficiario_nombre: 'Valentina Restrepo Gil',
      carrera_nombre: 'MEDICINA',
      tipo_comida_nombre: 'Almuerzo'
    }
  ];
}
