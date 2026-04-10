/**
 * 文本分块工具
 * 将长文本分割成多个小块，用于知识库智能检索
 */

/**
 * 将文本分割成多个块
 * @param {string} text - 要分割的文本
 * @param {number} chunkSize - 每个块的大小（默认500字）
 * @returns {Array} 分块数组，每个块包含 { id, text, startIdx, endIdx }
 */
export const splitTextIntoChunks = (text, chunkSize = 500) => {
  if (!text || typeof text !== 'string') {
    return []
  }

  const chunks = []
  let currentIndex = 0
  let chunkId = 1

  while (currentIndex < text.length) {
    // 尝试按段落分割
    const nextParagraphIndex = text.indexOf('\n\n', currentIndex + chunkSize)
    
    let endIndex
    if (nextParagraphIndex !== -1 && nextParagraphIndex - currentIndex <= chunkSize * 1.5) {
      // 如果找到合适的段落边界，就按段落分割
      endIndex = nextParagraphIndex
    } else {
      // 否则按固定长度分割
      endIndex = Math.min(currentIndex + chunkSize, text.length)
      
      // 尝试在句子边界分割
      const lastSentenceEnd = text.lastIndexOf('.', endIndex)
      const lastSentenceEnd2 = text.lastIndexOf('。', endIndex)
      const lastSentenceEnd3 = text.lastIndexOf('!', endIndex)
      const lastSentenceEnd4 = text.lastIndexOf('！', endIndex)
      const lastSentenceEnd5 = text.lastIndexOf('?', endIndex)
      const lastSentenceEnd6 = text.lastIndexOf('？', endIndex)
      
      const maxSentenceEnd = Math.max(
        lastSentenceEnd,
        lastSentenceEnd2,
        lastSentenceEnd3,
        lastSentenceEnd4,
        lastSentenceEnd5,
        lastSentenceEnd6
      )
      
      if (maxSentenceEnd > currentIndex + chunkSize * 0.7) {
        endIndex = maxSentenceEnd + 1
      }
    }

    const chunkText = text.substring(currentIndex, endIndex).trim()
    
    if (chunkText) {
      chunks.push({
        id: chunkId++,
        text: chunkText,
        startIdx: currentIndex,
        endIdx: endIndex
      })
    }

    currentIndex = endIndex
  }

  return chunks
}

/**
 * 计算文本的字数
 * @param {string} text - 要计算的文本
 * @returns {number} 字数
 */
export const countWords = (text) => {
  if (!text || typeof text !== 'string') {
    return 0
  }
  return text.length
}
