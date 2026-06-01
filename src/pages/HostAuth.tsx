import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HostAuth.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';

type Mode = 'sign-in' | 'sign-up';

export const HostAuth = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('sign-in');
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
                if (error) {
                    setMessage(error.message);
                    return;
                }
                const path = await api.resolveHostEntryPath();
                navigate(path, { replace: true });
                return;
            }

            const { error, data } = await authService.signUp(email, password, fullName);
            if (error) {
                setMessage(error.message);
                return;
            }

            if (data.session) {
                const path = await api.resolveHostEntryPath();
                navigate(path, { replace: true });
            } else {
                setMessage('Account created. Check your email to verify your account, then come back to continue.');
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to continue');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.page}><div className={styles.card}>Loading host access...</div></div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.hero}>
                <div className={styles.badge}>Host mode</div>
                <h1>Sign in to manage your properties</h1>
                <p>
                    Use your Supabase auth account to access your host dashboard, view existing listings, and add new properties.
                </p>
                <div className={styles.heroStats}>
                    <div>
                        <strong>Secure</strong>
                        <span>Supabase Auth</span>
                    </div>
                    <div>
                        <strong>Fast</strong>
                        <span>Session based</span>
                    </div>
                    <div>
                        <strong>Ready</strong>
                        <span>Dashboard + add property</span>
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
                        Create account
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
                        {submitting ? 'Please wait...' : mode === 'sign-in' ? 'Continue to host dashboard' : 'Create host account'}
                    </button>
                </form>

                <button type="button" className={styles.secondaryButton} onClick={() => navigate('/')}>
                    Back to guest mode
                </button>
            </div>
        </div>
    );
};
