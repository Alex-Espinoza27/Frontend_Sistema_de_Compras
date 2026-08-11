/** `GET /dashboard` (03 §13, `DashboardController::index`, J1). */
/** `GET /dashboard` (J1) para ENTIDAD/ADMINISTRADOR/AUDITOR — el propio para
 * una entidad, el general (o filtrado por `entidad_id`) para admin/auditor. */
export interface DashboardEntidadAdmin {
  contexto: 'ENTIDAD_ADMIN'
  convocatorias_vigentes: number
  convocatorias_en_evaluacion: number
  procesos_adjudicados: number
  procesos_desiertos: number
  procesos_cancelados: number
  proveedores_participantes: number
  monto_total_adjudicado: number
  adjudicadas_por_mes: { mes: string; cantidad: number; monto: number }[]
  top_rubros: { rubro: string; cantidad: number }[]
  convocatorias_por_estado: { codigo: string; nombre: string; color: string; cantidad: number }[]
  convocatorias_por_mes: { mes: string; presentadas: number; en_evaluacion: number; concluidas: number }[]
  comparativa_entidades: { entidad_id: number; sigla: string; adjudicadas: number; desiertas: number; canceladas: number }[]
}

/** `GET /dashboard` (05C hardening) para PROVEEDOR — solo sus propias ofertas. */
export interface DashboardProveedor {
  contexto: 'PROVEEDOR'
  mis_ofertas_enviadas: number
  mis_ofertas_en_evaluacion: number
  mis_ofertas_adjudicadas: number
  mis_ofertas_no_adjudicadas: number
  monto_total_ganado: number
  ofertas_por_mes: { mes: string; enviadas: number; adjudicadas: number }[]
  top_rubros_postulados: { rubro: string; cantidad: number }[]
}

export type DashboardDatos = DashboardEntidadAdmin | DashboardProveedor

export interface DashboardParams {
  desde?: string
  hasta?: string
  entidad_id?: number
}

/** Ítem de `GET /notificaciones` (J4). */
export interface NotificacionItem {
  notificacion_id: number
  tipo: string
  titulo: string
  mensaje: string
  leida: boolean
  referencia_tipo: string | null
  referencia_id: number | null
  creado_en: string
}

// --- J2 · Reportes -------------------------------------------------------------

export type TipoReporte = 'ADJUDICACION' | 'POR_PERIODO' | 'POR_DEPENDENCIA' | 'POR_PROVEEDOR'

export interface ReporteBuscarInput {
  tipo: TipoReporte
  desde?: string
  hasta?: string
  entidad_id?: number
  area_id?: number
  proveedor_id?: number
  estado?: string
  tipo_requerimiento?: 'BIEN' | 'SERVICIO'
  rubro_id?: number
  tipo_comprobante_id?: number
  pagina?: number
  por_pagina?: number
  ordenar_por?: string
  direccion?: 'asc' | 'desc'
}

/** Condiciones ofertadas — repetido en ADJUDICACION (de la oferta ganadora) y
 * POR_PROVEEDOR (de la propia oferta), 05C hardening. */
interface CondicionesOferta {
  tipo_comprobante: string | null
  validez_dias: number | null
  plazo_ejecucion: string | null
  forma_pago: string | null
  plazo_garantia: string | null
}

/** Fila de `POST /reportes/buscar` — la forma exacta depende de `tipo` (`ReporteService::mapearFila`).
 * El id (`convocatoria_id`/`oferta_id`) lo agrega `ReporteController::buscar`
 * aparte de `mapearFila`, solo para el JSON (se usa como `item-value` de la tabla). */
export interface ReporteFilaAdjudicacion extends CondicionesOferta {
  convocatoria_id: number
  numero: string | null
  nombre_servicio: string
  entidad: string | null
  entidad_ruc: string | null
  tipo: 'BIEN' | 'SERVICIO' | null
  rubros: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  proveedor_adjudicado: string | null
  proveedor_ruc: string | null
  monto: string | null
  fecha_resultado: string | null
}

export interface ReporteFilaPorPeriodo {
  convocatoria_id: number
  numero: string | null
  nombre_servicio: string
  entidad: string | null
  entidad_ruc: string | null
  tipo: 'BIEN' | 'SERVICIO' | null
  rubros: string | null
  estado: string | null
  total_ofertas: number
  fecha_inicio: string | null
  fecha_publicacion: string | null
  fecha_resultado: string | null
  motivo_cierre: string | null
}

export interface ReporteFilaPorDependencia {
  convocatoria_id: number
  numero: string | null
  nombre_servicio: string
  entidad: string | null
  entidad_ruc: string | null
  tipo: 'BIEN' | 'SERVICIO' | null
  rubros: string | null
  area_usuaria: string | null
  estado: string | null
  total_ofertas: number
  fecha_inicio: string | null
  fecha_fin: string | null
  fecha_resultado: string | null
}

export interface ReporteFilaPorProveedor extends CondicionesOferta {
  oferta_id: number
  proveedor: string | null
  proveedor_ruc: string | null
  tipo_persona: string | null
  convocatoria: string | null
  entidad: string | null
  entidad_ruc: string | null
  total_general: string
  eval_tecnica: string | null
  eval_logistica: string | null
  contacto_nombre: string | null
  contacto_telefono: string | null
  contacto_correo: string | null
  estado: string | null
  fecha_envio: string
}

export type ReporteFila = ReporteFilaAdjudicacion | ReporteFilaPorPeriodo | ReporteFilaPorDependencia | ReporteFilaPorProveedor

// --- J3 · Auditoría --------------------------------------------------------------

export type AccionAuditoria =
  | 'LOGIN'
  | 'CREAR'
  | 'ACTUALIZAR'
  | 'ELIMINAR'
  | 'PUBLICAR'
  | 'EVALUAR'
  | 'ADJUDICAR'
  | 'DESIERTA'
  | 'CANCELAR'

export interface AuditoriaListaItem {
  auditoria_id: number
  usuario: { id: number; nombre: string } | null
  modulo: string
  accion: string
  tabla: string
  registro_id: number
  ip: string | null
  fecha: string
}

export interface AuditoriaDetalle extends Omit<AuditoriaListaItem, 'usuario'> {
  usuario: { id: number; nombre: string; correo: string } | null
  valor_anterior: Record<string, unknown> | null
  valor_nuevo: Record<string, unknown> | null
  user_agent: string | null
  endpoint: string | null
}
