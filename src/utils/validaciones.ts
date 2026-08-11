// Reglas para v-form/:rules de Vuetify (05C hardening). Cada regla devuelve
// `true` o un mensaje de error; el backend sigue siendo la fuente de verdad
// (422), esto solo evita peticiones en vano por campos vacíos o fuera de rango.
type Regla = (valor: unknown) => true | string

export function requerido(mensaje = 'Este campo es obligatorio.'): Regla {
  return (valor) => {
    if (valor === null || valor === undefined) return mensaje
    if (typeof valor === 'string' && valor.trim() === '') return mensaje
    if (Array.isArray(valor) && valor.length === 0) return mensaje
    return true
  }
}

export function email(mensaje = 'Ingrese un correo válido.'): Regla {
  const patron = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return (valor) => !valor || patron.test(String(valor)) || mensaje
}

export function min(limite: number, mensaje?: string): Regla {
  return (valor) =>
    valor === null || valor === undefined || valor === ''
      ? true
      : Number(valor) >= limite || (mensaje ?? `El valor mínimo es ${limite}.`)
}

export function max(limite: number, mensaje?: string): Regla {
  return (valor) =>
    valor === null || valor === undefined || valor === ''
      ? true
      : Number(valor) <= limite || (mensaje ?? `El valor máximo es ${limite}.`)
}
