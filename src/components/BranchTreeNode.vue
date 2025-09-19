<template>
	<div class="tree-node">
		<!-- 连接线 -->
		<div v-if="level > 0" class="tree-line">
			<svg :width="30" :height="40">
				<path
						:d="`M 0,20 L 15,20 L 15,${isLastChild ? 20 : 40}`"
						stroke="#ddd"
						stroke-width="2"
						fill="none"
				/>
			</svg>
		</div>
		
		<!-- 节点内容 -->
		<div
				class="node-content"
				:class="{
        active: node.id === activeId,
        'on-active-path': node.isOnActivePath,
        main: node.isMain
      }"
				@click="handleClick"
		>
			<div class="node-dot" :class="{ active: node.id === activeId }" />
			<div class="node-info">
				<div class="node-name">
					{{ node.name }}
					<a-tag v-if="node.isMain" size="small" color="blue">主分支</a-tag>
				</div>
				<div class="node-meta">
          <span v-if="node.forkMessageId">
            从消息 #{{ node.forkMessageId }} 分叉
          </span>
					<span v-if="node.headMessageId">
            HEAD: #{{ node.headMessageId }}
          </span>
				</div>
			</div>
		</div>
		
		<!-- 子节点 -->
		<div v-if="node.children && node.children.length > 0" class="tree-children">
			<BranchTreeNode
					v-for="(child, index) in node.children"
					:key="child.id"
					:node="child"
					:active-id="activeId"
					:level="level + 1"
					:is-last-child="index === node.children.length - 1"
					@switch="emit('switch', $event)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { BranchTreeNode as TreeNode } from '@/types'

const props = withDefaults(defineProps<{
	node: TreeNode
	activeId?: number
	level?: number
	isLastChild?: boolean
}>(), {
	level: 0,
	isLastChild: false
})

const emit = defineEmits<{
	switch: [branchId: number]
}>()

function handleClick() {
	emit('switch', props.node.id)
}
</script>

<style scoped lang="scss">
.tree-node {
	display: flex;
	flex-direction: column;
	position: relative;
	
	.tree-line {
		position: absolute;
		left: -30px;
		top: -20px;
	}
	
	.node-content {
		display: flex;
		align-items: center;
		padding: 8px 12px;
		margin: 4px 0;
		margin-left: v-bind('level * 40 + "px"');
		background: var(--color-fill-1);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.3s;
		border: 2px solid transparent;
		
		&:hover {
			background: var(--color-fill-2);
			transform: translateX(2px);
		}
		
		&.active {
			background: rgba(var(--primary-6), 0.1);
			border-color: rgb(var(--primary-6));
		}
		
		&.on-active-path {
			background: rgba(var(--primary-6), 0.05);
		}
		
		&.main {
			font-weight: 500;
		}
		
		.node-dot {
			width: 10px;
			height: 10px;
			border-radius: 50%;
			background: var(--color-fill-3);
			margin-right: 10px;
			transition: all 0.3s;
			
			&.active {
				background: rgb(var(--primary-6));
				box-shadow: 0 0 0 3px rgba(var(--primary-6), 0.2);
			}
		}
		
		.node-info {
			flex: 1;
			
			.node-name {
				display: flex;
				align-items: center;
				gap: 8px;
				font-size: 14px;
				color: var(--color-text-1);
			}
			
			.node-meta {
				display: flex;
				gap: 12px;
				margin-top: 4px;
				font-size: 12px;
				color: var(--color-text-3);
			}
		}
	}
	
	.tree-children {
		position: relative;
		
		&::before {
			content: '';
			position: absolute;
			left: v-bind('(level + 1) * 40 - 30 + "px"');
			top: 0;
			bottom: 20px;
			width: 2px;
			background: #ddd;
		}
	}
}
</style><template>
	<div class="message-list">
		<!-- 空状态 -->
		<div v-if="messages.length === 0 && !loading" class="empty-state">
			<a-empty description="暂无消息，开始你的第一次对话吧">
				<template #image>
					<icon-message style="font-size: 48px; color: var(--color-text-3)" />
				</template>
			</a-empty>
		</div>
		
		<!-- 加载状态 -->
		<div v-if="loading" class="loading-state">
			<a-spin tip="加载中..." />
		</div>
		
		<!-- 消息列表 -->
		<div v-else class="messages-container">
			<template v-for="(message, index) in messages" :key="message.id">
				<!-- 分叉提示 -->
				<div
						v-if="message.childrenCount > 1"
						class="fork-indicator"
				>
					<icon-branch />
					<span>此处有 {{ message.childrenCount }} 个分支</span>
					<a-button type="text" size="mini" @click="handleViewBranches(message.id)">
						查看分支
					</a-button>
				</div>
				
				<!-- 消息气泡 -->
				<div
						class="message"
						:class="`message-${message.role}`"
						@mouseenter="hoveredMessageId = message.id"
						@mouseleave="hoveredMessageId = null"
				>
					<!-- 头像 -->
					<div class="avatar">
						<a-avatar v-if="message.role === 'user'" :style="{ backgroundColor: '#667eea' }">
							<icon-user />
						</a-avatar>
						<a-avatar v-else :style="{ backgroundColor: '#764ba2' }">
							<icon-robot />
						</a-avatar>
					</div>
					
					<!-- 消息内容 -->
					<div class="message-content">
						<div class="message-header">
              <span class="role-name">
                {{ message.role === 'user' ? '你' : 'AI助手' }}
              </span>
							<span class="message-time">
                {{ formatTime(message.createTime) }}
              </span>
							<a-tag v-if="message.edited" size="small" color="orange">
								已编辑
							</a-tag>
						</div>
						
						<!-- 根据消息类型渲染不同格式 -->
						<div class="message-body">
							<div v-if="message.messageType === 'TEXT'" class="text-content">
								{{ message.content }}
							</div>
							<div v-else-if="message.messageType === 'MARKDOWN'" class="markdown-content">
								<!-- 这里可以集成markdown渲染器 -->
								<div v-html="renderMarkdown(message.content)" />
							</div>
							<div v-else-if="message.messageType === 'CODE'" class="code-content">
								<pre><code>{{ message.content }}</code></pre>
							</div>
						</div>
						
						<!-- 附件展示 -->
						<div v-if="message.attachments && message.attachments.length > 0" class="attachments">
							<a-space>
								<a-link
										v-for="(attachment, idx) in message.attachments"
										:key="idx"
										:href="attachment"
										target="_blank"
								>
									<icon-attachment /> 附件{{ idx + 1 }}
								</a-link>
							</a-space>
						</div>
						
						<!-- 消息元数据 -->
						<div class="message-meta">
              <span v-if="message.tokenCount">
                <icon-fire /> {{ message.tokenCount }} tokens
              </span>
							<span>
                #{{ message.id }}
              </span>
						</div>
						
						<!-- 操作按钮（悬停显示） -->
						<transition name="fade">
							<div v-show="hoveredMessageId === message.id" class="message-actions">
								<a-space>
									<!-- 用户消息操作 -->
									<template v-if="message.role === 'user'">
										<a-tooltip content="编辑消息">
											<a-button
													type="text"
													size="mini"
													@click="handleEdit(message)"
											>
												<icon-edit />
											</a-button>
										</a-tooltip>
										<a-tooltip content="从这里创建分支">
											<a-button
													type="text"
													size="mini"
													@click="handleFork(message.id)"
											>
												<icon-branch />
											</a-button>
										</a-tooltip>
									</template>
									
									<!-- AI消息操作 -->
									<template v-else>
										<a-tooltip content="重新生成">
											<a-button
													type="text"
													size="mini"
													@click="handleRegenerate(message.id)"
											>
												<icon-refresh />
											</a-button>
										</a-tooltip>
										<a-tooltip content="复制内容">
											<a-button
													type="text"
													size="mini"
													@click="handleCopy(message.content)"
											>
												<icon-copy />
											</a-button>
										</a-tooltip>
									</template>
									
									<!-- 通用操作 -->
									<a-tooltip content="查看编辑历史" v-if="message.edited">
										<a-button
												type="text"
												size="mini"
												@click="handleViewHistory(message.id)"
										>
											<icon-history />
										</a-button>
									</a-tooltip>
									
									<a-popconfirm
											content="确定删除这条消息吗？"
											@ok="handleDelete(message.id, false)"
									>
										<a-tooltip content="删除消息">
											<a-button type="text" size="mini" status="danger">
												<icon-delete />
											</a-button>
										</a-tooltip>
									</a-popconfirm>
									
									<a-dropdown trigger="click" position="br">
										<a-button type="text" size="mini">
											<icon-more />
										</a-button>
										<template #content>
											<a-doption @click="handleDelete(message.id, true)">
												<icon-delete /> 删除消息及子消息
											</a-doption>
											<a-doption @click="handleRollbackTo(message.id)">
												<icon-undo /> 回退到此处
											</a-doption>
											<a-doption @click="handleViewDetails(message)">
												<icon-info-circle /> 查看详情
											</a-doption>
										</template>
									</a-dropdown>
								</a-space>
							</div>
						</transition>
					</div>
				</div>
			</template>
			
			<!-- AI正在输入提示 -->
			<div v-if="isAiTyping" class="message message-assistant typing">
				<div class="avatar">
					<a-avatar :style="{ backgroundColor: '#764ba2' }">
						<icon-robot />
					</a-avatar>
				</div>
				<div class="message-content">
					<div class="typing-indicator">
						<span></span>
						<span></span>
						<span></span>
					</div>
				</div>
			</div>
		</div>
		
		<!-- 消息详情模态框 -->
		<a-modal
				v-model:visible="detailVisible"
				title="消息详情"
				:footer="false"
				:width="600"
		>
			<a-descriptions v-if="selectedMessage" :column="1" bordered>
				<a-descriptions-item label="消息ID">
					{{ selectedMessage.id }}
				</a-descriptions-item>
				<a-descriptions-item label="会话ID">
					{{ selectedMessage.sessionId }}
				</a-descriptions-item>
				<a-descriptions-item label="父消息ID">
					{{ selectedMessage.parentId || '无' }}
				</a-descriptions-item>
				<a-descriptions-item label="角色">
					{{ selectedMessage.role }}
				</a-descriptions-item>
				<a-descriptions-item label="消息类型">
					{{ selectedMessage.messageType }}
				</a-descriptions-item>
				<a-descriptions-item label="Token数">
					{{ selectedMessage.tokenCount }}
				</a-descriptions-item>
				<a-descriptions-item label="是否编辑过">
					<a-tag v-if="selectedMessage.edited" color="orange">是</a-tag>
					<a-tag v-else color="gray">否</a-tag>
				</a-descriptions-item>
				<a-descriptions-item label="子消息数">
					{{ selectedMessage.childrenCount }}
				</a-descriptions-item>
				<a-descriptions-item label="创建时间">
					{{ formatFullTime(selectedMessage.createTime) }}
				</a-descriptions-item>
				<a-descriptions-item label="消息内容">
					<pre style="white-space: pre-wrap; word-break: break-word;">{{ selectedMessage.content }}</pre>
				</a-descriptions-item>
				<a-descriptions-item label="元数据" v-if="selectedMessage.metadata && Object.keys(selectedMessage.metadata).length > 0">
					<pre>{{ JSON.stringify(selectedMessage.metadata, null, 2) }}</pre>
				</a-descriptions-item>
			</a-descriptions>
		</a-modal>
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Message } from '@/types'
import { Message as ArcoMessage } from '@arco-design/web-vue'
import dayjs from 'dayjs'

// Props
const props = defineProps<{
	messages: Message[]
	loading: boolean
	isAiTyping?: boolean
}>()

// Emits
const emit = defineEmits<{
	edit: [messageId: number, content: string]
	delete: [messageId: number, cascade: boolean]
	fork: [messageId: number]
	regenerate: [messageId: number]
	rollbackTo: [messageId: number]
	viewHistory: [messageId: number]
	viewBranches: [messageId: number]
}>()

// 响应式数据
const hoveredMessageId = ref<number | null>(null)
const detailVisible = ref(false)
const selectedMessage = ref<Message | null>(null)

// 方法
function handleEdit(message: Message) {
	emit('edit', message.id, message.content)
}

function handleDelete(messageId: number, cascade: boolean) {
	emit('delete', messageId, cascade)
}

function handleFork(messageId: number) {
	emit('fork', messageId)
}

function handleRegenerate(messageId: number) {
	emit('regenerate', messageId)
}

function handleRollbackTo(messageId: number) {
	emit('rollbackTo', messageId)
}

function handleViewHistory(messageId: number) {
	emit('viewHistory', messageId)
}

function handleViewBranches(messageId: number) {
	emit('viewBranches', messageId)
}

function handleViewDetails(message: Message) {
	selectedMessage.value = message
	detailVisible.value = true
}

function handleCopy(content: string) {
	navigator.clipboard.writeText(content).then(() => {
		ArcoMessage.success('已复制到剪贴板')
	}).catch(() => {
		ArcoMessage.error('复制失败')
	})
}

// 渲染Markdown（简单实现，实际项目中应使用专门的markdown库）
function renderMarkdown(content: string) {
	// 这里应该使用如marked.js等库来渲染markdown
	// 暂时简单处理
	return content
			.replace(/\n/g, '<br>')
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/`(.*?)`/g, '<code>$1</code>')
}

// 格式化时间
function formatTime(time: string) {
	return dayjs(time).fromNow()
}

function formatFullTime(time: string) {
	return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped lang="scss">
.message-list {
	height: 100%;
	
	.empty-state,
	.loading-state {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.messages-container {
		padding-bottom: 20px;
	}
	
	.fork-indicator {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		margin: 16px 60px;
		background: linear-gradient(135deg, rgba(255, 217, 61, 0.1), rgba(255, 107, 107, 0.1));
		border: 1px solid #ffd93d;
		border-radius: 20px;
		font-size: 13px;
		color: #ff6b6b;
	}
	
	.message {
		display: flex;
		gap: 12px;
		padding: 16px 20px;
		position: relative;
		
		&.message-user {
			flex-direction: row-reverse;
			
			.message-content {
				background: linear-gradient(135deg, #667eea, #764ba2);
				color: white;
				margin-left: 60px;
				
				.message-header,
				.message-meta {
					color: rgba(255, 255, 255, 0.9);
				}
			}
		}
		
		&.message-assistant {
			.message-content {
				background: var(--color-fill-2);
				color: var(--color-text-1);
				margin-right: 60px;
			}
		}
		
		.avatar {
			flex-shrink: 0;
		}
		
		.message-content {
			flex: 1;
			max-width: 70%;
			padding: 12px 16px;
			border-radius: 12px;
			position: relative;
			
			.message-header {
				display: flex;
				align-items: center;
				gap: 8px;
				margin-bottom: 8px;
				
				.role-name {
					font-weight: 500;
				}
				
				.message-time {
					font-size: 12px;
					opacity: 0.7;
				}
			}
			
			.message-body {
				line-height: 1.6;
				word-break: break-word;
				
				.code-content {
					pre {
						background: rgba(0, 0, 0, 0.05);
						padding: 8px;
						border-radius: 4px;
						overflow-x: auto;
						
						code {
							font-family: 'Courier New', monospace;
							font-size: 14px;
						}
					}
				}
			}
			
			.attachments {
				margin-top: 8px;
				padding-top: 8px;
				border-top: 1px solid rgba(0, 0, 0, 0.1);
			}
			
			.message-meta {
				margin-top: 8px;
				font-size: 12px;
				opacity: 0.7;
				display: flex;
				gap: 12px;
			}
			
			.message-actions {
				position: absolute;
				top: 8px;
				right: 8px;
				background: white;
				border-radius: 6px;
				padding: 4px;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
			}
		}
		
		&.typing {
			.typing-indicator {
				display: flex;
				gap: 4px;
				padding: 8px 0;
				
				span {
					width: 8px;
					height: 8px;
					border-radius: 50%;
					background: var(--color-text-3);
					animation: typing 1.4s infinite;
					
					&:nth-child(1) { animation-delay: 0s; }
					&:nth-child(2) { animation-delay: 0.2s; }
					&:nth-child(3) { animation-delay: 0.4s; }
				}
			}
		}
	}
}

@keyframes typing {
	0%, 60%, 100% {
		opacity: 0.3;
		transform: translateY(0);
	}
	30% {
		opacity: 1;
		transform: translateY(-10px);
	}
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>