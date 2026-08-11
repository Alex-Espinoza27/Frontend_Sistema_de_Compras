import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { requierePermiso, requiereSesion, soloInvitado } from './guards'
import { useAuthStore } from '@/stores/auth.store'

// Rutas hermanas de la zona "Auth" (05A §6): comparten LayoutAuth y el guard
// solo-invitado, pero no van anidadas bajo un prefijo común en la URL.
function rutaAuth<T>(path: string, name: string, componente: () => Promise<T>): RouteRecordRaw {
  return {
    path,
    component: () => import('@/layouts/LayoutAuth.vue'),
    meta: { soloInvitado: true },
    children: [{ path: '', name, component: componente }],
  }
}

// Tres zonas con layout propio (05A §6).
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/LayoutPublico.vue'),
      children: [
        {
          path: '',
          name: 'inicio',
          component: () => import('@/modules/publico/views/PortadaView.vue'),
        },
        {
          path: 'entidad/:id',
          name: 'entidad-convocatorias',
          component: () => import('@/modules/publico/views/ConvocatoriasEntidadView.vue'),
        },
        {
          path: 'convocatoria/:id',
          name: 'convocatoria-detalle',
          component: () => import('@/modules/publico/views/ConvocatoriaDetalleView.vue'),
        },
        {
          path: 'datos-abiertos',
          name: 'datos-abiertos',
          component: () => import('@/modules/publico/views/DatosAbiertosView.vue'),
        },
        {
          path: 'solicitud-entidad',
          name: 'solicitud-entidad',
          component: () => import('@/modules/publico/views/SolicitudEntidadView.vue'),
        },
      ],
    },
    rutaAuth('/login', 'login', () => import('@/modules/auth/views/LoginView.vue')),
    rutaAuth('/registro', 'registro', () => import('@/modules/auth/views/RegistroView.vue')),
    rutaAuth('/recuperar-password', 'recuperar-password', () =>
      import('@/modules/auth/views/RecuperarPasswordView.vue'),
    ),
    rutaAuth('/restablecer-password', 'restablecer-password', () =>
      import('@/modules/auth/views/RestablecerPasswordView.vue'),
    ),
    {
      path: '/app',
      component: () => import('@/layouts/LayoutApp.vue'),
      meta: { requiereSesion: true },
      children: [
        {
          // Destino real por rol (05A §4): proveedor → D1, resto → Dashboard J1.
          path: '',
          name: 'app-inicio',
          redirect: () => {
            const auth = useAuthStore()
            return auth.usuario?.rol === 'PROVEEDOR' ? '/app/convocatorias-abiertas' : '/app/dashboard'
          },
        },
        {
          path: '403',
          name: 'app-403',
          component: () => import('@/components/base/PaginaSinPermiso.vue'),
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          meta: { permiso: 'dashboard.ver' },
          component: () => import('@/modules/transversales/views/DashboardView.vue'),
        },
        {
          path: 'reportes',
          name: 'reportes',
          meta: { permiso: 'reportes.ver' },
          component: () => import('@/modules/transversales/views/ReportesView.vue'),
        },
        {
          path: 'auditoria',
          name: 'auditoria',
          meta: { permiso: 'auditoria.ver' },
          component: () => import('@/modules/transversales/views/AuditoriaView.vue'),
        },
        {
          path: 'convocatorias-abiertas',
          name: 'convocatorias-abiertas',
          meta: { permiso: 'ofertas.crear', rol: 'PROVEEDOR' },
          component: () => import('@/modules/proveedor/views/ConvocatoriasAbiertasView.vue'),
        },
        {
          path: 'postular/:convocatoriaId',
          name: 'postular',
          meta: { permiso: 'ofertas.crear', rol: 'PROVEEDOR' },
          component: () => import('@/modules/proveedor/views/PostularView.vue'),
        },
        {
          path: 'mis-postulaciones',
          name: 'mis-postulaciones',
          meta: { permiso: 'ofertas.ver', rol: 'PROVEEDOR' },
          component: () => import('@/modules/proveedor/views/MisPostulacionesView.vue'),
        },
        {
          path: 'mis-postulaciones/:id',
          name: 'mis-postulaciones-detalle',
          meta: { permiso: 'ofertas.ver', rol: 'PROVEEDOR' },
          component: () => import('@/modules/proveedor/views/DetallePostulacionView.vue'),
        },
        {
          path: 'mis-datos',
          name: 'mis-datos',
          meta: { permiso: 'proveedores.ver_propio', rol: 'PROVEEDOR' },
          component: () => import('@/modules/proveedor/views/MisDatosView.vue'),
        },
        {
          path: 'areas',
          name: 'areas',
          meta: { permiso: 'areas.ver' },
          component: () => import('@/modules/entidad/views/AreasView.vue'),
        },
        {
          path: 'requerimientos',
          name: 'requerimientos',
          meta: { permiso: 'requerimientos.ver' },
          component: () => import('@/modules/entidad/views/RequerimientosView.vue'),
        },
        {
          path: 'requerimientos/nuevo',
          name: 'requerimientos-nuevo',
          meta: { permiso: 'requerimientos.crear' },
          component: () => import('@/modules/entidad/views/RequerimientoFormView.vue'),
        },
        {
          path: 'requerimientos/:id(\\d+)',
          name: 'requerimientos-editar',
          meta: { permiso: 'requerimientos.editar' },
          component: () => import('@/modules/entidad/views/RequerimientoFormView.vue'),
        },
        {
          path: 'convocatorias',
          name: 'convocatorias',
          meta: { permiso: 'convocatorias.ver' },
          component: () => import('@/modules/entidad/views/ConvocatoriasView.vue'),
        },
        {
          path: 'convocatorias/nueva',
          name: 'convocatorias-nueva',
          meta: { permiso: 'convocatorias.crear' },
          component: () => import('@/modules/entidad/views/ConvocatoriaFormView.vue'),
        },
        {
          path: 'convocatorias/:id(\\d+)',
          name: 'convocatorias-editar',
          meta: { permiso: 'convocatorias.ver' },
          component: () => import('@/modules/entidad/views/ConvocatoriaFormView.vue'),
        },
        {
          path: 'presentacion-ofertas',
          name: 'presentacion-ofertas',
          meta: { permiso: 'presentacion_ofertas.ver' },
          component: () => import('@/modules/entidad/views/PresentacionOfertasView.vue'),
        },
        {
          path: 'presentacion-ofertas/:id(\\d+)',
          name: 'presentacion-ofertas-detalle',
          meta: { permiso: 'presentacion_ofertas.ver' },
          component: () => import('@/modules/entidad/views/PresentacionOfertaDetalleView.vue'),
        },
        {
          path: 'evaluacion',
          name: 'evaluacion',
          meta: { permiso: 'evaluacion.ver' },
          component: () => import('@/modules/entidad/views/EvaluacionListadoView.vue'),
        },
        {
          path: 'adjudicacion',
          name: 'adjudicacion',
          meta: { permiso: 'adjudicacion.ver' },
          component: () => import('@/modules/entidad/views/AdjudicacionListadoView.vue'),
        },
        {
          path: 'convocatorias/:id(\\d+)/evaluacion',
          name: 'convocatorias-evaluacion',
          meta: { permiso: 'evaluacion.ver' },
          component: () => import('@/modules/entidad/views/EvaluacionView.vue'),
        },
        {
          path: 'convocatorias/:id(\\d+)/adjudicacion',
          name: 'convocatorias-adjudicacion',
          meta: { permiso: 'adjudicacion.adjudicar' },
          component: () => import('@/modules/entidad/views/AdjudicacionView.vue'),
        },
        {
          path: 'convocatorias/:id(\\d+)/resultados',
          name: 'convocatorias-resultados',
          meta: { permiso: 'adjudicacion.ver' },
          component: () => import('@/modules/entidad/views/ResultadosView.vue'),
        },
        {
          path: 'proveedores',
          name: 'proveedores',
          meta: { permiso: 'gestion_proveedores.ver' },
          component: () => import('@/modules/muni/views/ProveedoresView.vue'),
        },
        {
          path: 'roles-permisos',
          name: 'roles-permisos',
          meta: { permiso: 'roles_permisos.ver' },
          component: () => import('@/modules/muni/views/RolesPermisosView.vue'),
        },
        {
          path: 'usuarios',
          name: 'usuarios',
          meta: { permiso: 'gestion_usuarios.ver' },
          component: () => import('@/modules/muni/views/UsuariosView.vue'),
        },
        {
          path: 'entidades',
          name: 'entidades',
          meta: { permiso: 'entidades.ver' },
          component: () => import('@/modules/muni/views/EntidadesView.vue'),
        },
        {
          path: 'entidades/nueva',
          name: 'entidades-nueva',
          meta: { permiso: 'entidades.gestionar' },
          component: () => import('@/modules/muni/views/EntidadAltaDirectaView.vue'),
        },
        {
          path: 'entidades/:id(\\d+)',
          name: 'entidades-detalle',
          meta: { permiso: 'entidades.ver' },
          component: () => import('@/modules/muni/views/EntidadDetalleView.vue'),
        },
        {
          path: 'administracion',
          name: 'administracion',
          // 05C hardening: la ruta quedó exigiendo `administracion.usuarios`
          // (permiso retirado del catálogo al separar el módulo Usuarios) —
          // ahora exige cualquiera de los 2 permisos que de verdad usan las
          // pestañas que quedan (Catálogos/Configuración); bug real, nadie
          // podía entrar a "Configuración" aunque tuviera esos permisos.
          meta: { permiso: 'administracion.catalogos|administracion.configuracion' },
          component: () => import('@/modules/muni/views/AdministracionView.vue'),
        },
        {
          // Cualquier módulo del sidebar sin pantalla propia todavía.
          path: ':pathMatch(.*)*',
          name: 'app-en-construccion',
          component: () => import('@/components/base/BaseEnConstruccion.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.soloInvitado) {
    const destino = soloInvitado()
    if (destino) return destino
    return
  }
  if (to.meta.requiereSesion) {
    const destino = requiereSesion(to)
    if (destino) return destino
  }
  return requierePermiso(to)
})

export default router
