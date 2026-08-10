import type { Response } from 'express';
import type { AuthRequest } from '../../types';
import jobSharingService from './job-sharing.service';
import type { ShareJobBody } from './job-sharing.validators';

class JobSharingController {
  async getContext(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const data = await jobSharingService.getShareContext(jobId);
    res.json({ success: true, data });
  }

  async getHistory(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const data = await jobSharingService.getHistory(jobId);
    res.json({ success: true, data });
  }

  async share(req: AuthRequest, res: Response) {
    const jobId = req.params['jobId'] as string;
    const body = req.body as ShareJobBody;
    const result = await jobSharingService.shareJob(jobId, body.platform, req.user!.id);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  }
}

export default new JobSharingController();
