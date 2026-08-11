import type { Estado } from '@/types/api'

export type TipoRequerimiento = 'BIEN' | 'SERVICIO'

export interface RubroRef {
  rubro_id: number
  nombre: string
}

export interface AreaRef {
  area_id: number
  nombre: string
}

/** 05C hardening — expuesto en Requerimientos para ADMINISTRADOR/AUDITOR
 * (que no tienen entidad propia y ven registros de todas). */
export interface EntidadRefSigla {
  entidad_id: number
  sigla: string | null
}

/** `GET /areas` (`AreaController::index`, 05C hardening — catálogo de áreas
 * por entidad, reemplaza el texto libre `area_usuaria`). */
export interface AreaItem {
  area_id: number
  nombre: string
  sigla: string | null
  activo: boolean
}

/** Cuerpo de `POST`/`PUT /areas`. */
export interface AreaInput {
  nombre: string
  sigla?: string | null
  activo?: boolean
  // Solo obligatorio cuando lo crea ADMINISTRADOR (05C hardening — no tiene
  // entidad propia, debe elegir en nombre de cuál la crea).
  entidad_id?: number | null
}

export interface UnidadMedidaCombo {
  unidad_medida_id: number
  codigo: string
  nombre: string
}

/** Ítem de `GET /requerimientos` (03 §7, `RequerimientoController::index`).
 * `rubros` es un array desde 05C hardening (un requerimiento puede tener más
 * de un rubro). */
export interface RequerimientoListaItem {
  requerimiento_id: number
  numero: string
  objeto: string
  tipo: TipoRequerimiento
  area: AreaRef | null
  entidad: EntidadRefSigla
  fecha_creacion: string
  rubros: RubroRef[]
  cantidad_items: number
  tiene_convocatoria: boolean
}

export interface ItemRequerimientoDetalle {
  requerimiento_item_id: number
  numero: number
  descripcion: string
  unidad_medida: { codigo: string; nombre: string }
  cantidad: number
  presentacion: string | null
}

/** `GET /requerimientos/{id}` (`RequerimientoController::show`). */
export interface RequerimientoDetalle {
  requerimiento_id: number
  numero: string
  objeto: string
  descripcion: string
  tipo: TipoRequerimiento
  area: AreaRef | null
  entidad: EntidadRefSigla
  fecha_creacion: string
  rubros: RubroRef[]
  items: ItemRequerimientoDetalle[]
  archivo_tdr: { archivo_id: number; nombre: string } | null
}

export interface ItemRequerimientoInput {
  numero: number
  descripcion: string
  unidad_medida_id: number
  cantidad: number
  presentacion: string | null
}

/** Cuerpo de `POST`/`PUT /requerimientos` (`RequerimientoStoreRequest`/`UpdateRequest`). El
 * número lo asigna el backend (NumeracionService); nunca se envía. `rubro_ids`
 * es un array desde 05C hardening (un requerimiento puede tener más de un rubro). */
export interface RequerimientoGuardarInput {
  objeto: string
  descripcion: string
  tipo: TipoRequerimiento
  rubro_ids: number[]
  area_id: number | null
  // Solo obligatorio cuando lo crea ADMINISTRADOR (05C hardening — no tiene
  // entidad propia, debe elegir en nombre de cuál la crea).
  entidad_id?: number | null
  items: ItemRequerimientoInput[]
}

/** `GET /requerimientos/combo` (`RequerimientoController::combo`, E4). */
export interface RequerimientoCombo {
  requerimiento_id: number
  numero: string
  objeto: string
}

/** Ítem de `GET /convocatorias` (`ConvocatoriaController::index`, E3). */
export interface ConvocatoriaListaItem {
  convocatoria_id: number
  numero: string | null
  nombre_servicio: string
  fecha_inicio: string
  fecha_fin: string
  estado: Estado
  urgencia_dias: number
  total_ofertas: number
  /** DESIERTA/CANCELADA (05C hardening, pedido explícitamente por el usuario). */
  motivo_cierre: string | null
}

/** `GET /convocatorias/{id}` (`ConvocatoriaController::show`, E4). */
export interface ConvocatoriaDetalle {
  convocatoria_id: number
  numero: string | null
  nombre_servicio: string
  fecha_inicio: string
  fecha_fin: string
  estado: Estado
  motivo_cierre: string | null
  fecha_publicacion: string | null
  fecha_apertura: string | null
  fecha_resultado: string | null
  requerimiento: {
    requerimiento_id: number
    numero: string
    objeto: string
    items: ItemRequerimientoDetalle[]
  }
  archivos: {
    tdr: { archivo_id: number; nombre: string } | null
    plantilla_dj: { archivo_id: number; nombre: string } | null
  }
  total_ofertas: number
}

/** `POST /convocatorias` (`ConvocatoriaStoreRequest`). */
export interface ConvocatoriaStoreInput {
  requerimiento_id: number
  nombre_servicio: string
  fecha_inicio: string
  fecha_fin: string
}

/** `PUT /convocatorias/{id}` (`ConvocatoriaUpdateRequest`) — sin `requerimiento_id`, no se puede cambiar. */
export interface ConvocatoriaUpdateInput {
  nombre_servicio: string
  fecha_inicio: string
  fecha_fin: string
}

export interface ConvocatoriaPublicarRespuesta {
  convocatoria_id: number
  numero: string
  estado: string
}

export type ResultadoEvaluacionCompuerta = 'APROBADO' | 'DESAPROBADO' | null

export interface ProveedorRef {
  proveedor_id: number
  numero_documento: string
  razon_social: string
}

/** Ítem de `GET /convocatorias/{id}/ofertas` (`EvaluacionController::ofertas`, F1). */
export interface OfertaEvaluacionItem {
  oferta_id: number
  constancia_codigo: string
  proveedor: ProveedorRef
  total_general: string
  tipo_comprobante: string
  eval_tecnica: ResultadoEvaluacionCompuerta
  eval_logistica: ResultadoEvaluacionCompuerta
  estado: { codigo: string; color: string }
  fecha_envio: string
}

/** Ítem de `GET /convocatorias/{id}/cuadro-comparativo`. */
export interface CuadroComparativoItem {
  oferta_id: number
  proveedor: ProveedorRef
  total_general: string
  eval_tecnica: ResultadoEvaluacionCompuerta
  eval_logistica: ResultadoEvaluacionCompuerta
  estado: string
  es_recomendada: boolean
}

export interface CuadroComparativoRespuesta {
  items: CuadroComparativoItem[]
  puede_adjudicar: boolean
  recomendada_oferta_id: number | null
}

export interface ArchivoEvaluacion {
  archivo_id: number
  contexto: 'OFERTA_DJ' | 'OFERTA_SUSTENTO'
  nombre: string
  hash_sha256: string | null
  descarga_url: string
}

/** `GET /ofertas/{id}/evaluacion` (`EvaluacionController::evaluacionDetalle`, F2). */
export interface OfertaEvaluacionDetalle {
  oferta_id: number
  proveedor: ProveedorRef
  items: {
    numero: number
    descripcion: string
    unidad_medida: { codigo: string; nombre: string }
    cantidad: number
    presentacion: string | null
    marca_modelo: string
    precio_unitario: string
    precio_total: string
  }[]
  archivos: ArchivoEvaluacion[]
  validez_dias: number
  plazo_ejecucion: { segun_tdr: boolean; dias: number | null }
  forma_pago: { segun_tdr: boolean; dias: number | null }
  plazo_garantia: string
  contacto: { nombre: string; telefono: string; correo: string }
  eval_tecnica: ResultadoEvaluacionCompuerta
  eval_tecnica_motivo: string | null
  eval_logistica: ResultadoEvaluacionCompuerta
  eval_logistica_motivo: string | null
}

/** Cuerpo de `POST /ofertas/{id}/evaluar` (`EvaluarOfertaRequest`). */
export interface EvaluarOfertaInput {
  eval_tecnica?: 'APROBADO' | 'DESAPROBADO'
  eval_tecnica_motivo?: string | null
  eval_logistica?: 'APROBADO' | 'DESAPROBADO'
  eval_logistica_motivo?: string | null
}

/** `POST /convocatorias/{id}/adjudicar` respuesta (`AdjudicacionService::adjudicar`). */
export interface AdjudicarRespuesta {
  convocatoria_id: number
  oferta_adjudicada_id: number
  estado: string
}

export interface ResultadoOferta {
  oferta_id: number
  proveedor: ProveedorRef
  eval_tecnica: ResultadoEvaluacionCompuerta
  eval_tecnica_motivo: string | null
  eval_logistica: ResultadoEvaluacionCompuerta
  eval_logistica_motivo: string | null
  resultado: string
  monto: string
}

/** `GET /convocatorias/{id}/resultados` (`AdjudicacionController::resultados`). */
export interface ResultadosConvocatoria {
  convocatoria_id: number
  numero: string | null
  /** N.° del documento "Indagación de Mercado", correlativo por entidad
   * (05C hardening, pedido explícitamente por el usuario). */
  numero_indagacion: string | null
  nombre_servicio: string
  estado: { codigo: string; nombre: string }
  oferta_adjudicada_id: number | null
  motivo_cierre: string | null
  fecha_resultado: string | null
  ofertas: ResultadoOferta[]
}

/** Ítem de `GET /presentacion-ofertas` (`PresentacionOfertasController::index`,
 * M06 del TDR, 05C hardening — todas las ofertas recibidas por la entidad,
 * sin filtrar por estado de convocatoria). */
export interface PresentacionOfertaItem {
  oferta_id: number
  constancia_codigo: string
  convocatoria: { convocatoria_id: number; numero: string | null; nombre_servicio: string }
  proveedor: ProveedorRef
  total_general: string
  estado: { codigo: string; nombre: string; color: string }
  fecha_envio: string
}
