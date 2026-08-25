import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { getBranding, updateBranding } from './email-branding.controller';

const router = Router();

router.get('/', authenticate, getBranding);
router.put('/', authenticate, updateBranding);

export default router;
