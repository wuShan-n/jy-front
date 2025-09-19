<template>
	<div class="branch-panel-container">
		<!-- 面板标题 -->
		<div class="panel-header">
			<div class="panel-title">
				<icon-branch />
				<span>分支管理</span>
				<a-tag size="small" color="gray">{{ branches.length }}</a-tag>
			</div>
			<a-button type="text" size="mini" @click="toggleTreeView">
				<icon-apps v-if="!showTree" />
				<icon-mind-mapping v-else />
			</a-button>
		</div>
		
		<!-- 分支列表视图 -->
		<div v-if="!showTree" class="branch-list">
			<div
					v-for="branch in branches"
					:key="branch.id"
					class="branch-item"
					:class="{ active: branch.id === currentBranchId }"
					@click="handleSwitch(branch.id)"
			>
				<div class="branch-main">
					<div class="branch-name">
						<icon-bookmark v-if="branch.isMain" style="color: var(--color-primary-6)" />
						<icon-branch v-else style="color: var(--color-success-6)" />
						<span>{{ branch.name }}</span>
					</div>
					<a-dropdown trigger="hover" position="br">
						<a-button type="text" size="mini" @click.stop>
							<icon-more />
						</a-button>
						<template #content>
							<a-doption @click="handleRename(branch)">
								<icon-edit /> 重命名
							</a-doption>
							<a-doption @click="handleViewDetail(branch)">
								<icon-eye /> 查看详情
							</a-doption>
							<a-doption
									v-if="!branch.isMain"
									@click="handleDelete(branch.id)"
									style="color: var(--color-danger-6)"
							>
								<icon-delete /> 删除分支
							</a-doption>
						</template>
					</a-dropdown>
				</div>
				
				<div class="branch-info">
					<div v-if="branch.forkMessageId" class="info-item">
						<icon-code-square />
						<span>从消息 #{{ branch.forkMessageId }} 分叉</span>
					</div>
					<div class="info-item">
						<icon-message />
						<span>{{ branch.messageCount || 0 }} 条消息</span>
					</div>
					<div v-if="branch.description" class="branch-desc">
						{{ branch.description }}
					</div>
				</div>
			</div>
			
			<!-- 创建新分支按钮 -->
			<div class="create-branch-btn" @click="handleCreate">
				<icon-plus />
				<span>创建新分支</span>
			</div>
		</div>
		
		<!-- 分支树视图 -->
		<div v-else class="branch-tree">
			<div v-if="branchTree" class="tree-container">
				<BranchTreeNode
						:node="branchTree.root"
						:active-id="currentBranchId"
						@switch="handleSwitch"
				/>
			</div>
			<a-empty v-else description="暂无分支数据" />
		</div>
		
		<!-- 分支统计信息 -->
		<div class="panel-footer">
			<div class="stats-item">
				<span class="label">总分支数</span>
				<span class="value">{{ branches.length }}</span>
			</div>
			<div class="stats-item">
				<span class="label">最大深度</span>
				<span class="value">{{ maxDepth }}</span>
			</div>
		</div>
		
		<!-- 重命名模态框 -->
		<a-modal
				v-model:visible="renameVisible"
				title="重命名分支"
				@ok="confirmRename"
				@cancel="renameVisible = false"
		>
			<a-form :model="renameForm" layout="vertical">
				<a-form-item label="分支名称">
					<a-input v-model="renameForm.name" placeholder="输入新的分支名称" />
				</a-form-item>
				<a-form-item label="分支描述">
					<a-textarea
							v-model="renameForm.description"
							placeholder="更新分支描述（可选）"
							:rows="3"
					/>
				</a-form-item>
			</a-form>
		</a-modal>
		
		<!-- 分支详情抽屉 -->
		<a-drawer
				v-model:visible="detailVisible"
				:title="`分支详情: ${currentDetail?.name}`"
				:width="400"
		>
			<a-descriptions v-if="currentDetail" :column="1" bordered>
				<a-descriptions-item label="分支ID">
					{{ currentDetail.id }}
				</a-descriptions-item>
				<a-descriptions-item label="分支名称">
					{{ currentDetail.name }}
				</a-descriptions-item>
				<a-descriptions-item label="是否主分支">
					<a-tag v-if="currentDetail.isMain" color="blue">是</a-tag>
					<a-tag v-else color="gray">否</a-tag>
				</a-descriptions-item>
				<a-descriptions-item label="父分支ID">
					{{ currentDetail.parentBranchId || '无' }}
				</a-descriptions-item>
				<a-descriptions-item label="分叉点">
					消息 #{{ currentDetail.forkMessageId || '无' }}
				</a-descriptions-item>
				<a-descriptions-item label="HEAD消息">
					消息 #{{ currentDetail.headMessageId || '无' }}
				</a-descriptions-item>
				<a-descriptions-item label="消息数量">
					{{ currentDetail.messageCount || 0 }} 条
				</a-descriptions-item>
				<a-descriptions-item label="分叉深度">
					{{ currentDetail.divergenceDepth || 0 }} 层
				</a-descriptions-item>
				<a-descriptions-item label="创建时间">
					{{ formatTime(currentDetail.createTime) }}
				</a-descriptions-item>
				<a-descriptions-item label="更新时间">
					{{ formatTime(currentDetail.updateTime) }}
				</a-descriptions-item>
				<a-descriptions-item label="分支描述">
					{{ currentDetail.description || '无描述' }}
				</a-descriptions-item>
			</a-descriptions>
		</a-drawer>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Modal } from '@arco-design/web-vue'
import type { Branch, BranchTree } from '@/types'
import dayjs from 'dayjs'
import BranchTreeNode from './BranchTreeNode.vue'

// Props定义
const props = defineProps<{
	branches: Branch[]
	currentBranchId?: number
	branchTree: BranchTree | null
}>()

// Emits定义
const emit = defineEmits<{
	switch: [branchId: number]
	create: []
	delete: [branchId: number]
	rename: [branchId: number, name: string, description?: string]
}>()

// 响应式数据
const showTree = ref(false)
const renameVisible = ref(false)
const detailVisible = ref(false)
const currentDetail = ref<Branch | null>(null)

const renameForm = ref({
	branchId: 0,
	name: '',
	description: ''
})

// 计算属性
const maxDepth = computed(() => {
	if (!props.branchTree) return 0
	
	function getMaxDepth(node: any, depth = 0): number {
		if (!node.children || node.children.length === 0) {
			return depth
		}
		return Math.max(...node.children.map((child: any) => getMaxDepth(child, depth + 1)))
	}
	
	return getMaxDepth(props.branchTree.root)
})

// 方法
function toggleTreeView() {
	showTree.value = !showTree.value
}

function handleSwitch(branchId: number) {
	emit('switch', branchId)
}

function handleCreate() {
	emit('create')
}

function handleDelete(branchId: number) {
	Modal.confirm({
		title: '确认删除',
		content: '删除分支后将无法恢复，分支上的所有消息也将被删除。确定要继续吗？',
		okText: '确认删除',
		cancelText: '取消',
		onOk: () => {
			emit('delete', branchId)
		}
	})
}

function handleRename(branch: Branch) {
	renameForm.value = {
		branchId: branch.id,
		name: branch.name,
		description: branch.description || ''
	}
	renameVisible.value = true
}

function confirmRename() {
	if (!renameForm.value.name.trim()) {
		return
	}
	
	emit('rename',
			renameForm.value.branchId,
			renameForm.value.name,
			renameForm.value.description
	)
	renameVisible.value = false
}

function handleViewDetail(branch: Branch) {
	currentDetail.value = branch
	detailVisible.value = true
}

function formatTime(time: string) {
	return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped lang="scss">
.branch-panel-container {
	height: 100%;
	display: flex;
	flex-direction: column;
	
	.panel-header {
		padding: 16px;
		border-bottom: 1px solid var(--color-border-1);
		display: flex;
		justify-content: space-between;
		align-items: center;
		
		.panel-title {
			display: flex;
			align-items: center;
			gap: 8px;
			font-size: 16px;
			font-weight: 500;
		}
	}
	
	.branch-list {
		flex: 1;
		padding: 16px;
		overflow-y: auto;
		
		.branch-item {
			padding: 12px;
			margin-bottom: 12px;
			background: var(--color-fill-1);
			border-radius: 8px;
			cursor: pointer;
			transition: all 0.3s;
			border: 2px solid transparent;
			
			&:hover {
				background: var(--color-fill-2);
				transform: translateX(4px);
			}
			
			&.active {
				background: rgba(var(--primary-6), 0.1);
				border-color: rgb(var(--primary-6));
			}
			
			.branch-main {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 8px;
				
				.branch-name {
					display: flex;
					align-items: center;
					gap: 6px;
					font-weight: 500;
				}
			}
			
			.branch-info {
				.info-item {
					display: flex;
					align-items: center;
					gap: 4px;
					font-size: 12px;
					color: var(--color-text-3);
					margin-bottom: 4px;
				}
				
				.branch-desc {
					font-size: 12px;
					color: var(--color-text-2);
					margin-top: 8px;
					line-height: 1.5;
				}
			}
		}
		
		.create-branch-btn {
			padding: 12px;
			border: 2px dashed var(--color-border-2);
			border-radius: 8px;
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			cursor: pointer;
			color: var(--color-text-2);
			transition: all 0.3s;
			
			&:hover {
				border-color: rgb(var(--primary-6));
				color: rgb(var(--primary-6));
				background: rgba(var(--primary-6), 0.05);
			}
		}
	}
	
	.branch-tree {
		flex: 1;
		padding: 16px;
		overflow: auto;
		
		.tree-container {
			min-width: fit-content;
		}
	}
	
	.panel-footer {
		padding: 12px 16px;
		border-top: 1px solid var(--color-border-1);
		display: flex;
		justify-content: space-around;
		
		.stats-item {
			display: flex;
			flex-direction: column;
			align-items: center;
			
			.label {
				font-size: 12px;
				color: var(--color-text-3);
			}
			
			.value {
				font-size: 18px;
				font-weight: 600;
				color: rgb(var(--primary-6));
			}
		}
	}
}
</style>