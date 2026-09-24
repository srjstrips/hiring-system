/**
 * SRJ Work Style Check — Question Bank Seeder
 * Seeds the 25-question Likert-scale personality assessment into the DB.
 * Idempotent — skips if assessment already exists by name.
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/modules/assessments/work-style-seeder.ts
 */

import { prisma } from '@/config/database';

const ASSESSMENT_NAME = 'SRJ Work Style Check';

interface QuestionDef {
  order: number;
  text: string;
  trait: string;
  isReversed: boolean;
}

const QUESTIONS: QuestionDef[] = [
  { order: 1,  text: 'When something goes wrong at work, I am usually one of the first to try to fix it.', trait: 'PROBLEM_SOLVING', isReversed: false },
  { order: 2,  text: 'I enjoy learning how to do new tasks, even when they feel hard at first.', trait: 'LEARNING_ADAPTABILITY', isReversed: false },
  { order: 3,  text: 'I enjoy working with other people more than working alone.', trait: 'TEAMWORK', isReversed: false },
  { order: 4,  text: 'I feel comfortable telling others what needs to be done.', trait: 'LEADERSHIP', isReversed: false },
  { order: 5,  text: 'When something changes at work, I adjust to it quickly.', trait: 'LEARNING_ADAPTABILITY', isReversed: false },
  { order: 6,  text: 'I help my teammates even when I am busy with my own work.', trait: 'TEAMWORK', isReversed: false },
  { order: 7,  text: 'I like taking charge when a group needs direction.', trait: 'LEADERSHIP', isReversed: false },
  { order: 8,  text: 'I ask questions when I do not understand something, instead of guessing.', trait: 'LEARNING_ADAPTABILITY', isReversed: false },
  { order: 9,  text: 'I listen carefully when a teammate has a different opinion than mine.', trait: 'TEAMWORK', isReversed: false },
  { order: 10, text: 'People often come to me for advice about work problems.', trait: 'LEADERSHIP', isReversed: false },
  { order: 11, text: 'I get uncomfortable when I have to use a new tool or method.', trait: 'LEARNING_ADAPTABILITY', isReversed: true },
  { order: 12, text: 'I would rather work alone and not depend on anyone else.', trait: 'TEAMWORK', isReversed: true },
  { order: 13, text: 'I would rather follow instructions than decide what happens next.', trait: 'LEADERSHIP', isReversed: true },
  { order: 14, text: 'I like my job to stay exactly the same every day.', trait: 'LEARNING_ADAPTABILITY', isReversed: true },
  { order: 15, text: 'It annoys me when I have to explain something to a teammate more than once.', trait: 'TEAMWORK', isReversed: true },
  { order: 16, text: 'I find it hard to speak up in front of a group.', trait: 'LEADERSHIP', isReversed: true },
  { order: 17, text: 'I look for better ways to do my work, even if the old way was fine.', trait: 'PROBLEM_SOLVING', isReversed: false },
  { order: 18, text: 'I try to keep things calm when there is conflict in the team.', trait: 'TEAMWORK', isReversed: false },
  { order: 19, text: 'I am willing to make a decision even when I am not fully sure it is right.', trait: 'LEADERSHIP', isReversed: false },
  { order: 20, text: 'Making mistakes while learning something new does not stop me from trying again.', trait: 'LEARNING_ADAPTABILITY', isReversed: false },
  { order: 21, text: 'I share credit with my team instead of taking it for myself.', trait: 'TEAMWORK', isReversed: false },
  { order: 22, text: 'I feel responsible for how my whole team does, not just my own work.', trait: 'TEAMWORK', isReversed: false },
  { order: 23, text: 'I pay attention to feedback from others and use it to get better.', trait: 'LEARNING_ADAPTABILITY', isReversed: false },
  { order: 24, text: 'I trust my teammates to do their part of the work well.', trait: 'TEAMWORK', isReversed: false },
  { order: 25, text: 'When I face a problem at work, I think of more than one way to solve it before deciding what to do.', trait: 'PROBLEM_SOLVING', isReversed: false },
];

const LIKERT_OPTIONS = [
  { text: 'Strongly disagree', value: 1 },
  { text: 'Disagree',          value: 2 },
  { text: 'Not sure / neutral', value: 3 },
  { text: 'Agree',             value: 4 },
  { text: 'Strongly agree',    value: 5 },
];

export async function seedWorkStyleAssessment(): Promise<string> {
  // Check if already seeded
  const existing = await prisma.assessment.findFirst({
    where: { name: ASSESSMENT_NAME },
  });
  if (existing) {
    console.log(`[WorkStyleSeeder] Assessment "${ASSESSMENT_NAME}" already exists (id: ${existing.id}). Skipping.`);
    return existing.id;
  }

  console.log(`[WorkStyleSeeder] Creating "${ASSESSMENT_NAME}"...`);

  // Find any admin user to set as creator (required FK)
  const adminUser = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
  if (!adminUser) throw new Error('[WorkStyleSeeder] No active user found to set as creator');

  const assessment = await prisma.assessment.create({
    data: {
      name: ASSESSMENT_NAME,
      description:
        'A 25-question workplace personality check that measures Leadership, Learning Agility, Teamwork, and Problem Solving. Takes about 15 minutes.',
      mode: 'PERSONALITY',
      assessmentType: 'PERSONALITY',
      durationMins: 15,
      maxAttempts: 3,
      passingScore: 0,
      status: 'ACTIVE',
      createdById: adminUser.id,
    },
  });

  for (const q of QUESTIONS) {
    const question = await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        questionText: q.text,
        questionType: 'MCQ',
        marks: 1,
        displayOrder: q.order,
        trait: q.trait,
        isReversed: q.isReversed,
        isActive: true,
      },
    });

    for (let i = 0; i < LIKERT_OPTIONS.length; i++) {
      const opt = LIKERT_OPTIONS[i];
      await prisma.assessmentOption.create({
        data: {
          questionId: question.id,
          optionText: opt.text,
          displayOrder: opt.value,
          isCorrect: false, // no single correct answer for Likert
        },
      });
    }
  }

  console.log(`[WorkStyleSeeder] Done. Assessment id: ${assessment.id}`);
  return assessment.id;
}

// Allow direct execution
if (require.main === module) {
  seedWorkStyleAssessment()
    .then((id) => { console.log('Seeded:', id); process.exit(0); })
    .catch((err) => { console.error(err); process.exit(1); });
}
