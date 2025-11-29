#!/usr/bin/env python3
"""
LLM服务测试脚本
测试LLM客户端和服务的基本功能
"""

import sys
import json
import time
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from config.config_loader import Config
from llm.llm_client import LLMFactory
from prompts.mbti_prompts import MBTIPrompts


def test_config():
    """测试配置加载"""
    print("🔍 测试配置加载...")

    try:
        config = Config()
        print(f"✅ 默认供应商: {config.default_provider}")

        # 检查可用供应商
        available_providers = []
        for provider, provider_config in config.llm_providers.items():
            if config.is_provider_available(provider):
                available_providers.append(provider)
                print(f"✅ {provider}: 可用 ({provider_config['model']})")
            else:
                print(f"❌ {provider}: 未配置API密钥")

        if not available_providers:
            print("⚠️ 没有可用的LLM供应商，请配置API密钥")
            return False

        return True

    except Exception as e:
        print(f"❌ 配置测试失败: {str(e)}")
        return False


def test_llm_client():
    """测试LLM客户端"""
    print("\n🤖 测试LLM客户端...")

    try:
        config = Config()
        provider = config.get_available_provider()
        provider_config = config.get_provider_config(provider)

        print(f"🎯 使用供应商: {provider}")
        print(f"📝 模型: {provider_config['model']}")

        # 创建客户端
        client = LLMFactory.create_client(provider, provider_config)
        print(f"✅ 客户端创建成功: {type(client).__name__}")

        # 测试简单对话
        messages = [
            {
                "role": "user",
                "content": "请简单介绍一下MBTI人格测试。"
            }
        ]

        print("💬 测试对话...")
        start_time = time.time()

        response = client.generate_response(
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )

        end_time = time.time()

        print(f"✅ 响应成功 (耗时: {end_time - start_time:.2f}秒)")
        print(f"📄 响应长度: {len(response)} 字符")
        print(f"💬 响应预览: {response[:100]}...")

        return True

    except Exception as e:
        print(f"❌ LLM客户端测试失败: {str(e)}")
        return False


def test_mbti_prompts():
    """测试MBTI Prompt"""
    print("\n📋 测试MBTI Prompt...")

    try:
        prompts = MBTIPrompts()

        # 测试系统Prompt
        system_prompt = prompts.get_system_prompt()
        print(f"✅ 系统Prompt长度: {len(system_prompt)} 字符")

        # 测试分析Prompt
        analysis_prompt = prompts.get_analysis_prompt()
        print(f"✅ 分析Prompt长度: {len(analysis_prompt)} 字符")

        # 测试数据验证
        test_data = """# **本人MBTI测试结果**

| 工作岗位 | 年龄 | MBTI类型 | EI百分比 |
| -------- | ---- | -------- | ------- |
| 软件工程师 | 25 | ENTP | E=65%/I=35% |

# **本人答题过程**

| 题目内容 | 最终答案 | 停留时间(毫秒) |
| ------------------------------------------- | ---------- | -------------- |
| 你喜欢参加社交活动吗？ | 比较符合 | 5000 |
"""

        is_valid = prompts.validate_mbti_data(test_data)
        print(f"✅ 数据验证: {'通过' if is_valid else '失败'}")

        return True

    except Exception as e:
        print(f"❌ Prompt测试失败: {str(e)}")
        return False


def test_mbti_service():
    """测试MBTI分析服务"""
    print("\n🧠 测试MBTI分析服务...")

    try:
        from llm.mbti_service import MBTIAnalysisService

        config = Config()
        service = MBTIAnalysisService(config)

        # 测试服务状态
        status = service.get_service_status()
        print(f"✅ 服务状态: {status['status']}")
        print(f"🤖 LLM模型: {status.get('model', 'Unknown')}")

        # 测试简单分析
        test_data = """# **本人MBTI测试结果**

| 工作岗位 | 年龄 | MBTI类型 | EI百分比 |
| -------- | ---- | -------- | ------- |
| 软件工程师 | 25 | ENTP | E=65%/I=35% |

# **本人答题过程**

| 题目内容 | 最终答案 | 停留时间(毫秒) |
| ------------------------------------------- | ---------- | -------------- |
| 你喜欢参加社交活动吗？ | 比较符合 | 5000 |
"""

        print("🔬 执行快速分析...")
        start_time = time.time()

        result = service.analyze_mbti_data(test_data, "quick")

        end_time = time.time()

        if result['success']:
            print(f"✅ 分析成功 (耗时: {end_time - start_time:.2f}秒)")
            print(f"📄 分析ID: {result['analysis_id']}")
            print(f"📊 响应长度: {len(result['response'])} 字符")
        else:
            print(f"❌ 分析失败: {result.get('error', 'Unknown error')}")
            return False

        return True

    except Exception as e:
        print(f"❌ 服务测试失败: {str(e)}")
        return False


def main():
    """主测试函数"""
    print("🚀 开始LLM服务测试")
    print("=" * 50)

    tests = [
        ("配置加载", test_config),
        ("LLM客户端", test_llm_client),
        ("MBTI Prompt", test_mbti_prompts),
        ("MBTI分析服务", test_mbti_service)
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name}测试异常: {str(e)}")
            results.append((test_name, False))

    # 显示测试结果摘要
    print(f"\n{'='*50}")
    print("📊 测试结果摘要:")

    passed = 0
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {test_name}: {status}")
        if result:
            passed += 1

    print(f"\n总计: {passed}/{len(results)} 项测试通过")

    if passed == len(results):
        print("🎉 所有测试通过！LLM服务已就绪。")
        return 0
    else:
        print("⚠️ 部分测试失败，请检查配置。")
        return 1


if __name__ == '__main__':
    sys.exit(main())