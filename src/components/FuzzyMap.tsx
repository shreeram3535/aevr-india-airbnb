import { useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import styles from './FuzzyMap.module.css';
import { fuzzCoordinates } from '../services/mapUtils';

interface FuzzyMapProps {
    lat: number;
    lng: number;
    listingId: string;
    city: string;
}

export const FuzzyMap = ({ lat, lng, listingId, city }: FuzzyMapProps) => {
    const [loaded, setLoaded] = useState(false);

    // Fuzzed coords — deterministic ±150–400 m offset per listing
    const { lat: fLat, lng: fLng } = fuzzCoordinates(lat, lng, listingId);

    // Google Maps embed — no API key needed for basic iframe
    const embedUrl =
        `https://maps.google.com/maps?q=${fLat},${fLng}&z=15&output=embed&hl=en`;

    // External link (opens Google Maps in new tab)
    const externalUrl =
        `https://www.google.com/maps/search/?api=1&query=${fLat},${fLng}`;

    return (
        <div className={styles.wrapper}>
            {/* Shimmer skeleton shown until iframe paints */}
            {!loaded && (
                <div className={styles.skeleton}>
                    <div className={styles.skeletonShimmer} />
                    <div className={styles.skeletonLabel}>
                        <MapPin size={15} />
                        Loading map…
                    </div>
                </div>
            )}

            {/* Google Maps iframe */}
            <iframe
                src={embedUrl}
                className={styles.iframe}
                title={`Map — approximate area near ${city}`}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setLoaded(true)}
                style={{ opacity: loaded ? 1 : 0 }}
            />

            {/* Bottom bar */}
            <div className={styles.bottomBar}>
                <MapPin size={13} className={styles.pinIcon} />
                <span>Showing approximate area · Exact address shared after booking</span>

            </div>
        </div>
    );
};
