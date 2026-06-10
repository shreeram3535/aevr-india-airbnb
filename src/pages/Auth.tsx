import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Home, Compass } from 'lucide-react';
import styles from './Auth.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';

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
                setMessage('Account created. Check your email to verify your account, then sign in.');
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

                {/* Tab Switcher */}
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

                <form onSubmit={handleSubmit} className={styles.form}>
                    {mode === 'sign-up' && (
                        <>
                            <label className={styles.field}>
                                <span>Full name</span>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your name"
                                        required
                                    />
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span>Account type</span>
                                <div className={styles.roleGroup}>
                                    <label className={styles.roleOption}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="guest"
                                            checked={signUpRole === 'guest'}
                                            onChange={() => setSignUpRole('guest')}
                                        />
                                        <div className={styles.roleCard}>
                                            <Compass size={18} strokeWidth={1.5} className={styles.roleCardIcon} />
                                            <span className={styles.roleCardTitle}>Guest</span>
                                        </div>
                                    </label>
                                    <label className={styles.roleOption}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="host"
                                            checked={signUpRole === 'host'}
                                            onChange={() => setSignUpRole('host')}
                                        />
                                        <div className={styles.roleCard}>
                                            <Home size={18} strokeWidth={1.5} className={styles.roleCardIcon} />
                                            <span className={styles.roleCardTitle}>Host</span>
                                        </div>
                                    </label>
                                </div>
                            </label>
                        </>
                    )}

                    <label className={styles.field}>
                        <span>Email</span>
                        <div className={styles.inputWrapper}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </label>

                    <label className={styles.field}>
                        <span>Password</span>
                        <div className={styles.inputWrapper}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                            <button
                                type="button"
                                className={styles.eyeBtn}
                                onClick={() => setShowPassword((v) => !v)}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
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
                        {submitting
                            ? 'Please wait...'
                            : mode === 'sign-in'
                                ? 'Continue'
                                : 'Create account'}
                    </button>
                </form>
            </div>
        </div>
    );
};
