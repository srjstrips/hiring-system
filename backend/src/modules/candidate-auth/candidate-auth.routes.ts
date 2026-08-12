import { Router } from 'express';
import { candidateAuthController } from './candidate-auth.controller';
import { authenticateCandidate } from '../../middlewares/authenticateCandidate';
import { validateBody } from '../../middlewares/validate';
import { signupSchema, loginSchema, refreshTokenSchema } from './candidate-auth.validators';

const router = Router();

router.post('/signup', validateBody(signupSchema), candidateAuthController.signup);
router.post('/login', validateBody(loginSchema), candidateAuthController.login);
router.post('/refresh', validateBody(refreshTokenSchema), candidateAuthController.refresh);
router.post('/logout', validateBody(refreshTokenSchema), candidateAuthController.logout);
router.get('/me', authenticateCandidate, candidateAuthController.getMe);

export default router;
