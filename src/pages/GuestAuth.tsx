import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Compass } from 'lucide-react';
import styles from './GuestAuth.module.css';
import { authService } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';

type Mode = 'sign-in' | 'sign-up';

type PendingBooking = {
    listingId: string;
    checkIn: string;
    checkOut: string;
    guestCount: number;
    mode: 'reserve' | 'request';
};

const PENDING_BOOKING_KEY = 'aevr.pending-booking';

const readPendingBooking = (): PendingBooking | null => {
    try {
        const stored = sessionStorage.getItem(PENDING_BOOKING_KEY);
        if (!stored) {
            return null;
        }

        const parsed = JSON.parse(stored) as PendingBooking;
        if (!parsed?.listingId || !parsed?.checkIn || !parsed?.checkOut || !parsed?.guestCount || !parsed?.mode) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
};

const getSafeNextPath = (value: string | null) => {
    if (!value) {
        return '/trips';
    }

    if (!value.startsWith('/')) {
        return '/trips';
    }

    return value;
};



export const GuestAuth = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const nextPath = getSafeNextPath(searchParams.get('next'));
    const pendingBooking = readPendingBooking();
    const shouldDefaultToSignUp = searchParams.get('mode') === 'sign-up' || Boolean(pendingBooking);
    const [mode, setMode] = useState<Mode>(shouldDefaultToSignUp ? 'sign-up' : 'sign-in');
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
                navigate(nextPath, { replace: true });
                return;
            }

            setLoading(false);
        };

        loadSession();
    }, [navigate, nextPath]);

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

                navigate(nextPath, { replace: true });
                return;
            }

            const { error, data } = await authService.signUp(email, password, fullName, 'guest');
            if (error) {
                setMessage(error.message);
                setMessageType('error');
                return;
            }

            if (data.session) {
                navigate(nextPath, { replace: true });
            } else {
                setMessageType('info');
                setMessage('Account created. Check your email to verify your account, then come back to finish your booking.');
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
                    <span>AEVR Guest</span>
                </div>

                {pendingBooking && (
                    <div className={styles.bookingNotice}>
                        <strong>Booking reservation pending</strong>
                        <span>Sign in or create an account below, and we'll automatically route you to complete your reservation.</span>
                    </div>
                )}

                <div className={styles.formHeader}>
                    <h2>{mode === 'sign-in' ? 'Welcome back' : 'Create guest account'}</h2>
                    <p>{mode === 'sign-in' ? 'Sign in to manage your trips.' : 'Sign up to start booking stays.'}</p>
                </div>

                {/* Tab Switcher */}
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
                                : 'Create guest account'}
                    </button>
                </form>

                <button type="button" className={styles.secondaryButton} onClick={() => navigate('/')}>
                    Back to browsing
                </button>
            </div>
        </div>
    );
};
