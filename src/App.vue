<template>
	<a-config-provider :locale="zhCN">
		<div id="app">
			<router-view />
		</div>
	</a-config-provider>
</template>

<script setup lang="ts">
import zhCN from '@arco-design/web-vue/es/locale/lang/zh-cn'
</script>

<style>
/* 应用全局样式 */
#app {
	width: 100%;
	height: 100vh;
	overflow: hidden;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
	width: 8px;
	height: 8px;
}

::-webkit-scrollbar-track {
	background: #f1f1f1;
	border-radius: 4px;
}

::-webkit-scrollbar-thumb {
	background: #c1c1c1;
	border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
	background: #a8a8a8;
}

/* Arco Design 主题定制 */
body {
	--color-primary-6: #667eea;
	--color-primary-5: #7c8ff0;
	--color-primary-7: #5469e0;
}
</style>