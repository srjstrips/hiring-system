import { prisma } from '@/config/database';

export interface ScoringResult {
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  isPassed: boolean;
  result: 'PASS' | 'FAIL';
}

export interface PersonalityTraitScoreResult {
  traitName: string;
  totalScore: number;
  questionCount: number;
  averageScore: number;
  level: number;
  levelLabel: string;
}

class AssessmentsScoringService {
  /**
   * Calculate generic scoring for TECHNICAL, APTITUDE, DEPARTMENT, GENERAL assessments
   * Correct answer = marks, Wrong answer = 0, Unanswered = 0
   */
  async calculateGenericScore(
    attemptId: string,
    assessmentId: string,
    passingScore: number
  ): Promise<ScoringResult> {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            attemptQuestion: true,
            selectedOption: true,
          },
        },
        assessment: {
          include: {
            questions: {
              include: { optionItems: true },
            },
          },
        },
      },
    });

    if (!attempt) throw new Error('Attempt not found');

    let totalMarks = 0;
    let obtainedMarks = 0;

    // Calculate total marks available
    for (const question of attempt.assessment.questions) {
      totalMarks += question.marks;
    }

    // Calculate obtained marks
    for (const answer of attempt.answers) {
      const question = attempt.assessment.questions.find(
        (q) => q.id === answer.questionId
      );
      if (!question) continue;

      // Check if answer is correct
      const isCorrect = this.isAnswerCorrect(answer, question);
      if (isCorrect) {
        obtainedMarks += question.marks;
      }
    }

    const percentage = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
    const isPassed = percentage >= passingScore;

    return {
      totalMarks,
      obtainedMarks,
      percentage: Math.round(percentage * 100) / 100,
      isPassed,
      result: isPassed ? 'PASS' : 'FAIL',
    };
  }

  /**
   * Calculate personality trait scores for personality assessments
   * Uses 1-5 rating scale responses and maps to trait levels
   */
  async calculatePersonalityTraitScores(
    attemptId: string,
    assessmentId: string
  ): Promise<PersonalityTraitScoreResult[]> {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            attemptQuestion: true,
            selectedOption: true,
          },
        },
        assessment: {
          include: {
            questions: {
              include: { optionItems: true },
            },
            traits: true,
          },
        },
      },
    });

    if (!attempt) throw new Error('Attempt not found');

    // Group answers by trait
    const traitScores = new Map<string, { total: number; count: number }>();

    for (const answer of attempt.answers) {
      const question = attempt.assessment.questions.find(
        (q) => q.id === answer.questionId
      );

      if (!question || !question.trait) continue;

      // Get the numeric value of the response (1-5)
      const responseValue = this.extractRatingScaleValue(answer, question);
      if (responseValue === null) continue;

      if (!traitScores.has(question.trait)) {
        traitScores.set(question.trait, { total: 0, count: 0 });
      }

      const score = traitScores.get(question.trait)!;
      score.total += responseValue;
      score.count += 1;
    }

    // Convert to trait results
    const results: PersonalityTraitScoreResult[] = [];

    for (const [traitName, { total, count }] of traitScores.entries()) {
      const traitConfig = attempt.assessment.traits.find(
        (t) => t.traitName === traitName
      );

      if (!traitConfig) continue;

      const averageScore = count > 0 ? total / count : 0;
      const level = this.convertAverageToLevel(averageScore, 5);
      const levelLabel = this.getLevelLabel(level, traitConfig);

      results.push({
        traitName,
        totalScore: total,
        questionCount: count,
        averageScore: Math.round(averageScore * 100) / 100,
        level,
        levelLabel,
      });

      // Save trait score to database
      await prisma.assessmentTraitScore.upsert({
        where: {
          attemptId_traitName: {
            attemptId,
            traitName,
          },
        },
        create: {
          attemptId,
          candidateId: attempt.candidateId,
          assessmentId,
          traitName,
          totalScore: total,
          questionCount: count,
          averageScore: Math.round(averageScore * 100) / 100,
          level,
        },
        update: {
          totalScore: total,
          questionCount: count,
          averageScore: Math.round(averageScore * 100) / 100,
          level,
        },
      });
    }

    return results;
  }

  /**
   * Check if an answer is correct for a given question
   */
  private isAnswerCorrect(answer: any, question: any): boolean {
    // For MCQ - check if selected option is marked as correct
    if (question.questionType === 'MCQ') {
      if (!answer.selectedOption) return false;
      return answer.selectedOption.isCorrect;
    }

    // For TRUE_FALSE - check if answer text matches correct answer
    if (question.questionType === 'TRUE_FALSE') {
      return (
        answer.answerText?.toLowerCase() === question.correctAnswer?.toLowerCase()
      );
    }

    // For other types, manual review may be required
    return false;
  }

  /**
   * Extract numeric value (1-5) from a rating scale response
   */
  private extractRatingScaleValue(answer: any, question: any): number | null {
    if (!question.optionItems || question.optionItems.length === 0) {
      return null;
    }

    const optionIndex = question.optionItems.findIndex(
      (opt: any) => opt.id === answer.selectedOptionId
    );

    if (optionIndex === -1) return null;

    // Map option index to 1-5 scale
    // Assuming options are in order from 1 (Strongly Disagree) to 5 (Strongly Agree)
    return optionIndex + 1;
  }

  /**
   * Convert average score (1-5) to level (1-5)
   * where 1 = Very Low, 5 = Very High
   */
  private convertAverageToLevel(average: number, scale: number = 5): number {
    if (average <= 1.5) return 1;
    if (average <= 2.5) return 2;
    if (average <= 3.5) return 3;
    if (average <= 4.5) return 4;
    return 5;
  }

  /**
   * Get the label for a trait level
   */
  private getLevelLabel(level: number, traitConfig: any): string {
    switch (level) {
      case 1:
        return traitConfig.level1Label || 'Very Low';
      case 2:
        return traitConfig.level2Label || 'Low';
      case 3:
        return traitConfig.level3Label || 'Moderate';
      case 4:
        return traitConfig.level4Label || 'High';
      case 5:
        return traitConfig.level5Label || 'Very High';
      default:
        return 'Unknown';
    }
  }

  /**
   * Calculate overall assessment result
   * For personality: no pass/fail, just trait scores
   * For others: pass/fail based on obtained marks vs passing score
   */
  async calculateAssessmentResult(
    attemptId: string,
    assessmentType: string,
    passingScore: number
  ) {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });

    if (!attempt) throw new Error('Attempt not found');

    if (assessmentType === 'PERSONALITY') {
      const traitScores = await this.calculatePersonalityTraitScores(
        attemptId,
        attempt.assessmentId
      );
      return {
        type: 'personality',
        traitScores,
      };
    }

    const genericScore = await this.calculateGenericScore(
      attemptId,
      attempt.assessmentId,
      passingScore
    );

    return {
      type: 'knowledge',
      ...genericScore,
    };
  }
}

export default new AssessmentsScoringService();
