class MBTIApp {
  constructor() {
    this.calculator = new MBTICalculator();
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.answers = [];
    this.isProcessing = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.startScreen = document.getElementById('start-screen');
    this.questionScreen = document.getElementById('question-screen');
    this.resultScreen = document.getElementById('result-screen');
    this.startBtn = document.getElementById('start-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.questionNumber = document.getElementById('question-number');
    this.questionText = document.getElementById('question-text');
    this.progressFill = document.getElementById('progress-fill');
    this.answerOptions = document.querySelectorAll('.option');
    this.mbtiType = document.getElementById('mbti-type');
    this.percentages = document.getElementById('percentages');
  }

  bindEvents() {
    this.startBtn.addEventListener('click', () => this.startTest());
    this.restartBtn.addEventListener('click', () => this.restartTest());

    this.answerOptions.forEach(option => {
      option.addEventListener('click', (e) => this.selectAnswer(e));
    });

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
      alert('加载题目失败，请刷新页面重试');
    }
  }

  async startTest() {
    await this.loadQuestions();

    console.log('加载的题目数量:', this.questions.length);
    console.log('前3个题目:', this.questions.slice(0, 3));

    if (this.questions.length === 0) {
      alert('题目加载失败');
      return;
    }

    // 验证题目数据完整性
    const hasInvalidQuestion = this.questions.some(q => !q.id || !q.dimension || !q.question);
    if (hasInvalidQuestion) {
      console.error('发现无效题目数据');
      alert('题目数据不完整');
      return;
    }

    this.answers = [];
    this.currentQuestionIndex = 0;
    this.showQuestion();
    this.showScreen('question-screen');
  }

  showQuestion() {
    const question = this.questions[this.currentQuestionIndex];

    this.questionNumber.textContent = `${this.currentQuestionIndex + 1} / ${this.questions.length}`;
    this.questionText.textContent = question.question;

    const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
    this.progressFill.style.width = `${progress}%`;

    // Clear previous selection
    this.answerOptions.forEach(option => option.classList.remove('selected'));
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
    this.answers.push(answer);

    // Move to next question or show results
    setTimeout(() => {
      this.isProcessing = false;
      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++;
        this.showQuestion();
      } else {
        this.showResults();
      }
    }, 300);
  }

  showResults() {
    console.log('答案数组:', this.answers);
    console.log('题目数量:', this.questions.length);

    if (this.answers.length === 0) {
      alert('没有答案数据');
      return;
    }

    const scores = this.calculator.calculateScores(this.answers);
    console.log('计算得分:', scores);

    const result = this.calculator.calculateResult(scores);
    console.log('计算结果:', result);

    if (!result || !result.type || !result.percentages) {
      console.error('结果计算失败:', result);
      alert('结果计算失败');
      return;
    }

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
    this.showScreen('result-screen');
  }

  restartTest() {
    this.showScreen('start-screen');
  }

  showScreen(screenId) {
    this.startScreen.classList.remove('active');
    this.questionScreen.classList.remove('active');
    this.resultScreen.classList.remove('active');

    document.getElementById(screenId).classList.add('active');
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new MBTIApp();
});