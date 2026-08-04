import type { Response } from 'express';
import type { AuthRequest } from '@/types';
import emailTemplatesService from './email-templates.service';
import type { CreateEmailTemplateDto, UpdateEmailTemplateDto, SendEmailDto } from './email-templates.validator';

class EmailTemplatesController {
  async getAll(_req: AuthRequest, res: Response) {
    const data = await emailTemplatesService.getAll();
    res.json({ success: true, data });
  }

  async getById(req: AuthRequest, res: Response) {
    const data = await emailTemplatesService.getById(req.params['id'] as string);
    res.json({ success: true, data });
  }

  async create(req: AuthRequest, res: Response) {
    const data = await emailTemplatesService.create(req.body as CreateEmailTemplateDto);
    res.status(201).json({ success: true, data });
  }

  async update(req: AuthRequest, res: Response) {
    const data = await emailTemplatesService.update(req.params['id'] as string, req.body as UpdateEmailTemplateDto);
    res.json({ success: true, data });
  }

  async delete(req: AuthRequest, res: Response) {
    await emailTemplatesService.delete(req.params['id'] as string);
    res.json({ success: true, message: 'Template deleted' });
  }

  async sendForApplication(req: AuthRequest, res: Response) {
    const applicationId = req.params['id'] as string;
    const sentByName = `${req.user!.firstName} ${req.user!.lastName}`;
    const result = await emailTemplatesService.sendForApplication(applicationId, req.body as SendEmailDto, sentByName);
    res.json({ success: true, data: result });
  }
}

export default new EmailTemplatesController();
