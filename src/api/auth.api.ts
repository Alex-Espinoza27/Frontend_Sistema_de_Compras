import cliente from './cliente'
import type {
  CambiarPasswordInput,
  ConsultarRucInput,
  ConsultarRucRespuesta,
  LoginInput,
  RecuperarPasswordInput,
  RecuperarPasswordRespuesta,
  RegistroProveedorInput,
  RestablecerPasswordInput,
  SesionMe,
  ValidarEnlaceRespuesta,
} from '@/modules/auth/auth.types'

export const authApi = {
  me: () => cliente.get<never, SesionMe>('/auth/me'),
  login: (body: LoginInput) => cliente.post<never, SesionMe>('/auth/login', body),
  logout: () => cliente.post<never, null>('/auth/logout'),
  cambiarPassword: (body: CambiarPasswordInput) => cliente.post<never, null>('/auth/cambiar-password', body),
  consultarRuc: (body: ConsultarRucInput) =>
    cliente.post<never, ConsultarRucRespuesta>('/auth/registro/consultar-ruc', body),
  registro: (body: RegistroProveedorInput) => cliente.post<never, SesionMe>('/auth/registro', body),
  recuperarPassword: (body: RecuperarPasswordInput) =>
    cliente.post<never, RecuperarPasswordRespuesta>('/auth/recuperar-password', body),
  validarEnlaceRestablecer: (token: string, email: string) =>
    cliente.get<never, ValidarEnlaceRespuesta>('/auth/restablecer-password/validar', { params: { token, email } }),
  restablecerPassword: (body: RestablecerPasswordInput) =>
    cliente.post<never, null>('/auth/restablecer-password', body),
}
