import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { instalarVCan } from './plugins/vCan'
import './plugins/dayjs'
import './styles/app.css'
import { useAuthStore } from './stores/auth.store'

async function bootstrap() {
  const app = createApp(App)

  app.use(createPinia())
  app.use(vuetify)
  instalarVCan(app)

  // La sesión debe resolverse antes de la primera navegación: si no, los
  // guards verían auth.autenticado = false para una sesión válida (05A §4).
  await useAuthStore().cargarSesion()

  app.use(router)
  app.mount('#app')
}

bootstrap()
