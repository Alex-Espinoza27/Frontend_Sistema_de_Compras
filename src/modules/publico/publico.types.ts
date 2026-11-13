import type { ColorEstado } from '@/types/api'

export interface EntidadPublica {
  entidad_id: number
  razon_social: string
  sigla: string
  convocatorias_vigentes: number
  convocatorias_total: number
}

export interface ArchivoResumen {
  archivo_id: number
  nombre: string
}

export type EstadoGrupo = 'VIGENTES' | 'EN_EVALUACION' | 'CONCLUIDAS'
export type TipoConvocatoria = 'BIEN' | 'SERVICIO'
export type AccionConvocatoria = 'POSTULAR' | 'YA_POSTULADO' | 'VER_POSTULACION' | 'NINGUNA' | 'RESULTADOS' | 'MOTIVO'

interface EstadoResumen {
  codigo: string
  nombre: string
  color: ColorEstado
}

/** Ítem de `GET /publico/convocatorias` (03 §3, `PublicoController::convocatorias`).
 * Con `mias=true` (05C hardening: módulo "Mis Postulaciones" del proveedor),
 * `accion` es siempre `VER_POSTULACION` y trae `oferta_id` de esa postulación. */
export interface ConvocatoriaPublicaItem {
  convocatoria_id: number
  numero: string | null
  nombre_servicio: string
  tipo: TipoConvocatoria
  entidad: { entidad_id: number; sigla: string }
  fecha_publicacion: string | null
  fecha_inicio: string
  fecha_fin: string
  estado: EstadoResumen
  archivo_tdr: ArchivoResumen | null
  accion: AccionConvocatoria
  oferta_id?: number
  urgencia_dias?: number
  es_urgente?: boolean
  /** Solo en CONCLUIDAS (05C hardening, pedido explícitamente por el usuario):
   * visible directamente en la lista, sin abrir el detalle. */
  motivo_cierre?: string | null
  resultado_resumen?: string | null
}

export interface ItemRequerimientoPublico {
  numero: number
  descripcion: string
  unidad_medida: { codigo: string; nombre: string }
  cantidad: number
  presentacion: string | null
}

/** `GET /publico/convocatorias/{id}` (03 §3, `PublicoController::convocatoria`). */
export interface ConvocatoriaPublicaDetalle {
  convocatoria_id: number
  numero: string | null
  nombre_servicio: string
  tipo: TipoConvocatoria
  entidad: { entidad_id: number; razon_social: string; sigla: string }
  fecha_publicacion: string | null
  fecha_inicio: string
  fecha_fin: string
  estado: EstadoResumen
  accion: AccionConvocatoria
  motivo_cierre: string | null
  resultado_resumen: string | null
  items: ItemRequerimientoPublico[]
  archivos: { tdr: ArchivoResumen | null; plantilla_dj: ArchivoResumen | null }
}

/** `GET /publico/rubros` (`PublicoController::rubros` — agregado en Fase 3 para desbloquear el paso 3 de B2; ver `05C_FRONTEND_FASES.md`). */
export interface RubroPublico {
  rubro_id: number
  tipo: 'BIEN' | 'SERVICIO'
  codigo: string
  nombre: string
}

/** `POST /publico/entidades/solicitud` (03 §3, `PublicoController::solicitudEntidad`). */
export interface SolicitudEntidadInput {
  numero_documento: string
  razon_social: string
  sigla: string
  correo: string
  telefono: string
  direccion: string
  persona_contacto: string
  captcha: string
}

/** `GET /datos-abiertos/estadisticas` (03 §3, `DatosAbiertosController::estadisticas`). */
export interface EstadisticasPublicas {
  convocatorias_por_estado: { codigo: string; nombre: string; total: number }[]
  proveedores_participantes: number
}
