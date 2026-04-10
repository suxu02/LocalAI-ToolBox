export function useRAG() {
  // 搜索相关内容
  const searchRelevantContent = (query, content) => {
    if (!query || !content) {
      return {
        context: '',
        snippet: ''
      }
    }
    
    // 1. 分词逻辑：按空格、标点符号拆分成关键词
    const keywords = extractKeywords(query)
    
    // 2. 排序：优先匹配更长的关键词
    keywords.sort((a, b) => b.length - a.length)
    
    // 3. 遍历关键词进行匹配
    for (const keyword of keywords) {
      if (keyword.length < 2) continue // 跳过过短的关键词
      
      const lowerKeyword = keyword.toLowerCase()
      const lowerContent = content.toLowerCase()
      const index = lowerContent.indexOf(lowerKeyword)
      
      if (index !== -1) {
        // 计算上下文范围
        const start = Math.max(0, index - 500)
        const end = Math.min(content.length, index + lowerKeyword.length + 500)
        
        // 截取上下文
        const context = content.substring(start, end)
        
        // 截取引用片段
        const snippet = content.substring(Math.max(0, index - 10), Math.min(content.length, index + 40))
        
        return {
          context,
          snippet
        }
      }
    }
    
    // 4. 兜底策略：尝试搜索用户输入的前 10 个字符
    if (query.length > 10) {
      const fallbackKeyword = query.substring(0, 10)
      const lowerFallback = fallbackKeyword.toLowerCase()
      const lowerContent = content.toLowerCase()
      const index = lowerContent.indexOf(lowerFallback)
      
      if (index !== -1) {
        // 计算上下文范围
        const start = Math.max(0, index - 500)
        const end = Math.min(content.length, index + fallbackKeyword.length + 500)
        
        // 截取上下文
        const context = content.substring(start, end)
        
        // 截取引用片段
        const snippet = content.substring(Math.max(0, index - 10), Math.min(content.length, index + 40))
        
        return {
          context,
          snippet
        }
      }
    }
    
    // 未找到匹配内容
    return {
      context: '',
      snippet: ''
    }
  }
  
  // 批量搜索多个文档
  const searchMultipleDocuments = (query, documents) => {
    if (!query || !documents || documents.length === 0) {
      return []
    }
    
    const results = []
    
    for (const doc of documents) {
      const result = searchRelevantContent(query, doc.content)
      if (result.context) {
        results.push({
          document: doc,
          ...result
        })
      }
    }
    
    return results
  }
  
  // 提取关键词
  const extractKeywords = (text) => {
    // 按空格、标点符号拆分
    const tokens = text.split(/[\s\p{P}]+/u)
    // 过滤空字符串和过短的词
    return tokens.filter(token => token.trim().length > 1)
  }
  
  return {
    searchRelevantContent,
    searchMultipleDocuments
  }
}