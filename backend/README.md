# MBTI智能分析后端服务

基于Python构建的LLM后端服务，为MBTI人格测试提供AI驱动的智能分析报告生成。

## 🌟 主要功能

- **多LLM供应商支持**: OpenAI、Claude、智谱AI、月之暗面、阿里云通义、DeepSeek等
- **智能分析报告**: 基于MBTI测试数据生成个性化人格分析
- **专业Prompt模板**: 预设的专业心理咨询师级分析Prompt
- **灵活配置**: 支持环境变量配置，易于切换LLM供应商
- **RESTful API**: 标准的HTTP接口，易于前端集成

## 🏗️ 架构设计

```
backend/
├── api/                 # Flask API接口
│   └── app.py          # 主应用文件
├── llm/                # LLM客户端层
│   ├── llm_client.py  # LLM抽象客户端
│   └── mbti_service.py # MBTI分析服务
├── prompts/            # Prompt管理
│   └── mbti_prompts.py # MBTI分析Prompt
├── config/             # 配置管理
│   └── config_loader.py # 配置加载器
├── output/             # 分析结果输出目录
├── .env.example        # 环境配置示例
├── requirements.txt    # Python依赖
├── start_server.py     # 启动脚本
└── README.md          # 说明文档
```

## 🚀 快速开始

### 1. 环境准备

```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置API密钥

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑.env文件，配置至少一个LLM供应商的API密钥
# 例如：
OPENAI_API_KEY=your_openai_key_here
# 或者
ZHIPUAI_API_KEY=your_zhipuai_key_here
```

### 3. 启动服务

```bash
# 方法1：使用启动脚本（推荐）
python start_server.py

# 方法2：直接运行Flask应用
python api/app.py
```

服务将在 `http://localhost:5001` 启动。

## 🔧 配置说明

### LLM供应商配置

支持的LLM供应商：

| 供应商 | 环境变量 | 模型示例 |
|--------|----------|----------|
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini`, `gpt-4` |
| Anthropic Claude | `ANTHROPIC_API_KEY` | `claude-3-5-sonnet-20241022` |
| 智谱AI | `ZHIPUAI_API_KEY` | `glm-4-plus`, `glm-4` |
| 月之暗面 | `MOONSHOT_API_KEY` | `moonshot-v1-8k`, `moonshot-v1-32k` |
| 阿里云通义 | `DASHSCOPE_API_KEY` | `qwen-plus`, `qwen-max` |
| DeepSeek | `DEEPSEEK_API_KEY` | `deepseek-chat`, `deepseek-coder` |

### 关键配置参数

```bash
# 默认供应商
DEFAULT_LLM_PROVIDER=openai

# API配置
API_TIMEOUT=300
API_MAX_RETRIES=3
API_TEMPERATURE=0.7

# 服务配置
FLASK_PORT=5001
FLASK_DEBUG=True
```

## 📡 API接口

### 1. 健康检查

```http
GET /health
```

### 2. 服务状态

```http
GET /status
```

### 3. MBTI分析

```http
POST /analyze
Content-Type: application/json

{
  "mbti_data": "MBTI测试数据（markdown格式）",
  "analysis_type": "full"  // 或 "quick"
}
```

### 4. 后续分析

```http
POST /followup
Content-Type: application/json

{
  "previous_analysis": "之前的分析报告",
  "user_question": "用户的具体问题"
}
```

### 5. 输出文件管理

```http
GET /outputs              # 列出所有输出文件
GET /outputs/{filename}   # 下载指定文件
```

## 🤖 Prompt管理

Prompt文件位于 `prompts/mbti_prompts.py`，包含：

- **系统Prompt**: 定义AI分析师的专业身份和分析要求
- **主要分析Prompt**: 详细的MBTI分析框架和要求
- **快速分析Prompt**: 简洁版的分析指令
- **后续分析Prompt**: 针对用户问题的深度解答指令

### 自定义Prompt

可以直接修改 `mbti_prompts.py` 文件来调整分析风格和内容结构。

## 🔌 前端集成

前端通过 `llm-client.js` 与后端服务交互：

```javascript
// 初始化LLM客户端
const llmClient = new LLMClient('http://localhost:5001');

// 生成分析报告
try {
    const result = await llmClient.analyzeMBTI(mbtiData, 'full');
    console.log('分析结果:', result.response);
} catch (error) {
    console.error('分析失败:', error.message);
}
```

## 📊 分析结果格式

生成的分析报告为Markdown格式，包含：

1. **MBTI类型基础分析**
2. **答题行为深度分析**
3. **职业发展与适配**
4. **人际关系与沟通**
5. **个人成长策略**
6. **综合总结与建议**

## 🔍 故障排除

### 常见问题

1. **API密钥错误**
   - 检查`.env`文件中的API密钥是否正确
   - 确认API密钥有足够的额度

2. **网络连接问题**
   - 检查网络连接
   - 如使用国内供应商，可能需要设置代理

3. **分析超时**
   - 增加`API_TIMEOUT`配置
   - 使用性能更好的模型

4. **内存不足**
   - 减少并发请求数量
   - 降低`max_tokens`参数

### 调试模式

```bash
# 启用Flask调试模式
FLASK_DEBUG=True python start_server.py

# 查看详细日志
tail -f output/*.json
```

## 🛡️ 安全考虑

- API密钥存储在环境变量中，不提交到版本控制
- 支持请求超时和重试机制
- 输入数据验证和错误处理
- 敏感信息过滤

## 📈 性能优化

- 使用连接池管理HTTP连接
- 实现请求缓存机制
- 支持异步处理
- 分析结果本地存储

## 🔄 扩展开发

### 添加新的LLM供应商

1. 在`llm_client.py`中实现新的客户端类
2. 在`config_loader.py`中添加配置项
3. 在`LLMFactory.create_client()`中添加创建逻辑

### 自定义分析类型

1. 在`mbti_prompts.py`中添加新的Prompt模板
2. 在API接口中支持新的analysis_type参数

## 📝 更新日志

### v1.0.0 (2025-11-29)
- ✅ 首次发布
- ✅ 支持6个主要LLM供应商
- ✅ 完整的MBTI分析Prompt体系
- ✅ RESTful API接口
- ✅ 前端集成客户端

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如有问题或建议，请：

1. 查看[故障排除](#故障排除)部分
2. 检查[GitHub Issues](https://github.com/your-repo/issues)
3. 联系维护者

---

**Made with ❤️ for MBTI analysis**