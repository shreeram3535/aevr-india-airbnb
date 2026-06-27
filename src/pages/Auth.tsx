import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Home, Compass } from 'lucide-react';
import { createClient } from '@supabase/supabase-js'; // Added direct import to fix the error
import styles from './Auth.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';

// Initialize Supabase directly to avoid import errors from services
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Mode = 'sign-in' | 'sign-up';
type SignUpRole = 'guest' | 'host';

export const Auth = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('sign-in');
    const [signUpRole, setSignUpRole] = useState<SignUpRole>('guest');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [messageType, setMessageType] = useState<'info' | 'error'>('error');

    useEffect(() => {
        const loadSession = async () => {
            const session = await authService.getSession();
            if (session) {
                const next = await api.resolveDashboardPath();
                navigate(next, { replace: true });
                return;
            }
            setLoading(false);
        };
        loadSession();
    }, [navigate]);

    // Google Auth Handler
    const handleGoogleLogin = async () => {
        setMessage(null);
        try {
            localStorage.setItem('aevr.oauth_role', signUpRole);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth`,
                    queryParams: { role: signUpRole } // Passes the selected role to your database
                }
            });
            if (error) throw error;
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Google login failed');
            setMessageType('error');
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitting(true);
        setMessage(null);

        try {
            if (mode === 'sign-in') {
                const { error } = await authService.signIn(email, password);
                if (error) {
                    setMessage(error.message);
                    setMessageType('error');
                    return;
                }
                const next = await api.resolveDashboardPath();
                navigate(next, { replace: true });
                return;
            }

            const { error, data } = await authService.signUp(email, password, fullName, signUpRole);
            if (error) {
                setMessage(error.message);
                setMessageType('error');
                return;
            }

            if (data.session) {
                const next = await api.resolveDashboardPath();
                navigate(next, { replace: true });
            } else {
                setMessageType('info');
                setMessage('Account created! Please check your email to verify your account, then sign in.');
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to continue');
            setMessageType('error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.page}><SkeletonScreen variant="auth" /></div>;
    }

    return (
        <div className={styles.page}>
            <button type="button" className={styles.backLink} onClick={() => navigate('/')}>
                <ArrowLeft size={16} /> Back to browsing
            </button>

            <div className={styles.formCard}>
                <div className={styles.brandLogo}>
                    <Compass size={32} strokeWidth={1.5} />
                    <span>AEVR</span>
                </div>

                <div className={styles.formHeader}>
                    <h2>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h2>
                    <p>{mode === 'sign-in' ? 'Sign in to access your dashboard.' : 'Join AEVR as a guest or host today.'}</p>
                </div>

                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={`${styles.tab} ${mode === 'sign-in' ? styles.tabActive : ''}`}
                        onClick={() => { setMode('sign-in'); setMessage(null); }}
                    >
                        Log in
                    </button>
                    <button
                        type="button"
                        className={`${styles.tab} ${mode === 'sign-up' ? styles.tabActive : ''}`}
                        onClick={() => { setMode('sign-up'); setMessage(null); }}
                    >
                        Sign up
                    </button>
                </div>

                {!hasSupabaseConfig && (
                    <div className={styles.alert}>
                        Supabase env vars are missing. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
                    </div>
                )}

                {/* Role selection ensures Google knows what kind of account to create */}
                {mode === 'sign-up' && (
                    <div className={styles.field} style={{ marginBottom: '24px' }}>
                        <span>Account type</span>
                        <div className={styles.roleGroup}>
                            <label className={styles.roleOption}>
                                <input type="radio" name="role" value="guest" checked={signUpRole === 'guest'} onChange={() => setSignUpRole('guest')} />
                                <div className={styles.roleCard}>
                                    <Compass size={18} strokeWidth={1.5} className={styles.roleCardIcon} />
                                    <span className={styles.roleCardTitle}>Guest</span>
                                </div>
                            </label>
                            <label className={styles.roleOption}>
                                <input type="radio" name="role" value="host" checked={signUpRole === 'host'} onChange={() => setSignUpRole('host')} />
                                <div className={styles.roleCard}>
                                    <Home size={18} strokeWidth={1.5} className={styles.roleCardIcon} />
                                    <span className={styles.roleCardTitle}>Host</span>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* Google Sign-In Button */}
                <button 
                    type="button" 
                    onClick={handleGoogleLogin} 
                    disabled={!hasSupabaseConfig}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '12px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.95rem', color: '#1e293b' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>

                <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                    <span style={{ padding: '0 12px' }}>or use email</span>
                    <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    {mode === 'sign-up' && (
                        <label className={styles.field}>
                            <span>Full name</span>
                            <div className={styles.inputWrapper}>
                                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
                            </div>
                        </label>
                    )}

                    <label className={styles.field}>
                        <span>Email</span>
                        <div className={styles.inputWrapper}>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                        </div>
                    </label>

                    <label className={styles.field}>
                        <span>Password</span>
                        <div className={styles.inputWrapper}>
                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
                            <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </label>

                    {message && (
                        <div className={`${styles.message} ${messageType === 'error' ? styles.messageError : styles.messageInfo}`}>
                            {message}
                        </div>
                    )}

                    <button type="submit" className={styles.submitButton} disabled={submitting || !hasSupabaseConfig}>
                        {submitting ? 'Please wait...' : mode === 'sign-in' ? 'Continue' : 'Create account'}
                    </button>
                </form>
            </div>
        </div>
    );
};