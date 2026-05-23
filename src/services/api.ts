import type {
    CategoriesResponse,
    ListingsResponse,
    Listing,
    CreateListingInput,
    ListingFilters,
    ListingSortOption,
    UpdateListingInput,
    AvailabilityBlock,
    AvailabilityBlockStatus,
    Booking,
    BookingHistoryItem,
    RoomType,
    FlashSaleDrop,
    FlashSaleType,
    GuestVerificationUser,
    HostApprovalApplication,
    HostApprovalStatus,
    UpsertFlashSaleInput,
} from '../types';
import { supabase } from './supabase';

const DELAY_MS = 800;

type JoinedEntity<T> = T | T[] | null;

type SupabaseCategoryRow = {
    id: string;
    slug: string;
    label: string;
    icon_name: string;
    is_active: boolean;
};

type SupabaseListingRow = {
    id: string;
    host_id?: string;
    map_link?: string | null;
    title: string;
    description: string;
    price_per_night: number;
    currency: string;
    rating: number | null;
    review_count: number | null;
    is_guest_favorite: boolean;
    availability_summary: string | null;
    city: string;
    country: string;
    lat: number;
    lng: number;
    guest_count_max: number | null;
    bedrooms: number | null;
    beds: number | null;
    baths: number | null;
    is_active: boolean;
    room_types: unknown | null;
    category: JoinedEntity<{
        id: string;
        slug: string;
        label: string;
        icon_name: string;
    }>;
    host: JoinedEntity<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        is_superhost: boolean;
        bio: string | null;
    }>;
    listing_images: Array<{
        image_url: string;
        sort_order: number | null;
        alt_text: string | null;
    }> | null;
    listing_amenities: Array<{
        amenity: {
            label: string;
        } | null;
    }> | null;
};

type SupabaseAvailabilityBlockRow = {
    id: string;
    listing_id: string;
    start_date: string;
    end_date: string;
    reason: string | null;
};

type SupabaseBookingRow = {
    id: string;
    listing_id: string;
    guest_id: string;
    check_in: string;
    check_out: string;
    guest_count: number;
    room_type_name: string | null;
    room_type_price: number | string | null;
    room_count: number | null;
    subtotal: string | number;
    fees: string | number;
    taxes: string | number;
    total: string | number;
    status: Booking['status'];
    created_at: string;
    listing: JoinedEntity<{
        id: string;
        title: string;
        city: string;
        country: string;
        price_per_night: number;
        currency: string;
        listing_images: Array<{ image_url: string; sort_order: number | null }> | null;
    }>;
};

type SupabaseFlashSaleRow = {
    id: string;
    listing_id: string;
    sale_type: FlashSaleType;
    sale_value: number | string;
    start_at: string;
    end_at: string;
    is_active: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
    listing: JoinedEntity<SupabaseListingRow>;
};

type SupabaseProfileRow = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email?: string | null;
    role: 'guest' | 'host' | 'admin';
    is_verified_guest?: boolean | null;
    host_approval_status: HostApprovalStatus | null;
    host_reviewed_at: string | null;
    host_reviewed_by: string | null;
    host_review_note: string | null;
    created_at: string;
};

export type CurrentUserSummary = {
    id: string;
    name: string;
    role: 'guest' | 'host' | 'admin';
    isVerifiedGuest: boolean;
    avatarUrl?: string | null;
};

const LISTING_SELECT = `
    host_id,
    id,
    map_link,
    title,
    description,
    price_per_night,
    currency,
    rating,
    review_count,
    is_guest_favorite,
    availability_summary,
    room_types,
    city,
    country,
    lat,
    lng,
    guest_count_max,
    bedrooms,
    beds,
    baths,
    is_active,
    category:categories (
        id,
        slug,
        label,
        icon_name
    ),
    host:profiles!host_id (
        id,
        full_name,
        avatar_url,
        is_superhost,
        bio
    ),
    listing_images (
        image_url,
        sort_order,
        alt_text
    ),
    listing_amenities (
        amenity:amenities (
            label
        )
    )
`;

const first = <T,>(value: JoinedEntity<T>): T | null => {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }

    return value;
};

const normalizeRoomTypes = (value: unknown): RoomType[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item, index): RoomType | null => {
            if (!item || typeof item !== 'object') {
                return null;
            }

            const record = item as Record<string, unknown>;
            const name = typeof record.name === 'string' ? record.name.trim() : '';
            const pricePerNight = Number(record.pricePerNight ?? record.price_per_night ?? 0);
            const totalCount = Number(record.totalCount ?? record.total_count ?? 0);

            if (!name || !Number.isFinite(pricePerNight) || pricePerNight <= 0 || !Number.isFinite(totalCount) || totalCount <= 0) {
                return null;
            }

            const roomType: RoomType = {
                id: typeof record.id === 'string' && record.id ? record.id : `${index}-${name.toLowerCase().replace(/\s+/g, '-')}`,
                name,
                pricePerNight,
                totalCount,
            };

            const maxGuests = Number(record.maxGuests ?? record.max_guests);
            if (Number.isFinite(maxGuests)) {
                roomType.maxGuests = maxGuests;
            }

            const beds = Number(record.beds);
            if (Number.isFinite(beds)) {
                roomType.beds = beds;
            }

            if (typeof record.description === 'string' && record.description.trim()) {
                roomType.description = record.description.trim();
            }

            const photos = Array.isArray(record.photos)
                ? record.photos.filter((photo): photo is string => typeof photo === 'string' && photo.trim().length > 0)
                : [];
            if (photos.length > 0) {
                roomType.photos = photos;
            }

            return roomType;
        })
        .filter((item): item is RoomType => item !== null);
};

const serializeRoomTypes = (roomTypes: RoomType[]) =>
    roomTypes.map((roomType) => ({
        id: roomType.id,
        name: roomType.name,
        pricePerNight: roomType.pricePerNight,
        totalCount: roomType.totalCount,
        maxGuests: roomType.maxGuests ?? null,
        beds: roomType.beds ?? null,
        description: roomType.description ?? null,
        photos: roomType.photos ?? [],
    }));

const mapListing = (row: SupabaseListingRow): Listing => {
    const category = first(row.category);
    const host = first(row.host);
    const images = (row.listing_images ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((image) => image.image_url);

    const amenities = (row.listing_amenities ?? [])
        .map((entry) => entry.amenity?.label)
        .filter((label): label is string => Boolean(label));
    const roomTypes = normalizeRoomTypes(row.room_types);

    return {
        id: row.id,
        hostId: row.host_id,
        title: row.title,
        description: row.description,
        price: row.price_per_night,
        currency: row.currency,
        rating: row.rating ?? 0,
        reviewCount: row.review_count ?? 0,
        images,
        location: {
            id: row.id,
            city: row.city,
            country: row.country,
            lat: row.lat,
            lng: row.lng,
        },
        category: category?.slug ?? 'icons',
        categoryLabel: category?.label ?? undefined,
        host: {
            id: host?.id ?? '',
            name: host?.full_name ?? 'Host',
            avatarUrl: host?.avatar_url ?? '',
            isSuperhost: host?.is_superhost ?? false,
            bio: host?.bio ?? undefined,
        },
        amenities,
        isGuestFavorite: row.is_guest_favorite,
        availableDates: row.availability_summary ?? 'Flexible dates',
        guestCountMax: row.guest_count_max ?? undefined,
        bedrooms: row.bedrooms ?? undefined,
        beds: row.beds ?? undefined,
        baths: row.baths ?? undefined,
        availabilitySummary: row.availability_summary ?? undefined,
        roomTypes,
        mapLink: row.map_link ?? undefined,
    };
};

const mapAvailabilityBlock = (row: SupabaseAvailabilityBlockRow): AvailabilityBlock => {
    const reason = row.reason?.trim().toLowerCase();
    const status: AvailabilityBlockStatus = reason === 'restricted' ? 'restricted' : 'booked';

    return {
        id: row.id,
        listingId: row.listing_id,
        startDate: row.start_date,
        endDate: row.end_date,
        status,
        reason: row.reason ?? undefined,
    };
};

const mapBooking = (row: SupabaseBookingRow): BookingHistoryItem => {
    const listing = first(row.listing);
    const imageUrl = (listing?.listing_images ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]?.image_url;

    return {
        id: row.id,
        listingId: row.listing_id,
        guestId: row.guest_id,
        checkIn: row.check_in,
        checkOut: row.check_out,
        guestCount: row.guest_count,
        roomTypeName: row.room_type_name ?? undefined,
        roomTypePrice: row.room_type_price != null ? Number(row.room_type_price) : undefined,
        roomCount: row.room_count ?? undefined,
        subtotal: Number(row.subtotal),
        fees: Number(row.fees),
        taxes: Number(row.taxes),
        total: Number(row.total),
        status: row.status,
        createdAt: row.created_at,
        listing: {
            id: listing?.id ?? row.listing_id,
            title: listing?.title ?? 'Listing',
            city: listing?.city ?? '',
            country: listing?.country ?? '',
            price: listing?.price_per_night ?? 0,
            currency: listing?.currency ?? 'INR',
            imageUrl,
        },
    };
};

const calculateFlashSalePrice = (listingPrice: number, saleType: FlashSaleType, saleValue: number) => {
    if (saleType === 'percent') {
        const discountPercent = Math.max(1, Math.min(99, saleValue));
        const salePrice = Math.max(1, listingPrice * (1 - discountPercent / 100));
        return { salePrice, discountPercent };
    }

    const salePrice = Math.max(1, saleValue);
    const discountPercent = listingPrice > 0
        ? Math.max(0, Math.min(99, ((listingPrice - salePrice) / listingPrice) * 100))
        : 0;
    return { salePrice, discountPercent };
};

const mapFlashSale = (row: SupabaseFlashSaleRow): FlashSaleDrop | null => {
    const listingRow = first(row.listing);
    if (!listingRow) {
        return null;
    }
    const listing = mapListing(listingRow);
    const saleValue = Number(row.sale_value);
    const { salePrice, discountPercent } = calculateFlashSalePrice(listing.price, row.sale_type, saleValue);

    return {
        id: row.id,
        listingId: row.listing_id,
        listing,
        saleType: row.sale_type,
        saleValue,
        startAt: row.start_at,
        endAt: row.end_at,
        isActive: row.is_active,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        salePrice,
        discountPercent,
    };
};

const FLASH_SALE_SELECT = `
    id,
    listing_id,
    sale_type,
    sale_value,
    start_at,
    end_at,
    is_active,
    created_by,
    created_at,
    updated_at,
    listing:listings (
        ${LISTING_SELECT}
    )
`;

const fetchActiveFlashDrop = async (nowIso: string): Promise<FlashSaleDrop | null> => {
    if (!supabase) {
        return null;
    }

    const { data, error } = await supabase
        .from('flash_sale_drops')
        .select(FLASH_SALE_SELECT)
        .eq('is_active', true)
        .lte('start_at', nowIso)
        .gt('end_at', nowIso)
        .order('start_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return mapFlashSale(data as unknown as SupabaseFlashSaleRow);
};

const fetchLatestAdminFlashDrop = async (): Promise<FlashSaleDrop | null> => {
    if (!supabase) {
        return null;
    }

    const { data, error } = await supabase
        .from('flash_sale_drops')
        .select(FLASH_SALE_SELECT)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return mapFlashSale(data as unknown as SupabaseFlashSaleRow);
};

const fetchCurrentProfileBasic = async (): Promise<Pick<SupabaseProfileRow, 'id' | 'full_name' | 'avatar_url' | 'role' | 'is_verified_guest'> | null> => {
    if (!supabase) {
        return null;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
        return null;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, is_verified_guest')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (!error && data) {
        return data as Pick<SupabaseProfileRow, 'id' | 'full_name' | 'avatar_url' | 'role' | 'is_verified_guest'>;
    }

    const { data: fallbackData, error: fallbackError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (fallbackError || !fallbackData) {
        return null;
    }

    return {
        ...(fallbackData as Pick<SupabaseProfileRow, 'id' | 'full_name' | 'avatar_url' | 'role'>),
        is_verified_guest: false,
    };
};

const fetchHostApprovalStatusFromProfile = async (): Promise<HostApprovalStatus | null> => {
    if (!supabase) {
        return null;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
        return null;
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('role, host_approval_status')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (!error && data) {
        const row = data as { role?: 'guest' | 'host' | 'admin'; host_approval_status?: HostApprovalStatus | null };
        if (row.role !== 'host') {
            return null;
        }
        return row.host_approval_status ?? 'pending';
    }

    // Fallback for DBs where host_approval_status column isn't migrated yet.
    const basic = await fetchCurrentProfileBasic();
    if (!basic || basic.role !== 'host') {
        return null;
    }
    return 'approved';
};

const fetchSupabaseCategories = async (): Promise<CategoriesResponse> => {
    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase
        .from('categories')
        .select('id, slug, label, icon_name, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error || !data) {
        return [];
    }

    return (data as SupabaseCategoryRow[]).map((category) => ({
        id: category.slug,
        slug: category.slug,
        label: category.label,
        iconName: category.icon_name,
    }));
};

const resolveCategoryId = async (slug: string): Promise<string | null> => {
    if (!supabase || slug === 'icons') {
        return null;
    }

    const { data, error } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return data.id;
};

const sortListingRows = (rows: SupabaseListingRow[], sort: ListingSortOption) => {
    const byPriceAsc = (a: SupabaseListingRow, b: SupabaseListingRow) => (a.price_per_night ?? 0) - (b.price_per_night ?? 0);
    const byPriceDesc = (a: SupabaseListingRow, b: SupabaseListingRow) => (b.price_per_night ?? 0) - (a.price_per_night ?? 0);
    const byRatingDesc = (a: SupabaseListingRow, b: SupabaseListingRow) => (b.rating ?? 0) - (a.rating ?? 0);

    const sorted = rows.slice();
    if (sort === 'price_asc') {
        sorted.sort(byPriceAsc);
    } else if (sort === 'price_desc') {
        sorted.sort(byPriceDesc);
    } else if (sort === 'rating_desc') {
        sorted.sort(byRatingDesc);
    }

    return sorted;
};

const fetchSupabaseListings = async (filters: ListingFilters = {}): Promise<ListingsResponse> => {
    if (!supabase) {
        return [];
    }

    const {
        category,
        search,
        sort = 'recommended',
        maxPrice,
        minPrice,
        guests,
        bedrooms,
        baths,
        guestFavoriteOnly,
    } = filters;

    const categoryId = category ? await resolveCategoryId(category) : null;
    if (category && category !== 'icons' && !categoryId) {
        return [];
    }

    let query = supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('is_active', true);

    if (categoryId) {
        query = query.eq('category_id', categoryId);
    }

    if (typeof minPrice === 'number' && !Number.isNaN(minPrice)) {
        query = query.gte('price_per_night', minPrice);
    }

    if (typeof maxPrice === 'number' && !Number.isNaN(maxPrice)) {
        query = query.lte('price_per_night', maxPrice);
    }

    if (typeof guests === 'number' && !Number.isNaN(guests)) {
        query = query.gte('guest_count_max', guests);
    }

    if (typeof bedrooms === 'number' && !Number.isNaN(bedrooms)) {
        query = query.gte('bedrooms', bedrooms);
    }

    if (typeof baths === 'number' && !Number.isNaN(baths)) {
        query = query.gte('baths', baths);
    }

    if (guestFavoriteOnly) {
        query = query.eq('is_guest_favorite', true);
    }

    if (search?.trim()) {
        const q = search.trim();
        query = query.or(`city.ilike.%${q}%,country.ilike.%${q}%,title.ilike.%${q}%`);
    }

    const { data, error } = await query.order(
        sort === 'price_asc'
            ? 'price_per_night'
            : sort === 'price_desc'
                ? 'price_per_night'
                : sort === 'rating_desc'
                    ? 'rating'
                    : 'created_at',
        { ascending: sort === 'price_asc' }
    );

    if (error || !data) {
        return [];
    }

    const rows = data as unknown as SupabaseListingRow[];
    return sort === 'price_desc' || sort === 'rating_desc'
        ? sortListingRows(rows, sort).map(mapListing)
        : rows.map(mapListing);
};

const fetchSupabaseListingById = async (id: string): Promise<Listing | undefined> => {
    if (!supabase) {
        return undefined;
    }

    const { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', id)
        .maybeSingle();

    if (error || !data) {
        return undefined;
    }

    return mapListing(data as unknown as SupabaseListingRow);
};

const fetchSupabaseAvailabilityBlocks = async (listingId: string): Promise<AvailabilityBlock[]> => {
    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase
        .from('availability_blocks')
        .select('id, listing_id, start_date, end_date, reason')
        .eq('listing_id', listingId)
        .order('start_date', { ascending: true });

    if (error || !data) {
        return [];
    }

    return (data as SupabaseAvailabilityBlockRow[]).map(mapAvailabilityBlock);
};

const fetchSupabaseGuestBookings = async (guestId: string): Promise<BookingHistoryItem[]> => {
    if (!supabase) {
        return [];
    }

    const { data, error } = await supabase
        .from('bookings')
        .select(`
            id,
            listing_id,
            guest_id,
            check_in,
            check_out,
            guest_count,
            room_type_name,
            room_type_price,
            room_count,
            subtotal,
            fees,
            taxes,
            total,
            status,
            created_at,
            listing:listings (
                id,
                title,
                city,
                country,
                price_per_night,
                currency,
                listing_images (
                    image_url,
                    sort_order
                )
            )
        `)
        .eq('guest_id', guestId)
        .order('created_at', { ascending: false });

    if (error || !data) {
        return [];
    }

    return (data as unknown as SupabaseBookingRow[]).map(mapBooking);
};

const resolveCategoryRow = async (slug: string): Promise<{ id: string; slug: string; label: string; icon_name: string } | null> => {
    if (!supabase || !slug) {
        return null;
    }

    const { data, error } = await supabase
        .from('categories')
        .select('id, slug, label, icon_name')
        .eq('slug', slug)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    return data;
};

const resolveAmenityIds = async (labels: string[]) => {
    if (!supabase || labels.length === 0) {
        return [];
    }

    const normalized = labels.map((label) => label.trim().toLowerCase()).filter(Boolean);
    if (normalized.length === 0) {
        return [];
    }

    const { data } = await supabase
        .from('amenities')
        .select('id, label, slug')
        .eq('is_active', true);

    return (data ?? []).filter((amenity) => {
        const label = amenity.label.trim().toLowerCase();
        const slug = amenity.slug.trim().toLowerCase();
        return normalized.includes(label) || normalized.includes(slug);
    });
};

const persistListingImages = async (listingId: string, imageUrls: string[], altText: string) => {
    if (!supabase) {
        return;
    }

    await supabase.from('listing_images').delete().eq('listing_id', listingId);

    if (imageUrls.length > 0) {
        await supabase.from('listing_images').insert(
            imageUrls.map((imageUrl, index) => ({
                listing_id: listingId,
                image_url: imageUrl,
                sort_order: index,
                alt_text: altText,
            }))
        );
    }
};

const persistListingAmenities = async (listingId: string, amenityLabels: string[]) => {
    if (!supabase) {
        return;
    }

    await supabase.from('listing_amenities').delete().eq('listing_id', listingId);

    const amenityRows = await resolveAmenityIds(amenityLabels);
    if (amenityRows.length > 0) {
        await supabase.from('listing_amenities').insert(
            amenityRows.map((amenity) => ({
                listing_id: listingId,
                amenity_id: amenity.id,
            }))
        );
    }
};

const bookingStatusLabel: Record<Booking['status'], Booking['status']> = {
    pending: 'pending',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
    completed: 'completed',
};

export const api = {
    fetchCategories: (): Promise<CategoriesResponse> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                fetchSupabaseCategories()
                    .then(resolve)
                    .catch(() => resolve([]));
            }, DELAY_MS);
        });
    },

    fetchListings: (filters: ListingFilters = {}): Promise<ListingsResponse> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                fetchSupabaseListings(filters)
                    .then(resolve)
                    .catch(() => resolve([]));
            }, DELAY_MS);
        });
    },

    fetchListingById: (id: string): Promise<Listing | undefined> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                fetchSupabaseListingById(id)
                    .then(resolve)
                    .catch(() => resolve(undefined));
            }, DELAY_MS);
        });
    },

    fetchAvailabilityBlocks: (listingId: string): Promise<AvailabilityBlock[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                fetchSupabaseAvailabilityBlocks(listingId)
                    .then(resolve)
                    .catch(() => resolve([]));
            }, DELAY_MS);
        });
    },

    fetchGuestBookings: (guestId: string): Promise<BookingHistoryItem[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                fetchSupabaseGuestBookings(guestId)
                    .then(resolve)
                    .catch(() => resolve([]));
            }, DELAY_MS);
        });
    },

    fetchActiveFlashDrop: async (now = new Date()): Promise<FlashSaleDrop | null> => {
        return fetchActiveFlashDrop(now.toISOString());
    },

    fetchAdminDropState: async (): Promise<FlashSaleDrop | null> => {
        return fetchLatestAdminFlashDrop();
    },

    getCurrentUserRole: async (): Promise<'guest' | 'host' | 'admin' | null> => {
        const profile = await fetchCurrentProfileBasic();
        return profile?.role ?? null;
    },

    getCurrentUserSummary: async (): Promise<CurrentUserSummary | null> => {
        const profile = await fetchCurrentProfileBasic();
        if (!profile?.id || !profile.role) {
            return null;
        }

        return {
            id: profile.id,
            name: profile.full_name?.trim() || 'User',
            role: profile.role,
            isVerifiedGuest: Boolean(profile.is_verified_guest),
            avatarUrl: profile.avatar_url ?? null,
        };
    },

    resolveHostEntryPath: async (): Promise<string> => {
        if (!supabase) {
            return '/host/auth';
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            return '/host/auth';
        }

        const profile = await fetchCurrentProfileBasic();
        if (!profile?.role) {
            return '/';
        }

        if (profile.role === 'admin') {
            return '/host/admin';
        }

        if (profile.role === 'host') {
            return '/host';
        }

        return '/';
    },

    resolveDashboardPath: async (): Promise<string> => {
        if (!supabase) {
            return '/auth';
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            return '/auth';
        }

        const role = await api.getCurrentUserRole();
        if (role === 'admin') {
            return '/host/admin';
        }

        if (role === 'host') {
            return '/host';
        }

        return '/';
    },

    getHostApprovalStatus: async (): Promise<HostApprovalStatus | null> => {
        return fetchHostApprovalStatusFromProfile();
    },

    listPendingHosts: async (): Promise<HostApprovalApplication[]> => {
        if (!supabase) {
            return [];
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role, host_approval_status, host_reviewed_at, host_reviewed_by, host_review_note, created_at')
            .eq('role', 'host')
            .eq('host_approval_status', 'pending')
            .order('created_at', { ascending: true });

        if (error || !data) {
            return [];
        }

        return (data as SupabaseProfileRow[]).map((row) => ({
            id: row.id,
            fullName: row.full_name ?? 'Unnamed host',
            avatarUrl: row.avatar_url ?? undefined,
            role: row.role,
            hostApprovalStatus: row.host_approval_status ?? 'pending',
            createdAt: row.created_at,
            reviewedAt: row.host_reviewed_at ?? undefined,
            reviewedBy: row.host_reviewed_by ?? undefined,
            reviewNote: row.host_review_note ?? undefined,
        }));
    },

    listGuestVerificationUsers: async (): Promise<GuestVerificationUser[]> => {
        if (!supabase) {
            return [];
        }

        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role, is_verified_guest, created_at')
            .eq('role', 'guest')
            .order('created_at', { ascending: false });

        if (!error && data) {
            return (data as SupabaseProfileRow[]).map((row) => ({
                id: row.id,
                fullName: row.full_name?.trim() || 'Unnamed guest',
                avatarUrl: row.avatar_url ?? undefined,
                isVerifiedGuest: Boolean(row.is_verified_guest),
                createdAt: row.created_at,
            }));
        }

        const { data: fallbackData, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, role, created_at')
            .eq('role', 'guest')
            .order('created_at', { ascending: false });

        if (fallbackError || !fallbackData) {
            return [];
        }

        return (fallbackData as SupabaseProfileRow[]).map((row) => ({
            id: row.id,
            fullName: row.full_name?.trim() || 'Unnamed guest',
            avatarUrl: row.avatar_url ?? undefined,
            isVerifiedGuest: false,
            createdAt: row.created_at,
        }));
    },

    updateGuestVerification: async (userId: string, isVerifiedGuest: boolean): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            throw new Error('You must be signed in as admin');
        }

        const { error } = await supabase
            .from('profiles')
            .update({ is_verified_guest: isVerifiedGuest })
            .eq('id', userId)
            .eq('role', 'guest');

        if (error) {
            throw error;
        }
    },

    reviewHostApplication: async (
        userId: string,
        decision: 'approved' | 'rejected',
        note?: string
    ): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            throw new Error('You must be signed in as admin');
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                host_approval_status: decision,
                host_reviewed_at: new Date().toISOString(),
                host_reviewed_by: authData.user.id,
                host_review_note: note?.trim() ? note.trim() : null,
            })
            .eq('id', userId)
            .eq('role', 'host');

        if (error) {
            throw error;
        }
    },

    upsertScheduledDrop: async (input: UpsertFlashSaleInput): Promise<FlashSaleDrop> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            throw new Error('You must be signed in as admin');
        }

        const saleValue = Number(input.saleValue);
        if (!Number.isFinite(saleValue) || saleValue <= 0) {
            throw new Error('Sale value must be greater than 0');
        }

        const startAt = new Date(input.startAt);
        if (Number.isNaN(startAt.getTime())) {
            throw new Error('Invalid start date');
        }
        if (startAt.getTime() < Date.now()) {
            throw new Error('Start date cannot be in the past');
        }
        const endAt = new Date(startAt.getTime() + (72 * 60 * 60 * 1000));

        await supabase.from('flash_sale_drops').update({ is_active: false }).eq('is_active', true);

        const { data, error } = await supabase
            .from('flash_sale_drops')
            .insert({
                listing_id: input.listingId,
                sale_type: input.saleType,
                sale_value: saleValue,
                start_at: startAt.toISOString(),
                end_at: endAt.toISOString(),
                is_active: true,
                created_by: authData.user.id,
            })
            .select(FLASH_SALE_SELECT)
            .single();

        if (error || !data) {
            throw error ?? new Error('Unable to schedule drop');
        }

        const mapped = mapFlashSale(data as unknown as SupabaseFlashSaleRow);
        if (!mapped) {
            throw new Error('Unable to read created drop');
        }
        return mapped;
    },

    deactivateDrop: async (dropId: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { error } = await supabase
            .from('flash_sale_drops')
            .update({ is_active: false })
            .eq('id', dropId);

        if (error) {
            throw error;
        }
    },

    fetchHostListings: async (hostId: string): Promise<ListingsResponse> => {
        if (!supabase) {
            return [];
        }

        const { data, error } = await supabase
            .from('listings')
            .select(LISTING_SELECT)
            .eq('host_id', hostId)
            .order('created_at', { ascending: false });

        if (error || !data) {
            return [];
        }

        return (data as unknown as SupabaseListingRow[]).map(mapListing);
    },

    createListing: async (hostId: string, input: CreateListingInput): Promise<Listing> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const category = await resolveCategoryRow(input.categorySlug);
        if (!category) {
            throw new Error('Category not found');
        }

        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .insert({
                host_id: hostId,
                category_id: category.id,
                title: input.title,
                description: input.description,
                price_per_night: input.pricePerNight,
                currency: input.currency,
                city: input.city,
                country: input.country,
                lat: input.lat,
                lng: input.lng,
                map_link: input.mapLink ?? null,
                guest_count_max: input.guestCountMax,
                bedrooms: input.bedrooms,
                beds: input.beds,
                baths: input.baths,
                is_guest_favorite: input.isGuestFavorite ?? false,
                availability_summary: input.availabilitySummary ?? null,
                room_types: serializeRoomTypes(input.roomTypes),
            })
            .select(LISTING_SELECT)
            .single();

        if (listingError || !listing) {
            throw listingError ?? new Error('Unable to create listing');
        }

        await persistListingImages(listing.id, input.imageUrls, input.title);
        await persistListingAmenities(listing.id, input.amenityLabels);

        return mapListing(listing as unknown as SupabaseListingRow);
    },

    updateListing: async (hostId: string, listingId: string, input: UpdateListingInput): Promise<Listing> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const category = await resolveCategoryRow(input.categorySlug);
        if (!category) {
            throw new Error('Category not found');
        }

        const { data: updated, error } = await supabase
            .from('listings')
            .update({
                category_id: category.id,
                title: input.title,
                description: input.description,
                price_per_night: input.pricePerNight,
                currency: input.currency,
                city: input.city,
                country: input.country,
                lat: input.lat,
                lng: input.lng,
                map_link: input.mapLink ?? null,
                guest_count_max: input.guestCountMax,
                bedrooms: input.bedrooms,
                beds: input.beds,
                baths: input.baths,
                availability_summary: input.availabilitySummary ?? null,
                room_types: serializeRoomTypes(input.roomTypes),
                host_id: hostId,
            })
            .eq('id', listingId)
            .eq('host_id', hostId)
            .select(LISTING_SELECT)
            .maybeSingle();

        if (error || !updated) {
            throw error ?? new Error('Unable to update listing');
        }

        if (input.imageUrls) {
            await persistListingImages(listingId, input.imageUrls, input.title);
        }

        await persistListingAmenities(listingId, input.amenityLabels);

        return mapListing(updated as unknown as SupabaseListingRow);
    },

    deleteListing: async (hostId: string, listingId: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { error } = await supabase
            .from('listings')
            .update({ is_active: false })
            .eq('id', listingId)
            .eq('host_id', hostId);

        if (error) {
            throw error;
        }
    },

    createAvailabilityBlock: async (
        input: { listingId: string; startDate: string; endDate: string; status: AvailabilityBlockStatus }
    ): Promise<AvailabilityBlock> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data, error } = await supabase
            .from('availability_blocks')
            .insert({
                listing_id: input.listingId,
                start_date: input.startDate,
                end_date: input.endDate,
                reason: input.status,
            })
            .select('id, listing_id, start_date, end_date, reason')
            .single();

        if (error || !data) {
            throw error ?? new Error('Unable to create availability block');
        }

        return mapAvailabilityBlock(data as SupabaseAvailabilityBlockRow);
    },

    deleteAvailabilityBlock: async (blockId: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { error } = await supabase
            .from('availability_blocks')
            .delete()
            .eq('id', blockId);

        if (error) {
            throw error;
        }
    },

    createBooking: async (
        guestId: string,
        input: {
            listingId: string;
            checkIn: string;
            checkOut: string;
            guestCount: number;
            roomTypeName?: string;
            roomTypePrice?: number;
            roomCount?: number;
            subtotal: number;
            fees: number;
            taxes: number;
            total: number;
            status: Booking['status'];
        }
    ): Promise<BookingHistoryItem> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data, error } = await supabase
            .from('bookings')
            .insert({
                listing_id: input.listingId,
                guest_id: guestId,
                check_in: input.checkIn,
                check_out: input.checkOut,
                guest_count: input.guestCount,
                room_type_name: input.roomTypeName ?? null,
                room_type_price: input.roomTypePrice ?? null,
                room_count: input.roomCount ?? 1,
                subtotal: input.subtotal,
                fees: input.fees,
                taxes: input.taxes,
                total: input.total,
                status: bookingStatusLabel[input.status],
            })
            .select(`
                id,
                listing_id,
                guest_id,
                check_in,
                check_out,
                guest_count,
                room_type_name,
                room_type_price,
                room_count,
                subtotal,
                fees,
                taxes,
                total,
                status,
                created_at,
                listing:listings (
                    id,
                    title,
                    city,
                    country,
                    price_per_night,
                    currency,
                    listing_images (
                        image_url,
                        sort_order
                    )
                )
            `)
            .single();

        if (error || !data) {
            throw error ?? new Error('Unable to create booking');
        }

        return mapBooking(data as unknown as SupabaseBookingRow);
    },
};
