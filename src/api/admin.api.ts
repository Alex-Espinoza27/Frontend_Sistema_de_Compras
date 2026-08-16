import cliente from './cliente'
import type {
  ConfiguracionItem,
  EstadoAdmin,
  EstadoInput,
  PermisoItem,
  ProveedorAdminDetalle,
  ProveedorAdminInput,
  ProveedorAdminItem,
  RolConPermisos,
  RubroAdmin,
  RubroInput,
  TipoComprobanteAdmin,
  TipoComprobanteInput,
  UitInput,
  UitItem,
  UnidadMedidaAdmin,
  UnidadMedidaInput,
  UsuarioPlataformaInput,
  UsuarioPlataformaItem,
} from '@/modules/muni/muni.types'
import type { ListadoParams, Paginado } from '@/types/api'

export const adminApi = {
  // I1 — Usuarios (05C hardening: unificado internos + Entidad, módulo propio)
  usuarios: (params: ListadoParams) =>
    cliente.get<never, Paginado<UsuarioPlataformaItem>>('/admin/usuarios-plataforma', { params }),
  crearUsuario: (body: UsuarioPlataformaInput) =>
    cliente.post<never, { id: number }>('/admin/usuarios-plataforma', body),
  actualizarUsuario: (id: number, body: UsuarioPlataformaInput) =>
    cliente.put<never, null>(`/admin/usuarios-plataforma/${id}`, body),
  eliminarUsuario: (id: number) => cliente.delete<never, null>(`/admin/usuarios-plataforma/${id}`),

  // I2 — Proveedores (05C hardening: mantenimiento completo, no solo reactivar)
  proveedores: (params: ListadoParams) =>
    cliente.get<never, Paginado<ProveedorAdminItem>>('/admin/proveedores', { params }),
  proveedorDetalle: (id: number) => cliente.get<never, ProveedorAdminDetalle>(`/admin/proveedores/${id}`),
  crearProveedor: (body: ProveedorAdminInput) =>
    cliente.post<never, { proveedor_id: number }>('/admin/proveedores', body),
  actualizarProveedor: (id: number, body: ProveedorAdminInput) =>
    cliente.put<never, null>(`/admin/proveedores/${id}`, body),
  reactivarProveedor: (id: number) => cliente.post<never, null>(`/admin/proveedores/${id}/reactivar`),
  suspenderProveedor: (id: number) => cliente.post<never, null>(`/admin/proveedores/${id}/suspender`),

  // I3 — Roles y permisos (05C hardening: crear/eliminar rol custom, módulo propio)
  roles: () => cliente.get<never, RolConPermisos[]>('/admin/roles'),
  permisos: () => cliente.get<never, PermisoItem[]>('/admin/permisos'),
  crearRol: (nombre: string, permisos: string[]) =>
    cliente.post<never, RolConPermisos>('/admin/roles', { nombre, permisos }),
  actualizarPermisosRol: (rol: string, permisos: string[]) =>
    cliente.put<never, RolConPermisos>(`/admin/roles/${rol}/permisos`, { permisos }),
  eliminarRol: (rol: string) => cliente.delete<never, null>(`/admin/roles/${rol}`),

  // I4 — Configuración y UIT
  configuracion: () => cliente.get<never, ConfiguracionItem[]>('/admin/configuracion'),
  actualizarConfiguracion: (configuraciones: { clave: string; valor: string }[]) =>
    cliente.put<never, null>('/admin/configuracion', { configuraciones }),
  probarCorreo: (destino: string) => cliente.post<never, null>('/admin/configuracion/probar-correo', { destino }),
  uit: () => cliente.get<never, UitItem[]>('/admin/uit'),
  crearUit: (body: { anio: number; valor: number; vigente?: boolean }) =>
    cliente.post<never, { uit_id: number }>('/admin/uit', body),
  actualizarUit: (id: number, body: UitInput) => cliente.put<never, null>(`/admin/uit/${id}`, body),

  // I5 — Catálogos
  rubros: () => cliente.get<never, RubroAdmin[]>('/admin/rubros'),
  crearRubro: (body: RubroInput) => cliente.post<never, { rubro_id: number }>('/admin/rubros', body),
  actualizarRubro: (id: number, body: RubroInput) => cliente.put<never, null>(`/admin/rubros/${id}`, body),
  eliminarRubro: (id: number) => cliente.delete<never, null>(`/admin/rubros/${id}`),

  unidadesMedida: () => cliente.get<never, UnidadMedidaAdmin[]>('/admin/unidades-medida'),
  crearUnidadMedida: (body: UnidadMedidaInput) =>
    cliente.post<never, { unidad_medida_id: number }>('/admin/unidades-medida', body),
  actualizarUnidadMedida: (id: number, body: UnidadMedidaInput) =>
    cliente.put<never, null>(`/admin/unidades-medida/${id}`, body),
  eliminarUnidadMedida: (id: number) => cliente.delete<never, null>(`/admin/unidades-medida/${id}`),

  tiposComprobante: () => cliente.get<never, TipoComprobanteAdmin[]>('/admin/tipos-comprobante'),
  crearTipoComprobante: (body: TipoComprobanteInput) =>
    cliente.post<never, { tipo_comprobante_id: number }>('/admin/tipos-comprobante', body),
  actualizarTipoComprobante: (id: number, body: TipoComprobanteInput) =>
    cliente.put<never, null>(`/admin/tipos-comprobante/${id}`, body),
  eliminarTipoComprobante: (id: number) => cliente.delete<never, null>(`/admin/tipos-comprobante/${id}`),

  estados: () => cliente.get<never, EstadoAdmin[]>('/admin/estados'),
  crearEstado: (body: EstadoInput) => cliente.post<never, { estado_id: number }>('/admin/estados', body),
  actualizarEstado: (id: number, body: EstadoInput) => cliente.put<never, null>(`/admin/estados/${id}`, body),
  eliminarEstado: (id: number) => cliente.delete<never, null>(`/admin/estados/${id}`),
}
