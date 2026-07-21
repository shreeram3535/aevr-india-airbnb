export interface User {
    id: string;
    name: string;
    avatarUrl: string;
    isSuperhost: boolean;
    role?: 'guest' | 'host' | 'admin';
    bio?: string;
}

export type HostApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface HostApprovalApplication {
    id: string;
    fullName: string;
    avatarUrl?: string;
    role: 'guest' | 'host' | 'admin';
    hostApprovalStatus: HostApprovalStatus;
    createdAt: string;
    reviewedAt?: string;
    reviewedBy?: string;
    reviewNote?: string;
}

export interface GuestVerificationUser {
    id: string;
    fullName: string;
    avatarUrl?: string;
    email?: string;
    isVerifiedGuest: boolean;
    createdAt: string;
}

export interface Location {
    id: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
}

export type ExperienceCategory = 'Attraction' | 'Activity' | 'Food & Dining' | 'Nature' | 'Adventure' | 'Shopping' | 'Culture & Heritage' | 'Wellness' | 'Nightlife' | 'Other';

export interface Experience {
    id: string;
    title: string;
    category: ExperienceCategory;
    description: string;
    iconOrImage?: string;
    distance?: string;
    travelTime?: string;
}

export interface Review {
    id: string;
    userId: string;
    rating: number;
    comment: string;
    date: string;
}

export interface Listing {
    id: string;
    title: string;
    description: string;
    price: number;
    originalPrice?: number;
    discountedPrice?: number;
    discountEndTime?: string;
    currency?: string;
    rating: number;
    reviewCount: number;
    images: string[];
    media: ListingMediaItem[];
    location: Location;
    category: string;
    categoryLabel?: string;
    host: User;
    amenities: string[];
    isGuestFavorite: boolean;
    availableDates: string; // Simplification for UI: "Mar 1-6"
    guestCountMax?: number;
    bedrooms?: number;
    beds?: number;
    baths?: number;
    availabilitySummary?: string;
    roomTypes?: RoomType[];
    localExperiences?: Experience[];
    hostId?: string;
    mapLink?: string;
    isActive?: boolean;
    internalName?: string;
}

export interface RoomType {
    id: string;
    name: string;
    pricePerNight: number;
    totalCount: number;
    maxGuests?: number;
    beds?: number;
    description?: string;
    photos?: string[];
    media?: ListingMediaItem[];
}

export type ListingMediaKind = 'image' | 'video';
export type ListingMediaSourceType = 'upload' | 'external';
export type ListingVideoProvider = 'youtube' | 'instagram' | 'google-drive' | 'unknown';

export interface ListingMediaItem {
    url: string;
    kind: ListingMediaKind;
    sourceType: ListingMediaSourceType;
    sortOrder: number;
    embedUrl?: string;
    thumbnailUrl?: string;
    provider?: ListingVideoProvider;
    title?: string;
}

export interface Category {
    id: string;
    label: string;
    slug?: string;
    iconName: string; // Mapped to Lucide icons
}

export type ListingSortOption = 'recommended' | 'price_asc' | 'price_desc' | 'rating_desc';
export type FlashSaleType = 'percent' | 'manual_price';

export interface ListingFilters {
    category?: string;    luxurySection?: boolean;    search?: string;
    sort?: ListingSortOption;
    maxPrice?: number;
    minPrice?: number;
    guests?: number;
    bedrooms?: number;
    baths?: number;
    guestFavoriteOnly?: boolean;
}

export type AvailabilityBlockStatus = 'booked' | 'restricted';

export interface AvailabilityBlock {
    id: string;
    listingId: string;
    startDate: string;
    endDate: string;
    status: AvailabilityBlockStatus;
    reason?: string;
}

export interface UpdateListingInput extends Omit<CreateListingInput, 'media'> {
    media?: ListingMediaItem[];
}

export interface Amenity {
    id: string;
    slug: string;
    label: string;
    iconName: string;
}

export interface Booking {
    id: string;
    listingId: string;
    guestId: string;
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
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    createdAt: string;
}

export interface BookingHistoryItem extends Booking {
    listing: {
        id: string;
        title: string;
        city: string;
        country: string;
        price: number;
        currency?: string;
        imageUrl?: string;
    };
}

export interface FlashSaleDrop {
    id: string;
    listingId: string;
    listing: Listing;
    saleType: FlashSaleType;
    saleValue: number;
    startAt: string;
    endAt: string;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    salePrice: number;
    discountPercent: number;
}

export interface UpsertFlashSaleInput {
    listingId: string;
    saleType: FlashSaleType;
    saleValue: number;
    startAt: string;
    endAt: string;
}

export interface Favorite {
    userId: string;
    listingId: string;
    createdAt: string;
}

export interface CreateListingInput {
    title: string;
    description: string;
    hostName: string;
    pricePerNight: number;
    originalPrice?: number;
    discountedPrice?: number;
    discountEndTime?: string;
    currency: string;
    categorySlug: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
    mapLink?: string;
    guestCountMax: number;
    bedrooms: number;
    beds: number;
    baths: number;
    isGuestFavorite?: boolean;
    availabilitySummary?: string;
    roomTypes: RoomType[];
    localExperiences?: Experience[];
    media: ListingMediaItem[];
    amenityLabels: string[];
}


export type ListingsResponse = Listing[];
export type CategoriesResponse = Category[];

export interface PresetVideo {
    id?: string;
    name: string;
    url: string;
    thumb: string;
    duration: string;
    isLocal?: boolean;
}

