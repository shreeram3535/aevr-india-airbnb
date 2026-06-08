import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminGuestVerification.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';
import type { GuestVerificationUser } from '../types';

export const AdminGuestVerification = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [guests, setGuests] = useState<GuestVerificationUser[]>([]);

    const loadGuests = async () => {
        const users = await api.listGuestVerificationUsers();
        setGuests(users);
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
                setError('Only admins can manage guest verification.');
                setLoading(false);
                return;
            }

            await loadGuests();
            setLoading(false);
        };

        load();
    }, [navigate]);

    const handleToggle = async (guest: GuestVerificationUser) => {
        setSavingId(guest.id);
        setError(null);
        try {
            await api.updateGuestVerification(guest.id, !guest.isVerifiedGuest);
            await loadGuests();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to update guest verification');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return <div className={styles.page}><SkeletonScreen variant="admin-table" count={5} /></div>;
    }

    if (error && guests.length === 0) {
        return <div className={styles.page}><div className={styles.card}>{error}</div></div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1>Guest Verification</h1>
                <p>Grant or remove the AEVR VERIFIED GUEST badge for guest accounts.</p>

                {error && <div className={styles.error}>{error}</div>}

                {guests.length === 0 ? (
                    <div className={styles.empty}>No guest users found.</div>
                ) : (
                    <div className={styles.list}>
                        {guests.map((guest) => (
                            <article key={guest.id} className={styles.row}>
                                <div className={styles.guestInfo}>
                                    {guest.avatarUrl ? (
                                        <img src={guest.avatarUrl} alt={guest.fullName} className={styles.avatar} />
                                    ) : (
                                        <div className={styles.avatarFallback}>{guest.fullName.slice(0, 1).toUpperCase()}</div>
                                    )}
                                    <div>
                                        <h3>{guest.fullName}</h3>
                                        <small>Joined: {new Date(guest.createdAt).toLocaleString()}</small>
                                    </div>
                                </div>
                                <div className={styles.actions}>
                                    <span className={guest.isVerifiedGuest ? styles.statusBadge : styles.statusBadgeMuted}>
                                        {guest.isVerifiedGuest ? 'AEVR VERIFIED GUEST' : 'Not verified'}
                                    </span>
                                    <button
                                        type="button"
                                        className={styles.toggleButton}
                                        onClick={() => handleToggle(guest)}
                                        disabled={savingId === guest.id}
                                    >
                                        {guest.isVerifiedGuest ? 'Remove badge' : 'Add badge'}
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
