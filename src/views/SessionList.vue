<template>
	<div class="session-list-container">
		<div class="page-header">
			<div class="header-content">
				<h1>
					<icon-apps />
					我的会话
				</h1>
				<p class="subtitle">管理和查看所有对话历史</p>
			</div>
			
			<div class="header-actions">
				<a-button type="primary" size="large" @click="handleCreateSession">
					<template #icon><icon-plus /></template>
					新建会话
				</a-button>
			</div>
		</div>
		
		<div class="filter-bar">
			<a-input-search
					v-model="searchKeyword"
					placeholder="搜索会话..."
					style="width: 300px"
					@search="handleSearch"
			/>
			
			<a-space>
				<a-select v-model="sortBy" style="width: 150px">
					<a-option value="lastActive">最近活跃</a-option>
					<a-option value="created">创建时间</a-option>
					<a-option value="name">名称</a-option>
					<a-option value="messages">消息数量</a-option>
				</a-select>
				
				<a-button @click="toggleView">
					<icon-apps v-if="viewMode === 'grid'" />
					<icon-list v-else />
				</a-button>
				
				<a-button @click="fetchSessions">
					<icon-refresh />
				</a-button>
			</a-space>
		</div>
		
		<!-- 网格视图 -->
		<div v-if="viewMode === 'grid'" class="sessions-grid">
			<a-spin v-if="loading" :loading="loading" style="width: 100%">
				<div style="height: 400px"></div>
			</a-spin>
			
			<template v-else>
				<div
						v-for="session in filteredSessions"
						:key="session.id"
						class="session-card"
						@click="handleOpenSession(session)"
				>
					<div class="card-header">
						<div class="session-icon">
							<icon-message />
						</div>
						<a-dropdown trigger="click" @select="(val) => handleAction(val, session)">
							<a-button type="text" size="mini" @click.stop>
								<icon-more-vertical />
							</a-button>
							<template #content>
								<a-doption value="open">
									<icon-eye /> 打开
								</a-doption>
								<a-doption value="rename">
									<icon-edit /> 重命名
								</a-doption>
								<a-doption value="export">
									<icon-download /> 导出
								</a-doption>
								<a-doption value="delete" style="color: var(--color-danger-6)">
									<icon-delete /> 删除
								</a-doption>
							</template>
						</a-dropdown>
					</div>
					
					<div class="card-body">
						<h3 class="session-title">{{ session.title }}</h3>
						<p class="session-description">
							{{ session.description || '暂无描述' }}
						</p>
					</div>
					
					<div class="card-footer">
						<div class="session-stats">
              <span>
                <icon-branch />
                {{ getBranchCount(session) }} 分支
              </span>
							<span>
                <icon-message />
                {{ getMessageCount(session) }} 消息
              </span>
						</div>
						<div class="session-time">
							{{ formatTime(session.lastActiveTime) }}
						</div>
					</div>
					
					<div class="card-badge">
						<a-tag v-if="session.modelName" size="small" :color="getModelColor(session.modelName)">
							{{ session.modelName }}
						</a-tag>
					</div>
				</div>
				
				<div v-if="filteredSessions.length === 0" class="empty-state">
					<a-empty description="暂无会话">
						<template #image>
							<icon-inbox style="font-size: 64px; color: var(--color-text-3)" />
						</template>
						<template #extra>
							<a-button type="primary" @click="handleCreateSession">
								创建第一个会话
							</a-button>
						</template>
					</a-empty>
				</div>
			</template>
		</div>
		
		<!-- 列表视图 -->
		<div v-else class="sessions-list">
			<a-table
					:data="filteredSessions"
					:loading="loading"
					:pagination="{
          pageSize: 10,
          showTotal: true
        }"
			>
				<template #columns>
					<a-table-column title="会话标题" data-index="title">
						<template #cell="{ record }">
							<a-link @click="handleOpenSession(record)">
								{{ record.title }}
							</a-link>
						</template>
					</a-table-column>
					
					<a-table-column title="描述" data-index="description">
						<template #cell="{ record }">
							{{ record.description || '-' }}
						</template>
					</a-table-column>
					
					<a-table-column title="模型" data-index="modelName" :width="120">
						<template #cell="{ record }">
							<a-tag size="small" :color="getModelColor(record.modelName)">
								{{ record.modelName }}
							</a-tag>
						</template>
					</a-table-column>
					
					<a-table-column title="分支数" :width="100">
						<template #cell="{ record }">
							{{ getBranchCount(record) }}
						</template>
					</a-table-column>
					
					<a-table-column title="消息数" :width="100">
						<template #cell="{ record }">
							{{ getMessageCount(record) }}
						</template>
					</a-table-column>
					
					<a-table-column title="最后活跃" data-index="lastActiveTime" :width="150">
						<template #cell="{ record }">
							{{ formatTime(record.lastActiveTime) }}
						</template>
					</a-table-column>
					
					<a-table-column title="操作" :width="120">
						<template #cell="{ record }">
							<a-space>
								<a-button type="text" size="mini" @click="handleOpenSession(record)">
									打开
								</a-button>
								<a-dropdown trigger="click" @select="(val) => handleAction(val, record)">
									<a-button type="text" size="mini">
										<icon-more />
									</a-button>
									<template #content>
										<a-doption value="rename">重命名</a-doption>
										<a-doption value="export">导出</a-doption>
										<a-doption value="delete" style="color: var(--color-danger-6)">
											删除
										</a-doption>
									</template>
								</a-dropdown>
							</a-space>
						</template>
					</a-table-column>
				</template>
			</a-table>
		</div>
		
		<!-- 创建会话模态框 -->
		<a-modal
				v-model:visible="createVisible"
				title="创建新会话"
				@ok="confirmCreateSession"
		>
			<a-form :model="createForm" layout="vertical">
				<a-form-item label="会话标题" required>
					<a-input
							v-model="createForm.title"
							placeholder="给会话起个名字"
					/>
				</a-form-item>
				<a-form-item label="会话描述">
					<a-textarea
							v-model="createForm.description"
							placeholder="描述会话目的（可选）"
							:rows="3"
					/>
				</a-form-item>
				<a-form-item label="AI模型">
					<a-select v-model="createForm.modelName">
						<a-option value="gpt-4">GPT-4</a-option>
						<a-option value="gpt-3.5-turbo">GPT-3.5 Turbo</a-option>
						<a-option value="claude-3">Claude 3</a-option>
					</a-select>
				</a-form-item>
			</a-form>
		</a-modal>
		
		<!-- 重命名模态框 -->
		<a-modal
				v-model:visible="renameVisible"
				title="重命名会话"
				@ok="confirmRename"
		>
			<a-form :model="renameForm" layout="vertical">
				<a-form-item label="会话标题" required>
					<a-input v-model="renameForm.title" />
				</a-form-item>
				<a-form-item label="会话描述">
					<a-textarea
							v-model="renameForm.description"
							:rows="3"
					/>
				</a-form-item>
			</a-form>
		</a-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import type { Session } from '@/types'
import { Message, Modal } from '@arco-design/web-vue'
import dayjs from 'dayjs'

const router = useRouter()
const sessionStore = useSessionStore()

// 响应式数据
const loading = ref(false)
const searchKeyword = ref('')
const sortBy = ref<'lastActive' | 'created' | 'name' | 'messages'>('lastActive')
const viewMode = ref<'grid' | 'list'>('grid')
const sessions = ref<Session[]>([])

// 模态框
const createVisible = ref(false)
const renameVisible = ref(false)
const selectedSession = ref<Session | null>(null)

const createForm = ref({
	title: '',
	description: '',
	modelName: 'gpt-4'
})

const renameForm = ref({
	id: 0,
	title: '',
	description: ''
})

// 计算属性
const filteredSessions = computed(() => {
	let result = [...sessions.value]
	
	// 搜索过滤
	if (searchKeyword.value) {
		const keyword = searchKeyword.value.toLowerCase()
		result = result.filter(s =>
				s.title.toLowerCase().includes(keyword) ||
				s.description?.toLowerCase().includes(keyword)
		)
	}
	
	// 排序
	result.sort((a, b) => {
		switch (sortBy.value) {
			case 'lastActive':
				return dayjs(b.lastActiveTime).unix() - dayjs(a.lastActiveTime).unix()
			case 'created':
				return dayjs(b.createTime).unix() - dayjs(a.createTime).unix()
			case 'name':
				return a.title.localeCompare(b.title)
			case 'messages':
				return getMessageCount(b) - getMessageCount(a)
			default:
				return 0
		}
	})
	
	return result
})

// 生命周期
onMounted(() => {
	fetchSessions()
})

// 方法
async function fetchSessions() {
	try {
		loading.value = true
		await sessionStore.fetchSessions(50)
		sessions.value = sessionStore.sessions
	} catch (error) {
		Message.error('获取会话列表失败')
	} finally {
		loading.value = false
	}
}

function handleSearch() {
	// 搜索逻辑已通过计算属性实现
}

function toggleView() {
	viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid'
}

function handleCreateSession() {
	createForm.value = {
		title: '',
		description: '',
		modelName: 'gpt-4'
	}
	createVisible.value = true
}

async function confirmCreateSession() {
	if (!createForm.value.title.trim()) {
		Message.warning('请输入会话标题')
		return
	}
	
	try {
		const session = await sessionStore.createSession(
				createForm.value.title,
				createForm.value.description
		)
		createVisible.value = false
		router.push(`/chat/${session.id}`)
	} catch (error) {
		Message.error('创建会话失败')
	}
}

function handleOpenSession(session: Session) {
	router.push(`/chat/${session.id}`)
}

function handleAction(action: string, session: Session) {
	selectedSession.value = session
	
	switch (action) {
		case 'open':
			handleOpenSession(session)
			break
		case 'rename':
			handleRename(session)
			break
		case 'export':
			handleExport(session)
			break
		case 'delete':
			handleDelete(session)
			break
	}
}

function handleRename(session: Session) {
	renameForm.value = {
		id: session.id,
		title: session.title,
		description: session.description || ''
	}
	renameVisible.value = true
}

async function confirmRename() {
	if (!renameForm.value.title.trim()) {
		Message.warning('请输入会话标题')
		return
	}
	
	try {
		// 这里应该调用重命名API
		Message.success('重命名成功')
		renameVisible.value = false
		fetchSessions()
	} catch (error) {
		Message.error('重命名失败')
	}
}

function handleExport(session: Session) {
	Message.info('导出功能开发中')
}

function handleDelete(session: Session) {
	Modal.confirm({
		title: '确认删除',
		content: `确定要删除会话"${session.title}"吗？此操作不可恢复。`,
		okText: '确认删除',
		cancelText: '取消',
		onOk: async () => {
			try {
				// 这里应该调用删除API
				Message.success('删除成功')
				fetchSessions()
			} catch (error) {
				Message.error('删除失败')
			}
		}
	})
}

// 工具函数
function formatTime(time: string) {
	return dayjs(time).fromNow()
}

function getBranchCount(session: Session) {
	// 这里应该从session的额外信息中获取
	return 1
}

function getMessageCount(session: Session) {
	// 这里应该从session的额外信息中获取
	return Math.floor(Math.random() * 50) + 1
}

function getModelColor(model: string) {
	const colorMap: Record<string, string> = {
		'gpt-4': 'green',
		'gpt-3.5-turbo': 'blue',
		'claude-3': 'purple'
	}
	return colorMap[model] || 'gray'
}
</script>

<style scoped lang="scss">
.session-list-container {
	min-height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	padding: 24px;
	
	.page-header {
		background: white;
		border-radius: 12px;
		padding: 32px;
		margin-bottom: 24px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		
		.header-content {
			h1 {
				display: flex;
				align-items: center;
				gap: 12px;
				font-size: 32px;
				margin: 0;
				background: linear-gradient(135deg, #667eea, #764ba2);
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
			}
			
			.subtitle {
				margin-top: 8px;
				color: var(--color-text-2);
			}
		}
	}
	
	.filter-bar {
		background: white;
		border-radius: 12px;
		padding: 16px 24px;
		margin-bottom: 24px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.sessions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 20px;
		
		.session-card {
			background: white;
			border-radius: 12px;
			padding: 20px;
			cursor: pointer;
			transition: all 0.3s;
			position: relative;
			overflow: hidden;
			
			&::before {
				content: '';
				position: absolute;
				top: 0;
				left: 0;
				right: 0;
				height: 4px;
				background: linear-gradient(135deg, #667eea, #764ba2);
				transform: translateY(-100%);
				transition: transform 0.3s;
			}
			
			&:hover {
				transform: translateY(-4px);
				box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
				
				&::before {
					transform: translateY(0);
				}
			}
			
			.card-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 16px;
				
				.session-icon {
					width: 48px;
					height: 48px;
					background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
					border-radius: 12px;
					display: flex;
					align-items: center;
					justify-content: center;
					font-size: 24px;
					color: var(--color-primary-6);
				}
			}
			
			.card-body {
				margin-bottom: 16px;
				
				.session-title {
					font-size: 18px;
					margin-bottom: 8px;
					color: var(--color-text-1);
				}
				
				.session-description {
					font-size: 14px;
					color: var(--color-text-2);
					line-height: 1.5;
					overflow: hidden;
					text-overflow: ellipsis;
					display: -webkit-box;
					-webkit-line-clamp: 2;
					-webkit-box-orient: vertical;
				}
			}
			
			.card-footer {
				display: flex;
				justify-content: space-between;
				align-items: center;
				padding-top: 16px;
				border-top: 1px solid var(--color-border-1);
				
				.session-stats {
					display: flex;
					gap: 16px;
					
					span {
						display: flex;
						align-items: center;
						gap: 4px;
						font-size: 13px;
						color: var(--color-text-3);
					}
				}
				
				.session-time {
					font-size: 12px;
					color: var(--color-text-3);
				}
			}
			
			.card-badge {
				position: absolute;
				top: 20px;
				right: 20px;
			}
		}
		
		.empty-state {
			grid-column: 1 / -1;
			padding: 60px;
			display: flex;
			justify-content: center;
		}
	}
	
	.sessions-list {
		background: white;
		border-radius: 12px;
		padding: 24px;
	}
}
</style>