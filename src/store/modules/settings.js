import { defineStore } from 'pinia'
import db from '../../db'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    apiKey: '',
    baseUrl: 'https://api.deepseek.com'
  }),
  
  actions: {
    // 从数据库加载设置
    async loadSettings() {
      try {
        const apiKeySetting = await db.settings.get('api_key')
        if (apiKeySetting) {
          this.apiKey = apiKeySetting.value
        }
        
        const baseUrlSetting = await db.settings.get('base_url')
        if (baseUrlSetting) {
          this.baseUrl = baseUrlSetting.value
        }
      } catch (error) {
        console.error('加载设置失败:', error)
      }
    },
    
    // 保存设置到数据库
    async saveSettings() {
      try {
        await db.settings.put({
          id: 'api_key',
          value: this.apiKey,
          updatedAt: Date.now()
        })
        
        await db.settings.put({
          id: 'base_url',
          value: this.baseUrl,
          updatedAt: Date.now()
        })
        
        return true
      } catch (error) {
        console.error('保存设置失败:', error)
        return false
      }
    },
    
    // 测试 API 连通性
    async testConnection() {
      if (!this.apiKey) {
        throw new Error('API Key 不能为空')
      }
      
      try {
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'user', content: 'Hi' }
            ],
            stream: false,
            temperature: 0.7
          })
        })
        
        if (!response.ok) {
          let errorMessage = '连接失败'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error?.message || errorMessage
          } catch {}
          throw new Error(errorMessage)
        }
        
        return true
      } catch (error) {
        console.error('测试连接失败:', error)
        throw error
      }
    }
  }
})