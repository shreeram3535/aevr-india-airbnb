import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './AdminDashboard.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';

export const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingHostsCount, setPendingHostsCount] = useState(0);
    const [hasActiveFlashSale, setHasActiveFlashSale] = useState(false);

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
                navigate(role === 'host' ? '/host' : '/', { replace: true });
                return;
            }

            const [pendingHosts, activeDrop] = await Promise.all([
                api.listPendingHosts(),
                api.fetchActiveFlashDrop(new Date()),
            ]);

            setPendingHostsCount(pendingHosts.length);
            setHasActiveFlashSale(Boolean(activeDrop));
            setLoading(false);
        };

        load();
    }, [navigate]);

    if (loading) {
        return <div className={styles.page}><SkeletonScreen variant="admin-dashboard" /></div>;
    }

    if (error) {
        return <div className={styles.page}><div className={styles.panel}>{error}</div></div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <h1>Admin Dashboard</h1>
                <p>Manage host approvals and flash-sale operations from one place.</p>

                <section className={styles.stats}>
                    <div className={styles.statCard}>
                        <strong>{pendingHostsCount}</strong>
                        <span>Pending host applications</span>
                    </div>
                    <div className={styles.statCard}>
                        <strong>{hasActiveFlashSale ? 'Active' : 'None'}</strong>
                        <span>Flash sale status</span>
                    </div>
                </section>

                <section className={styles.actions}>
                    <Link to="/host/properties" className={styles.primaryButton}>Manage Properties</Link>
                    <Link to="/host/host-approvals" className={styles.primaryButton}>Open Host Approvals</Link>
                    <Link to="/host/guest-verification" className={styles.secondaryButton}>Guest Verification</Link>
                    <Link to="/host/flash-sales" className={styles.secondaryButton}>Open Flash Sales</Link>
                </section>
            </div>
        </div>
    );
};
