import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Plus, Trash2, PlayCircle } from 'lucide-react';
import styles from './HostNewProperty.module.css';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { hasSupabaseConfig } from '../services/supabase';
import { uploadListingImages } from '../services/storage';
import { HostApprovalStatusView } from '../components/HostApprovalStatus';
import { SkeletonScreen } from '../components/SkeletonScreen';
import type { AvailabilityBlock, AvailabilityBlockStatus, Category, Listing, ListingMediaItem, RoomType, Experience, ExperienceCategory } from '../types';
import { createExternalVideoMedia } from '../services/media';

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

type ExperienceFormState = {
    id: string;
    title: string;
    category: ExperienceCategory;
    description: string;
    iconOrImage: string;
    distance: string;
    travelTime: string;
};

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

const createExperienceRow = (overrides: Partial<ExperienceFormState> = {}): ExperienceFormState => ({
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? '',
    category: overrides.category ?? 'Attraction',
    description: overrides.description ?? '',
    iconOrImage: overrides.iconOrImage ?? '',
    distance: overrides.distance ?? '',
    travelTime: overrides.travelTime ?? '',
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

    return roomTypes.map((roomType) =>
        createRoomTypeRow({
            id: roomType.id,
            name: roomType.name,
            pricePerNight: String(roomType.pricePerNight),
            totalCount: String(roomType.totalCount),
            maxGuests: roomType.maxGuests != null ? String(roomType.maxGuests) : '',
            beds: roomType.beds != null ? String(roomType.beds) : '',
            description: roomType.description ?? '',
            existingMedia: roomType.media ?? [],
            photoFiles: [],
            videoLinks: (roomType.media ?? []).filter((item) => item.kind === 'video').map((item) => item.url).join('\n'),
        })
    );
};

const experiencesToForm = (experiences?: Experience[]): ExperienceFormState[] => {
    if (!experiences || experiences.length === 0) {
        return [];
    }
    return experiences.map(exp => createExperienceRow({
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
        .map((item) => item.trim())
        .filter(Boolean)
        .map((url, index) => createExternalVideoMedia(url, startingSortOrder + index))
        .filter((item): item is ListingMediaItem => item !== null);

const preserveUploadedImages = (media: ListingMediaItem[]) => media.filter((item) => item.kind === 'image');

const formatBlockRange = (startDate: string, endDate: string) =>
    `${new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(`${startDate}T00:00:00Z`))} - ${new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric' }).format(new Date(`${endDate}T00:00:00Z`))}`;

const blockStatusLabel: Record<AvailabilityBlockStatus, string> = {
    booked: 'Booked',
    restricted: 'Restricted',
};

export const HostNewProperty = () => {
    const navigate = useNavigate();
    const { id: listingId } = useParams<{ id?: string }>();
    const isEditMode = Boolean(listingId);

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
    const [videoLinks, setVideoLinks] = useState('');
    const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [blockError, setBlockError] = useState<string | null>(null);
    const [blockStart, setBlockStart] = useState('');
    const [blockEnd, setBlockEnd] = useState('');
    const [blockStatus, setBlockStatus] = useState<AvailabilityBlockStatus>('booked');
    const [hostApprovalStatus, setHostApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
    const [currentRole, setCurrentRole] = useState<'guest' | 'host' | 'admin' | null>(null);
    const backPath = currentRole === 'admin' ? '/host/properties' : '/host';

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
                    setVideoLinks(listing.media.filter((item) => item.kind === 'video').map((item) => item.url).join('\n'));
                    setAvailabilityBlocks(await api.fetchAvailabilityBlocks(listingId));
                }
            } else {
                setForm((current) => ({
                    ...current,
                categorySlug: data.find((item) => item.slug && item.slug !== 'icons')?.slug ?? current.categorySlug,
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

    useEffect(() => {
        const urls = selectedFiles.map((file) => URL.createObjectURL(file));
        setPreviewUrls(urls);

        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [selectedFiles]);

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
        setSelectedFiles(files);
    };

    const updateRoomType = (roomTypeId: string, field: keyof RoomTypeFormState) => (
        event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        setRoomTypes((current) =>
            current.map((roomType) =>
                roomType.id === roomTypeId ? { ...roomType, [field]: event.target.value } : roomType
            )
        );
    };

    const handleRoomTypePhotosChange = (roomTypeId: string) => (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        setError(null);

        if (files.length === 0) {
            return;
        }

        setRoomTypes((current) =>
            current.map((roomType) =>
                roomType.id === roomTypeId ? { ...roomType, photoFiles: files } : roomType
            )
        );
    };

    const updateRoomTypeVideoLinks = (roomTypeId: string) => (event: ChangeEvent<HTMLTextAreaElement>) => {
        setRoomTypes((current) =>
            current.map((roomType) =>
                roomType.id === roomTypeId ? { ...roomType, videoLinks: event.target.value } : roomType
            )
        );
    };

    const addRoomType = () => {
        setRoomTypes((current) => [...current, createRoomTypeRow()]);
    };

    const removeRoomType = (roomTypeId: string) => {
        setRoomTypes((current) => {
            const remaining = current.filter((roomType) => roomType.id !== roomTypeId);
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
        setLocalExperiences((current) => current.filter((experience) => experience.id !== experienceId));
    };

    const refreshAvailabilityBlocks = async () => {
        if (!listingId) {
            return;
        }
        const blocks = await api.fetchAvailabilityBlocks(listingId);
        setAvailabilityBlocks(blocks);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const session = await authService.getSession();
            if (!session) {
                navigate('/host/auth', { replace: true });
                return;
            }

            const propertyVideoMedia = parseVideoLinks(videoLinks);
            const existingPropertyImages = preserveUploadedImages(existingMedia);

            if (!isEditMode && selectedFiles.length === 0 && propertyVideoMedia.length === 0) {
                throw new Error('Add at least one property image or video link.');
            }

            if (isEditMode && selectedFiles.length === 0 && existingPropertyImages.length === 0 && propertyVideoMedia.length === 0) {
                throw new Error('Add at least one property image or video link.');
            }

            const normalizedRoomTypes = (await Promise.all(roomTypes.map(async (roomType, index): Promise<RoomType | null> => {
                    const pricePerNight = Number(roomType.pricePerNight || form.pricePerNight);
                    const totalCount = Number(roomType.totalCount || 1);
                    const maxGuests = roomType.maxGuests ? Number(roomType.maxGuests) : undefined;
                    const beds = roomType.beds ? Number(roomType.beds) : undefined;

                    if (!roomType.name.trim() || !Number.isFinite(pricePerNight) || pricePerNight <= 0 || !Number.isFinite(totalCount) || totalCount <= 0) {
                        return null;
                    }

                    const uploadedRoomPhotos = roomType.photoFiles.length > 0
                        ? await uploadListingImages(session.user.id, roomType.photoFiles)
                        : preserveUploadedImages(roomType.existingMedia);
                    const roomVideoMedia = parseVideoLinks(roomType.videoLinks, uploadedRoomPhotos.length);

                    const normalizedRoomType: RoomType = {
                        id: roomType.id || `${index}-${roomType.name.toLowerCase().replace(/\s+/g, '-')}`,
                        name: roomType.name.trim(),
                        pricePerNight,
                        totalCount,
                    };

                    if (Number.isFinite(maxGuests ?? NaN)) {
                        normalizedRoomType.maxGuests = maxGuests;
                    }

                    if (Number.isFinite(beds ?? NaN)) {
                        normalizedRoomType.beds = beds;
                    }

                    if (roomType.description.trim()) {
                        normalizedRoomType.description = roomType.description.trim();
                    }

                    const roomMedia = [...uploadedRoomPhotos, ...roomVideoMedia]
                        .map((item, itemIndex) => ({ ...item, sortOrder: itemIndex }));
                    if (roomMedia.length > 0) {
                        normalizedRoomType.media = roomMedia;
                        normalizedRoomType.photos = roomMedia.filter((item) => item.kind === 'image').map((item) => item.url);
                    }
                    return normalizedRoomType;
                })))
                .filter((item): item is RoomType => Boolean(item));

            if (normalizedRoomTypes.length === 0) {
                throw new Error('Add at least one room type with a price and count.');
            }

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

            const startingPrice = Math.min(...normalizedRoomTypes.map((roomType) => roomType.pricePerNight));
            const hostName = form.hostName.trim();

            if (!hostName) {
                throw new Error('Add the host name for this property.');
            }

            const uploadedPropertyMedia = selectedFiles.length > 0
                ? await uploadListingImages(session.user.id, selectedFiles)
                : undefined;

            if (selectedFiles.length > 0 && (!uploadedPropertyMedia || uploadedPropertyMedia.length === 0)) {
                throw new Error('Could not upload images. Make sure the `listing-images` storage bucket exists.');
            }

            const propertyMedia = [
                ...(uploadedPropertyMedia ?? existingPropertyImages),
                ...propertyVideoMedia,
            ].map((item, itemIndex) => ({ ...item, sortOrder: itemIndex }));

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
                lat: 0,
                lng: 0,
                guestCountMax: Number(form.guestCountMax),
                bedrooms: Number(form.bedrooms),
                beds: Number(form.beds),
                baths: Number(form.baths),
                availabilitySummary: form.availabilitySummary,
                amenityLabels: form.amenityLabels.split(',').map((item) => item.trim()).filter(Boolean),
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
                await api.createListing(session.user.id, {
                    ...payload,
                    media: propertyMedia,
                });
            }

            navigate(backPath, { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save property');
        } finally {
            setSaving(false);
        }
    };

    const handleAddAvailabilityBlock = async () => {
        if (!listingId) {
            return;
        }

        if (!blockStart || !blockEnd) {
            setBlockError('Choose both dates first.');
            return;
        }

        if (blockEnd <= blockStart) {
            setBlockError('Checkout must be after check-in.');
            return;
        }

        setBlockSaving(true);
        setBlockError(null);

        try {
            const session = await authService.getSession();
            if (!session) {
                navigate('/host/auth', { replace: true });
                return;
            }

            await api.createAvailabilityBlock({
                listingId,
                startDate: blockStart,
                endDate: blockEnd,
                status: blockStatus,
            });

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
            if (!session) {
                navigate('/host/auth', { replace: true });
                return;
            }

            await api.deleteAvailabilityBlock(blockId);
            await refreshAvailabilityBlocks();
        } catch (err) {
            setBlockError(err instanceof Error ? err.message : 'Unable to delete block');
        } finally {
            setBlockSaving(false);
        }
    };

    const currentPropertyMedia = useMemo(() => {
        const uploadedImages = previewUrls.map((url, index) => ({
            url,
            kind: 'image' as const,
            sourceType: 'upload' as const,
            sortOrder: index,
        }));

        const imageMedia = selectedFiles.length > 0 ? uploadedImages : preserveUploadedImages(existingMedia);
        const externalVideos = parseVideoLinks(videoLinks, imageMedia.length);

        return [...imageMedia, ...externalVideos];
    }, [existingMedia, previewUrls, selectedFiles.length, videoLinks]);

    if (loading) {
        return <div className={styles.page}><SkeletonScreen variant="property-form" /></div>;
    }

    if (hostApprovalStatus && hostApprovalStatus !== 'approved') {
        return <HostApprovalStatusView status={hostApprovalStatus} />;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <div className={styles.kicker}>{isEditMode ? 'Edit property' : 'Add property'}</div>
                    <h1>{isEditMode ? 'Update your listing' : 'Publish a new stay'}</h1>
                    <p>Fill out the basics now. You can always expand the listing later from the host dashboard.</p>
                </div>
                <Link to={backPath} className={styles.secondaryButton}>Back to dashboard</Link>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.field}>
                    <span>Title</span>
                    <input value={form.title} onChange={updateField('title')} placeholder="Luxury villa with sea view" required />
                </label>

                <label className={styles.field}>
                    <span>Description</span>
                    <textarea value={form.description} onChange={updateField('description')} placeholder="A short description of the place" rows={5} required />
                </label>

                <label className={styles.field}>
                    <span>Host name</span>
                    <input value={form.hostName} onChange={updateField('hostName')} placeholder="Name shown as the property host" required />
                </label>

                <div className={styles.grid}>
                    <label className={styles.field}>
                        <span>Starting price per night</span>
                        <input type="number" min="0" value={form.pricePerNight} onChange={updateField('pricePerNight')} required />
                        <small className={styles.helperText}>
                            This is the base price shown on search cards. Room types below can have their own prices.
                        </small>
                    </label>
                    <label className={styles.field}>
                        <span>Currency</span>
                        <input value={form.currency} onChange={updateField('currency')} required />
                    </label>
                </div>

                <section className={styles.roomTypeSection}>
                    <div className={styles.roomTypeHeader}>
                        <div>
                            <h2>Room types</h2>
                            <p>Add one or more room categories with their own nightly rates and inventory count.</p>
                        </div>
                        <button type="button" className={styles.secondaryButton} onClick={addRoomType}>
                            <Plus size={16} /> Add room type
                        </button>
                    </div>

                    <div className={styles.roomTypeList}>
                        {roomTypes.map((roomType, index) => (
                            <article key={roomType.id} className={styles.roomTypeCard}>
                                {(() => {
                                    const roomExistingImages = roomType.photoFiles.length > 0
                                        ? []
                                        : preserveUploadedImages(roomType.existingMedia).map((item, mediaIndex) => ({
                                            url: item.url,
                                            fileName: `Photo ${mediaIndex + 1}`,
                                            key: `${roomType.id}-image-${item.url}-${mediaIndex}`,
                                        }));
                                    const roomPreviewVideos = parseVideoLinks(
                                        roomType.videoLinks,
                                        roomExistingImages.length
                                    );

                                    return (
                                        <>
                                <div className={styles.roomTypeGrid}>
                                    <label className={styles.field}>
                                        <span>Room type name</span>
                                        <input value={roomType.name} onChange={updateRoomType(roomType.id, 'name')} placeholder="Deluxe king room" required />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Nightly price</span>
                                        <input type="number" min="0" value={roomType.pricePerNight} onChange={updateRoomType(roomType.id, 'pricePerNight')} required />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Count</span>
                                        <input type="number" min="1" value={roomType.totalCount} onChange={updateRoomType(roomType.id, 'totalCount')} required />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Max guests</span>
                                        <input type="number" min="1" value={roomType.maxGuests} onChange={updateRoomType(roomType.id, 'maxGuests')} />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Beds</span>
                                        <input type="number" min="0" value={roomType.beds} onChange={updateRoomType(roomType.id, 'beds')} />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Description</span>
                                        <textarea value={roomType.description} onChange={updateRoomType(roomType.id, 'description')} rows={3} placeholder="What makes this room special?" />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Room photos</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleRoomTypePhotosChange(roomType.id)}
                                        />
                                        <small className={styles.helperText}>
                                            Upload photos for this room type. They will be shown when guests choose the room.
                                        </small>
                                    </label>
                                    <label className={styles.field}>
                                        <span>Room video links</span>
                                        <textarea
                                            value={roomType.videoLinks}
                                            onChange={updateRoomTypeVideoLinks(roomType.id)}
                                            rows={3}
                                            placeholder="Paste YouTube, Instagram, or Google Drive links. One link per line."
                                        />
                                        <small className={styles.helperText}>
                                            We will embed supported links when possible and show an open-link card for the rest.
                                        </small>
                                    </label>
                                </div>
                                {(roomExistingImages.length > 0 || roomType.photoFiles.length > 0 || roomPreviewVideos.length > 0) && (
                                    <div className={styles.roomTypePhotoPreview}>
                                        {roomExistingImages.map((item, photoIndex) => (
                                            <figure key={item.key} className={styles.roomTypePhotoCard}>
                                                <img src={item.url} alt={roomType.name} className={styles.roomTypePhotoImage} />
                                                <figcaption>{item.fileName ?? `Photo ${photoIndex + 1}`}</figcaption>
                                            </figure>
                                        ))}
                                        {roomType.photoFiles.length > 0 && (
                                            <div className={styles.roomTypePhotoFiles}>
                                                {roomType.photoFiles.map((file, fileIndex) => (
                                                    <span key={`${roomType.id}-${file.name}-${fileIndex}`} className={styles.roomTypePhotoFile}>
                                                        {file.name}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {roomPreviewVideos.map((item, videoIndex) => (
                                            <figure key={`${roomType.id}-${item.url}-${videoIndex}`} className={styles.roomTypeVideoCard}>
                                                <div className={styles.videoPreviewPlaceholder}>
                                                    <PlayCircle size={28} />
                                                </div>
                                                <figcaption>{item.provider === 'unknown' ? 'Video link' : `${item.provider} video`}</figcaption>
                                            </figure>
                                        ))}
                                    </div>
                                )}
                                <div className={styles.roomTypeFooter}>
                                    <span className={styles.roomTypeIndex}>Room type {index + 1}</span>
                                    <button type="button" className={styles.roomTypeRemove} onClick={() => removeRoomType(roomType.id)}>
                                        <Trash2 size={16} /> Remove
                                    </button>
                                </div>
                                        </>
                                    );
                                })()}
                            </article>
                        ))}
                    </div>
                </section>

                <section className={styles.roomTypesSection}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2>Local Experiences & Nearby Attractions</h2>
                            <p>Help guests discover the best attractions, activities, food spots, cultural experiences, and hidden gems near your property.</p>
                        </div>
                        <button type="button" className={styles.secondaryButton} onClick={addExperience}>
                            <Plus size={16} /> Add experience
                        </button>
                    </div>

                    <div className={styles.roomTypesList}>
                        {localExperiences.map((experience, index) => (
                            <article key={experience.id} className={styles.roomTypeCard}>
                                <div className={styles.grid}>
                                    <label className={styles.field}>
                                        <span>Title</span>
                                        <input
                                            value={experience.title}
                                            onChange={updateExperience(experience.id, 'title')}
                                            placeholder="e.g. Sunset Boat Tour"
                                            required={localExperiences.length > 0 && !!experience.title}
                                        />
                                    </label>
                                    <label className={styles.field}>
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
                                </div>
                                <label className={styles.field}>
                                    <span>Description</span>
                                    <textarea
                                        value={experience.description}
                                        onChange={updateExperience(experience.id, 'description')}
                                        placeholder="Short description of the experience..."
                                        rows={2}
                                        required={localExperiences.length > 0 && !!experience.title}
                                    />
                                </label>
                                <div className={styles.grid}>
                                    <label className={styles.field}>
                                        <span>Icon or Image URL (Optional)</span>
                                        <input
                                            value={experience.iconOrImage}
                                            onChange={updateExperience(experience.id, 'iconOrImage')}
                                            placeholder="e.g. 🚤 or https://..."
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Distance (Optional)</span>
                                        <input
                                            value={experience.distance}
                                            onChange={updateExperience(experience.id, 'distance')}
                                            placeholder="e.g. 2 km"
                                        />
                                    </label>
                                    <label className={styles.field}>
                                        <span>Travel Time (Optional)</span>
                                        <input
                                            value={experience.travelTime}
                                            onChange={updateExperience(experience.id, 'travelTime')}
                                            placeholder="e.g. 10 mins walk"
                                        />
                                    </label>
                                </div>
                                <div className={styles.roomTypeFooter}>
                                    <span className={styles.roomTypeIndex}>Experience {index + 1}</span>
                                    <button type="button" className={styles.roomTypeRemove} onClick={() => removeExperience(experience.id)}>
                                        <Trash2 size={16} /> Remove
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <div className={styles.grid}>
                    <label className={styles.field}>
                        <span>Category</span>
                        <select value={form.categorySlug} onChange={updateField('categorySlug')}>
                            {categories.filter((category) => category.slug && category.slug !== 'icons').map((category) => (
                                <option key={category.slug} value={category.slug}>
                                    {category.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.field}>
                        <span>Availability summary</span>
                        <input value={form.availabilitySummary} onChange={updateField('availabilitySummary')} />
                    </label>
                </div>

                <div className={styles.grid}>
                    <label className={styles.field}>
                        <span>City</span>
                        <input value={form.city} onChange={updateField('city')} required />
                    </label>
                    <label className={styles.field}>
                        <span>Country</span>
                        <input value={form.country} onChange={updateField('country')} required />
                    </label>
                </div>

                <label className={styles.field}>
                    <span>Google Maps link</span>
                    <input
                        value={form.mapLink}
                        onChange={updateField('mapLink')}
                        placeholder="Paste any Google Maps link"
                        required
                    />
                    <small className={styles.helperText}>
                        Short links like `https://maps.app.goo.gl/...` are fine.
                    </small>
                </label>

                <div className={styles.grid}>
                    <label className={styles.field}>
                        <span>Max guests</span>
                        <input type="number" min="1" value={form.guestCountMax} onChange={updateField('guestCountMax')} required />
                    </label>
                    <label className={styles.field}>
                        <span>Bedrooms</span>
                        <input type="number" min="0" value={form.bedrooms} onChange={updateField('bedrooms')} required />
                    </label>
                    <label className={styles.field}>
                        <span>Beds</span>
                        <input type="number" min="0" value={form.beds} onChange={updateField('beds')} required />
                    </label>
                    <label className={styles.field}>
                        <span>Baths</span>
                        <input type="number" min="0" step="0.5" value={form.baths} onChange={updateField('baths')} required />
                    </label>
                </div>

                <label className={styles.field}>
                    <span>Property images</span>
                    <input type="file" accept="image/*" multiple onChange={handleFileChange} />
                    <small className={styles.helperText}>
                        {isEditMode
                            ? 'Uploading new images will replace the current uploaded photos. Video links stay editable below.'
                            : 'Upload images directly. We will store them in Supabase Storage.'}
                    </small>
                </label>

                <label className={styles.field}>
                    <span>Property video links</span>
                    <textarea
                        value={videoLinks}
                        onChange={(event) => setVideoLinks(event.target.value)}
                        placeholder="Paste YouTube, Instagram, or Google Drive links. One link per line."
                        rows={4}
                    />
                    <small className={styles.helperText}>
                        Supported links are embedded when possible. Otherwise, guests will see an open-link card.
                    </small>
                </label>

                {currentPropertyMedia.length > 0 && (
                    <div className={styles.previewGrid}>
                        {currentPropertyMedia.map((item, index) => (
                            <figure key={`${item.url}-${index}`} className={styles.previewCard}>
                                {item.kind === 'image' ? (
                                    <img src={item.url} alt={form.title || `Property image ${index + 1}`} className={styles.previewImage} />
                                ) : (
                                    <div className={styles.videoPreviewPlaceholder}>
                                        <PlayCircle size={32} />
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
                    <span>Amenities</span>
                    <textarea value={form.amenityLabels} onChange={updateField('amenityLabels')} placeholder="Comma-separated amenities like Wifi,Kitchen,Pool" rows={3} />
                </label>

                {isEditMode && (
                    <section className={styles.availabilitySection} id="availability">
                        <div className={styles.sectionHeader}>
                            <div>
                                <h2>
                                    <CalendarDays size={18} /> Calendar status
                                </h2>
                                <p>Available by default. Add a block when the property is booked or restricted.</p>
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
                                <Plus size={16} /> {blockSaving ? 'Saving...' : 'Block dates'}
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

                <div className={styles.actions}>
                    <button type="submit" className={styles.primaryButton} disabled={saving}>
                        {saving ? 'Saving...' : isEditMode ? 'Save changes' : 'Create property'}
                    </button>
                    <Link to={backPath} className={styles.secondaryButton}>Cancel</Link>
                </div>
            </form>
        </div>
    );
};
