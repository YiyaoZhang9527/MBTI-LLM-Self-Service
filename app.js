class MBTIApp {
  constructor() {
    this.calculator = new MBTICalculator();
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.answers = [];
    this.isProcessing = false;

    // 添加测试数据记录器
    this.dataRecorder = new TestDataRecorder();

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.startScreen = document.getElementById('start-screen');
    this.questionScreen = document.getElementById('question-screen');
    this.resultScreen = document.getElementById('result-screen');
    this.startBtn = document.getElementById('start-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.backBtn = document.getElementById('back-btn');
    this.nextBtn = document.getElementById('next-btn');
    this.questionNumber = document.getElementById('question-number');
    this.questionText = document.getElementById('question-text');
    this.progressFill = document.getElementById('progress-fill');
    this.answerOptions = document.querySelectorAll('.option');
    this.mbtiType = document.getElementById('mbti-type');
    this.percentages = document.getElementById('percentages');

    // 测试详细信息相关元素
    this.testDetails = document.getElementById('test-details');
    this.toggleDetailsBtn = document.getElementById('toggle-details-btn');
    this.detailedStats = document.getElementById('detailed-stats');
    this.saveInfoBtn = document.getElementById('save-info-btn');
    this.exportCsvBtn = document.getElementById('export-csv-btn');
    this.exportMdBtn = document.getElementById('export-md-btn');
    this.userEmail = document.getElementById('user-email');
    this.userJob = document.getElementById('user-job');
    this.userAge = document.getElementById('user-age');
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.startTest());
    this.restartBtn.addEventListener('click', () => this.restartTest());
    this.backBtn.addEventListener('click', () => this.goBack());
    this.nextBtn.addEventListener('click', () => this.goNext());

    this.answerOptions.forEach(option => {
      option.addEventListener('click', (e) => this.selectAnswer(e));
    });

    // 测试详细信息相关事件
    this.toggleDetailsBtn.addEventListener('click', () => this.toggleTestDetails());
    this.saveInfoBtn.addEventListener('click', () => this.saveOptionalInfo());
    this.exportCsvBtn.addEventListener('click', () => this.exportToCSV());
    this.exportMdBtn.addEventListener('click', () => this.exportMarkdown());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (this.questionScreen.classList.contains('active')) {
        const score = parseInt(e.key);
        if (!isNaN(score) && score >= 1 && score <= 5) {
          this.selectAnswer(score);
        }
      }
    });
  }

  async loadQuestions() {
    try {
      const response = await fetch('questions.csv');
      const csvText = await response.text();
      this.questions = parseCSV(csvText);
      this.calculator.loadQuestions(this.questions);
    } catch (error) {
      console.error('Failed to load questions:', error);
      this.showError('加载题目失败，请刷新页面重试');
    }
  }

  async startTest() {
    await this.loadQuestions();

    console.log('加载的题目数量:', this.questions.length);
    console.log('前3个题目:', this.questions.slice(0, 3));

    if (this.questions.length === 0) {
      this.showError('题目加载失败');
      return;
    }

    // 验证题目数据完整性
    const hasInvalidQuestion = this.questions.some(q => !q.id || !q.dimension || !q.question);
    if (hasInvalidQuestion) {
      console.error('发现无效题目数据');
      this.showError('题目数据不完整');
      return;
    }

    // 开始数据记录
    this.dataRecorder.startTest();
    this.dataRecorder.fetchIpAddress(); // 异步获取IP

    this.answers = [];
    this.currentQuestionIndex = 0;
    this.showQuestion();
    this.showScreen('question-screen');
  }

  showQuestion() {
    const question = this.questions[this.currentQuestionIndex];

    // 结束上一题的记录
    if (this.currentQuestionIndex > 0) {
      const prevQuestion = this.questions[this.currentQuestionIndex - 1];
      this.dataRecorder.endQuestion(prevQuestion.id);
    }

    // 开始记录当前题目
    this.dataRecorder.startQuestion(question.id, question.question);

    this.questionNumber.textContent = `${this.currentQuestionIndex + 1} / ${this.questions.length}`;
    this.questionText.textContent = question.question;

    const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
    this.progressFill.style.width = `${progress}%`;

    // Update back button state
    this.updateBackButton();
    this.updateNextButton();

    // Clear previous selection
    this.answerOptions.forEach(option => option.classList.remove('selected'));

    // Restore previous answer if exists
    if (this.answers[this.currentQuestionIndex]) {
      const previousScore = this.answers[this.currentQuestionIndex].score;
      const previousOption = document.querySelector(`[data-score="${previousScore}"]`);
      if (previousOption) {
        previousOption.classList.add('selected');
      }
      this.selectedScore = previousScore; // 恢复选择状态
    } else {
      this.selectedScore = undefined; // 清除选择状态
    }
  }

  selectAnswer(event) {
    // 防止重复点击
    if (this.isProcessing) return;
    this.isProcessing = true;

    let score;
    if (typeof event === 'number') {
      score = event;
      // Find and select the corresponding option
      this.answerOptions.forEach(option => {
        if (parseInt(option.dataset.score) === score) {
          option.classList.add('selected');
        }
      });
    } else {
      const option = event.target.closest('.option');
      if (!option) {
        this.isProcessing = false;
        return;
      }

      score = parseInt(option.dataset.score);
      this.answerOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    }

    // 验证分数有效
    if (isNaN(score) || score < 1 || score > 5) {
      this.isProcessing = false;
      return;
    }

    // Store selected score and update UI
    this.selectedScore = score;
    this.updateNextButton();

    // Save answer
    const question = this.questions[this.currentQuestionIndex];
    if (!question) {
      console.error('题目不存在:', this.currentQuestionIndex);
      this.isProcessing = false;
      return;
    }

    const answer = {
      questionId: question.id,
      score: score
    };

    console.log('保存答案:', answer);
    // Store answer by index (allows overwriting when going back)
    this.answers[this.currentQuestionIndex] = answer;

    // 记录用户选择
    this.dataRecorder.recordSelection(question.id, score);

    // Move to next question or show results
    setTimeout(() => {
      this.isProcessing = false;

      if (this.currentQuestionIndex < this.questions.length - 1) {
        console.log(`📝 跳转到下一题: ${this.currentQuestionIndex + 1}/${this.questions.length}`);
        this.currentQuestionIndex++;
        this.showQuestion();
      } else {
        console.log('🎉 答题完成，开始计算结果...');
        this.showResults();
      }
    }, 300);
  }

  showResults() {
    console.log('答案数组:', this.answers);
    console.log('题目数量:', this.questions.length);

    // 结束最后一题的记录
    if (this.currentQuestionIndex >= 0 && this.questions[this.currentQuestionIndex]) {
      this.dataRecorder.endQuestion(this.questions[this.currentQuestionIndex].id);
    }

    // 完成测试记录
    const testData = this.dataRecorder.completeTest();
    console.log('📊 完整测试数据:', testData);

    // 过滤出有效的答案（不是undefined的）
    const validAnswers = this.answers.filter(answer => answer !== undefined);
    console.log('有效答案数量:', validAnswers.length);

    if (validAnswers.length === 0) {
      this.showError('没有答案数据');
      return;
    }

    const scores = this.calculator.calculateScores(validAnswers);
    console.log('计算得分:', scores);

    const result = this.calculator.calculateResult(scores);
    console.log('计算结果:', result);

    if (!result || !result.type || !result.percentages) {
      console.error('结果计算失败:', result);
      this.showError('结果计算失败');
      return;
    }

    // 存储测试数据供后续使用
    this.currentTestData = testData;
    this.currentResult = result;

    // 记录MBTI测试结果到数据记录器
    this.dataRecorder.recordMBTIResult(result);

    this.mbtiType.textContent = result.type;

    const percentageHTML = `
      <div class="percentage-row">
        <span class="dimension-label">E/I</span>
        <div class="percentage-bar">
          <div class="percentage-fill" style="width: ${result.percentages.EI.E}%"></div>
        </div>
        <div class="percentage-values">
          <span>${result.percentages.EI.E}%</span>
          <span>${result.percentages.EI.I}%</span>
        </div>
      </div>
      <div class="percentage-row">
        <span class="dimension-label">S/N</span>
        <div class="percentage-bar">
          <div class="percentage-fill" style="width: ${result.percentages.SN.S}%"></div>
        </div>
        <div class="percentage-values">
          <span>${result.percentages.SN.S}%</span>
          <span>${result.percentages.SN.N}%</span>
        </div>
      </div>
      <div class="percentage-row">
        <span class="dimension-label">T/F</span>
        <div class="percentage-bar">
          <div class="percentage-fill" style="width: ${result.percentages.TF.T}%"></div>
        </div>
        <div class="percentage-values">
          <span>${result.percentages.TF.T}%</span>
          <span>${result.percentages.TF.F}%</span>
        </div>
      </div>
      <div class="percentage-row">
        <span class="dimension-label">J/P</span>
        <div class="percentage-bar">
          <div class="percentage-fill" style="width: ${result.percentages.JP.J}%"></div>
        </div>
        <div class="percentage-values">
          <span>${result.percentages.JP.J}%</span>
          <span>${result.percentages.JP.P}%</span>
        </div>
      </div>
    `;

    this.percentages.innerHTML = percentageHTML;
    console.log('✨ 结果页面已准备，切换到结果屏幕...');
    this.showScreen('result-screen');
  }

  // 切换测试详细信息显示
  toggleTestDetails() {
    if (this.testDetails.style.display === 'none' || !this.testDetails.style.display) {
      this.showTestDetails();
      this.testDetails.style.display = 'block';
      this.toggleDetailsBtn.textContent = '隐藏测试详情';
    } else {
      this.testDetails.style.display = 'none';
      this.toggleDetailsBtn.textContent = '查看测试详情';
    }
  }

  // 显示测试详细统计
  showTestDetails() {
    if (!this.currentTestData) return;

    const stats = this.dataRecorder.getDetailedStats();

    const statsHTML = `
      <div class="stats-grid">
        <div class="stat-item stat-highlight">
          <div class="stat-label">测试ID</div>
          <div class="stat-value">${stats.testId}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">总测试时长</div>
          <div class="stat-value">${stats.totalDuration}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">答题数量</div>
          <div class="stat-value">${stats.questionCount}题</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">平均答题时间</div>
          <div class="stat-value">${stats.averageStayTime}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">总修改次数</div>
          <div class="stat-value">${stats.totalChanges}次</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">完成率</div>
          <div class="stat-value">${stats.completionRate.toFixed(1)}%</div>
        </div>
      </div>
      ${stats.fastestQuestion ? `
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">最快答题</div>
            <div class="stat-value">题目${stats.fastestQuestion.questionId} (${stats.fastestQuestion.time})</div>
          </div>
          ${stats.slowestQuestion ? `
            <div class="stat-item">
              <div class="stat-label">最慢答题</div>
              <div class="stat-value">题目${stats.slowestQuestion.questionId} (${stats.slowestQuestion.time})</div>
            </div>
          ` : ''}
          ${stats.mostChangedQuestion ? `
            <div class="stat-item">
              <div class="stat-label">修改最多</div>
              <div class="stat-value">题目${stats.mostChangedQuestion.questionId} (${stats.mostChangedQuestion.changes}次)</div>
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;

    this.detailedStats.innerHTML = statsHTML;
  }

  // 保存可选信息
  saveOptionalInfo() {
    const email = this.userEmail.value.trim();
    const jobTitle = this.userJob.value.trim();
    const age = this.userAge.value.trim();

    this.dataRecorder.recordOptionalInfo(email, jobTitle, age);

    // 显示保存成功提示
    this.saveInfoBtn.textContent = '✅ 已保存';
    this.saveInfoBtn.disabled = true;

    setTimeout(() => {
      this.saveInfoBtn.textContent = '保存信息';
      this.saveInfoBtn.disabled = false;
    }, 2000);

    console.log('📝 保存用户信息:', { email, jobTitle, age });
  }

  
  // 导出CSV
  exportToCSV() {
    if (!this.currentTestData) {
      alert('没有测试数据可导出');
      return;
    }

    this.dataRecorder.exportToCSV();
    console.log('📊 CSV导出完成');
  }

  // 导出Markdown分析报告
  async exportMarkdown() {
    if (!this.currentTestData) {
      alert('没有测试数据可导出');
      return;
    }

    // 检查是否有LLM分析管理器
    if (window.mbtiAnalysisManager) {
      try {
        // 尝试生成AI分析报告
        await window.mbtiAnalysisManager.generateAndExportAnalysis();
      } catch (error) {
        // 如果AI分析失败，提供备选方案
        console.warn('🤖 AI分析失败，使用原始模板:', error.message);

        const userChoice = confirm(
          `AI分析暂时不可用: ${error.message}\n\n` +
          '是否下载原始分析模板？'
        );

        if (userChoice) {
          this.dataRecorder.exportToMarkdown();
          console.log('📄 原始分析模板导出完成');
        }
      }
    } else {
      // 如果没有LLM分析管理器，使用原始导出
      this.dataRecorder.exportToMarkdown();
      console.log('📄 分析报告导出完成');
    }
  }

  restartTest() {
    this.showScreen('start-screen');
  }

  showError(message) {
    // 在开始按钮上显示错误
    if (this.startBtn) {
      this.startBtn.textContent = '❌ ' + message;
      this.startBtn.style.background = '#ff4444';
      this.startBtn.style.color = 'white';

      // 3秒后恢复原状
      setTimeout(() => {
        this.startBtn.textContent = '开始测试';
        this.startBtn.style.background = '';
        this.startBtn.style.color = '';
      }, 3000);
    }

    // 同时在控制台显示错误
    console.error('MBTI错误:', message);
  }

  updateBackButton() {
    if (this.currentQuestionIndex > 0) {
      this.backBtn.disabled = false;
    } else {
      this.backBtn.disabled = true;
    }
  }

  updateNextButton() {
    // 如果是最后一题，禁用下一题按钮
    if (this.currentQuestionIndex >= this.questions.length - 1) {
      this.nextBtn.disabled = true;
      this.nextBtn.textContent = '完成测试';
    } else if (this.selectedScore !== undefined) {
      // 已选择答案，启用下一题按钮
      this.nextBtn.disabled = false;
      this.nextBtn.textContent = '下一题 →';
    } else {
      // 未选择答案，禁用下一题按钮
      this.nextBtn.disabled = true;
      this.nextBtn.textContent = '下一题 →';
    }
  }

  goNext() {
    // 如果已经是最后一题，直接显示结果
    if (this.currentQuestionIndex >= this.questions.length - 1) {
      this.showResults();
      return;
    }

    // 直接跳转到下一题，不检查是否已选择（作为便捷功能）
    if (this.currentQuestionIndex < this.questions.length - 1 && !this.isProcessing) {
      this.currentQuestionIndex++;
      this.showQuestion();
    }
  }

  goBack() {
    if (this.currentQuestionIndex > 0 && !this.isProcessing) {
      this.currentQuestionIndex--;
      this.showQuestion();
    }
  }

  showScreen(screenId) {
    console.log(`🖼️ 切换屏幕: ${screenId}`);
    this.startScreen.classList.remove('active');
    this.questionScreen.classList.remove('active');
    this.resultScreen.classList.remove('active');

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.add('active');
      console.log(`✅ 成功切换到屏幕: ${screenId}`);
    } else {
      console.error(`❌ 找不到目标屏幕: ${screenId}`);
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MBTIApp();
});