import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminFlashSales.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabase';
import type { FlashSaleDrop, FlashSaleType, Listing } from '../types';

const toDatetimeLocal = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    return `${y}-${m}-${d}T${hh}:${mm}`;
};

export const AdminFlashSales = () => {
    const navigate = useNavigate();
    const [listings, setListings] = useState<Listing[]>([]);
    const [currentDrop, setCurrentDrop] = useState<FlashSaleDrop | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [listingId, setListingId] = useState('');
    const [saleType, setSaleType] = useState<FlashSaleType>('percent');
    const [saleValue, setSaleValue] = useState('20');
    const [startAt, setStartAt] = useState('');

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
                setError('Only super admins can manage flash sales.');
                setLoading(false);
                return;
            }

            const [allListings, drop] = await Promise.all([
                api.fetchListings({ sort: 'recommended' }),
                api.fetchAdminDropState(),
            ]);

            setListings(allListings);
            setCurrentDrop(drop);
            if (drop) {
                setListingId(drop.listingId);
                setSaleType(drop.saleType);
                setSaleValue(String(drop.saleValue));
                setStartAt(toDatetimeLocal(drop.startAt));
            } else {
                const firstListing = allListings[0];
                if (firstListing) setListingId(firstListing.id);
                const defaultStart = new Date(Date.now() + (15 * 60 * 1000));
                setStartAt(toDatetimeLocal(defaultStart.toISOString()));
            }
            setLoading(false);
        };

        load();
    }, [navigate]);

    const computedEndAt = useMemo(() => {
        const start = new Date(startAt);
        if (Number.isNaN(start.getTime())) return null;
        return new Date(start.getTime() + (72 * 60 * 60 * 1000));
    }, [startAt]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!listingId) {
            setError('Please select a property.');
            return;
        }

        const start = new Date(startAt);
        if (Number.isNaN(start.getTime())) {
            setError('Please provide a valid start date/time.');
            return;
        }
        if (start.getTime() < Date.now()) {
            setError('Start date cannot be in the past.');
            return;
        }

        const numericSaleValue = Number(saleValue);
        if (!Number.isFinite(numericSaleValue) || numericSaleValue <= 0) {
            setError('Sale value must be greater than 0.');
            return;
        }

        setSaving(true);
        try {
            const drop = await api.upsertScheduledDrop({
                listingId,
                saleType,
                saleValue: numericSaleValue,
                startAt: start.toISOString(),
            });
            setCurrentDrop(drop);
            setStartAt(toDatetimeLocal(drop.startAt));
            setSaleValue(String(drop.saleValue));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save flash sale drop.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async () => {
        if (!currentDrop) return;
        setSaving(true);
        setError(null);
        try {
            await api.deactivateDrop(currentDrop.id);
            setCurrentDrop(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to deactivate flash sale.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className={styles.page}><div className={styles.panel}>Loading flash sales...</div></div>;
    if (error && !listings.length) return <div className={styles.page}><div className={styles.panel}>{error}</div></div>;

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <h1>Flash Sale Control</h1>
                <p>Schedule one active property drop at a time for 72 hours.</p>

                {currentDrop && (
                    <div className={styles.currentDrop}>
                        <strong>Current drop:</strong> {currentDrop.listing.title} | {new Date(currentDrop.startAt).toLocaleString()} to {new Date(currentDrop.endAt).toLocaleString()}
                    </div>
                )}

                <form onSubmit={handleSave} className={styles.form}>
                    <label>
                        Property
                        <select value={listingId} onChange={(e) => setListingId(e.target.value)}>
                            <option value="">Select property</option>
                            {listings.map((listing) => (
                                <option key={listing.id} value={listing.id}>{listing.title} - {listing.location.city}</option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Sale type
                        <select value={saleType} onChange={(e) => setSaleType(e.target.value as FlashSaleType)}>
                            <option value="percent">Percent off</option>
                            <option value="manual_price">Manual price</option>
                        </select>
                    </label>

                    <label>
                        {saleType === 'percent' ? 'Discount %' : 'Manual sale price (INR)'}
                        <input value={saleValue} onChange={(e) => setSaleValue(e.target.value)} type="number" min="1" step="0.01" />
                    </label>

                    <label>
                        Start at
                        <input value={startAt} onChange={(e) => setStartAt(e.target.value)} type="datetime-local" />
                    </label>

                    <div className={styles.endInfo}>
                        End at (+72h): {computedEndAt ? computedEndAt.toLocaleString() : 'Invalid start date'}
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
                        <button type="submit" disabled={saving}>Save & Activate</button>
                        {currentDrop && (
                            <button type="button" className={styles.danger} onClick={handleDeactivate} disabled={saving}>
                                Deactivate
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
