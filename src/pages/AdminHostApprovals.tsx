import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminHostApprovals.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';
import type { HostApprovalApplication } from '../types';

export const AdminHostApprovals = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<HostApprovalApplication[]>([]);

    const loadQueue = async () => {
        const pending = await api.listPendingHosts();
        setItems(pending);
    };

    useEffect(() => {
        const load = async () => {
            if (!hasSupabaseConfig) {
                setError('Supabase auth is not configured yet.');
                setLoading(false);
                return;
            }

            const session = await authService.getSession();
            if (!session) {
                navigate('/host/auth', { replace: true });
                return;
            }

            const role = await api.getCurrentUserRole();
            if (role !== 'admin') {
                setError('Only admins can review host applications.');
                setLoading(false);
                return;
            }

            await loadQueue();
            setLoading(false);
        };

        load();
    }, [navigate]);

    const handleReview = async (userId: string, decision: 'approved' | 'rejected') => {
        setSavingId(userId);
        setError(null);
        try {
            await api.reviewHostApplication(userId, decision);
            await loadQueue();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to update host status');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return <div className={styles.page}><div className={styles.card}>Loading host approvals...</div></div>;
    }

    if (error && items.length === 0) {
        return <div className={styles.page}><div className={styles.card}>{error}</div></div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1>Host Approval Queue</h1>
                <p>Review new host accounts before they can publish listings.</p>

                {error && <div className={styles.error}>{error}</div>}

                {items.length === 0 ? (
                    <div className={styles.empty}>No pending host applications.</div>
                ) : (
                    <div className={styles.list}>
                        {items.map((item) => (
                            <article key={item.id} className={styles.row}>
                                <div>
                                    <h3>{item.fullName}</h3>
                                    <p>User ID: {item.id}</p>
                                    <small>Applied: {new Date(item.createdAt).toLocaleString()}</small>
                                </div>
                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        className={styles.approve}
                                        onClick={() => handleReview(item.id, 'approved')}
                                        disabled={savingId === item.id}
                                    >
                                        Approve
                                    </button>
                                    <button
                                        type="button"
                                        className={styles.reject}
                                        onClick={() => handleReview(item.id, 'rejected')}
                                        disabled={savingId === item.id}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
