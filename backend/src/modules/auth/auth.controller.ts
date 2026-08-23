import { Request, Response } from 'express';
import { authService } from './auth.service';
import { ApiResponse } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthRequest } from '../../types';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

export class AuthController {
  /**
   * @swagger
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Login with email and password
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(
      req.body,
      req.ip,
      req.headers['user-agent']
    );

    return ApiResponse.success(res, result, 'Login successful');
  });

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Refresh access token
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Tokens refreshed
   */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refresh(req.body.refreshToken);
    return ApiResponse.success(res, result, 'Token refreshed');
  });

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Logout (revoke refresh token)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Logged out successfully
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    return ApiResponse.success(res, null, 'Logged out successfully');
  });

  /**
   * @swagger
   * /auth/logout-all:
   *   post:
   *     tags: [Auth]
   *     summary: Logout from all devices
   *     responses:
   *       200:
   *         description: Logged out from all devices
   */
  logoutAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    await authService.logoutAll(req.user!.id);
    return ApiResponse.success(res, null, 'Logged out from all devices');
  });

  /**
   * @swagger
   * /auth/forgot-password:
   *   post:
   *     tags: [Auth]
   *     summary: Request password reset email
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email]
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Reset email sent if account exists
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body);
    return ApiResponse.success(
      res,
      null,
      'If an account with that email exists, a reset link has been sent.'
    );
  });

  /**
   * @swagger
   * /auth/reset-password:
   *   post:
   *     tags: [Auth]
   *     summary: Reset password using token
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [token, password, confirmPassword]
   *             properties:
   *               token:
   *                 type: string
   *               password:
   *                 type: string
   *               confirmPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: Password reset successfully
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.resetPassword(req.body);
    return ApiResponse.success(res, null, 'Password reset successfully. Please login.');
  });

  /**
   * @swagger
   * /auth/me:
   *   get:
   *     tags: [Auth]
   *     summary: Get current user profile
   *     responses:
   *       200:
   *         description: Current user data
   */
  getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await authService.getMe(req.user!.id);
    return ApiResponse.success(res, user);
  });

  saveFcmToken = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { token } = req.body as { token: string };
    if (token) {
      await authService.saveFcmToken(req.user!.id, token);
    }
    return ApiResponse.success(res, null, 'FCM token saved');
  });
}

export const authController = new AuthController();
