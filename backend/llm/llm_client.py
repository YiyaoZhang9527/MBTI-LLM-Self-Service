"""
LLM客户端抽象层
支持多个LLM供应商的统一接口
"""

import json
import time
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from openai import OpenAI
import anthropic
import requests


class BaseLLMClient(ABC):
    """LLM客户端基类"""

    def __init__(self, api_key: str, model: str, **kwargs):
        self.api_key = api_key
        self.model = model
        self.config = kwargs

    @abstractmethod
    def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> str:
        """生成LLM响应"""
        pass

    @abstractmethod
    def validate_config(self) -> bool:
        """验证配置是否有效"""
        pass


class OpenAIClient(BaseLLMClient):
    """OpenAI客户端"""

    def __init__(self, api_key: str, model: str, base_url: str = None):
        super().__init__(api_key, model, base_url=base_url)
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> str:
        """生成OpenAI响应"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenAI API调用失败: {str(e)}")

    def validate_config(self) -> bool:
        """验证OpenAI配置"""
        return bool(self.api_key)


class AnthropicClient(BaseLLMClient):
    """Anthropic Claude客户端"""

    def __init__(self, api_key: str, model: str):
        super().__init__(api_key, model)
        self.client = anthropic.Anthropic(api_key=api_key)

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> str:
        """生成Anthropic响应"""
        try:
            # 转换消息格式
            system_message = ""
            user_messages = []

            for msg in messages:
                if msg["role"] == "system":
                    system_message = msg["content"]
                else:
                    user_messages.append(msg)

            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_message,
                messages=user_messages
            )
            return response.content[0].text
        except Exception as e:
            raise Exception(f"Anthropic API调用失败: {str(e)}")

    def validate_config(self) -> bool:
        """验证Anthropic配置"""
        return bool(self.api_key)


class GenericOpenAICompatibleClient(BaseLLMClient):
    """兼容OpenAI API格式的客户端（支持国内供应商）"""

    def __init__(self, api_key: str, model: str, base_url: str):
        super().__init__(api_key, model, base_url=base_url)
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> str:
        """生成兼容OpenAI格式的响应"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"LLM API调用失败: {str(e)}")

    def validate_config(self) -> bool:
        """验证配置"""
        return bool(self.api_key)


class LLMFactory:
    """LLM客户端工厂"""

    @staticmethod
    def create_client(provider: str, config: Dict[str, str]) -> BaseLLMClient:
        """创建LLM客户端"""
        if provider == 'openai':
            return OpenAIClient(
                api_key=config['api_key'],
                model=config['model'],
                base_url=config.get('base_url')
            )

        elif provider == 'anthropic':
            return AnthropicClient(
                api_key=config['api_key'],
                model=config['model']
            )

        elif provider in ['zhipuai', 'moonshot', 'deepseek']:
            return GenericOpenAICompatibleClient(
                api_key=config['api_key'],
                model=config['model'],
                base_url=config.get('base_url')
            )

        elif provider == 'dashscope':
            # 阿里云通义千问使用特殊的请求格式
            return DashScopeClient(
                api_key=config['api_key'],
                model=config['model']
            )

        else:
            raise ValueError(f"不支持的LLM供应商: {provider}")


class DashScopeClient(BaseLLMClient):
    """阿里云DashScope客户端"""

    def __init__(self, api_key: str, model: str):
        super().__init__(api_key, model)
        self.base_url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4000
    ) -> str:
        """生成DashScope响应"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }

            data = {
                'model': self.model,
                'input': {
                    'messages': messages
                },
                'parameters': {
                    'temperature': temperature,
                    'max_tokens': max_tokens
                }
            }

            response = requests.post(
                self.base_url,
                headers=headers,
                json=data,
                timeout=60
            )

            if response.status_code == 200:
                result = response.json()
                return result['output']['choices'][0]['message']['content']
            else:
                raise Exception(f"DashScope API错误: {response.status_code} - {response.text}")

        except Exception as e:
            raise Exception(f"DashScope API调用失败: {str(e)}")

    def validate_config(self) -> bool:
        """验证DashScope配置"""
        return bool(self.api_key)