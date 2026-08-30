/**
 * TalentSignal™ Question Bank Seeder
 * Seeds the complete pre-built assessment into the DB.
 * Idempotent — skips if assessment already exists by name.
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/modules/assessments/talent-signal-seeder.ts
 * Or called from the main seeder / startup.
 */

import { prisma } from '@/config/database';

const ASSESSMENT_NAME = 'TalentSignal™ Personality Assessment';

// ─── Part A: 30 Forced-Choice Blocks ─────────────────────────────────────────
// Each block has 4 statements. Format: { text, trait }
// trait: H|ES|X|A|C|O
// Stored as FORCED_CHOICE question, each option's optionText = "statement [TRAIT]"

const PART_A_BLOCKS: { text: string; trait: string }[][] = [
  // Block 1
  [
    { text: 'I feel energized when working with groups of people.', trait: 'X' },
    { text: 'I stay patient with people who work slower than I do.', trait: 'A' },
    { text: 'I follow through on every commitment I make.', trait: 'C' },
    { text: 'I enjoy exploring new ways of doing things.', trait: 'O' },
  ],
  // Block 2
  [
    { text: 'I stay composed when things go wrong.', trait: 'ES' },
    { text: 'I forgive colleagues who have wronged me.', trait: 'A' },
    { text: 'I double-check my work before submitting it.', trait: 'C' },
    { text: 'I read widely beyond my immediate field.', trait: 'O' },
  ],
  // Block 3
  [
    { text: 'I recover quickly after setbacks.', trait: 'ES' },
    { text: 'I speak up confidently in meetings.', trait: 'X' },
    { text: 'I plan my day before starting it.', trait: 'C' },
    { text: 'I question assumptions others take for granted.', trait: 'O' },
  ],
  // Block 4
  [
    { text: 'I keep a clear head under time pressure.', trait: 'ES' },
    { text: 'I find it easy to start conversations with strangers.', trait: 'X' },
    { text: 'I look for compromise when opinions clash.', trait: 'A' },
    { text: 'I generate original ideas in problem-solving.', trait: 'O' },
  ],
  // Block 5
  [
    { text: 'I remain steady when others are panicking.', trait: 'ES' },
    { text: 'I enjoy presenting ideas to an audience.', trait: 'X' },
    { text: 'I give people the benefit of the doubt.', trait: 'A' },
    { text: 'I keep my workspace and files well organized.', trait: 'C' },
  ],
  // Block 6
  [
    { text: 'I treat people fairly even when no one is watching.', trait: 'H' },
    { text: 'I stay gentle when correcting others\' mistakes.', trait: 'A' },
    { text: 'I finish tasks well before deadlines.', trait: 'C' },
    { text: 'I enjoy learning skills outside my comfort zone.', trait: 'O' },
  ],
  // Block 7
  [
    { text: 'I return extra change if a cashier miscounts.', trait: 'H' },
    { text: 'I naturally take the lead in group discussions.', trait: 'X' },
    { text: 'I follow procedures precisely, step by step.', trait: 'C' },
    { text: 'I adapt quickly to new tools and technology.', trait: 'O' },
  ],
  // Block 8
  [
    { text: 'I give credit to others for their contributions.', trait: 'H' },
    { text: 'I bring energy to the teams I join.', trait: 'X' },
    { text: 'I cooperate even when I disagree with a decision.', trait: 'A' },
    { text: 'I connect ideas from different fields.', trait: 'O' },
  ],
  // Block 9
  [
    { text: 'I say what I genuinely think rather than what benefits me.', trait: 'H' },
    { text: 'I make new contacts easily at events.', trait: 'X' },
    { text: 'I listen fully before judging someone\'s actions.', trait: 'A' },
    { text: 'I keep detailed records of my work.', trait: 'C' },
  ],
  // Block 10
  [
    { text: 'I refuse shortcuts that would mislead others.', trait: 'H' },
    { text: 'I handle criticism without taking it personally.', trait: 'ES' },
    { text: 'I think through consequences before acting.', trait: 'C' },
    { text: 'I enjoy debates about abstract concepts.', trait: 'O' },
  ],
  // Block 11
  [
    { text: 'I am comfortable admitting when someone else\'s idea is better.', trait: 'H' },
    { text: 'I stay calm even during stressful periods.', trait: 'ES' },
    { text: 'I avoid holding grudges after conflicts.', trait: 'A' },
    { text: 'I experiment with better methods for routine work.', trait: 'O' },
  ],
  // Block 12
  [
    { text: 'I keep promises even when they become inconvenient.', trait: 'H' },
    { text: 'I make sound decisions in emergencies.', trait: 'ES' },
    { text: 'I accommodate others\' preferences when possible.', trait: 'A' },
    { text: 'I persist on tasks until they are fully complete.', trait: 'C' },
  ],
  // Block 13
  [
    { text: 'I would rather lose an advantage than bend the truth.', trait: 'H' },
    { text: 'I keep my emotions from clouding my judgment.', trait: 'ES' },
    { text: 'I express my views openly and directly.', trait: 'X' },
    { text: 'I seek out perspectives different from my own.', trait: 'O' },
  ],
  // Block 14
  [
    { text: 'I don\'t expect special treatment because of my position.', trait: 'H' },
    { text: 'I stay patient during long, demanding days.', trait: 'ES' },
    { text: 'I enjoy being at the centre of activity.', trait: 'X' },
    { text: 'I set high standards for the quality of my output.', trait: 'C' },
  ],
  // Block 15
  [
    { text: 'I report problems honestly even when they reflect on me.', trait: 'H' },
    { text: 'I stay optimistic when plans fall apart.', trait: 'ES' },
    { text: 'I motivate others through my enthusiasm.', trait: 'X' },
    { text: 'I stay courteous even with difficult people.', trait: 'A' },
  ],
  // Block 16
  [
    { text: 'I am comfortable approaching senior people.', trait: 'X' },
    { text: 'I accept feedback without becoming defensive.', trait: 'A' },
    { text: 'I arrive prepared for every meeting.', trait: 'C' },
    { text: 'I imagine future possibilities others overlook.', trait: 'O' },
  ],
  // Block 17
  [
    { text: 'I face uncertainty without excessive worry.', trait: 'ES' },
    { text: 'I soften my tone when tensions rise.', trait: 'A' },
    { text: 'I break large goals into scheduled steps.', trait: 'C' },
    { text: 'I embrace change as an opportunity.', trait: 'O' },
  ],
  // Block 18
  [
    { text: 'I keep an even temper when provoked.', trait: 'ES' },
    { text: 'I keep conversations lively and engaging.', trait: 'X' },
    { text: 'I notice small errors that others miss.', trait: 'C' },
    { text: 'I ask "why" before accepting how things are done.', trait: 'O' },
  ],
  // Block 19
  [
    { text: 'I perform well even when the stakes are high.', trait: 'ES' },
    { text: 'I volunteer to represent my team publicly.', trait: 'X' },
    { text: 'I assume good intent behind others\' actions.', trait: 'A' },
    { text: 'I find creative solutions when resources are limited.', trait: 'O' },
  ],
  // Block 20
  [
    { text: 'I let go of minor frustrations quickly.', trait: 'ES' },
    { text: 'I build rapport quickly with new colleagues.', trait: 'X' },
    { text: 'I let others win small points to preserve harmony.', trait: 'A' },
    { text: 'I avoid impulsive decisions.', trait: 'C' },
  ],
  // Block 21
  [
    { text: 'I share opportunities rather than keeping them for myself.', trait: 'H' },
    { text: 'I make peace quickly after disagreements.', trait: 'A' },
    { text: 'I track my progress against targets regularly.', trait: 'C' },
    { text: 'I stay curious about how things work.', trait: 'O' },
  ],
  // Block 22
  [
    { text: 'I follow rules that apply to me even when enforcement is absent.', trait: 'H' },
    { text: 'I enjoy fast-paced, people-filled environments.', trait: 'X' },
    { text: 'I complete routine tasks with consistent care.', trait: 'C' },
    { text: 'I welcome unfamiliar challenges.', trait: 'O' },
  ],
  // Block 23
  [
    { text: 'I am the same person in private as in public.', trait: 'H' },
    { text: 'I ask questions confidently in large groups.', trait: 'X' },
    { text: 'I adjust my approach to suit different personalities.', trait: 'A' },
    { text: 'I redesign processes rather than merely follow them.', trait: 'O' },
  ],
  // Block 24
  [
    { text: 'I decline favours that could compromise my judgment.', trait: 'H' },
    { text: 'I share my successes and stories openly.', trait: 'X' },
    { text: 'I share resources willingly with other teams.', trait: 'A' },
    { text: 'I honour deadlines even under difficult conditions.', trait: 'C' },
  ],
  // Block 25
  [
    { text: 'I own my mistakes without shifting blame.', trait: 'H' },
    { text: 'I stay focused despite distractions around me.', trait: 'ES' },
    { text: 'I prioritize duties before leisure.', trait: 'C' },
    { text: 'I draw inspiration from outside my industry.', trait: 'O' },
  ],
  // Block 26
  [
    { text: 'I value being trusted more than being admired.', trait: 'H' },
    { text: 'I approach problems calmly rather than anxiously.', trait: 'ES' },
    { text: 'I tolerate interruptions without irritation.', trait: 'A' },
    { text: 'I learn quickly from unfamiliar situations.', trait: 'O' },
  ],
  // Block 27
  [
    { text: 'I negotiate honestly rather than through pressure tactics.', trait: 'H' },
    { text: 'I keep perspective when small things go wrong.', trait: 'ES' },
    { text: 'I help rivals succeed when the goal is shared.', trait: 'A' },
    { text: 'I prepare backup plans for important work.', trait: 'C' },
  ],
  // Block 28
  [
    { text: 'I treat juniors with the same respect as seniors.', trait: 'H' },
    { text: 'I stay confident after making a mistake.', trait: 'ES' },
    { text: 'I enjoy persuading others toward a plan.', trait: 'X' },
    { text: 'I enjoy work that requires fresh thinking.', trait: 'O' },
  ],
  // Block 29
  [
    { text: 'I am transparent about my reasons for decisions.', trait: 'H' },
    { text: 'I manage pressure without needing constant reassurance.', trait: 'ES' },
    { text: 'I am quick to welcome newcomers.', trait: 'X' },
    { text: 'I maintain discipline in my daily routines.', trait: 'C' },
  ],
  // Block 30
  [
    { text: 'I resist temptations that would benefit me unfairly.', trait: 'H' },
    { text: 'I remain balanced through sudden changes.', trait: 'ES' },
    { text: 'I thrive on frequent interaction through the day.', trait: 'X' },
    { text: 'I respond to rudeness with politeness.', trait: 'A' },
  ],
];

// ─── Part B: SJT Scenarios ────────────────────────────────────────────────────
// sjtKey: [{optionIndex (0-based), score}]
// integrityItem flag marks items that feed the integrity composite

type SjtScenario = {
  text: string;
  part: 'B1' | 'B2' | 'B3';
  options: string[];
  key: { optionIndex: number; score: number; integrityItem?: boolean }[];
};

const PART_B_SCENARIOS: SjtScenario[] = [
  // ── B1 Work Judgment ──────────────────────────────────────────────────────
  {
    part: 'B1',
    text: 'You discover an error in a report your team already submitted to a senior manager. The error slightly overstates your team\'s results. What do you do?',
    options: [
      'Inform the manager immediately, explain the error, and send a corrected version.',
      'Correct it quietly in the next report so the numbers gradually align.',
      'Tell your team lead and let them decide whether to inform the manager.',
      'Wait to see whether anyone notices before raising it.',
    ],
    key: [{ optionIndex: 0, score: 2, integrityItem: true }, { optionIndex: 2, score: 1 }, { optionIndex: 1, score: 0 }, { optionIndex: 3, score: -1, integrityItem: true }],
  },
  {
    part: 'B1',
    text: 'A colleague from another department urgently needs your help, but you are behind on your own deadline. What do you do?',
    options: [
      'Help them fully now; your deadline can slip a little.',
      'Explain your deadline, agree on a specific later time you will help, and follow through.',
      'Decline politely; your own commitments come first.',
      'Ask your supervisor to decide whose work takes priority.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 2, score: 0 }, { optionIndex: 0, score: -1 }],
  },
  {
    part: 'B1',
    text: 'You are given a new task with unclear instructions. Your manager is in meetings all day. What do you do?',
    options: [
      'Wait until the manager is free to avoid doing it wrong.',
      'Draft your understanding of the task, start on the low-risk parts, and send the manager a short note asking to confirm your interpretation.',
      'Ask an experienced colleague how similar tasks were done before, then proceed.',
      'Complete the task the way you think best; clarify later if needed.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 2, score: 1 }, { optionIndex: 3, score: 0 }, { optionIndex: 0, score: -1 }],
  },
  {
    part: 'B1',
    text: 'During a team discussion, a junior colleague proposes an idea you believe will not work. Others seem interested. What do you do?',
    options: [
      'Point out the flaws immediately so time is not wasted.',
      'Ask questions that help the group examine the idea\'s assumptions, including its weak points.',
      'Stay silent; let the group discover the problems themselves.',
      'Acknowledge the idea\'s strengths, then share your specific concern and suggest testing it on a small scale.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 0, score: 0 }, { optionIndex: 2, score: -1 }],
  },
  {
    part: 'B1',
    text: 'You notice a peer regularly leaving 30 minutes early while recording full hours. Their work quality is good. What do you do?',
    options: [
      'Mention to them privately that you\'ve noticed, and that it could become a problem.',
      'Report it to HR immediately.',
      'Ignore it; their output is fine and it is not your business.',
      'Raise the general topic of time recording in the next team meeting without naming anyone.',
    ],
    key: [{ optionIndex: 0, score: 2, integrityItem: true }, { optionIndex: 3, score: 1 }, { optionIndex: 1, score: 0 }, { optionIndex: 2, score: -1, integrityItem: true }],
  },
  {
    part: 'B1',
    text: 'Your manager assigns you a task using a method you know is outdated and slower. What do you do?',
    options: [
      'Do it their way; they must have their reasons.',
      'Do it your way; results matter more than method.',
      'Briefly show the manager a comparison of the two methods and ask if you may use the newer one.',
      'Do it their way this time, then present the alternative method afterward with evidence.',
    ],
    key: [{ optionIndex: 2, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 0, score: 0 }, { optionIndex: 1, score: -1 }],
  },
  {
    part: 'B1',
    text: 'Two of your teammates are in a heated disagreement that is delaying a joint deliverable you all share. What do you do?',
    options: [
      'Escalate to the supervisor so it gets resolved with authority.',
      'Speak to each separately to understand their positions, then bring them together around the shared deadline.',
      'Take over the disputed portion of the work yourself so the deliverable moves.',
      'Propose the group park the disagreement, agree on the minimum needed to meet the deadline, and revisit the dispute after.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 0, score: 0 }, { optionIndex: 2, score: -1 }],
  },
  {
    part: 'B1',
    text: 'You receive strong criticism of your work in front of others, and you believe part of it is unfair. What do you do?',
    options: [
      'Defend yourself point by point on the spot so the record is corrected.',
      'Stay composed, note the points, and request a one-to-one to go through them — accepting the valid parts and clarifying the rest.',
      'Accept all of it publicly to end the discussion, and privately disregard the unfair parts.',
      'Thank them for the input and later ask a trusted colleague whether the criticism was justified.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 0, score: 0 }, { optionIndex: 2, score: -1 }],
  },
  {
    part: 'B1',
    text: 'A customer or internal stakeholder demands a commitment you are not sure your team can meet. Your manager is unavailable. What do you do?',
    options: [
      'Commit; you can push the team hard to deliver.',
      'Say what you can confirm now, state exactly when you will confirm the rest, and honour that time.',
      'Refuse to commit to anything until your manager returns.',
      'Commit to a deliberately padded timeline you are certain of.',
    ],
    key: [{ optionIndex: 1, score: 2, integrityItem: true }, { optionIndex: 3, score: 1 }, { optionIndex: 2, score: 0 }, { optionIndex: 0, score: -1, integrityItem: true }],
  },
  {
    part: 'B1',
    text: 'Midway through a project, new information shows your original plan will miss its goal. You have invested significant effort already. What do you do?',
    options: [
      'Continue; changing course now wastes the investment and unsettles the team.',
      'Quietly adjust the plan without drawing attention to the change.',
      'Present the new information to stakeholders with a revised plan and a clear reason for the change.',
      'Pause the project and ask leadership to re-decide the direction.',
    ],
    key: [{ optionIndex: 2, score: 2, integrityItem: true }, { optionIndex: 3, score: 1 }, { optionIndex: 1, score: 0 }, { optionIndex: 0, score: -1 }],
  },

  // ── B2 Safety Judgment ────────────────────────────────────────────────────
  {
    part: 'B2',
    text: 'You are asked to complete an urgent task, but the standard safety check would add 20 minutes and the supervisor says "we\'re behind schedule." What do you do?',
    options: [
      'Skip the check this once; the supervisor has accepted the risk.',
      'Do the check anyway and inform the supervisor it is required; offer to make up time elsewhere.',
      'Do a shortened version of the check covering the biggest risks.',
      'Ask the supervisor to confirm in writing that the check is to be skipped.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 2, score: 0 }, { optionIndex: 0, score: -1 }],
  },
  {
    part: 'B2',
    text: 'You notice a small oil leak near a walkway. It is not your area, and your shift ends in 10 minutes. What do you do?',
    options: [
      'Cordon or mark the spot if possible and report it before leaving.',
      'Mention it to the next shift when they arrive.',
      'Note it mentally; the area team inspects daily and will find it.',
      'Clean it yourself even though it is not your area.',
    ],
    key: [{ optionIndex: 0, score: 2 }, { optionIndex: 1, score: 1 }, { optionIndex: 3, score: 0 }, { optionIndex: 2, score: -1 }],
  },
  {
    part: 'B2',
    text: 'A senior, experienced colleague routinely bypasses a machine guard "because it slows the job," and nothing has ever gone wrong. What do you do?',
    options: [
      'Follow their example; experience counts for more than the rulebook.',
      'Use the guard yourself and say nothing about their practice.',
      'Use the guard yourself, and privately tell them you\'re not comfortable with the bypass and why.',
      'Report the practice through the safety observation system.',
    ],
    key: [{ optionIndex: 2, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 1, score: 0 }, { optionIndex: 0, score: -1 }],
  },
  {
    part: 'B2',
    text: 'During your task, you feel unusually dizzy in a hot area. The task is nearly finished. What do you do?',
    options: [
      'Push through the last few minutes, then rest.',
      'Stop, move to a safe cooler spot, inform a colleague or supervisor, and resume only when fit.',
      'Take a short water break at your station and continue.',
      'Ask a colleague to take over while you recover.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 2, score: 0 }, { optionIndex: 0, score: -1 }],
  },

  // ── B3 Leadership Judgment ────────────────────────────────────────────────
  {
    part: 'B3',
    text: 'Your team consistently meets targets, but one high performer\'s abrasive behaviour is causing two quieter members to disengage. What do you do?',
    options: [
      'Leave it; results are strong and adults should manage their own dynamics.',
      'Address the behaviour privately with the high performer, with specific examples and clear expectations, while separately re-engaging the two members.',
      'Move the two quieter members to reduce friction.',
      'Raise team behaviour standards in a group setting, then monitor and follow up individually if needed.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 2, score: 0 }, { optionIndex: 0, score: -1 }],
  },
  {
    part: 'B3',
    text: 'You must implement an unpopular company decision you personally argued against. Your team asks your opinion. What do you do?',
    options: [
      'Tell them you disagreed and are only following orders.',
      'Acknowledge concerns honestly, explain the rationale behind the decision, and focus the team on how to make it work.',
      'Present the decision as if you fully support it to keep morale up.',
      'Share that leadership debated it seriously, that you raised concerns which were heard, and that the decision is now everyone\'s to execute.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 2, score: 0 }, { optionIndex: 0, score: -1 }],
  },
  {
    part: 'B3',
    text: 'Two capable direct reports both want the same promotion; only one role exists. The decision is yours. What do you do?',
    options: [
      'Choose based on defined criteria, then give each a candid, specific conversation — including a development path for the one not chosen.',
      'Choose the one more likely to resign if passed over.',
      'Delay the decision until one of them clearly pulls ahead.',
      'Involve a panel or skip-level in the decision to add objectivity, then communicate personally.',
    ],
    key: [{ optionIndex: 0, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 2, score: 0 }, { optionIndex: 1, score: -1 }],
  },
  {
    part: 'B3',
    text: 'A change you are leading is failing in one section: output is down and complaints are up, though other sections have adopted it well. What do you do?',
    options: [
      'Enforce compliance in the lagging section; consistency matters.',
      'Spend time in that section to understand the specific obstacles, adapt the rollout, and enlist their informal leaders.',
      'Roll the change back in that section until conditions improve.',
      'Pair the lagging section with the most successful section to transfer practices.',
    ],
    key: [{ optionIndex: 1, score: 2 }, { optionIndex: 3, score: 1 }, { optionIndex: 0, score: 0 }, { optionIndex: 2, score: -1 }],
  },
];

// ─── Part C: Likert + Validity Items ─────────────────────────────────────────

type LikertItem = {
  text: string;
  scale: 'RES' | 'ADA' | 'ACH' | 'IM' | 'INF';
  isReversed?: boolean;
  infExpectedAnswer?: string; // for INF items
};

const PART_C_ITEMS: LikertItem[] = [
  // Resilience (RES, 6 items)
  { text: 'At work, I stay effective even on my most stressful days.', scale: 'RES' },
  { text: 'After a failure at work, I am back to full effectiveness within a day or two.', scale: 'RES' },
  { text: 'Work pressure tends to overwhelm me more than it does most people.', scale: 'RES', isReversed: true },
  { text: 'At work, I can handle several urgent demands at the same time without losing composure.', scale: 'RES' },
  { text: 'Criticism of my work stays on my mind for days.', scale: 'RES', isReversed: true },
  { text: 'In a workplace emergency, others would describe me as one of the calm ones.', scale: 'RES' },
  // Adaptability (ADA, 5 items)
  { text: 'When my role or tasks change suddenly at work, I adjust within days, not weeks.', scale: 'ADA' },
  { text: 'I prefer my work routines to stay exactly the same.', scale: 'ADA', isReversed: true },
  { text: 'I have successfully learned a completely new system or tool when my job required it.', scale: 'ADA' },
  { text: 'Unexpected changes to plans at work frustrate me for a long time.', scale: 'ADA', isReversed: true },
  { text: 'I often volunteer for tasks I have never done before.', scale: 'ADA' },
  // Achievement drive (ACH, 5 items)
  { text: 'I set myself targets tougher than the ones assigned to me.', scale: 'ACH' },
  { text: 'I am satisfied doing exactly what my role requires, no more.', scale: 'ACH', isReversed: true },
  { text: 'At work, I keep pushing on a difficult problem after others have moved on.', scale: 'ACH' },
  { text: 'I regularly seek feedback so I can improve faster.', scale: 'ACH' },
  { text: 'I compare my performance against the best, not the average.', scale: 'ACH' },
  // Impression Management validity (IM, 5 items)
  { text: 'I have never told even a small lie.', scale: 'IM' },
  { text: 'I have never been irritated by a colleague.', scale: 'IM' },
  { text: 'All of my work habits are perfect.', scale: 'IM' },
  { text: 'I have never made a mistake in my work.', scale: 'IM' },
  { text: 'I like every person I have ever worked with.', scale: 'IM' },
  // Infrequency / attention checks (INF, 3 items)
  { text: 'For this statement, select "Disagree" (2).', scale: 'INF', infExpectedAnswer: '2' },
  { text: 'I have used a computer or mobile phone before.', scale: 'INF', infExpectedAnswer: '5' },
  { text: 'For this statement, select "Strongly Agree" (5).', scale: 'INF', infExpectedAnswer: '5' },
];

// ─── Seeder ───────────────────────────────────────────────────────────────────

export async function seedTalentSignalAssessment(createdById: string): Promise<string> {
  const existing = await prisma.assessment.findFirst({
    where: { name: ASSESSMENT_NAME, deletedAt: null },
  });
  if (existing) return existing.id;

  const assessment = await prisma.assessment.create({
    data: {
      name: ASSESSMENT_NAME,
      description:
        'A scientifically grounded HEXACO + SJT personality assessment for steel manufacturing roles. ' +
        'Measures Honesty-Humility, Emotional Stability, Extraversion, Agreeableness, Conscientiousness, and Openness ' +
        'via forced-choice tetrads, situational judgment scenarios, and contextualized Likert scales.',
      durationMins: 57,
      passingScore: 0,
      maxAttempts: 1,
      status: 'ACTIVE',
      mode: 'PERSONALITY',
      createdById,
    },
  });

  let order = 0;

  // ── Part A ─────────────────────────────────────────────────────────────────
  for (const block of PART_A_BLOCKS) {
    const q = await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        questionText: 'Select the statement that is MOST like you and the statement that is LEAST like you.',
        questionType: 'FORCED_CHOICE',
        marks: 0, // personality — no pass/fail marks
        displayOrder: order++,
        isActive: true,
        optionItems: {
          create: block.map((stmt, i) => ({
            optionText: `${stmt.text} [${stmt.trait}]`,
            isCorrect: false,
            displayOrder: i,
          })),
        },
      },
    });
    // Store trait on each option — we do this via the option text tag [TRAIT]
    // The scoring engine parses it from optionText
    void q; // created for side-effect
  }

  // ── Part B ─────────────────────────────────────────────────────────────────
  for (const scenario of PART_B_SCENARIOS) {
    await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        questionText: scenario.text,
        questionType: 'MCQ',
        marks: 0,
        displayOrder: order++,
        isActive: true,
        sjtPart: scenario.part,
        sjtKey: scenario.key,
        optionItems: {
          create: scenario.options.map((opt, i) => ({
            optionText: opt,
            isCorrect: scenario.key.find((k) => k.optionIndex === i)?.score === 2,
            displayOrder: i,
          })),
        },
      },
    });
  }

  // ── Part C ─────────────────────────────────────────────────────────────────
  for (const item of PART_C_ITEMS) {
    const isInf = item.scale === 'INF';
    await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        questionText: item.text,
        questionType: isInf ? 'MCQ' : 'MCQ',
        marks: 0,
        displayOrder: order++,
        isActive: true,
        validityScale: item.scale === 'IM' || item.scale === 'INF' ? item.scale : null,
        trait: item.scale === 'RES' || item.scale === 'ADA' || item.scale === 'ACH' ? item.scale : null,
        isReversed: item.isReversed ?? false,
        sjtKey: isInf ? [{ expectedAnswer: item.infExpectedAnswer ?? '' }] : undefined,
        optionItems: {
          create: isInf
            ? [
                { optionText: 'Strongly Disagree (1)', isCorrect: false, displayOrder: 0 },
                { optionText: 'Disagree (2)', isCorrect: false, displayOrder: 1 },
                { optionText: 'Neutral (3)', isCorrect: false, displayOrder: 2 },
                { optionText: 'Agree (4)', isCorrect: false, displayOrder: 3 },
                { optionText: 'Strongly Agree (5)', isCorrect: false, displayOrder: 4 },
              ]
            : [
                { optionText: '1 - Strongly Disagree', isCorrect: false, displayOrder: 0 },
                { optionText: '2 - Disagree', isCorrect: false, displayOrder: 1 },
                { optionText: '3 - Neutral', isCorrect: false, displayOrder: 2 },
                { optionText: '4 - Agree', isCorrect: false, displayOrder: 3 },
                { optionText: '5 - Strongly Agree', isCorrect: false, displayOrder: 4 },
              ],
        },
      },
    });
  }

  return assessment.id;
}
