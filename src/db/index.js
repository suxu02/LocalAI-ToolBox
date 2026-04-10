import Dexie from 'dexie'

// 创建数据库实例
const db = new Dexie('LocalAIToolboxDB')

// 定义数据库版本和表结构
db.version(1).stores({
  // 配置表
  settings: 'id, value, updatedAt',
  // 模板表
  templates: '++id, title, content, variables, params, category, createdAt, updatedAt',
  // 知识库表
  knowledge: '++id, name, content, mode, wordCount, createdAt',
  // 历史记录表
  history: '++id, title, type, messages, tags, relatedId, createdAt'
})

export default db