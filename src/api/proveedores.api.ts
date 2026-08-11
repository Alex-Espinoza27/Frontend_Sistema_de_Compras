import cliente from './cliente'
import type {
  ActualizarMisDatosInput,
  ActualizarMisRubrosInput,
  MisDatosProveedor,
  SuspenderProveedorInput,
} from '@/modules/proveedor/proveedor.types'

export const proveedoresApi = {
  misDatos: () => cliente.get<never, MisDatosProveedor>('/proveedores/mis-datos'),

  actualizarMisDatos: (body: ActualizarMisDatosInput) =>
    cliente.put<never, MisDatosProveedor>('/proveedores/mis-datos', body),

  actualizarMisRubros: (body: ActualizarMisRubrosInput) =>
    cliente.put<never, MisDatosProveedor>('/proveedores/mis-rubros', body),

  suspender: (body: SuspenderProveedorInput) => cliente.post<never, null>('/proveedores/suspender', body),
}
