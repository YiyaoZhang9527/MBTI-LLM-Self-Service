class MBTICalculator {
  constructor(questions = []) {
    this.questions = questions;
  }

  loadQuestions(questions) {
    this.questions = questions;
  }

  calculateScores(answers) {
    const scores = {
      E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0
    };

    const answerMap = new Map(answers.map(a => [a.questionId, a.score]));

    console.log('🧮 开始计算MBTI分数...');
    console.log(`📝 有效答案数量: ${answers.length}`);

    for (const question of this.questions) {
      const score = answerMap.get(question.id);
      if (score === undefined) continue;  // 只有undefined才跳过

      // Python标准算法：每道题都要给两个维度加分
      switch (question.dimension) {
        case 'EI':
          if (question.reverse) {
            // I题：I得原始分，E得反向分
            scores.I += score;
            scores.E += 6 - score;
            console.log(`  I题ID${question.id}: I+${score} E+${6-score} -> I=${scores.I} E=${scores.E}`);
          } else {
            // E题：E得原始分，I得反向分
            scores.E += score;
            scores.I += 6 - score;
            console.log(`  E题ID${question.id}: E+${score} I+${6-score} -> E=${scores.E} I=${scores.I}`);
          }
          break;
        case 'SN':
          if (question.reverse) {
            // N题：N得原始分，S得反向分
            scores.N += score;
            scores.S += 6 - score;
          } else {
            // S题：S得原始分，N得反向分
            scores.S += score;
            scores.N += 6 - score;
          }
          break;
        case 'TF':
          if (question.reverse) {
            // F题：F得原始分，T得反向分
            scores.F += score;
            scores.T += 6 - score;
          } else {
            // T题：T得原始分，F得反向分
            scores.T += score;
            scores.F += 6 - score;
          }
          break;
        case 'JP':
          if (question.reverse) {
            // P题：P得原始分，J得反向分
            scores.P += score;
            scores.J += 6 - score;
          } else {
            // J题：J得原始分，P得反向分
            scores.J += score;
            scores.P += 6 - score;
          }
          break;
      }
    }

    console.log(`✅ 计算完成: E=${scores.E} I=${scores.I} S=${scores.S} N=${scores.N} T=${scores.T} F=${scores.F} J=${scores.J} P=${scores.P}`);
    return scores;
  }

  calculateResult(scores) {
    // 标准百分比计算函数
    const calcPercentage = (a, b) => {
      const total = a + b;
      if (total === 0) return { a: 50, b: 50 };
      return {
        a: Math.round(a / total * 100 * 10) / 10,
        b: Math.round(b / total * 100 * 10) / 10
      };
    };

    console.log('📊 计算MBTI类型和百分比...');

    // 计算各维度百分比分布
    const EI = calcPercentage(scores.E, scores.I);
    const SN = calcPercentage(scores.S, scores.N);
    const TF = calcPercentage(scores.T, scores.F);
    const JP = calcPercentage(scores.J, scores.P);

    // 确定MBTI类型：得分高的一侧确定偏好
    const type =
      (scores.E >= scores.I ? 'E' : 'I') +
      (scores.S >= scores.N ? 'S' : 'N') +
      (scores.T >= scores.F ? 'T' : 'F') +
      (scores.J >= scores.P ? 'J' : 'P');

    const result = {
      type,
      scores: scores,
      percentages: {
        EI: { E: EI.a, I: EI.b },
        SN: { S: SN.a, N: SN.b },
        TF: { T: TF.a, F: TF.b },
        JP: { J: JP.a, P: JP.b }
      }
    };

    console.log(`🎯 MBTI类型: ${result.type}`);
    console.log(`📈 标准版百分比分布:`);
    console.log(`  EI维度: E=${result.percentages.EI.E}% / I=${result.percentages.EI.I}% (总计${scores.E + scores.I}分)`);
    console.log(`  SN维度: S=${result.percentages.SN.S}% / N=${result.percentages.SN.N}% (总计${scores.S + scores.N}分)`);
    console.log(`  TF维度: T=${result.percentages.TF.T}% / F=${result.percentages.TF.F}% (总计${scores.T + scores.F}分)`);
    console.log(`  JP维度: J=${result.percentages.JP.J}% / P=${result.percentages.JP.P}% (总计${scores.J + scores.P}分)`);

    return result;
  }
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const questions = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 分割成4个部分：id, dimension, question, reverse
    const firstComma = line.indexOf(',');
    const lastComma = line.lastIndexOf(',');

    if (firstComma === -1 || lastComma === -1 || firstComma === lastComma) continue;

    const id = line.substring(0, firstComma);
    const reverse = line.substring(lastComma + 1);
    const middle = line.substring(firstComma + 1, lastComma);

    const middleComma = middle.indexOf(',');
    if (middleComma === -1) continue;

    const dimension = middle.substring(0, middleComma);
    const question = middle.substring(middleComma + 1);

    questions.push({
      id: parseInt(id),
      dimension: dimension.trim(),
      question: question.trim(),
      reverse: reverse.trim() === 'true'
    });
  }

  return questions;
}

// For module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MBTICalculator, parseCSV };
}