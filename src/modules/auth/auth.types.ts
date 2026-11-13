import type { MenuItem } from '@/types/api'

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol: 'ADMINISTRADOR' | 'AUDITOR' | 'ENTIDAD' | 'PROVEEDOR'
}

export interface PerfilEntidad {
  tipo: 'ENTIDAD'
  entidad: {
    entidad_id: number
    razon_social: string
    sigla: string
    estado: string
  }
}

export interface PerfilProveedor {
  tipo: 'PROVEEDOR'
  proveedor: {
    proveedor_id: number
    razon_social: string
    estado: string
  }
}

export interface PerfilInterno {
  tipo: 'INTERNO'
}

export type Perfil = PerfilInterno | PerfilEntidad | PerfilProveedor

/** Forma de `data` en `GET /auth/me` y `POST /auth/login` (`AuthController::construirMe`). */
export interface SesionMe {
  usuario: Usuario
  permisos: string[]
  menu: MenuItem[]
  perfil: Perfil
}

export interface LoginInput {
  email: string
  password: string
}

export interface CambiarPasswordInput {
  password_actual: string
  password: string
  password_confirmation: string
}

export type TipoDocumentoCodigo = 'RUC' | 'DNI' | 'CE'
export type TipoPersona = 'JURIDICA' | 'NATURAL'
export type OrigenDatos = 'SUNAT' | 'MANUAL'

export interface ConsultarRucInput {
  numero_documento: string
  captcha: string
}

/** `POST /auth/registro/consultar-ruc` (`AuthController::consultarRuc`, degrada a MANUAL — SUNAT nunca bloquea el registro). */
export interface ConsultarRucRespuesta {
  numero_documento: string
  razon_social: string
  tipo_persona: TipoPersona
  estado_sunat: string | null
  origen: OrigenDatos
}

export interface RegistroProveedorInput {
  numero_documento: string
  tipo_documento: TipoDocumentoCodigo
  razon_social: string
  tipo_persona: TipoPersona
  correo: string
  telefono: string
  persona_contacto: string
  rubros_servicios: number[]
  rubros_bienes: number[]
  password: string
  password_confirmation: string
  captcha: string
  origen: OrigenDatos
}

export interface RecuperarPasswordInput {
  email: string
  captcha: string
}

export interface RestablecerPasswordInput {
  token: string
  email: string
  password: string
  password_confirmation: string
}
