import type { Estado } from '@/types/api'

export type EstadoEntidadCodigo = 'SOLICITADA' | 'APROBADA' | 'OBSERVADA' | 'RECHAZADA' | 'SUSPENDIDA'

/** Ítem de `GET /entidades` (`EntidadController::index`, H1). */
export interface EntidadListaItem {
  entidad_id: number
  numero_documento: string
  razon_social: string
  sigla: string
  estado: Estado
  fecha_solicitud: string
  convocatorias_total: number
}

export interface UsuarioEntidad {
  id: number
  nombre: string
  correo: string
}

export interface HistoricoEntidadItem {
  accion: string
  usuario: string | null
  detalle: unknown
  fecha: string
}

/** `GET /entidades/{id}` (`EntidadController::show`, H2). */
export interface EntidadDetalle {
  entidad_id: number
  numero_documento: string
  razon_social: string
  sigla: string
  correo: string
  telefono: string
  direccion: string
  persona_contacto: string
  estado: Estado
  motivo_observacion: string | null
  fecha_solicitud: string
  fecha_resolucion: string | null
  resuelta_por: { id: number; nombre: string } | null
  usuarios: UsuarioEntidad[]
  historico: HistoricoEntidadItem[]
}

export interface UsuarioInicialInput {
  nombre: string
  correo: string
}

/** `POST /entidades` (`AltaDirectaEntidadRequest`). */
export interface AltaDirectaInput {
  numero_documento: string
  razon_social: string
  sigla: string
  correo: string
  telefono: string
  direccion: string
  persona_contacto: string
  usuario_inicial: UsuarioInicialInput
}

export interface AprobarEntidadInput {
  usuario_inicial?: UsuarioInicialInput
}

export interface UsuarioEntidadInput {
  nombre: string
  correo: string
}

export type EstadoProveedorCodigo = 'ACTIVO' | 'SUSPENDIDO'

/** Ítem de `GET /admin/proveedores` (I2, y combo del filtro proveedor_id de Reportes J2). */
export interface ProveedorAdminItem {
  proveedor_id: number
  numero_documento: string
  razon_social: string
  correo: string
  estado: Estado
}

export type TipoDocumentoProveedor = 'RUC' | 'DNI' | 'CE'
export type TipoPersona = 'JURIDICA' | 'NATURAL'

/** `GET /admin/proveedores/{id}` (05C hardening — mantenimiento de proveedores). */
export interface ProveedorAdminDetalle {
  proveedor_id: number
  numero_documento: string
  tipo_documento: TipoDocumentoProveedor
  razon_social: string
  tipo_persona: TipoPersona
  correo: string
  telefono: string
  persona_contacto: string
  estado: { codigo: string; nombre: string; color: string }
  origen_dato: string
  rubros_servicios: { rubro_id: number; nombre: string }[]
  rubros_bienes: { rubro_id: number; nombre: string }[]
}

/** Cuerpo de `POST`/`PUT /admin/proveedores` (`AdminProveedorStoreRequest`/`UpdateRequest`). */
export interface ProveedorAdminInput {
  numero_documento: string
  tipo_documento: TipoDocumentoProveedor
  razon_social: string
  tipo_persona: TipoPersona
  correo: string
  telefono: string
  persona_contacto: string
  rubros_servicios: number[]
  rubros_bienes: number[]
}

// --- I1 · Usuarios (05C hardening: unificado internos + Entidad) --------------------

/** Ítem de `GET /admin/usuarios-plataforma` (`GestionUsuariosController::index`).
 * `rol` es cualquier rol excepto PROVEEDOR (ese login se gestiona en
 * Mantenimiento de Proveedores) — incluye ADMINISTRADOR/AUDITOR/ENTIDAD y
 * cualquier rol custom creado desde Roles y Permisos. */
export interface UsuarioPlataformaItem {
  id: number
  nombre: string
  correo: string
  dni: string | null
  nombres: string | null
  apellido_paterno: string | null
  apellido_materno: string | null
  sexo: string | null
  rol: string
  entidad: { entidad_id: number; razon_social: string } | null
}

/** Cuerpo de `POST`/`PUT /admin/usuarios-plataforma` (`UsuarioPlataformaStoreRequest`/`UpdateRequest`).
 * `entidad_id` solo aplica (y es obligatorio) si `rol === 'ENTIDAD'`. */
export interface UsuarioPlataformaInput {
  dni: string
  nombres: string
  apellido_paterno: string
  apellido_materno: string
  correo: string
  sexo: string
  rol: string
  entidad_id: number | null
}

// --- I3 · Roles y permisos ---------------------------------------------------------

export interface RolConPermisos {
  rol: string
  permisos: string[]
  /** 05C hardening (pedido explícitamente por el usuario) — para la tabla de roles. */
  permisos_count: number
  usuarios_count: number
  es_reservado: boolean
  /** Desactivar en vez de eliminar (05C hardening, pedido explícitamente por
   * el usuario): un rol inactivo deja de ofrecerse para asignaciones nuevas,
   * sin afectar a quienes ya lo tienen. */
  activo: boolean
}

export interface PermisoItem {
  permiso: string
  modulo: string
  /** Nombre amigable del módulo (05C hardening), ej. "Proveedores" en vez de "GESTION_PROVEEDORES". */
  modulo_nombre: string
}

// --- I4 · Configuración y UIT --------------------------------------------------------

export interface ConfiguracionItem {
  clave: string
  valor: string
  tipo: string
  descripcion: string | null
}

export interface UitItem {
  uit_id: number
  anio: number
  valor: string
  vigente: boolean
}

export interface UitInput {
  anio?: number
  valor?: number
  vigente?: boolean
}

// --- I5 · Catálogos ---------------------------------------------------------------

export type TipoRubro = 'BIEN' | 'SERVICIO'

export interface RubroAdmin {
  rubro_id: number
  tipo: TipoRubro
  codigo: string
  nombre: string
  /** Desactivar en vez de eliminar (05C hardening, pedido explícitamente por
   * el usuario) — un rubro inactivo deja de ofrecerse en requerimientos/registro nuevos. */
  activo: boolean
}
export interface RubroInput {
  tipo: TipoRubro
  codigo: string
  nombre: string
  activo: boolean
}

export interface UnidadMedidaAdmin {
  unidad_medida_id: number
  codigo: string
  nombre: string
  activo: boolean
}
export interface UnidadMedidaInput {
  codigo: string
  nombre: string
  activo: boolean
}

export interface TipoComprobanteAdmin {
  tipo_comprobante_id: number
  codigo: string
  nombre: string
  incluye_igv: boolean
  activo: boolean
}
export interface TipoComprobanteInput {
  codigo: string
  nombre: string
  incluye_igv: boolean
  activo: boolean
}

export type ContextoEstado = 'CONVOCATORIA' | 'OFERTA' | 'ENTIDAD' | 'PROVEEDOR'

export interface EstadoAdmin {
  estado_id: number
  contexto: ContextoEstado
  codigo: string
  nombre: string
  color: string
  orden: number
  activo: boolean
}
export interface EstadoInput {
  contexto: ContextoEstado
  codigo: string
  nombre: string
  color: string
  orden: number
  activo: boolean
}
