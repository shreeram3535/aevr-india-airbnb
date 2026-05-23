import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Star,
    Heart,
    Share,
    Grid,
    Key,
    Calendar,
    MapPin,
    Wifi,
    Car,
    Utensils,
    Bath,
    BedDouble,
    Users,
    Sparkles,
    Snowflake,
    Dumbbell,
    Coffee,
    ConciergeBell,
    Waves,
    Umbrella,
    Trees,
    ShieldCheck,
    Compass,
    Camera,
    X,
} from 'lucide-react';
import styles from './ListingDetails.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { favoritesService } from '../services/favorites';
import type { AvailabilityBlock, Listing, RoomType } from '../types';

const amenityIcons: Record<string, ElementType> = {
    wifi: Wifi,
    pool: Waves,
    kitchen: Utensils,
    ac: Snowflake,
    heater: Sparkles,
    gym: Dumbbell,
    elevator: Sparkles,
    'private beach': Umbrella,
    breakfast: Coffee,
    butler: ConciergeBell,
    'nature trails': Trees,
    'organic food': Sparkles,
    'estate walk': Trees,
    'lake view': Sparkles,
    'cycle rental': Car,
    cafe: Coffee,
};

const getAmenityIcon = (label: string): ElementType => {
    const key = label.trim().toLowerCase();
    return amenityIcons[key] ?? MapPin;
};

type LocalExperience = {
    title: string;
    description: string;
    meta: string;
    Icon: ElementType;
};

const getLocalExperiences = (listing: Listing): LocalExperience[] => {
    const city = listing.location.city || 'the area';
    const category = listing.category.toLowerCase();
    const amenities = listing.amenities.map((amenity) => amenity.toLowerCase());
    const experiences: LocalExperience[] = [];

    if (category.includes('pool') || amenities.includes('pool')) {
        experiences.push({
            title: 'Poolside wind-down',
            description: `Spend an easy afternoon around ${city}'s resort-style pools, cabanas, and sunset decks.`,
            meta: 'Local favorite',
            Icon: Waves,
        });
    }

    if (category.includes('beach') || amenities.includes('private beach')) {
        experiences.push({
            title: 'Beachfront trail',
            description: `Explore shore walks, seafood stops, and quiet beach corners close to your stay in ${city}.`,
            meta: 'Nearby',
            Icon: Umbrella,
        });
    }

    if (category.includes('farm') || amenities.includes('organic food') || amenities.includes('nature trails')) {
        experiences.push({
            title: 'Farm-to-table visit',
            description: `Meet local growers, taste seasonal produce, and slow down with countryside experiences near ${city}.`,
            meta: 'Host-style pick',
            Icon: Trees,
        });
    }

    if (category.includes('cabin') || category.includes('view') || amenities.includes('lake view')) {
        experiences.push({
            title: 'Scenic lookout loop',
            description: `Find viewpoints, lake edges, and photo stops that make the most of ${city}'s landscape.`,
            meta: 'Photo spot',
            Icon: Camera,
        });
    }

    if (category.includes('luxe')) {
        experiences.push({
            title: 'Private dining night',
            description: `Book a chef-led dinner, tasting menu, or refined local table for a special evening in ${city}.`,
            meta: 'Premium pick',
            Icon: ConciergeBell,
        });
    }

    experiences.push(
        {
            title: `${city} essentials walk`,
            description: 'Get oriented with nearby cafes, markets, local lanes, and easy first-day stops.',
            meta: 'Nearby',
            Icon: Compass,
        },
        {
            title: 'Local cafe stop',
            description: `Start the morning with neighborhood coffee, breakfast, and a relaxed route through ${city}.`,
            meta: 'Easy morning',
            Icon: Coffee,
        },
        {
            title: 'Cultural highlights',
            description: 'Ask your host about galleries, temples, old-town routes, seasonal events, and hidden local favorites.',
            meta: 'Local insight',
            Icon: Sparkles,
        }
    );

    return experiences.slice(0, 4);
};

const formatPrice = (amount: number, currency?: string) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency ?? 'INR',
        maximumFractionDigits: 0,
    }).format(amount);

const dateToInput = (date: Date) => date.toISOString().slice(0, 10);

const parseInputDate = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const addDays = (value: string, days: number) => {
    const date = parseInputDate(value);
    date.setUTCDate(date.getUTCDate() + days);
    return dateToInput(date);
};

const nightsBetween = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const start = parseInputDate(checkIn).getTime();
    const end = parseInputDate(checkOut).getTime();
    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
};

const rangesOverlap = (startA: string, endA: string, startB: string, endB: string) => {
    const start1 = parseInputDate(startA).getTime();
    const end1 = parseInputDate(endA).getTime();
    const start2 = parseInputDate(startB).getTime();
    const end2 = parseInputDate(endB).getTime();
    return start1 < end2 && start2 < end1;
};

const formatDateRange = (startDate: string, endDate: string) => {
    const formatter = new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' });
    const start = formatter.format(new Date(`${startDate}T00:00:00Z`));
    const end = formatter.format(new Date(`${endDate}T00:00:00Z`));
    return `${start} - ${end}`;
};

const getHotelGstRate = (nightlyRate: number) => {
    if (nightlyRate <= 1000) {
        return 0;
    }

    if (nightlyRate <= 7500) {
        return 0.05;
    }

    return 0.18;
};

const fallbackRoomTypes = (listing?: Listing): RoomType[] => {
    if (!listing) {
        return [];
    }

    if (listing.roomTypes && listing.roomTypes.length > 0) {
        return listing.roomTypes;
    }

    return [
        {
            id: 'default-room',
            name: 'Standard stay',
            pricePerNight: listing.price,
            totalCount: 1,
            maxGuests: listing.guestCountMax ?? undefined,
            beds: listing.beds ?? undefined,
            description: 'The default room option for this property.',
        },
    ];
};

const PENDING_BOOKING_KEY = 'aevr.pending-booking';

type PendingBooking = {
    listingId: string;
    checkIn: string;
    checkOut: string;
    guestCount: number;
    roomTypeName: string;
    roomTypePrice: number;
    roomCount: number;
    mode: 'reserve' | 'request';
};

const readPendingBooking = (): PendingBooking | null => {
    try {
        const stored = sessionStorage.getItem(PENDING_BOOKING_KEY);
        if (!stored) {
            return null;
        }

        const parsed = JSON.parse(stored) as Partial<PendingBooking>;
        if (!parsed?.listingId || !parsed?.checkIn || !parsed?.checkOut || !parsed?.guestCount || !parsed?.mode) {
            return null;
        }

        return {
            listingId: parsed.listingId,
            checkIn: parsed.checkIn,
            checkOut: parsed.checkOut,
            guestCount: parsed.guestCount,
            roomTypeName: typeof parsed.roomTypeName === 'string' && parsed.roomTypeName.trim() ? parsed.roomTypeName : 'Standard stay',
            roomTypePrice: Number.isFinite(Number(parsed.roomTypePrice)) && Number(parsed.roomTypePrice) > 0 ? Number(parsed.roomTypePrice) : 0,
            roomCount: Number.isFinite(Number(parsed.roomCount)) && Number(parsed.roomCount) > 0 ? Number(parsed.roomCount) : 1,
            mode: parsed.mode,
        };
    } catch {
        return null;
    }
};

const savePendingBooking = (booking: PendingBooking) => {
    sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(booking));
};

const clearPendingBooking = () => {
    sessionStorage.removeItem(PENDING_BOOKING_KEY);
};

export const ListingDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [listing, setListing] = useState<Listing | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [isFavorited, setIsFavorited] = useState(false);
    const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
    const [bookingStatus, setBookingStatus] = useState<'reserved' | 'requested' | null>(null);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [bookingMode, setBookingMode] = useState<'reserve' | 'request'>('reserve');
    const [submittingBooking, setSubmittingBooking] = useState(false);
    const [isVerifiedGuest, setIsVerifiedGuest] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<'guest' | 'host' | 'admin' | null>(null);
    const [copied, setCopied] = useState(false);
    const [showPhotosModal, setShowPhotosModal] = useState(false);
    const autoSubmitHandled = useRef(false);

    const [checkIn, setCheckIn] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return dateToInput(tomorrow);
    });
    const [checkOut, setCheckOut] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(tomorrow);
        nextWeek.setDate(nextWeek.getDate() + 4);
        return dateToInput(nextWeek);
    });
    const [guestCount, setGuestCount] = useState(1);
    const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
    const [roomCount, setRoomCount] = useState(1);

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            setLoading(true);
            const [data, blocks, currentUser] = await Promise.all([
                api.fetchListingById(id),
                api.fetchAvailabilityBlocks(id),
                api.getCurrentUserSummary(),
            ]);
            setListing(data);
            setAvailabilityBlocks(blocks);
            setCurrentUserRole(currentUser?.role ?? null);
            setIsVerifiedGuest(currentUser?.role === 'guest' && currentUser.isVerifiedGuest);
            setIsFavorited(favoritesService.isFavorite(id));
            setLoading(false);
        };

        load();
    }, [id]);

    const roomTypes = useMemo(() => fallbackRoomTypes(listing), [listing]);
    const selectedRoomType = useMemo(
        () => roomTypes.find((roomType) => roomType.id === selectedRoomTypeId) ?? roomTypes[0] ?? null,
        [roomTypes, selectedRoomTypeId]
    );

    useEffect(() => {
        if (roomTypes.length === 0) {
            return;
        }

        setSelectedRoomTypeId((current) => {
            if (roomTypes.some((roomType) => roomType.id === current)) {
                return current;
            }

            return roomTypes[0].id;
        });
    }, [roomTypes]);

    useEffect(() => {
        if (!selectedRoomType) {
            return;
        }

        setRoomCount((current) => Math.min(Math.max(current, 1), selectedRoomType.totalCount));
    }, [selectedRoomType]);

    useEffect(() => {
        if (checkOut <= checkIn) {
            setCheckOut(addDays(checkIn, 1));
        }
    }, [checkIn, checkOut]);

    const guestLimit = selectedRoomType?.maxGuests
        ? Math.max(selectedRoomType.maxGuests * roomCount, 1)
        : listing?.guestCountMax ?? 10;

    useEffect(() => {
        setGuestCount((current) => Math.min(current, guestLimit));
    }, [guestLimit]);

    useEffect(() => {
        if (showPhotosModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showPhotosModal]);

    const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
    const nightlyRate = selectedRoomType?.pricePerNight ?? listing?.price ?? 0;
    const subtotal = listing ? nightlyRate * nights * roomCount : 0;
    const gstRate = listing ? getHotelGstRate(nightlyRate) : 0;
    const taxes = listing ? Math.round(subtotal * gstRate) : 0;
    const total = subtotal + taxes;
    const coverImage =
        selectedRoomType?.photos?.[0]
        ?? listing?.images[0]
        ?? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop';
    const localExperiences = useMemo(() => listing ? getLocalExperiences(listing) : [], [listing]);

    const toggleFavorite = () => {
        if (!listing) return;
        favoritesService.toggleFavorite(listing.id);
        setIsFavorited(!isFavorited);
    };

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const submitBooking = useCallback(
        async (mode: 'reserve' | 'request', guestId: string, bookingOverride?: PendingBooking) => {
            if (!listing || !id) return;

            const bookingCheckIn = bookingOverride?.checkIn ?? checkIn;
            const bookingCheckOut = bookingOverride?.checkOut ?? checkOut;
            const bookingGuestCount = bookingOverride?.guestCount ?? guestCount;
            const bookingRoomTypeName = bookingOverride?.roomTypeName ?? selectedRoomType?.name ?? 'Standard stay';
            const bookingRoomTypePrice =
                bookingOverride?.roomTypePrice && bookingOverride.roomTypePrice > 0
                    ? bookingOverride.roomTypePrice
                    : selectedRoomType?.pricePerNight ?? listing.price;
            const bookingRoomCount =
                bookingOverride?.roomCount && bookingOverride.roomCount > 0
                    ? bookingOverride.roomCount
                    : roomCount;
            const bookingNights = nightsBetween(bookingCheckIn, bookingCheckOut);

            if (bookingNights <= 0) {
                setBookingError('Please choose a valid check-in and checkout date.');
                return;
            }

            const blockedRange = availabilityBlocks.find((block) => rangesOverlap(bookingCheckIn, bookingCheckOut, block.startDate, block.endDate));
            if (blockedRange) {
                setBookingError(
                    blockedRange.status === 'restricted'
                        ? 'Those dates are restricted by the host. Please choose another range.'
                        : 'Those dates are already booked. Please choose another range.'
                );
                return;
            }

            if (bookingGuestCount < 1 || bookingGuestCount > guestLimit) {
                setBookingError(`Please choose between 1 and ${guestLimit} guests.`);
                return;
            }

            if (!selectedRoomType || bookingRoomCount < 1 || bookingRoomCount > selectedRoomType.totalCount) {
                setBookingError('Please choose a valid room type and count.');
                return;
            }

            const bookingSubtotal = bookingRoomTypePrice * bookingRoomCount * bookingNights;
            const bookingGstRate = getHotelGstRate(bookingRoomTypePrice);
            const bookingTaxes = Math.round(bookingSubtotal * bookingGstRate);
            const bookingTotal = bookingSubtotal + bookingTaxes;

            setSubmittingBooking(true);

            try {
                const booking = await api.createBooking(guestId, {
                    listingId: id,
                    checkIn: bookingCheckIn,
                    checkOut: bookingCheckOut,
                    guestCount: bookingGuestCount,
                    roomTypeName: bookingRoomTypeName,
                    roomTypePrice: bookingRoomTypePrice,
                    roomCount: bookingRoomCount,
                    subtotal: bookingSubtotal,
                    fees: 0,
                    taxes: bookingTaxes,
                    total: bookingTotal,
                    status: mode === 'reserve' ? 'confirmed' : 'pending',
                });

                clearPendingBooking();
                setBookingError(null);
                setBookingStatus(mode === 'reserve' ? 'reserved' : 'requested');
                setCheckIn(booking.checkIn);
                setCheckOut(booking.checkOut);
                setGuestCount(booking.guestCount);
            } catch (error) {
                setBookingError(error instanceof Error ? error.message : 'Unable to place booking');
            } finally {
                setSubmittingBooking(false);
            }
        },
        [availabilityBlocks, checkIn, checkOut, guestCount, guestLimit, id, listing, roomCount, selectedRoomType]
    );

    useEffect(() => {
        if (!listing || !id || autoSubmitHandled.current) {
            return;
        }

        const pendingBooking = readPendingBooking();
        if (!pendingBooking || pendingBooking.listingId !== id) {
            return;
        }

        const continuePendingBooking = async () => {
            const session = await authService.getSession();
            if (!session) {
                return;
            }

            autoSubmitHandled.current = true;
            setCheckIn(pendingBooking.checkIn);
            setCheckOut(pendingBooking.checkOut);
            setGuestCount(pendingBooking.guestCount);
            setRoomCount(pendingBooking.roomCount);
            const pendingRoomType = roomTypes.find((roomType) => roomType.name === pendingBooking.roomTypeName);
            if (pendingRoomType) {
                setSelectedRoomTypeId(pendingRoomType.id);
            }
            setBookingMode(pendingBooking.mode);
            clearPendingBooking();
            await submitBooking(pendingBooking.mode, session.user.id, pendingBooking);
        };

        continuePendingBooking();
    }, [id, listing, roomTypes, submitBooking]);

    const handleBooking = async (mode: 'reserve' | 'request') => {
        if (!listing || !id) return;

        const bookingCheckIn = checkIn;
        const bookingCheckOut = checkOut;
        const bookingGuestCount = guestCount;

        if (nights <= 0) {
            setBookingError('Please choose a valid check-in and checkout date.');
            return;
        }

        const blockedRange = availabilityBlocks.find((block) => rangesOverlap(bookingCheckIn, bookingCheckOut, block.startDate, block.endDate));
        if (blockedRange) {
            setBookingError(
                blockedRange.status === 'restricted'
                    ? 'Those dates are restricted by the host. Please choose another range.'
                    : 'Those dates are already booked. Please choose another range.'
            );
            return;
        }

        if (bookingGuestCount < 1 || bookingGuestCount > guestLimit) {
            setBookingError(`Please choose between 1 and ${guestLimit} guests.`);
            return;
        }

        const session = await authService.getSession();
        if (!session) {
            savePendingBooking({
                listingId: id,
                checkIn: bookingCheckIn,
                checkOut: bookingCheckOut,
                guestCount: bookingGuestCount,
                roomTypeName: selectedRoomType?.name ?? 'Standard stay',
                roomTypePrice: selectedRoomType?.pricePerNight ?? listing.price,
                roomCount,
                mode,
            });
            navigate(`/guest/auth?next=${encodeURIComponent(`/rooms/${id}`)}&mode=sign-up`);
            return;
        }

        await submitBooking(mode, session.user.id);
    };

    const bookingHeadline = bookingMode === 'reserve' ? 'Reserve now' : 'Request to book';
    const bookingActionLabel = bookingMode === 'reserve' ? 'Reserve' : 'Request to book';
    const bookingTrustNote = isVerifiedGuest
        ? 'Your verified guest profile is ready for safer, faster booking.'
        : currentUserRole
            ? 'Complete your booking details. Admin verification is required to display the AEVR VERIFIED GUEST badge.'
            : 'Sign in to reserve or request this stay. We will save your selection while you log in.';

    if (loading) {
        return <div className={styles.container} style={{ height: '80vh' }} />;
    }

    if (!listing) {
        return <div className={styles.container}>Listing not found</div>;
    }

    const listingSummary = [
        listing.guestCountMax ? `${listing.guestCountMax} guests` : null,
        listing.bedrooms ? `${listing.bedrooms} bedrooms` : null,
        listing.beds ? `${listing.beds} beds` : null,
        listing.baths ? `${listing.baths} baths` : null,
        listing.roomTypes?.length ? `${listing.roomTypes.length} room types` : null,
    ].filter((part): part is string => Boolean(part)).join(' · ');

    return (
        <div className={styles.container}>
            <div className={styles.heading}>
                <h1 className={styles.title}>{listing.title}</h1>
                <div className={styles.subHeading}>
                    <div className={styles.ratingLoc}>
                        <Star size={14} fill="currentColor" />
                        <span>{listing.rating}</span>
                        <span>·</span>
                        <span style={{ textDecoration: 'underline' }}>{listing.reviewCount} reviews</span>
                        <span>·</span>
                        <span style={{ textDecoration: 'underline' }}>{listing.location.city}, {listing.location.country}</span>
                    </div>
                    <div className={styles.actions}>
                        <button className={styles.actionButton} onClick={handleShare}>
                            <Share size={16} /> {copied ? 'Copied!' : 'Share'}
                        </button>
                        <button className={styles.actionButton} onClick={toggleFavorite}>
                            <Heart size={16} fill={isFavorited ? 'var(--color-primary)' : 'none'} color={isFavorited ? 'var(--color-primary)' : 'currentColor'} />
                            <span style={{ color: isFavorited ? 'var(--color-primary)' : 'inherit' }}>{isFavorited ? 'Saved' : 'Save'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.photoGrid}>
                <div className={styles.mainPhoto} onClick={() => setShowPhotosModal(true)}>
                    <img src={coverImage} alt={listing.title} className={styles.photo} />
                </div>
                <div className={styles.sidePhotos}>
                    {listing.images.slice(1, 5).map((img, idx) => (
                        <img key={`${img}-${idx}`} src={img} alt={`${listing.title} view ${idx + 2}`} className={styles.photo} onClick={() => setShowPhotosModal(true)} />
                    ))}
                </div>
                <button className={styles.showAllButton} onClick={() => setShowPhotosModal(true)}>
                    <Grid size={16} /> Show all photos
                </button>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.leftColumn}>
                    <div className={styles.hostSection}>
                        <div className={styles.hostInfo}>
                            <h2>{listing.categoryLabel ?? `Hosted by ${listing.host.name}`}</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                {listing.host.isSuperhost && 'Superhost · '}
                                {listingSummary || 'Flexible stay'}
                            </p>
                            {listing.mapLink && (
                                <a
                                    href={listing.mapLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'inline-flex', marginTop: '10px', color: 'var(--color-primary)', fontWeight: 600 }}
                                >
                                    Open on Google Maps
                                </a>
                            )}
                        </div>
                        <div className={styles.hostAvatar}>
                            {listing.host.avatarUrl ? (
                                <img src={listing.host.avatarUrl} alt={listing.host.name} />
                            ) : (
                                <div className={styles.defaultAvatar}>
                                    {listing.host.name ? listing.host.name.charAt(0).toUpperCase() : 'H'}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}><Key size={24} /></div>
                        <div className={styles.featureText}>
                            <h3>Self check-in</h3>
                            <p>Check yourself in with the lockbox.</p>
                        </div>
                    </div>
                    {listing.host.isSuperhost && (
                        <div className={styles.feature}>
                            <div className={styles.featureIcon}><Star size={24} /></div>
                            <div className={styles.featureText}>
                                <h3>{listing.host.name} is a Superhost</h3>
                                <p>Superhosts are experienced, highly rated Hosts.</p>
                            </div>
                        </div>
                    )}
                    <div className={styles.feature}>
                        <div className={styles.featureIcon}><Calendar size={24} /></div>
                        <div className={styles.featureText}>
                            <h3>{listing.availabilitySummary ?? 'Flexible cancellation policy'}</h3>
                        </div>
                    </div>

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}><Users size={24} /></div>
                        <div className={styles.featureText}>
                            <h3>At a glance</h3>
                            <p>
                                {listing.guestCountMax ? `${listing.guestCountMax} guests` : 'Guest-friendly stay'}
                                {listing.bedrooms ? ` · ${listing.bedrooms} bedrooms` : ''}
                                {listing.beds ? ` · ${listing.beds} beds` : ''}
                                {listing.baths ? ` · ${listing.baths} baths` : ''}
                            </p>
                        </div>
                    </div>

                    <div className={styles.description}>
                        <p>{listing.description}</p>
                        {listing.host.bio && (
                            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>
                                {listing.host.bio}
                            </p>
                        )}
                    </div>

                    <div className={styles.amenities}>
                        <h2>What this place offers</h2>
                        <div className={styles.amenityList}>
                            {listing.amenities.length > 0 ? listing.amenities.map((amenity) => {
                                const AmenityIcon = getAmenityIcon(amenity);
                                return (
                                    <div key={amenity} className={styles.amenityItem}>
                                        <AmenityIcon size={20} />
                                        {amenity}
                                    </div>
                                );
                            }) : (
                                <>
                                    <div className={styles.amenityItem}><Wifi size={20} /> Wifi</div>
                                    <div className={styles.amenityItem}><Car size={20} /> Free parking on premises</div>
                                    <div className={styles.amenityItem}><Utensils size={20} /> Kitchen</div>
                                </>
                            )}
                        </div>
                    </div>

                    <section className={styles.localExperiences}>
                        <div className={styles.sectionIntro}>
                            <h2>Local experiences nearby</h2>
                            <p>Curated ideas around {listing.location.city} to help guests plan a richer stay.</p>
                        </div>
                        <div className={styles.experienceGrid}>
                            {localExperiences.map(({ title, description, meta, Icon }) => (
                                <article key={title} className={styles.experienceCard}>
                                    <div className={styles.experienceIcon}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <span>{meta}</span>
                                        <h3>{title}</h3>
                                        <p>{description}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}><BedDouble size={24} /></div>
                        <div className={styles.featureText}>
                            <h3>Booking details</h3>
                            <p>{formatPrice(listing.price, listing.currency)} per night, before fees and taxes.</p>
                        </div>
                    </div>

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}><Bath size={24} /></div>
                        <div className={styles.featureText}>
                            <h3>{listing.baths ? `${listing.baths} bath${listing.baths > 1 ? 's' : ''}` : 'Comfortable bath setup'}</h3>
                            <p>Designed for easy check-in and a smooth stay.</p>
                        </div>
                    </div>
                </div>

                <div className={styles.bookingCardWrapper}>
                    <div className={styles.bookingCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardPrice}>
                                {formatPrice(nightlyRate, listing.currency)} <span>/ room / night</span>
                            </div>
                            <div className={styles.cardMeta}>
                                <Star size={14} fill="currentColor" />
                                <span>{listing.rating}</span>
                                <span>·</span>
                                <span>{listing.reviewCount} reviews</span>
                            </div>
                        </div>

                        {isVerifiedGuest && (
                            <div className={styles.verifiedGuestBadge}>
                                <ShieldCheck size={16} />
                                <span>AEVR VERIFIED GUEST</span>
                            </div>
                        )}

                        {bookingStatus && (
                            <div className={`${styles.statusBanner} ${bookingStatus === 'reserved' ? styles.statusSuccess : styles.statusInfo}`}>
                                {bookingStatus === 'reserved'
                                    ? 'Reservation placed. You can follow up from this screen later.'
                                    : 'Request sent. The host can review your dates and get back to you.'}
                            </div>
                        )}

                        {bookingError && (
                            <div className={styles.statusBanner}>
                                {bookingError}
                            </div>
                        )}

                        <div className={styles.bookingForm}>
                            <div className={styles.bookingNote}>
                                {bookingTrustNote}
                            </div>

                            <div className={styles.dateGrid}>
                                <label className={styles.formField}>
                                    <span>Check-in</span>
                                    <input
                                        type="date"
                                        value={checkIn}
                                        min={dateToInput(new Date())}
                                        onChange={(e) => setCheckIn(e.target.value)}
                                    />
                                </label>
                                <label className={styles.formField}>
                                    <span>Checkout</span>
                                    <input
                                        type="date"
                                        value={checkOut}
                                        min={addDays(checkIn, 1)}
                                        onChange={(e) => setCheckOut(e.target.value)}
                                    />
                                </label>
                            </div>

                            <label className={styles.formField}>
                                <span>Room type</span>
                                <select value={selectedRoomType?.id ?? ''} onChange={(e) => {
                                    const roomType = roomTypes.find((item) => item.id === e.target.value);
                                    if (!roomType) return;
                                    setSelectedRoomTypeId(roomType.id);
                                    setRoomCount((current) => Math.min(current, roomType.totalCount));
                                }}>
                                    {roomTypes.map((roomType) => (
                                        <option key={roomType.id} value={roomType.id}>
                                            {roomType.name} - {formatPrice(roomType.pricePerNight, listing.currency)} / night ({roomType.totalCount} available)
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {selectedRoomType?.photos && selectedRoomType.photos.length > 0 && (
                                <div className={styles.roomPhotoStrip}>
                                    {selectedRoomType.photos.slice(0, 3).map((photo, index) => (
                                        <img key={`${selectedRoomType.id}-${photo}-${index}`} src={photo} alt={selectedRoomType.name} className={styles.roomPhoto} />
                                    ))}
                                </div>
                            )}

                            <label className={styles.formField}>
                                <span>Rooms</span>
                                <select value={roomCount} onChange={(e) => setRoomCount(Number(e.target.value))}>
                                    {Array.from({ length: selectedRoomType?.totalCount ?? 1 }, (_, index) => index + 1).map((value) => (
                                        <option key={value} value={value}>
                                            {value} room{value > 1 ? 's' : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className={styles.formField}>
                                <span>Guests</span>
                                <select value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))}>
                                    {Array.from({ length: guestLimit }, (_, index) => index + 1).map((value) => (
                                        <option key={value} value={value}>
                                            {value} guest{value > 1 ? 's' : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className={styles.modeToggle} role="tablist" aria-label="Booking mode">
                                <button
                                    type="button"
                                    className={bookingMode === 'reserve' ? styles.modeButtonActive : styles.modeButton}
                                    onClick={() => setBookingMode('reserve')}
                                >
                                    Reserve
                                </button>
                                <button
                                    type="button"
                                    className={bookingMode === 'request' ? styles.modeButtonActive : styles.modeButton}
                                    onClick={() => setBookingMode('request')}
                                >
                                    Request
                                </button>
                            </div>

                            <button
                                type="button"
                                className={styles.reserveButton}
                                onClick={() => handleBooking(bookingMode)}
                                disabled={nights <= 0 || submittingBooking}
                            >
                                {submittingBooking ? 'Please wait...' : bookingActionLabel}
                            </button>

                            <div className={styles.bookingNote}>
                                {bookingHeadline}. You will not be charged yet.
                            </div>
                        </div>

                        {availabilityBlocks.length > 0 && (
                            <div className={styles.availabilityList}>
                                <div className={styles.availabilityTitle}>Blocked dates</div>
                                {availabilityBlocks.map((block) => (
                                    <div key={block.id} className={styles.availabilityRow}>
                                        <span className={block.status === 'booked' ? styles.availabilityBooked : styles.availabilityRestricted}>
                                            {block.status === 'booked' ? 'Booked' : 'Restricted'}
                                        </span>
                                        <span>{formatDateRange(block.startDate, block.endDate)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={styles.priceBreakdown}>
                            <div className={styles.breakdownRow}>
                                <span>
                                    {roomCount} {selectedRoomType?.name ?? 'room'} x {formatPrice(nightlyRate, listing.currency)} x {nights || 0} nights
                                </span>
                                <span>{formatPrice(subtotal, listing.currency)}</span>
                            </div>
                            <div className={styles.breakdownRow}>
                                <span>GST {gstRate > 0 ? `(${Math.round(gstRate * 100)}%)` : '(Exempt)'}</span>
                                <span>{formatPrice(taxes, listing.currency)}</span>
                            </div>
                            <div className={`${styles.breakdownRow} ${styles.totalRow}`}>
                                <span>Total</span>
                                <span>{formatPrice(total, listing.currency)}</span>
                            </div>
                            <div className={styles.taxNote}>
                                Hotel stays at or below ₹1,000 per night are exempt. ₹1,001 - ₹7,500 per night attracts 5% GST without ITC. Above ₹7,500 per night attracts 18% GST with ITC.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showPhotosModal && (
                <div className={`${styles.lightboxModal} ${showPhotosModal ? styles.lightboxModalActive : ''}`}>
                    <div className={styles.lightboxBackdrop} onClick={() => setShowPhotosModal(false)} />
                    <div className={styles.lightboxContent}>
                        <div className={styles.lightboxHeader}>
                            <h2>{listing.title} - Photo Gallery</h2>
                            <button className={styles.lightboxCloseButton} onClick={() => setShowPhotosModal(false)} aria-label="Close photo gallery">
                                <X size={24} />
                            </button>
                        </div>
                        <div className={styles.lightboxBody}>
                            {listing.images.map((img, index) => (
                                <div key={`${img}-${index}`} className={styles.lightboxPhotoCard}>
                                    <img src={img} alt={`${listing.title} - view ${index + 1}`} className={styles.lightboxImage} />
                                    <span className={styles.lightboxIndexBadge}>{index + 1} / {listing.images.length}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
