/**
 * 简化的LLM客户端接口
 * 直接发送用户的markdown模板给LLM进行分析，支持后续对话
 */

class SimpleLLMClient {
    constructor(baseUrl = 'http://localhost:5001') {
        this.baseUrl = baseUrl;
        this.timeout = 300000; // 5分钟超时
        this.currentSession = null;
    }

    /**
     * 检查服务状态
     */
    async checkServiceStatus() {
        try {
            const response = await fetch(`${this.baseUrl}/status`);
            const data = await response.json();
            return data;
        } catch (error) {
            throw new Error(`无法连接到LLM服务: ${error.message}`);
        }
    }

    /**
     * 分析MBTI markdown模板
     * @param {string} markdownContent - 包含MBTI数据和分析模板的完整markdown
     * @returns {Promise} 分析结果
     */
    async analyzeMBTITemplate(markdownContent) {
        try {
            const response = await fetch(`${this.baseUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    markdown_content: markdownContent
                }),
                signal: AbortSignal.timeout(this.timeout)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            // 保存当前会话
            if (result.success && result.session_id) {
                this.currentSession = {
                    id: result.session_id,
                    analysis: result.analysis,
                    metadata: result.metadata
                };
            }

            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('分析请求超时，请稍后重试');
            }
            throw new Error(`分析失败: ${error.message}`);
        }
    }

    /**
     * 继续对话
     * @param {string} session_id - 会话ID
     * @param {string} userQuestion - 用户问题
     * @returns {Promise} 对话结果
     */
    async continueChat(userQuestion) {
        if (!this.currentSession) {
            throw new Error('没有活跃的分析会话');
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: this.currentSession.id,
                    user_question: userQuestion
                }),
                signal: AbortSignal.timeout(this.timeout)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP ${response.status}`);
            }

            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('对话请求超时，请稍后重试');
            }
            throw new Error(`对话失败: ${error.message}`);
        }
    }

    /**
     * 获取会话信息
     * @param {string} sessionId - 会话ID
     */
    async getSession(sessionId) {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            throw new Error(`获取会话信息失败: ${error.message}`);
        }
    }

    /**
     * 删除会话
     * @param {string} sessionId - 会话ID
     */
    async deleteSession(sessionId) {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            if (sessionId === this.currentSession?.id) {
                this.currentSession = null;
            }

            return data;
        } catch (error) {
            throw new Error(`删除会话失败: ${error.message}`);
        }
    }

    /**
     * 健康检查
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            const data = await response.json();
            return data.status === 'healthy';
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取当前会话
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * 清除当前会话
     */
    clearSession() {
        this.currentSession = null;
    }
}

/**
 * 简化的MBTI分析管理器
 * 直接使用用户markdown模板，支持对话功能
 */
class SimpleMBTIAnalysisManager {
    constructor() {
        this.llmClient = new SimpleLLMClient();
        this.isAnalyzing = false;
        this.chatMode = false;
    }

    /**
     * 生成分析报告并导出
     */
    async generateAndExportAnalysis() {
        if (this.isAnalyzing) {
            throw new Error('正在进行中，请等待完成');
        }

        if (!window.app || !window.app.dataRecorder) {
            throw new Error('MBTI应用未初始化');
        }

        try {
            this.isAnalyzing = true;

            // 显示加载状态
            this.showLoadingStatus('正在生成AI分析报告...');

            // 生成MBTI数据和模板
            const markdownContent = window.app.dataRecorder.generateMarkdownReport();

            // 检查服务状态
            this.showLoadingStatus('检查AI服务状态...');
            const status = await this.llmClient.checkServiceStatus();

            if (status.status !== 'healthy') {
                throw new Error('AI服务当前不可用，请稍后重试');
            }

            // 执行分析
            this.showLoadingStatus('AI正在分析您的MBTI数据...');
            const result = await this.llmClient.analyzeMBTITemplate(markdownContent);

            if (!result.success) {
                throw new Error(result.error || '分析失败');
            }

            // 导出分析报告
            this.showLoadingStatus('正在导出AI分析报告...');
            this.exportAIAnalysisReport(result.analysis, result.metadata);

            // 启用对话模式
            this.chatMode = true;
            this.showChatInterface();

            this.showSuccessStatus();

            return result;

        } catch (error) {
            this.showErrorStatus(error.message);
            throw error;
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * 发送聊天消息
     */
    async sendChatMessage(userQuestion) {
        if (!this.chatMode) {
            throw new Error('请先生成分析报告');
        }

        try {
            const result = await this.llmClient.continueChat(userQuestion);

            if (!result.success) {
                throw new Error(result.error || '对话失败');
            }

            return result;
        } catch (error) {
            throw new Error(`对话失败: ${error.message}`);
        }
    }

    /**
     * 导出AI分析报告
     */
    exportAIAnalysisReport(analysisContent, metadata) {
        // 添加元数据
        const timestamp = new Date().toLocaleString('zh-CN');
        const testData = window.app.dataRecorder.testData;
        const mbtiResult = testData.mbtiResult || {};

        const reportWithMetadata = `# MBAI智能MBTI人格分析报告

> **生成时间**: ${timestamp}
> **测试ID**: ${testData.testId}
> **AI模型**: ${metadata.model} (${metadata.analysis_time}s)
> **分析类型**: ${mbtiResult.type || '未知'} 人格智能分析
> **会话ID**: ${this.llmClient.getCurrentSession()?.id}

---

${analysisContent}

---

## 💬 继续对话

基于此分析报告，您可以继续提出问题，例如：
- 基于我的MBTI类型，适合哪些职业发展路径？
- 我在人际关系方面有什么需要注意的吗？
- 如何发挥我的MBTI优势？
- 有哪些个人成长建议？

*🤖 本报告由MBAI智能分析系统基于您的MBTI测试数据生成。报告仅供参考，如需专业心理咨询建议，请联系专业心理医生。*`;

        // 导出为Markdown文件
        const blob = new Blob([reportWithMetadata], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `MBTI_AI分析报告_${testData.testId}.md`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    }

    /**
     * 显示聊天界面
     */
    showChatInterface() {
        let chatContainer = document.getElementById('ai-chat-container');

        if (!chatContainer) {
            chatContainer = this.createChatInterface();

            // 插入到按钮后面
            const buttonContainer = document.querySelector('.form-buttons:last-child');
            if (buttonContainer) {
                buttonContainer.parentNode.insertBefore(chatContainer, buttonContainer.nextSibling);
            }
        }

        chatContainer.style.display = 'block';
    }

    /**
     * 创建聊天界面
     */
    createChatInterface() {
        const chatContainer = document.createElement('div');
        chatContainer.id = 'ai-chat-container';
        chatContainer.style.cssText = `
            margin: 20px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f9f9f9;
        `;

        chatContainer.innerHTML = `
            <h4 style="margin-top: 0; color: #333;">💬 继续对话</h4>
            <div id="chat-messages" style="height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; margin: 10px 0; background: white; border-radius: 4px;">
                <div style="color: #666; text-align: center; padding: 20px;">基于您的分析报告，您可以继续提问...</div>
            </div>
            <div style="display: flex; gap: 10px;">
                <input type="text" id="chat-input" placeholder="请输入您的问题..." style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                <button id="chat-send-btn" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">发送</button>
            </div>
        `;

        // 绑定发送按钮事件
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            const sendBtn = document.getElementById('chat-send-btn');

            const sendMessage = async () => {
                const question = input.value.trim();
                if (!question) return;

                // 显示用户消息
                this.addChatMessage('user', question);
                input.value = '';

                try {
                    sendBtn.disabled = true;
                    sendBtn.textContent = '发送中...';

                    const result = await this.sendChatMessage(question);
                    this.addChatMessage('assistant', result.response);

                } catch (error) {
                    this.addChatMessage('system', `错误: ${error.message}`);
                } finally {
                    sendBtn.disabled = false;
                    sendBtn.textContent = '发送';
                }
            };

            sendBtn.addEventListener('click', sendMessage);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessage();
                }
            });
        }, 100);

        return chatContainer;
    }

    /**
     * 添加聊天消息
     */
    addChatMessage(role, content) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            margin: 10px 0;
            padding: 8px 12px;
            border-radius: 8px;
            max-width: 80%;
            ${role === 'user' ? 'background: #007bff; color: white; margin-left: auto;' : ''}
            ${role === 'system' ? 'background: #dc3545; color: white; margin: 0 auto;' : ''}
            ${role === 'assistant' ? 'background: #e9ecef; color: #333;' : ''}
        `;

        const sender = role === 'user' ? '您' : role === 'system' ? '系统' : 'AI';
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${content}`;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 显示加载状态
     */
    showLoadingStatus(message) {
        // 更新按钮状态
        const exportBtn = document.getElementById('export-md-btn');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.textContent = message;
        }

        // 显示进度提示
        this.showStatusMessage(message, 'loading');
    }

    /**
     * 显示成功状态
     */
    showSuccessStatus() {
        const exportBtn = document.getElementById('export-md-btn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.textContent = '✅ 分析完成';
        }

        this.showStatusMessage('🎉 AI分析报告已生成！您可以继续对话提问。', 'success');

        // 3秒后恢复原状态
        setTimeout(() => {
            if (exportBtn) {
                exportBtn.textContent = '继续对话';
            }
        }, 3000);
    }

    /**
     * 显示错误状态
     */
    showErrorStatus(errorMessage) {
        const exportBtn = document.getElementById('export-md-btn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.textContent = '❌ 生成失败';
        }

        this.showStatusMessage(`⚠️ ${errorMessage}`, 'error');

        // 3秒后恢复原状态
        setTimeout(() => {
            if (exportBtn) {
                exportBtn.textContent = '导出分析模版';
            }
        }, 3000);
    }

    /**
     * 显示状态消息
     */
    showStatusMessage(message, type) {
        // 创建或更新状态消息元素
        let statusDiv = document.getElementById('llm-status-message');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'llm-status-message';
            statusDiv.style.cssText = `
                margin: 10px 0;
                padding: 10px;
                border-radius: 5px;
                font-size: 14px;
                text-align: center;
            `;

            // 插入到按钮后面
            const buttonContainer = document.querySelector('.form-buttons:last-child');
            if (buttonContainer) {
                buttonContainer.parentNode.insertBefore(statusDiv, buttonContainer.nextSibling);
            }
        }

        // 设置样式和内容
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;

        switch (type) {
            case 'loading':
                statusDiv.style.background = '#e3f2fd';
                statusDiv.style.color = '#1976d2';
                statusDiv.style.border = '1px solid #bbdefb';
                break;
            case 'success':
                statusDiv.style.background = '#e8f5e8';
                statusDiv.style.color = '#2e7d32';
                statusDiv.style.border = '1px solid #c8e6c9';
                break;
            case 'error':
                statusDiv.style.background = '#ffebee';
                statusDiv.style.color = '#c62828';
                statusDiv.style.border = '1px solid #ffcdd2';
                break;
        }
    }
}

// 导出给全局使用
window.SimpleLLMClient = SimpleLLMClient;
window.SimpleMBTIAnalysisManager = SimpleMBTIAnalysisManager;

// 初始化分析管理器
document.addEventListener('DOMContentLoaded', () => {
    window.simpleMBTIAnalysisManager = new SimpleMBTIAnalysisManager();
    console.log('🤖 简化LLM客户端已初始化');
});