import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HostAuth.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';

type Mode = 'sign-in' | 'sign-up';
type SignUpRole = 'guest' | 'host';

export const Auth = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>('sign-in');
    const [signUpRole, setSignUpRole] = useState<SignUpRole>('guest');
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
                    return;
                }

                const next = await api.resolveDashboardPath();
                navigate(next, { replace: true });
                return;
            }

            const { error, data } = await authService.signUp(email, password, fullName, signUpRole);
            if (error) {
                setMessage(error.message);
                return;
            }

            if (data.session) {
                const next = await api.resolveDashboardPath();
                navigate(next, { replace: true });
            } else {
                setMessage('Account created. Check your email to verify your account, then sign in.');
            }
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to continue');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.page}><div className={styles.card}>Loading access...</div></div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.hero}>
                <div className={styles.badge}>Aevr Access</div>
                <h1>Log in or create your account</h1>
                <p>Use one login flow and we will route you to the right dashboard based on your role.</p>
            </div>

            <div className={styles.card}>
                <div className={styles.tabs}>
                    <button type="button" className={mode === 'sign-in' ? styles.activeTab : styles.tab} onClick={() => setMode('sign-in')}>
                        Log in
                    </button>
                    <button type="button" className={mode === 'sign-up' ? styles.activeTab : styles.tab} onClick={() => setMode('sign-up')}>
                        Sign up
                    </button>
                </div>

                {!hasSupabaseConfig && (
                    <div className={styles.alert}>
                        Supabase env vars are missing. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {mode === 'sign-up' && (
                        <>
                            <label className={styles.field}>
                                <span>Full name</span>
                                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" required />
                            </label>
                            <label className={styles.field}>
                                <span>Account type</span>
                                <select value={signUpRole} onChange={(e) => setSignUpRole(e.target.value as SignUpRole)}>
                                    <option value="guest">Guest</option>
                                    <option value="host">Host</option>
                                </select>
                            </label>
                        </>
                    )}

                    <label className={styles.field}>
                        <span>Email</span>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                    </label>

                    <label className={styles.field}>
                        <span>Password</span>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
                    </label>

                    {message && <div className={styles.message}>{message}</div>}

                    <button type="submit" className={styles.submitButton} disabled={submitting || !hasSupabaseConfig}>
                        {submitting ? 'Please wait...' : mode === 'sign-in' ? 'Continue' : 'Create account'}
                    </button>
                </form>
            </div>
        </div>
    );
};
