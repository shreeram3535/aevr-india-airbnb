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
    ListingMediaItem,
} from '../types';
import { supabase } from './supabase';
import { coerceMediaItem, coerceMediaList, getImageUrlsFromMedia } from './media';

const DELAY_MS = 800;
const SHOW_DEV_ERRORS = import.meta.env.DEV;

const describeSupabaseError = (error: unknown) => {
    if (!error || typeof error !== 'object') {
        return 'Unknown Supabase error.';
    }

    const record = error as { message?: string; details?: string; hint?: string };
    return [record.message, record.details, record.hint].filter(Boolean).join(' ') || 'Unknown Supabase error.';
};
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

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
    host_name?: string | null;
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
    internal_name?: string | null;
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
        phone: string | null;
    }>;
    listing_images: Array<{
        image_url: string;
        sort_order: number | null;
        alt_text: string | null;
        media_kind?: string | null;
        source_type?: string | null;
        provider?: string | null;
        embed_url?: string | null;
        thumbnail_url?: string | null;
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
        listing_images: Array<{
            image_url: string;
            sort_order: number | null;
            media_kind?: string | null;
            source_type?: string | null;
            provider?: string | null;
            embed_url?: string | null;
            thumbnail_url?: string | null;
        }> | null;
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
    internal_name,
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
        bio,
        phone
    ),
    listing_images (
        image_url,
        sort_order,
        alt_text,
        media_kind,
        source_type,
        provider,
        embed_url,
        thumbnail_url
    ),
    listing_amenities (
        amenity:amenities (
            label
        )
    )
`;
const LISTING_SELECT_WITHOUT_HOST_NAME = LISTING_SELECT.replace(/\n\s*host_name,/, '');

const isMissingHostNameColumnError = (error: unknown) => {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const record = error as { message?: unknown; details?: unknown; hint?: unknown };
    return [record.message, record.details, record.hint]
        .filter((value): value is string => typeof value === 'string')
        .some((value) => value.toLowerCase().includes('host_name'));
};

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

            const roomMedia = coerceMediaList(record.media ?? record.photos, { supabaseUrl: SUPABASE_URL });
            if (roomMedia.length > 0) {
                roomType.media = roomMedia;
                roomType.photos = getImageUrlsFromMedia(roomMedia);
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
        media: (roomType.media ?? roomType.photos ?? [])
            .map((item, index) => coerceMediaItem(item, index, { supabaseUrl: SUPABASE_URL }))
            .filter((item): item is ListingMediaItem => item !== null),
    }));

const mapListing = (row: SupabaseListingRow): Listing => {
    const category = first(row.category);
    const host = first(row.host);
    const media = (row.listing_images ?? [])
        .map((item, index) => coerceMediaItem(item, index, { supabaseUrl: SUPABASE_URL }))
        .filter((item): item is ListingMediaItem => item !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    const images = getImageUrlsFromMedia(media);

    const amenities = (row.listing_amenities ?? [])
        .map((entry) => entry.amenity?.label)
        .filter((label): label is string => Boolean(label));
    const roomTypes = normalizeRoomTypes(row.room_types);
    const displayHostName = row.host_name?.trim() || host?.full_name?.trim() || 'Host';

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
        media,
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
            name: displayHostName,
            avatarUrl: host?.avatar_url ?? '',
            isSuperhost: host?.is_superhost ?? false,
            bio: host?.bio ?? undefined,
            phone: host?.phone ?? undefined,
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
        isActive: row.is_active,
        internalName: row.internal_name ?? undefined,
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
        .map((item, index) => coerceMediaItem(item, index, { supabaseUrl: SUPABASE_URL }))
        .filter((item): item is ListingMediaItem => item !== null)
        .find((item) => item.kind === 'image')?.url;

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
const FLASH_SALE_SELECT_WITHOUT_HOST_NAME = FLASH_SALE_SELECT.replace(/\n\s*host_name,/, '');

const fetchActiveFlashDrop = async (nowIso: string): Promise<FlashSaleDrop | null> => {
    if (!supabase) {
        return null;
    }

    let { data, error } = await supabase
        .from('flash_sale_drops')
        .select(FLASH_SALE_SELECT)
        .eq('is_active', true)
        .lte('start_at', nowIso)
        .gt('end_at', nowIso)
        .order('start_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (isMissingHostNameColumnError(error)) {
        const fallbackResult = await supabase
            .from('flash_sale_drops')
            .select(FLASH_SALE_SELECT_WITHOUT_HOST_NAME)
            .eq('is_active', true)
            .lte('start_at', nowIso)
            .gt('end_at', nowIso)
            .order('start_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        data = fallbackResult.data as typeof data;
        error = fallbackResult.error;
    }

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
        if (SHOW_DEV_ERRORS) {
            throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env, then restart the dev server.');
        }

        return [];
    }

    const supabaseClient = supabase;
    const {
        category,
        luxurySection,
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
        if (SHOW_DEV_ERRORS) {
            throw new Error(`Category "${category}" was not found in Supabase. Seed active categories or clear the category filter.`);
        }

        return [];
    }

    const luxeCategoryId = await resolveCategoryId('luxe');

    const buildQuery = (selectColumns: string) => {
        let query = supabaseClient
            .from('listings')
            .select(selectColumns)
            .eq('is_active', true);

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        if (luxurySection && luxeCategoryId) {
            query = query.or(`category_id.eq.${luxeCategoryId},price_per_night.gte.10000`);
        } else {
            // In standard Aevr mode, hide listings that are in the Luxe category
            // and hide high-priced stays; these are only visible in Aevr Luxe.
            if (luxeCategoryId) {
                query = query.neq('category_id', luxeCategoryId);
            }
            query = query.lt('price_per_night', 10000);
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

        return query.order(
            sort === 'price_asc'
                ? 'price_per_night'
                : sort === 'price_desc'
                    ? 'price_per_night'
                    : sort === 'rating_desc'
                        ? 'rating'
                        : 'created_at',
            { ascending: sort === 'price_asc' }
        );
    };

    let { data, error } = await buildQuery(LISTING_SELECT);

    if (isMissingHostNameColumnError(error)) {
        const fallbackResult = await buildQuery(LISTING_SELECT_WITHOUT_HOST_NAME);
        data = fallbackResult.data as typeof data;
        error = fallbackResult.error;
    }

    if (error || !data) {
        if (SHOW_DEV_ERRORS) {
            throw new Error(`Could not load listings from Supabase. ${describeSupabaseError(error)}`);
        }

        return [];
    }

    const rows = data as unknown as SupabaseListingRow[];
    return sort === 'price_desc' || sort === 'rating_desc'
        ? sortListingRows(rows, sort).map(mapListing)
        : rows.map(mapListing);
};

const fetchSupabaseAdminListings = async (): Promise<ListingsResponse> => {
    if (!supabase) {
        return [];
    }

    let { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .order('created_at', { ascending: false });

    if (isMissingHostNameColumnError(error)) {
        const fallbackResult = await supabase
            .from('listings')
            .select(LISTING_SELECT_WITHOUT_HOST_NAME)
            .order('created_at', { ascending: false });

        data = fallbackResult.data as typeof data;
        error = fallbackResult.error;
    }

    if (error || !data) {
        return [];
    }

    return (data as unknown as SupabaseListingRow[]).map(mapListing);
};

const fetchSupabaseListingById = async (id: string): Promise<Listing | undefined> => {
    if (!supabase) {
        return undefined;
    }

    let { data, error } = await supabase
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', id)
        .maybeSingle();

    if (isMissingHostNameColumnError(error)) {
        const fallbackResult = await supabase
            .from('listings')
            .select(LISTING_SELECT_WITHOUT_HOST_NAME)
            .eq('id', id)
            .maybeSingle();

        data = fallbackResult.data as typeof data;
        error = fallbackResult.error;
    }

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

const slugifyAmenity = (label: string) =>
    label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const ensureAmenities = async (labels: string[]) => {
    if (!supabase) {
        return [];
    }

    const normalizedLabels = labels.map((label) => label.trim()).filter(Boolean);
    if (normalizedLabels.length === 0) {
        return [];
    }

    const existing = await resolveAmenityIds(normalizedLabels);
    const existingKeys = new Set(
        existing.flatMap((amenity) => [amenity.label.trim().toLowerCase(), amenity.slug.trim().toLowerCase()])
    );

    const missing = normalizedLabels.filter((label) => {
        const key = label.trim().toLowerCase();
        return !existingKeys.has(key);
    });

    if (missing.length > 0) {
        const { error } = await supabase
            .from('amenities')
            .upsert(
                missing.map((label, index) => ({
                    slug: slugifyAmenity(label),
                    label: label.trim(),
                    icon_name: 'Sparkles',
                    sort_order: 100 + index,
                    is_active: true,
                })),
                { onConflict: 'slug' }
            );

        if (error) {
            throw error;
        }
    }

    return resolveAmenityIds(normalizedLabels);
};

const persistListingMedia = async (listingId: string, media: ListingMediaItem[], altText: string) => {
    if (!supabase) {
        return;
    }

    await supabase.from('listing_images').delete().eq('listing_id', listingId);

    if (media.length > 0) {
        await supabase.from('listing_images').insert(
            media.map((item, index) => ({
                listing_id: listingId,
                image_url: item.url,
                sort_order: index,
                alt_text: altText,
                media_kind: item.kind,
                source_type: item.sourceType,
                provider: item.provider ?? null,
                embed_url: item.embedUrl ?? null,
                thumbnail_url: item.thumbnailUrl ?? null,
            }))
        );
    }
};

const persistListingAmenities = async (listingId: string, amenityLabels: string[]) => {
    if (!supabase) {
        return;
    }

    await supabase.from('listing_amenities').delete().eq('listing_id', listingId);

    const amenityRows = await ensureAmenities(amenityLabels);
    if (amenityRows.length > 0) {
        await supabase.from('listing_amenities').insert(
            amenityRows.map((amenity) => ({
                listing_id: listingId,
                amenity_id: amenity.id,
            }))
        );
    }
};

const getSupabaseErrorMessage = (error: unknown, fallback: string) => {
    if (!error) {
        return fallback;
    }

    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'object') {
        const record = error as { message?: unknown; details?: unknown; hint?: unknown };
        const message = typeof record.message === 'string' ? record.message : '';
        const details = typeof record.details === 'string' ? record.details : '';
        const hint = typeof record.hint === 'string' ? record.hint : '';
        const combined = [message, details, hint].filter(Boolean).join(' ');

        if (combined.toLowerCase().includes('host_name')) {
            return 'The database is missing the listings.host_name column. Run this in Supabase SQL Editor: alter table public.listings add column if not exists host_name text;';
        }

        return combined || fallback;
    }

    return fallback;
};

const throwSupabaseError = (error: unknown, fallback: string): never => {
    throw new Error(getSupabaseErrorMessage(error, fallback));
};

const bookingStatusLabel: Record<Booking['status'], Booking['status']> = {
    pending: 'pending',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
    completed: 'completed',
};

const getFallbackListing = (
    listingId: string,
    hostId: string,
    input: CreateListingInput | UpdateListingInput
): Listing => {
    const media = input.media ?? [];
    const images = media.filter((m) => m.kind === 'image').map((m) => m.url);
    const roomTypes = input.roomTypes ?? [];

    return {
        id: listingId,
        hostId: hostId,
        title: input.title,
        description: input.description,
        price: input.pricePerNight,
        currency: input.currency,
        rating: 5.0,
        reviewCount: 0,
        images,
        media,
        location: {
            id: listingId,
            city: input.city,
            country: input.country,
            lat: input.lat,
            lng: input.lng,
        },
        category: input.categorySlug,
        categoryLabel: input.categorySlug,
        host: {
            id: hostId,
            name: input.hostName || 'Host',
            avatarUrl: '',
            isSuperhost: false,
            role: 'host',
        },
        amenities: input.amenityLabels ?? [],
        isGuestFavorite: input.isGuestFavorite ?? false,
        availableDates: input.availabilitySummary ?? 'Flexible dates',
        guestCountMax: input.guestCountMax ?? undefined,
        bedrooms: input.bedrooms ?? undefined,
        beds: input.beds ?? undefined,
        baths: input.baths ?? undefined,
        availabilitySummary: input.availabilitySummary ?? undefined,
        roomTypes,
        mapLink: input.mapLink ?? undefined,
        isActive: true,
    };
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
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                fetchSupabaseListings(filters)
                    .then(resolve)
                    .catch((error) => {
                        if (SHOW_DEV_ERRORS) {
                            reject(error);
                            return;
                        }

                        resolve([]);
                    });
            }, DELAY_MS);
        });
    },

    fetchAdminListings: async (): Promise<ListingsResponse> => {
        return fetchSupabaseAdminListings();
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

        const endAt = new Date(input.endAt);
        if (Number.isNaN(endAt.getTime())) {
            throw new Error('Invalid end date');
        }
        if (endAt.getTime() <= startAt.getTime() + (60 * 60 * 1000)) {
            throw new Error('End date must be at least 1 hour after the start date');
        }

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

        let { data, error } = await supabase
            .from('listings')
            .select(LISTING_SELECT)
            .eq('host_id', hostId)
            .order('created_at', { ascending: false });

        if (isMissingHostNameColumnError(error)) {
            const fallbackResult = await supabase
                .from('listings')
                .select(LISTING_SELECT_WITHOUT_HOST_NAME)
                .eq('host_id', hostId)
                .order('created_at', { ascending: false });

            data = fallbackResult.data as typeof data;
            error = fallbackResult.error;
        }

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
                host_name: input.hostName.trim(),
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
                rating: 5.0,
            })
            .select('id')
            .single();

        // A real DB/network error — bail out.
        if (listingError) {
            throwSupabaseError(listingError, 'Unable to create listing');
        }

        const newListingId = (listing as { id: string } | null)?.id;
        if (!newListingId) {
            throw new Error('Unable to create listing — no ID returned.');
        }

        await persistListingMedia(newListingId, input.media, input.title);
        await persistListingAmenities(newListingId, input.amenityLabels);

        // Re-fetch so we get a fully-joined listing regardless of RLS read policies.
        const created = await fetchSupabaseListingById(newListingId);
        if (!created) {
            // Media/amenities saved fine; return a minimal placeholder so navigation still works.
            return getFallbackListing(newListingId, hostId, input);
        }
        return created;
    },

    createListingAsAdmin: async (input: CreateListingInput): Promise<Listing> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            throw new Error('You must be signed in as admin');
        }

        return api.createListing(authData.user.id, input);
    },

    updateListing: async (hostId: string, listingId: string, input: UpdateListingInput): Promise<Listing> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const category = await resolveCategoryRow(input.categorySlug);
        if (!category) {
            throw new Error('Category not found');
        }

        const { error } = await supabase
            .from('listings')
            .update({
                category_id: category.id,
                title: input.title,
                description: input.description,
                host_name: input.hostName.trim(),
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
            .eq('host_id', hostId);

        // Only throw if Supabase returned a real error (network, RLS write policy, etc.).
        if (error) {
            throwSupabaseError(error, 'Unable to update listing');
        }

        if (input.media) {
            await persistListingMedia(listingId, input.media, input.title);
        }

        await persistListingAmenities(listingId, input.amenityLabels);

        // Re-fetch the listing so callers always get a fully-joined result.
        const updated = await fetchSupabaseListingById(listingId);
        if (!updated) {
            return getFallbackListing(listingId, hostId, input);
        }
        return updated;
    },

    updateListingAsAdmin: async (listingId: string, input: UpdateListingInput): Promise<Listing> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            throw new Error('You must be signed in as admin');
        }

        const role = await api.getCurrentUserRole();
        if (role !== 'admin') {
            throw new Error('Only admins can edit any listing');
        }

        const category = await resolveCategoryRow(input.categorySlug);
        if (!category) {
            throw new Error('Category not found');
        }

        const { error } = await supabase
            .from('listings')
            .update({
                category_id: category.id,
                title: input.title,
                description: input.description,
                host_name: input.hostName.trim(),
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
            })
            .eq('id', listingId);

        // Only throw if Supabase returned a real error.
        if (error) {
            throwSupabaseError(error, 'Unable to update listing');
        }

        if (input.media) {
            await persistListingMedia(listingId, input.media, input.title);
        }

        await persistListingAmenities(listingId, input.amenityLabels);

        // Re-fetch so callers always get a fully-joined result.
        const updated = await fetchSupabaseListingById(listingId);
        if (!updated) {
            return getFallbackListing(listingId, authData.user.id, input);
        }
        return updated;
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

    adminDelistListing: async (listingId: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { error } = await supabase
            .from('listings')
            .update({ is_active: false })
            .eq('id', listingId);

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

    updateListingInternalName: async (listingId: string, internalName: string): Promise<void> => {
        if (!supabase) {
            throw new Error('Supabase is not configured');
        }

        const { error } = await supabase
            .from('listings')
            .update({ internal_name: internalName })
            .eq('id', listingId);

        if (error) {
            throw error;
        }
    },
};
