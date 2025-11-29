#!/usr/bin/env python3
"""
MBTI分析服务启动脚本
简化服务启动流程
"""

import sys
import os
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def main():
    """主函数"""
    try:
        # 检查必要文件
        required_files = ['.env', 'config/config_loader.py', 'llm/mbti_service.py', 'api/app.py']
        for file_path in required_files:
            if not (project_root / file_path).exists():
                print(f"❌ 缺少必要文件: {file_path}")
                print("请确保所有必要文件都已创建")
                sys.exit(1)

        # 检查.env文件
        env_file = project_root / '.env'
        if not env_file.exists():
            print("📝 未找到.env文件，从.env.example复制")
            example_file = project_root / '.env.example'
            if example_file.exists():
                import shutil
                shutil.copy(example_file, env_file)
                print("✅ 已创建.env文件，请配置API密钥")
            else:
                print("❌ 未找到.env.example文件")
                sys.exit(1)

        # 导入并启动服务
        from config.config_loader import Config

        config = Config()

        print("🔍 检查配置...")

        # 检查可用的LLM供应商
        available_providers = [
            provider for provider in config.llm_providers.keys()
            if config.is_provider_available(provider)
        ]

        if not available_providers:
            print("⚠️  没有配置可用的LLM供应商")
            print("请在.env文件中配置至少一个LLM供应商的API密钥:")
            print("- OPENAI_API_KEY")
            print("- ANTHROPIC_API_KEY")
            print("- ZHIPUAI_API_KEY")
            print("- MOONSHOT_API_KEY")
            print("- DASHSCOPE_API_KEY")
            print("- DEEPSEEK_API_KEY")
            sys.exit(1)

        print(f"✅ 可用的LLM供应商: {', '.join(available_providers)}")
        print(f"🎯 默认供应商: {config.default_provider}")

        # 创建输出目录
        output_dir = Path(config.output_dir)
        output_dir.mkdir(exist_ok=True)
        print(f"📁 输出目录: {output_dir.absolute()}")

        print("🚀 启动API服务...")

        # 启动Flask应用
        from api.app import create_app
        app = create_app()

        app.run(
            host='0.0.0.0',
            port=config.flask_config['port'],
            debug=config.flask_config['debug']
        )

    except KeyboardInterrupt:
        print("\n👋 服务已停止")
    except Exception as e:
        print(f"❌ 启动失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()