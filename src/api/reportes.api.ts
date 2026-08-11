import cliente from './cliente'
import type { ReporteBuscarInput, ReporteFila } from '@/modules/transversales/transversales.types'
import type { Paginado } from '@/types/api'

function construirQuery(input: Omit<ReporteBuscarInput, 'pagina' | 'por_pagina' | 'ordenar_por' | 'direccion'>): string {
  const params = new URLSearchParams()
  Object.entries(input).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') params.set(clave, String(valor))
  })
  return params.toString()
}

export const reportesApi = {
  buscar: (body: ReporteBuscarInput) => cliente.post<never, Paginado<ReporteFila>>('/reportes/buscar', body),

  exportarXlsxUrl: (filtros: ReporteBuscarInput) => `/reportes/exportar.xlsx?${construirQuery(filtros)}`,

  exportarPdfUrl: (filtros: ReporteBuscarInput) => `/reportes/exportar.pdf?${construirQuery(filtros)}`,
}
