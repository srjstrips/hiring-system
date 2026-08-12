import { Request, Response } from 'express';
import { candidateAuthService } from './candidate-auth.service';
import { ApiResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { CandidateAuthRequest } from '../../types';

export class CandidateAuthController {
  signup = asyncHandler(async (req: Request, res: Response) => {
    const result = await candidateAuthService.signup(req.body, req.ip, req.headers['user-agent']);
    return ApiResponse.success(res, result, 'Account created successfully', 201);
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await candidateAuthService.login(req.body, req.ip, req.headers['user-agent']);
    return ApiResponse.success(res, result, 'Login successful');
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const result = await candidateAuthService.refresh(req.body.refreshToken);
    return ApiResponse.success(res, result, 'Token refreshed');
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    await candidateAuthService.logout(req.body.refreshToken);
    return ApiResponse.success(res, null, 'Logged out successfully');
  });

  getMe = asyncHandler(async (req: CandidateAuthRequest, res: Response) => {
    const candidate = await candidateAuthService.getMe(req.candidate!.id);
    return ApiResponse.success(res, candidate);
  });
}

export const candidateAuthController = new CandidateAuthController();
