"""
简化的MBTI分析服务
直接使用用户的markdown模板，支持对话功能
"""

import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

from config.config_loader import Config
from llm.llm_client import LLMFactory
from prompts.mbti_prompts import SimplePrompts


class SimpleMBTIService:
    """简化的MBTI分析服务"""

    def __init__(self, config: Config):
        """初始化服务"""
        self.config = config
        self.prompts = SimplePrompts()

        # 获取可用的LLM客户端
        provider = config.get_available_provider()
        provider_config = config.get_provider_config(provider)
        self.llm_client = LLMFactory.create_client(provider, provider_config)

        print(f"✅ 使用LLM供应商: {provider}")
        print(f"✅ 模型: {provider_config['model']}")

    def analyze_with_user_template(self, user_markdown: str) -> Dict[str, Any]:
        """使用用户的markdown模板进行分析"""
        try:
            # 构建消息：系统提示词 + 用户markdown
            messages = [
                {
                    "role": "system",
                    "content": self.prompts.get_system_prompt()
                },
                {
                    "role": "user",
                    "content": user_markdown
                }
            ]

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
                'response': response,
                'session_id': str(uuid.uuid4()),  # 用于后续对话
                'metadata': {
                    'analysis_time': round(analysis_time, 2),
                    'model': self.llm_client.model,
                    'timestamp': datetime.now().isoformat(),
                    'data_length': len(user_markdown)
                }
            }

            # 保存分析结果
            self._save_conversation(result, user_markdown)

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
            self._save_conversation(error_result, user_markdown)

            return error_result

    def continue_conversation(self, session_id: str, user_question: str, conversation_history: List[Dict]) -> Dict[str, Any]:
        """继续对话"""
        try:
            # 构建对话历史
            messages = [
                {
                    "role": "system",
                    "content": self.prompts.get_system_prompt()
                }
            ]

            # 添加历史对话
            messages.extend(conversation_history)

            # 添加新问题
            messages.append({
                "role": "user",
                "content": user_question
            })

            # 生成回复
            response = self.llm_client.generate_response(
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )

            # 保存对话记录
            conversation_record = {
                'session_id': session_id,
                'user_question': user_question,
                'ai_response': response,
                'timestamp': datetime.now().isoformat()
            }

            self._save_conversation_message(conversation_record)

            return {
                'success': True,
                'response': response,
                'session_id': session_id,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _save_conversation(self, result: Dict[str, Any], user_markdown: str) -> None:
        """保存对话记录"""
        try:
            # 创建输出目录
            output_dir = Path(self.config.output_dir)
            output_dir.mkdir(exist_ok=True)

            # 生成文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            analysis_id = result['analysis_id']
            status = "success" if result['success'] else "error"

            filename = f"conversation_{timestamp}_{analysis_id[:8]}_{status}.json"
            filepath = output_dir / filename

            # 保存完整对话记录
            conversation_record = {
                'session_id': result.get('session_id'),
                'analysis_id': analysis_id,
                'user_markdown': user_markdown,
                'ai_response': result.get('response') if result['success'] else None,
                'error': result.get('error') if not result['success'] else None,
                'metadata': result.get('metadata', {}),
                'timestamp': datetime.now().isoformat()
            }

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(conversation_record, f, ensure_ascii=False, indent=2)

            print(f"✅ 对话记录已保存: {filepath}")

        except Exception as e:
            print(f"⚠️ 保存对话记录失败: {str(e)}")

    def _save_conversation_message(self, conversation_record: Dict[str, Any]) -> None:
        """保存单条对话消息"""
        try:
            output_dir = Path(self.config.output_dir)
            output_dir.mkdir(exist_ok=True)

            # 生成文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"chat_{conversation_record['session_id'][:8]}_{timestamp}.json"
            filepath = output_dir / filename

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(conversation_record, f, ensure_ascii=False, indent=2)

            print(f"✅ 对话消息已保存: {filepath}")

        except Exception as e:
            print(f"⚠️ 保存对话消息失败: {str(e)}")

    def get_service_status(self) -> Dict[str, Any]:
        """获取服务状态"""
        try:
            client_status = self.llm_client.validate_config()

            return {
                'service': 'Simple MBTI Analysis Service',
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
                'service': 'Simple MBTI Analysis Service',
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }