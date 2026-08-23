import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { candidateAuthApi, type CandidateProfile } from '@/api/career';
import { requestNotificationPermission } from '@/lib/firebase';

interface SignupInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
}

interface CandidateAuthContextValue {
  candidate: CandidateProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signup: (dto: SignupInput) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const CandidateAuthContext = createContext<CandidateAuthContextValue | null>(null);

export function CandidateAuthProvider({ children }: { children: ReactNode }) {
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('candidateAccessToken');
    if (token) {
      candidateAuthApi
        .getMe()
        .then(setCandidate)
        .catch(() => {
          localStorage.removeItem('candidateAccessToken');
          localStorage.removeItem('candidateRefreshToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const registerFcmToken = useCallback(async () => {
    const token = await requestNotificationPermission();
    if (token) void candidateAuthApi.saveFcmToken(token);
  }, []);

  const signup = useCallback(async (dto: SignupInput) => {
    const result = await candidateAuthApi.signup(dto);
    localStorage.setItem('candidateAccessToken', result.accessToken);
    localStorage.setItem('candidateRefreshToken', result.refreshToken);
    setCandidate(result.candidate);
    void registerFcmToken();
  }, [registerFcmToken]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await candidateAuthApi.login(email, password);
    localStorage.setItem('candidateAccessToken', result.accessToken);
    localStorage.setItem('candidateRefreshToken', result.refreshToken);
    setCandidate(result.candidate);
    void registerFcmToken();
  }, [registerFcmToken]);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('candidateRefreshToken');
    if (refreshToken) {
      await candidateAuthApi.logout(refreshToken).catch(() => null);
    }
    localStorage.removeItem('candidateAccessToken');
    localStorage.removeItem('candidateRefreshToken');
    setCandidate(null);
  }, []);

  return (
    <CandidateAuthContext.Provider
      value={{
        candidate,
        isLoading,
        isAuthenticated: !!candidate,
        signup,
        login,
        logout,
      }}
    >
      {children}
    </CandidateAuthContext.Provider>
  );
}

export function useCandidateAuth() {
  const ctx = useContext(CandidateAuthContext);
  if (!ctx) throw new Error('useCandidateAuth must be used inside CandidateAuthProvider');
  return ctx;
}
