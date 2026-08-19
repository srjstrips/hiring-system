import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, UserCircle2 } from 'lucide-react';
import { useCandidateAuth } from '@/contexts/CandidateAuthContext';
import { useAuth } from '@/contexts/AuthContext';

export default function ChooseLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';

  const { login: hrLogin } = useAuth();
  const { login: candidateLogin } = useCandidateAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await candidateLogin(email, password);
      const dest = redirect && redirect.startsWith('/careers') ? redirect : '/careers/jobs';
      navigate(dest, { replace: true });
      return;
    } catch {
      // not a candidate — try HR
    }

    try {
      await hrLogin(email, password);
      const dest = redirect && !redirect.startsWith('/careers') ? redirect : '/dashboard';
      navigate(dest, { replace: true });
      return;
    } catch {
      setError('Invalid email or password.');
    }

    setLoading(false);
  };

  const signupHref = `/careers/signup${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;

  return (
    <>
      <style>{`
        @keyframes cl-spin { to { transform: rotate(360deg); } }

        /* Override dark-theme card to white for career layout */
        .cl-page {
          min-height: calc(100vh - 88px - 120px);
          background: #0A0A0A;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 56px 16px 64px;
        }

        .cl-card {
          width: 100%;
          max-width: 468px;
          background: #151515;
          border: 1px solid #2A2A2A;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.45);
          padding: 36px 32px 32px;
        }

        .cl-input {
          width: 100%;
          height: 48px;
          background: #0D0D0D !important;
          border: 1px solid #333333;
          border-radius: 8px;
          color: #FFFFFF !important;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cl-input::placeholder { color: #71717A; }
        .cl-input:focus {
          border-color: #FF6B00 !important;
          box-shadow: 0 0 0 3px rgba(255,107,0,0.14) !important;
        }

        /* Chrome autofill override */
        .cl-input:-webkit-autofill,
        .cl-input:-webkit-autofill:hover,
        .cl-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0D0D0D inset !important;
          box-shadow: 0 0 0 1000px #0D0D0D inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
          caret-color: #FFFFFF;
        }

        .cl-label {
          display: block;
          font-size: 13.5px;
          font-weight: 600;
          color: #FFFFFF;
          margin-bottom: 7px;
        }

        .cl-btn {
          width: 100%;
          height: 48px;
          background: #FF6B00;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .cl-btn:hover:not(:disabled) { background: #E85D00; }
        .cl-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        @media (max-width: 520px) {
          .cl-card { padding: 28px 20px 24px; }
        }
      `}</style>

      <div className="cl-page">
        <div className="cl-card">

          {/* Avatar icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,107,0,0.10)',
              border: '1px solid rgba(255,107,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCircle2 size={28} color="#FF6B00" strokeWidth={1.6} />
            </div>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
              Login
            </h1>
            <p style={{ fontSize: 15, color: '#A1A1AA', marginTop: 6, marginBottom: 0 }}>
              Sign in to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 18, padding: '11px 14px', borderRadius: 8,
              background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)',
              color: '#FCA5A5', fontSize: 13.5,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label htmlFor="cl-email" className="cl-label">Email address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  id="cl-email"
                  type="email"
                  placeholder="Enter your email address"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="cl-input"
                  style={{ paddingLeft: 40, paddingRight: 14 }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="cl-password" className="cl-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#9CA3AF" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  id="cl-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="cl-input"
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                    color: '#9CA3AF', display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#D4D4D8', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#FF6B00', cursor: 'pointer' }}
                />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                style={{ fontSize: 13.5, fontWeight: 600, color: '#FF6B00', textDecoration: 'none' }}
                onMouseOver={(e) => ((e.target as HTMLElement).style.textDecoration = 'underline')}
                onMouseOut={(e) => ((e.target as HTMLElement).style.textDecoration = 'none')}
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="cl-btn">
              {loading ? (
                <>
                  <span style={{
                    width: 17, height: 17,
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    borderRadius: '50%', display: 'inline-block',
                    animation: 'cl-spin 0.7s linear infinite',
                  }} />
                  Logging in...
                </>
              ) : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 20px' }}>
            <div style={{ flex: 1, height: 1, background: '#333333' }} />
            <span style={{ fontSize: 12.5, color: '#71717A' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#333333' }} />
          </div>

          {/* Sign up */}
          <p style={{ textAlign: 'center', fontSize: 14, color: '#A1A1AA', margin: 0 }}>
            Don't have an account?{' '}
            <Link
              to={signupHref}
              style={{ color: '#FF6B00', fontWeight: 600, textDecoration: 'none' }}
              onMouseOver={(e) => ((e.target as HTMLElement).style.textDecoration = 'underline')}
              onMouseOut={(e) => ((e.target as HTMLElement).style.textDecoration = 'none')}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
