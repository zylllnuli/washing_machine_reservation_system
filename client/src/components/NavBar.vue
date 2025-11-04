<template>
	<header class="nav">
		<div class="brand">校园洗衣预约</div>
		<nav class="links">
			<router-link to="/">首页</router-link>
			<router-link to="/machines">洗衣机列表</router-link>
			<router-link to="/my">我的预约</router-link>
			<router-link v-if="auth.isAdmin" to="/admin">管理端</router-link>
			<span v-if="auth.isAuthed" class="user">{{ auth.user?.name }}（{{ auth.user?.building }}）</span>
			<router-link v-else to="/login">登录</router-link>
			<button v-if="auth.isAuthed" @click="auth.logout()" class="logout">退出</button>
		</nav>
	</header>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
</script>

<style scoped>
.nav {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: #2563eb;
	color: white;
}
.links { display: flex; align-items: center; gap: 12px; }
.links a { color: white; text-decoration: none; padding: 6px 10px; border-radius: 6px; }
.links a.router-link-active { background: rgba(255,255,255,0.2); }
.brand { font-weight: 700; }
.user { opacity: 0.9; }
.logout { background: rgba(255,255,255,0.2); color: #fff; border: 0; padding: 6px 10px; border-radius: 6px; cursor: pointer; }
</style>
