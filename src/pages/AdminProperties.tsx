import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './AdminProperties.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';
import type { Listing } from '../types';

const formatPrice = (price: number, currency = 'INR') =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(price);

export const AdminProperties = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [properties, setProperties] = useState<Listing[]>([]);
    const [busyPropertyId, setBusyPropertyId] = useState<string | null>(null);

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

            const listings = await api.fetchAdminListings();
            setProperties(listings);
            setLoading(false);
        };

        load();
    }, [navigate]);

    const reloadListings = async () => {
        const listings = await api.fetchAdminListings();
        setProperties(listings);
    };

    const handleDelist = async (listingId: string) => {
        if (!window.confirm('Delist this property? It will no longer be visible to guests.')) {
            return;
        }

        try {
            setBusyPropertyId(listingId);
            setError(null);
            await api.adminDelistListing(listingId);
            await reloadListings();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delist property');
        } finally {
            setBusyPropertyId(null);
        }
    };

    if (loading) {
        return <div className={styles.page}><SkeletonScreen variant="admin-table" count={6} /></div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <div className={styles.headerRow}>
                    <div>
                        <h1>Admin Properties</h1>
                        <p>View all properties, delist active ones, and add new inventory.</p>
                    </div>
                    <Link to="/host/new" className={styles.primaryButton}>Add Property</Link>
                </div>

                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.metaRow}>
                    <span><strong>{properties.length}</strong> total properties</span>
                    <span><strong>{properties.filter((property) => property.hostId).length}</strong> with assigned host</span>
                </div>

                {properties.length > 0 ? (
                    <div className={styles.grid}>
                        {properties.map((property) => {
                            const isDelisted = property.isActive === false;
                            const isBusy = busyPropertyId === property.id;

                            return (
                                <article key={property.id} className={styles.card}>
                                    <img
                                        src={property.images[0] ?? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop'}
                                        alt={property.title}
                                        className={styles.image}
                                    />
                                    <div className={styles.body}>
                                        <div className={styles.top}>
                                            <h3>{property.title}</h3>
                                            <span className={isDelisted ? styles.badgeDelisted : styles.badgeActive}>
                                                {isDelisted ? 'Delisted' : 'Active'}
                                            </span>
                                        </div>
                                        <p>{property.location.city}, {property.location.country}</p>
                                        <p className={styles.hostLine}>Host: {property.host.name}</p>
                                        <p className={styles.price}>{formatPrice(property.price, property.currency)} / night</p>
                                        <div className={styles.actions}>
                                            <Link to={`/rooms/${property.id}`} className={styles.secondaryButton}>View</Link>
                                            <Link to={`/host/edit/${property.id}`} className={styles.secondaryButton}>Edit</Link>
                                            <button
                                                type="button"
                                                className={styles.dangerButton}
                                                onClick={() => handleDelist(property.id)}
                                                disabled={isBusy || isDelisted}
                                            >
                                                {isDelisted ? 'Already delisted' : isBusy ? 'Delisting...' : 'Delist'}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <h3>No properties found</h3>
                        <p>Use Add Property to publish the first listing.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
