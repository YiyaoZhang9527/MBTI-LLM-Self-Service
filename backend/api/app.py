"""
Flask API服务
提供MBTI分析的RESTful API接口
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import traceback
from pathlib import Path

from config.config_loader import Config
from llm.mbti_service import MBTIAnalysisService


def create_app():
    """创建Flask应用"""
    app = Flask(__name__)

    # 启用CORS以支持前端跨域调用
    CORS(app)

    # 加载配置
    config = Config()

    try:
        # 初始化MBTI分析服务
        mbti_service = MBTIAnalysisService(config)
        print("✅ MBTI分析服务初始化成功")
    except Exception as e:
        print(f"❌ MBTI分析服务初始化失败: {str(e)}")
        mbti_service = None

    @app.route('/health', methods=['GET'])
    def health_check():
        """健康检查接口"""
        return jsonify({
            'status': 'healthy',
            'service': 'MBTI LLM API',
            'version': '1.0.0'
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
    def analyze_mbti():
        """MBTI分析接口"""
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

            # 验证必要参数
            mbti_data = data.get('mbti_data', '')
            analysis_type = data.get('analysis_type', 'full')

            if not mbti_data:
                return jsonify({
                    'success': False,
                    'error': '缺少mbti_data参数'
                }), 400

            # 验证analysis_type
            valid_types = ['full', 'quick']
            if analysis_type not in valid_types:
                return jsonify({
                    'success': False,
                    'error': f'无效的analysis_type，支持的类型: {valid_types}'
                }), 400

            # 执行分析
            result = mbti_service.analyze_mbti_data(mbti_data, analysis_type)

            if result['success']:
                return jsonify(result)
            else:
                return jsonify(result), 500

        except Exception as e:
            error_msg = f"分析过程发生错误: {str(e)}"
            print(f"❌ {error_msg}")
            print(traceback.format_exc())

            return jsonify({
                'success': False,
                'error': error_msg
            }), 500

    @app.route('/followup', methods=['POST'])
    def follow_up_analysis():
        """后续分析接口"""
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

            previous_analysis = data.get('previous_analysis', '')
            user_question = data.get('user_question', '')

            if not previous_analysis or not user_question:
                return jsonify({
                    'success': False,
                    'error': '缺少previous_analysis或user_question参数'
                }), 400

            result = mbti_service.follow_up_analysis(previous_analysis, user_question)

            if result['success']:
                return jsonify(result)
            else:
                return jsonify(result), 500

        except Exception as e:
            error_msg = f"后续分析发生错误: {str(e)}"
            print(f"❌ {error_msg}")
            print(traceback.format_exc())

            return jsonify({
                'success': False,
                'error': error_msg
            }), 500

    @app.route('/outputs/<filename>', methods=['GET'])
    def get_output_file(filename):
        """获取输出文件"""
        try:
            output_dir = Path(config.output_dir)
            return send_from_directory(output_dir, filename)
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'文件获取失败: {str(e)}'
            }), 404

    @app.route('/outputs', methods=['GET'])
    def list_output_files():
        """列出输出文件"""
        try:
            output_dir = Path(config.output_dir)
            if not output_dir.exists():
                return jsonify({
                    'success': True,
                    'files': []
                })

            files = []
            for file_path in output_dir.glob("*.json"):
                stat = file_path.stat()
                files.append({
                    'filename': file_path.name,
                    'size': stat.st_size,
                    'created_time': stat.st_ctime
                })

            # 按创建时间倒序排列
            files.sort(key=lambda x: x['created_time'], reverse=True)

            return jsonify({
                'success': True,
                'files': files
            })

        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'文件列表获取失败: {str(e)}'
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

    print(f"🚀 启动MBTI分析API服务")
    print(f"📡 服务地址: http://localhost:{config.flask_config['port']}")
    print(f"🔧 调试模式: {config.flask_config['debug']}")

    # 启动服务
    app.run(
        host='0.0.0.0',
        port=config.flask_config['port'],
        debug=config.flask_config['debug']
    )