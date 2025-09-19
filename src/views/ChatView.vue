<template>
	<div class="chat-container">
		<!-- 顶部导航栏 -->
		<header class="chat-header">
			<div class="header-left">
				<a-space>
					<icon-branch class="logo-icon" />
					<span class="logo-text">对话树管理系统</span>
				</a-space>
			</div>
			
			<div class="header-center">
				<a-select
						v-model="currentSessionId"
						placeholder="选择会话"
						style="width: 300px"
						@change="handleSessionChange"
						allow-search
				>
					<a-option v-for="session in sessions" :key="session.id" :value="session.id">
						<div class="session-option">
							<span>{{ session.title }}</span>
							<span class="session-time">{{ formatTime(session.lastActiveTime) }}</span>
						</div>
					</a-option>
				</a-select>
			</div>
			
			<div class="header-right">
				<a-space>
					<a-button type="primary" @click="showCreateSessionModal">
						<template #icon><icon-plus /></template>
						新建会话
					</a-button>
					<a-button shape="circle" @click="handleRefresh">
						<icon-refresh />
					</a-button>
				</a-space>
			</div>
		</header>
		
		<!-- 主内容区域 -->
		<div class="chat-main">
			<!-- 左侧分支管理面板 -->
			<aside class="branch-panel">
				<BranchPanel
						:branches="branches"
						:current-branch-id="currentSession?.activeBranchId"
						:branch-tree="branchTree"
						@switch="handleSwitchBranch"
						@create="showCreateBranchModal"
						@delete="handleDeleteBranch"
						@rename="handleRenameBranch"
				/>
			</aside>
			
			<!-- 中间对话区域 -->
			<main class="chat-content">
				<div class="chat-content-header">
					<div class="branch-info">
						<a-tag v-if="currentBranch" color="arcoblue">
							{{ currentBranch.name }}
						</a-tag>
						<span v-if="messages.length > 0" class="message-count">
              消息 #{{ messages.length }}
            </span>
					</div>
					
					<a-space>
						<a-button size="small" @click="handleRollback" :disabled="!canRollback">
							<template #icon><icon-undo /></template>
							回退
						</a-button>
						<a-button size="small" @click="handleForward" :disabled="!canForward">
							<template #icon><icon-redo /></template>
							前进
						</a-button>
					</a-space>
				</div>
				
				<!-- 消息列表 -->
				<div class="messages-area" ref="messagesContainer">
					<MessageList
							:messages="messages"
							:loading="loading"
							@edit="handleEditMessage"
							@delete="handleDeleteMessage"
							@fork="handleForkFromMessage"
							@regenerate="handleRegenerateMessage"
					/>
				</div>
				
				<!-- 输入区域 -->
				<div class="input-area">
					<MessageInput
							v-model="inputContent"
							:sending="sendingMessage"
							@send="handleSendMessage"
							@attach="handleAttachment"
					/>
				</div>
			</main>
			
			<!-- 右侧历史面板 -->
			<aside class="history-panel">
				<HistoryPanel
						:message-id="selectedMessageId"
						:session-id="currentSessionId"
						@restore="handleRestoreVersion"
						@rollback="handleRollbackToPoint"
				/>
			</aside>
		</div>
		
		<!-- 创建会话模态框 -->
		<a-modal
				v-model:visible="createSessionVisible"
				title="创建新会话"
				@ok="handleCreateSession"
				@cancel="createSessionVisible = false"
		>
			<a-form :model="newSessionForm" layout="vertical">
				<a-form-item label="会话标题" required>
					<a-input
							v-model="newSessionForm.title"
							placeholder="给这次对话起个名字"
					/>
				</a-form-item>
				<a-form-item label="会话描述">
					<a-textarea
							v-model="newSessionForm.description"
							placeholder="描述一下这次对话的目的（可选）"
							:rows="3"
					/>
				</a-form-item>
				<a-form-item label="AI模型">
					<a-select v-model="newSessionForm.modelName">
						<a-option value="gpt-4">GPT-4</a-option>
						<a-option value="gpt-3.5-turbo">GPT-3.5 Turbo</a-option>
						<a-option value="claude-3">Claude 3</a-option>
					</a-select>
				</a-form-item>
			</a-form>
		</a-modal>
		
		<!-- 创建分支模态框 -->
		<a-modal
				v-model:visible="createBranchVisible"
				title="创建新分支"
				@ok="handleCreateBranch"
				@cancel="createBranchVisible = false"
		>
			<a-form :model="newBranchForm" layout="vertical">
				<a-form-item label="分支名称" required>
					<a-input
							v-model="newBranchForm.name"
							placeholder="例如：功能探索、用户体验优化"
					/>
				</a-form-item>
				<a-form-item label="分支描述">
					<a-textarea
							v-model="newBranchForm.description"
							placeholder="描述这个分支的目的（可选）"
							:rows="3"
					/>
				</a-form-item>
				<a-form-item label="分叉点">
					<a-select v-model="newBranchForm.forkMessageId" placeholder="选择从哪条消息开始分叉">
						<a-option :value="undefined">从当前位置</a-option>
						<a-option v-for="msg in messages" :key="msg.id" :value="msg.id">
							消息 #{{ msg.id }}: {{ truncateText(msg.content, 50) }}
						</a-option>
					</a-select>
				</a-form-item>
				<a-form-item>
					<a-checkbox v-model="newBranchForm.switchToNew">
						创建后切换到新分支
					</a-checkbox>
				</a-form-item>
			</a-form>
		</a-modal>
		
		<!-- 编辑消息模态框 -->
		<a-modal
				v-model:visible="editMessageVisible"
				title="编辑消息"
				@ok="handleConfirmEdit"
				@cancel="editMessageVisible = false"
		>
			<a-form :model="editMessageForm" layout="vertical">
				<a-form-item label="消息内容">
					<a-textarea
							v-model="editMessageForm.content"
							:rows="5"
							placeholder="编辑消息内容"
					/>
				</a-form-item>
				<a-form-item label="编辑原因">
					<a-input
							v-model="editMessageForm.reason"
							placeholder="记录编辑原因（可选）"
					/>
				</a-form-item>
				<a-form-item>
					<a-checkbox v-model="editMessageForm.regenerate">
						重新生成AI回复
					</a-checkbox>
				</a-form-item>
			</a-form>
		</a-modal>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { Message } from '@arco-design/web-vue'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

// 导入子组件（稍后创建）
import BranchPanel from '@/components/BranchPanel.vue'
import MessageList from '@/components/MessageList.vue'
import MessageInput from '@/components/MessageInput.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'

// 配置dayjs
dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 路由相关
const route = useRoute()
const router = useRouter()

// Store
const sessionStore = useSessionStore()

// 响应式数据
const currentSessionId = ref<number | undefined>()
const inputContent = ref('')
const selectedMessageId = ref<number | undefined>()
const messagesContainer = ref<HTMLElement>()

// 模态框控制
const createSessionVisible = ref(false)
const createBranchVisible = ref(false)
const editMessageVisible = ref(false)

// 表单数据
const newSessionForm = ref({
	title: '',
	description: '',
	modelName: 'gpt-4'
})

const newBranchForm = ref({
	name: '',
	description: '',
	forkMessageId: undefined as number | undefined,
	switchToNew: true
})

const editMessageForm = ref({
	messageId: 0,
	content: '',
	reason: '',
	regenerate: false
})

// 计算属性 - 从store获取数据
const currentSession = computed(() => sessionStore.currentSession)
const sessions = computed(() => sessionStore.sessions)
const messages = computed(() => sessionStore.messages)
const branches = computed(() => sessionStore.branches)
const branchTree = computed(() => sessionStore.branchTree)
const currentBranch = computed(() => sessionStore.currentBranch)
const loading = computed(() => sessionStore.loading)
const sendingMessage = computed(() => sessionStore.sendingMessage)

// 计算属性 - UI状态
const canRollback = computed(() => messages.value.length > 1)
const canForward = computed(() => {
	// 这里可以根据实际业务逻辑判断是否可以前进
	return false
})

// 生命周期钩子
onMounted(async () => {
	// 加载会话列表
	await sessionStore.fetchSessions()
	
	// 如果路由中有sessionId，加载对应会话
	const sessionId = route.params.sessionId
	if (sessionId && typeof sessionId === 'string') {
		currentSessionId.value = parseInt(sessionId)
		await sessionStore.loadSession(currentSessionId.value)
	}
})

// 监听会话变化
watch(currentSessionId, async (newId) => {
	if (newId) {
		await sessionStore.loadSession(newId)
		// 更新路由
		router.push(`/chat/${newId}`)
	}
})

// 监听消息列表变化，自动滚动到底部
watch(messages, async () => {
	await nextTick()
	scrollToBottom()
}, { deep: true })

// 方法 - 会话管理
function showCreateSessionModal() {
	newSessionForm.value = {
		title: '',
		description: '',
		modelName: 'gpt-4'
	}
	createSessionVisible.value = true
}

async function handleCreateSession() {
	if (!newSessionForm.value.title.trim()) {
		Message.warning('请输入会话标题')
		return
	}
	
	try {
		const session = await sessionStore.createSession(
				newSessionForm.value.title,
				newSessionForm.value.description
		)
		currentSessionId.value = session.id
		createSessionVisible.value = false
	} catch (error) {
		console.error('创建会话失败:', error)
	}
}

function handleSessionChange(sessionId: number) {
	currentSessionId.value = sessionId
}

// 方法 - 分支管理
function showCreateBranchModal(forkMessageId?: number) {
	newBranchForm.value = {
		name: '',
		description: '',
		forkMessageId,
		switchToNew: true
	}
	createBranchVisible.value = true
}

async function handleCreateBranch() {
	if (!newBranchForm.value.name.trim()) {
		Message.warning('请输入分支名称')
		return
	}
	
	try {
		await sessionStore.createBranch(
				newBranchForm.value.name,
				newBranchForm.value.description,
				newBranchForm.value.forkMessageId
		)
		createBranchVisible.value = false
	} catch (error) {
		console.error('创建分支失败:', error)
	}
}

async function handleSwitchBranch(branchId: number) {
	try {
		await sessionStore.switchBranch(branchId)
	} catch (error) {
		console.error('切换分支失败:', error)
	}
}

async function handleDeleteBranch(branchId: number) {
	try {
		await sessionStore.deleteBranch(branchId)
	} catch (error) {
		console.error('删除分支失败:', error)
	}
}

async function handleRenameBranch(branchId: number, newName: string) {
	// 这里可以调用重命名API
	console.log('重命名分支:', branchId, newName)
}

// 方法 - 消息管理
async function handleSendMessage() {
	const content = inputContent.value.trim()
	if (!content) return
	
	try {
		await sessionStore.sendMessage(content)
		inputContent.value = ''
		scrollToBottom()
	} catch (error) {
		console.error('发送消息失败:', error)
	}
}

function handleEditMessage(messageId: number, content: string) {
	editMessageForm.value = {
		messageId,
		content,
		reason: '',
		regenerate: false
	}
	editMessageVisible.value = true
}

async function handleConfirmEdit() {
	try {
		await sessionStore.editMessage(
				editMessageForm.value.messageId,
				editMessageForm.value.content,
				editMessageForm.value.regenerate
		)
		editMessageVisible.value = false
	} catch (error) {
		console.error('编辑消息失败:', error)
	}
}

async function handleDeleteMessage(messageId: number, cascade: boolean = false) {
	try {
		await sessionStore.deleteMessage(messageId, cascade)
	} catch (error) {
		console.error('删除消息失败:', error)
	}
}

function handleForkFromMessage(messageId: number) {
	showCreateBranchModal(messageId)
}

async function handleRegenerateMessage(messageId: number) {
	// 实现重新生成消息的逻辑
	console.log('重新生成消息:', messageId)
}

// 方法 - 历史管理
async function handleRollback() {
	if (!canRollback.value) return
	
	// 这里可以显示一个选择回退点的对话框
	const lastUserMessage = messages.value
			.filter(m => m.role === 'user')
			.slice(-2)[0] // 倒数第二条用户消息
	
	if (lastUserMessage) {
		try {
			await sessionStore.rollbackToMessage(lastUserMessage.id, '回退到上一轮对话')
		} catch (error) {
			console.error('回退失败:', error)
		}
	}
}

async function handleForward() {
	// 实现前进逻辑
	console.log('前进')
}

function handleRestoreVersion(messageId: number, versionIndex: number) {
	// 恢复到指定版本
	console.log('恢复版本:', messageId, versionIndex)
}

function handleRollbackToPoint(messageId: number) {
	// 回退到指定消息
	sessionStore.rollbackToMessage(messageId)
}

// 方法 - 其他
function handleRefresh() {
	if (currentSessionId.value) {
		sessionStore.loadSession(currentSessionId.value)
	}
}

function handleAttachment() {
	// 处理附件上传
	Message.info('附件功能开发中')
}

function scrollToBottom() {
	if (messagesContainer.value) {
		messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
	}
}

// 工具函数
function formatTime(time: string) {
	return dayjs(time).fromNow()
}

function truncateText(text: string, maxLength: number) {
	if (text.length <= maxLength) return text
	return text.substring(0, maxLength) + '...'
}
</script>

<style scoped lang="scss">
.chat-container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	
	.chat-header {
		height: 64px;
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		padding: 0 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		
		.header-left {
			.logo-icon {
				font-size: 24px;
				color: var(--color-primary-6);
			}
			
			.logo-text {
				font-size: 18px;
				font-weight: 600;
				background: linear-gradient(135deg, #667eea, #764ba2);
				-webkit-background-clip: text;
				-webkit-text-fill-color: transparent;
			}
		}
		
		.session-option {
			display: flex;
			justify-content: space-between;
			align-items: center;
			
			.session-time {
				font-size: 12px;
				color: var(--color-text-3);
				margin-left: 8px;
			}
		}
	}
	
	.chat-main {
		flex: 1;
		display: flex;
		gap: 20px;
		padding: 20px;
		overflow: hidden;
		
		.branch-panel {
			width: 280px;
			background: rgba(255, 255, 255, 0.95);
			backdrop-filter: blur(10px);
			border-radius: 12px;
			overflow: hidden;
		}
		
		.chat-content {
			flex: 1;
			display: flex;
			flex-direction: column;
			background: rgba(255, 255, 255, 0.95);
			backdrop-filter: blur(10px);
			border-radius: 12px;
			overflow: hidden;
			
			.chat-content-header {
				padding: 16px 20px;
				border-bottom: 1px solid var(--color-border-1);
				display: flex;
				justify-content: space-between;
				align-items: center;
				
				.branch-info {
					display: flex;
					align-items: center;
					gap: 12px;
					
					.message-count {
						font-size: 14px;
						color: var(--color-text-2);
					}
				}
			}
			
			.messages-area {
				flex: 1;
				padding: 20px;
				overflow-y: auto;
				background: linear-gradient(to bottom, #fafafa, #ffffff);
			}
			
			.input-area {
				padding: 20px;
				border-top: 1px solid var(--color-border-1);
				background: white;
			}
		}
		
		.history-panel {
			width: 320px;
			background: rgba(255, 255, 255, 0.95);
			backdrop-filter: blur(10px);
			border-radius: 12px;
			overflow: hidden;
		}
	}
}

// 响应式设计
@media (max-width: 1400px) {
	.chat-main {
		.branch-panel {
			width: 240px;
		}
		
		.history-panel {
			width: 280px;
		}
	}
}

@media (max-width: 1200px) {
	.chat-main {
		.history-panel {
			display: none;
		}
	}
}

@media (max-width: 768px) {
	.chat-main {
		padding: 10px;
		gap: 10px;
		
		.branch-panel {
			display: none;
		}
		
		.chat-content {
			border-radius: 8px;
		}
	}
}
</style>