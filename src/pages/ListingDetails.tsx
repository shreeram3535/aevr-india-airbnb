import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
    Heart,
    Share,
    Grid,
    Key,
    BedDouble,
    Users,
    X,
    ExternalLink,
    PlayCircle,
    ChevronLeft,
    ChevronRight,
    Minus,
    Plus,
    ChevronDown,
    Compass,
    Bath,
    ShieldCheck,
} from 'lucide-react';
import AmenityIcon from '../components/AmenityIcon';
import { SkeletonScreen } from '../components/SkeletonScreen';
import styles from './ListingDetails.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { favoritesService } from '../services/favorites';
import type { AvailabilityBlock, Listing, RoomType, FlashSaleDrop } from '../types';
import { FuzzyMap } from '../components/FuzzyMap';
import { hasValidCoords, extractCoordsFromGoogleMapsUrl } from '../services/mapUtils';
import DiscountCountdown from '../components/DiscountCountdown';
import ListingDiscountCountdown from '../components/ListingDiscountCountdown';


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
    if (!value) return '';
    try {
        const date = parseInputDate(value);
        if (Number.isNaN(date.getTime())) return '';
        date.setUTCDate(date.getUTCDate() + days);
        return dateToInput(date);
    } catch {
        return '';
    }
};

const nightsBetween = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    try {
        const start = parseInputDate(checkIn).getTime();
        const end = parseInputDate(checkOut).getTime();
        if (Number.isNaN(start) || Number.isNaN(end)) return 0;
        const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
        return nights > 0 ? nights : 0;
    } catch {
        return 0;
    }
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

const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Add date';
    const date = parseInputDate(dateStr);
    if (Number.isNaN(date.getTime())) return 'Add date';
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
    });
};

const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(Date.UTC(year, month, 1));
    const days = [];
    const startDayOfWeek = date.getUTCDay();
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(null);
    }
    const totalDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let d = 1; d <= totalDays; d++) {
        days.push(new Date(Date.UTC(year, month, d)));
    }
    return days;
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


const getHostedByLabel = (listing: { category?: string; price?: number }) => {
    const normalizedCategory = listing.category?.toLowerCase() ?? '';
    const isLuxeCategory = normalizedCategory.includes('luxe') || normalizedCategory.includes('luxury');
    const isHighPrice = (listing.price ?? 0) >= 10000;
    if (isLuxeCategory || isHighPrice) {
        return 'Aevr Luxe';
    }
    return 'Aevr';
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



const clearPendingBooking = () => {
    sessionStorage.removeItem(PENDING_BOOKING_KEY);
};

export const ListingDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [listing, setListing] = useState<Listing | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [isFavorited, setIsFavorited] = useState(false);
    const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
    const [bookingStatus, setBookingStatus] = useState<'reserved' | 'requested' | null>(null);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [submittingBooking, setSubmittingBooking] = useState(false);
    const [isVerifiedGuest, setIsVerifiedGuest] = useState(false);
    const [copied, setCopied] = useState(false);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const [showPhotosModal, setShowPhotosModal] = useState(false);
    const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const autoSubmitHandled = useRef(false);
    const mobileSliderRef = useRef<HTMLDivElement | null>(null);
    const desktopSliderRef = useRef<HTMLDivElement | null>(null);

    const [activeDrop, setActiveDrop] = useState<FlashSaleDrop | null>(null);

    const handleFlashSaleExpire = useCallback(() => {
        setActiveDrop(null);
        if (id) {
            api.fetchActiveFlashDropForListing(id).then((drop) => {
                if (drop && drop.listingId === id) {
                    setActiveDrop(drop);
                } else {
                    setActiveDrop(null);
                }
            });
        }
    }, [id]);

    const [checkIn, setCheckIn] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return dateToInput(tomorrow);
    });
    const [checkOut, setCheckOut] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextDay = new Date(tomorrow);
        nextDay.setDate(nextDay.getDate() + 1);
        return dateToInput(nextDay);
    });
    const [guestCount, setGuestCount] = useState(1);
    const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
    const [roomCount, setRoomCount] = useState(1);

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            setLoading(true);
            const [data, blocks, currentUser, activeFlashDrop] = await Promise.all([
                api.fetchListingById(id),
                api.fetchAvailabilityBlocks(id),
                api.getCurrentUserSummary(),
                api.fetchActiveFlashDropForListing(id),
            ]);
            setListing(data);
            setAvailabilityBlocks(blocks);
            setIsVerifiedGuest(currentUser?.role === 'guest' && currentUser.isVerifiedGuest);
            setIsFavorited(favoritesService.isFavorite(id));
            if (activeFlashDrop && activeFlashDrop.listingId === id) {
                setActiveDrop(activeFlashDrop);
            } else {
                setActiveDrop(null);
            }
            setLoading(false);
        };

        load();
    }, [id]);

    const isOnSale = Boolean(activeDrop && activeDrop.listingId === id);

    const getStayNights = (checkInStr: string, checkOutStr: string) => {
        const nights: string[] = [];
        if (!checkInStr || !checkOutStr) return nights;
        const current = new Date(checkInStr);
        const end = new Date(checkOutStr);
        while (current < end) {
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            nights.push(`${y}-${m}-${d}`);
            current.setDate(current.getDate() + 1);
        }
        return nights;
    };

    const getDiscountedPrice = (originalPrice: number) => {
        if (!isOnSale || !activeDrop || !listing) return originalPrice;
        if (originalPrice === listing.price) return activeDrop.salePrice;
        return Math.max(1, originalPrice * (1 - activeDrop.discountPercent / 100));
    };

    const getNightsDistribution = (checkInStr: string, checkOutStr: string) => {
        if (!checkInStr || !checkOutStr) return { discountedNights: 0, regularNights: 0, salePrice: 0, basePrice: 0, total: 0 };
        const nights = getStayNights(checkInStr, checkOutStr);
        let discountedNights = 0;
        let regularNights = 0;

        const basePrice = selectedRoomType?.pricePerNight ?? listing?.price ?? 0;
        const salePrice = getDiscountedPrice(basePrice);

        const saleStart = activeDrop ? activeDrop.startAt.slice(0, 10) : '';
        const saleEnd = activeDrop ? activeDrop.endAt.slice(0, 10) : '';

        nights.forEach((night) => {
            const isNightOnSale = isOnSale && night >= saleStart && night < saleEnd;
            if (isNightOnSale) {
                discountedNights++;
            } else {
                regularNights++;
            }
        });

        const total = (discountedNights * salePrice + regularNights * basePrice) * roomCount;

        return {
            discountedNights,
            regularNights,
            salePrice,
            basePrice,
            total,
        };
    };

    useEffect(() => {
        if (!isOnSale || !activeDrop) return;

        const updateTimer = () => {
            const now = Date.now();
            const end = new Date(activeDrop.endAt).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeftStr('Flash sale ended');
                return;
            }

            const days = Math.floor(diff / (24 * 60 * 60 * 1000));
            const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
            const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

            let str = '';
            if (days > 0) {
                str += `${days} day${days > 1 ? 's' : ''} `;
            }
            if (hours > 0 || days > 0) {
                str += `${hours} hour${hours > 1 ? 's' : ''} `;
            }
            str += `${minutes} min${minutes > 1 ? 's' : ''}`;
            setTimeLeftStr(str);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000);
        return () => clearInterval(interval);
    }, [isOnSale, activeDrop]);

    const roomTypes = useMemo(() => fallbackRoomTypes(listing), [listing]);
    const selectedRoomType = useMemo(
        () => roomTypes.find((roomType) => roomType.id === selectedRoomTypeId) ?? roomTypes[0] ?? null,
        [roomTypes, selectedRoomTypeId]
    );

    const roomTypeDropdownRef = useRef<HTMLDivElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const [roomTypeDropdownOpen, setRoomTypeDropdownOpen] = useState(false);
    const [activeDatePicker, setActiveDatePicker] = useState<'checkIn' | 'checkOut' | null>(null);

    const [calendarYear, setCalendarYear] = useState<number>(() => {
        const d = checkIn ? parseInputDate(checkIn) : new Date();
        return d.getUTCFullYear();
    });
    const [calendarMonth, setCalendarMonth] = useState<number>(() => {
        const d = checkIn ? parseInputDate(checkIn) : new Date();
        return d.getUTCMonth();
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roomTypeDropdownRef.current && !roomTypeDropdownRef.current.contains(event.target as Node)) {
                setRoomTypeDropdownOpen(false);
            }
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setActiveDatePicker(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePrevMonth = () => {
        setCalendarMonth((prev) => {
            if (prev === 0) {
                setCalendarYear((y) => y - 1);
                return 11;
            }
            return prev - 1;
        });
    };

    const handleNextMonth = () => {
        setCalendarMonth((prev) => {
            if (prev === 11) {
                setCalendarYear((y) => y + 1);
                return 0;
            }
            return prev + 1;
        });
    };

    const isDateDisabled = (dayDate: Date) => {
        const dateStr = dateToInput(dayDate);
        const todayStr = dateToInput(new Date());

        // Cannot select past dates
        if (dateStr < todayStr) return true;

        // If selecting checkout, cannot select dates on or before checkIn
        if (activeDatePicker === 'checkOut' && checkIn && dateStr <= checkIn) {
            return true;
        }

        // Check availability blocks
        return availabilityBlocks.some((block) =>
            dateStr >= block.startDate && dateStr <= block.endDate
        );
    };

    const handleSelectDay = (dayDate: Date) => {
        const dateStr = dateToInput(dayDate);
        if (activeDatePicker === 'checkIn') {
            setCheckIn(dateStr);
            setActiveDatePicker('checkOut');
            if (checkOut && dateStr >= checkOut) {
                setCheckOut(addDays(dateStr, 1));
            }
        } else if (activeDatePicker === 'checkOut') {
            if (dateStr > checkIn) {
                setCheckOut(dateStr);
                setActiveDatePicker(null);
            }
        }
    };

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
        if (checkIn && checkOut && checkOut <= checkIn) {
            setCheckOut(addDays(checkIn, 1));
        }
    }, [checkIn, checkOut]);

    const guestLimit = useMemo(() => {
        return selectedRoomType?.maxGuests ?? listing?.guestCountMax ?? 4;
    }, [selectedRoomType, listing]);

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

    const { discountedNights, regularNights, salePrice, basePrice, total: subtotal } = useMemo(() => {
        return getNightsDistribution(checkIn, checkOut);
    }, [checkIn, checkOut, selectedRoomType, listing, roomCount, isOnSale, activeDrop]);

    const nightlyRate = isOnSale && activeDrop && discountedNights > 0 ? salePrice : (selectedRoomType?.pricePerNight ?? listing?.price ?? 0);

    const taxes = useMemo(() => {
        if (!listing) return 0;
        const discountedGst = salePrice * getHotelGstRate(salePrice) * discountedNights;
        const regularGst = basePrice * getHotelGstRate(basePrice) * regularNights;
        return Math.round((discountedGst + regularGst) * roomCount);
    }, [checkIn, checkOut, selectedRoomType, listing, roomCount, isOnSale, activeDrop, discountedNights, regularNights, salePrice, basePrice]);

    const total = subtotal + taxes;
    const listingMedia = useMemo(() => listing?.media ?? [], [listing?.media]);
    const galleryMedia = listingMedia;
    // Removed static experiences

    useEffect(() => {
        setCurrentMediaIndex(0);
    }, [listingMedia]);

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

    const handleDesktopScroll = useCallback((direction: 'prev' | 'next') => {
        const slider = desktopSliderRef.current;
        if (!slider) return;
        const scrollAmount = slider.clientWidth * 0.75;
        slider.scrollBy({
            left: direction === 'next' ? scrollAmount : -scrollAmount,
            behavior: 'smooth',
        });
    }, []);

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

    const handleBooking = () => {
        if (!listing || !id) return;

        if (nights <= 0) {
            setBookingError('Please choose a valid check-in and checkout date.');
            return;
        }

        setBookingError(null);

        const whatsappMessage = `Hey!

I would like to reserve this property.

Property Link:
${window.location.href}

Booking Details:
• Check-in: ${checkIn}
• Check-out: ${checkOut}
• Room Type: ${selectedRoomType?.name ?? 'Standard stay'}
• Rooms: ${roomCount}
• Guests (including children): ${guestCount}

Please let me know the next steps for confirming the booking.`;

        const whatsappUrl = `https://wa.me/918890807482?text=${encodeURIComponent(whatsappMessage)}`;
        window.open(whatsappUrl, '_blank');
    };

    const bookingHeadline = 'Reserve now';
    const bookingActionLabel = 'Reserve';
    const bookingTrustNote = 'Complete your booking details. Clicking Reserve will redirect you to WhatsApp to submit your reservation enquiry.';

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
            {isOnSale && activeDrop && (
                <div className={styles.flashSaleBanner}>
                    <span className={styles.flashSaleIcon}>⚡</span>
                    <div className={styles.flashSaleTextGroup}>
                        <strong className={styles.flashSaleTitleText}>FLASH SALE — {Math.round(activeDrop.discountPercent)}% OFF</strong>
                        <span className={styles.flashSaleTimeText}>
                            Special price &nbsp;<DiscountCountdown endTime={activeDrop.endAt} onExpire={handleFlashSaleExpire} />
                        </span>
                    </div>
                </div>
            )}
            <div className={styles.heading}>
                <h1 className={styles.title}>{listing.title}</h1>
                <div className={styles.subHeading}>
                    <div className={styles.ratingLoc}>
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

            <div className={styles.desktopGallery}>
                {galleryMedia.length > 1 && (
                    <>
                        <button
                            type="button"
                            className={`${styles.galleryNavBtn} ${styles.galleryNavBtnLeft}`}
                            onClick={() => handleDesktopScroll('prev')}
                            aria-label="Previous photos"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            type="button"
                            className={`${styles.galleryNavBtn} ${styles.galleryNavBtnRight}`}
                            onClick={() => handleDesktopScroll('next')}
                            aria-label="Next photos"
                        >
                            <ChevronRight size={24} />
                        </button>
                    </>
                )}
                <div className={styles.desktopSlider} ref={desktopSliderRef}>
                    {galleryMedia.map((item, idx) => (
                        <div
                            key={`${item.url}-${idx}`}
                            className={styles.desktopSlide}
                            onClick={() => {
                                setCurrentMediaIndex(idx);
                                setShowPhotosModal(true);
                            }}
                        >
                            {item.kind === 'video' ? (
                                item.embedUrl ? (
                                    <iframe
                                        src={item.embedUrl}
                                        title={`${listing.title} video ${idx + 1}`}
                                        className={styles.desktopSlideMedia}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className={styles.desktopVideoCard}>
                                        <PlayCircle size={36} />
                                        <span>Open video</span>
                                    </div>
                                )
                            ) : (
                                <img
                                    src={item.url}
                                    alt={`${listing.title} view ${idx + 1}`}
                                    className={styles.desktopSlideMedia}
                                    loading={idx === 0 ? 'eager' : 'lazy'}
                                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                                    decoding="async"
                                    onError={renderImageFallback}
                                />
                            )}
                        </div>
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
                            <h2>Hosted by {getHostedByLabel({ category: listing.category, price: listing.price })}</h2>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                {listingSummary || 'Flexible stay'}
                            </p>
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

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}>
                            <img src="/whatsapp.svg" alt="WhatsApp" style={{ width: '24px', height: '24px', display: 'block' }} />
                        </div>
                        <div className={styles.featureText}>
                            <h3>Know More About This Property</h3>
                            <p>
                                <a
                                    href={`https://wa.me/918890807482?text=${encodeURIComponent(
                                        `Hey!\nI want to enquire about this property.\n\nProperty Link:\n${window.location.href}`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 600 }}
                                >
                                    Enquire via WhatsApp
                                </a>
                            </p>
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
                        <div
                            className={`${styles.descriptionBody} ${
                                descriptionExpanded ? styles.descriptionBodyExpanded : ''
                            }`}
                        >
                            <p className={styles.descriptionText}>{listing.description}</p>
                            {listing.host.bio && (
                                <p className={styles.descriptionBio}>
                                    {listing.host.bio}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            className={styles.descriptionToggle}
                            onClick={() => setDescriptionExpanded((v) => !v)}
                        >
                            <span>{descriptionExpanded ? 'Show less' : 'Show more'}</span>
                            <ChevronDown
                                size={16}
                                style={{
                                    transition: 'transform 0.25s',
                                    transform: descriptionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                }}
                            />
                        </button>
                    </div>



                    <div className={styles.amenities}>
                        <h2>What this place offers</h2>
                        <div className={styles.amenityList}>
                            {(listing.amenities.length > 0 ? listing.amenities : ['WiFi', 'Free parking', 'Kitchen']).slice(0, 10).map((amenity) => (
                                <div key={amenity} className={styles.amenityItem}>
                                    <AmenityIcon name={amenity} size={24} />
                                    <span>{amenity}</span>
                                </div>
                            ))}
                        </div>
                        {listing.amenities.length > 10 && (
                            <button
                                className={styles.showAllAmenities}
                                onClick={() => setShowAmenitiesModal(true)}
                            >
                                Show all {listing.amenities.length} amenities
                            </button>
                        )}
                    </div>

                    {/* Amenities Modal */}
                    {showAmenitiesModal && (
                        <div className={styles.amenitiesModal} onClick={() => setShowAmenitiesModal(false)}>
                            <div
                                className={styles.amenitiesModalContent}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    className={styles.amenitiesModalClose}
                                    onClick={() => setShowAmenitiesModal(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                                <h2>What this place offers</h2>
                                <div className={styles.amenitiesModalList}>
                                    {listing.amenities.map((amenity) => (
                                        <div key={amenity} className={styles.amenitiesModalItem}>
                                            <AmenityIcon name={amenity} size={24} />
                                            <span>{amenity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {listing.localExperiences && listing.localExperiences.length > 0 && (
                        <section className={styles.localExperiences}>
                            <div className={styles.sectionIntro}>
                                <h2>Local experiences nearby</h2>
                                <p>Curated ideas around {listing.location.city} to help guests plan a richer stay.</p>
                            </div>
                            <div className={styles.experienceGrid}>
                                {listing.localExperiences.map(({ id, title, category, description, iconOrImage, distance, travelTime }) => (
                                    <article key={id} className={styles.experienceCard}>
                                        <div className={styles.experienceIcon}>
                                            {iconOrImage ? (
                                                iconOrImage.startsWith('http') ? (
                                                    <img src={iconOrImage} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                                ) : (
                                                    <span style={{ fontSize: '1.25rem' }}>{iconOrImage}</span>
                                                )
                                            ) : (
                                                <Compass size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <span>{category}{distance ? ` • ${distance}` : ''}{travelTime ? ` • ${travelTime}` : ''}</span>
                                            <h3>{title}</h3>
                                            <p>{description}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    )}

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}><BedDouble size={24} /></div>
                        <div className={styles.featureText}>
                            <h3>Booking details</h3>
                            <p>
                                {isOnSale && activeDrop ? (
                                    <span className={styles.bookingDetailsPriceRow}>
                                        <span className={styles.originalPriceDetails}>{formatPrice(listing.price, listing.currency)}</span>
                                        <span className={styles.salePriceDetails}>{formatPrice(activeDrop.salePrice, listing.currency)}</span>
                                        <DiscountCountdown endTime={activeDrop.endAt} onExpire={handleFlashSaleExpire} />
                                    </span>
                                ) : listing.originalPrice && listing.originalPrice > listing.price ? (
                                    <span className={styles.bookingDetailsPriceRow}>
                                        <span className={styles.originalPriceDetails}>{formatPrice(listing.originalPrice, listing.currency)}</span>
                                        <span className={styles.salePriceDetails}>{formatPrice(listing.price, listing.currency)}</span>
                                        <ListingDiscountCountdown endTime={listing.discountEndTime} />
                                    </span>
                                ) : (
                                    formatPrice(listing.price, listing.currency)
                                )}{' '}
                                per night, before fees and taxes.
                            </p>
                        </div>
                    </div>

                    <div className={styles.feature}>
                        <div className={styles.featureIcon}><Bath size={24} /></div>
                        <div className={styles.featureText}>
                            <h3>{listing.baths ? `${listing.baths} bath${listing.baths > 1 ? 's' : ''}` : 'Comfortable bath setup'}</h3>
                            <p>Designed for easy check-in and a smooth stay.</p>
                        </div>
                    </div>

                    {/* ── Where you'll be ─────────────────────── */}
                    {(() => {
                        const dbCoords = hasValidCoords(listing.location.lat, listing.location.lng)
                            ? { lat: listing.location.lat, lng: listing.location.lng }
                            : null;
                        const linkCoords = !dbCoords && listing.mapLink
                            ? extractCoordsFromGoogleMapsUrl(listing.mapLink)
                            : null;
                        const coords = dbCoords ?? linkCoords;

                        if (coords) {
                            return (
                                <div className={styles.whereSection}>
                                    <h2>Where you'll be</h2>
                                    <p className={styles.whereSubtitle}>
                                        {listing.location.city}, {listing.location.country}
                                    </p>
                                    <FuzzyMap
                                        lat={coords.lat}
                                        lng={coords.lng}
                                        listingId={listing.id}
                                        city={listing.location.city}
                                    />
                                    {/* Privacy note — no link, exact location shared only after booking */}
                                    <p className={styles.whereExactNote}>
                                        Exact location will be provided after booking.
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>

                <div className={styles.bookingCardWrapper}>
                    <div className={styles.bookingCard}>
                        <div className={styles.cardHeader}>
                            <div className={styles.cardPrice}>
                                {isOnSale && activeDrop && discountedNights > 0 ? (
                                    <div className={styles.priceContainer}>
                                        <span className={styles.originalPriceCard}>{formatPrice(selectedRoomType?.pricePerNight ?? listing.price, listing.currency)}</span>
                                        <span className={styles.salePriceCard}>{formatPrice(nightlyRate, listing.currency)}</span>
                                        <span className={styles.period}>/ night</span>
                                        <DiscountCountdown endTime={activeDrop.endAt} onExpire={handleFlashSaleExpire} />
                                    </div>
                                ) : isOnSale && activeDrop ? (
                                    <div className={styles.priceContainer}>
                                        <span className={styles.originalPriceCard}>{formatPrice(selectedRoomType?.pricePerNight ?? listing.price, listing.currency)}</span>
                                        <span className={styles.salePriceCard}>{formatPrice(activeDrop.salePrice, listing.currency)}</span>
                                        <span className={styles.period}>/ night</span>
                                        <DiscountCountdown endTime={activeDrop.endAt} onExpire={handleFlashSaleExpire} />
                                    </div>
                                ) : listing.originalPrice && listing.originalPrice > listing.price ? (
                                    <div className={styles.priceContainer}>
                                        <span className={styles.originalPriceCard}>{formatPrice(listing.originalPrice, listing.currency)}</span>
                                        <span className={styles.salePriceCard}>{formatPrice(nightlyRate, listing.currency)}</span>
                                        <span className={styles.period}>/ night</span>
                                        <ListingDiscountCountdown endTime={listing.discountEndTime} />
                                    </div>
                                ) : (
                                    <>
                                        {formatPrice(nightlyRate, listing.currency)} <span>/ night</span>
                                    </>
                                )}
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
                            <div className={styles.calendarWrapper} ref={datePickerRef}>
                                <div className={styles.dateGrid}>
                                    <div className={styles.formField}>
                                        <span>Check-in</span>
                                        <button
                                            type="button"
                                            className={`${styles.dateTriggerBtn} ${activeDatePicker === 'checkIn' ? styles.dateTriggerActive : ''}`}
                                            onClick={() => setActiveDatePicker(activeDatePicker === 'checkIn' ? null : 'checkIn')}
                                        >
                                            {checkIn ? formatDateDisplay(checkIn) : 'Add date'}
                                        </button>
                                    </div>
                                    <div className={styles.formField}>
                                        <span>Checkout</span>
                                        <button
                                            type="button"
                                            className={`${styles.dateTriggerBtn} ${activeDatePicker === 'checkOut' ? styles.dateTriggerActive : ''}`}
                                            onClick={() => setActiveDatePicker(activeDatePicker === 'checkOut' ? null : 'checkOut')}
                                        >
                                            {checkOut ? formatDateDisplay(checkOut) : 'Add date'}
                                        </button>
                                    </div>
                                </div>

                                {activeDatePicker && (
                                    <>
                                        <div className={styles.calendarBackdrop} onClick={() => setActiveDatePicker(null)} />
                                        <div className={styles.calendarPopover}>
                                        <div className={styles.calendarHeader}>
                                            <button
                                                type="button"
                                                className={styles.calendarNavBtn}
                                                onClick={handlePrevMonth}
                                                disabled={
                                                    calendarYear <= new Date().getFullYear() &&
                                                    calendarMonth <= new Date().getMonth()
                                                }
                                                aria-label="Previous month"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <span className={styles.calendarMonthTitle}>
                                                {new Date(calendarYear, calendarMonth).toLocaleDateString('en-IN', {
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                            <button
                                                type="button"
                                                className={styles.calendarNavBtn}
                                                onClick={handleNextMonth}
                                                aria-label="Next month"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>

                                        <div className={styles.weekdaysRow}>
                                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                                                <div key={d} className={styles.weekdayLabel}>{d}</div>
                                            ))}
                                        </div>

                                        <div className={styles.daysGrid}>
                                            {getDaysInMonth(calendarYear, calendarMonth).map((dayDate, idx) => {
                                                if (!dayDate) {
                                                    return <div key={`empty-${idx}`} />;
                                                }
                                                const dateStr = dateToInput(dayDate);
                                                const isSelectedStart = checkIn === dateStr;
                                                const isSelectedEnd = checkOut === dateStr;
                                                const isSelected = isSelectedStart || isSelectedEnd;
                                                const isInRange = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;
                                                const isDisabled = isDateDisabled(dayDate);

                                                return (
                                                    <button
                                                        key={dateStr}
                                                        type="button"
                                                        disabled={isDisabled}
                                                        className={`${styles.calendarDay} ${
                                                            isSelectedStart ? styles.calendarDayRangeStart : ''
                                                        } ${
                                                            isSelectedEnd ? styles.calendarDayRangeEnd : ''
                                                        } ${
                                                            isSelected && !isSelectedStart && !isSelectedEnd ? styles.calendarDaySelected : ''
                                                        } ${
                                                            isInRange ? styles.calendarDayInRange : ''
                                                        } ${
                                                            isDisabled ? styles.calendarDayDisabled : ''
                                                        }`}
                                                        onClick={() => handleSelectDay(dayDate)}
                                                    >
                                                        {dayDate.getUTCDate()}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className={styles.calendarFooter}>
                                            <button
                                                type="button"
                                                className={styles.calendarClearBtn}
                                                onClick={() => {
                                                    setCheckIn('');
                                                    setCheckOut('');
                                                    setActiveDatePicker('checkIn');
                                                }}
                                            >
                                                Clear
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.calendarTodayBtn}
                                                onClick={() => {
                                                    const today = new Date();
                                                    setCalendarYear(today.getUTCFullYear());
                                                    setCalendarMonth(today.getUTCMonth());
                                                }}
                                            >
                                                Today
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.calendarCloseBtn}
                                                onClick={() => setActiveDatePicker(null)}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            </div>

                            <div className={styles.formField}>
                                <span>Room type</span>
                                <div className={styles.customSelectContainer} ref={roomTypeDropdownRef}>
                                    <button
                                        type="button"
                                        className={styles.customSelectTrigger}
                                        onClick={() => setRoomTypeDropdownOpen(prev => !prev)}
                                    >
                                        <span>
                                            {selectedRoomType ? `${selectedRoomType.name} - ${formatPrice(selectedRoomType.pricePerNight, listing.currency)} / night` : 'Select room type'}
                                        </span>
                                        <ChevronDown size={14} className={`${styles.dropdownChevron} ${roomTypeDropdownOpen ? styles.chevronRotated : ''}`} />
                                    </button>

                                    {roomTypeDropdownOpen && (
                                        <div className={styles.customDropdownMenu}>
                                            {roomTypes.map((roomType) => {
                                                const isActive = selectedRoomTypeId === roomType.id;
                                                return (
                                                    <button
                                                        key={roomType.id}
                                                        type="button"
                                                        className={`${styles.customDropdownOption} ${isActive ? styles.optionActive : ''}`}
                                                        onClick={() => {
                                                            setSelectedRoomTypeId(roomType.id);
                                                            setRoomCount((current) => Math.min(current, roomType.totalCount));
                                                            setRoomTypeDropdownOpen(false);
                                                        }}
                                                    >
                                                        <span className={styles.optionName}>{roomType.name}</span>
                                                        <span className={styles.optionMeta}>
                                                            {formatPrice(roomType.pricePerNight, listing.currency)} / night ({roomType.totalCount} available)
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

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

                            <div className={styles.dateGrid}>
                                <label className={styles.formField}>
                                    <span>Rooms</span>
                                    <div className={styles.counterSelector}>
                                        <button
                                            type="button"
                                            className={styles.selectorBtn}
                                            onClick={() => setRoomCount(prev => Math.max(1, prev - 1))}
                                            disabled={roomCount <= 1}
                                            aria-label="Decrease rooms"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className={styles.selectorValueText}>
                                            {roomCount} room{roomCount > 1 ? 's' : ''}
                                        </span>
                                        <button
                                            type="button"
                                            className={styles.selectorBtn}
                                            onClick={() => setRoomCount(prev => Math.min(selectedRoomType?.totalCount ?? 1, prev + 1))}
                                            disabled={roomCount >= (selectedRoomType?.totalCount ?? 1)}
                                            aria-label="Increase rooms"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </label>

                                <label className={styles.formField}>
                                    <span>Guests</span>
                                    <div className={styles.counterSelector}>
                                        <button
                                            type="button"
                                            className={styles.selectorBtn}
                                            onClick={() => setGuestCount(prev => Math.max(1, prev - 1))}
                                            disabled={guestCount <= 1}
                                            aria-label="Decrease guests"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className={styles.selectorValueText}>
                                            {guestCount} guest{guestCount > 1 ? 's' : ''}
                                        </span>
                                        <button
                                            type="button"
                                            className={styles.selectorBtn}
                                            onClick={() => setGuestCount(prev => Math.min(guestLimit, prev + 1))}
                                            disabled={guestCount >= guestLimit}
                                            aria-label="Increase guests"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </label>
                            </div>

                            <button
                                type="button"
                                className={styles.reserveButton}
                                onClick={handleBooking}
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
                            {isOnSale && activeDrop && discountedNights > 0 ? (
                                <>
                                    {discountedNights > 0 && (
                                        <div className={styles.breakdownRow}>
                                            <span>
                                                {roomCount} {selectedRoomType?.name ?? 'room'} x {formatPrice(salePrice, listing.currency)} x {discountedNights} night{discountedNights > 1 ? 's' : ''} (Flash Sale)
                                            </span>
                                            <span>{formatPrice(salePrice * discountedNights * roomCount, listing.currency)}</span>
                                        </div>
                                    )}
                                    {regularNights > 0 && (
                                        <div className={styles.breakdownRow}>
                                            <span>
                                                {roomCount} {selectedRoomType?.name ?? 'room'} x {formatPrice(basePrice, listing.currency)} x {regularNights} night{regularNights > 1 ? 's' : ''} (Regular Rate)
                                            </span>
                                            <span>{formatPrice(basePrice * regularNights * roomCount, listing.currency)}</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className={styles.breakdownRow}>
                                    <span>
                                        {roomCount} {selectedRoomType?.name ?? 'room'} x {formatPrice(nightlyRate, listing.currency)} x {nights || 0} nights
                                    </span>
                                    <span>{formatPrice(subtotal, listing.currency)}</span>
                                </div>
                            )}
                            <div className={styles.breakdownRow}>
                                <span>GST (Taxes & Fees)</span>
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
