<template>
	<div class="app" :class="{ fullscreen: isFullscreen }">
		<NavBar v-if="!isFullscreen" />
		<main class="container" :class="{ center: isFullscreen }">
			<router-view />
		</main>
	</div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import NavBar from './components/NavBar.vue'

const route = useRoute()
const isFullscreen = computed(() => !!route.meta.fullscreen)
</script>

<style scoped>
.app {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background: #f7f8fa;
	color: #222;
}
.container {
	max-width: 960px;
	margin: 16px auto;
	padding: 0 16px;
}
.container.center {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
}
</style>
