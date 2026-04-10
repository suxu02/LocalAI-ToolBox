/**
 * BM25 算法封装
 * 用于计算查询与文档分块之间的相关性
 */

/**
 * 简单的分词函数
 * @param {string} text - 要分词的文本
 * @returns {Array} 词数组
 */
const tokenize = (text) => {
  if (!text || typeof text !== 'string') {
    return []
  }
  
  // 简单的中英文分词
  // 英文按空格分词，中文按字符分词
  const tokens = []
  let currentToken = ''
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const isChinese = /[\u4e00-\u9fa5]/.test(char)
    const isEnglish = /[a-zA-Z0-9]/.test(char)
    
    if (isChinese) {
      // 中文字符单独作为一个词
      if (currentToken) {
        tokens.push(currentToken.toLowerCase())
        currentToken = ''
      }
      tokens.push(char)
    } else if (isEnglish) {
      // 英文和数字组成一个词
      currentToken += char
    } else {
      // 其他字符作为分隔符
      if (currentToken) {
        tokens.push(currentToken.toLowerCase())
        currentToken = ''
      }
    }
  }
  
  if (currentToken) {
    tokens.push(currentToken.toLowerCase())
  }
  
  return tokens
}

/**
 * 计算词频 (TF)
 * @param {Array} tokens - 词数组
 * @returns {Object} 词频映射
 */
const calculateTF = (tokens) => {
  const tf = {}
  const totalTokens = tokens.length
  
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1
  })
  
  // 计算归一化的词频
  Object.keys(tf).forEach(token => {
    tf[token] = tf[token] / totalTokens
  })
  
  return tf
}

/**
 * 计算逆文档频率 (IDF)
 * @param {Array} allTokens - 所有文档的词数组
 * @returns {Object} 逆文档频率映射
 */
const calculateIDF = (allTokens) => {
  const idf = {}
  const documentCount = allTokens.length
  
  // 统计每个词出现在多少个文档中
  const documentFrequency = {}
  allTokens.forEach(tokens => {
    const uniqueTokens = new Set(tokens)
    uniqueTokens.forEach(token => {
      documentFrequency[token] = (documentFrequency[token] || 0) + 1
    })
  })
  
  // 计算逆文档频率
  Object.keys(documentFrequency).forEach(token => {
    idf[token] = Math.log((documentCount + 1) / (documentFrequency[token] + 1)) + 1
  })
  
  return idf
}

/**
 * BM25 算法实现
 * @param {string} query - 用户查询
 * @param {Array} chunks - 文档分块数组
 * @param {Object} options - 算法参数
 * @returns {Array} 按相关性排序的分块数组（Top 3）
 */
export const useBM25 = () => {
  const search = (query, chunks, options = {}) => {
    if (!query || !chunks || chunks.length === 0) {
      return []
    }
    
    const { k1 = 1.2, b = 0.75 } = options
    
    // 分词
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) {
      return []
    }
    
    // 为每个分块计算词频
    const chunkTokens = chunks.map(chunk => ({
      chunk,
      tokens: tokenize(chunk.text),
      tf: calculateTF(tokenize(chunk.text))
    }))
    
    // 计算逆文档频率
    const allTokens = chunkTokens.map(item => item.tokens)
    const idf = calculateIDF(allTokens)
    
    // 计算平均文档长度
    const avgDocLength = chunkTokens.reduce((sum, item) => sum + item.tokens.length, 0) / chunkTokens.length
    
    // 计算每个分块的 BM25 得分
    const scoredChunks = chunkTokens.map(({ chunk, tokens, tf }) => {
      const docLength = tokens.length
      const score = queryTokens.reduce((sum, token) => {
        if (!tf[token] || !idf[token]) {
          return sum
        }
        
        const numerator = tf[token] * (k1 + 1)
        const denominator = tf[token] + k1 * (1 - b + b * (docLength / avgDocLength))
        return sum + idf[token] * (numerator / denominator)
      }, 0)
      
      return {
        ...chunk,
        score
      }
    })
    
    // 按得分排序，返回 Top 3
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }
  
  return {
    search
  }
}
