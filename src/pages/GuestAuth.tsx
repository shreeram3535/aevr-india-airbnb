import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './HostAuth.module.css';
import { authService } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabase';

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
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

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
                    return;
                }

                navigate(nextPath, { replace: true });
                return;
            }

            const { error, data } = await authService.signUp(email, password, fullName, 'guest');
            if (error) {
                setMessage(error.message);
                return;
            }

            if (data.session) {
                navigate(nextPath, { replace: true });
            } else {
                setMessage('Account created. Check your email to verify your account, then come back to finish your booking.');
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to continue');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.page}><div className={styles.card}>Loading guest access...</div></div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.hero}>
                <div className={styles.badge}>Guest mode</div>
                <h1>{pendingBooking ? 'Create your guest account to finish booking' : 'Sign in to book and manage your trips'}</h1>
                <p>
                    Create a guest account to reserve a stay, track your bookings, and keep your order history in one place.
                </p>
                {pendingBooking && (
                    <div className={styles.alert}>
                        You have a booking waiting for you. After you sign in or create your guest account, we’ll take you back to the room and complete it.
                    </div>
                )}
                <div className={styles.heroStats}>
                    <div>
                        <strong>Book easily</strong>
                        <span>Reserve after login</span>
                    </div>
                    <div>
                        <strong>Track trips</strong>
                        <span>See all bookings</span>
                    </div>
                    <div>
                        <strong>Simple</strong>
                        <span>Email and password</span>
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.tabs}>
                    <button
                        type="button"
                        className={mode === 'sign-in' ? styles.activeTab : styles.tab}
                        onClick={() => setMode('sign-in')}
                    >
                        Sign in
                    </button>
                    <button
                        type="button"
                        className={mode === 'sign-up' ? styles.activeTab : styles.tab}
                        onClick={() => setMode('sign-up')}
                    >
                        Sign up
                    </button>
                </div>

                {!hasSupabaseConfig && (
                    <div className={styles.alert}>
                        Supabase env vars are missing. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to enable auth.
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {mode === 'sign-up' && (
                        <label className={styles.field}>
                            <span>Full name</span>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your name"
                                required
                            />
                        </label>
                    )}

                    <label className={styles.field}>
                        <span>Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </label>

                    <label className={styles.field}>
                        <span>Password</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            minLength={6}
                            required
                        />
                    </label>

                    {message && <div className={styles.message}>{message}</div>}

                    <button type="submit" className={styles.submitButton} disabled={submitting || !hasSupabaseConfig}>
                        {submitting ? 'Please wait...' : mode === 'sign-in' ? 'Continue' : 'Create guest account'}
                    </button>
                </form>

                <button type="button" className={styles.secondaryButton} onClick={() => navigate('/')}>
                    Back to browsing
                </button>
            </div>
        </div>
    );
};
