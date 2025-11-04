<template>
	<section>
		<h1>欢迎使用校园洗衣预约系统</h1>
		<p>选择洗衣机、查看空闲时段、快速预约。</p>
		<router-link class="btn" to="/machines">开始预约</router-link>
	</section>
</template>

<script setup lang="ts"></script>

<style scoped>
.btn {
	display: inline-block;
	margin-top: 12px;
	background: #2563eb;
	color: #fff;
	padding: 10px 16px;
	border-radius: 8px;
	text-decoration: none;
}
</style>
