import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Home, Plus, LogOut, Star, MapPin, BedDouble, Bath, Users,
    Pencil, Trash2, CalendarDays, TrendingUp, Heart, ChevronRight,
    ExternalLink
} from 'lucide-react';
import styles from './HostDashboard.module.css';
import { authService } from '../services/auth';
import { api } from '../services/api';
import { hasSupabaseConfig } from '../services/supabase';
import { HostApprovalStatusView } from '../components/HostApprovalStatus';
import { SkeletonScreen } from '../components/SkeletonScreen';
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



/* ─── Property Card (horizontal) ────────────────────────────────────── */
const ListingSummaryCard = ({
    listing,
    onEdit,
    onDelete,
    isBusy,
}: {
    listing: Listing;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    isBusy: boolean;
}) => (
    <article className={styles.propertyCard}>
        {/* Image */}
        <Link to={`/rooms/${listing.id}`} className={styles.propertyImageWrap}>
            <img
                src={listing.images[0] ?? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=800&auto=format&fit=crop'}
                alt={listing.title}
                className={styles.propertyImage}
            />
            <span className={styles.liveChip}>
                <span className={styles.liveDot} /> Live
            </span>
        </Link>

        {/* Content */}
        <div className={styles.propertyBody}>
            <div className={styles.propertyTop}>
                <div className={styles.propertyMeta}>
                    <div className={styles.locationChip}>
                        <MapPin size={12} />
                        {listing.location.city}, {listing.location.country}
                    </div>
                    <h3 className={styles.propertyTitle}>{listing.title}</h3>
                    <p className={styles.propertyDescription}>{listing.description}</p>
                </div>
                <div className={styles.propertyPriceBlock}>
                    <span className={styles.propertyPrice}>{formatPrice(listing.price, listing.currency)}</span>
                    <span className={styles.propertyPriceLabel}>/ night</span>
                </div>
            </div>

            {/* Stats strip */}
            <div className={styles.statsStrip}>
                <span className={styles.statChip}>
                    <Star size={13} fill="currentColor" style={{ color: '#f5a623' }} />
                    {listing.rating}
                </span>
                <span className={styles.statChip}>
                    <Users size={13} />
                    {listing.guestCountMax ?? 1} guests
                </span>
                <span className={styles.statChip}>
                    <BedDouble size={13} />
                    {listing.bedrooms ?? 1} bed
                </span>
                <span className={styles.statChip}>
                    <Bath size={13} />
                    {listing.baths ?? 1} bath
                </span>
            </div>

            {/* Amenity pills */}
            {listing.amenities.length > 0 && (
                <div className={styles.amenityRow}>
                    {listing.amenities.slice(0, 4).map((a) => (
                        <span key={a} className={styles.amenityPill}>{a}</span>
                    ))}
                    {listing.amenities.length > 4 && (
                        <span className={styles.amenityPillMore}>+{listing.amenities.length - 4}</span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className={styles.cardFooter}>
                {listing.mapLink && (
                    <a href={listing.mapLink} target="_blank" rel="noreferrer" className={styles.mapLinkBtn}>
                        <ExternalLink size={13} /> Map
                    </a>
                )}
                <div className={styles.cardActions}>
                    <Link to={`/rooms/${listing.id}`} className={styles.actionBtn}>
                        View <ChevronRight size={14} />
                    </Link>
                    <Link to={`/host/edit/${listing.id}#availability`} className={styles.actionBtn}>
                        <CalendarDays size={14} /> Calendar
                    </Link>
                    <button type="button" className={styles.actionBtn} onClick={() => onEdit(listing.id)}>
                        <Pencil size={14} /> Edit
                    </button>
                    <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => onDelete(listing.id)}
                        disabled={isBusy}
                    >
                        <Trash2 size={14} /> {isBusy ? '…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    </article>
);

/* ─── Stat Card ──────────────────────────────────────────────────────── */
const StatCard = ({
    value,
    label,
    icon,
}: {
    value: string | number;
    label: string;
    icon: React.ReactNode;
}) => (
    <div className={styles.statCard}>
        <div className={styles.statIcon}>{icon}</div>
        <div className={styles.statBody}>
            <span className={styles.statLabel}>{label}</span>
            <span className={styles.statValue}>{value}</span>
        </div>
    </div>
);

/* ─── Empty State ────────────────────────────────────────────────────── */
const EmptyState = () => (
    <div className={styles.emptyState}>
        <div className={styles.emptyIllustration}>
            {/* Airbnb-style minimalist vector illustration */}
            <svg width="200" height="160" viewBox="0 0 200 160" fill="none">
                {/* Abstract warm organic backdrop shapes */}
                <path d="M40 90 Q30 45 70 50 Q110 55 120 95 Q130 135 80 130 Q30 125 40 90 Z" fill="#FFF3F3" opacity="0.8" />
                <circle cx="135" cy="65" r="28" fill="#E8F9F9" opacity="0.9" />
                
                {/* House Base Shadow */}
                <ellipse cx="100" cy="120" rx="55" ry="5" fill="#e2e8f0" />

                {/* Chimney */}
                <rect x="115" y="55" width="10" height="20" rx="1" fill="#FFFFFF" stroke="#222222" strokeWidth="2" strokeLinejoin="round" />
                <path d="M115 55 L125 55" stroke="#222222" strokeWidth="2" />

                {/* House main body */}
                <rect x="70" y="72" width="60" height="46" rx="6" fill="#FFFFFF" stroke="#222222" strokeWidth="2" strokeLinejoin="round" />
                
                {/* Door */}
                <path d="M92 118 V96 C92 93 94 91 97 91 H103 C106 91 108 93 108 96 V118" fill="#F7F7F7" stroke="#222222" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="104" cy="107" r="1.5" fill="#222222" />

                {/* Windows */}
                <rect x="80" y="82" width="10" height="10" rx="2" fill="#FFFFFF" stroke="#222222" strokeWidth="2" />
                <line x1="85" y1="82" x2="85" y2="92" stroke="#222222" strokeWidth="1.5" />
                <line x1="80" y1="87" x2="90" y2="87" stroke="#222222" strokeWidth="1.5" />

                {/* Roof */}
                <path d="M62 76 L100 42 L138 76" stroke="#222222" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M66 72 L100 42 L134 72" fill="#FFFFFF" />

                {/* Little organic details: floating leaves */}
                <path d="M142 90 Q152 80 147 68" stroke="#008489" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <path d="M147 68 Q151 76 145 84 Z" fill="#008489" opacity="0.2" />

                <path d="M45 105 Q35 100 40 87" stroke="#FF5A5F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <path d="M40 87 Q44 95 38 103 Z" fill="#FF5A5F" opacity="0.2" />
            </svg>
        </div>
        <h3>Create your first listing</h3>
        <p>Add details, photos, and pricing of your space to welcome your first guests.</p>
        <Link to="/host/new" className={styles.emptyActionBtn}>
            <Plus size={16} /> Get started
        </Link>
    </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   HostDashboard
════════════════════════════════════════════════════════════════════════ */
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
            if (!session) { navigate('/host/auth', { replace: true }); return; }
            const role = await api.getCurrentUserRole();
            if (role === 'admin') { navigate('/host/admin', { replace: true }); return; }
            if (role !== 'host') { navigate('/', { replace: true }); setLoading(false); return; }
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

    const handleEdit = (listingId: string) => navigate(`/host/edit/${listingId}`);

    const handleDelete = async (listingId: string) => {
        if (!sessionUser) return;
        if (!window.confirm('Delete this listing? It will be hidden from guests.')) return;
        setBusyListingId(listingId);
        try {
            await api.deleteListing(sessionUser.id, listingId);
            await refreshListings();
        } finally {
            setBusyListingId(null);
        }
    };

    if (loading) return <div className={styles.page}><SkeletonScreen variant="host-dashboard" /></div>;

    if (error) return (
        <div className={styles.page}>
            <div className={styles.errorState}>
                <h2>Host mode not ready</h2>
                <p>{error}</p>
                <Link to="/" className={styles.primaryButton}>Back to guest mode</Link>
            </div>
        </div>
    );

    if (hostApprovalStatus && hostApprovalStatus !== 'approved') {
        return <HostApprovalStatusView status={hostApprovalStatus} />;
    }

    const userName = getUserDisplayName(sessionUser);
    const totalReviews = listings.reduce((sum, l) => sum + l.reviewCount, 0);
    const favorites = listings.filter((l) => l.isGuestFavorite).length;
    const avgRating = listings.length > 0
        ? (listings.reduce((sum, l) => sum + (l.rating ?? 0), 0) / listings.length).toFixed(1)
        : '—';

    return (
        <div className={styles.page}>
            {/* ── Hero Header ── */}
            <header className={styles.hero}>
                <div className={styles.heroLeft}>
                    <div>
                        <h1 className={styles.heroTitle}>Welcome, {userName.split(' ')[0]}</h1>
                        <p className={styles.heroSub}>Manage your listings and keep everything in one place.</p>
                    </div>
                </div>
                <div className={styles.heroActions}>
                    <Link to="/host/new" className={styles.primaryButton}>
                        <Plus size={16} /> Add property
                    </Link>
                    <button type="button" className={styles.secondaryButton} onClick={handleSignOut}>
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </header>

            {/* ── Stat Cards ── */}
            <div className={styles.statsGrid}>
                <StatCard
                    value={listings.length}
                    label="Published properties"
                    icon={<Home size={18} strokeWidth={1.2} />}
                />
                <StatCard
                    value={totalReviews}
                    label="Total reviews"
                    icon={<Star size={18} strokeWidth={1.2} />}
                />
                <StatCard
                    value={favorites}
                    label="Guest favorites"
                    icon={<Heart size={18} strokeWidth={1.2} />}
                />
                <StatCard
                    value={avgRating}
                    label="Avg. rating"
                    icon={<TrendingUp size={18} strokeWidth={1.2} />}
                />
            </div>

            {/* ── Listings ── */}
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div>
                        <h2>Your properties</h2>
                        <p>{listings.length > 0 ? 'Click any card to view the public listing.' : 'No listings yet.'}</p>
                    </div>
                    {listings.length > 0 && (
                        <Link to="/host/new" className={styles.secondaryButton}>
                            <Plus size={14} /> New property
                        </Link>
                    )}
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
                    <EmptyState />
                )}
            </section>
        </div>
    );
};
