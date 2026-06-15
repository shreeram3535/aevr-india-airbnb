import { useEffect, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Clock3,
    ShieldCheck,
    Sparkles,
    X,
    BedDouble,
    Waves,
    Mountain,
    Home as HomeIcon,
    Rocket,
    Umbrella,
    Tractor,
    Minimize,
    Gem,
    Castle,
    Tent,
    Star,
    Mail,
    MessageCircle,
    Plus,
    Minus,
    Search,
    Building2,
    Compass,
    Leaf,
    Music,
    Users,
    Heart,
    MapPin,
    User,
    ChevronDown
} from 'lucide-react';
import styles from '../App.module.css'; // Reusing the grid styles from App module

import { ListingCard } from '../components/ListingCard';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { api } from '../services/api';
import type { FlashSaleDrop, Listing, ListingFilters, ListingSortOption } from '../types';

const SORT_OPTIONS: Array<{ value: ListingSortOption; label: string }> = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
    { value: 'rating_desc', label: 'Top rated' },
];

const FILTER_CATEGORIES = [
    { slug: 'icons', label: 'Icons', Icon: Star },
    { slug: 'rooms', label: 'Rooms', Icon: BedDouble },
    { slug: 'amazing-pools', label: 'Amazing pools', Icon: Waves },
    { slug: 'amazing-views', label: 'Amazing views', Icon: Mountain },
    { slug: 'cabins', label: 'Cabins', Icon: HomeIcon },
    { slug: 'omg', label: 'OMG!', Icon: Rocket },
    { slug: 'beachfront', label: 'Beachfront', Icon: Umbrella },
    { slug: 'farms', label: 'Farms', Icon: Tractor },
    { slug: 'tiny-homes', label: 'Tiny homes', Icon: Minimize },
    { slug: 'luxe', label: 'Luxe', Icon: Gem },
    { slug: 'castles', label: 'Castles', Icon: Castle },
    { slug: 'camping', label: 'Camping', Icon: Tent },
];

const BUDGET_MIN = 0;
const BUDGET_MAX = 50000;
const BUDGET_STEP = 1000;

const parseNumberParam = (value: string | null) => {
    if (!value) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const clampBudgetParam = (value: number | undefined) => {
    if (value === undefined) {
        return undefined;
    }

    return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, value));
};

const parseSortParam = (value: string | null): ListingSortOption => {
    if (value === 'price_asc' || value === 'price_desc' || value === 'rating_desc') {
        return value;
    }

    return 'recommended';
};

export const Home = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const categoryParam = searchParams.get('category');
    const luxurySection = searchParams.get('luxurySection') === '1';
    const categoryFilter = !luxurySection && categoryParam && categoryParam !== 'icons' ? categoryParam : undefined;
    const search = searchParams.get('search') ?? undefined;
    const sort = parseSortParam(searchParams.get('sort'));
    const minBudgetParam = clampBudgetParam(parseNumberParam(searchParams.get('minPrice')));
    const maxBudgetParam = clampBudgetParam(parseNumberParam(searchParams.get('maxPrice')));
    
    let budgetMinValue = minBudgetParam ?? BUDGET_MIN;
    let budgetMaxValue = maxBudgetParam ?? BUDGET_MAX;

    // Enforce a minimum gap of BUDGET_STEP to prevent overlap lock
    if (budgetMaxValue - budgetMinValue < BUDGET_STEP) {
        if (maxBudgetParam !== undefined && minBudgetParam === undefined) {
            budgetMinValue = Math.max(BUDGET_MIN, budgetMaxValue - BUDGET_STEP);
            if (budgetMaxValue - budgetMinValue < BUDGET_STEP) {
                budgetMaxValue = budgetMinValue + BUDGET_STEP;
            }
        } else {
            budgetMaxValue = Math.min(BUDGET_MAX, budgetMinValue + BUDGET_STEP);
            if (budgetMaxValue - budgetMinValue < BUDGET_STEP) {
                budgetMinValue = budgetMaxValue - BUDGET_STEP;
            }
        }
    }

    const minPrice = budgetMinValue > BUDGET_MIN ? budgetMinValue : undefined;
    const maxPrice = budgetMaxValue < BUDGET_MAX ? budgetMaxValue : undefined;
    const guests = parseNumberParam(searchParams.get('guests'));
    const bedrooms = parseNumberParam(searchParams.get('bedrooms'));
    const baths = parseNumberParam(searchParams.get('baths'));
    const guestFavoriteOnly = searchParams.get('favorites') === '1';

    const [listings, setListings] = useState<Listing[]>([]);
    const [activeDrop, setActiveDrop] = useState<FlashSaleDrop | null>(null);
    const [nowTs, setNowTs] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [listingError, setListingError] = useState<string | null>(null);

    const [heroSearchQuery, setHeroSearchQuery] = useState(searchParams.get('search') ?? '');
    const [heroGuests, setHeroGuests] = useState(searchParams.get('guests') ?? '');
    const [heroBedrooms, setHeroBedrooms] = useState(searchParams.get('bedrooms') ?? '');

    const [roomsOpen, setRoomsOpen] = useState(false);
    const [guestsOpen, setGuestsOpen] = useState(false);

    useEffect(() => {
        const handleCloseAll = () => {
            setRoomsOpen(false);
            setGuestsOpen(false);
        };
        document.addEventListener('click', handleCloseAll);
        return () => document.removeEventListener('click', handleCloseAll);
    }, []);

    const toggleRooms = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRoomsOpen(prev => !prev);
        setGuestsOpen(false);
    };

    const toggleGuests = (e: React.MouseEvent) => {
        e.stopPropagation();
        setGuestsOpen(prev => !prev);
        setRoomsOpen(false);
    };

    useEffect(() => {
        setHeroSearchQuery(searchParams.get('search') ?? '');
        setHeroGuests(searchParams.get('guests') ?? '');
        setHeroBedrooms(searchParams.get('bedrooms') ?? '');
    }, [searchParams]);

    const updateParams = (patch: Record<string, string | number | boolean | null | undefined>) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                params.delete(key);
                return;
            }

            params.set(key, String(value));
        });
        setSearchParams(params);
    };

    const handleHeroSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateParams({
            search: heroSearchQuery || null,
            guests: heroGuests || null,
            bedrooms: heroBedrooms || null,
        });
    };

    const handleSelectCategory = (id: string) => {
        const next = new URLSearchParams(searchParams);
        if (categoryParam === id) {
            next.delete('category');
        } else {
            next.delete('luxurySection');
            next.set('category', id);
        }
        setSearchParams(next);
    };

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams);
        ['category', 'luxurySection', 'sort', 'minPrice', 'maxPrice', 'guests', 'bedrooms', 'baths', 'favorites'].forEach((key) => params.delete(key));
        setSearchParams(params);
    };

    const toggleFavoritesOnly = () => {
        updateParams({ favorites: guestFavoriteOnly ? null : 1 });
    };

    const handleMinBudgetChange = (value: string) => {
        const valNum = Number(value);
        if (Number.isNaN(valNum)) return;
        const nextMinBudget = Math.min(valNum, budgetMaxValue - BUDGET_STEP);
        updateParams({ minPrice: nextMinBudget <= BUDGET_MIN ? null : nextMinBudget });
    };

    const handleMaxBudgetChange = (value: string) => {
        const valNum = Number(value);
        if (Number.isNaN(valNum)) return;
        const nextMaxBudget = Math.max(valNum, budgetMinValue + BUDGET_STEP);
        updateParams({ maxPrice: nextMaxBudget >= BUDGET_MAX ? null : nextMaxBudget });
    };

    const changeGuests = (delta: number) => {
        const nextVal = (guests ?? 0) + delta;
        updateParams({ guests: nextVal <= 0 ? null : nextVal });
    };

    const changeBedrooms = (delta: number) => {
        const nextVal = (bedrooms ?? 0) + delta;
        updateParams({ bedrooms: nextVal <= 0 ? null : nextVal });
    };

    const changeBaths = (delta: number) => {
        const nextVal = (baths ?? 0) + delta;
        updateParams({ baths: nextVal <= 0 ? null : nextVal });
    };

    const isMinSliderOnTop = budgetMinValue > BUDGET_MAX * 0.5;

    useEffect(() => {
        const loadListings = async () => {
            setLoading(true);
            setListingError(null);
            try {
                const filters: ListingFilters = {
                    category: categoryFilter,
                    luxurySection,
                    search,
                    sort,
                    minPrice,
                    maxPrice,
                    guests,
                    bedrooms,
                    baths,
                    guestFavoriteOnly,
                };
                const data = await api.fetchListings(filters);
                setListings(data);

                try {
                    const drop = await api.fetchActiveFlashDrop(new Date());
                    setActiveDrop(drop);
                } catch (flashSaleError) {
                    setActiveDrop(null);

                    if (import.meta.env.DEV) {
                        console.error(flashSaleError);
                    }
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Could not load listings from Supabase.';
                setListings([]);
                setActiveDrop(null);
                setListingError(message);

                if (import.meta.env.DEV) {
                    console.error(error);
                }
            } finally {
                setLoading(false);
            }
        };
        loadListings();
    }, [categoryFilter, luxurySection, search, sort, minPrice, maxPrice, guests, bedrooms, baths, guestFavoriteOnly]);

    const formatBudget = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);

    const budgetLabel = minPrice === undefined && maxPrice === undefined
        ? 'Any price'
        : `${formatBudget(minPrice ?? BUDGET_MIN)} - ${maxPrice === undefined ? 'Any price' : formatBudget(maxPrice)}`;
    const budgetMinProgress = `${((budgetMinValue - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%`;
    const budgetMaxProgress = `${((budgetMaxValue - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%`;

    useEffect(() => {
        const id = window.setInterval(() => setNowTs(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const activeFiltersCount = [
        Boolean(categoryFilter),
        luxurySection,
        sort !== 'recommended',
        minPrice !== undefined,
        maxPrice !== undefined,
        guests !== undefined,
        bedrooms !== undefined,
        baths !== undefined,
        guestFavoriteOnly,
    ].filter(Boolean).length;

    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const handleToggle = () => {
            setShowFilters((prev) => !prev);
        };
        window.addEventListener('toggle-filters', handleToggle);
        return () => window.removeEventListener('toggle-filters', handleToggle);
    }, []);

    useEffect(() => {
        if (searchParams.get('showFilters') === 'true') {
            setShowFilters(true);
            const next = new URLSearchParams(searchParams);
            next.delete('showFilters');
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const remainingMs = activeDrop ? new Date(activeDrop.endAt).getTime() - nowTs : 0;
    const hasActiveDrop = Boolean(activeDrop && remainingMs > 0);
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    const countdown = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return (
        <>
            <div className={styles.heroSection}>
                <div className={styles.heroOverlay} />
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        Experience India's Finest Stays
                    </h1>
                    
                    <p className={styles.heroSubtitle}>
                        <span className={styles.coastalBlueText}>Bespoke Villas.</span> Timeless Memories.
                    </p>
                    <p className={styles.heroDescription}>
                        Explore curated private estates, heritage havelis, and luxury retreats.
                    </p>

                    <div className={styles.heroSearchContainer}>
                        <form className={styles.heroSearchForm} onSubmit={handleHeroSearch}>
                            <div className={`${styles.searchField} ${styles.destinationField}`}>
                                <MapPin size={20} className={styles.searchFieldIcon} />
                                <div className={styles.searchFieldTextGroup}>
                                    <label className={styles.searchFieldLabel} htmlFor="hero-destination">Where to?</label>
                                    <div className={styles.inputDropdownWrapper}>
                                        <input
                                            id="hero-destination"
                                            type="text"
                                            placeholder="Search destinations"
                                            value={heroSearchQuery}
                                            onChange={(e) => setHeroSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.searchDivider} />
                            <div 
                                className={`${styles.searchField} ${styles.interactiveField}`} 
                                onClick={toggleRooms}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setRoomsOpen(prev => !prev); setGuestsOpen(false); } }}
                            >
                                <BedDouble size={20} className={styles.searchFieldIcon} />
                                <div className={styles.searchFieldTextGroup}>
                                    <span className={styles.searchFieldLabel}>Rooms</span>
                                    <div className={styles.customSelectTrigger}>
                                        <span className={styles.customSelectValue}>
                                            {heroBedrooms ? (heroBedrooms === '5' ? '5+ rooms' : `${heroBedrooms} room${heroBedrooms === '1' ? '' : 's'}`) : 'Add rooms'}
                                        </span>
                                        <ChevronDown size={14} className={`${styles.selectChevron} ${roomsOpen ? styles.chevronRotated : ''}`} />
                                    </div>
                                </div>
                                {roomsOpen && (
                                    <div className={styles.customDropdownMenu} onClick={(e) => e.stopPropagation()}>
                                        {[
                                            { value: '', label: 'Add rooms' },
                                            { value: '1', label: '1 room' },
                                            { value: '2', label: '2 rooms' },
                                            { value: '3', label: '3 rooms' },
                                            { value: '4', label: '4 rooms' },
                                            { value: '5', label: '5+ rooms' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`${styles.customDropdownOption} ${heroBedrooms === opt.value ? styles.optionActive : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHeroBedrooms(opt.value);
                                                    setRoomsOpen(false);
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={styles.searchDivider} />
                            <div 
                                className={`${styles.searchField} ${styles.interactiveField}`} 
                                onClick={toggleGuests}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setGuestsOpen(prev => !prev); setRoomsOpen(false); } }}
                            >
                                <User size={20} className={styles.searchFieldIcon} />
                                <div className={styles.searchFieldTextGroup}>
                                    <span className={styles.searchFieldLabel}>Guests</span>
                                    <div className={styles.customSelectTrigger}>
                                        <span className={styles.customSelectValue}>
                                            {heroGuests ? (heroGuests === '6' ? '6+ guests' : `${heroGuests} guest${heroGuests === '1' ? '' : 's'}`) : 'Add guests'}
                                        </span>
                                        <ChevronDown size={14} className={`${styles.selectChevron} ${guestsOpen ? styles.chevronRotated : ''}`} />
                                    </div>
                                </div>
                                {guestsOpen && (
                                    <div className={styles.customDropdownMenu} onClick={(e) => e.stopPropagation()}>
                                        {[
                                            { value: '', label: 'Add guests' },
                                            { value: '1', label: '1 guest' },
                                            { value: '2', label: '2 guests' },
                                            { value: '3', label: '3 guests' },
                                            { value: '4', label: '4 guests' },
                                            { value: '6', label: '6+ guests' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`${styles.customDropdownOption} ${heroGuests === opt.value ? styles.optionActive : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHeroGuests(opt.value);
                                                    setGuestsOpen(false);
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button type="submit" className={styles.heroSearchButton} aria-label="Search">
                                <Search size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

                {/* Mode toggle: Aevr / Aevr Luxe (placed below stats) */}
                <div className={styles.homeModeToggle}>
                    <div className={`${styles.sliderIndicator} ${luxurySection ? styles.sliderIndicatorLuxe : ''}`} />
                    <button
                        type="button"
                        className={`${styles.modeButton} ${!luxurySection ? styles.modeButtonActive : ''}`}
                        onClick={() => {
                            const next = new URLSearchParams(searchParams);
                            next.delete('luxurySection');
                            next.delete('category');
                            setSearchParams(next);
                        }}
                    >
                        Aevr
                    </button>
                    <button
                        type="button"
                        className={`${styles.modeButton} ${luxurySection ? `${styles.modeButtonActive} ${styles.modeButtonActiveLuxe}` : ''}`}
                        onClick={() => {
                            const next = new URLSearchParams(searchParams);
                            next.delete('category');
                            next.set('luxurySection', '1');
                            setSearchParams(next);
                        }}
                    >
                        Aevr Luxe
                    </button>
                </div>

            <main className={`${styles.homeMainContainer} ${luxurySection ? styles.homeModeLuxe : styles.homeModeAevr}`}>
                {hasActiveDrop && activeDrop && (
                    <section className={styles.flashSaleCard}>
                        <img
                            className={styles.flashSaleImage}
                            src={activeDrop.listing.images[0] ?? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop'}
                            alt={activeDrop.listing.title}
                        />
                        <div className={styles.flashSaleBody}>
                            <div className={styles.flashSaleMeta}>
                                <span className={styles.flashSaleBadge}>
                                    <ShieldCheck size={14} /> Verified by AevrLux
                                </span>
                                <span className={styles.flashSaleTimer}>
                                    <Clock3 size={14} /> {countdown}
                                </span>
                            </div>
                            <h2>{activeDrop.listing.title}</h2>
                            <p>{activeDrop.listing.location.city}, {activeDrop.listing.location.country}</p>
                            <div className={styles.flashSalePricing}>
                                <span className={styles.flashOldPrice}>₹{Math.round(activeDrop.listing.price).toLocaleString('en-IN')}</span>
                                <strong>₹{Math.round(activeDrop.salePrice).toLocaleString('en-IN')}</strong>
                                <span className={styles.flashDiscount}>{Math.round(activeDrop.discountPercent)}% OFF</span>
                            </div>
                            <a className={styles.flashSaleCta} href={`/rooms/${activeDrop.listing.id}`}>View drop</a>
                        </div>
                    </section>
                )}

                {luxurySection ? (
                    <section className={`${styles.modeDescriptionCard} ${styles.modeDescriptionCardLuxe}`}>
                        <span className={styles.modeDescBadge}>Aevr Luxe</span>
                        <h2 className={`${styles.modeDescTitle} ${styles.modeDescTitleLuxe}`}>Discover premium villas & luxury stays</h2>
                        <p className={styles.modeDescText}>Step into a world of iconic estates and unforgettable retreats, curated for guests who seek the rare and refined.</p>
                    </section>
                ) : (
                    <section className={styles.modeDescriptionCard}>
                        <h2 className={styles.modeDescTitle}>Explore Our Curated Villas</h2>
                        <p className={styles.modeDescText}>Discover beautiful homes and authentic experiences handpicked for discerning travelers.</p>
                    </section>
                )}

            {showFilters && (
                <div className={styles.modalBackdrop} onClick={() => setShowFilters(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <button className={styles.closeModalButton} onClick={() => setShowFilters(false)} aria-label="Close filters">
                                <X size={18} />
                            </button>
                            <h2>Filters</h2>
                            <div style={{ width: 18 }} />
                        </div>

                        <div className={styles.modalBody}>
                            {/* Sort Section */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterSectionHeader}>
                                    <h3>Sort Stays</h3>
                                    <p>Choose how listings are ordered in your results</p>
                                </div>
                                <div className={styles.sortOptionsPills}>
                                    {SORT_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`${styles.sortPill} ${sort === option.value ? styles.sortPillActive : ''}`}
                                            onClick={() => updateParams({ sort: option.value })}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range / Budget Section */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterSectionHeader}>
                                    <h3>Budget</h3>
                                    <p>Nightly prices before taxes and additional fees</p>
                                </div>
                                <div className={styles.budgetSliderShell}>
                                    <div className={styles.budgetValueRow}>
                                        <strong className={styles.budgetValue}>{budgetLabel}</strong>
                                        <span>/night</span>
                                    </div>
                                    <div
                                        className={styles.budgetRange}
                                        style={{
                                            '--budget-min-progress': budgetMinProgress,
                                            '--budget-max-progress': budgetMaxProgress,
                                        } as CSSProperties}
                                    >
                                        <input
                                            aria-label="Minimum nightly budget"
                                            className={`${styles.budgetSlider} ${styles.budgetSliderMin}`}
                                            type="range"
                                            min={BUDGET_MIN}
                                            max={BUDGET_MAX}
                                            step={BUDGET_STEP}
                                            value={budgetMinValue}
                                            onChange={(e) => handleMinBudgetChange(e.target.value)}
                                            style={{ zIndex: isMinSliderOnTop ? 3 : 4 }}
                                        />
                                        <input
                                            aria-label="Maximum nightly budget"
                                            className={`${styles.budgetSlider} ${styles.budgetSliderMax}`}
                                            type="range"
                                            min={BUDGET_MIN}
                                            max={BUDGET_MAX}
                                            step={BUDGET_STEP}
                                            value={budgetMaxValue}
                                            onChange={(e) => handleMaxBudgetChange(e.target.value)}
                                            style={{ zIndex: isMinSliderOnTop ? 4 : 3 }}
                                        />
                                    </div>
                                </div>

                                <div className={styles.priceInputRow}>
                                    <div className={styles.priceInputContainer}>
                                        <span className={styles.priceInputLabel}>min price</span>
                                        <div className={styles.priceInputInner}>
                                            <span className={styles.currencyPrefix}>₹</span>
                                            <input
                                                type="number"
                                                min={BUDGET_MIN}
                                                max={BUDGET_MAX}
                                                value={minPrice ?? BUDGET_MIN}
                                                onChange={(e) => handleMinBudgetChange(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.priceInputDivider}>–</div>
                                    <div className={styles.priceInputContainer}>
                                        <span className={styles.priceInputLabel}>max price</span>
                                        <div className={styles.priceInputInner}>
                                            <span className={styles.currencyPrefix}>₹</span>
                                            <input
                                                type="number"
                                                min={BUDGET_MIN}
                                                max={BUDGET_MAX}
                                                value={maxPrice ?? BUDGET_MAX}
                                                onChange={(e) => handleMaxBudgetChange(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.quickChips}>
                                    <button type="button" className={styles.quickChip} onClick={() => updateParams({ minPrice: null, maxPrice: 5000 })}>
                                        Under ₹5k
                                    </button>
                                    <button type="button" className={styles.quickChip} onClick={() => updateParams({ minPrice: null, maxPrice: 10000 })}>
                                        Under ₹10k
                                    </button>
                                </div>
                            </div>

                            {/* Rooms and Beds Increment/Decrement Section */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterSectionHeader}>
                                    <h3>Rooms and Beds</h3>
                                    <p>Specify the required space and capacity for your group</p>
                                </div>
                                <div className={styles.countersContainer}>
                                    <div className={styles.counterControl}>
                                        <div className={styles.counterLabel}>
                                            <strong>Guests</strong>
                                            <span>Number of total guests</span>
                                        </div>
                                        <div className={styles.counterActions}>
                                            <button
                                                type="button"
                                                onClick={() => changeGuests(-1)}
                                                disabled={!guests}
                                                className={styles.counterBtn}
                                                aria-label="Decrease guests"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className={styles.counterValue}>{guests ?? 'Any'}</span>
                                            <button
                                                type="button"
                                                onClick={() => changeGuests(1)}
                                                className={styles.counterBtn}
                                                aria-label="Increase guests"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.counterControl}>
                                        <div className={styles.counterLabel}>
                                            <strong>Bedrooms</strong>
                                            <span>Number of bedrooms needed</span>
                                        </div>
                                        <div className={styles.counterActions}>
                                            <button
                                                type="button"
                                                onClick={() => changeBedrooms(-1)}
                                                disabled={!bedrooms}
                                                className={styles.counterBtn}
                                                aria-label="Decrease bedrooms"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className={styles.counterValue}>{bedrooms ?? 'Any'}</span>
                                            <button
                                                type="button"
                                                onClick={() => changeBedrooms(1)}
                                                className={styles.counterBtn}
                                                aria-label="Increase bedrooms"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.counterControl}>
                                        <div className={styles.counterLabel}>
                                            <strong>Bathrooms</strong>
                                            <span>Number of bathrooms needed</span>
                                        </div>
                                        <div className={styles.counterActions}>
                                            <button
                                                type="button"
                                                onClick={() => changeBaths(-1)}
                                                disabled={!baths}
                                                className={styles.counterBtn}
                                                aria-label="Decrease bathrooms"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className={styles.counterValue}>{baths ?? 'Any'}</span>
                                            <button
                                                type="button"
                                                onClick={() => changeBaths(1)}
                                                className={styles.counterBtn}
                                                aria-label="Increase bathrooms"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Property Category Selection Section */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterSectionHeader}>
                                    <h3>Property Styles</h3>
                                    <p>Select category to match your specific style preference</p>
                                </div>
                                <div className={styles.categoryFilterPills}>
                                    {FILTER_CATEGORIES.map((cat) => {
                                        const Icon = cat.Icon;
                                        const isActive = categoryParam === cat.slug;
                                        return (
                                            <button
                                                key={cat.slug}
                                                type="button"
                                                className={`${styles.categoryFilterPill} ${isActive ? styles.categoryFilterPillActive : ''}`}
                                                onClick={() => handleSelectCategory(cat.slug)}
                                            >
                                                <Icon size={14} />
                                                <span>{cat.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Guest Favorites toggle */}
                            <div className={styles.filterSection}>
                                <div className={styles.toggleRow}>
                                    <div className={styles.toggleLabel}>
                                        <h3>Guest favorites</h3>
                                        <p>Stays that guests love most, rated 4.9+ stars</p>
                                    </div>
                                    <button
                                        type="button"
                                        className={`${styles.favoriteToggle} ${guestFavoriteOnly ? styles.favoriteToggleActive : ''}`}
                                        onClick={toggleFavoritesOnly}
                                    >
                                        <Sparkles size={14} />
                                        <span>Guest favorites</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button type="button" className={styles.clearAllButton} onClick={clearFilters} disabled={activeFiltersCount === 0}>
                                Clear all
                            </button>
                            <button type="button" className={styles.showStaysButton} onClick={() => setShowFilters(false)}>
                                {loading ? 'Loading...' : `Show ${listings.length} stay${listings.length === 1 ? '' : 's'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

                {loading ? (
                    <SkeletonScreen variant="listing-grid" />
                ) : listingError ? (
                    <div className={`${styles.emptyState} ${styles.debugErrorState}`} role="status">
                        <h2>Listings could not load</h2>
                        <p>{listingError}</p>
                    </div>
                ) : listings.length > 0 ? (
                    <>
                        <div className={styles.sectionHeaderRow}>
                            <h2 className={styles.sectionHeading}>{luxurySection ? 'Aevr Luxe stays' : 'Featured stays'}</h2>
                        </div>
                        <div className={styles.grid}>
                            {listings.map((listing) => (
                                <ListingCard key={listing.id} listing={listing} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <h2>No listings found</h2>
                        <p>Try loosening a filter, switching category, or clearing filters.</p>
                    </div>
                )}
            </main>

            <section className={styles.bottomDashboardSection}>
                <div className={styles.bottomDashboardContainer}>
                    {/* Card 1: Explore by mood */}
                    <div className={styles.dashboardCard}>
                        <h2 className={styles.dashboardCardTitle}>Explore by mood</h2>
                        <div className={styles.moodGrid}>
                            <button type="button" className={styles.moodItem} onClick={() => updateParams({ category: 'amazing-views' })}>
                                <div className={styles.moodIconWrapper}>
                                    <Mountain size={20} />
                                </div>
                                <span className={styles.moodLabel}>Mountains</span>
                            </button>
                            <button type="button" className={styles.moodItem} onClick={() => updateParams({ category: 'beachfront' })}>
                                <div className={styles.moodIconWrapper}>
                                    <Umbrella size={20} />
                                </div>
                                <span className={styles.moodLabel}>Beach</span>
                            </button>
                            <button type="button" className={styles.moodItem} onClick={() => updateParams({ category: 'farms' })}>
                                <div className={styles.moodIconWrapper}>
                                    <Leaf size={20} />
                                </div>
                                <span className={styles.moodLabel}>Nature</span>
                            </button>
                            <button type="button" className={styles.moodItem} onClick={() => updateParams({ category: 'omg' })}>
                                <div className={styles.moodIconWrapper}>
                                    <Music size={20} />
                                </div>
                                <span className={styles.moodLabel}>Party</span>
                            </button>
                            <button type="button" className={styles.moodItem} onClick={() => updateParams({ category: 'luxe' })}>
                                <div className={styles.moodIconWrapper}>
                                    <Heart size={20} />
                                </div>
                                <span className={styles.moodLabel}>Couple</span>
                            </button>
                            <button type="button" className={styles.moodItem} onClick={() => updateParams({ guests: 4 })}>
                                <div className={styles.moodIconWrapper}>
                                    <Users size={20} />
                                </div>
                                <span className={styles.moodLabel}>Family</span>
                            </button>
                        </div>
                    </div>

                    {/* Card 2: Why choose AEVR? */}
                    <div className={styles.dashboardCard}>
                        <h2 className={styles.dashboardCardTitle}>Why choose AEVR?</h2>
                        <div className={styles.compactFeaturesGrid}>
                            <div className={styles.featureItem}>
                                <Building2 className={styles.featureIcon} size={20} />
                                <div className={styles.featureTextGroup}>
                                    <h3 className={styles.featureTitle}>Curated Stays</h3>
                                    <p className={styles.featureDescription}>Handpicked villas for quality & comfort</p>
                                </div>
                            </div>
                            <div className={styles.featureItem}>
                                <Sparkles className={styles.featureIcon} size={20} />
                                <div className={styles.featureTextGroup}>
                                    <h3 className={styles.featureTitle}>Best Prices</h3>
                                    <p className={styles.featureDescription}>Transparent pricing with no hidden fees</p>
                                </div>
                            </div>
                            <div className={styles.featureItem}>
                                <Compass className={styles.featureIcon} size={20} />
                                <div className={styles.featureTextGroup}>
                                    <h3 className={styles.featureTitle}>Local Experiences</h3>
                                    <p className={styles.featureDescription}>Discover like a local with curated guides</p>
                                </div>
                            </div>
                            <div className={styles.featureItem}>
                                <ShieldCheck className={styles.featureIcon} size={20} />
                                <div className={styles.featureTextGroup}>
                                    <h3 className={styles.featureTitle}>Safe & Secure</h3>
                                    <p className={styles.featureDescription}>Trusted by 1000+ families</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: CTA Card */}
                    <div className={`${styles.dashboardCard} ${styles.ctaDashboardCard}`}>
                        <div className={styles.ctaCardBgImage} style={{ backgroundImage: `url('/coastal_calm_hero.png')` }} />
                        <div className={styles.ctaCardOverlay} />
                        <div className={styles.ctaCardContent}>
                            <h2 className={styles.ctaCardTitle}>Your dream stay is a search away</h2>
                            <button 
                                type="button" 
                                className={styles.ctaCardButton}
                                onClick={() => {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            >
                                Explore Stays
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <div className={styles.contactFloatGroup}>
                <a
                    className={`${styles.contactFloatButton} ${styles.whatsappFloat}`}
                    href="https://wa.me/918890807482"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Message on WhatsApp"
                >
                    <img src="/whatsapp.svg" alt="" aria-hidden="true" />
                </a>
                <a
                    className={`${styles.contactFloatButton} ${styles.emailFloat}`}
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=Aevrindia%40gmail.com"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Email Aevrindia@gmail.com"
                >
                    <Mail size={30} aria-hidden="true" />
                </a>
                <a
                    className={`${styles.contactFloatButton} ${styles.instagramFloat}`}
                    href="https://www.instagram.com/aevrindia?igsh=c2dna3Z3Zm5hN293"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open Aevr India on Instagram"
                >
                    <img src="/instagram.svg" alt="" aria-hidden="true" />
                </a>
                <button
                    className={`${styles.contactFloatButton} ${styles.chatFloat}`}
                    type="button"
                    aria-label="Open contact options"
                >
                    <MessageCircle size={30} aria-hidden="true" />
                </button>
            </div>
        </>
    );
};
