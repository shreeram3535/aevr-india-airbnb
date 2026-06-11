import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Home, Star, Shield } from 'lucide-react';
import styles from './HostAuth.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';

type Mode = 'sign-in' | 'sign-up';

const FEATURES = [
    { icon: <Home size={18} />, title: 'Manage properties', desc: 'Add, edit and track all your listings in one place.' },
    { icon: <Star size={18} />, title: 'Track reviews', desc: 'Monitor guest ratings and build your reputation.' },
    { icon: <Shield size={18} />, title: 'Secure & fast', desc: 'Powered by Supabase Auth — enterprise-grade security.' },
];

export const HostAuth = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('sign-in');
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
                const path = await api.resolveHostEntryPath();
                navigate(path, { replace: true });
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
                if (error) { setMessage(error.message); setMessageType('error'); return; }
                const path = await api.resolveHostEntryPath();
                navigate(path, { replace: true });
                return;
            }

            const { error, data } = await authService.signUp(email, password, fullName);
            if (error) { setMessage(error.message); setMessageType('error'); return; }

            if (data.session) {
                const path = await api.resolveHostEntryPath();
                navigate(path, { replace: true });
            } else {
                setMessageType('info');
                setMessage('Account created! Check your email to verify, then come back to sign in.');
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
            {/* ── Left Panel ── */}
            <div className={styles.leftPanel}>
                {/* Geometric pattern */}
                <div className={styles.patternOverlay} aria-hidden />

                <div className={styles.leftContent}>
                    <div className={styles.brandMark}>
                        <Home size={28} />
                        <span>AEVR</span>
                    </div>

                    <div className={styles.leftHeading}>
                        <h1>Host with AEVR</h1>
                        <p>List your properties, reach thousands of guests, and manage everything from a single dashboard.</p>
                    </div>

                    <div className={styles.featureList}>
                        {FEATURES.map((f) => (
                            <div key={f.title} className={styles.featureItem}>
                                <div className={styles.featureIcon}>{f.icon}</div>
                                <div>
                                    <strong>{f.title}</strong>
                                    <span>{f.desc}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className={styles.leftQuote}>
                        "Managing our 12 properties has never been this seamless."
                        <cite>— Priya S., AEVR Host</cite>
                    </div>
                </div>
            </div>

            {/* ── Right Panel ── */}
            <div className={styles.rightPanel}>
                <button type="button" className={styles.backLink} onClick={() => navigate('/')}>
                    <ArrowLeft size={16} /> Back to browsing
                </button>

                <div className={styles.formCard}>
                    <div className={styles.formHeader}>
                        <h2>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h2>
                        <p>{mode === 'sign-in' ? 'Sign in to your host dashboard.' : 'Join AEVR as a host today.'}</p>
                    </div>

                    {/* Tab switcher */}
                    <div className={styles.tabs}>
                        <button
                            type="button"
                            className={`${styles.tab} ${mode === 'sign-in' ? styles.tabActive : ''}`}
                            onClick={() => { setMode('sign-in'); setMessage(null); }}
                        >
                            Sign in
                        </button>
                        <button
                            type="button"
                            className={`${styles.tab} ${mode === 'sign-up' ? styles.tabActive : ''}`}
                            onClick={() => { setMode('sign-up'); setMessage(null); }}
                        >
                            Create account
                        </button>
                    </div>

                    {!hasSupabaseConfig && (
                        <div className={`${styles.message} ${styles.messageError}`}>
                            Supabase env vars are missing. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        {mode === 'sign-up' && (
                            <label className={styles.field}>
                                <span>Full name</span>
                                <div className={styles.inputWrapper}>
                                    <User size={16} className={styles.inputIcon} />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your full name"
                                        required
                                    />
                                </div>
                            </label>
                        )}

                        <label className={styles.field}>
                            <span>Email address</span>
                            <div className={styles.inputWrapper}>
                                <Mail size={16} className={styles.inputIcon} />
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
                                <Lock size={16} className={styles.inputIcon} />
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

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={submitting || !hasSupabaseConfig}
                        >
                            {submitting
                                ? 'Please wait…'
                                : mode === 'sign-in'
                                    ? 'Continue to dashboard →'
                                    : 'Create host account →'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
