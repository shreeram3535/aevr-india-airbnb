import { useEffect, useState } from 'react';
import { Lock, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './AdminFlashSales.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabase';
import { SkeletonScreen } from '../components/SkeletonScreen';
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

const formatTo12Hour = (isoOrDate: string | Date | null | undefined) => {
    if (!isoOrDate) return '';
    const date = new Date(isoOrDate);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = pad(date.getDate());
    const m = pad(date.getMonth() + 1);
    const y = date.getFullYear();
    let hours = date.getHours();
    const minutes = pad(date.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${d}-${m}-${y} ${pad(hours)}:${minutes} ${ampm}`;
};

const parseDatetimeParts = (val: string) => {
    if (!val) {
        return { date: '', hour: '12', minute: '00', ampm: 'AM' };
    }
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) {
        return { date: '', hour: '12', minute: '00', ampm: 'AM' };
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    let hours = d.getHours();
    const minutes = pad(d.getMinutes());
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return {
        date: datePart,
        hour: String(hours),
        minute: minutes,
        ampm: ampm
    };
};

const buildDatetimeFromParts = (date: string, hour: string, minute: string, ampm: string) => {
    if (!date) return '';
    let hours = Number(hour);
    if (ampm === 'PM' && hours < 12) {
        hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
        hours = 0;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date}T${pad(hours)}:${pad(Number(minute))}`;
};

interface CustomDateTimePickerProps {
    value: string;
    onChange: (newValue: string) => void;
}

const CustomDateTimePicker = ({ value, onChange }: CustomDateTimePickerProps) => {
    const { date, hour, minute, ampm } = parseDatetimeParts(value);

    const update = (newDate: string, newHour: string, newMinute: string, newAmpm: string) => {
        onChange(buildDatetimeFromParts(newDate, newHour, newMinute, newAmpm));
    };

    return (
        <div className={styles.datetimePickerGroup}>
            <input 
                type="date" 
                value={date} 
                onChange={(e) => update(e.target.value, hour, minute, ampm)} 
            />
            <select 
                value={hour} 
                onChange={(e) => update(date, e.target.value, minute, ampm)}
            >
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                    <option key={h} value={h}>{h}</option>
                ))}
            </select>
            <span className={styles.separator}>:</span>
            <select 
                value={minute} 
                onChange={(e) => update(date, hour, e.target.value, ampm)}
            >
                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
            <select 
                value={ampm} 
                onChange={(e) => update(date, hour, minute, e.target.value)}
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    );
};

export const AdminFlashSales = () => {
    const navigate = useNavigate();
    const [listings, setListings] = useState<Listing[]>([]);
    const [currentDrop, setCurrentDrop] = useState<FlashSaleDrop | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [listingId, setListingId] = useState('');
    const [internalName, setInternalName] = useState('');
    const [saleType, setSaleType] = useState<FlashSaleType>('percent');
    const [saleValue, setSaleValue] = useState('20');
    const [startAt, setStartAt] = useState('');
    const [endAt, setEndAt] = useState('');
    const [savingInternalName, setSavingInternalName] = useState(false);
    const [internalNameSaved, setInternalNameSaved] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);



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
                setEndAt(toDatetimeLocal(drop.endAt));
            } else {
                const firstListing = allListings[0];
                if (firstListing) setListingId(firstListing.id);
                const defaultStart = new Date(Date.now() + (15 * 60 * 1000));
                setStartAt(toDatetimeLocal(defaultStart.toISOString()));
                const defaultEnd = new Date(defaultStart.getTime() + (72 * 60 * 60 * 1000));
                setEndAt(toDatetimeLocal(defaultEnd.toISOString()));
            }
            setLoading(false);
        };

        load();
    }, [navigate]);

    useEffect(() => {
        const handleClose = () => setDropdownOpen(false);
        document.addEventListener('click', handleClose);
        return () => document.removeEventListener('click', handleClose);
    }, []);

    const toggleDropdown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDropdownOpen((prev) => !prev);
    };

    useEffect(() => {
        const selectedListing = listings.find((l) => l.id === listingId);
        setInternalName(selectedListing?.internalName ?? '');
        setInternalNameSaved(false);
    }, [listingId, listings]);

    const handleSaveInternalName = async () => {
        if (!listingId) return;
        setSavingInternalName(true);
        setInternalNameSaved(false);
        setError(null);
        try {
            await api.updateListingInternalName(listingId, internalName);
            setListings((prev) =>
                prev.map((l) => (l.id === listingId ? { ...l, internalName } : l))
            );
            setInternalNameSaved(true);
            setTimeout(() => setInternalNameSaved(false), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save internal name.');
        } finally {
            setSavingInternalName(false);
        }
    };
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

        const end = new Date(endAt);
        if (Number.isNaN(end.getTime())) {
            setError('Please provide a valid end date/time.');
            return;
        }
        if (end.getTime() <= start.getTime() + (60 * 60 * 1000)) {
            setError('End date must be at least 1 hour after the start date.');
            return;
        }

        const numericSaleValue = Number(saleValue);
        if (!Number.isFinite(numericSaleValue) || numericSaleValue <= 0) {
            setError('Sale value must be greater than 0.');
            return;
        }

        setSaving(true);
        try {
            await api.updateListingInternalName(listingId, internalName);
            setListings((prev) =>
                prev.map((l) => (l.id === listingId ? { ...l, internalName } : l))
            );

            const drop = await api.upsertScheduledDrop({
                listingId,
                saleType,
                saleValue: numericSaleValue,
                startAt: start.toISOString(),
                endAt: end.toISOString(),
            });
            setCurrentDrop(drop);
            setStartAt(toDatetimeLocal(drop.startAt));
            setEndAt(toDatetimeLocal(drop.endAt));
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

    if (loading) return <div className={styles.page}><SkeletonScreen variant="admin-form" /></div>;
    if (error && !listings.length) return <div className={styles.page}><div className={styles.panel}>{error}</div></div>;

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <h1>Flash Sale Control</h1>
                <p>Schedule one active property drop at a time.</p>

                {currentDrop && (
                    <div className={styles.currentDrop}>
                        <strong>Current drop:</strong> {currentDrop.listing.title} | {formatTo12Hour(currentDrop.startAt)} to {formatTo12Hour(currentDrop.endAt)}
                    </div>
                )}

                <form onSubmit={handleSave} className={styles.form}>
                    <label>
                        Property
                        <div className={styles.customDropdown}>
                            <button
                                type="button"
                                className={styles.dropdownTrigger}
                                onClick={toggleDropdown}
                            >
                                <span>
                                    {listingId
                                        ? (listings.find((l) => l.id === listingId)?.title ?? '') + ' - ' + (listings.find((l) => l.id === listingId)?.location.city ?? '')
                                        : 'Select property'}
                                </span>
                                <ChevronDown size={16} />
                            </button>

                            {dropdownOpen && (
                                <div className={styles.dropdownMenu} onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        className={`${styles.dropdownOption} ${!listingId ? styles.dropdownOptionActive : ''}`}
                                        onClick={() => {
                                            setListingId('');
                                            setDropdownOpen(false);
                                        }}
                                    >
                                        <span className={styles.optionMainText}>Select property</span>
                                    </button>
                                    {listings.map((listing) => {
                                        const isActive = listingId === listing.id;
                                        return (
                                            <button
                                                key={listing.id}
                                                type="button"
                                                className={`${styles.dropdownOption} ${isActive ? styles.dropdownOptionActive : ''}`}
                                                onClick={() => {
                                                    setListingId(listing.id);
                                                    setDropdownOpen(false);
                                                }}
                                            >
                                                <span className={styles.optionMainText}>
                                                    {listing.title} - {listing.location.city}
                                                </span>
                                                <span className={styles.optionSubText}>
                                                    {listing.internalName
                                                        ? `Internal: ${listing.internalName}`
                                                        : 'Internal: not set'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </label>

                    {listingId && (
                        <div className={styles.internalNameCard}>
                            <div className={styles.internalNameHeader}>
                                <div className={styles.internalNameLabelGroup}>
                                    <Lock size={16} />
                                    <span>Internal Name (Admin only)</span>
                                </div>
                                {internalNameSaved && (
                                    <span className={styles.savedFeedback}>
                                        Saved ✓
                                    </span>
                                )}
                            </div>
                            <div className={styles.internalNameRow}>
                                <input
                                    type="text"
                                    value={internalName}
                                    onChange={(e) => setInternalName(e.target.value)}
                                    placeholder="e.g. Premium Lakefront Villa"
                                    className={styles.internalNameInput}
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveInternalName}
                                    disabled={savingInternalName}
                                    className={styles.internalNameSaveBtn}
                                >
                                    {savingInternalName ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    )}

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
                        <CustomDateTimePicker value={startAt} onChange={setStartAt} />
                    </label>

                    <label>
                        End at
                        <CustomDateTimePicker value={endAt} onChange={setEndAt} />
                        <span className={styles.endInfo}>Min 1 hour after start</span>
                    </label>

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
