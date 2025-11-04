import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const Home = () => import('../pages/Home.vue')
const Machines = () => import('../pages/Machines.vue')
const Booking = () => import('../pages/Booking.vue')
const MyReservations = () => import('../pages/MyReservations.vue')
const Login = () => import('../pages/Login.vue')
const Admin = () => import('../pages/Admin.vue')

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/', name: 'home', component: Home },
		{ path: '/login', name: 'login', component: Login, meta: { fullscreen: true } },
		{ path: '/machines', name: 'machines', component: Machines },
		{ path: '/machines/:id', name: 'machine-detail', component: () => import('../pages/MachineDetail.vue'), props: true },
		{ path: '/booking/:machineId', name: 'booking', component: Booking, props: true, meta: { requiresAuth: true } },
		{ path: '/my', name: 'my', component: MyReservations, meta: { requiresAuth: true } },
		{ path: '/admin', name: 'admin', component: Admin, meta: { requiresAuth: true, requiresAdmin: true } }
	]
})

router.beforeEach((to) => {
	const auth = useAuthStore()
	if (to.meta.requiresAuth && !auth.isAuthed) {
		return { name: 'login', query: { redirect: to.fullPath } }
	}
	if (to.meta.requiresAdmin && !auth.isAdmin) {
		return { name: 'home' }
	}
})

export default router
