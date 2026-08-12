import type { Request, Response, NextFunction } from 'express';
import publicAssessmentsService, { AssessmentGateError } from './public-assessments.service';
import type { SaveAnswerDto, SaveAnswersBatchDto } from './public-assessments.validator';

function tokenParam(req: Request) {
  return String(req.params['secureToken'] ?? '');
}

function handleGate(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof AssessmentGateError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
    });
  }
  return next(err);
}

class PublicAssessmentsController {
  async getIntro(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicAssessmentsService.getIntro(tokenParam(req));
      res.json({ success: true, data });
    } catch (err) {
      handleGate(err, res, next);
    }
  }

  async start(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicAssessmentsService.start(tokenParam(req));
      res.json({ success: true, data });
    } catch (err) {
      handleGate(err, res, next);
    }
  }

  async getAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicAssessmentsService.getAttempt(tokenParam(req));
      res.json({ success: true, data });
    } catch (err) {
      handleGate(err, res, next);
    }
  }

  async saveAnswer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicAssessmentsService.saveAnswer(tokenParam(req), req.body as SaveAnswerDto);
      res.json({ success: true, data });
    } catch (err) {
      handleGate(err, res, next);
    }
  }

  async saveAnswers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicAssessmentsService.saveAnswers(tokenParam(req), req.body as SaveAnswersBatchDto);
      res.json({ success: true, data });
    } catch (err) {
      handleGate(err, res, next);
    }
  }

  async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicAssessmentsService.submit(tokenParam(req));
      res.json({ success: true, data });
    } catch (err) {
      handleGate(err, res, next);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await publicAssessmentsService.getStatus(tokenParam(req));
      res.json({ success: true, data });
    } catch (err) {
      handleGate(err, res, next);
    }
  }
}

export default new PublicAssessmentsController();
