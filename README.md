# MBTI人格测试

现代化的MBTI人格测试应用，支持Web和微信小程序。

## 核心特性

- 92题完整MBTI测试
- CSV配置驱动，易于维护
- 苹果极简风格UI
- 响应式设计，移动端友好
- 无框架依赖，原生JS实现

## 项目结构

```
MBTI/
├── index.html          # Web端入口
├── style.css           # 苹果风格样式
├── app.js              # 应用主逻辑
├── mbti-core.js        # 核心计分库
├── mbti-core.ts        # TypeScript类型定义
├── questions.csv       # 题目配置文件
└── test_case.py        # 原始命令行版本
```

## 快速开始

1. 启动本地服务器：
```bash
python3 -m http.server 8000
```

2. 访问 `http://localhost:8000`

## 数据结构

题目使用CSV格式存储：
```csv
id,dimension,question,reverse
1,EI,你喜欢参加社交活动吗？,false
```

- `id`: 题目编号
- `dimension`: 维度 (EI/SN/TF/JP)
- `question`: 题目内容
- `reverse`: 是否反向计分

## 核心API

```javascript
const calculator = new MBTICalculator(questions);
const scores = calculator.calculateScores(answers);
const result = calculator.calculateResult(scores);
```

## 技术栈

- **前端**: HTML5 + CSS3 + 原生JavaScript
- **样式**: CSS Grid + Flexbox，苹果设计风格
- **架构**: 模块化设计，核心逻辑与UI分离

## 浏览器支持

现代浏览器，支持ES2015+。

## 许可

MIT License