import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class PaymentService:
    """支付和测试码验证服务"""

    def __init__(self):
        self.test_codes = self._load_test_codes()
        self.test_code_usage = {}  # 测试码使用记录
        self.payments = {}  # 支付记录
        self.test_code_expiry_hours = int(os.getenv('TEST_CODE_EXPIRY_HOURS', '24'))
        self.payment_amount = float(os.getenv('PAYMENT_AMOUNT', '9.9'))

    def _load_test_codes(self) -> List[str]:
        """从环境变量加载测试码"""
        test_codes_str = os.getenv('TEST_CODES', '')
        if test_codes_str:
            return [code.strip() for code in test_codes_str.split(',') if code.strip()]
        return []

    def verify_test_code(self, code: str, test_id: str = None) -> Dict:
        """验证测试码"""
        if not code or not self.test_codes:
            return {
                'success': False,
                'message': '无效的测试码'
            }

        # 检查测试码是否存在
        if code not in self.test_codes:
            return {
                'success': False,
                'message': '测试码不存在'
            }

        # 检查测试码是否已过期
        if code in self.test_code_usage:
            usage = self.test_code_usage[code]
            expiry_time = usage['verified_at'] + timedelta(hours=self.test_code_expiry_hours)

            if datetime.now() > expiry_time:
                # 测试码已过期，允许重新使用
                del self.test_code_usage[code]
            else:
                return {
                    'success': False,
                    'message': '测试码已被使用'
                }

        # 验证成功，记录使用
        self.test_code_usage[code] = {
            'test_id': test_id,
            'verified_at': datetime.now(),
            'expires_at': datetime.now() + timedelta(hours=self.test_code_expiry_hours)
        }

        return {
            'success': True,
            'message': '测试码验证成功',
            'expires_at': self.test_code_usage[code]['expires_at'].isoformat()
        }

    def create_payment_order(self, test_id: str = None, mbti_type: str = None, product: str = 'ai_report') -> Dict:
        """创建支付订单"""
        order_id = str(uuid.uuid4())

        self.payments[order_id] = {
            'order_id': order_id,
            'test_id': test_id,
            'mbti_type': mbti_type,
            'product': product,
            'amount': self.payment_amount,
            'currency': 'CNY',
            'status': 'pending',
            'created_at': datetime.now(),
            'method': 'wechat'
        }

        return {
            'success': True,
            'order_id': order_id,
            'amount': self.payment_amount,
            'payment_url': f'/payment/{order_id}'
        }

    def verify_payment(self, payment_id: str, method: str = 'wechat') -> Dict:
        """验证支付状态"""
        if payment_id not in self.payments:
            return {
                'success': False,
                'message': '支付订单不存在'
            }

        payment = self.payments[payment_id]

        # 在实际应用中，这里应该调用微信支付API验证支付状态
        # 由于我们使用手动支付，这里模拟一个简单的验证逻辑

        # 检查订单创建时间，如果超过30分钟认为支付失败
        if datetime.now() - payment['created_at'] > timedelta(minutes=30):
            return {
                'success': False,
                'message': '支付订单已过期'
            }

        # 模拟支付验证 - 在实际应用中需要调用真实的支付API
        # 这里假设用户点击"我已支付"就是支付成功
        payment['status'] = 'paid'
        payment['verified_at'] = datetime.now()

        return {
            'success': True,
            'message': '支付验证成功',
            'order_id': payment_id
        }

    def check_payment_status(self, test_id: str = None, order_id: str = None) -> Dict:
        """检查支付状态"""
        if order_id and order_id in self.payments:
            payment = self.payments[order_id]
            return {
                'success': True,
                'paid': payment['status'] == 'paid',
                'method': payment.get('method'),
                'payment_id': order_id
            }

        # 检查是否有任何有效的支付记录
        if test_id:
            for payment_id, payment in self.payments.items():
                if (payment['test_id'] == test_id and
                    payment['status'] == 'paid' and
                    payment['verified_at'] and
                    datetime.now() - payment['verified_at'] < timedelta(hours=24)):
                    return {
                        'success': True,
                        'paid': True,
                        'method': payment.get('method'),
                        'payment_id': payment_id
                    }

        return {
            'success': True,
            'paid': False,
            'method': None,
            'payment_id': None
        }

    def get_test_code_stats(self) -> Dict:
        """获取测试码统计信息"""
        active_test_codes = []
        expired_test_codes = []

        for code, usage in self.test_code_usage.items():
            if datetime.now() > usage['expires_at']:
                expired_test_codes.append({
                    'code': code,
                    'expired_at': usage['expires_at'].isoformat()
                })
            else:
                active_test_codes.append({
                    'code': code,
                    'expires_at': usage['expires_at'].isoformat()
                })

        return {
            'total_test_codes': len(self.test_codes),
            'active_usage': len(active_test_codes),
            'expired_usage': len(expired_test_codes),
            'available_codes': len(self.test_codes) - len(self.test_code_usage),
            'test_codes': self.test_codes,
            'active_test_codes': active_test_codes
        }

    def cleanup_expired_records(self):
        """清理过期记录"""
        # 清理过期的测试码使用记录
        expired_codes = []
        for code, usage in list(self.test_code_usage.items()):
            if datetime.now() > usage['expires_at']:
                expired_codes.append(code)

        for code in expired_codes:
            del self.test_code_usage[code]

        # 清理过期的支付记录（超过30天）
        expired_payments = []
        for payment_id, payment in list(self.payments.items()):
            if datetime.now() - payment['created_at'] > timedelta(days=30):
                expired_payments.append(payment_id)

        for payment_id in expired_payments:
            del self.payments[payment_id]

        return {
            'cleaned_test_codes': len(expired_codes),
            'cleaned_payments': len(expired_payments)
        }

# 全局支付服务实例
payment_service = PaymentService()