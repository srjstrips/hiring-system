import * as XLSX from 'xlsx';

export type ParsedQuestionPayload = {
  questionText: string;
  questionType: 'MCQ';
  marks: number;
  isActive: boolean;
  options: { optionText: string; isCorrect: boolean; displayOrder: number }[];
};

export type RowParseError = { row: number; message: string };

export type QuestionSheetParseResult = {
  questions: ParsedQuestionPayload[];
  errors: RowParseError[];
};

const REQUIRED_COLUMNS = ['question', 'option1', 'option2', 'option3', 'option4', 'correctanswer', 'marks'] as const;

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function cellString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function resolveCorrectIndex(correctRaw: string, options: string[]): number {
  const correct = correctRaw.trim();
  if (!correct) return -1;

  const lower = correct.toLowerCase();
  const byLabel = ['option1', 'option2', 'option3', 'option4'].indexOf(lower);
  if (byLabel >= 0 && options[byLabel]) return byLabel;

  const letterMatch = lower.match(/^([a-d])$/);
  if (letterMatch) {
    const idx = letterMatch[1].charCodeAt(0) - 97;
    if (options[idx]) return idx;
  }

  const num = Number(correct);
  if (Number.isInteger(num) && num >= 1 && num <= 4 && options[num - 1]) {
    return num - 1;
  }

  const exact = options.findIndex((o) => o.toLowerCase() === lower);
  if (exact >= 0) return exact;

  return -1;
}

function mapRows(rows: Record<string, unknown>[]): QuestionSheetParseResult {
  if (rows.length === 0) {
    return { questions: [], errors: [{ row: 0, message: 'The file has no data rows.' }] };
  }

  const sampleKeys = Object.keys(rows[0] ?? {}).map(normalizeHeader);
  const missing = REQUIRED_COLUMNS.filter((col) => !sampleKeys.includes(col));
  if (missing.length > 0) {
    return {
      questions: [],
      errors: [
        {
          row: 0,
          message: `Missing required column(s): ${missing.join(', ')}. Expected: question, option1, option2, option3, option4, correctAnswer, marks (type optional).`,
        },
      ],
    };
  }

  const questions: ParsedQuestionPayload[] = [];
  const errors: RowParseError[] = [];

  rows.forEach((raw, index) => {
    const rowNum = index + 2; // header is row 1
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      normalized[normalizeHeader(key)] = cellString(value);
    }

    const questionText = normalized.question;
    const option1 = normalized.option1;
    const option2 = normalized.option2;
    const option3 = normalized.option3;
    const option4 = normalized.option4;
    const correctAnswer = normalized.correctanswer;
    const marksRaw = normalized.marks;
    const typeRaw = (normalized.type || 'MCQ').toUpperCase();

    const isBlankRow =
      !questionText && !option1 && !option2 && !option3 && !option4 && !correctAnswer && !marksRaw;
    if (isBlankRow) return;

    if (!questionText) {
      errors.push({ row: rowNum, message: 'question is required' });
      return;
    }

    if (typeRaw !== 'MCQ') {
      errors.push({ row: rowNum, message: `type must be MCQ (got "${typeRaw || 'empty'}")` });
      return;
    }

    const options = [option1, option2, option3, option4].filter((o) => o.length > 0);
    if (options.length < 2) {
      errors.push({ row: rowNum, message: 'At least option1 and option2 are required' });
      return;
    }

    const marks = Number(marksRaw);
    if (!Number.isFinite(marks) || !Number.isInteger(marks) || marks < 1) {
      errors.push({ row: rowNum, message: 'marks must be a positive integer' });
      return;
    }

    if (!correctAnswer) {
      errors.push({ row: rowNum, message: 'correctAnswer is required' });
      return;
    }

    const optionTexts = [option1, option2, option3, option4];
    const correctIdx = resolveCorrectIndex(correctAnswer, optionTexts);
    if (correctIdx < 0 || !optionTexts[correctIdx]) {
      errors.push({
        row: rowNum,
        message: 'correctAnswer must match option1–option4 text, or be 1–4 / A–D / option1–option4',
      });
      return;
    }

    const fullOptions = optionTexts
      .map((text, i) => ({ text, i }))
      .filter((o) => o.text.length > 0)
      .map((o, displayOrder) => ({
        optionText: o.text,
        isCorrect: o.i === correctIdx,
        displayOrder,
      }));

    if (fullOptions.filter((o) => o.isCorrect).length !== 1) {
      errors.push({ row: rowNum, message: 'correctAnswer must point to one of the filled options' });
      return;
    }

    questions.push({
      questionText,
      questionType: 'MCQ',
      marks,
      isActive: true,
      options: fullOptions,
    });
  });

  return { questions, errors };
}

export async function parseQuestionSheetFile(file: File): Promise<QuestionSheetParseResult> {
  const name = file.name.toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
    return {
      questions: [],
      errors: [{ row: 0, message: 'Unsupported file type. Upload an .xlsx, .xls, or .csv file.' }],
    };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { questions: [], errors: [{ row: 0, message: 'The file has no worksheets.' }] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  return mapRows(rows);
}
