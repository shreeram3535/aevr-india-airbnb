import { useCallback, useEffect, useMemo, useRef, useState, type ElementType, type SyntheticEvent } from 'react';
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
    ExternalLink,
    PlayCircle,
    Phone,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { SkeletonScreen } from '../components/SkeletonScreen';
import styles from './ListingDetails.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { favoritesService } from '../services/favorites';
import type { AvailabilityBlock, Listing, RoomType } from '../types';
import { getFallbackImage } from '../services/media';

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

const DEFAULT_WHATSAPP_PHONE = '918890807482';

const normalizePhoneNumber = (value?: string | null) => {
    if (!value) return '';
    return value.replace(/[^\d+]/g, '');
};

const toWhatsAppPhone = (value?: string | null) => {
    const normalized = normalizePhoneNumber(value);
    if (!normalized) return DEFAULT_WHATSAPP_PHONE;
    if (normalized.startsWith('+')) {
        return normalized.slice(1);
    }
    if (normalized.startsWith('00')) {
        return normalized.slice(2);
    }
    if (normalized.length === 10) {
        return `91${normalized}`;
    }
    return normalized;
};

const formatPhoneDisplay = (value?: string | null) => {
    const normalized = normalizePhoneNumber(value);
    if (!normalized) return '+91 88908 07482';
    if (normalized.startsWith('+')) return normalized;
    if (normalized.length === 10) {
        return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
    }
    if (normalized.length === 12 && normalized.startsWith('91')) {
        return `+${normalized.slice(0, 2)} ${normalized.slice(2, 7)} ${normalized.slice(7)}`;
    }
    return normalized;
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

const renderImageFallback = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== getFallbackImage()) {
        event.currentTarget.src = getFallbackImage();
    }
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
};

const readPendingBooking = (): PendingBooking | null => {
    try {
        const stored = sessionStorage.getItem(PENDING_BOOKING_KEY);
        if (!stored) {
            return null;
        }

        const parsed = JSON.parse(stored) as Partial<PendingBooking>;
        if (!parsed?.listingId || !parsed?.checkIn || !parsed?.checkOut || !parsed?.guestCount) {
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
    const [submittingBooking, setSubmittingBooking] = useState(false);
    const [isVerifiedGuest, setIsVerifiedGuest] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<'guest' | 'host' | 'admin' | null>(null);
    const [copied, setCopied] = useState(false);
    const [showPhotosModal, setShowPhotosModal] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const autoSubmitHandled = useRef(false);
    const mobileSliderRef = useRef<HTMLDivElement | null>(null);

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

    const guestLimit = 4;

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
    const listingMedia = useMemo(() => listing?.media ?? [], [listing?.media]);
    const galleryMedia = useMemo(() => {
        const roomMedia = selectedRoomType?.media ?? [];
        return roomMedia.length > 0 ? roomMedia : listingMedia;
    }, [listingMedia, selectedRoomType?.media]);
    const coverMedia = galleryMedia[0] ?? listingMedia[0] ?? null;
    const coverImage = coverMedia?.kind === 'image'
        ? coverMedia.url
        : coverMedia?.thumbnailUrl ?? listing?.images[0] ?? getFallbackImage();
    const localExperiences = useMemo(() => listing ? getLocalExperiences(listing) : [], [listing]);
    const hostPhone = normalizePhoneNumber(listing?.host.phone);
    const displayPhone = formatPhoneDisplay(listing?.host.phone);
    const callHref = hostPhone ? `tel:${hostPhone}` : undefined;
    const whatsappHref = `https://wa.me/${toWhatsAppPhone(listing?.host.phone)}`;

    useEffect(() => {
        setCurrentMediaIndex(0);
    }, [galleryMedia]);

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

    const scrollToMediaIndex = useCallback((index: number) => {
        const slider = mobileSliderRef.current;
        if (!slider) return;
        const slides = slider.querySelectorAll<HTMLElement>(`[data-mobile-slide="true"]`);
        const target = slides[index];
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }, []);

    const handleMobileSliderScroll = useCallback(() => {
        const slider = mobileSliderRef.current;
        if (!slider) return;
        const slideWidth = slider.clientWidth;
        if (slideWidth <= 0) return;
        const nextIndex = Math.round(slider.scrollLeft / slideWidth);
        setCurrentMediaIndex(Math.max(0, Math.min(nextIndex, galleryMedia.length - 1)));
    }, [galleryMedia.length]);

    const handleMobileSliderStep = useCallback((direction: 'prev' | 'next') => {
        if (galleryMedia.length <= 1) return;
        const nextIndex = direction === 'next'
            ? Math.min(currentMediaIndex + 1, galleryMedia.length - 1)
            : Math.max(currentMediaIndex - 1, 0);
        setCurrentMediaIndex(nextIndex);
        scrollToMediaIndex(nextIndex);
    }, [currentMediaIndex, galleryMedia.length, scrollToMediaIndex]);

    const submitBooking = useCallback(
        async (guestId: string, bookingOverride?: PendingBooking) => {
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
                    status: 'confirmed',
                });

                clearPendingBooking();
                setBookingError(null);
                setBookingStatus('reserved');
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
            clearPendingBooking();
            await submitBooking(session.user.id, pendingBooking);
        };

        continuePendingBooking();
    }, [id, listing, roomTypes, submitBooking]);

    const handleBooking = async () => {
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
            });
            navigate(`/guest/auth?next=${encodeURIComponent(`/rooms/${id}`)}&mode=sign-up`);
            return;
        }

        await submitBooking(session.user.id);
    };

    const bookingHeadline = 'Reserve now';
    const bookingActionLabel = 'Reserve';
    const bookingTrustNote = isVerifiedGuest
        ? 'Your verified guest profile is ready for safer, faster booking.'
        : currentUserRole
            ? 'Complete your booking details. Admin verification is required to display the AEVR VERIFIED GUEST badge.'
            : 'Sign in to reserve this stay. We will save your selection while you log in.';

    if (loading) {
        return <SkeletonScreen variant="listing-details" />;
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
                    {coverMedia?.kind === 'video' && coverMedia.embedUrl ? (
                        <iframe
                            src={coverMedia.embedUrl}
                            title={`${listing.title} video`}
                            className={styles.mediaFrame}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <img src={coverImage} alt={listing.title} className={styles.photo} onError={renderImageFallback} />
                    )}
                </div>
                <div className={styles.sidePhotos}>
                    {galleryMedia.slice(1, 5).map((item, idx) => (
                        item.kind === 'video' ? (
                            <div key={`${item.url}-${idx}`} className={styles.mediaCard} onClick={() => setShowPhotosModal(true)}>
                                {item.embedUrl ? (
                                    <iframe
                                        src={item.embedUrl}
                                        title={`${listing.title} video ${idx + 2}`}
                                        className={styles.mediaFrame}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className={styles.videoLinkCard}>
                                        <PlayCircle size={26} />
                                        <span>Open video</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <img
                                key={`${item.url}-${idx}`}
                                src={item.url}
                                alt={`${listing.title} view ${idx + 2}`}
                                className={styles.photo}
                                onClick={() => setShowPhotosModal(true)}
                                onError={renderImageFallback}
                            />
                        )
                    ))}
                </div>
                <button className={styles.showAllButton} onClick={() => setShowPhotosModal(true)}>
                    <Grid size={16} /> Show all media
                </button>
            </div>

            <div className={styles.mobileGallery}>
                <div className={styles.mobileSlider} ref={mobileSliderRef} onScroll={handleMobileSliderScroll}>
                    {galleryMedia.map((item, index) => (
                        <div
                            key={`${item.url}-${index}`}
                            className={styles.mobileSlide}
                            data-mobile-slide="true"
                        >
                            <button
                                type="button"
                                className={styles.mobileSlideButton}
                                onClick={() => setShowPhotosModal(true)}
                                aria-label={`Open media ${index + 1}`}
                            >
                                {item.kind === 'video' ? (
                                    item.embedUrl ? (
                                        <iframe
                                            src={item.embedUrl}
                                            title={`${listing.title} mobile video ${index + 1}`}
                                            className={styles.mobileSlideMedia}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <div className={styles.mobileVideoCard}>
                                            <PlayCircle size={30} />
                                            <span>Open video</span>
                                        </div>
                                    )
                                ) : (
                                    <img
                                        src={item.url}
                                        alt={`${listing.title} view ${index + 1}`}
                                        className={styles.mobileSlideMedia}
                                        onError={renderImageFallback}
                                    />
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                {galleryMedia.length > 1 && (
                    <div className={styles.mobileGalleryControls}>
                        <button
                            type="button"
                            className={styles.mobileNavButton}
                            onClick={() => handleMobileSliderStep('prev')}
                            disabled={currentMediaIndex === 0}
                            aria-label="Previous media"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className={styles.mobileDots}>
                            {galleryMedia.map((item, index) => (
                                <button
                                    key={`${item.url}-dot-${index}`}
                                    type="button"
                                    className={index === currentMediaIndex ? styles.mobileDotActive : styles.mobileDot}
                                    onClick={() => {
                                        setCurrentMediaIndex(index);
                                        scrollToMediaIndex(index);
                                    }}
                                    aria-label={`Go to media ${index + 1}`}
                                />
                            ))}
                        </div>
                        <button
                            type="button"
                            className={styles.mobileNavButton}
                            onClick={() => handleMobileSliderStep('next')}
                            disabled={currentMediaIndex === galleryMedia.length - 1}
                            aria-label="Next media"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                )}

                <button type="button" className={styles.mobileShowAllButton} onClick={() => setShowPhotosModal(true)}>
                    <Grid size={16} /> Show all media
                </button>
            </div>

            <div className={styles.contentGrid}>
                <div className={styles.leftColumn}>
                    <div className={styles.hostSection}>
                        <div className={styles.hostInfo}>
                            <h2>Hosted by {listing.host.name}</h2>
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

                    <div className={styles.contactSection}>
                        <div className={styles.contactHeader}>
                            <h2>Contact host</h2>
                            <span>{displayPhone}</span>
                        </div>
                        <div className={styles.contactActions}>
                            {callHref && (
                                <a href={callHref} className={styles.contactButton}>
                                    <Phone size={18} />
                                    <span>Call now</span>
                                </a>
                            )}
                            <a href={whatsappHref} target="_blank" rel="noreferrer" className={styles.whatsappButton}>
                                <img src="/whatsapp.svg" alt="" className={styles.whatsappIcon} aria-hidden="true" />
                                <span>WhatsApp</span>
                            </a>
                        </div>
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
                            <div className={`${styles.statusBanner} ${styles.statusSuccess}`}>
                                Reservation placed. You can follow up from this screen later.
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

                            {selectedRoomType?.media && selectedRoomType.media.length > 0 && (
                                <div className={styles.roomPhotoStrip}>
                                    {selectedRoomType.media.slice(0, 3).map((mediaItem, index) => (
                                        mediaItem.kind === 'video' ? (
                                            <div key={`${selectedRoomType.id}-${mediaItem.url}-${index}`} className={styles.roomVideoCard}>
                                                {mediaItem.embedUrl ? (
                                                    <iframe
                                                        src={mediaItem.embedUrl}
                                                        title={`${selectedRoomType.name} video ${index + 1}`}
                                                        className={styles.roomVideoFrame}
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                ) : (
                                                    <a href={mediaItem.url} target="_blank" rel="noreferrer" className={styles.videoLinkCard}>
                                                        <PlayCircle size={22} />
                                                        <span>Open video</span>
                                                    </a>
                                                )}
                                            </div>
                                        ) : (
                                            <img
                                                key={`${selectedRoomType.id}-${mediaItem.url}-${index}`}
                                                src={mediaItem.url}
                                                alt={selectedRoomType.name}
                                                className={styles.roomPhoto}
                                                onError={renderImageFallback}
                                            />
                                        )
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
                                    {[1, 2, 3, 4].map((value) => (
                                        <option key={value} value={value}>
                                            {value} guest{value > 1 ? 's' : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <button
                                type="button"
                                className={styles.reserveButton}
                                onClick={handleBooking}
                                disabled={nights <= 0 || submittingBooking}
                            >
                                {submittingBooking ? 'Please wait...' : bookingActionLabel}
                            </button>

                            <div className={styles.sidebarContactSection}>
                                <div className={styles.sidebarContactLabel}>Contact</div>
                                <a href={whatsappHref} target="_blank" rel="noreferrer" className={styles.sidebarWhatsappButton}>
                                    <img src="/whatsapp.svg" alt="" className={styles.whatsappIcon} aria-hidden="true" />
                                    <span>WhatsApp</span>
                                </a>
                            </div>

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
                            <h2>{listing.title} - Media Gallery</h2>
                            <button className={styles.lightboxCloseButton} onClick={() => setShowPhotosModal(false)} aria-label="Close photo gallery">
                                <X size={24} />
                            </button>
                        </div>
                        <div className={styles.lightboxBody}>
                            {galleryMedia.map((item, index) => (
                                <div key={`${item.url}-${index}`} className={styles.lightboxPhotoCard}>
                                    {item.kind === 'video' ? (
                                        item.embedUrl ? (
                                            <iframe
                                                src={item.embedUrl}
                                                title={`${listing.title} video ${index + 1}`}
                                                className={styles.lightboxVideoFrame}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <a href={item.url} target="_blank" rel="noreferrer" className={styles.lightboxVideoLink}>
                                                <PlayCircle size={40} />
                                                <span>Open external video</span>
                                                <ExternalLink size={18} />
                                            </a>
                                        )
                                    ) : (
                                        <img
                                            src={item.url}
                                            alt={`${listing.title} - view ${index + 1}`}
                                            className={styles.lightboxImage}
                                            onError={renderImageFallback}
                                        />
                                    )}
                                    <span className={styles.lightboxIndexBadge}>{index + 1} / {galleryMedia.length}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
