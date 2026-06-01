import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Star, Users, Clock3, ShieldCheck, ArrowRight, BedDouble } from 'lucide-react';
import styles from './Trips.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabase';
import type { BookingHistoryItem } from '../types';

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

const formatDateRange = (checkIn: string, checkOut: string) => {
    const formatter = new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' });
    return `${formatter.format(new Date(`${checkIn}T00:00:00Z`))} - ${formatter.format(new Date(`${checkOut}T00:00:00Z`))}`;
};

const getUserDisplayName = (user: SessionUser | null) => {
    const metadata = user?.user_metadata ?? {};
    const fullName = typeof metadata.full_name === 'string' ? metadata.full_name : undefined;
    const name = typeof metadata.name === 'string' ? metadata.name : undefined;
    return fullName ?? name ?? user?.email ?? 'Guest';
};

const getStatusLabel = (status: BookingHistoryItem['status']) => {
    if (status === 'confirmed') {
        return 'Confirmed';
    }

    if (status === 'pending') {
        return 'Pending';
    }

    if (status === 'cancelled') {
        return 'Cancelled';
    }

    return 'Completed';
};

export const Trips = () => {
    const navigate = useNavigate();
    const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!hasSupabaseConfig) {
                setError('Supabase auth is not configured yet.');
                setLoading(false);
                return;
            }

            const session = await authService.getSession();
            if (!session) {
                navigate(`/guest/auth?next=${encodeURIComponent('/trips')}`, { replace: true });
                return;
            }

            setSessionUser(session.user as SessionUser);
            const data = await api.fetchGuestBookings(session.user.id);
            setBookings(data);
            setLoading(false);
        };

        load();
    }, [navigate]);

    if (loading) {
        return <div className={styles.page}><div className={styles.loading}>Loading your trips...</div></div>;
    }

    if (error) {
        return (
            <div className={styles.page}>
                <div className={styles.emptyState}>
                    <h1>Your trips are not ready yet</h1>
                    <p>{error}</p>
                    <Link to="/" className={styles.primaryButton}>Back to browsing</Link>
                </div>
            </div>
        );
    }

    const userName = getUserDisplayName(sessionUser);
    const confirmedCount = bookings.filter((booking) => booking.status === 'confirmed').length;
    const pendingCount = bookings.filter((booking) => booking.status === 'pending').length;
    const totalSpent = bookings.reduce((sum, booking) => sum + booking.total, 0);

    return (
        <main className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroCopy}>
                    <div className={styles.kicker}>Trips</div>
                    <h1>Welcome back, {userName}</h1>
                    <p>See every booking, upcoming stay, and request you have made with Aevr.</p>
                </div>

                <div className={styles.heroStats}>
                    <div>
                        <strong>{bookings.length}</strong>
                        <span>Total bookings</span>
                    </div>
                    <div>
                        <strong>{confirmedCount}</strong>
                        <span>Confirmed stays</span>
                    </div>
                    <div>
                        <strong>{pendingCount}</strong>
                        <span>Pending requests</span>
                    </div>
                    <div>
                        <strong>{formatPrice(totalSpent)}</strong>
                        <span>Total spent</span>
                    </div>
                </div>
            </section>

            {bookings.length === 0 ? (
                <section className={styles.emptyState}>
                    <CalendarDays size={32} />
                    <h2>No trips yet</h2>
                    <p>Once you book a room, your order history will appear here.</p>
                    <Link to="/" className={styles.primaryButton}>
                        Start browsing
                    </Link>
                </section>
            ) : (
                <section className={styles.list}>
                    {bookings.map((booking) => (
                        <article key={booking.id} className={styles.card}>
                            <img
                                src={booking.listing.imageUrl ?? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop'}
                                alt={booking.listing.title}
                                className={styles.image}
                            />

                            <div className={styles.body}>
                                <div className={styles.topRow}>
                                    <div>
                                        <div className={styles.titleRow}>
                                            <h2>{booking.listing.title}</h2>
                                            <span className={booking.status === 'confirmed' ? styles.statusConfirmed : booking.status === 'pending' ? styles.statusPending : styles.statusOther}>
                                                {getStatusLabel(booking.status)}
                                            </span>
                                        </div>
                                        <p>
                                            <MapPin size={14} /> {booking.listing.city}, {booking.listing.country}
                                        </p>
                                    </div>
                                    <Link to={`/rooms/${booking.listingId}`} className={styles.secondaryLink}>
                                        View stay <ArrowRight size={14} />
                                    </Link>
                                </div>

                                <div className={styles.metaGrid}>
                                    <div>
                                        <span>Date</span>
                                        <strong>{formatDateRange(booking.checkIn, booking.checkOut)}</strong>
                                    </div>
                                    <div>
                                        <span>Guests</span>
                                        <strong>{booking.guestCount}</strong>
                                    </div>
                                    <div>
                                        <span>Booking total</span>
                                        <strong>{formatPrice(booking.total, booking.listing.currency)}</strong>
                                    </div>
                                    <div>
                                        <span>Created</span>
                                        <strong>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(booking.createdAt))}</strong>
                                    </div>
                                </div>

                                <div className={styles.summaryRow}>
                                    <span><Star size={14} /> {booking.subtotal > 0 ? formatPrice(booking.subtotal, booking.listing.currency) : 'Booked stay'}</span>
                                    <span><Users size={14} /> {booking.listing.price ? `${formatPrice(booking.listing.price, booking.listing.currency)} / night` : 'Nightly rate unavailable'}</span>
                                    <span><BedDouble size={14} /> {booking.roomCount ?? 1} x {booking.roomTypeName ?? 'Room'}</span>
                                    <span><Clock3 size={14} /> GST {formatPrice(booking.taxes, booking.listing.currency)}</span>
                                    <span><ShieldCheck size={14} /> {booking.status === 'confirmed' ? 'Ready to go' : 'Waiting for review'}</span>
                                </div>
                            </div>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
};
