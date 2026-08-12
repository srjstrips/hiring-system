import { Response, NextFunction } from 'express';
import { CandidateAuthRequest } from '../types';
import { verifyCandidateAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';

export async function authenticateCandidate(
  req: CandidateAuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyCandidateAccessToken(token);

    req.candidate = {
      id: payload.sub,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
    };

    next();
  } catch (err) {
    next(err);
  }
}
