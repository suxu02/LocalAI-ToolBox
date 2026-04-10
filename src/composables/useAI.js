import { useSettingsStore } from '../store/modules/settings'

export function useAI() {
  const settingsStore = useSettingsStore()
  let controller = null

  // 发送消息到 AI
  const sendMessage = async (messages, options = {}) => {
    // 重置控制器
    if (controller) {
      controller.abort()
    }
    controller = new AbortController()

    const {
      temperature = 0.7,
      model = 'deepseek-chat',
      onChunk,
      onComplete,
      onError
    } = options

    try {
      const response = await fetch(`${settingsStore.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settingsStore.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        let errorMessage = '请求失败'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error?.message || errorMessage
        } catch {}
        throw new Error(errorMessage)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''
      let buffer = '' // 新增缓冲区，防止JSON被截断

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          if (onComplete) {
            onComplete(accumulatedContent)
          }
          break
        }

        // 解码当前数据块，并拼接到缓冲区
        buffer += decoder.decode(value, { stream: true })
        
        // 按换行符分割
        const lines = buffer.split('\n')
        
        // 保留最后一个不完整的行（如果有的话）
        buffer = lines.pop() 

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              if (onComplete) {
                onComplete(accumulatedContent)
              }
              return accumulatedContent
            }

            try {
              // 只有当数据完整时才解析
              if (data) {
                const parsed = JSON.parse(data)
                const delta = parsed.choices[0]?.delta
                if (delta?.content) {
                  accumulatedContent += delta.content
                  if (onChunk) {
                    onChunk(delta.content, accumulatedContent)
                  }
                }
              }
            } catch (error) {
              // 如果解析失败，可能是数据还没传完，忽略这次错误
              console.warn('解析JSON中...', data)
            }
          }
        }
      }

      return accumulatedContent
    } catch (error) {
      if (error.name === 'AbortError') {
        // 用户主动中断
        return null
      }
      if (onError) {
        onError(error)
      }
      throw error
    }
  }

  // 中断请求
  const abort = () => {
    if (controller) {
      controller.abort()
      controller = null
    }
  }

  return {
    sendMessage,
    abort
  }
}