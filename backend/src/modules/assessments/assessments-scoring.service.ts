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
   * Calculate generic scoring for TECHNICAL, APTITUDE, DEPARTMENT, GENERAL, SITUATIONAL assessments.
   * Correct answer = marks, Wrong answer = 0, Unanswered = 0.
   *
   * Reads from the attempt SNAPSHOT (AssessmentAttemptQuestion/Option), matching what the
   * candidate actually saw — the same data source used by the submit flow.
   */
  async calculateGenericScore(
    attemptId: string,
    _assessmentId: string,
    passingScore: number
  ): Promise<ScoringResult> {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
        questionSnapshots: { include: { options: true } },
      },
    });

    if (!attempt) throw new Error('Attempt not found');

    let totalMarks = 0;
    let obtainedMarks = 0;

    for (const q of attempt.questionSnapshots) {
      totalMarks += q.marks;
      const answer = attempt.answers.find((a) => a.attemptQuestionId === q.id);
      const correctOption = q.options.find((o) => o.isCorrect);
      const selectedOption = q.options.find((o) => o.id === answer?.selectedOptionId);
      const isCorrect = !!(selectedOption && correctOption && selectedOption.id === correctOption.id);
      if (isCorrect) obtainedMarks += q.marks;
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
   * Calculate personality trait scores for personality assessments.
   *
   * IMPORTANT: candidate answers reference the immutable attempt SNAPSHOT
   * (AssessmentAttemptQuestion / AssessmentAttemptOption), not the live
   * AssessmentQuestion/AssessmentOption records — the live question could be
   * edited or deleted after the candidate has taken the assessment. This
   * method reads from the snapshot so scoring always reflects what the
   * candidate actually saw and answered.
   */
  async calculatePersonalityTraitScores(
    attemptId: string,
    assessmentId: string
  ): Promise<PersonalityTraitScoreResult[]> {
    const attempt = await prisma.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: true,
        questionSnapshots: {
          include: { options: { orderBy: { displayOrder: 'asc' } } },
        },
      },
    });

    if (!attempt) throw new Error('Attempt not found');

    const traitConfigs = await prisma.assessmentTrait.findMany({
      where: { assessmentId },
    });

    // Group answers by trait using the snapshot (what the candidate actually answered)
    const traitScores = new Map<string, { total: number; count: number }>();

    for (const q of attempt.questionSnapshots) {
      if (!q.trait) continue;
      const answer = attempt.answers.find((a) => a.attemptQuestionId === q.id);
      if (!answer?.selectedOptionId) continue;

      const optionIndex = q.options.findIndex((o) => o.id === answer.selectedOptionId);
      if (optionIndex === -1) continue;

      // Options are ordered 0-4 representing a 1-5 scale (Strongly Disagree -> Strongly Agree)
      const responseValue = optionIndex + 1;

      if (!traitScores.has(q.trait)) {
        traitScores.set(q.trait, { total: 0, count: 0 });
      }
      const score = traitScores.get(q.trait)!;
      score.total += responseValue;
      score.count += 1;
    }

    // Convert to trait results
    const results: PersonalityTraitScoreResult[] = [];
    const batchWrites: any[] = [];

    for (const [traitName, { total, count }] of traitScores.entries()) {
      const traitConfig = traitConfigs.find((t) => t.traitName === traitName);

      const averageScore = count > 0 ? total / count : 0;
      const level = this.convertAverageToLevel(averageScore, 5);
      const levelLabel = traitConfig ? this.getLevelLabel(level, traitConfig) : this.defaultLevelLabel(level);

      results.push({
        traitName,
        totalScore: total,
        questionCount: count,
        averageScore: Math.round(averageScore * 100) / 100,
        level,
        levelLabel,
      });

      batchWrites.push(
        prisma.assessmentTraitScore.upsert({
          where: { attemptId_traitName: { attemptId, traitName } },
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
        })
      );
    }

    if (batchWrites.length) {
      await prisma.$transaction(batchWrites);
    }

    return results;
  }

  private defaultLevelLabel(level: number): string {
    switch (level) {
      case 1: return 'Very Low';
      case 2: return 'Low';
      case 3: return 'Moderate';
      case 4: return 'High';
      case 5: return 'Very High';
      default: return 'Unknown';
    }
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
