import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session, Message, Branch, BranchTree, SendMessageRequest } from '@/types'
import api from '@/api/services'
import { Message as ArcoMessage } from '@arco-design/web-vue'

export const useSessionStore = defineStore('session', () => {
    // 状态定义
    const currentSession = ref<Session | null>(null) // 当前会话
    const sessions = ref<Session[]>([]) // 会话列表
    const messages = ref<Message[]>([]) // 当前会话的消息列表
    const branches = ref<Branch[]>([]) // 当前会话的分支列表
    const branchTree = ref<BranchTree | null>(null) // 分支树结构
    const loading = ref(false) // 全局加载状态
    const sendingMessage = ref(false) // 发送消息加载状态

    // 计算属性
    const currentBranch = computed(() => {
        if (!currentSession.value) return null
        return branches.value.find(b => b.id === currentSession.value?.activeBranchId)
    })

    const messageTree = computed(() => {
        // 将消息列表构建成树形结构，方便显示分支关系
        const messageMap = new Map<number, Message & { children: Message[] }>()

        // 首先创建所有消息的映射，并添加children属性
        messages.value.forEach(msg => {
            messageMap.set(msg.id, { ...msg, children: [] })
        })

        // 构建父子关系
        const roots: (Message & { children: Message[] })[] = []
        messageMap.forEach(msg => {
            if (msg.parentId && messageMap.has(msg.parentId)) {
                messageMap.get(msg.parentId)!.children.push(msg)
            } else if (!msg.parentId) {
                roots.push(msg)
            }
        })

        return roots
    })

    // Actions - 会话管理
    async function createSession(title: string, description?: string) {
        try {
            loading.value = true
            const response = await api.conversation.createSession({
                title,
                description,
                modelName: 'gpt-4' // 默认使用gpt-4
            })

            if (response.code === 200) {
                currentSession.value = response.data
                // 创建会话后，自动获取初始分支
                await fetchBranches(response.data.id)
                ArcoMessage.success('会话创建成功')
                return response.data
            } else {
                throw new Error(response.message)
            }
        } catch (error) {
            ArcoMessage.error('创建会话失败')
            throw error
        } finally {
            loading.value = false
        }
    }

    async function fetchSessions(limit: number = 20) {
        try {
            loading.value = true
            const response = await api.conversation.listSessions(limit)
            if (response.code === 200) {
                sessions.value = response.data
            }
        } catch (error) {
            ArcoMessage.error('获取会话列表失败')
        } finally {
            loading.value = false
        }
    }

    async function loadSession(sessionId: number) {
        try {
            loading.value = true
            const response = await api.conversation.getSessionDetail(sessionId)
            if (response.code === 200) {
                currentSession.value = response.data
                // 同时加载消息历史和分支信息
                await Promise.all([
                    fetchMessages(sessionId),
                    fetchBranches(sessionId),
                    fetchBranchTree(sessionId)
                ])
            }
        } catch (error) {
            ArcoMessage.error('加载会话失败')
        } finally {
            loading.value = false
        }
    }

    // Actions - 消息管理
    async function sendMessage(content: string, options?: Partial<SendMessageRequest>) {
        if (!currentSession.value) {
            ArcoMessage.warning('请先选择或创建会话')
            return
        }

        try {
            sendingMessage.value = true
            const request: SendMessageRequest = {
                sessionId: currentSession.value.id,
                content,
                messageType: 'TEXT',
                ...options
            }

            const response = await api.conversation.sendMessage(request)
            if (response.code === 200) {
                // 添加新消息到列表
                messages.value.push(response.data)
                return response.data
            } else {
                throw new Error(response.message)
            }
        } catch (error) {
            ArcoMessage.error('发送消息失败')
            throw error
        } finally {
            sendingMessage.value = false
        }
    }

    async function fetchMessages(sessionId: number) {
        try {
            const response = await api.conversation.getHistory(sessionId)
            if (response.code === 200) {
                messages.value = response.data
            }
        } catch (error) {
            console.error('获取消息历史失败:', error)
        }
    }

    async function editMessage(messageId: number, newContent: string, regenerateResponse: boolean = false) {
        try {
            const response = await api.edit.editMessage({
                messageId,
                newContent,
                regenerateResponse
            })

            if (response.code === 200) {
                // 更新本地消息
                const index = messages.value.findIndex(m => m.id === messageId)
                if (index !== -1) {
                    messages.value[index] = response.data
                }
                ArcoMessage.success('消息已编辑')
                return response.data
            }
        } catch (error) {
            ArcoMessage.error('编辑消息失败')
            throw error
        }
    }

    async function deleteMessage(messageId: number, cascade: boolean = false) {
        try {
            const response = await api.message.deleteMessage(messageId, cascade)
            if (response.code === 200) {
                // 从本地列表中移除被删除的消息
                const affectedIds = response.data.affectedMessageIds
                messages.value = messages.value.filter(m => !affectedIds.includes(m.id))
                ArcoMessage.success(`已删除 ${response.data.deletedCount} 条消息`)
                return response.data
            }
        } catch (error) {
            ArcoMessage.error('删除消息失败')
            throw error
        }
    }

    // Actions - 分支管理
    async function fetchBranches(sessionId: number) {
        try {
            const response = await api.branch.listBranches(sessionId)
            if (response.code === 200) {
                branches.value = response.data
            }
        } catch (error) {
            console.error('获取分支列表失败:', error)
        }
    }

    async function fetchBranchTree(sessionId: number) {
        try {
            const response = await api.branch.getBranchTree(sessionId)
            if (response.code === 200) {
                branchTree.value = response.data
            }
        } catch (error) {
            console.error('获取分支树失败:', error)
        }
    }

    async function createBranch(name: string, description?: string, forkMessageId?: number) {
        if (!currentSession.value) return

        try {
            const response = await api.branch.createBranch({
                sessionId: currentSession.value.id,
                branchName: name,
                description,
                forkMessageId,
                switchToNewBranch: true // 默认切换到新分支
            })

            if (response.code === 200) {
                // 更新本地分支列表
                branches.value.push(response.data)
                // 更新当前会话的活跃分支
                currentSession.value.activeBranchId = response.data.id
                // 重新获取分支树
                await fetchBranchTree(currentSession.value.id)
                ArcoMessage.success('分支创建成功')
                return response.data
            }
        } catch (error) {
            ArcoMessage.error('创建分支失败')
            throw error
        }
    }

    async function switchBranch(branchId: number) {
        if (!currentSession.value) return

        try {
            const response = await api.branch.switchBranch(currentSession.value.id, branchId)
            if (response.code === 200) {
                // 更新当前会话的活跃分支
                currentSession.value.activeBranchId = branchId
                // 重新加载消息历史（因为不同分支可能有不同的消息）
                await fetchMessages(currentSession.value.id)
                ArcoMessage.success('已切换分支')
                return response.data
            }
        } catch (error) {
            ArcoMessage.error('切换分支失败')
            throw error
        }
    }

    async function deleteBranch(branchId: number) {
        if (!currentSession.value) return

        try {
            const response = await api.branch.deleteBranch(branchId)
            if (response.code === 200) {
                // 从本地列表中移除分支
                branches.value = branches.value.filter(b => b.id !== branchId)
                // 重新获取分支树
                await fetchBranchTree(currentSession.value.id)
                ArcoMessage.success('分支已删除')
            }
        } catch (error) {
            ArcoMessage.error('删除分支失败')
            throw error
        }
    }

    // Actions - 历史回退
    async function rollbackToMessage(targetMessageId: number, reason?: string) {
        if (!currentSession.value) return

        try {
            const response = await api.message.rollback({
                sessionId: currentSession.value.id,
                targetMessageId,
                reason
            })

            if (response.code === 200) {
                // 重新加载消息历史
                await fetchMessages(currentSession.value.id)
                ArcoMessage.success(`已回退到消息 #${targetMessageId}`)
                return response.data
            }
        } catch (error) {
            ArcoMessage.error('回退失败')
            throw error
        }
    }

    // 重置store状态
    function resetState() {
        currentSession.value = null
        sessions.value = []
        messages.value = []
        branches.value = []
        branchTree.value = null
    }

    return {
        // 状态
        currentSession,
        sessions,
        messages,
        branches,
        branchTree,
        loading,
        sendingMessage,

        // 计算属性
        currentBranch,
        messageTree,

        // Actions
        createSession,
        fetchSessions,
        loadSession,
        sendMessage,
        fetchMessages,
        editMessage,
        deleteMessage,
        fetchBranches,
        fetchBranchTree,
        createBranch,
        switchBranch,
        deleteBranch,
        rollbackToMessage,
        resetState
    }
})