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

    for (const question of this.questions) {
      const score = answerMap.get(question.id);
      if (!score) continue;

      const normalizedScore = question.reverse ? 6 - score : score;

      switch (question.dimension) {
        case 'EI':
          scores.E += normalizedScore;
          scores.I += 6 - normalizedScore;
          break;
        case 'SN':
          scores.S += normalizedScore;
          scores.N += 6 - normalizedScore;
          break;
        case 'TF':
          scores.T += normalizedScore;
          scores.F += 6 - normalizedScore;
          break;
        case 'JP':
          scores.J += normalizedScore;
          scores.P += 6 - normalizedScore;
          break;
      }
    }

    return scores;
  }

  calculateResult(scores) {
    const calcPercentage = (a, b) => {
      const total = a + b;
      if (total === 0) return { a: 50, b: 50 };
      return {
        a: Math.round(a / total * 100 * 10) / 10,
        b: Math.round(b / total * 100 * 10) / 10
      };
    };

    const EI = calcPercentage(scores.E, scores.I);
    const SN = calcPercentage(scores.S, scores.N);
    const TF = calcPercentage(scores.T, scores.F);
    const JP = calcPercentage(scores.J, scores.P);

    const type =
      (scores.E >= scores.I ? 'E' : 'I') +
      (scores.S >= scores.N ? 'S' : 'N') +
      (scores.T >= scores.F ? 'T' : 'F') +
      (scores.J >= scores.P ? 'J' : 'P');

    return {
      type,
      percentages: {
        EI: { E: EI.a, I: EI.b },
        SN: { S: SN.a, N: SN.b },
        TF: { T: TF.a, F: TF.b },
        JP: { J: JP.a, P: JP.b }
      }
    };
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