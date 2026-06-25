import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    CalendarDays, Plus, Trash2, PlayCircle, CheckCircle2, ChevronRight,
    ChevronLeft, Upload, MapPin, Home, DollarSign, BedDouble, Image, Wifi,
    Check, X, Compass, Snowflake, Utensils, Palmtree, Car, Coffee, Mountain, Shield, Sparkles,
} from 'lucide-react';
import styles from './HostNewProperty.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabase';
import { uploadListingImages } from '../services/storage';
import { HostApprovalStatusView } from '../components/HostApprovalStatus';
import { SkeletonScreen } from '../components/SkeletonScreen';
import AmenityIcon from '../components/AmenityIcon';
import type { AvailabilityBlock, AvailabilityBlockStatus, Category, Listing, ListingMediaItem, RoomType, Experience, ExperienceCategory } from '../types';
import { createExternalVideoMedia } from '../services/media';
import { extractCoordsFromGoogleMapsUrl } from '../services/mapUtils';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type FormState = {
    title: string;
    description: string;
    hostName: string;
    hostContactNumber: string;
    pricePerNight: string;
    currency: string;
    categorySlug: string;
    city: string;
    country: string;
    mapLink: string;
    guestCountMax: string;
    bedrooms: string;
    beds: string;
    baths: string;
    availabilitySummary: string;
    amenityLabels: string;
};

type RoomTypeFormState = {
    id: string;
    name: string;
    pricePerNight: string;
    totalCount: string;
    maxGuests: string;
    beds: string;
    description: string;
    existingMedia: ListingMediaItem[];
    photoFiles: File[];
    videoLinks: string;
};

type ExperienceFormState = {
    id: string;
    title: string;
    category: ExperienceCategory;
    description: string;
    iconOrImage: string;
    distance: string;
    travelTime: string;
};

/* ─── Amenity data (grouped by category) ─────────────────────────────────── */

type AmenityCategory = {
    label: string;
    icon: React.ComponentType<any>;
    amenities: string[];
};

const AMENITY_CATEGORIES: AmenityCategory[] = [
    {
        label: 'Connectivity & Tech',
        icon: Wifi,
        amenities: ['WiFi', 'TV', 'Dedicated workspace'],
    },
    {
        label: 'Climate',
        icon: Snowflake,
        amenities: ['AC', 'Heating', 'Ceiling fan'],
    },
    {
        label: 'Kitchen & Dining',
        icon: Utensils,
        amenities: ['Kitchen', 'Refrigerator', 'Microwave', 'Breakfast included'],
    },
    {
        label: 'Outdoors & Recreation',
        icon: Palmtree,
        amenities: ['Pool', 'Plunge pool', 'Hot tub / Jacuzzi', 'Garden', 'Terrace', 'Balcony', 'BBQ grill', 'Bonfire area', 'Private beach', 'Gym', 'Yoga space', 'Ayurvedic spa'],
    },
    {
        label: 'Transport & Parking',
        icon: Car,
        amenities: ['Free parking', 'Valet parking', 'EV charging', 'Cycle rental', 'Airport transfer'],
    },
    {
        label: 'Food & Hospitality',
        icon: Coffee,
        amenities: ['Restaurant', 'Butler service', 'Concierge', 'Room service', 'Organic meals', 'Café on site'],
    },
    {
        label: 'Nature & Views',
        icon: Mountain,
        amenities: ['Nature trails', 'Estate walk', 'Mountain view', 'Sea view', 'Lake view', 'Forest view'],
    },
    {
        label: 'Safety & Convenience',
        icon: Shield,
        amenities: ['24/7 security', 'CCTV cameras', 'Smoke alarm', 'First aid kit', 'Elevator', 'Luggage storage', 'Pet friendly', 'Fireplace', 'Washer', 'Dryer', 'Iron & board'],
    },
];

// Flat list of all predefined amenity keys (used to identify custom ones)
const ALL_PREDEFINED_AMENITIES = AMENITY_CATEGORIES.flatMap((c) => c.amenities);

/* ─── Step definitions ───────────────────────────────────────────────────── */

const STEPS = [
    { id: 1, label: 'Basics',      icon: Home },
    { id: 2, label: 'Location',    icon: MapPin },
    { id: 3, label: 'Details',     icon: BedDouble },
    { id: 4, label: 'Pricing',     icon: DollarSign },
    { id: 5, label: 'Room Types',  icon: BedDouble },
    { id: 6, label: 'Media',       icon: Image },
    { id: 7, label: 'Experiences', icon: Compass },
    { id: 8, label: 'Amenities',   icon: Wifi },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const initialState: FormState = {
    title: '',
    description: '',
    hostName: '',
    hostContactNumber: '',
    pricePerNight: '',
    currency: 'INR',
    categorySlug: 'cabins',
    city: '',
    country: 'India',
    mapLink: '',
    guestCountMax: '2',
    bedrooms: '1',
    beds: '1',
    baths: '1',
    availabilitySummary: 'Flexible dates',
    amenityLabels: 'Wifi,Kitchen',
};

const createRoomTypeRow = (overrides: Partial<RoomTypeFormState> = {}): RoomTypeFormState => ({
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Standard room',
    pricePerNight: overrides.pricePerNight ?? '',
    totalCount: overrides.totalCount ?? '1',
    maxGuests: overrides.maxGuests ?? '2',
    beds: overrides.beds ?? '1',
    description: overrides.description ?? '',
    existingMedia: overrides.existingMedia ?? [],
    photoFiles: overrides.photoFiles ?? [],
    videoLinks: overrides.videoLinks ?? '',
});

const listingToForm = (listing: Listing): FormState => ({
    title: listing.title,
    description: listing.description,
    hostName: listing.host.name,
    hostContactNumber: listing.host.phone ?? '',
    pricePerNight: String(listing.price),
    currency: listing.currency ?? 'INR',
    categorySlug: listing.category,
    city: listing.location.city,
    country: listing.location.country,
    mapLink: listing.mapLink ?? '',
    guestCountMax: String(listing.guestCountMax ?? 1),
    bedrooms: String(listing.bedrooms ?? 0),
    beds: String(listing.beds ?? 0),
    baths: String(listing.baths ?? 0),
    availabilitySummary: listing.availabilitySummary ?? listing.availableDates ?? 'Flexible dates',
    amenityLabels: listing.amenities.join(', '),
});

const roomTypesToForm = (roomTypes?: RoomType[], fallbackPrice?: number): RoomTypeFormState[] => {
    if (!roomTypes || roomTypes.length === 0) {
        return [createRoomTypeRow({ pricePerNight: fallbackPrice != null ? String(fallbackPrice) : '' })];
    }
    return roomTypes.map((rt) =>
        createRoomTypeRow({
            id: rt.id,
            name: rt.name,
            pricePerNight: String(rt.pricePerNight),
            totalCount: String(rt.totalCount),
            maxGuests: rt.maxGuests != null ? String(rt.maxGuests) : '',
            beds: rt.beds != null ? String(rt.beds) : '',
            description: rt.description ?? '',
            existingMedia: rt.media ?? [],
            photoFiles: [],
            videoLinks: (rt.media ?? []).filter((i) => i.kind === 'video').map((i) => i.url).join('\n'),
        })
    );
};

const createExperienceRow = (overrides: Partial<ExperienceFormState> = {}): ExperienceFormState => ({
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? '',
    category: overrides.category ?? 'Attraction',
    description: overrides.description ?? '',
    iconOrImage: overrides.iconOrImage ?? '',
    distance: overrides.distance ?? '',
    travelTime: overrides.travelTime ?? '',
});

const experiencesToForm = (experiences?: Experience[]): ExperienceFormState[] => {
    if (!experiences || experiences.length === 0) {
        return [];
    }
    return experiences.map((exp) => createExperienceRow({
        id: exp.id,
        title: exp.title,
        category: exp.category,
        description: exp.description,
        iconOrImage: exp.iconOrImage ?? '',
        distance: exp.distance ?? '',
        travelTime: exp.travelTime ?? '',
    }));
};

const parseVideoLinks = (value: string, startingSortOrder = 0) =>
    value
        .split(/\n|,/)
        .map((i) => i.trim())
        .filter(Boolean)
        .map((url, index) => createExternalVideoMedia(url, startingSortOrder + index))
        .filter((item): item is ListingMediaItem => item !== null);

const preserveUploadedImages = (media: ListingMediaItem[]) => media.filter((i) => i.kind === 'image');

const formatBlockRange = (startDate: string, endDate: string) =>
    `${new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(`${startDate}T00:00:00Z`))} – ${new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(`${endDate}T00:00:00Z`))}`;

const blockStatusLabel: Record<AvailabilityBlockStatus, string> = {
    booked: 'Booked',
    restricted: 'Restricted',
};

/* ═══════════════════════════════════════════════════════════════════════════
   Component
═══════════════════════════════════════════════════════════════════════════ */

export const HostNewProperty = () => {
    const navigate = useNavigate();
    const { id: listingId } = useParams<{ id?: string }>();
    const isEditMode = Boolean(listingId);

    /* ── State ── */
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [blockSaving, setBlockSaving] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [form, setForm] = useState<FormState>(initialState);
    const [roomTypes, setRoomTypes] = useState<RoomTypeFormState[]>([createRoomTypeRow()]);
    const [localExperiences, setLocalExperiences] = useState<ExperienceFormState[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [existingMedia, setExistingMedia] = useState<ListingMediaItem[]>([]);
    const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
    const [videoLinks, setVideoLinks] = useState('');
    const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [blockError, setBlockError] = useState<string | null>(null);
    const [blockStart, setBlockStart] = useState('');
    const [blockEnd, setBlockEnd] = useState('');
    const [blockStatus, setBlockStatus] = useState<AvailabilityBlockStatus>('booked');
    const [hostApprovalStatus, setHostApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
    const [currentRole, setCurrentRole] = useState<'guest' | 'host' | 'admin' | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [customAmenity, setCustomAmenity] = useState('');

    /* ── Wizard step ── */
    const totalSteps = isEditMode ? 8 : 8;
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');
    const [animating, setAnimating] = useState(false);
    const stepContentRef = useRef<HTMLDivElement>(null);

    const backPath = currentRole === 'admin' ? '/host/properties' : '/host';

    /* ── Amenity helpers ── */
    const selectedAmenities = useMemo(
        () => new Set(form.amenityLabels.split(',').map((a) => a.trim()).filter(Boolean)),
        [form.amenityLabels]
    );

    const toggleAmenity = (key: string) => {
        const next = new Set(selectedAmenities);
        if (next.has(key)) {
            next.delete(key);
        } else {
            next.add(key);
        }
        setForm((f) => ({ ...f, amenityLabels: Array.from(next).join(', ') }));
    };

    const addCustomAmenity = () => {
        const val = customAmenity.trim();
        if (!val) return;
        if (!selectedAmenities.has(val)) {
            setForm((f) => ({
                ...f,
                amenityLabels: [...Array.from(selectedAmenities), val].join(', '),
            }));
        }
        setCustomAmenity('');
    };

    /* ── Data loading ── */
    useEffect(() => {
        const load = async () => {
            if (!hasSupabaseConfig) {
                navigate('/host/auth', { replace: true });
                return;
            }
            const session = await authService.getSession();
            if (!session) {
                navigate('/host/auth', { replace: true });
                return;
            }
            const role = await api.getCurrentUserRole();
            setCurrentRole(role);
            if (role !== 'host' && role !== 'admin') {
                navigate('/host/auth', { replace: true });
                return;
            }
            const approvalStatus = await api.getHostApprovalStatus();
            if (role === 'host' && approvalStatus && approvalStatus !== 'approved') {
                setHostApprovalStatus(approvalStatus);
                setLoading(false);
                return;
            }
            const data = await api.fetchCategories();
            setCategories(data);
            if (listingId) {
                const listing = await api.fetchListingById(listingId);
                if (!listing) {
                    setError('Listing not found.');
                } else {
                    setForm(listingToForm(listing));
                    setRoomTypes(roomTypesToForm(listing.roomTypes, listing.price));
                    setLocalExperiences(experiencesToForm(listing.localExperiences));
                    setExistingMedia(listing.media);
                    setVideoLinks(listing.media.filter((i) => i.kind === 'video').map((i) => i.url).join('\n'));
                    setAvailabilityBlocks(await api.fetchAvailabilityBlocks(listingId));
                }
            } else {
                setForm((current) => ({
                    ...current,
                    categorySlug: data.find((i) => i.slug && i.slug !== 'icons')?.slug ?? current.categorySlug,
                }));
                setRoomTypes([createRoomTypeRow()]);
                setLocalExperiences([]);
                setExistingMedia([]);
                setVideoLinks('');
            }
            setLoading(false);
        };
        load();
    }, [navigate, listingId]);

    /* ── Preview URLs ── */
    useEffect(() => {
        const urls = selectedFiles.map((f) => URL.createObjectURL(f));
        setPreviewUrls(urls);
        return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }, [selectedFiles]);

    /* ── Field handlers ── */
    const updateField = (field: keyof FormState) => (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
        if (field === 'pricePerNight') {
            setRoomTypes((current) =>
                current.length === 1 && !current[0].pricePerNight
                    ? [{ ...current[0], pricePerNight: event.target.value }]
                    : current
            );
        }
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const files = Array.from(event.target.files ?? []);
        if (files.length > 0) {
            setSelectedFiles((prev) => [...prev, ...files]);
            setCoverImageIndex(0);
        }
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
        if (files.length > 0) {
            setSelectedFiles((prev) => [...prev, ...files]);
            setCoverImageIndex(0);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        if (coverImageIndex === index) {
            setCoverImageIndex(0);
        } else if (coverImageIndex > index) {
            setCoverImageIndex(coverImageIndex - 1);
        }
    };

    const updateRoomType = (roomTypeId: string, field: keyof RoomTypeFormState) => (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setRoomTypes((current) =>
            current.map((rt) => (rt.id === roomTypeId ? { ...rt, [field]: event.target.value } : rt))
        );
    };

    const handleRoomTypePhotosChange = (roomTypeId: string) => (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        setError(null);
        if (files.length === 0) return;
        setRoomTypes((current) => current.map((rt) => (rt.id === roomTypeId ? { ...rt, photoFiles: files } : rt)));
    };

    const updateRoomTypeVideoLinks = (roomTypeId: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
        setRoomTypes((current) =>
            current.map((rt) => (rt.id === roomTypeId ? { ...rt, videoLinks: event.target.value } : rt))
        );
    };

    const addRoomType = () => setRoomTypes((current) => [...current, createRoomTypeRow()]);

    const removeRoomType = (roomTypeId: string) => {
        setRoomTypes((current) => {
            const remaining = current.filter((rt) => rt.id !== roomTypeId);
            return remaining.length > 0 ? remaining : [createRoomTypeRow()];
        });
    };

    const updateExperience = (experienceId: string, field: keyof ExperienceFormState) => (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setLocalExperiences((current) =>
            current.map((experience) =>
                experience.id === experienceId ? { ...experience, [field]: event.target.value } : experience
            )
        );
    };

    const addExperience = () => {
        setLocalExperiences((current) => [...current, createExperienceRow()]);
    };

    const removeExperience = (experienceId: string) => {
        setLocalExperiences((current) => current.filter((exp) => exp.id !== experienceId));
    };

    /* ── Calendar ── */
    const refreshAvailabilityBlocks = async () => {
        if (!listingId) return;
        const blocks = await api.fetchAvailabilityBlocks(listingId);
        setAvailabilityBlocks(blocks);
    };

    const handleAddAvailabilityBlock = async () => {
        if (!listingId) return;
        if (!blockStart || !blockEnd) { setBlockError('Choose both dates first.'); return; }
        if (blockEnd <= blockStart) { setBlockError('Checkout must be after check-in.'); return; }
        setBlockSaving(true);
        setBlockError(null);
        try {
            const session = await authService.getSession();
            if (!session) { navigate('/host/auth', { replace: true }); return; }
            await api.createAvailabilityBlock({ listingId, startDate: blockStart, endDate: blockEnd, status: blockStatus });
            setBlockStart('');
            setBlockEnd('');
            setBlockStatus('booked');
            await refreshAvailabilityBlocks();
        } catch (err) {
            setBlockError(err instanceof Error ? err.message : 'Unable to update calendar');
        } finally {
            setBlockSaving(false);
        }
    };

    const handleDeleteBlock = async (blockId: string) => {
        setBlockSaving(true);
        setBlockError(null);
        try {
            const session = await authService.getSession();
            if (!session) { navigate('/host/auth', { replace: true }); return; }
            await api.deleteAvailabilityBlock(blockId);
            await refreshAvailabilityBlocks();
        } catch (err) {
            setBlockError(err instanceof Error ? err.message : 'Unable to delete block');
        } finally {
            setBlockSaving(false);
        }
    };

    /* ── Media preview ── */
    const currentPropertyMedia = useMemo(() => {
        const uploadedImages = previewUrls.map((url, index) => ({
            url, kind: 'image' as const, sourceType: 'upload' as const, sortOrder: index,
        }));
        const imageMedia = selectedFiles.length > 0 ? uploadedImages : preserveUploadedImages(existingMedia);
        const externalVideos = parseVideoLinks(videoLinks, imageMedia.length);
        return [...imageMedia, ...externalVideos];
    }, [existingMedia, previewUrls, selectedFiles.length, videoLinks]);

    /* ── Wizard navigation ── */
    const goToStep = (next: number) => {
        if (next === currentStep || animating) return;
        setDirection(next > currentStep ? 'forward' : 'back');
        setAnimating(true);
        setTimeout(() => {
            setCurrentStep(next);
            setAnimating(false);
            stepContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 180);
    };

    const nextStep = () => { if (currentStep < totalSteps) goToStep(currentStep + 1); };
    const prevStep = () => { if (currentStep > 1) goToStep(currentStep - 1); };

    /* ── Submit ── */
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const session = await authService.getSession();
            if (!session) { navigate('/host/auth', { replace: true }); return; }

            const propertyVideoMedia = parseVideoLinks(videoLinks);
            const existingPropertyImages = preserveUploadedImages(existingMedia);

            if (!isEditMode && selectedFiles.length === 0 && propertyVideoMedia.length === 0) {
                throw new Error('Add at least one property image or video link.');
            }
            if (isEditMode && selectedFiles.length === 0 && existingPropertyImages.length === 0 && propertyVideoMedia.length === 0) {
                throw new Error('Add at least one property image or video link.');
            }

            const normalizedRoomTypes = (await Promise.all(
                roomTypes.map(async (rt, index): Promise<RoomType | null> => {
                    const pricePerNight = Number(rt.pricePerNight || form.pricePerNight);
                    const totalCount = Number(rt.totalCount || 1);
                    const maxGuests = rt.maxGuests ? Number(rt.maxGuests) : undefined;
                    const beds = rt.beds ? Number(rt.beds) : undefined;

                    if (!rt.name.trim() || !Number.isFinite(pricePerNight) || pricePerNight <= 0 || !Number.isFinite(totalCount) || totalCount <= 0) {
                        return null;
                    }
                    const uploadedRoomPhotos = rt.photoFiles.length > 0
                        ? await uploadListingImages(session.user.id, rt.photoFiles)
                        : preserveUploadedImages(rt.existingMedia);
                    const roomVideoMedia = parseVideoLinks(rt.videoLinks, uploadedRoomPhotos.length);

                    const normalizedRoomType: RoomType = {
                        id: rt.id || `${index}-${rt.name.toLowerCase().replace(/\s+/g, '-')}`,
                        name: rt.name.trim(),
                        pricePerNight,
                        totalCount,
                    };
                    if (Number.isFinite(maxGuests ?? NaN)) normalizedRoomType.maxGuests = maxGuests;
                    if (Number.isFinite(beds ?? NaN)) normalizedRoomType.beds = beds;
                    if (rt.description.trim()) normalizedRoomType.description = rt.description.trim();

                    const roomMedia = [...uploadedRoomPhotos, ...roomVideoMedia].map((item, i) => ({ ...item, sortOrder: i }));
                    if (roomMedia.length > 0) {
                        normalizedRoomType.media = roomMedia;
                        normalizedRoomType.photos = roomMedia.filter((i) => i.kind === 'image').map((i) => i.url);
                    }
                    return normalizedRoomType;
                })
            )).filter((item): item is RoomType => Boolean(item));

            if (normalizedRoomTypes.length === 0) throw new Error('Add at least one room type with a price and count.');

            const startingPrice = Math.min(...normalizedRoomTypes.map((rt) => rt.pricePerNight));
            const hostName = form.hostName.trim();
            if (!hostName) throw new Error('Add the host name for this property.');

            const hostContactNumber = form.hostContactNumber.trim();
            if (!hostContactNumber) throw new Error('Add the host contact number for this property.');

            const uploadedPropertyMedia = selectedFiles.length > 0
                ? await uploadListingImages(session.user.id, selectedFiles)
                : undefined;
            if (selectedFiles.length > 0 && (!uploadedPropertyMedia || uploadedPropertyMedia.length === 0)) {
                throw new Error('Could not upload images. Make sure the `listing-images` storage bucket exists.');
            }

            const baseImages = uploadedPropertyMedia ?? existingPropertyImages;
            const reorderedImages = [...baseImages];
            if (coverImageIndex >= 0 && coverImageIndex < baseImages.length) {
                const [coverImg] = reorderedImages.splice(coverImageIndex, 1);
                reorderedImages.unshift(coverImg);
            }

            const propertyMedia = [
                ...reorderedImages,
                ...propertyVideoMedia,
            ].map((item, i) => ({ ...item, sortOrder: i }));

            const normalizedExperiences = localExperiences.map((exp, index): Experience | null => {
                const title = exp.title.trim();
                if (!title) return null;
                return {
                    id: exp.id || `${index}-${title.toLowerCase().replace(/\s+/g, '-')}`,
                    title,
                    category: exp.category,
                    description: exp.description.trim(),
                    iconOrImage: exp.iconOrImage.trim() || undefined,
                    distance: exp.distance.trim() || undefined,
                    travelTime: exp.travelTime.trim() || undefined,
                };
            }).filter((item): item is Experience => item !== null);

            const payload = {
                title: form.title,
                description: form.description,
                hostName,
                hostContactNumber,
                pricePerNight: startingPrice,
                currency: form.currency,
                categorySlug: form.categorySlug,
                city: form.city,
                country: form.country,
                mapLink: form.mapLink,
                ...(() => {
                    const extracted = extractCoordsFromGoogleMapsUrl(form.mapLink);
                    return extracted ? { lat: extracted.lat, lng: extracted.lng } : { lat: 0, lng: 0 };
                })(),
                guestCountMax: Number(form.guestCountMax),
                bedrooms: Number(form.bedrooms),
                beds: Number(form.beds),
                baths: Number(form.baths),
                availabilitySummary: form.availabilitySummary,
                amenityLabels: form.amenityLabels.split(',').map((a) => a.trim()).filter(Boolean),
                isGuestFavorite: false,
                roomTypes: normalizedRoomTypes,
                localExperiences: normalizedExperiences.length > 0 ? normalizedExperiences : undefined,
                ...(propertyMedia.length > 0 ? { media: propertyMedia } : {}),
            };

            if (isEditMode && listingId) {
                if (currentRole === 'admin') {
                    await api.updateListingAsAdmin(listingId, payload);
                } else {
                    await api.updateListing(session.user.id, listingId, payload);
                }
            } else {
                await api.createListing(session.user.id, { ...payload, media: propertyMedia });
            }

            navigate(backPath, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save property');
        } finally {
            setSaving(false);
        }
    };

    /* ─── Guards ──────────────────────────────────────────────────────────── */

    if (loading) {
        return <div className={styles.page}><SkeletonScreen variant="property-form" /></div>;
    }

    if (hostApprovalStatus && hostApprovalStatus !== 'approved') {
        return <HostApprovalStatusView status={hostApprovalStatus} />;
    }

    /* ─── Step content renderer ───────────────────────────────────────────── */

    const renderStepContent = () => {
        switch (currentStep) {
            /* ── Step 1: Basics ──────────────────────────────────────────── */
            case 1:
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.stepHeading}>
                            <div>
                                <h2>Let's start with the basics</h2>
                                <p>Give your property a compelling name and description.</p>
                            </div>
                        </div>

                        <label className={styles.field}>
                            <span>Property title</span>
                            <input
                                id="field-title"
                                value={form.title}
                                onChange={updateField('title')}
                                placeholder="e.g. Luxury villa with sea view"
                                required
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Description</span>
                            <textarea
                                id="field-description"
                                value={form.description}
                                onChange={updateField('description')}
                                placeholder="Describe what makes this place special…"
                                rows={5}
                                required
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Host name</span>
                            <input
                                id="field-host-name"
                                value={form.hostName}
                                onChange={updateField('hostName')}
                                placeholder="Name shown on the listing"
                                required
                            />
                        </label>
                        <label className={styles.field}>
                            <span>Host contact number</span>
                            <input
                                id="field-host-phone"
                                value={form.hostContactNumber}
                                onChange={updateField('hostContactNumber')}
                                placeholder="e.g. +91 98765 43210"
                                required
                            />
                        </label>
                    </div>
                );

            /* ── Step 2: Location ────────────────────────────────────────── */
            case 2:
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.stepHeading}>
                            <div>
                                <h2>Where is it located?</h2>
                                <p>Help guests find your property easily.</p>
                            </div>
                        </div>
                        <div className={styles.grid}>
                            <label className={styles.field}>
                                <span>City</span>
                                <input id="field-city" value={form.city} onChange={updateField('city')} placeholder="e.g. Goa" required />
                            </label>
                            <label className={styles.field}>
                                <span>Country</span>
                                <input id="field-country" value={form.country} onChange={updateField('country')} placeholder="e.g. India" required />
                            </label>
                        </div>
                        <label className={styles.field}>
                            <span>Google Maps link</span>
                            <input
                                id="field-map-link"
                                value={form.mapLink}
                                onChange={updateField('mapLink')}
                                placeholder="https://maps.app.goo.gl/..."
                                required
                            />
                            <small className={styles.helperText}>Short links like maps.app.goo.gl/… work great.</small>
                        </label>
                    </div>
                );

            /* ── Step 3: Details ─────────────────────────────────────────── */
            case 3:
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.stepHeading}>
                            <div>
                                <h2>Property details</h2>
                                <p>Tell guests about the space and how many it fits.</p>
                            </div>
                        </div>
                        <div className={styles.grid}>
                            <label className={styles.field}>
                                <span>Category</span>
                                <select id="field-category" value={form.categorySlug} onChange={updateField('categorySlug')}>
                                    {categories.filter((c) => c.slug && c.slug !== 'icons').map((c) => (
                                        <option key={c.slug} value={c.slug}>{c.label}</option>
                                    ))}
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>Availability summary</span>
                                <input id="field-availability" value={form.availabilitySummary} onChange={updateField('availabilitySummary')} />
                            </label>
                        </div>
                        <div className={styles.counterGrid}>
                            <div className={styles.counterCard}>
                                <span className={styles.counterLabel}>Max guests</span>
                                <div className={styles.counterRow}>
                                    <button type="button" className={styles.counterBtn}
                                        onClick={() => setForm((f) => ({ ...f, guestCountMax: String(Math.max(1, Number(f.guestCountMax) - 1)) }))}>−</button>
                                    <span className={styles.counterValue}>{form.guestCountMax}</span>
                                    <button type="button" className={styles.counterBtn}
                                        onClick={() => setForm((f) => ({ ...f, guestCountMax: String(Number(f.guestCountMax) + 1) }))}>+</button>
                                </div>
                            </div>
                            <div className={styles.counterCard}>
                                <span className={styles.counterLabel}>Bedrooms</span>
                                <div className={styles.counterRow}>
                                    <button type="button" className={styles.counterBtn}
                                        onClick={() => setForm((f) => ({ ...f, bedrooms: String(Math.max(0, Number(f.bedrooms) - 1)) }))}>−</button>
                                    <span className={styles.counterValue}>{form.bedrooms}</span>
                                    <button type="button" className={styles.counterBtn}
                                        onClick={() => setForm((f) => ({ ...f, bedrooms: String(Number(f.bedrooms) + 1) }))}>+</button>
                                </div>
                            </div>
                            <div className={styles.counterCard}>
                                <span className={styles.counterLabel}>Beds</span>
                                <div className={styles.counterRow}>
                                    <button type="button" className={styles.counterBtn}
                                        onClick={() => setForm((f) => ({ ...f, beds: String(Math.max(0, Number(f.beds) - 1)) }))}>−</button>
                                    <span className={styles.counterValue}>{form.beds}</span>
                                    <button type="button" className={styles.counterBtn}
                                        onClick={() => setForm((f) => ({ ...f, beds: String(Number(f.beds) + 1) }))}>+</button>
                                </div>
                            </div>
                            <div className={styles.counterCard}>
                                <span className={styles.counterLabel}>Baths</span>
                                <div className={styles.counterRow}>
                                    <button type="button" className={styles.counterBtn}
                                        onClick={() => setForm((f) => ({ ...f, baths: String(Math.max(0, Number(f.baths) - 1)) }))}>−</button>
                                    <span className={styles.counterValue}>{form.baths}</span>
                                    <button type="button" className={styles.counterBtn}
                                        onClick={() => setForm((f) => ({ ...f, baths: String(Number(f.baths) + 1) }))}>+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            /* ── Step 4: Pricing ─────────────────────────────────────────── */
            case 4:
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.stepHeading}>
                            <div>
                                <h2>Set your pricing</h2>
                                <p>This base price appears on search cards. Room types can override it.</p>
                            </div>
                        </div>
                        <div className={styles.pricingRow}>
                            <label className={styles.field} style={{ flex: 2 }}>
                                <span>Starting price per night</span>
                                <div className={styles.priceInputWrapper}>
                                    <span className={styles.currencySymbol}>{form.currency === 'INR' ? '₹' : '$'}</span>
                                    <input
                                        id="field-price"
                                        type="number"
                                        min="0"
                                        value={form.pricePerNight}
                                        onChange={updateField('pricePerNight')}
                                        className={styles.priceInput}
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <small className={styles.helperText}>Room types below can have their own prices.</small>
                            </label>
                            <label className={styles.field} style={{ flex: 1 }}>
                                <span>Currency</span>
                                <select id="field-currency" value={form.currency} onChange={updateField('currency')}>
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </label>
                        </div>
                    </div>
                );

            /* ── Step 5: Room Types ───────────────────────────────────────── */
            case 5:
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.stepHeading}>
                            <div>
                                <h2>Room types</h2>
                                <p>Add one or more room categories with their own rates and inventory.</p>
                            </div>
                        </div>
                        <div className={styles.roomTypeList}>
                            {roomTypes.map((rt, index) => {
                                const roomExistingImages = rt.photoFiles.length > 0
                                    ? []
                                    : preserveUploadedImages(rt.existingMedia).map((item, mi) => ({
                                        url: item.url,
                                        fileName: `Photo ${mi + 1}`,
                                        key: `${rt.id}-image-${item.url}-${mi}`,
                                    }));
                                const roomPreviewVideos = parseVideoLinks(rt.videoLinks, roomExistingImages.length);
                                const rtRoomPhotoUrls = rt.photoFiles.map(f => URL.createObjectURL(f));
                                return (
                                    <article key={rt.id} className={styles.roomTypeCard}>
                                        {/* Card header */}
                                        <div className={styles.roomTypeCardHeader}>
                                            <div className={styles.roomTypeCardTitle}>
                                                <span className={styles.roomTypeBadge}>{index + 1}</span>
                                                <input
                                                    className={styles.roomTypeNameInput}
                                                    value={rt.name}
                                                    onChange={updateRoomType(rt.id, 'name')}
                                                    placeholder="Room name (e.g. Deluxe King)"
                                                    required
                                                />
                                            </div>
                                            <button type="button" className={styles.roomTypeRemove} onClick={() => removeRoomType(rt.id)}>
                                                <Trash2 size={14} /> Remove
                                            </button>
                                        </div>

                                        {/* Price row */}
                                        <div className={styles.rtPriceRow}>
                                            <label className={styles.rtPriceLabel}>
                                                <span>Nightly price</span>
                                                <div className={styles.rtPriceWrapper}>
                                                    <span className={styles.rtCurrencySymbol}>
                                                        {form.currency === 'INR' ? '₹' : form.currency === 'EUR' ? '€' : form.currency === 'GBP' ? '£' : '$'}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={rt.pricePerNight}
                                                        onChange={updateRoomType(rt.id, 'pricePerNight')}
                                                        className={styles.rtPriceInput}
                                                        placeholder="0"
                                                        required
                                                    />
                                                </div>
                                            </label>
                                        </div>

                                        {/* Counter row */}
                                        <div className={styles.rtCounterRow}>
                                            <div className={styles.rtCounter}>
                                                <span className={styles.rtCounterLabel}>Rooms</span>
                                                <div className={styles.counterRow}>
                                                    <button type="button" className={styles.counterBtn}
                                                        onClick={() => setRoomTypes(cur => cur.map(r => r.id === rt.id ? { ...r, totalCount: String(Math.max(1, Number(r.totalCount) - 1)) } : r))}>−</button>
                                                    <span className={styles.counterValue}>{rt.totalCount}</span>
                                                    <button type="button" className={styles.counterBtn}
                                                        onClick={() => setRoomTypes(cur => cur.map(r => r.id === rt.id ? { ...r, totalCount: String(Number(r.totalCount) + 1) } : r))}>+</button>
                                                </div>
                                            </div>
                                            <div className={styles.rtCounter}>
                                                <span className={styles.rtCounterLabel}>Max guests</span>
                                                <div className={styles.counterRow}>
                                                    <button type="button" className={styles.counterBtn}
                                                        onClick={() => setRoomTypes(cur => cur.map(r => r.id === rt.id ? { ...r, maxGuests: String(Math.max(1, Number(r.maxGuests) - 1)) } : r))}>−</button>
                                                    <span className={styles.counterValue}>{rt.maxGuests}</span>
                                                    <button type="button" className={styles.counterBtn}
                                                        onClick={() => setRoomTypes(cur => cur.map(r => r.id === rt.id ? { ...r, maxGuests: String(Number(r.maxGuests) + 1) } : r))}>+</button>
                                                </div>
                                            </div>
                                            <div className={styles.rtCounter}>
                                                <span className={styles.rtCounterLabel}>Beds</span>
                                                <div className={styles.counterRow}>
                                                    <button type="button" className={styles.counterBtn}
                                                        onClick={() => setRoomTypes(cur => cur.map(r => r.id === rt.id ? { ...r, beds: String(Math.max(0, Number(r.beds) - 1)) } : r))}>−</button>
                                                    <span className={styles.counterValue}>{rt.beds}</span>
                                                    <button type="button" className={styles.counterBtn}
                                                        onClick={() => setRoomTypes(cur => cur.map(r => r.id === rt.id ? { ...r, beds: String(Number(r.beds) + 1) } : r))}>+</button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <label className={styles.field}>
                                            <span>Description <span className={styles.optionalLabel}>(optional)</span></span>
                                            <textarea
                                                value={rt.description}
                                                onChange={updateRoomType(rt.id, 'description')}
                                                rows={2}
                                                placeholder="What makes this room special?"
                                            />
                                        </label>

                                        {/* Photo zone */}
                                        <div className={styles.rtMediaSection}>
                                            <span className={styles.rtMediaLabel}>Room photos</span>
                                            <div
                                                className={styles.rtDropZone}
                                                onClick={() => document.getElementById(`rt-photo-${rt.id}`)?.click()}
                                            >
                                                {(rtRoomPhotoUrls.length > 0 || roomExistingImages.length > 0) ? (
                                                    <div className={styles.rtPhotoStrip}>
                                                        {roomExistingImages.map((item, pi) => (
                                                            <img key={item.key} src={item.url} alt={`Photo ${pi + 1}`} className={styles.rtPhotoThumb} />
                                                        ))}
                                                        {rtRoomPhotoUrls.map((url, pi) => (
                                                            <img key={`${rt.id}-new-${pi}`} src={url} alt={`New photo ${pi + 1}`} className={styles.rtPhotoThumb} />
                                                        ))}
                                                        <div className={styles.rtAddMorePhoto}>
                                                            <Plus size={18} />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={styles.rtDropZoneEmpty}>
                                                        <Upload size={20} />
                                                        <span>Click to add photos</span>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                id={`rt-photo-${rt.id}`}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleRoomTypePhotosChange(rt.id)}
                                                style={{ display: 'none' }}
                                            />
                                        </div>

                                        {/* Video links */}
                                        <label className={styles.field}>
                                            <span>Video links <span className={styles.optionalLabel}>(optional)</span></span>
                                            <textarea
                                                value={rt.videoLinks}
                                                onChange={updateRoomTypeVideoLinks(rt.id)}
                                                rows={2}
                                                placeholder="YouTube, Instagram… one per line"
                                            />
                                        </label>

                                        {/* Video previews */}
                                        {roomPreviewVideos.length > 0 && (
                                            <div className={styles.roomTypePhotoPreview}>
                                                {roomPreviewVideos.map((item, vi) => (
                                                    <figure key={`${rt.id}-${item.url}-${vi}`} className={styles.roomTypeVideoCard}>
                                                        <div className={styles.videoPreviewPlaceholder}><PlayCircle size={20} /></div>
                                                        <figcaption>{item.provider === 'unknown' ? 'Video link' : `${item.provider}`}</figcaption>
                                                    </figure>
                                                ))}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                        <button type="button" className={styles.addRoomTypeBtn} onClick={addRoomType}>
                            <Plus size={16} /> Add room type
                        </button>
                    </div>
                );

            /* ── Step 6: Media ───────────────────────────────────────────── */
            case 6:
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.stepHeading}>
                            <div>
                                <h2>Photos &amp; videos</h2>
                                <p>Great visuals help guests fall in love with your place.</p>
                            </div>
                        </div>

                        {/* Drag-drop zone */}
                        <div
                            className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => document.getElementById('media-file-input')?.click()}
                        >
                            <Upload size={32} className={styles.dropZoneIcon} />
                            <p className={styles.dropZoneTitle}>Drag &amp; drop photos here</p>
                            <p className={styles.dropZoneSub}>or click to browse — JPG, PNG, WEBP</p>
                            <input
                                id="media-file-input"
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {/* Preview strip */}
                        {currentPropertyMedia.length > 0 && (
                            <div className={styles.previewGrid}>
                                {currentPropertyMedia.map((item, index) => (
                                    <figure key={`${item.url}-${index}`} className={styles.previewCard}>
                                        {item.kind === 'image' ? (
                                            <>
                                                <img src={item.url} alt={form.title || `Property image ${index + 1}`} className={styles.previewImage} />
                                                {index < selectedFiles.length && (
                                                    <button
                                                        type="button"
                                                        className={styles.removeMediaBtn}
                                                        onClick={() => removeFile(index)}
                                                        title="Remove image"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                )}
                                                {index === coverImageIndex ? (
                                                    <div className={styles.coverBadge}>
                                                        Cover Photo
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className={styles.setCoverBtn}
                                                        onClick={(e) => { e.stopPropagation(); setCoverImageIndex(index); }}
                                                    >
                                                        Set as cover
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <div className={styles.videoPreviewPlaceholder}>
                                                <PlayCircle size={28} />
                                                <span>{item.provider === 'unknown' ? 'Video link' : `${item.provider} video`}</span>
                                            </div>
                                        )}
                                        <figcaption>
                                            {item.kind === 'image'
                                                ? (selectedFiles[index]?.name ?? `Image ${index + 1}`)
                                                : item.url}
                                        </figcaption>
                                    </figure>
                                ))}
                            </div>
                        )}

                        <label className={styles.field}>
                            <span>Property video links</span>
                            <textarea
                                id="field-video-links"
                                value={videoLinks}
                                onChange={(e) => setVideoLinks(e.target.value)}
                                placeholder="Paste YouTube, Instagram, or Google Drive links. One per line."
                                rows={3}
                            />
                            <small className={styles.helperText}>Supported links are embedded when possible. Otherwise guests see an open-link card.</small>
                        </label>

                        {isEditMode && existingMedia.length > 0 && selectedFiles.length === 0 && (
                            <p className={styles.helperText}>
                                Uploading new images will replace the current uploaded photos. Video links stay editable.
                            </p>
                        )}
                    </div>
                );

            /* ── Step 7: Local Experiences ───────────────────────────────── */
            case 7:
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.stepHeading}>
                            <div>
                                <h2>Local Experiences</h2>
                                <p>Help guests discover local attractions, food options, activities, and nature spots nearby.</p>
                            </div>
                            <button type="button" className={styles.addRoomTypeBtn} onClick={addExperience}>
                                <Plus size={16} /> Add experience
                            </button>
                        </div>

                        {localExperiences.length > 0 ? (
                            <div className={styles.roomTypeList}>
                                {localExperiences.map((experience, index) => (
                                    <article key={experience.id} className={styles.roomTypeCard}>
                                        <div className={styles.roomTypeCardHeader}>
                                            <div className={styles.roomTypeCardTitle}>
                                                <span className={styles.roomTypeBadge}>{index + 1}</span>
                                                <input
                                                    className={styles.roomTypeNameInput}
                                                    value={experience.title}
                                                    onChange={updateExperience(experience.id, 'title')}
                                                    placeholder="Attraction or activity name (e.g. Sunset Cruise)"
                                                    required
                                                />
                                            </div>
                                            <button type="button" className={styles.roomTypeRemove} onClick={() => removeExperience(experience.id)}>
                                                <Trash2 size={14} /> Remove
                                            </button>
                                        </div>

                                        <div className={styles.rtCounterRow}>
                                            <label className={styles.field} style={{ flex: 1 }}>
                                                <span>Category</span>
                                                <select
                                                    value={experience.category}
                                                    onChange={updateExperience(experience.id, 'category')}
                                                >
                                                    <option value="Attraction">Attraction</option>
                                                    <option value="Activity">Activity</option>
                                                    <option value="Food & Dining">Food & Dining</option>
                                                    <option value="Nature">Nature</option>
                                                    <option value="Adventure">Adventure</option>
                                                    <option value="Shopping">Shopping</option>
                                                    <option value="Culture & Heritage">Culture & Heritage</option>
                                                    <option value="Wellness">Wellness</option>
                                                    <option value="Nightlife">Nightlife</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </label>

                                            <label className={styles.field} style={{ flex: 1 }}>
                                                <span>Icon or Emoji (Optional)</span>
                                                <input
                                                    value={experience.iconOrImage}
                                                    onChange={updateExperience(experience.id, 'iconOrImage')}
                                                    placeholder="e.g. 🚤, 🏛️, 🍝"
                                                />
                                            </label>
                                        </div>

                                        <div className={styles.grid}>
                                            <label className={styles.field}>
                                                <span>Distance (Optional)</span>
                                                <input
                                                    value={experience.distance}
                                                    onChange={updateExperience(experience.id, 'distance')}
                                                    placeholder="e.g. 1.5 km away"
                                                />
                                            </label>

                                            <label className={styles.field}>
                                                <span>Travel time (Optional)</span>
                                                <input
                                                    value={experience.travelTime}
                                                    onChange={updateExperience(experience.id, 'travelTime')}
                                                    placeholder="e.g. 10 mins walk / 5 mins drive"
                                                />
                                            </label>
                                        </div>

                                        <label className={styles.field}>
                                            <span>Description</span>
                                            <textarea
                                                value={experience.description}
                                                onChange={updateExperience(experience.id, 'description')}
                                                placeholder="Tell guests what makes this experience special, when to visit, or any tips..."
                                                rows={3}
                                                required
                                            />
                                        </label>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.rtDropZoneEmpty} onClick={addExperience} style={{ cursor: 'pointer' }}>
                                <Compass size={24} />
                                <span>No local experiences added yet. Click here to add one.</span>
                            </div>
                        )}
                    </div>
                );

            /* ── Step 8: Amenities + Calendar ────────────────────────────── */
            case 8:
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.stepHeading}>
                            <div>
                                <h2>Amenities</h2>
                                <p>Select everything your property offers.</p>
                            </div>
                        </div>

                        {/* Grouped chip categories */}
                        <div id="amenity-chips" className={styles.amenityCategoryList}>
                            {AMENITY_CATEGORIES.map((category) => (
                                <div key={category.label} className={styles.amenityCategory}>
                                    <p className={styles.amenityCategoryLabel}>
                                        <category.icon size={16} className={styles.categoryIcon} />
                                        <span>{category.label}</span>
                                    </p>
                                    <div className={styles.amenityGrid}>
                                        {category.amenities.map((key) => {
                                            const active = selectedAmenities.has(key);
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    className={`${styles.amenityChip} ${active ? styles.amenityChipActive : ''}`}
                                                    onClick={() => toggleAmenity(key)}
                                                >
                                                    <span className={styles.amenityChipIcon}>
                                                        <AmenityIcon name={key} />
                                                    </span>
                                                    <span>{key}</span>
                                                    {active && <Check size={13} className={styles.amenityCheck} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Custom amenity — for truly unique offerings */}
                        <div className={styles.customAmenitySection}>
                            <p className={styles.customAmenityHeading}>
                                <Sparkles size={18} className={styles.categoryIcon} />
                                <span>Something unique to your property?</span>
                            </p>
                            <p className={styles.customAmenityHint}>Add amenities that aren't in the list above — e.g. "Private helipad", "Koi pond", "Chess room".</p>
                            <div className={styles.customAmenityRow}>
                                <input
                                    id="custom-amenity-input"
                                    className={styles.customAmenityInput}
                                    value={customAmenity}
                                    onChange={(e) => setCustomAmenity(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); } }}
                                    placeholder="Type and press Enter or click +"
                                />
                                <button type="button" className={styles.customAmenityAdd} onClick={addCustomAmenity}>
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Selected custom amenities tags */}
                        {Array.from(selectedAmenities).filter((a) => !ALL_PREDEFINED_AMENITIES.includes(a)).length > 0 && (
                            <div className={styles.customAmenityTags}>
                                {Array.from(selectedAmenities)
                                    .filter((a) => !ALL_PREDEFINED_AMENITIES.includes(a))
                                    .map((a) => (
                                        <span key={a} className={styles.customAmenityTag}>
                                            {a}
                                            <button type="button" onClick={() => toggleAmenity(a)}><X size={12} /></button>
                                        </span>
                                    ))}
                            </div>
                        )}

                        {/* Calendar (edit mode only) */}
                        {isEditMode && (
                            <section className={styles.calendarSection} id="availability">
                                <div className={styles.calendarSectionHeader}>
                                    <CalendarDays size={18} />
                                    <div>
                                        <h3>Calendar status</h3>
                                        <p>Available by default. Block dates when the property is booked or restricted.</p>
                                    </div>
                                </div>

                                <div className={styles.availabilityForm}>
                                    <label className={styles.field}>
                                        <span>Start date</span>
                                        <input type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
                                    </label>
                                    <label className={styles.field}>
                                        <span>End date</span>
                                        <input type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Status</span>
                                        <select value={blockStatus} onChange={(e) => setBlockStatus(e.target.value as AvailabilityBlockStatus)}>
                                            <option value="booked">Booked</option>
                                            <option value="restricted">Restricted</option>
                                        </select>
                                    </label>
                                </div>

                                <div className={styles.availabilityActions}>
                                    <button type="button" className={styles.primaryButton} onClick={handleAddAvailabilityBlock} disabled={blockSaving}>
                                        <Plus size={16} /> {blockSaving ? 'Saving…' : 'Block dates'}
                                    </button>
                                    {blockError && <div className={styles.blockError}>{blockError}</div>}
                                </div>

                                <div className={styles.blockList}>
                                    {availabilityBlocks.length > 0 ? (
                                        availabilityBlocks.map((block) => (
                                            <article key={block.id} className={styles.blockCard}>
                                                <div>
                                                    <strong>{formatBlockRange(block.startDate, block.endDate)}</strong>
                                                    <p>
                                                        <span className={block.status === 'booked' ? styles.bookedBadge : styles.restrictedBadge}>
                                                            {blockStatusLabel[block.status]}
                                                        </span>
                                                        {block.reason ? ` ${block.reason}` : ''}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.blockDeleteButton}
                                                    onClick={() => handleDeleteBlock(block.id)}
                                                    disabled={blockSaving}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </article>
                                        ))
                                    ) : (
                                        <div className={styles.emptyAvailability}>
                                            No blocked dates yet. The listing is available by default.
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    /* ─── Render ─────────────────────────────────────────────────────────── */

    return (
        <div className={styles.page}>
            {/* ── Wizard shell ── */}
            <form className={styles.wizardShell} onSubmit={handleSubmit}>

                {/* ── Sidebar ── */}
                <aside className={styles.sidebar}>
                    <div className={styles.sidebarBrand}>
                        <div className={styles.sidebarKicker}>{isEditMode ? 'Edit property' : 'Add property'}</div>
                        <h1 className={styles.sidebarTitle}>{isEditMode ? 'Update listing' : 'Publish a stay'}</h1>
                    </div>

                    <nav className={styles.sidebarNav}>
                        {STEPS.map((step) => {
                            const Icon = step.icon;
                            const isDone = step.id < currentStep;
                            const isActive = step.id === currentStep;
                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    className={`${styles.sidebarStep} ${isActive ? styles.sidebarStepActive : ''} ${isDone ? styles.sidebarStepDone : ''}`}
                                    onClick={() => goToStep(step.id)}
                                    disabled={step.id === 8 && !isEditMode && step.id > currentStep}
                                >
                                    <span className={styles.sidebarStepNum}>
                                        {isDone ? <CheckCircle2 size={16} strokeWidth={1.5} /> : <Icon size={16} strokeWidth={1.5} />}
                                    </span>
                                    <span className={styles.sidebarStepLabel}>{step.label}</span>
                                </button>
                            );
                        })}
                    </nav>

                    <Link to={backPath} className={styles.sidebarBack}>← Back to dashboard</Link>
                </aside>

                {/* ── Main ── */}
                <div className={styles.mainArea}>
                    {/* Mobile progress bar */}
                    <div className={styles.mobileProgress}>
                        <div className={styles.mobileProgressBar} style={{ width: `${(currentStep / totalSteps) * 100}%` }} />
                    </div>
                    <div className={styles.mobileStepLabel}>Step {currentStep} of {totalSteps} — {STEPS[currentStep - 1].label}</div>

                    {/* Step content */}
                    <div
                        ref={stepContentRef}
                        className={`${styles.stepWrapper} ${animating ? (direction === 'forward' ? styles.slideOut : styles.slideOutBack) : ''}`}
                    >
                        {error && <div className={styles.error}>{error}</div>}
                        {renderStepContent()}
                    </div>

                    {/* Footer actions */}
                    <div className={styles.stepActions}>
                        <button
                            type="button"
                            className={styles.stepActionBack}
                            onClick={prevStep}
                            disabled={currentStep === 1}
                        >
                            <ChevronLeft size={18} /> Back
                        </button>

                        <div className={styles.stepDots}>
                            {STEPS.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    className={`${styles.stepDot} ${s.id === currentStep ? styles.stepDotActive : ''} ${s.id < currentStep ? styles.stepDotDone : ''}`}
                                    onClick={() => goToStep(s.id)}
                                    aria-label={`Go to step ${s.id}`}
                                />
                            ))}
                        </div>

                        {currentStep < totalSteps ? (
                            <button type="button" className={styles.stepActionNext} onClick={nextStep}>
                                Next <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button type="submit" className={styles.stepActionSubmit} disabled={saving}>
                                {saving ? 'Saving…' : isEditMode ? 'Save changes' : 'Create property'}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};
