// 基础响应结构
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

// 消息相关类型
export interface Message {
  id: number
  sessionId: number
  parentId: number | null
  role: 'user' | 'assistant'
  content: string
  messageType: 'TEXT' | 'MARKDOWN' | 'CODE'
  attachments: string[]
  tokenCount: number
  edited: boolean
  createTime: string
  metadata: Record<string, any>
  childrenCount: number
}

// 消息编辑历史
export interface EditHistory {
  versionIndex: number
  content: string
  editTime: string
  editorId: number
  editReason: string
  isCurrent: boolean
  charDifference: number
}

// 分支相关类型
export interface Branch {
  id: number
  sessionId: number
  name: string
  description: string
  parentBranchId: number | null
  forkMessageId: number | null
  headMessageId: number | null
  isMain: boolean
  status: string
  createTime: string
  updateTime: string
  forkMessagePreview?: string
  headMessagePreview?: string
  messageCount?: number
  divergenceDepth?: number
  metadata?: Record<string, any>
}

// 分支树节点
export interface BranchTreeNode {
  id: number
  name: string
  description: string
  isMain: boolean
  status: string
  forkMessageId: number | null
  headMessageId: number | null
  createTime: string
  children: BranchTreeNode[]
  depth: number
  isOnActivePath: boolean
}

// 分支树
export interface BranchTree {
  sessionId: number
  activeBranchId: number
  totalBranches: number
  root: BranchTreeNode
}

// 会话相关类型
export interface Session {
  id: number
  title: string
  description: string
  userId: number
  activeBranchId: number
  modelName: string
  modelConfig: Record<string, any>
  status: string
  createTime: string
  lastActiveTime: string
  activeBranch?: {
    id: number
    name: string
    headMessageId: number
    status: string
  }
}

// 创建分支请求
export interface CreateBranchRequest {
  sessionId: number
  forkMessageId?: number
  parentBranchId?: number
  branchName?: string
  description?: string
  forkReason?: string
  switchToNewBranch?: boolean
}

// 发送消息请求
export interface SendMessageRequest {
  sessionId: number
  content: string
  messageType?: 'TEXT' | 'MARKDOWN' | 'CODE'
  attachments?: string[]
  parentId?: number
  branchId?: number
}

// 编辑消息请求
export interface EditMessageRequest {
  messageId: number
  newContent: string
  editReason?: string
  regenerateResponse?: boolean
}

// 回退请求
export interface RollbackRequest {
  sessionId: number
  targetMessageId: number
  reason?: string
  saveCurrentAsCheckpoint?: boolean
  checkpointName?: string
}

// 删除消息结果
export interface DeleteMessageResult {
  deletedMessageId: number
  deletedCount: number
  newHeadId?: number
  message: string
  affectedMessageIds: number[]
}

// 回退结果
export interface RollbackResult {
  sessionId: number
  branchId: number
  oldHeadId: number
  newHeadId: number
  skippedMessageCount: number
  message: string
}

// 回退点
export interface RollbackPoint {
  messageId: number
  role: string
  contentPreview: string
  createTime: string
  depth: number
  isCurrentHead: boolean
}