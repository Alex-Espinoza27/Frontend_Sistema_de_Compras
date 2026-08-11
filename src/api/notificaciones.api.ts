import cliente from './cliente'
import type { NotificacionItem } from '@/modules/transversales/transversales.types'

export const notificacionesApi = {
  contador: () => cliente.get<never, { no_leidas: number }>('/notificaciones/contador'),

  index: () => cliente.get<never, { items: NotificacionItem[] }>('/notificaciones'),

  leer: (id: number) => cliente.post<never, { no_leidas: number }>(`/notificaciones/${id}/leer`),

  leerTodas: () => cliente.post<never, { no_leidas: number }>('/notificaciones/leer-todas'),
}
