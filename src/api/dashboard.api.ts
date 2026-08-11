import cliente from './cliente'
import type { DashboardDatos, DashboardParams } from '@/modules/transversales/transversales.types'

export const dashboardApi = {
  obtener: (params: DashboardParams) => cliente.get<never, DashboardDatos>('/dashboard', { params }),
}
