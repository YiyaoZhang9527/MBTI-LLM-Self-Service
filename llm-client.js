/**
 * LLM客户端接口
 * 连接Python后端进行MBTI分析
 */

class LLMClient {
    constructor(baseUrl = 'http://localhost:5001') {
        this.baseUrl = baseUrl;
        this.timeout = 300000; // 5分钟超时
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
     * 分析MBTI数据
     * @param {string} mbtiData - MBTI测试数据（markdown格式）
     * @param {string} analysisType - 分析类型 ('full' 或 'quick')
     * @returns {Promise} 分析结果
     */
    async analyzeMBTI(mbtiData, analysisType = 'full') {
        try {
            const response = await fetch(`${this.baseUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mbti_data: mbtiData,
                    analysis_type: analysisType
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
                throw new Error('分析请求超时，请稍后重试');
            }
            throw new Error(`分析失败: ${error.message}`);
        }
    }

    /**
     * 后续分析
     * @param {string} previousAnalysis - 之前的分析结果
     * @param {string} userQuestion - 用户问题
     * @returns {Promise} 分析结果
     */
    async followUpAnalysis(previousAnalysis, userQuestion) {
        try {
            const response = await fetch(`${this.baseUrl}/followup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    previous_analysis: previousAnalysis,
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
                throw new Error('后续分析请求超时，请稍后重试');
            }
            throw new Error(`后续分析失败: ${error.message}`);
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
}

/**
 * MBTI分析管理器
 * 集成到现有MBTI应用中
 */
class MBTIAnalysisManager {
    constructor() {
        this.llmClient = new LLMClient();
        this.isAnalyzing = false;
        this.currentAnalysis = null;
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
            this.showLoadingStatus('正在生成分析报告...');

            // 生成MBTI数据
            const mbtiData = window.app.dataRecorder.generateMarkdownReport();

            // 检查服务状态
            this.showLoadingStatus('检查AI服务状态...');
            const status = await this.llmClient.checkServiceStatus();

            if (status.status !== 'healthy') {
                throw new Error('AI服务当前不可用，请稍后重试');
            }

            // 执行分析
            this.showLoadingStatus('AI正在分析您的MBTI数据...');
            const result = await this.llmClient.analyzeMBTI(mbtiData, 'full');

            if (!result.success) {
                throw new Error(result.error || '分析失败');
            }

            // 保存分析结果
            this.currentAnalysis = result.response;

            // 导出分析报告
            this.showLoadingStatus('正在导出分析报告...');
            this.exportAnalysisReport(result.response);

            this.showSuccessStatus();

        } catch (error) {
            this.showErrorStatus(error.message);
            throw error;
        } finally {
            this.isAnalyzing = false;
        }
    }

    /**
     * 导出分析报告
     */
    exportAnalysisReport(analysisContent) {
        // 添加元数据
        const timestamp = new Date().toLocaleString('zh-CN');
        const testData = window.app.dataRecorder.testData;
        const mbtiResult = testData.mbtiResult || {};

        const reportWithMetadata = `# MBAI智能MBTI人格分析报告

> **生成时间**: ${timestamp}
> **测试ID**: ${testData.testId}
> **AI模型**: 基于您的MBTI数据智能生成
> **分析类型**: ${mbtiResult.type || '未知'} 人格深度分析

---

${analysisContent}

---

*🤖 本报告由MBAI智能分析系统生成，基于您的MBTI测试数据和先进的AI技术。报告仅供参考，如需专业心理咨询建议，请联系专业心理医生。*`;

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
            exportBtn.textContent = '✅ 分析完成！';
        }

        this.showStatusMessage('🎉 AI分析报告已生成并导出成功！', 'success');

        // 3秒后恢复原状态
        setTimeout(() => {
            if (exportBtn) {
                exportBtn.textContent = '导出分析模版';
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
window.LLMClient = LLMClient;
window.MBTIAnalysisManager = MBTIAnalysisManager;

// 初始化分析管理器
document.addEventListener('DOMContentLoaded', () => {
    window.mbtiAnalysisManager = new MBTIAnalysisManager();
    console.log('🤖 LLM客户端已初始化');
});