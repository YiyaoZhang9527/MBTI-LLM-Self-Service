"""
配置加载模块
负责从.env文件加载LLM API配置
"""

import os
from pathlib import Path
from typing import Dict, Optional
from dotenv import load_dotenv


class Config:
    """配置管理类"""

    def __init__(self, env_file: str = ".env"):
        """初始化配置"""
        # 加载.env文件
        env_path = Path(__file__).parent / env_file
        load_dotenv(env_path)

    @property
    def llm_providers(self) -> Dict[str, Dict[str, str]]:
        """获取所有LLM供应商配置"""
        return {
            'openai': {
                'api_key': os.getenv('OPENAI_API_KEY', ''),
                'base_url': os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
                'model': os.getenv('OPENAI_MODEL', 'gpt-4o-mini'),
            },
            'anthropic': {
                'api_key': os.getenv('ANTHROPIC_API_KEY', ''),
                'model': os.getenv('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022'),
            },
            'zhipuai': {
                'api_key': os.getenv('ZHIPUAI_API_KEY', ''),
                'base_url': os.getenv('ZHIPUAI_BASE_URL', 'https://open.bigmodel.cn/api/paas/v4'),
                'model': os.getenv('ZHIPUAI_MODEL', 'glm-4-plus'),
            },
            'moonshot': {
                'api_key': os.getenv('MOONSHOT_API_KEY', ''),
                'base_url': os.getenv('MOONSHOT_BASE_URL', 'https://api.moonshot.cn/v1'),
                'model': os.getenv('MOONSHOT_MODEL', 'moonshot-v1-8k'),
            },
            'dashscope': {
                'api_key': os.getenv('DASHSCOPE_API_KEY', ''),
                'model': os.getenv('DASHSCOPE_MODEL', 'qwen-plus'),
            },
            'deepseek': {
                'api_key': os.getenv('DEEPSEEK_API_KEY', ''),
                'base_url': os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
                'model': os.getenv('DEEPSEEK_MODEL', 'deepseek-chat'),
            }
        }

    @property
    def default_provider(self) -> str:
        """获取默认LLM供应商"""
        return os.getenv('DEFAULT_LLM_PROVIDER', 'openai')

    @property
    def api_config(self) -> Dict[str, any]:
        """获取API配置"""
        return {
            'timeout': int(os.getenv('API_TIMEOUT', 300)),
            'max_retries': int(os.getenv('API_MAX_RETRIES', 3)),
            'temperature': float(os.getenv('API_TEMPERATURE', 0.7)),
        }

    @property
    def flask_config(self) -> Dict[str, any]:
        """获取Flask服务配置"""
        return {
            'port': int(os.getenv('FLASK_PORT', 5001)),
            'debug': os.getenv('FLASK_DEBUG', 'True').lower() == 'true',
        }

    @property
    def output_dir(self) -> str:
        """获取输出目录"""
        return os.getenv('OUTPUT_DIR', './output')

    def get_provider_config(self, provider: str) -> Optional[Dict[str, str]]:
        """获取指定供应商配置"""
        return self.llm_providers.get(provider)

    def is_provider_available(self, provider: str) -> bool:
        """检查供应商是否可用（是否有API密钥）"""
        config = self.get_provider_config(provider)
        return config and bool(config.get('api_key'))

    def get_available_provider(self) -> str:
        """获取第一个可用的供应商"""
        # 首先检查默认供应商
        if self.is_provider_available(self.default_provider):
            return self.default_provider

        # 检查其他供应商
        for provider in self.llm_providers.keys():
            if self.is_provider_available(provider):
                return provider

        raise ValueError("没有可用的LLM供应商配置，请检查API密钥")