import type { ListingMediaItem, ListingVideoProvider } from '../types';

const LISTING_IMAGES_BUCKET = 'listing-images';
const FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop';

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const normalizeUrl = (value: string) => value.trim();

const buildSupabasePublicUrl = (baseUrl: string, path: string) =>
    `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/${path.replace(/^\/+/, '')}`;

export const normalizeUploadedMediaUrl = (url: string, supabaseUrl?: string): string | null => {
    const value = normalizeUrl(url);
    if (!value) {
        return null;
    }

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    if (supabaseUrl) {
        return buildSupabasePublicUrl(supabaseUrl, value.replace(new RegExp(`^${LISTING_IMAGES_BUCKET}/?`), ''));
    }

    return null;
};

export const getVideoProvider = (url: string): ListingVideoProvider => {
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

        if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) {
            return 'youtube';
        }

        if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
            return 'instagram';
        }

        if (host === 'drive.google.com') {
            return 'google-drive';
        }
    } catch {
        return 'unknown';
    }

    return 'unknown';
};

const extractYouTubeId = (url: URL) => {
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
        return url.pathname.split('/').filter(Boolean)[0] ?? null;
    }

    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
        if (url.pathname === '/watch') {
            return url.searchParams.get('v');
        }

        const parts = url.pathname.split('/').filter(Boolean);
        if (parts[0] === 'embed' || parts[0] === 'shorts') {
            return parts[1] ?? null;
        }
    }

    return null;
};

const buildDriveEmbedUrl = (url: URL) => {
    const match = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
    }

    const id = url.searchParams.get('id');
    if (id) {
        return `https://drive.google.com/file/d/${id}/preview`;
    }

    return undefined;
};

export const getEmbeddableVideoUrl = (url: string): string | undefined => {
    try {
        const parsed = new URL(url);
        const provider = getVideoProvider(url);

        if (provider === 'youtube') {
            const id = extractYouTubeId(parsed);
            if (id) {
                return `https://www.youtube.com/embed/${id}`;
            }
        }

        if (provider === 'google-drive') {
            return buildDriveEmbedUrl(parsed);
        }
    } catch {
        return undefined;
    }

    return undefined;
};

const buildYouTubeThumbnail = (embedUrl?: string) => {
    if (!embedUrl) {
        return undefined;
    }

    const id = embedUrl.split('/').filter(Boolean).pop();
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
};

export const createExternalVideoMedia = (url: string, sortOrder: number): ListingMediaItem | null => {
    const normalized = normalizeUrl(url);
    if (!normalized) {
        return null;
    }

    let parsed: URL;
    try {
        parsed = new URL(normalized);
    } catch {
        return null;
    }

    if (!/^https?:$/i.test(parsed.protocol)) {
        return null;
    }

    const provider = getVideoProvider(normalized);
    const embedUrl = getEmbeddableVideoUrl(normalized);

    return {
        url: normalized,
        kind: 'video',
        sourceType: 'external',
        sortOrder,
        provider,
        embedUrl,
        thumbnailUrl: provider === 'youtube' ? buildYouTubeThumbnail(embedUrl) : undefined,
    };
};

export const coerceMediaItem = (
    value: unknown,
    sortOrder: number,
    options: { supabaseUrl?: string } = {}
): ListingMediaItem | null => {
    if (isNonEmptyString(value)) {
        const normalizedUrl = normalizeUploadedMediaUrl(value, options.supabaseUrl);
        if (!normalizedUrl) {
            return null;
        }

        return {
            url: normalizedUrl,
            kind: 'image',
            sourceType: 'upload',
            sortOrder,
        };
    }

    if (!value || typeof value !== 'object') {
        return null;
    }

    const record = value as Record<string, unknown>;
    const sourceUrl = isNonEmptyString(record.url) ? record.url : isNonEmptyString(record.image_url) ? record.image_url : '';
    const kind = record.kind === 'video' || record.media_kind === 'video' ? 'video' : 'image';
    const sourceType = record.sourceType === 'external' || record.source_type === 'external' ? 'external' : 'upload';
    const resolvedSortOrder = Number(record.sortOrder ?? record.sort_order ?? sortOrder);
    const url =
        kind === 'image' && sourceType === 'upload'
            ? normalizeUploadedMediaUrl(sourceUrl, options.supabaseUrl)
            : normalizeUrl(sourceUrl);

    if (!url) {
        return null;
    }

    const mediaItem: ListingMediaItem = {
        url,
        kind,
        sourceType,
        sortOrder: Number.isFinite(resolvedSortOrder) ? resolvedSortOrder : sortOrder,
    };

    const embedUrl = isNonEmptyString(record.embedUrl)
        ? normalizeUrl(record.embedUrl)
        : isNonEmptyString(record.embed_url)
            ? normalizeUrl(record.embed_url)
            : kind === 'video'
                ? getEmbeddableVideoUrl(url)
                : undefined;
    if (embedUrl) {
        mediaItem.embedUrl = embedUrl;
    }

    const provider = isNonEmptyString(record.provider) ? record.provider as ListingVideoProvider : kind === 'video' ? getVideoProvider(url) : undefined;
    if (provider) {
        mediaItem.provider = provider;
    }

    const thumbnailUrl = isNonEmptyString(record.thumbnailUrl)
        ? normalizeUrl(record.thumbnailUrl)
        : isNonEmptyString(record.thumbnail_url)
            ? normalizeUrl(record.thumbnail_url)
            : provider === 'youtube'
                ? buildYouTubeThumbnail(embedUrl)
                : undefined;
    if (thumbnailUrl) {
        mediaItem.thumbnailUrl = thumbnailUrl;
    }

    if (isNonEmptyString(record.title)) {
        mediaItem.title = record.title.trim();
    }

    return mediaItem;
};

export const coerceMediaList = (value: unknown, options: { supabaseUrl?: string } = {}) =>
    (Array.isArray(value) ? value : [])
        .map((item, index) => coerceMediaItem(item, index, options))
        .filter((item): item is ListingMediaItem => item !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder);

export const getImageUrlsFromMedia = (media: ListingMediaItem[]) =>
    media.filter((item) => item.kind === 'image').map((item) => item.url);

export const getFallbackImage = () => FALLBACK_IMAGE;
