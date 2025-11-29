"""
MBTI分析服务
整合LLM客户端和Prompt管理，提供MBTI分析的核心业务逻辑
"""

import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

from config.config_loader import Config
from llm.llm_client import LLMFactory
from prompts.mbti_prompts import MBTIPrompts


class MBTIAnalysisService:
    """MBTI分析服务"""

    def __init__(self, config: Config):
        """初始化服务"""
        self.config = config
        self.prompts = MBTIPrompts()

        # 获取可用的LLM客户端
        provider = config.get_available_provider()
        provider_config = config.get_provider_config(provider)
        self.llm_client = LLMFactory.create_client(provider, provider_config)

        print(f"✅ 使用LLM供应商: {provider}")
        print(f"✅ 模型: {provider_config['model']}")

    def analyze_mbti_data(self, mbti_data: str, analysis_type: str = "full") -> Dict[str, Any]:
        """分析MBTI数据"""
        try:
            # 验证数据格式
            if not self.prompts.validate_mbti_data(mbti_data):
                raise ValueError("MBTI数据格式不正确")

            # 构建消息
            messages = self._build_messages(mbti_data, analysis_type)

            # 生成分析报告
            start_time = time.time()
            response = self.llm_client.generate_response(
                messages=messages,
                temperature=self.config.api_config['temperature'],
                max_tokens=4000
            )
            analysis_time = time.time() - start_time

            # 构建返回结果
            result = {
                'success': True,
                'analysis_id': str(uuid.uuid4()),
                'analysis_type': analysis_type,
                'response': response,
                'metadata': {
                    'analysis_time': round(analysis_time, 2),
                    'model': self.llm_client.model,
                    'timestamp': datetime.now().isoformat(),
                    'data_length': len(mbti_data)
                }
            }

            # 保存分析结果
            self._save_analysis_result(result)

            return result

        except Exception as e:
            error_result = {
                'success': False,
                'error': str(e),
                'analysis_id': str(uuid.uuid4()),
                'metadata': {
                    'timestamp': datetime.now().isoformat(),
                    'error_type': type(e).__name__
                }
            }

            # 保存错误结果
            self._save_analysis_result(error_result)

            return error_result

    def follow_up_analysis(self, previous_analysis: str, user_question: str) -> Dict[str, Any]:
        """后续分析"""
        try:
            messages = [
                {
                    "role": "system",
                    "content": self.prompts.get_system_prompt()
                },
                {
                    "role": "user",
                    "content": f"之前的分析报告：\n\n{previous_analysis}\n\n用户问题：{user_question}\n\n{self.prompts.get_follow_up_prompt()}"
                }
            ]

            response = self.llm_client.generate_response(
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )

            return {
                'success': True,
                'response': response,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _build_messages(self, mbti_data: str, analysis_type: str) -> List[Dict[str, str]]:
        """构建LLM消息"""
        system_prompt = self.prompts.get_system_prompt()

        if analysis_type == "quick":
            user_prompt = f"{self.prompts.get_quick_analysis_prompt()}\n\n用户MBTI测试数据：\n\n{mbti_data}"
        else:
            user_prompt = f"{self.prompts.get_analysis_prompt()}\n\n用户MBTI测试数据：\n\n{mbti_data}"

        return [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ]

    def _save_analysis_result(self, result: Dict[str, Any]) -> None:
        """保存分析结果到文件"""
        try:
            # 创建输出目录
            output_dir = Path(self.config.output_dir)
            output_dir.mkdir(exist_ok=True)

            # 生成文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            analysis_id = result['analysis_id']
            status = "success" if result['success'] else "error"

            filename = f"mbti_analysis_{timestamp}_{analysis_id[:8]}_{status}.json"
            filepath = output_dir / filename

            # 保存到文件
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            print(f"✅ 分析结果已保存: {filepath}")

        except Exception as e:
            print(f"⚠️ 保存分析结果失败: {str(e)}")

    def get_service_status(self) -> Dict[str, Any]:
        """获取服务状态"""
        try:
            # 检查LLM客户端状态
            client_status = self.llm_client.validate_config()

            return {
                'service': 'MBTI Analysis Service',
                'status': 'healthy' if client_status else 'error',
                'llm_provider': type(self.llm_client).__name__,
                'model': self.llm_client.model,
                'config_valid': client_status,
                'timestamp': datetime.now().isoformat(),
                'available_providers': [
                    provider for provider in self.config.llm_providers.keys()
                    if self.config.is_provider_available(provider)
                ]
            }
        except Exception as e:
            return {
                'service': 'MBTI Analysis Service',
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }