import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/users.routes';
import masterRoutes from '../modules/masters';
import jobRoutes from '../modules/jobs/jobs.routes';
import applicationRoutes from '../modules/applications/applications.routes';
import assessmentRoutes from '../modules/assessments/assessments.routes';
import careerRoutes from '../modules/career/career.routes';
import emailTemplateRoutes from '../modules/email-templates/email-templates.routes';
import candidateRoutes from '../modules/candidates/candidates.routes';
import offerRoutes from '../modules/offers/offers.routes';
import requisitionRoutes from '../modules/requisitions/requisitions.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/masters', masterRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/assessments', assessmentRoutes);
router.use('/career', careerRoutes);
router.use('/email-templates', emailTemplateRoutes);
router.use('/candidates', candidateRoutes);
router.use('/offers', offerRoutes);
router.use('/requisitions', requisitionRoutes);

export default router;
