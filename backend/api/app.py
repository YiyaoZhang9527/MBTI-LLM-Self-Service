"""
简化的Flask API服务
提供直接的MBTI markdown分析对话接口
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
from pathlib import Path

from config.config_loader import Config
from llm.mbti_service import SimpleMBTIService
from payment_service import payment_service


def create_app():
    """创建Flask应用"""
    app = Flask(__name__)

    # 启用CORS以支持前端跨域调用
    CORS(app)

    # 加载配置
    config = Config()

    try:
        # 初始化简化的MBTI分析服务
        mbti_service = SimpleMBTIService(config)
        print("✅ 简化MBTI分析服务初始化成功")
    except Exception as e:
        print(f"❌ MBTI分析服务初始化失败: {str(e)}")
        mbti_service = None

    # 存储对话会话的内存存储（生产环境建议使用Redis等）
    conversation_sessions = {}

    @app.route('/health', methods=['GET'])
    def health_check():
        """健康检查接口"""
        return jsonify({
            'status': 'healthy',
            'service': 'Simple MBTI LLM API',
            'version': '2.0.0'
        })

    @app.route('/status', methods=['GET'])
    def service_status():
        """服务状态接口"""
        if not mbti_service:
            return jsonify({
                'status': 'error',
                'message': 'MBTI分析服务未初始化'
            }), 503

        status = mbti_service.get_service_status()
        return jsonify(status)

    @app.route('/analyze', methods=['POST'])
    def analyze_markdown():
        """MBTI markdown分析接口"""
        try:
            if not mbti_service:
                return jsonify({
                    'success': False,
                    'error': 'MBTI分析服务未初始化'
                }), 503

            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'error': '请求数据为空'
                }), 400

            # 获取用户markdown内容
            markdown_content = data.get('markdown_content', '')
            if not markdown_content:
                return jsonify({
                    'success': False,
                    'error': '缺少markdown_content参数'
                }), 400

            # 执行分析
            result = mbti_service.analyze_with_user_template(markdown_content)

            if result['success']:
                # 存储会话信息
                session_id = result['session_id']
                conversation_sessions[session_id] = {
                    'user_markdown': markdown_content,
                    'analysis_result': result['response'],
                    'timestamp': result['metadata']['timestamp'],
                    'history': [
                        {
                            "role": "system",
                            "content": "系统提示词：专业的MBTI人格分析师"
                        },
                        {
                            "role": "user",
                            "content": markdown_content
                        },
                        {
                            "role": "assistant",
                            "content": result['response']
                        }
                    ]
                }

                return jsonify({
                    'success': True,
                    'session_id': session_id,
                    'analysis': result['response'],
                    'metadata': result['metadata']
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result['error']
                }), 500

        except Exception as e:
            error_msg = f"分析过程发生错误: {str(e)}"
            print(f"❌ {error_msg}")
            print(traceback.format_exc())

            return jsonify({
                'success': False,
                'error': error_msg
            }), 500

    @app.route('/chat', methods=['POST'])
    def continue_chat():
        """继续对话接口"""
        try:
            if not mbti_service:
                return jsonify({
                    'success': False,
                    'error': 'MBTI分析服务未初始化'
                }), 503

            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'error': '请求数据为空'
                }), 400

            session_id = data.get('session_id', '')
            user_question = data.get('user_question', '')

            if not session_id or not user_question:
                return jsonify({
                    'success': False,
                    'error': '缺少session_id或user_question参数'
                }), 400

            # 检查会话是否存在
            if session_id not in conversation_sessions:
                return jsonify({
                    'success': False,
                    'error': '会话不存在或已过期'
                }), 404

            # 获取对话历史
            conversation_history = conversation_sessions[session_id]['history']

            # 继续对话
            result = mbti_service.continue_conversation(
                session_id,
                user_question,
                conversation_history
            )

            if result['success']:
                # 更新对话历史
                conversation_sessions[session_id]['history'].extend([
                    {
                        "role": "user",
                        "content": user_question
                    },
                    {
                        "role": "assistant",
                        "content": result['response']
                    }
                ])

                return jsonify({
                    'success': True,
                    'response': result['response'],
                    'session_id': session_id
                })
            else:
                return jsonify({
                    'success': False,
                    'error': result['error']
                }), 500

        except Exception as e:
            error_msg = f"对话过程发生错误: {str(e)}"
            print(f"❌ {error_msg}")
            print(traceback.format_exc())

            return jsonify({
                'success': False,
                'error': error_msg
            }), 500

    @app.route('/sessions/<session_id>', methods=['GET'])
    def get_session(session_id):
        """获取会话信息"""
        try:
            if session_id not in conversation_sessions:
                return jsonify({
                    'success': False,
                    'error': '会话不存在'
                }), 404

            session_data = conversation_sessions[session_id]
            return jsonify({
                'success': True,
                'session_id': session_id,
                'analysis_result': session_data['analysis_result'],
                'timestamp': session_data['timestamp'],
                'message_count': len(session_data['history']) // 2  # 用户消息数量
            })

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'获取会话失败: {str(e)}'
            }), 500

    @app.route('/sessions/<session_id>', methods=['DELETE'])
    def delete_session(session_id):
        """删除会话"""
        try:
            if session_id in conversation_sessions:
                del conversation_sessions[session_id]
                return jsonify({
                    'success': True,
                    'message': '会话已删除'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': '会话不存在'
                }), 404

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'删除会话失败: {str(e)}'
            }), 500

    # ==================== 支付相关API ====================

    @app.route('/api/payment/create', methods=['POST'])
    def create_payment():
        """创建支付订单"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'error': '缺少请求数据'
                }), 400

            amount = data.get('amount', 9.9)
            product = data.get('product', 'ai_report')
            test_id = data.get('testId')
            mbti_type = data.get('mbtiType')

            result = payment_service.create_payment_order(test_id, mbti_type, product)

            return jsonify(result)

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'创建支付订单失败: {str(e)}'
            }), 500

    @app.route('/api/payment/verify', methods=['POST'])
    def verify_payment():
        """验证支付状态"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'error': '缺少请求数据'
                }), 400

            payment_id = data.get('paymentId')
            method = data.get('method', 'wechat')

            if not payment_id:
                return jsonify({
                    'success': False,
                    'error': '缺少支付订单ID'
                }), 400

            result = payment_service.verify_payment(payment_id, method)
            return jsonify(result)

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'验证支付失败: {str(e)}'
            }), 500

    @app.route('/api/payment/check', methods=['POST'])
    def check_payment_status():
        """检查支付状态"""
        try:
            data = request.get_json()
            test_id = data.get('testId')
            order_id = data.get('orderId')

            result = payment_service.check_payment_status(test_id, order_id)
            return jsonify(result)

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'检查支付状态失败: {str(e)}'
            }), 500

    @app.route('/api/test-code/verify', methods=['POST'])
    def verify_test_code():
        """验证测试码"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'error': '缺少请求数据'
                }), 400

            test_code = data.get('code')
            test_id = data.get('testId')

            if not test_code:
                return jsonify({
                    'success': False,
                    'error': '缺少测试码'
                }), 400

            result = payment_service.verify_test_code(test_code, test_id)
            return jsonify(result)

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'验证测试码失败: {str(e)}'
            }), 500

    @app.route('/api/test-codes/stats', methods=['GET'])
    def get_test_code_stats():
        """获取测试码统计信息"""
        try:
            stats = payment_service.get_test_code_stats()
            return jsonify({
                'success': True,
                'data': stats
            })

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'获取测试码统计失败: {str(e)}'
            }), 500

    @app.route('/api/payment/cleanup', methods=['POST'])
    def cleanup_expired_records():
        """清理过期记录"""
        try:
            result = payment_service.cleanup_expired_records()
            return jsonify({
                'success': True,
                'message': f"清理完成: {result['cleaned_test_codes']}个过期测试码, {result['cleaned_payments']}个过期支付记录"
            })

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'清理记录失败: {str(e)}'
            }), 500

    @app.route('/api/payment/config', methods=['GET'])
    def get_payment_config():
        """获取支付配置信息"""
        try:
            config = {
                'success': True,
                'data': {
                    'payment_amount': payment_service.payment_amount,
                    'currency': 'CNY',
                    'test_code_expiry_hours': payment_service.test_code_expiry_hours
                }
            }
            return jsonify(config)

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'获取支付配置失败: {str(e)}'
            }), 500

    @app.errorhandler(404)
    def not_found(error):
        """404错误处理"""
        return jsonify({
            'success': False,
            'error': '接口不存在'
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        """500错误处理"""
        return jsonify({
            'success': False,
            'error': '服务器内部错误'
        }), 500

    return app


if __name__ == '__main__':
    # 创建应用实例
    app = create_app()

    # 加载Flask配置
    config = Config()

    print(f"🚀 启动简化MBTI分析API服务")
    print(f"📡 服务地址: http://localhost:{config.flask_config['port']}")
    print(f"🔧 调试模式: {config.flask_config['debug']}")
    print(f"📝 功能: 直接使用用户markdown模板进行AI分析")

    # 启动服务
    app.run(
        host='0.0.0.0',
        port=config.flask_config['port'],
        debug=config.flask_config['debug']
    )