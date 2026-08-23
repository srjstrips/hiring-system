import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { candidateAuthController } from './candidate-auth.controller';
import { authenticateCandidate } from '../../middlewares/authenticateCandidate';
import { validateBody } from '../../middlewares/validate';
import {
  signupSchema,
  loginSchema,
  refreshTokenSchema,
  profileUpdateSchema,
} from './candidate-auth.validators';

const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/resumes'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/photos'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

const certificationStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/certifications'),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});
const certificationUpload = multer({
  storage: certificationStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

const router = Router();

router.post('/signup', validateBody(signupSchema), candidateAuthController.signup);
router.post('/login', validateBody(loginSchema), candidateAuthController.login);
router.post('/refresh', validateBody(refreshTokenSchema), candidateAuthController.refresh);
router.post('/logout', validateBody(refreshTokenSchema), candidateAuthController.logout);
router.get('/me', authenticateCandidate, candidateAuthController.getMe);

router.get('/profile', authenticateCandidate, candidateAuthController.getProfile);
router.put(
  '/profile',
  authenticateCandidate,
  validateBody(profileUpdateSchema),
  candidateAuthController.updateProfile
);
router.post(
  '/profile/resume',
  authenticateCandidate,
  resumeUpload.single('resume'),
  candidateAuthController.updateResume
);
router.post(
  '/profile/photo',
  authenticateCandidate,
  photoUpload.single('photo'),
  candidateAuthController.updatePhoto
);

router.get(
  '/profile/certifications',
  authenticateCandidate,
  candidateAuthController.listCertifications
);
router.post(
  '/profile/certifications',
  authenticateCandidate,
  certificationUpload.single('file'),
  candidateAuthController.addCertification
);
router.delete(
  '/profile/certifications/:id',
  authenticateCandidate,
  candidateAuthController.deleteCertification
);

router.post('/fcm-token', authenticateCandidate, candidateAuthController.saveFcmToken);

export default router;
