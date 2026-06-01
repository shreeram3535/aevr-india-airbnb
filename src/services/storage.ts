import { supabase } from './supabase';
import type { ListingMediaItem } from '../types';

const LISTING_IMAGES_BUCKET = 'listing-images';

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export const uploadListingImages = async (hostId: string, files: File[]): Promise<ListingMediaItem[]> => {
    if (!supabase || files.length === 0) {
        return [];
    }

    const uploadedMedia: ListingMediaItem[] = [];

    for (const [index, file] of files.entries()) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${hostId}/${sanitizeFileName(fileName)}`;

        const { error: uploadError } = await supabase.storage
            .from(LISTING_IMAGES_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || undefined,
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabase.storage.from(LISTING_IMAGES_BUCKET).getPublicUrl(filePath);
        uploadedMedia.push({
            url: data.publicUrl,
            kind: 'image',
            sourceType: 'upload',
            sortOrder: index,
            title: file.name,
        });
    }

    return uploadedMedia;
};
