import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Plus, LogOut, Star, MapPin, BedDouble, Bath, Users, Sparkles, Pencil, Trash2, CalendarDays } from 'lucide-react';
import styles from './HostDashboard.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';
import { HostApprovalStatusView } from '../components/HostApprovalStatus';
import type { HostApprovalStatus, Listing } from '../types';

type SessionUser = {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
};

const formatPrice = (value: number, currency?: string) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency ?? 'INR',
        maximumFractionDigits: 0,
    }).format(value);

const getUserDisplayName = (user: SessionUser | null) => {
    const metadata = user?.user_metadata ?? {};
    const fullName = typeof metadata.full_name === 'string' ? metadata.full_name : undefined;
    const name = typeof metadata.name === 'string' ? metadata.name : undefined;
    return fullName ?? name ?? user?.email ?? 'Host';
};

const ListingSummaryCard = ({
    listing,
    onEdit,
    onDelete,
    isBusy,
}: {
    listing: Listing;
    onEdit: (listingId: string) => void;
    onDelete: (listingId: string) => void;
    isBusy: boolean;
}) => (
    <article className={styles.propertyCard}>
        <Link to={`/rooms/${listing.id}`} className={styles.propertyImageWrap}>
            <img
                src={listing.images[0] ?? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop'}
                alt={listing.title}
                className={styles.propertyImage}
            />
        </Link>

        <div className={styles.propertyBody}>
            <div className={styles.propertyTopRow}>
                <div>
                    <h3>{listing.title}</h3>
                    <p>{listing.location.city}, {listing.location.country}</p>
                </div>
                <div className={styles.price}>{formatPrice(listing.price, listing.currency)} <span>/ night</span></div>
            </div>

            <div className={styles.metaRow}>
                <span><Star size={14} fill="currentColor" /> {listing.rating}</span>
                <span><Users size={14} /> {listing.guestCountMax ?? 1} guests</span>
                <span><Sparkles size={14} /> {(listing.roomTypes?.length ?? 1)} room types</span>
                <span><BedDouble size={14} /> {listing.bedrooms ?? 1} bedrooms</span>
                <span><Bath size={14} /> {listing.baths ?? 1} baths</span>
            </div>

            {listing.mapLink && (
                <a href={listing.mapLink} target="_blank" rel="noreferrer" className={styles.mapLink}>
                    Open map link
                </a>
            )}

            <p className={styles.description}>{listing.description}</p>

            <div className={styles.tagRow}>
                {listing.amenities.slice(0, 5).map((amenity) => (
                    <span key={amenity} className={styles.tag}>
                        <Sparkles size={12} /> {amenity}
                    </span>
                ))}
            </div>

            <div className={styles.footerRow}>
                <div className={styles.location}>
                    <MapPin size={14} /> {listing.availableDates}
                </div>
                <div className={styles.cardActions}>
                    <Link to={`/host/edit/${listing.id}#availability`} className={styles.actionPill}>
                        <CalendarDays size={14} /> Calendar
                    </Link>
                    <button type="button" className={styles.actionPill} onClick={() => onEdit(listing.id)}>
                        <Pencil size={14} /> Edit
                    </button>
                    <button type="button" className={styles.deletePill} onClick={() => onDelete(listing.id)} disabled={isBusy}>
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            </div>
        </div>
    </article>
);

export const HostDashboard = () => {
    const navigate = useNavigate();
    const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [listings, setListings] = useState<Listing[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busyListingId, setBusyListingId] = useState<string | null>(null);
    const [hostApprovalStatus, setHostApprovalStatus] = useState<HostApprovalStatus | null>(null);

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
            if (role === 'admin') {
                navigate('/host/admin', { replace: true });
                return;
            }

            if (role !== 'host') {
                navigate('/', { replace: true });
                setLoading(false);
                return;
            }

            const approvalStatus = await api.getHostApprovalStatus();
            if (role === 'host' && approvalStatus && approvalStatus !== 'approved') {
                setHostApprovalStatus(approvalStatus);
                setLoading(false);
                return;
            }

            setSessionUser(session.user as SessionUser);
            const data = await api.fetchHostListings(session.user.id);
            setListings(data);
            setLoading(false);
        };

        load();
    }, [navigate]);

    const handleSignOut = async () => {
        await authService.signOut();
        navigate('/host/auth', { replace: true });
    };

    const refreshListings = async () => {
        if (!sessionUser) return;
        const data = await api.fetchHostListings(sessionUser.id);
        setListings(data);
    };

    const handleEdit = (listingId: string) => {
        navigate(`/host/edit/${listingId}`);
    };

    const handleDelete = async (listingId: string) => {
        if (!sessionUser) return;
        if (!window.confirm('Delete this listing? It will be hidden from guests.')) {
            return;
        }

        setBusyListingId(listingId);
        try {
            await api.deleteListing(sessionUser.id, listingId);
            await refreshListings();
        } finally {
            setBusyListingId(null);
        }
    };

    if (loading) {
        return <div className={styles.page}><div className={styles.loading}>Loading your host dashboard...</div></div>;
    }

    if (error) {
        return (
            <div className={styles.page}>
                <div className={styles.emptyState}>
                    <h1>Host mode is not ready yet</h1>
                    <p>{error}</p>
                    <Link to="/" className={styles.primaryButton}>Back to guest mode</Link>
                </div>
            </div>
        );
    }

    if (hostApprovalStatus && hostApprovalStatus !== 'approved') {
        return <HostApprovalStatusView status={hostApprovalStatus} />;
    }

    const userName = getUserDisplayName(sessionUser);

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div>
                    <div className={styles.kicker}>Host dashboard</div>
                    <h1>Welcome back, {userName}</h1>
                    <p>Manage your listings, create new stays, and keep everything in one place.</p>
                </div>

                <div className={styles.actions}>
                    <Link to="/host/new" className={styles.primaryButton}>
                        <Plus size={16} /> Add property
                    </Link>
                    <button type="button" className={styles.secondaryButton} onClick={handleSignOut}>
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </header>

            <section className={styles.stats}>
                <div>
                    <strong>{listings.length}</strong>
                    <span>Published properties</span>
                </div>
                <div>
                    <strong>{listings.reduce((sum, listing) => sum + listing.reviewCount, 0)}</strong>
                    <span>Total reviews</span>
                </div>
                <div>
                    <strong>{listings.filter((listing) => listing.isGuestFavorite).length}</strong>
                    <span>Guest favorites</span>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2>Your properties</h2>
                    <p>{listings.length > 0 ? 'Click any listing to view the public listing page.' : 'You do not have any listings yet.'}</p>
                </div>

                {listings.length > 0 ? (
                    <div className={styles.listingsGrid}>
                        {listings.map((listing) => (
                            <ListingSummaryCard
                                key={listing.id}
                                listing={listing}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                isBusy={busyListingId === listing.id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <Home size={32} />
                        <h3>No properties yet</h3>
                        <p>Add your first property to start managing a host profile.</p>
                        <Link to="/host/new" className={styles.primaryButton}>Add property</Link>
                    </div>
                )}
            </section>
        </div>
    );
};
