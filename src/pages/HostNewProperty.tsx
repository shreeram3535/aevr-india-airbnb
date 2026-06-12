import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    CalendarDays, Plus, Trash2, PlayCircle, CheckCircle2, ChevronRight,
    ChevronLeft, Upload, MapPin, Home, DollarSign, BedDouble, Image, Wifi,
    Check, X,
} from 'lucide-react';
import styles from './HostNewProperty.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabase';
import { uploadListingImages } from '../services/storage';
import { HostApprovalStatusView } from '../components/HostApprovalStatus';
import { SkeletonScreen } from '../components/SkeletonScreen';
import type { AvailabilityBlock, AvailabilityBlockStatus, Category, Listing, ListingMediaItem, RoomType } from '../types';
import { createExternalVideoMedia } from '../services/media';
import { extractCoordsFromGoogleMapsUrl } from '../services/mapUtils';

/* ─── Types ──────────────────────────────────────────────────────────────── */

type FormState = {
    title: string;
    description: string;
    hostName: string;
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

/* ─── Amenity SVG icons (Airbnb-style vectors) ───────────────────────────── */

const AmenityIcon = ({ name }: { name: string }) => {
    const s = { width: 24, height: 24, viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
    switch (name) {
        case 'Wifi': return <svg {...s}><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" /></svg>;
        case 'Kitchen': return <svg {...s}><rect x="3" y="3" width="26" height="7" rx="2" /><path d="M3 10v18a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V10" /><line x1="10" y1="10" x2="10" y2="30" /><circle cx="20" cy="20" r="4" /><line x1="20" y1="16" x2="20" y2="13" /></svg>;
        case 'Pool': return <svg {...s}><path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" /><path d="M2 26c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" /><path d="M10 14V6l6-4" /><line x1="16" y1="6" x2="22" y2="6" /></svg>;
        case 'AC': return <svg {...s}><rect x="2" y="6" width="28" height="12" rx="3" /><line x1="8" y1="18" x2="6" y2="26" /><line x1="16" y1="18" x2="16" y2="26" /><line x1="24" y1="18" x2="26" y2="26" /><line x1="7" y1="12" x2="25" y2="12" /></svg>;
        case 'Gym': return <svg {...s}><path d="M6 10H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /><path d="M26 10h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" /><line x1="6" y1="16" x2="26" y2="16" /><rect x="6" y="10" width="4" height="12" rx="2" /><rect x="22" y="10" width="4" height="12" rx="2" /></svg>;
        case 'Parking': return <svg {...s}><rect x="3" y="3" width="26" height="26" rx="4" /><path d="M11 22V10h6a5 5 0 0 1 0 10h-6" /></svg>;
        case 'Hot tub': return <svg {...s}><path d="M4 22v2a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4v-2" /><path d="M4 22H28" /><path d="M8 22V16a8 8 0 0 1 16 0v6" /><path d="M10 8c0-2 1.5-4 4-4" /><path d="M18 8c0-2 1.5-4 4-4" /></svg>;
        case 'BBQ': return <svg {...s}><path d="M5 12c0 6 4.5 10 11 10s11-4 11-10" /><path d="M4 12h24" /><line x1="16" y1="22" x2="16" y2="28" /><line x1="10" y1="28" x2="22" y2="28" /><path d="M9 6c1-2 3-2 4 0s3 2 4 0 3-2 4 0" /></svg>;
        case 'TV': return <svg {...s}><rect x="2" y="7" width="28" height="18" rx="3" /><path d="M10 25l2 4h8l2-4" /><line x1="8" y1="13" x2="24" y2="13" /><line x1="8" y1="18" x2="20" y2="18" /></svg>;
        case 'Washer': return <svg {...s}><rect x="3" y="3" width="26" height="26" rx="4" /><circle cx="16" cy="18" r="6" /><circle cx="16" cy="18" r="3" /><line x1="8" y1="8" x2="8" y2="8" strokeWidth={3} /><line x1="13" y1="8" x2="19" y2="8" /></svg>;
        case 'Dryer': return <svg {...s}><rect x="3" y="3" width="26" height="26" rx="4" /><circle cx="16" cy="18" r="6" /><path d="M12 14l8 8M20 14l-8 8" /><line x1="8" y1="8" x2="8" y2="8" strokeWidth={3} /><line x1="13" y1="8" x2="19" y2="8" /></svg>;
        case 'Pet friendly': return <svg {...s}><ellipse cx="8" cy="10" rx="3" ry="4" /><ellipse cx="24" cy="10" rx="3" ry="4" /><ellipse cx="4" cy="20" rx="3" ry="4" /><ellipse cx="28" cy="20" rx="3" ry="4" /><path d="M16 14c-5 0-9 3-9 8 0 3 4 6 9 6s9-3 9-6c0-5-4-8-9-8z" /></svg>;
        case 'Workspace': return <svg {...s}><rect x="2" y="6" width="28" height="18" rx="3" /><line x1="2" y1="26" x2="30" y2="26" /><line x1="16" y1="24" x2="16" y2="26" /><line x1="9" y1="12" x2="23" y2="12" /><line x1="9" y1="17" x2="18" y2="17" /></svg>;
        case 'Balcony': return <svg {...s}><rect x="3" y="3" width="26" height="26" rx="2" /><line x1="3" y1="16" x2="29" y2="16" /><line x1="10" y1="16" x2="10" y2="29" /><line x1="22" y1="16" x2="22" y2="29" /></svg>;
        case 'Garden': return <svg {...s}><path d="M16 28V16" /><path d="M16 16c0 0-4-6-8-8 0 0 2 8 8 8z" /><path d="M16 16c0 0 4-6 8-8 0 0-2 8-8 8z" /><path d="M16 20c0 0-5-3-9-2 0 0 3 7 9 2z" /><line x1="10" y1="28" x2="22" y2="28" /></svg>;
        case 'Beach access': return <svg {...s}><path d="M4 28c4-8 10-12 14-10" /><path d="M4 28c2-10 8-16 16-14" /><circle cx="22" cy="8" r="4" /><line x1="4" y1="28" x2="28" y2="28" /></svg>;
        case 'Elevator': return <svg {...s}><rect x="5" y="2" width="22" height="28" rx="3" /><line x1="16" y1="2" x2="16" y2="30" /><path d="M10 10l-3-4-3 4" /><path d="M22 22l3 4 3-4" /></svg>;
        case 'Fireplace': return <svg {...s}><path d="M6 28V10a10 10 0 0 1 20 0v18" /><path d="M4 28h24" /><path d="M16 22c-3 0-5-2-5-5 0-4 5-7 5-7s5 3 5 7c0 3-2 5-5 5z" /></svg>;
        default: return <svg {...s}><circle cx="16" cy="16" r="10" /><line x1="16" y1="10" x2="16" y2="22" /><line x1="10" y1="16" x2="22" y2="16" /></svg>;
    }
};

/* ─── Amenity data ───────────────────────────────────────────────────────── */

const AMENITY_CHIPS = [
    { key: 'Wifi' },
    { key: 'Kitchen' },
    { key: 'Pool' },
    { key: 'AC' },
    { key: 'Gym' },
    { key: 'Parking' },
    { key: 'Hot tub' },
    { key: 'BBQ' },
    { key: 'TV' },
    { key: 'Washer' },
    { key: 'Dryer' },
    { key: 'Pet friendly' },
    { key: 'Workspace' },
    { key: 'Balcony' },
    { key: 'Garden' },
    { key: 'Beach access' },
    { key: 'Elevator' },
    { key: 'Fireplace' },
];

/* ─── Step definitions ───────────────────────────────────────────────────── */

const STEPS = [
    { id: 1, label: 'Basics',     icon: Home },
    { id: 2, label: 'Location',   icon: MapPin },
    { id: 3, label: 'Details',    icon: BedDouble },
    { id: 4, label: 'Pricing',    icon: DollarSign },
    { id: 5, label: 'Room Types', icon: BedDouble },
    { id: 6, label: 'Media',      icon: Image },
    { id: 7, label: 'Amenities',  icon: Wifi },
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const initialState: FormState = {
    title: '',
    description: '',
    hostName: '',
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
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [existingMedia, setExistingMedia] = useState<ListingMediaItem[]>([]);
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
    const totalSteps = isEditMode ? 7 : 7;
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
        setSelectedFiles((prev) => [...prev, ...files]);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setIsDragging(false);
        const files = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
        if (files.length > 0) setSelectedFiles((prev) => [...prev, ...files]);
    };

    const removeFile = (index: number) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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

            const uploadedPropertyMedia = selectedFiles.length > 0
                ? await uploadListingImages(session.user.id, selectedFiles)
                : undefined;
            if (selectedFiles.length > 0 && (!uploadedPropertyMedia || uploadedPropertyMedia.length === 0)) {
                throw new Error('Could not upload images. Make sure the `listing-images` storage bucket exists.');
            }

            const propertyMedia = [
                ...(uploadedPropertyMedia ?? existingPropertyImages),
                ...propertyVideoMedia,
            ].map((item, i) => ({ ...item, sortOrder: i }));

            const payload = {
                title: form.title,
                description: form.description,
                hostName,
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

            /* ── Step 7: Amenities + Calendar ────────────────────────────── */
            case 7:
                return (
                    <div className={styles.stepContent}>
                        <div className={styles.stepHeading}>
                            <div>
                                <h2>Amenities</h2>
                                <p>Select everything your property offers.</p>
                            </div>
                        </div>

                        {/* Chip grid */}
                        <div className={styles.amenityGrid} id="amenity-chips">
                            {AMENITY_CHIPS.map((amenity) => {
                                const active = selectedAmenities.has(amenity.key);
                                return (
                                    <button
                                        key={amenity.key}
                                        type="button"
                                        className={`${styles.amenityChip} ${active ? styles.amenityChipActive : ''}`}
                                        onClick={() => toggleAmenity(amenity.key)}
                                    >
                                        <span className={styles.amenityChipIcon}>
                                            <AmenityIcon name={amenity.key} />
                                        </span>
                                        <span>{amenity.key}</span>
                                        {active && <Check size={13} className={styles.amenityCheck} />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom amenity */}
                        <div className={styles.customAmenityRow}>
                            <input
                                id="custom-amenity-input"
                                className={styles.customAmenityInput}
                                value={customAmenity}
                                onChange={(e) => setCustomAmenity(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); } }}
                                placeholder="Add custom amenity…"
                            />
                            <button type="button" className={styles.customAmenityAdd} onClick={addCustomAmenity}>
                                <Plus size={16} />
                            </button>
                        </div>

                        {/* Selected custom amenities (not in predefined list) */}
                        {Array.from(selectedAmenities).filter((a) => !AMENITY_CHIPS.some((c) => c.key === a)).length > 0 && (
                            <div className={styles.customAmenityTags}>
                                {Array.from(selectedAmenities)
                                    .filter((a) => !AMENITY_CHIPS.some((c) => c.key === a))
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
                                    disabled={step.id === 7 && !isEditMode && step.id > currentStep}
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
