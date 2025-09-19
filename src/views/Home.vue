<template>
	<div class="home-container">
		<router-view />
	</div>
</template>

<script setup lang="ts">
// Home视图作为布局容器，实际内容由子路由渲染
</script>

<style scoped>
.home-container {
	width: 100%;
	height: 100%;
}
</style>