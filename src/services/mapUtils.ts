/**
 * mapUtils.ts
 * Utilities for extracting coordinates from Google Maps URLs
 * and applying Airbnb-style privacy fuzzing.
 */

/**
 * Attempts to extract lat/lng from a full Google Maps URL.
 *
 * Supported formats:
 *   https://www.google.com/maps/place/Name/@28.6139,77.2090,17z/...
 *   https://maps.google.com/maps?q=28.6139,77.2090
 *   https://www.google.com/maps?ll=28.6139,77.2090
 *   https://www.google.com/maps/search/?api=1&query=28.6139,77.2090
 *
 * Does NOT work for short links (maps.app.goo.gl/xxx) — returns null.
 */
export const extractCoordsFromGoogleMapsUrl = (
    url: string
): { lat: number; lng: number } | null => {
    if (!url || typeof url !== 'string') return null;

    const trimmed = url.trim();

    // Pattern 1: /@lat,lng,zoom  (most common desktop URL)
    const atMatch = trimmed.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
        const lat = parseFloat(atMatch[1]);
        const lng = parseFloat(atMatch[2]);
        if (isValidCoord(lat, lng)) return { lat, lng };
    }

    // Pattern 2: ?q=lat,lng  or  &q=lat,lng
    const qMatch = trimmed.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
        const lat = parseFloat(qMatch[1]);
        const lng = parseFloat(qMatch[2]);
        if (isValidCoord(lat, lng)) return { lat, lng };
    }

    // Pattern 3: ?ll=lat,lng
    const llMatch = trimmed.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (llMatch) {
        const lat = parseFloat(llMatch[1]);
        const lng = parseFloat(llMatch[2]);
        if (isValidCoord(lat, lng)) return { lat, lng };
    }

    // Pattern 4: query=lat,lng  (Google Maps embed / search URL)
    const queryMatch = trimmed.match(/[?&]query=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (queryMatch) {
        const lat = parseFloat(queryMatch[1]);
        const lng = parseFloat(queryMatch[2]);
        if (isValidCoord(lat, lng)) return { lat, lng };
    }

    return null;
};

const isValidCoord = (lat: number, lng: number): boolean =>
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    // Exclude (0,0) — the default "unset" value stored in the DB
    !(lat === 0 && lng === 0);

/**
 * Checks whether a stored lat/lng pair is valid (i.e. not the 0,0 default).
 */
export const hasValidCoords = (lat: number | undefined, lng: number | undefined): boolean => {
    if (lat == null || lng == null) return false;
    return isValidCoord(lat, lng);
};

/**
 * Deterministically fuzzes coordinates for a given listing ID.
 *
 * The same listingId always produces the same offset so the pin
 * doesn't jump around on each page load — but it's different for
 * every listing, making it hard to reverse-engineer.
 *
 * Offset range: ±150m to ±400m in both directions.
 */
export const fuzzCoordinates = (
    lat: number,
    lng: number,
    listingId: string
): { lat: number; lng: number } => {
    // Derive a deterministic seed from the listing ID characters
    const seed = listingId
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Simple LCG PRNG seeded by listing ID
    const rand1 = ((seed * 9301 + 49297) % 233280) / 233280;
    const rand2 = (((seed + 1) * 9301 + 49297) % 233280) / 233280;

    // Convert to signed offsets in the range [-1, 1]
    const signedRand1 = rand1 * 2 - 1;
    const signedRand2 = rand2 * 2 - 1;

    // 1 degree latitude ≈ 111km, so 0.003° ≈ 333m
    // We target ±150m to ±400m, so range is 0.00135° to 0.0036°
    const minOffset = 0.00135; // ~150m
    const maxOffset = 0.0036;  // ~400m

    const latOffset = signedRand1 * (maxOffset - minOffset) + Math.sign(signedRand1) * minOffset;
    const lngOffset = signedRand2 * (maxOffset - minOffset) + Math.sign(signedRand2) * minOffset;

    return {
        lat: lat + latOffset,
        lng: lng + lngOffset,
    };
};

/**
 * Returns true if the URL looks like a Google Maps short link
 * (maps.app.goo.gl or goo.gl/maps) which cannot have coords extracted client-side.
 */
export const isShortMapsLink = (url: string): boolean => {
    if (!url) return false;
    return /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(url);
};
