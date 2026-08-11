/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NOMBRE: string
  readonly VITE_CAPTCHA_DRIVER: 'interno' | 'recaptcha'
  readonly VITE_RECAPTCHA_SITE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
