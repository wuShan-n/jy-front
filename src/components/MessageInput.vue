<template>
	<div class="message-input-container">
		<div class="input-toolbar">
			<a-space>
				<a-tooltip content="添加附件">
					<a-button type="text" size="small" @click="handleAttachment">
						<icon-attachment />
					</a-button>
				</a-tooltip>
				
				<a-dropdown trigger="click" position="tl">
					<a-button type="text" size="small">
						<icon-code /> {{ messageType }}
					</a-button>
					<template #content>
						<a-doption @click="messageType = 'TEXT'">
							<icon-font-colors /> 纯文本
						</a-doption>
						<a-doption @click="messageType = 'MARKDOWN'">
							<icon-bold /> Markdown
						</a-doption>
						<a-doption @click="messageType = 'CODE'">
							<icon-code /> 代码
						</a-doption>
					</template>
				</a-dropdown>
				
				<a-tooltip content="快捷键提示">
					<a-button type="text" size="small" @click="showShortcuts = true">
						<icon-question-circle />
					</a-button>
				</a-tooltip>
			</a-space>
			
			<div class="input-status">
        <span v-if="charCount > 0" class="char-count">
          {{ charCount }} 字符
        </span>
				<span v-if="isComposing" class="composing-hint">
          正在输入...
        </span>
			</div>
		</div>
		
		<div class="input-wrapper">
			<a-textarea
					ref="textareaRef"
					v-model="localContent"
					:placeholder="placeholder"
					:auto-size="{ minRows: 1, maxRows: 8 }"
					:disabled="sending"
					@keydown="handleKeydown"
					@compositionstart="isComposing = true"
					@compositionend="isComposing = false"
					@paste="handlePaste"
					class="message-textarea"
			/>
			
			<div class="input-actions">
				<a-button
						v-if="localContent.trim()"
						type="text"
						size="small"
						@click="handleClear"
						:disabled="sending"
				>
					<icon-delete />
				</a-button>
				
				<a-button
						type="primary"
						shape="circle"
						@click="handleSend"
						:loading="sending"
						:disabled="!canSend"
						class="send-button"
				>
					<icon-send v-if="!sending" />
				</a-button>
			</div>
		</div>
		
		<!-- 附件预览 -->
		<div v-if="attachments.length > 0" class="attachments-preview">
			<a-space>
				<div
						v-for="(file, index) in attachments"
						:key="index"
						class="attachment-item"
				>
					<div class="file-info">
						<icon-file />
						<span>{{ file.name }}</span>
						<span class="file-size">{{ formatFileSize(file.size) }}</span>
					</div>
					<a-button
							type="text"
							size="mini"
							@click="removeAttachment(index)"
					>
						<icon-close />
					</a-button>
				</div>
			</a-space>
		</div>
		
		<!-- 快捷键提示 -->
		<a-modal
				v-model:visible="showShortcuts"
				title="快捷键提示"
				:footer="false"
		>
			<a-list>
				<a-list-item>
					<a-list-item-meta>
						<template #title>
							<a-tag>Ctrl + Enter</a-tag> 发送消息
						</template>
					</a-list-item-meta>
				</a-list-item>
				<a-list-item>
					<a-list-item-meta>
						<template #title>
							<a-tag>Shift + Enter</a-tag> 换行
						</template>
					</a-list-item-meta>
				</a-list-item>
				<a-list-item>
					<a-list-item-meta>
						<template #title>
							<a-tag>Ctrl + K</a-tag> 清空输入
						</template>
					</a-list-item-meta>
				</a-list-item>
				<a-list-item>
					<a-list-item-meta>
						<template #title>
							<a-tag>Ctrl + B</a-tag> 粗体（Markdown模式）
						</template>
					</a-list-item-meta>
				</a-list-item>
				<a-list-item>
					<a-list-item-meta>
						<template #title>
							<a-tag>Ctrl + I</a-tag> 斜体（Markdown模式）
						</template>
					</a-list-item-meta>
				</a-list-item>
				<a-list-item>
					<a-list-item-meta>
						<template #title>
							<a-tag>Tab</a-tag> 代码补全提示
						</template>
					</a-list-item-meta>
				</a-list-item>
			</a-list>
		</a-modal>
		
		<!-- 文件上传（隐藏） -->
		<input
				ref="fileInputRef"
				type="file"
				multiple
				style="display: none"
				@change="handleFileSelect"
		/>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'

// Props & Emits
const props = defineProps<{
	modelValue: string
	sending: boolean
	placeholder?: string
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
	send: []
	attach: [files: File[]]
}>()

// 响应式数据
const localContent = ref(props.modelValue)
const messageType = ref<'TEXT' | 'MARKDOWN' | 'CODE'>('TEXT')
const attachments = ref<File[]>([])
const isComposing = ref(false)
const showShortcuts = ref(false)

// Refs
const textareaRef = ref()
const fileInputRef = ref<HTMLInputElement>()

// 计算属性
const charCount = computed(() => localContent.value.length)
const canSend = computed(() => {
	return localContent.value.trim().length > 0 && !props.sending && !isComposing.value
})

const placeholder = computed(() => {
	if (props.placeholder) return props.placeholder
	
	switch (messageType.value) {
		case 'MARKDOWN':
			return '输入消息（支持Markdown格式）... Ctrl+Enter 发送'
		case 'CODE':
			return '输入代码... Ctrl+Enter 发送'
		default:
			return '输入消息... Ctrl+Enter 发送'
	}
})

// 监听父组件的值变化
watch(() => props.modelValue, (newVal) => {
	localContent.value = newVal
})

// 监听本地值变化，同步到父组件
watch(localContent, (newVal) => {
	emit('update:modelValue', newVal)
})

// 方法
function handleSend() {
	if (!canSend.value) return
	
	// 如果有附件，先处理附件
	if (attachments.value.length > 0) {
		emit('attach', attachments.value)
		attachments.value = []
	}
	
	emit('send')
}

function handleClear() {
	localContent.value = ''
	attachments.value = []
	focusInput()
}

function handleKeydown(event: KeyboardEvent) {
	// Ctrl/Cmd + Enter 发送
	if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !isComposing.value) {
		event.preventDefault()
		handleSend()
		return
	}
	
	// Shift + Enter 换行（默认行为）
	if (event.shiftKey && event.key === 'Enter') {
		return
	}
	
	// Ctrl/Cmd + K 清空
	if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
		event.preventDefault()
		handleClear()
		return
	}
	
	// Markdown快捷键
	if (messageType.value === 'MARKDOWN') {
		// Ctrl/Cmd + B 粗体
		if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
			event.preventDefault()
			insertMarkdown('**', '**')
			return
		}
		
		// Ctrl/Cmd + I 斜体
		if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
			event.preventDefault()
			insertMarkdown('*', '*')
			return
		}
		
		// Ctrl/Cmd + ` 代码
		if ((event.ctrlKey || event.metaKey) && event.key === '`') {
			event.preventDefault()
			insertMarkdown('`', '`')
			return
		}
	}
	
	// Tab键处理（代码模式下插入制表符）
	if (event.key === 'Tab' && messageType.value === 'CODE') {
		event.preventDefault()
		insertText('  ')
	}
}

function handlePaste(event: ClipboardEvent) {
	const items = event.clipboardData?.items
	if (!items) return
	
	for (let i = 0; i < items.length; i++) {
		const item = items[i]
		if (item.type.startsWith('image/')) {
			event.preventDefault()
			const file = item.getAsFile()
			if (file) {
				handleImagePaste(file)
			}
			break
		}
	}
}

function handleImagePaste(file: File) {
	// 这里可以处理粘贴的图片
	Message.info('检测到图片粘贴，功能开发中')
	// 实际项目中，这里应该上传图片并插入图片链接
}

function handleAttachment() {
	fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
	const target = event.target as HTMLInputElement
	const files = Array.from(target.files || [])
	
	if (files.length === 0) return
	
	// 检查文件大小（限制10MB）
	const maxSize = 10 * 1024 * 1024
	const oversizedFiles = files.filter(f => f.size > maxSize)
	
	if (oversizedFiles.length > 0) {
		Message.warning(`以下文件超过10MB限制：${oversizedFiles.map(f => f.name).join(', ')}`)
		return
	}
	
	attachments.value.push(...files)
	
	// 清空input
	target.value = ''
}

function removeAttachment(index: number) {
	attachments.value.splice(index, 1)
}

function insertMarkdown(before: string, after: string) {
	const textarea = textareaRef.value?.$el?.querySelector('textarea')
	if (!textarea) return
	
	const start = textarea.selectionStart
	const end = textarea.selectionEnd
	const selectedText = localContent.value.substring(start, end)
	const replacement = `${before}${selectedText || '文本'}${after}`
	
	localContent.value =
			localContent.value.substring(0, start) +
			replacement +
			localContent.value.substring(end)
	
	// 设置光标位置
	nextTick(() => {
		const newCursorPos = start + before.length + (selectedText ? selectedText.length : 2)
		textarea.setSelectionRange(newCursorPos, newCursorPos)
		textarea.focus()
	})
}

function insertText(text: string) {
	const textarea = textareaRef.value?.$el?.querySelector('textarea')
	if (!textarea) return
	
	const start = textarea.selectionStart
	const end = textarea.selectionEnd
	
	localContent.value =
			localContent.value.substring(0, start) +
			text +
			localContent.value.substring(end)
	
	// 设置光标位置
	nextTick(() => {
		const newCursorPos = start + text.length
		textarea.setSelectionRange(newCursorPos, newCursorPos)
		textarea.focus()
	})
}

function focusInput() {
	nextTick(() => {
		textareaRef.value?.$el?.querySelector('textarea')?.focus()
	})
}

function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// 组件挂载时聚焦
focusInput()
</script>

<style scoped lang="scss">
.message-input-container {
	.input-toolbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 8px 0;
		border-bottom: 1px solid var(--color-border-1);
		margin-bottom: 12px;
		
		.input-status {
			display: flex;
			align-items: center;
			gap: 12px;
			font-size: 12px;
			color: var(--color-text-3);
			
			.char-count {
				color: var(--color-text-2);
			}
			
			.composing-hint {
				color: var(--color-primary-6);
			}
		}
	}
	
	.input-wrapper {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		
		.message-textarea {
			flex: 1;
			
			:deep(textarea) {
				border-radius: 20px;
				padding: 12px 16px;
				font-size: 15px;
				line-height: 1.5;
				resize: none;
				
				&:focus {
					border-color: var(--color-primary-6);
				}
				
				&:disabled {
					cursor: not-allowed;
					opacity: 0.6;
				}
			}
		}
		
		.input-actions {
			display: flex;
			align-items: center;
			gap: 8px;
			
			.send-button {
				width: 40px;
				height: 40px;
				background: linear-gradient(135deg, #667eea, #764ba2);
				border: none;
				
				&:hover:not(:disabled) {
					transform: scale(1.05);
				}
				
				&:disabled {
					opacity: 0.5;
					cursor: not-allowed;
				}
			}
		}
	}
	
	.attachments-preview {
		margin-top: 12px;
		padding: 12px;
		background: var(--color-fill-1);
		border-radius: 8px;
		
		.attachment-item {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 8px 12px;
			background: white;
			border-radius: 6px;
			border: 1px solid var(--color-border-1);
			
			.file-info {
				display: flex;
				align-items: center;
				gap: 8px;
				
				.file-size {
					font-size: 12px;
					color: var(--color-text-3);
				}
			}
		}
	}
}
</style>