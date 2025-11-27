export interface Question {
  id: number;
  dimension: 'EI' | 'SN' | 'TF' | 'JP';
  question: string;
  reverse: boolean;
}

export interface Answer {
  questionId: number;
  score: number; // 1-5
}

export interface DimensionScores {
  E: number;
  I: number;
  S: number;
  N: number;
  T: number;
  F: number;
  J: number;
  P: number;
}

export interface MBTIResult {
  type: string;
  percentages: {
    EI: { E: number; I: number };
    SN: { S: number; N: number };
    TF: { T: number; F: number };
    JP: { J: number; P: number };
  };
}

export class MBTICalculator {
  private questions: Question[] = [];

  constructor(questions: Question[] = []) {
    this.questions = questions;
  }

  loadQuestions(questions: Question[]): void {
    this.questions = questions;
  }

  calculateScores(answers: Answer[]): DimensionScores {
    const scores: DimensionScores = {
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

  calculateResult(scores: DimensionScores): MBTIResult {
    const calcPercentage = (a: number, b: number): { a: number; b: number } => {
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
      percentages: { EI, SN, TF, JP }
    };
  }
}

export function parseCSV(csvText: string): Question[] {
  const lines = csvText.trim().split('\n');
  const questions: Question[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(/^(\d+),(EI|SN|TF|JP),([^,]+),(true|false)$/);
    if (!match) continue;

    const [, id, dimension, question, reverse] = match;

    questions.push({
      id: parseInt(id),
      dimension: dimension as 'EI' | 'SN' | 'TF' | 'JP',
      question: question.trim(),
      reverse: reverse === 'true'
    });
  }

  return questions;
}