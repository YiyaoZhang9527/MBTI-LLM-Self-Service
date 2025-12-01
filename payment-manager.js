/**
 * 支付管理器 - 处理微信支付和测试码验证
 */
class PaymentManager {
    constructor() {
        this.paymentStatus = {
            isPaid: false,
            testCode: null,
            paymentMethod: null, // 'wechat' | 'testcode'
            verifiedAt: null,
            paymentId: null
        };

        this.testCodes = []; // 从服务器或配置加载的测试码列表
        this.paymentConfig = {
            amount: 9.9, // 默认价格，将从后端加载
            currency: 'CNY'
        };

        this.apiBaseUrl = null; // 动态发现的API基础URL

        this.initElements();
        this.bindEvents();
        this.loadPaymentConfig(); // 加载支付配置
    }

    initElements() {
        // 支付弹窗相关元素
        this.paymentModal = document.getElementById('payment-modal');
        this.closePaymentModalBtn = document.getElementById('close-payment-modal');
        this.wechatPayBtn = document.getElementById('wechat-pay-btn');
        this.confirmPaymentBtn = document.getElementById('confirm-payment-btn');
        this.testCodeInput = document.getElementById('test-code-input');
        this.verifyCodeBtn = document.getElementById('verify-code-btn');
        this.qrCodeSection = document.getElementById('qr-code-section');
        this.paymentStatus = document.getElementById('payment-status');

        // AI报告按钮
        this.exportMdBtn = document.getElementById('export-md-btn');
    }

    bindEvents() {
        // 关闭弹窗
        this.closePaymentModalBtn.addEventListener('click', () => this.hidePaymentModal());

        // 点击弹窗外部关闭
        this.paymentModal.addEventListener('click', (e) => {
            if (e.target === this.paymentModal) {
                this.hidePaymentModal();
            }
        });

        // 显示微信收款码
        this.wechatPayBtn.addEventListener('click', () => {
            this.showQRCode();
        });

        // 确认支付
        this.confirmPaymentBtn.addEventListener('click', () => {
            this.confirmPayment();
        });

        // 验证测试码
        this.verifyCodeBtn.addEventListener('click', () => {
            this.verifyTestCode();
        });

        // 测试码输入框回车验证
        this.testCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.verifyTestCode();
            }
        });

        // ESC键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.paymentModal.classList.contains('active')) {
                this.hidePaymentModal();
            }
        });
    }

    // 检查用户是否已付费
    async checkPaymentStatus() {
        // 检查localStorage中的支付状态
        const savedStatus = localStorage.getItem('mbti_payment_status');
        if (savedStatus) {
            try {
                const parsed = JSON.parse(savedStatus);
                // 检查是否在24小时内
                if (parsed.verifiedAt && (Date.now() - parsed.verifiedAt) < 24 * 60 * 60 * 1000) {
                    this.paymentStatus = parsed;
                    return true;
                }
            } catch (e) {
                console.error('解析支付状态失败:', e);
            }
        }

        // 如果API基础URL未设置，先尝试发现
        if (!this.apiBaseUrl) {
            await this.loadPaymentConfig();
            if (!this.apiBaseUrl) {
                console.warn('⚠️ 无法连接到后端服务，跳过服务器状态检查');
                return false;
            }
        }

        // 检查服务器端状态
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/payment/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    testId: this.getTestId()
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.paid) {
                    this.paymentStatus = {
                        isPaid: true,
                        paymentMethod: data.method,
                        verifiedAt: Date.now(),
                        paymentId: data.paymentId
                    };
                    this.savePaymentStatus();
                    return true;
                }
            }
        } catch (e) {
            console.error('检查支付状态失败:', e);
        }

        return false;
    }

    // 显示支付弹窗
    showPaymentModal() {
        this.paymentModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // 防止背景滚动

        // 重置UI状态
        this.qrCodeSection.classList.add('hidden');
        this.wechatPayBtn.classList.remove('hidden');
        this.confirmPaymentBtn.classList.add('hidden');
        this.wechatPayBtn.querySelector('.btn-text').textContent = '显示收款码';

        // 清空测试码输入
        this.testCodeInput.value = '';
        this.hidePaymentStatus();
    }

    // 隐藏支付弹窗
    hidePaymentModal() {
        this.paymentModal.classList.remove('active');
        document.body.style.overflow = ''; // 恢复滚动
        this.hidePaymentStatus();
    }

    // 显示二维码
    showQRCode() {
        const action = this.wechatPayBtn.dataset.action;

        if (action === 'show-qr') {
            // 显示二维码
            this.qrCodeSection.classList.remove('hidden');
            this.wechatPayBtn.dataset.action = 'hide-qr';
            this.wechatPayBtn.querySelector('.btn-text').textContent = '隐藏收款码';

            // 生成支付订单
            this.generatePaymentOrder();
        } else {
            // 隐藏二维码
            this.qrCodeSection.classList.add('hidden');
            this.wechatPayBtn.dataset.action = 'show-qr';
            this.wechatPayBtn.querySelector('.btn-text').textContent = '显示收款码';
            this.confirmPaymentBtn.classList.add('hidden');
        }
    }

    // 生成支付订单
    async generatePaymentOrder() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/payment/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: this.paymentConfig.amount,
                    product: 'ai_report',
                    testId: this.getTestId(),
                    mbtiType: this.getMBTIType()
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.paymentStatus.paymentId = data.orderId;
            }
        } catch (e) {
            console.error('生成支付订单失败:', e);
            // 即使失败也显示二维码，允许用户手动支付
        }
    }

    // 确认支付
    async confirmPayment() {
        if (!this.paymentStatus.paymentId) {
            this.showPaymentStatus('error', '支付订单未生成，请重试');
            return;
        }

        this.showPaymentStatus('loading', '正在验证支付状态...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/payment/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paymentId: this.paymentStatus.paymentId,
                    method: 'wechat'
                })
            });

            const data = await response.json();

            if (data.success && data.paid) {
                this.paymentSuccess('wechat', data.paymentId);
            } else {
                this.showPaymentStatus('error', '支付验证失败，请确认已完成支付');
            }
        } catch (e) {
            console.error('验证支付失败:', e);
            this.showPaymentStatus('error', '网络错误，请重试');
        }
    }

    // 验证测试码
    async verifyTestCode() {
        const testCode = this.testCodeInput.value.trim();

        if (!testCode) {
            this.showPaymentStatus('error', '请输入测试码');
            return;
        }

        this.showPaymentStatus('loading', '正在验证测试码...');

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/test-code/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: testCode,
                    testId: this.getTestId()
                })
            });

            const data = await response.json();

            if (data.success) {
                this.paymentSuccess('testcode', testCode);
            } else {
                this.showPaymentStatus('error', data.message || '测试码无效');
            }
        } catch (e) {
            console.error('验证测试码失败:', e);
            this.showPaymentStatus('error', '网络错误，请重试');
        }
    }

    // 支付成功
    paymentSuccess(method, identifier) {
        this.paymentStatus = {
            isPaid: true,
            testCode: method === 'testcode' ? identifier : null,
            paymentMethod: method,
            verifiedAt: Date.now(),
            paymentId: method === 'wechat' ? identifier : null
        };

        this.savePaymentStatus();
        this.updateUI();
        this.showPaymentStatus('success', '验证成功！正在生成AI分析报告...');

        // 延迟关闭弹窗并生成报告
        setTimeout(() => {
            this.hidePaymentModal();
            this.triggerAIReport();
        }, 2000);
    }

    // 保存支付状态到localStorage
    savePaymentStatus() {
        localStorage.setItem('mbti_payment_status', JSON.stringify(this.paymentStatus));
    }

    // 更新UI显示状态
    updateUI() {
        if (this.paymentStatus.isPaid) {
            this.exportMdBtn.classList.add('unlocked');
            this.exportMdBtn.querySelector('.btn-text')?.textContent?.includes('生成') ?
                null : this.exportMdBtn.innerHTML = '📄 生成AI分析报告 (已解锁)';
        }
    }

    // 触发AI报告生成
    triggerAIReport() {
        if (window.app && typeof window.app.exportMarkdown === 'function') {
            // 直接调用现有的导出功能，现在应该有权限了
            window.app.exportMarkdown();
        }
    }

    // 显示支付状态信息
    showPaymentStatus(type, message) {
        this.paymentStatus.classList.remove('hidden');
        const statusMessage = this.paymentStatus.querySelector('.status-message');
        const statusSpinner = this.paymentStatus.querySelector('.status-spinner');

        statusMessage.textContent = message;

        // 移除所有状态类
        this.paymentStatus.classList.remove('loading', 'success', 'error');

        // 添加对应的状态类
        this.paymentStatus.classList.add(type);

        // 控制加载动画显示
        if (type === 'loading') {
            statusSpinner.style.display = 'block';
        } else {
            statusSpinner.style.display = 'none';
        }

        // 成功状态时添加绿色背景，错误时添加红色背景
        if (type === 'success') {
            this.paymentStatus.style.background = 'rgba(40, 167, 69, 0.1)';
            this.paymentStatus.style.border = '1px solid rgba(40, 167, 69, 0.3)';
            statusMessage.style.color = '#28a745';
        } else if (type === 'error') {
            this.paymentStatus.style.background = 'rgba(220, 53, 69, 0.1)';
            this.paymentStatus.style.border = '1px solid rgba(220, 53, 69, 0.3)';
            statusMessage.style.color = '#dc3545';
        } else {
            this.paymentStatus.style.background = 'rgba(245, 208, 32, 0.1)';
            this.paymentStatus.style.border = '1px solid rgba(245, 208, 32, 0.3)';
            statusMessage.style.color = 'var(--primary-color)';
        }
    }

    // 隐藏支付状态信息
    hidePaymentStatus() {
        this.paymentStatus.classList.add('hidden');
        // 重置样式
        this.paymentStatus.style.background = '';
        this.paymentStatus.style.border = '';
    }

    // 获取测试ID
    getTestId() {
        return window.app && window.app.currentTestData ?
            window.app.currentTestData.testId : null;
    }

    // 获取MBTI类型
    getMBTIType() {
        return window.app && window.app.currentResult ?
            window.app.currentResult.type : null;
    }

    // 加载支付配置
    async loadPaymentConfig() {
        try {
            // 尝试多个可能的端口，优先使用5002（有正确环境变量的服务）
            const ports = [5002, 5001];
            let configLoaded = false;

            for (const port of ports) {
                try {
                    const response = await fetch(`http://localhost:${port}/api/payment/config`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            this.paymentConfig.amount = data.data.payment_amount;
                            this.paymentConfig.currency = data.data.currency;

                            // 设置API基础URL
                            this.apiBaseUrl = `http://localhost:${port}`;

                            // 更新页面中的价格显示
                            this.updatePriceDisplay();

                            console.log(`✅ 支付配置加载成功: ¥${this.paymentConfig.amount}`);
                            console.log(`🔗 API基础URL: ${this.apiBaseUrl}`);
                            configLoaded = true;
                            break;
                        }
                    }
                } catch (portError) {
                    console.log(`端口 ${port} 不可用，尝试下一个...`);
                }
            }

            if (!configLoaded) {
                throw new Error('无法连接到后端服务');
            }
        } catch (error) {
            console.error('❌ 加载支付配置失败:', error);
            // 使用默认价格
            console.log(`📦 使用默认价格: ¥${this.paymentConfig.amount}`);
        }
    }

    // 更新价格显示
    updatePriceDisplay() {
        // 更新支付描述中的价格
        const priceElements = document.querySelectorAll('.qr-price, [data-price-text]');
        priceElements.forEach(element => {
            if (element.classList.contains('qr-price')) {
                element.textContent = `¥${this.paymentConfig.amount}`;
            } else {
                element.textContent = `支付 ¥${this.paymentConfig.amount} 解锁完整AI分析报告`;
            }
        });

        // 更新支付按钮中的价格描述
        const wechatPayDescription = document.querySelector('.payment-option p');
        if (wechatPayDescription) {
            wechatPayDescription.textContent = `支付 ¥${this.paymentConfig.amount} 解锁完整AI分析报告`;
        }
    }

    // 检查权限并执行操作
    async checkPermissionAndExecute(callback) {
        const isPaid = await this.checkPaymentStatus();

        if (isPaid) {
            // 已付费，直接执行
            callback();
        } else {
            // 未付费，显示支付弹窗
            this.showPaymentModal();
        }
    }
}

// 初始化支付管理器
document.addEventListener('DOMContentLoaded', () => {
    window.paymentManager = new PaymentManager();
});