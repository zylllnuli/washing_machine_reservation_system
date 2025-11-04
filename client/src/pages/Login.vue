<template>
	<section class="card">
		<h2>登录</h2>
		<label>
			<span>用户名</span>
			<input v-model="username" placeholder="admin 或 student" />
		</label>
		<label>
			<span>密码</span>
			<input v-model="password" type="password" placeholder="请输入密码" />
		</label>
		<button class="primary" :disabled="!username || !password || loading" @click="doLogin">{{ loading ? '登录中...' : '登录' }}</button>
		<p v-if="error" class="err">{{ error }}</p>
		<div class="hint">
			<p>示例账号：</p>
			<ul>
				<li>管理员：admin / admin123</li>
				<li>学生：student / 123456</li>
			</ul>
		</div>
	</section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function doLogin() {
	loading.value = true
	error.value = ''
	try {
		const resp = await api.login({ username: username.value, password: password.value })
		auth.setSession(resp.token, resp.user)
		const redirect = (route.query.redirect as string) || '/'
		router.replace(redirect)
	} catch (e: any) {
		error.value = e?.message || '登录失败'
	} finally {
		loading.value = false
	}
}
</script>

<style scoped>
.card { background: #fff; padding: 16px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); max-width: 400px; }
label { display: block; margin: 12px 0; }
span { display: block; margin-bottom: 6px; color: #555; }
input { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; }
.primary { margin-top: 12px; background: #2563eb; color: #fff; border: 0; padding: 8px 12px; border-radius: 8px; cursor: pointer; }
.err { color: #ef4444; margin-top: 8px; }
.hint { margin-top: 12px; font-size: 14px; color: #444; background: #f6f8ff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
.hint ul { margin: 6px 0 0 18px; padding: 0; }
</style>
