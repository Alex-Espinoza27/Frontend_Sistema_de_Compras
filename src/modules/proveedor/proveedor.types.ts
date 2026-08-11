import type { TipoPersona } from '@/modules/auth/auth.types'
import type { ArchivoResumen, TipoConvocatoria } from '@/modules/publico/publico.types'
import type { Estado } from '@/types/api'

export interface ArchivoRef {
  archivo_id: number
  descarga_url: string
}

export interface ItemPostulacion {
  requerimiento_item_id: number
  numero: number
  descripcion: string
  unidad_medida: string
  cantidad: number
  presentacion: string | null
}

export interface TipoComprobantePostulacion {
  tipo_comprobante_id: number
  codigo: string
  nombre: string
}

/** `GET /convocatorias/{id}/postulacion` (03 §6, `OfertaController::postulacion`). */
export interface PostulacionDatos {
  convocatoria: {
    convocatoria_id: number
    numero: string | null
    nombre_servicio: string
    tipo: TipoConvocatoria
    fecha_fin: string
  }
  plantilla_dj: ArchivoRef | null
  items: ItemPostulacion[]
  tipos_comprobante: TipoComprobantePostulacion[]
  opciones_validez: number[]
}

export interface OfertaItemInput {
  requerimiento_item_id: number
  marca_modelo: string
  precio_unitario: number
}

/** Cuerpo multipart de `POST /ofertas` (`OfertaStoreRequest`). `tipo_comprobante_id`
 * solo se exige para convocatorias de tipo SERVICIO (05C hardening). */
export interface OfertaStoreInput {
  convocatoria_id: number
  tipo_comprobante_id: number | null
  items: OfertaItemInput[]
  validez_dias: number
  plazo_ejecucion_segun_tdr: boolean
  plazo_ejecucion_dias: number | null
  forma_pago_segun_tdr: boolean
  forma_pago_dias: number | null
  plazo_garantia: string
  contacto_nombre: string
  contacto_telefono: string
  contacto_correo: string
  declaracion_jurada: File
  sustento: File
}

/** `POST /ofertas` respuesta (`OfertaService::crear`). */
export interface OfertaStoreRespuesta {
  oferta_id: number
  constancia_codigo: string
  total_general: string
  constancia_url: string
}

/** `GET /ofertas/resumen` (`OfertaController::resumen`, D3). */
export interface OfertaResumenEntidad {
  entidad_id: number
  sigla: string
  total_ofertas: number
}

/** Ítem de `GET /ofertas` (`OfertaController::index`, D3). */
export interface OfertaListaItem {
  oferta_id: number
  convocatoria: { numero: string | null; nombre_servicio: string }
  entidad: { sigla: string }
  total_general: string
  estado: Estado
  fecha_envio: string
  es_ganadora: boolean
}

export interface ItemOfertaDetalle {
  numero: number
  descripcion: string
  unidad_medida: { codigo: string; nombre: string }
  marca_modelo: string
  precio_unitario: string
  precio_total: string
}

export interface ResultadoEvaluacion {
  eval_tecnica: 'APROBADO' | 'DESAPROBADO' | null
  eval_tecnica_motivo: string | null
  eval_logistica: 'APROBADO' | 'DESAPROBADO' | null
  eval_logistica_motivo: string | null
}

/** `GET /ofertas/{id}` (`OfertaController::show`, D4). */
export interface OfertaDetalle {
  oferta_id: number
  convocatoria: { convocatoria_id: number; numero: string | null; nombre_servicio: string }
  estado: Estado
  tipo_comprobante: { codigo: string; nombre: string }
  total_general: string
  validez_dias: number
  plazo_ejecucion_segun_tdr: boolean
  plazo_ejecucion_dias: number | null
  forma_pago_segun_tdr: boolean
  forma_pago_dias: number | null
  plazo_garantia: string
  contacto_nombre: string
  contacto_telefono: string
  contacto_correo: string
  constancia_codigo: string
  fecha_envio: string
  items: ItemOfertaDetalle[]
  archivos: {
    declaracion_jurada: ArchivoResumen | null
    sustentos: ArchivoResumen[]
    constancia_url: string
  }
  resultado_evaluacion: ResultadoEvaluacion | null
}

export interface RubroAsignado {
  rubro_id: number
  nombre: string
}

/** `GET /proveedores/mis-datos` (`ProveedorController::misDatos`, D5). */
export interface MisDatosProveedor {
  proveedor_id: number
  numero_documento: string
  razon_social: string
  tipo_persona: TipoPersona
  correo: string
  telefono: string
  persona_contacto: string
  estado: { codigo: string; color: Estado['color'] }
  rubros_servicios: RubroAsignado[]
  rubros_bienes: RubroAsignado[]
}

export interface ActualizarMisDatosInput {
  correo: string
  telefono: string
  persona_contacto: string
}

export interface ActualizarMisRubrosInput {
  rubros_servicios: number[]
  rubros_bienes: number[]
}

export interface SuspenderProveedorInput {
  confirmacion: boolean
  motivo?: string
}
