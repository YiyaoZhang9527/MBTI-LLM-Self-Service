/**
 * 测试数据记录器
 * 用于记录MBTI测试过程中的详细用户行为数据
 */
class TestDataRecorder {
    constructor() {
        this.testId = this.generateTestId();
        this.startTime = null;
        this.endTime = null;
        this.currentQuestionStartTime = null;
        this.questionData = new Map(); // 存储每题的详细数据

        // 测试数据结构
        this.testData = {
            testId: this.testId,
            ip: 'Unknown', // 后续可以通过API获取
            startTime: null,
            endTime: null,
            totalDuration: null,
            questions: [],
            choices: [],
            stayTimes: [],
            changeCounts: [],
            mbtiResult: null, // 添加MBTI测试结果
            optionalInfo: {
                email: '',
                jobTitle: '',
                age: ''
            }
        };
    }

    /**
     * 生成唯一测试ID
     */
    generateTestId() {
        return 'TEST_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 开始测试记录
     */
    startTest() {
        this.startTime = new Date();
        this.testData.startTime = this.startTime.toISOString();
        console.log(`📊 开始记录测试 ${this.testId}`);
    }

    /**
     * 开始记录新题目
     */
    startQuestion(questionId, questionText) {
        this.currentQuestionStartTime = new Date();

        // 初始化题目数据
        if (!this.questionData.has(questionId)) {
            this.questionData.set(questionId, {
                questionId: questionId,
                questionText: questionText.substring(0, 50) + '...', // 截取前50字符
                firstViewTime: this.currentQuestionStartTime.toISOString(),
                selections: [],
                totalChanges: 0,
                stayTime: 0,
                finalScore: null
            });
        }

        console.log(`📝 开始记录题目 ${questionId}`);
    }

    /**
     * 记录题目选择
     */
    recordSelection(questionId, score) {
        const now = new Date();
        const questionData = this.questionData.get(questionId);

        if (questionData) {
            // 记录选择历史
            questionData.selections.push({
                score: score,
                timestamp: now.toISOString()
            });

            // 更新选择次数（只有分数变化时才计数）
            if (questionData.finalScore !== null && questionData.finalScore !== score) {
                questionData.totalChanges++;
            }

            questionData.finalScore = score;
            console.log(`✅ 记录选择: 题目${questionId} = ${score}分 (修改${questionData.totalChanges}次)`);
        }
    }

    /**
     * 结束当前题目记录
     */
    endQuestion(questionId) {
        const now = new Date();
        const questionData = this.questionData.get(questionId);

        if (questionData && this.currentQuestionStartTime) {
            // 计算停留时间（毫秒）
            const stayTime = now - this.currentQuestionStartTime;
            questionData.stayTime = stayTime;

            console.log(`⏱️ 题目${questionId}停留时间: ${stayTime}ms`);
        }
    }

    /**
     * 完成测试记录
     */
    completeTest() {
        this.endTime = new Date();
        this.testData.endTime = this.endTime.toISOString();
        this.testData.totalDuration = this.endTime - this.startTime;

        // 整理所有题目数据
        this.organizeTestData();

        console.log(`🎉 测试完成，总时长: ${this.testData.totalDuration}ms`);
        return this.testData;
    }

    /**
     * 整理测试数据为结构化格式
     */
    organizeTestData() {
        const sortedQuestions = Array.from(this.questionData.values()).sort((a, b) => a.questionId - b.questionId);

        this.testData.questions = sortedQuestions.map(q => q.questionId);
        this.testData.choices = sortedQuestions.map(q => q.finalScore || 0);
        this.testData.stayTimes = sortedQuestions.map(q => q.stayTime);
        this.testData.changeCounts = sortedQuestions.map(q => q.totalChanges);
    }

    /**
     * 记录MBTI测试结果
     */
    recordMBTIResult(result) {
        this.testData.mbtiResult = {
            type: result.type || 'UNKNOWN',
            scores: result.scores || {},
            percentages: result.percentages || {
                EI: { E: 0, I: 0 },
                SN: { S: 0, N: 0 },
                TF: { T: 0, F: 0 },
                JP: { J: 0, P: 0 }
            }
        };
        console.log('🎯 记录MBTI结果:', this.testData.mbtiResult);
    }

    /**
     * 记录可选信息
     */
    recordOptionalInfo(email, jobTitle, age) {
        this.testData.optionalInfo = {
            email: email || '',
            jobTitle: jobTitle || '',
            age: age || ''
        };
    }

    /**
     * 获取IP地址（需要后端API支持）
     */
    async fetchIpAddress() {
        try {
            // 这里可以调用第三方API获取IP地址
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            this.testData.ip = data.ip;
            console.log(`🌐 获取到IP地址: ${data.ip}`);
        } catch (error) {
            console.warn('⚠️ 无法获取IP地址:', error);
            this.testData.ip = 'Unknown';
        }
    }

    /**
     * 生成LLM分析用的Markdown报告
     */
    generateMarkdownReport() {
        const mbtiResult = this.testData.mbtiResult;
        const optionalInfo = this.testData.optionalInfo;
        const sortedQuestions = Array.from(this.questionData.values()).sort((a, b) => a.questionId - b.questionId);

        let markdown = '';

        // 1. LLM分析指令
        markdown += `**请根据以下提供的数据，为测试者，分析给出改进的意见，注意措辞请考虑一下该类型人格的接受偏好。**\n\n`;
        markdown += `# **本人MBTI测试结果**\n\n`;

        // 2. 基本信息表格
        markdown += `| 工作岗位 | 年龄 | MBTI类型 | EI百分比 | SN百分比 | TF百分比 | JP百分比 |\n`;
        markdown += `| -------- | ---- | -------- | ------- | ------- | ------- | ------- |\n`;

        const mbtiType = mbtiResult ? mbtiResult.type : '未知';
        const eiPercent = mbtiResult ? `E=${mbtiResult.percentages.EI.E}%/I=${mbtiResult.percentages.EI.I}%` : '未计算';
        const snPercent = mbtiResult ? `S=${mbtiResult.percentages.SN.S}%/N=${mbtiResult.percentages.SN.N}%` : '未计算';
        const tfPercent = mbtiResult ? `T=${mbtiResult.percentages.TF.T}%/F=${mbtiResult.percentages.TF.F}%` : '未计算';
        const jpPercent = mbtiResult ? `J=${mbtiResult.percentages.JP.J}%/P=${mbtiResult.percentages.JP.P}%` : '未计算';

        markdown += `| ${optionalInfo.jobTitle || '未填写'} | ${optionalInfo.age || '未填写'} | ${mbtiType} | ${eiPercent} | ${snPercent} | ${tfPercent} | ${jpPercent} |\n\n`;

        // 3. 答题过程表格 - 严格按照prompt_case.md格式
        markdown += `# **本人答题过程**\n\n`;
        markdown += `| 题目编号 | 题目内容 | 最终答案 | 停留时间(毫秒) | 修改次数 |\n`;
        markdown += `| ------- | ---------------------------------------- | ---------- | -------------- | -------- |\n`;

        sortedQuestions.forEach(questionData => {
            const finalAnswer = this.scoreToText(questionData.finalScore);
            const stayTime = questionData.stayTime || 0;
            const changeCount = questionData.totalChanges || 0;
            // 使用完整题目内容，不截断
            const questionText = questionData.questionText;
            // 为长题目换行显示，保持表格可读性
            const formattedQuestion = questionText.length > 50
                ? questionText.replace(/(.{50})/g, '$1<br>')
                : questionText;

            markdown += `| ${questionData.questionId} | ${formattedQuestion} | ${finalAnswer} | ${stayTime} | ${changeCount} |\n`;
        });

        markdown += `\n`;

        // 4. 答题详细记录（有修改的题目）
        const modifiedQuestions = sortedQuestions.filter(q => q.totalChanges > 0);
        if (modifiedQuestions.length > 0) {
            markdown += `# **答题修改详情**\n\n`;
            markdown += `以下题目在答题过程中进行了修改：\n\n`;

            modifiedQuestions.forEach(questionData => {
                markdown += `**题目${questionData.questionId}**: ${questionData.questionText}\n`;
                markdown += `修改次数：${questionData.totalChanges}次\n`;
                markdown += `选择历史：`;

                if (questionData.selections && questionData.selections.length > 0) {
                    questionData.selections.forEach((selection, index) => {
                        const answerText = this.scoreToText(selection.score);
                        const time = new Date(selection.timestamp).toLocaleString('zh-CN');
                        markdown += `第${index + 1}次选择：${answerText}（时间：${time}）`;
                        if (index < questionData.selections.length - 1) {
                            markdown += ' → ';
                        }
                    });
                }
                markdown += `\n\n`;
            });
        }

        // 5. 测试统计信息
        const totalTime = this.testData.totalDuration || 0;
        const totalQuestions = sortedQuestions.length;
        const avgTime = totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0;
        const totalChanges = sortedQuestions.reduce((sum, q) => sum + (q.totalChanges || 0), 0);

        markdown += `# **测试统计信息**\n\n`;
        markdown += `- **测试ID**: ${this.testData.testId}\n`;
        markdown += `- **完成题目数**: ${totalQuestions}道\n`;
        markdown += `- **总用时**: ${this.formatDuration(totalTime)}\n`;
        markdown += `- **平均每题用时**: ${this.formatDuration(avgTime)}\n`;
        markdown += `- **总修改次数**: ${totalChanges}次\n`;
        markdown += `- **测试完成率**: ${Math.round((sortedQuestions.filter(q => q.finalScore > 0).length / totalQuestions) * 100)}%\n`;
        markdown += `- **IP地址**: ${this.testData.ip}\n\n`;

        // 6. 报告模板参考
        markdown += `# **下面是一份报告模版，请你参考**\n\n`;
        markdown += `# [MBTI类型] 深度人格分析报告\n\n`;
        markdown += `## 一、你的 MBTI 类型概览\n\n`;
        markdown += `你属于典型的 **[MBTI类型详细描述]**，各维度比例如下：\n\n`;
        markdown += `- **[维度1]** [百分比1]%\n`;
        markdown += `- **[维度2]** [百分比2]%\n`;
        markdown += `- **[维度3]** [百分比3]%\n`;
        markdown += `- **[维度4]** [百分比4]%\n\n`;
        markdown += `你的特质高度稳定，属于"[类型特征]"的人格。\n\n`;
        markdown += `---\n\n`;

        // 新增：MBTI认知功能分析
        markdown += `## 二、认知功能深度分析\n\n`;
        markdown += `### 🧠 你的认知功能栈（基于MBTI类型）\n\n`;
        markdown += `**主导功能（Hero）**：[具体功能名称，如：Ni-内向直觉]\n`;
        markdown += `- 功能特征：[详细描述]\n`;
        markdown += `- 行为表现：[基于答题数据的实际表现]\n`;
        markdown += `- 优势发挥：[如何最大化这个优势]\n\n`;

        markdown += `**辅助功能（Parent）**：[具体功能名称，如：Te-外向思维]\n`;
        markdown += `- 功能特征：[详细描述]\n`;
        markdown += `- 行为表现：[基于答题数据的实际表现]\n`;
        markdown += `- 优势发挥：[如何最大化这个优势]\n\n`;

        markdown += `**第三功能（Child）**：[具体功能名称，如：Fi-内向情感]\n`;
        markdown += `- 功能特征：[详细描述]\n`;
        markdown += `- 发展潜力：[如何发展和完善]\n`;
        markdown += `- 成长机会：[具体的提升建议]\n\n`;

        markdown += `**劣势功能（Inferior）**：[具体功能名称，如：Se-外向感觉]\n`;
        markdown += `- 功能特征：[详细描述]\n`;
        markdown += `- 挑战区域：[常见的困难和压力源]\n`;
        markdown += `- 发展策略：[如何平衡和改善]\n\n`;

        // 新增：子类型分析
        markdown += `### 🎯 你的子类型：[MBTI类型]-[子类型描述]\n\n`;
        markdown += `基于你的答题模式分析，你属于典型的"[子类型名称]"，具体表现为：\n\n`;
        markdown += `- **核心驱动力**：[基于选择频率分析得出的核心动机]\n`;
        markdown += `- **决策模式**：[基于修改次数和停留时间分析的决策风格]\n`;
        markdown += `- **能量管理**：[基于答题节奏分析的精力管理特点]\n\n`;

        markdown += `---\n\n`;

        // 新增：答题行为分析
        markdown += `## 三、答题行为深度分析\n\n`;
        markdown += `### 📊 决策特征分析\n`;
        markdown += `- **决策速度**：[基于平均停留时间分析，如：深思熟虑型/快速直觉型]\n`;
        markdown += `- **决策稳定性**：[基于修改次数分析，如：果断决策型/反复斟酌型]\n`;
        markdown += `- **认知一致性**：[基于同类题目答案一致性分析]\n\n`;

        markdown += `### 🔍 关键答题模式识别\n`;
        markdown += `**高确定性区域**（修改次数≤1，停留时间短）：\n`;
        markdown += `- [具体题目类型]：说明你在这方面[性格特质表现]\n\n`;

        markdown += `**高不确定性区域**（修改次数≥2，停留时间长）：\n`;
        markdown += `- [具体题目类型]：说明你在这方面[内在冲突或发展空间]\n\n`;

        markdown += `---\n\n`;

        // 新增：核心优势
        markdown += `## 四、核心职业优势\n\n`;
        markdown += `### 💼 最适合的工作环境\n`;
        markdown += `- **环境特征**：[基于MBTI类型和答题行为的理想工作环境]\n`;
        markdown += `- **工作节奏**：[基于答题速度分析的工作节奏偏好]\n`;
        markdown += `- **团队规模**：[基于社交偏好分析的团队规模倾向]\n`;
        markdown += `- **沟通方式**：[基于答题行为分析的沟通风格]\n\n`;

        markdown += `### 🌟 突出职业能力\n`;
        markdown += `1. **[核心能力1]**：[基于认知功能分析的具体优势]\n`;
        markdown += `2. **[核心能力2]**：[基于答题模式分析的具体优势]\n`;
        markdown += `3. **[核心能力3]**：[基于决策特征分析的具体优势]\n`;
        markdown += `4. **[核心能力4]**：[基于行为一致性分析的具体优势]\n\n`;

        markdown += `### 👥 团队角色定位\n`;
        markdown += `在团队中，你自然扮演：\n`;
        markdown += `- **[角色1]**：[具体描述和贡献方式]\n`;
        markdown += `- **[角色2]**：[具体描述和贡献方式]\n`;
        markdown += `- **[角色3]**：[具体描述和贡献方式]\n\n`;

        markdown += `---\n\n`;

        // 新增：人际关系分析
        markdown += `## 五、人际关系与沟通风格\n\n`;
        markdown += `### 🗣️ 沟通特征\n`;
        markdown += `- **沟通风格**：[基于MBTI类型和答题行为的沟通特点]\n`;
        markdown += `- **倾听模式**：[基于答题耐心分析的信息接收方式]\n`;
        markdown += `- **表达偏好**：[基于答案选择分析的表达倾向]\n`;
        markdown += `- **冲突处理**：[基于压力情境答题分析的冲突应对方式]\n\n`;

        markdown += `### 🤝 协作模式\n`;
        markdown += `- **最佳协作者**：[基于互补性分析的最佳合作类型]\n`;
        markdown += `- **协作优势**：[在团队协作中的独特价值]\n`;
        markdown += `- **协作挑战**：[可能遇到的协作困难及解决方案]\n\n`;

        markdown += `---\n\n`;

        // 新增：潜在盲区与发展建议
        markdown += `## 六、潜在盲区与发展策略\n\n`;
        markdown += `### ⚠️ 认知盲区\n`;
        markdown += `基于你的认知功能栈，需要关注的发展区域：\n`;
        markdown += `1. **[盲区1]**：[具体描述和影响]\n`;
        markdown += `   - 发展建议：[具体的提升策略]\n`;
        markdown += `   - 实践方法：[可在日常工作中的应用]\n\n`;

        markdown += `2. **[盲区2]**：[具体描述和影响]\n`;
        markdown += `   - 发展建议：[具体的提升策略]\n`;
        markdown += `   - 实践方法：[可在日常工作中的应用]\n\n`;

        markdown += `### 📈 成长发展路径\n`;
        markdown += `**短期目标（3-6个月）**：\n`;
        markdown += `- [基于当前测试数据的具体发展目标]\n\n`;

        markdown += `**中期目标（6-12个月）**：\n`;
        markdown += `- [基于认知功能发展的发展目标]\n\n`;

        markdown += `**长期发展（1-3年）**：\n`;
        markdown += `- [基于人格整合的长期发展目标]\n\n`;

        markdown += `---\n\n`;

        // 新增：压力管理
        markdown += `## 七、压力管理与情绪调节\n\n`;
        markdown += `### 🔥 主要压力源识别\n`;
        markdown += `基于你的答题模式分析，主要压力源包括：\n`;
        markdown += `- **[压力源1]**：[触发场景和表现]\n`;
        markdown += `- **[压力源2]**：[触发场景和表现]\n`;
        markdown += `- **[压力源3]**：[触发场景和表现]\n\n`;

        markdown += `### 🌊 压力应对策略\n`;
        markdown += `- **预防策略**：[基于人格特质的预防方法]\n`;
        markdown += `- **应对策略**：[压力出现时的有效应对方法]\n`;
        markdown += `- **恢复策略**：[压力后的恢复和调适方法]\n\n`;

        markdown += `---\n\n`;

        // 新增：总结
        markdown += `## 八、综合总结与行动建议\n\n`;
        markdown += `### 🎯 一句话人格画像\n`;
        markdown += `[基于完整分析的一句话总结]\n\n`;

        markdown += `### 🚀 核心行动建议\n`;
        markdown += `1. **[行动建议1]**：[基于优势发挥的具体行动]\n`;
        markdown += `2. **[行动建议2]**：[基于盲区改善的具体行动]\n`;
        markdown += `3. **[行动建议3]**：[基于职业发展的具体行动]\n`;
        markdown += `4. **[行动建议4]**：[基于人际关系的具体行动]\n\n`;

        markdown += `### 📋 发展检查清单\n`;
        markdown += `- [ ] [基于分析的定期自我检查项目1]\n`;
        markdown += `- [ ] [基于分析的定期自我检查项目2]\n`;
        markdown += `- [ ] [基于分析的定期自我检查项目3]\n`;
        markdown += `- [ ] [基于分析的定期自我检查项目4]\n\n`;

        markdown += `---\n\n`;
        markdown += `*📊 本报告基于您的MBTI测试结果和答题行为数据生成，建议结合实际情况进行个性化调整。*\n\n`;

        return markdown;
    }

    /**
     * 导出Markdown报告
     */
    exportToMarkdown() {
        const markdownData = this.generateMarkdownReport();
        const blob = new Blob([markdownData], { type: 'text/markdown;charset=utf-8;' });
        const link = document.createElement("a");

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `mbti_analysis_${this.testId}.md`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * 预览CSV数据（前5行）
     */
    previewCSV() {
        const csvData = this.convertToCSV();
        const lines = csvData.split('\n');
        const previewLines = lines.slice(0, Math.min(6, lines.length)); // 头部 + 前5行数据

        return previewLines.join('\n');
    }

    /**
     * 导出为CSV格式
     */
    exportToCSV() {
        const csvData = this.convertToCSV();
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `mbti_test_${this.testId}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * 将分数转换为文字答案
     */
    scoreToText(score) {
        const scoreMap = {
            1: '非常不符合',
            2: '不太符合',
            3: '一般',
            4: '比较符合',
            5: '非常符合'
        };
        return scoreMap[score] || '未作答';
    }

    /**
     * 转换为CSV格式 - 每个题目一行详细信息（中文表头）
     */
    convertToCSV() {
        // CSV头部信息 - 使用中文
        const headers = [
            '测试ID', 'IP地址', '开始时间', '结束时间', '总用时(毫秒)',
            '题目编号', '题目内容', '最终答案', '停留时间(毫秒)', '修改次数',
            '选择历史', '首次查看时间', '邮箱', '工作岗位', '年龄', 'MBTI类型', 'EI百分比', 'SN百分比', 'TF百分比', 'JP百分比'
        ];

        let csvContent = headers.join(',') + '\n';

        // 为每个题目生成一行数据
        const sortedQuestions = Array.from(this.questionData.values()).sort((a, b) => a.questionId - b.questionId);

        sortedQuestions.forEach(questionData => {
            // 转换选择历史为文字版本
            const textSelections = questionData.selections.map(selection => ({
                答案: this.scoreToText(selection.score),
                时间: selection.timestamp
            }));

            // 获取MBTI结果信息（如果存在）
            const mbtiResult = this.testData.mbtiResult;
            const mbtiType = mbtiResult ? mbtiResult.type : '';
            const eiPercent = mbtiResult ? `E=${mbtiResult.percentages.EI.E}%/I=${mbtiResult.percentages.EI.I}%` : '';
            const snPercent = mbtiResult ? `S=${mbtiResult.percentages.SN.S}%/N=${mbtiResult.percentages.SN.N}%` : '';
            const tfPercent = mbtiResult ? `T=${mbtiResult.percentages.TF.T}%/F=${mbtiResult.percentages.TF.F}%` : '';
            const jpPercent = mbtiResult ? `J=${mbtiResult.percentages.JP.J}%/P=${mbtiResult.percentages.JP.P}%` : '';

            const row = [
                this.testData.testId,
                this.testData.ip,
                this.testData.startTime,
                this.testData.endTime,
                this.testData.totalDuration,
                questionData.questionId,
                `"${questionData.questionText.replace(/"/g, '""')}"`, // 处理CSV中的引号
                `"${this.scoreToText(questionData.finalScore)}"`, // 文字答案
                questionData.stayTime || 0,
                questionData.totalChanges || 0,
                `"${JSON.stringify(textSelections).replace(/"/g, '""')}"`, // 文字选择历史
                questionData.firstViewTime || '',
                this.testData.optionalInfo.email,
                this.testData.optionalInfo.jobTitle,
                this.testData.optionalInfo.age,
                mbtiType,
                `"${eiPercent}"`,
                `"${snPercent}"`,
                `"${tfPercent}"`,
                `"${jpPercent}"`
            ];

            csvContent += row.join(',') + '\n';
        });

        // 添加汇总行 - 使用中文，突出MBTI结果
        const mbtiResult = this.testData.mbtiResult;
        const mbtiType = mbtiResult ? mbtiResult.type : '未知';
        const eiPercent = mbtiResult ? `E=${mbtiResult.percentages.EI.E}%/I=${mbtiResult.percentages.EI.I}%` : '未计算';
        const snPercent = mbtiResult ? `S=${mbtiResult.percentages.SN.S}%/N=${mbtiResult.percentages.SN.N}%` : '未计算';
        const tfPercent = mbtiResult ? `T=${mbtiResult.percentages.TF.T}%/F=${mbtiResult.percentages.TF.F}%` : '未计算';
        const jpPercent = mbtiResult ? `J=${mbtiResult.percentages.JP.J}%/P=${mbtiResult.percentages.JP.P}%` : '未计算';

        const summaryRow = [
            this.testData.testId,
            this.testData.ip,
            this.testData.startTime,
            this.testData.endTime,
            this.testData.totalDuration,
            '汇总统计',
            `"测试结果：MBTI类型=${mbtiType}"`, // 突出MBTI结果
            `"完成${this.testData.choices.length}道题"`, // 文字描述
            this.testData.stayTimes.reduce((sum, time) => sum + time, 0), // 总停留时间
            this.testData.changeCounts.reduce((sum, count) => sum + count, 0), // 总修改次数
            `"平均用时${Math.round(this.testData.stayTimes.reduce((sum, time) => sum + time, 0) / this.testData.choices.length)}毫秒"`,
            '',
            this.testData.optionalInfo.email,
            this.testData.optionalInfo.jobTitle,
            this.testData.optionalInfo.age,
            mbtiType, // MBTI类型
            `"${eiPercent}"`, // EI维度百分比
            `"${snPercent}"`, // SN维度百分比
            `"${tfPercent}"`, // TF维度百分比
            `"${jpPercent}"`  // JP维度百分比
        ];

        csvContent += summaryRow.join(',') + '\n';

        return csvContent;
    }

    /**
     * 获取详细统计信息
     */
    getDetailedStats() {
        const stats = {
            testId: this.testData.testId,
            totalDuration: this.formatDuration(this.testData.totalDuration),
            questionCount: this.testData.questions.length,
            averageStayTime: 0,
            totalChanges: 0,
            fastestQuestion: null,
            slowestQuestion: null,
            mostChangedQuestion: null,
            completionRate: 0
        };

        if (this.testData.stayTimes.length > 0) {
            const totalStayTime = this.testData.stayTimes.reduce((sum, time) => sum + time, 0);
            stats.averageStayTime = this.formatDuration(totalStayTime / this.testData.stayTimes.length);

            const maxStayTime = Math.max(...this.testData.stayTimes);
            const minStayTime = Math.min(...this.testData.stayTimes);
            const maxChanges = Math.max(...this.testData.changeCounts);

            stats.fastestQuestion = {
                questionId: this.testData.questions[this.testData.stayTimes.indexOf(minStayTime)],
                time: this.formatDuration(minStayTime)
            };

            stats.slowestQuestion = {
                questionId: this.testData.questions[this.testData.stayTimes.indexOf(maxStayTime)],
                time: this.formatDuration(maxStayTime)
            };

            if (maxChanges > 0) {
                stats.mostChangedQuestion = {
                    questionId: this.testData.questions[this.testData.changeCounts.indexOf(maxChanges)],
                    changes: maxChanges
                };
            }
        }

        stats.totalChanges = this.testData.changeCounts.reduce((sum, count) => sum + count, 0);
        stats.completionRate = (this.testData.choices.filter(choice => choice > 0).length / this.testData.questions.length) * 100;

        return stats;
    }

    /**
     * 格式化时间显示
     */
    formatDuration(milliseconds) {
        if (!milliseconds) return '0s';

        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${remainingSeconds}s`;
        }
    }
}

// For module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestDataRecorder;
}