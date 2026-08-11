import type { App, Directive } from 'vue'

import { useAuthStore } from '@/stores/auth.store'

/** `v-can="'convocatorias.publicar'"` — oculta el elemento si el usuario no tiene el permiso (05A §5). */
const vCan: Directive<HTMLElement, string> = {
  mounted: aplicar,
  updated: aplicar,
}

function aplicar(el: HTMLElement, binding: { value: string }) {
  const auth = useAuthStore()
  el.style.display = auth.puede(binding.value) ? '' : 'none'
}

export function instalarVCan(app: App) {
  app.directive('can', vCan)
}
