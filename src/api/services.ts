import axios from 'axios'
import type {
    ApiResponse,
    Message,
    EditHistory,
    Branch,
    BranchTree,
    Session,
    CreateBranchRequest,
    SendMessageRequest,
    EditMessageRequest,
    RollbackRequest,
    DeleteMessageResult,
    RollbackResult,
    RollbackPoint
} from '@/types'

// 创建axios实例，设置基础配置
const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器：可以在这里添加认证token等
api.interceptors.request.use(
    config => {
        // 如果需要，可以在这里添加认证token
        // const token = localStorage.getItem('token')
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`
        // }
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 响应拦截器：统一处理错误
api.interceptors.response.use(
    response => response.data,
    error => {
        const message = error.response?.data?.message || '网络错误，请稍后重试'
        // 这里可以集成你的UI库的消息提示
        console.error('API Error:', message)
        return Promise.reject(error)
    }
)

// 编辑消息相关API
export const editApi = {
    // 编辑消息内容
    editMessage: (data: EditMessageRequest): Promise<ApiResponse<Message>> =>
        api.put('/edit/message/edit', data),

    // 获取消息的编辑历史
    getEditHistory: (messageId: number): Promise<ApiResponse<EditHistory[]>> =>
        api.get(`/edit/message/${messageId}/history`),

    // 恢复消息到指定版本
    restoreMessage: (messageId: number, versionIndex: number): Promise<ApiResponse<Message>> =>
        api.put(`/edit/message/${messageId}/restore/${versionIndex}`),

    // 比较两个版本的差异
    diffVersions: (messageId: number, fromVersion: number, toVersion: number): Promise<ApiResponse<any>> =>
        api.get(`/edit/message/${messageId}/diff`, { params: { fromVersion, toVersion } })
}

// 分支管理相关API
export const branchApi = {
    // 创建新分支
    createBranch: (data: CreateBranchRequest): Promise<ApiResponse<Branch>> =>
        api.post('/branch/create', data),

    // 切换到指定分支
    switchBranch: (sessionId: number, branchId: number): Promise<ApiResponse<Branch>> =>
        api.put(`/branch/${sessionId}/switch/${branchId}`),

    // 获取会话的所有分支列表
    listBranches: (sessionId: number): Promise<ApiResponse<Branch[]>> =>
        api.get(`/branch/${sessionId}/list`),

    // 获取分支详情
    getBranchDetail: (branchId: number): Promise<ApiResponse<Branch>> =>
        api.get(`/branch/detail/${branchId}`),

    // 获取分支树结构
    getBranchTree: (sessionId: number): Promise<ApiResponse<BranchTree>> =>
        api.get(`/branch/${sessionId}/tree`),

    // 删除分支
    deleteBranch: (branchId: number): Promise<ApiResponse<string>> =>
        api.delete(`/branch/${branchId}`),

    // 重命名分支
    renameBranch: (branchId: number, name: string, description?: string): Promise<ApiResponse<Branch>> =>
        api.put(`/branch/${branchId}/rename`, null, { params: { name, description } }),

    // 从当前位置快速创建分支
    forkHere: (sessionId: number, branchName?: string): Promise<ApiResponse<Branch>> =>
        api.post('/branch/fork-here', null, { params: { sessionId, branchName } })
}

// 会话管理相关API
export const conversationApi = {
    // 创建新会话
    createSession: (data: {
        title: string
        description?: string
        modelName?: string
        modelConfig?: Record<string, any>
    }): Promise<ApiResponse<Session>> =>
        api.post('/conversation/session', data),

    // 发送消息并获取AI回复
    sendMessage: (data: SendMessageRequest): Promise<ApiResponse<Message>> =>
        api.post('/conversation/message', data),

    // 获取会话的对话历史
    getHistory: (sessionId: number): Promise<ApiResponse<Message[]>> =>
        api.get(`/conversation/${sessionId}/history`),

    // 获取会话详情
    getSessionDetail: (sessionId: number): Promise<ApiResponse<Session>> =>
        api.get(`/conversation/${sessionId}`),

    // 获取用户的会话列表
    listSessions: (limit: number = 20): Promise<ApiResponse<Session[]>> =>
        api.get('/conversation/sessions', { params: { limit } })
}

// 消息管理相关API
export const messageApi = {
    // 删除消息
    deleteMessage: (messageId: number, cascade: boolean = false): Promise<ApiResponse<DeleteMessageResult>> =>
        api.delete(`/message/manage/${messageId}`, { params: { cascade } }),

    // 批量删除消息
    batchDeleteMessages: (messageIds: number[]): Promise<ApiResponse<any>> =>
        api.delete('/message/manage/batch', { data: messageIds }),

    // 恢复已删除的消息
    restoreMessage: (messageId: number): Promise<ApiResponse<Message>> =>
        api.put(`/message/manage/${messageId}/restore`),

    // 回退到指定消息
    rollback: (data: RollbackRequest): Promise<ApiResponse<RollbackResult>> =>
        api.post('/message/manage/rollback', data),

    // 获取可回退的历史点
    getRollbackPoints: (sessionId: number, limit: number = 50): Promise<ApiResponse<RollbackPoint[]>> =>
        api.get(`/message/manage/${sessionId}/rollback-points`, { params: { limit } }),

    // 前进到最新消息
    forward: (sessionId: number): Promise<ApiResponse<any>> =>
        api.post(`/message/manage/${sessionId}/forward`),

    // 清理已删除的消息（永久删除）
    cleanup: (sessionId: number): Promise<ApiResponse<any>> =>
        api.delete(`/message/manage/${sessionId}/cleanup`, { params: { confirm: 'CONFIRM' } })
}

// 导出所有API服务
export default {
    edit: editApi,
    branch: branchApi,
    conversation: conversationApi,
    message: messageApi
}