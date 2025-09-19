<template>
	<div class="history-panel-container">
		<!-- 面板标题 -->
		<div class="panel-header">
			<div class="panel-title">
				<icon-history />
				<span>历史记录</span>
			</div>
		</div>
		
		<!-- 标签页 -->
		<div class="panel-tabs">
			<a-radio-group v-model="activeTab" type="button" size="small">
				<a-radio value="edit">编辑历史</a-radio>
				<a-radio value="rollback">回退点</a-radio>
				<a-radio value="stats">统计</a-radio>
			</a-radio-group>
		</div>
		
		<!-- 编辑历史标签页 -->
		<div v-if="activeTab === 'edit'" class="tab-content">
			<div v-if="messageId" class="edit-history">
				<div v-if="loadingHistory" class="loading-container">
					<a-spin />
				</div>
				
				<div v-else-if="editHistory.length > 0" class="history-list">
					<div
							v-for="(item, index) in editHistory"
							:key="index"
							class="history-item"
							:class="{ current: item.isCurrent }"
							@click="handleSelectVersion(item)"
					>
						<div class="version-header">
							<a-tag :color="item.isCurrent ? 'blue' : 'gray'" size="small">
								版本 #{{ item.versionIndex }}
							</a-tag>
							<span class="version-time">{{ formatTime(item.editTime) }}</span>
						</div>
						
						<div class="version-content">
							{{ truncateText(item.content, 100) }}
						</div>
						
						<div class="version-meta">
							<div v-if="item.editReason" class="edit-reason">
								<icon-edit /> {{ item.editReason }}
							</div>
							<div class="char-diff">
                <span v-if="item.charDifference > 0" style="color: var(--color-success-6)">
                  +{{ item.charDifference }}
                </span>
								<span v-else-if="item.charDifference < 0" style="color: var(--color-danger-6)">
                  {{ item.charDifference }}
                </span>
								<span v-else>无变化</span>
								字符
							</div>
						</div>
						
						<div v-if="!item.isCurrent" class="version-actions">
							<a-button size="mini" @click.stop="handleRestore(item.versionIndex)">
								恢复此版本
							</a-button>
							<a-button size="mini" type="text" @click.stop="handleCompare(item.versionIndex)">
								对比差异
							</a-button>
						</div>
					</div>
				</div>
				
				<a-empty v-else description="该消息暂无编辑历史" />
			</div>
			
			<div v-else class="no-selection">
				<a-empty description="选择一条消息查看编辑历史">
					<template #image>
						<icon-history style="font-size: 48px; color: var(--color-text-3)" />
					</template>
				</a-empty>
			</div>
		</div>
		
		<!-- 回退点标签页 -->
		<div v-if="activeTab === 'rollback'" class="tab-content">
			<div class="rollback-controls">
				<a-button size="small" @click="createCheckpoint" :loading="creatingCheckpoint">
					<template #icon><icon-camera /></template>
					创建检查点
				</a-button>
				<a-button size="small" @click="fetchRollbackPoints">
					<template #icon><icon-refresh /></template>
					刷新
				</a-button>
			</div>
			
			<div v-if="loadingRollback" class="loading-container">
				<a-spin />
			</div>
			
			<div v-else-if="rollbackPoints.length > 0" class="rollback-list">
				<a-timeline>
					<a-timeline-item
							v-for="point in rollbackPoints"
							:key="point.messageId"
							:dot-color="point.isCurrentHead ? 'blue' : 'gray'"
					>
						<div class="rollback-item" @click="handleRollbackTo(point.messageId)">
							<div class="rollback-header">
								<a-tag size="small" :color="getRoleColor(point.role)">
									{{ point.role === 'user' ? '用户' : 'AI' }}
								</a-tag>
								<span class="message-id">#{{ point.messageId }}</span>
								<span class="rollback-time">{{ formatTime(point.createTime) }}</span>
							</div>
							
							<div class="rollback-content">
								{{ point.contentPreview }}
							</div>
							
							<div class="rollback-meta">
								<span>深度: {{ point.depth }}</span>
								<a-tag v-if="point.isCurrentHead" size="small" color="blue">当前位置</a-tag>
							</div>
						</div>
					</a-timeline-item>
				</a-timeline>
			</div>
			
			<a-empty v-else description="暂无回退点" />
		</div>
		
		<!-- 统计标签页 -->
		<div v-if="activeTab === 'stats'" class="tab-content stats-content">
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-label">总消息数</div>
					<div class="stat-value">{{ sessionStats.totalMessages }}</div>
				</div>
				
				<div class="stat-card">
					<div class="stat-label">分支数量</div>
					<div class="stat-value">{{ sessionStats.branchCount }}</div>
				</div>
				
				<div class="stat-card">
					<div class="stat-label">编辑次数</div>
					<div class="stat-value">{{ sessionStats.editCount }}</div>
				</div>
				
				<div class="stat-card">
					<div class="stat-label">Token使用</div>
					<div class="stat-value">{{ formatNumber(sessionStats.totalTokens) }}</div>
				</div>
				
				<div class="stat-card">
					<div class="stat-label">平均消息长度</div>
					<div class="stat-value">{{ sessionStats.avgMessageLength }} 字符</div>
				</div>
				
				<div class="stat-card">
					<div class="stat-label">会话时长</div>
					<div class="stat-value">{{ sessionStats.duration }}</div>
				</div>
			</div>
			
			<!-- 快速操作 -->
			<div class="quick-actions">
				<a-divider>快速操作</a-divider>
				<a-space direction="vertical" fill>
					<a-button long @click="handleExport">
						<template #icon><icon-download /></template>
						导出对话
					</a-button>
					<a-button long @click="handleSearch">
						<template #icon><icon-search /></template>
						搜索消息
					</a-button>
					<a-button long @click="handleCleanup" status="danger">
						<template #icon><icon-delete /></template>
						清理已删除消息
					</a-button>
				</a-space>
			</div>
		</div>
		
		<!-- 差异对比模态框 -->
		<a-modal
				v-model:visible="compareVisible"
				title="版本差异对比"
				:width="800"
				:footer="false"
		>
			<div class="diff-container">
				<div class="diff-header">
					<div class="diff-version">
						<a-tag color="red">版本 {{ compareFrom }}</a-tag>
						<icon-arrow-right />
						<a-tag color="green">版本 {{ compareTo }}</a-tag>
					</div>
				</div>
				
				<div class="diff-content">
					<!-- 这里应该使用专门的diff库来显示差异 -->
					<div class="diff-before">
						<h4>原始内容</h4>
						<pre>{{ compareContent.before }}</pre>
					</div>
					<div class="diff-after">
						<h4>修改后</h4>
						<pre>{{ compareContent.after }}</pre>
					</div>
				</div>
			</div>
		</a-modal>
		
		<!-- 创建检查点模态框 -->
		<a-modal
				v-model:visible="checkpointVisible"
				title="创建检查点"
				@ok="confirmCheckpoint"
		>
			<a-form :model="checkpointForm" layout="vertical">
				<a-form-item label="检查点名称" required>
					<a-input
							v-model="checkpointForm.name"
							placeholder="给这个检查点起个名字"
					/>
				</a-form-item>
				<a-form-item label="备注">
					<a-textarea
							v-model="checkpointForm.description"
							placeholder="记录创建这个检查点的原因（可选）"
							:rows="3"
					/>
				</a-form-item>
			</a-form>
		</a-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { EditHistory, RollbackPoint } from '@/types'
import api from '@/api/services'
import { Message, Modal } from '@arco-design/web-vue'
import dayjs from 'dayjs'

// Props
const props = defineProps<{
	messageId?: number
	sessionId?: number
}>()

// Emits
const emit = defineEmits<{
	restore: [messageId: number, versionIndex: number]
	rollback: [messageId: number]
}>()

// 响应式数据
const activeTab = ref<'edit' | 'rollback' | 'stats'>('edit')
const editHistory = ref<EditHistory[]>([])
const rollbackPoints = ref<RollbackPoint[]>([])
const loadingHistory = ref(false)
const loadingRollback = ref(false)
const creatingCheckpoint = ref(false)

// 对比相关
const compareVisible = ref(false)
const compareFrom = ref(0)
const compareTo = ref(0)
const compareContent = ref({
	before: '',
	after: ''
})

// 检查点表单
const checkpointVisible = ref(false)
const checkpointForm = ref({
	name: '',
	description: ''
})

// 统计数据（模拟）
const sessionStats = computed(() => ({
	totalMessages: 42,
	branchCount: 3,
	editCount: 7,
	totalTokens: 15420,
	avgMessageLength: 156,
	duration: '2小时15分'
}))

// 监听消息ID变化，获取编辑历史
watch(() => props.messageId, async (newId) => {
	if (newId && activeTab.value === 'edit') {
		await fetchEditHistory(newId)
	}
}, { immediate: true })

// 监听会话ID变化，获取回退点
watch(() => props.sessionId, async (newId) => {
	if (newId && activeTab.value === 'rollback') {
		await fetchRollbackPoints()
	}
}, { immediate: true })

// 监听标签页切换
watch(activeTab, (tab) => {
	if (tab === 'edit' && props.messageId) {
		fetchEditHistory(props.messageId)
	} else if (tab === 'rollback' && props.sessionId) {
		fetchRollbackPoints()
	}
})

// 方法
async function fetchEditHistory(messageId: number) {
	try {
		loadingHistory.value = true
		const response = await api.edit.getEditHistory(messageId)
		if (response.code === 200) {
			editHistory.value = response.data
		}
	} catch (error) {
		console.error('获取编辑历史失败:', error)
	} finally {
		loadingHistory.value = false
	}
}

async function fetchRollbackPoints() {
	if (!props.sessionId) return
	
	try {
		loadingRollback.value = true
		const response = await api.message.getRollbackPoints(props.sessionId)
		if (response.code === 200) {
			rollbackPoints.value = response.data
		}
	} catch (error) {
		console.error('获取回退点失败:', error)
	} finally {
		loadingRollback.value = false
	}
}

function handleSelectVersion(version: EditHistory) {
	if (version.isCurrent) return
	// 可以在这里显示版本详情
}

function handleRestore(versionIndex: number) {
	if (!props.messageId) return
	
	Modal.confirm({
		title: '确认恢复',
		content: `确定要恢复到版本 #${versionIndex} 吗？`,
		okText: '确认恢复',
		cancelText: '取消',
		onOk: () => {
			emit('restore', props.messageId!, versionIndex)
		}
	})
}

function handleCompare(versionIndex: number) {
	if (!props.messageId) return
	
	// 获取当前版本和选中版本的内容进行对比
	const currentVersion = editHistory.value.find(v => v.isCurrent)
	const selectedVersion = editHistory.value.find(v => v.versionIndex === versionIndex)
	
	if (currentVersion && selectedVersion) {
		compareFrom.value = selectedVersion.versionIndex
		compareTo.value = currentVersion.versionIndex
		compareContent.value = {
			before: selectedVersion.content,
			after: currentVersion.content
		}
		compareVisible.value = true
	}
}

function handleRollbackTo(messageId: number) {
	Modal.confirm({
		title: '确认回退',
		content: `确定要回退到消息 #${messageId} 吗？这将撤销之后的所有操作。`,
		okText: '确认回退',
		cancelText: '取消',
		onOk: () => {
			emit('rollback', messageId)
		}
	})
}

function createCheckpoint() {
	checkpointForm.value = {
		name: `检查点 ${new Date().toLocaleString()}`,
		description: ''
	}
	checkpointVisible.value = true
}

async function confirmCheckpoint() {
	if (!checkpointForm.value.name.trim()) {
		Message.warning('请输入检查点名称')
		return
	}
	
	try {
		creatingCheckpoint.value = true
		// 这里应该调用创建检查点的API
		Message.success('检查点创建成功')
		checkpointVisible.value = false
		await fetchRollbackPoints()
	} catch (error) {
		Message.error('创建检查点失败')
	} finally {
		creatingCheckpoint.value = false
	}
}

function handleExport() {
	Message.info('导出功能开发中')
}

function handleSearch() {
	Message.info('搜索功能开发中')
}

async function handleCleanup() {
	if (!props.sessionId) return
	
	Modal.confirm({
		title: '确认清理',
		content: '这将永久删除所有已标记删除的消息，此操作不可恢复。确定要继续吗？',
		okText: '确认清理',
		cancelText: '取消',
		maskClosable: false,
		onOk: async () => {
			try {
				await api.message.cleanup(props.sessionId!)
				Message.success('清理完成')
			} catch (error) {
				Message.error('清理失败')
			}
		}
	})
}

// 工具函数
function formatTime(time: string) {
	return dayjs(time).fromNow()
}

function truncateText(text: string, maxLength: number) {
	if (text.length <= maxLength) return text
	return text.substring(0, maxLength) + '...'
}

function formatNumber(num: number) {
	return num.toLocaleString()
}

function getRoleColor(role: string) {
	return role === 'user' ? 'purple' : 'cyan'
}
</script>

<style scoped lang="scss">
.history-panel-container {
	height: 100%;
	display: flex;
	flex-direction: column;
	
	.panel-header {
		padding: 16px;
		border-bottom: 1px solid var(--color-border-1);
		
		.panel-title {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 16px;
			font-weight: 500;
		}
	}
	
	.panel-tabs {
		padding: 12px 16px;
		border-bottom: 1px solid var(--color-border-1);
		
		:deep(.arco-radio-group) {
			width: 100%;
			
			.arco-radio-button {
				flex: 1;
				text-align: center;
			}
		}
	}
	
	.tab-content {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		
		&.stats-content {
			display: flex;
			flex-direction: column;
			gap: 20px;
		}
	}
	
	.loading-container,
	.no-selection {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.history-list {
		.history-item {
			padding: 12px;
			margin-bottom: 12px;
			background: var(--color-fill-1);
			border-radius: 8px;
			border-left: 3px solid var(--color-border-2);
			transition: all 0.3s;
			cursor: pointer;
			
			&:hover {
				background: var(--color-fill-2);
				transform: translateX(4px);
			}
			
			&.current {
				border-left-color: var(--color-primary-6);
				background: rgba(var(--primary-6), 0.05);
			}
			
			.version-header {
				display: flex;
				align-items: center;
				gap: 8px;
				margin-bottom: 8px;
				
				.version-time {
					font-size: 12px;
					color: var(--color-text-3);
				}
			}
			
			.version-content {
				font-size: 14px;
				line-height: 1.5;
				margin-bottom: 8px;
				color: var(--color-text-2);
			}
			
			.version-meta {
				display: flex;
				justify-content: space-between;
				align-items: center;
				font-size: 12px;
				color: var(--color-text-3);
				
				.edit-reason {
					display: flex;
					align-items: center;
					gap: 4px;
				}
			}
			
			.version-actions {
				margin-top: 8px;
				display: flex;
				gap: 8px;
			}
		}
	}
	
	.rollback-controls {
		display: flex;
		gap: 8px;
		margin-bottom: 16px;
	}
	
	.rollback-list {
		.rollback-item {
			padding: 12px;
			background: var(--color-fill-1);
			border-radius: 8px;
			cursor: pointer;
			transition: all 0.3s;
			
			&:hover {
				background: var(--color-fill-2);
			}
			
			.rollback-header {
				display: flex;
				align-items: center;
				gap: 8px;
				margin-bottom: 8px;
				
				.message-id {
					font-weight: 500;
				}
				
				.rollback-time {
					font-size: 12px;
					color: var(--color-text-3);
					margin-left: auto;
				}
			}
			
			.rollback-content {
				font-size: 14px;
				line-height: 1.5;
				margin-bottom: 8px;
				color: var(--color-text-2);
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
			
			.rollback-meta {
				display: flex;
				justify-content: space-between;
				align-items: center;
				font-size: 12px;
				color: var(--color-text-3);
			}
		}
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 12px;
		
		.stat-card {
			padding: 16px;
			background: var(--color-fill-1);
			border-radius: 8px;
			text-align: center;
			
			.stat-label {
				font-size: 12px;
				color: var(--color-text-3);
				margin-bottom: 8px;
			}
			
			.stat-value {
				font-size: 20px;
				font-weight: 600;
				color: var(--color-primary-6);
			}
		}
	}
	
	.quick-actions {
		:deep(.arco-divider) {
			margin: 16px 0;
		}
	}
	
	.diff-container {
		.diff-header {
			margin-bottom: 20px;
			
			.diff-version {
				display: flex;
				align-items: center;
				gap: 8px;
			}
		}
		
		.diff-content {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 16px;
			
			.diff-before,
			.diff-after {
				h4 {
					margin-bottom: 8px;
					color: var(--color-text-2);
				}
				
				pre {
					padding: 12px;
					background: var(--color-fill-1);
					border-radius: 4px;
					white-space: pre-wrap;
					word-break: break-word;
				}
			}
			
			.diff-before pre {
				background: rgba(var(--danger-6), 0.05);
				border: 1px solid rgba(var(--danger-6), 0.2);
			}
			
			.diff-after pre {
				background: rgba(var(--success-6), 0.05);
				border: 1px solid rgba(var(--success-6), 0.2);
			}
		}
	}
}
</style>