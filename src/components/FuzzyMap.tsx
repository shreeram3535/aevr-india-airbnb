import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import styles from './FuzzyMap.module.css';
import { fuzzCoordinates } from '../services/mapUtils';

interface FuzzyMapProps {
    lat: number;
    lng: number;
    listingId: string;
    city: string;
}

// Leaflet types (loaded from CDN)
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        L: any;
    }
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

let leafletLoading: Promise<void> | null = null;

const loadLeaflet = (): Promise<void> => {
    if (window.L) return Promise.resolve();
    if (leafletLoading) return leafletLoading;

    leafletLoading = new Promise((resolve, reject) => {
        // Inject CSS
        if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS;
            document.head.appendChild(link);
        }

        // Inject JS
        if (!document.querySelector(`script[src="${LEAFLET_JS}"]`)) {
            const script = document.createElement('script');
            script.src = LEAFLET_JS;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Leaflet'));
            document.head.appendChild(script);
        } else {
            resolve();
        }
    });

    return leafletLoading;
};

export const FuzzyMap = ({ lat, lng, listingId, city }: FuzzyMapProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);
    const [leafletReady, setLeafletReady] = useState(false);
    const [loadError, setLoadError] = useState(false);

    // Load Leaflet from CDN once
    useEffect(() => {
        loadLeaflet()
            .then(() => setLeafletReady(true))
            .catch(() => setLoadError(true));
    }, []);

    // Mount the map once Leaflet is ready
    useEffect(() => {
        if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

        const L = window.L;
        const { lat: fLat, lng: fLng } = fuzzCoordinates(lat, lng, listingId);

        // Init map — disable most controls for a clean embedded look
        const map = L.map(mapContainerRef.current, {
            center: [fLat, fLng],
            zoom: 14,
            zoomControl: false,
            scrollWheelZoom: false,
            doubleClickZoom: true,
            dragging: true,
            attributionControl: false,
        });

        mapInstanceRef.current = map;

        // OpenStreetMap tiles (free, no API key)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        // Privacy circle — semi-transparent, Airbnb-style
        L.circle([fLat, fLng], {
            radius: 350,
            color: '#FF385C',
            fillColor: '#FF385C',
            fillOpacity: 0.12,
            weight: 2,
            opacity: 0.5,
        }).addTo(map);

        // Premium drop-shaped pin marker
        const markerHtml = `
            <div class="fuzzy-map-pin">
                <div class="fuzzy-map-pin-pulse"></div>
                <div class="fuzzy-map-pin-body">
                    <svg viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg" class="fuzzy-map-pin-icon">
                        <path d="M10 2L3 8v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V8L10 2z"/>
                    </svg>
                </div>
                <div class="fuzzy-map-pin-tip"></div>
            </div>
        `;
        const icon = L.divIcon({
            html: markerHtml,
            className: '',
            iconSize: [44, 52],
            iconAnchor: [22, 50],
        });
        L.marker([fLat, fLng], { icon }).addTo(map);

        // Minimal zoom control (top-right)
        L.control.zoom({ position: 'topright' }).addTo(map);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leafletReady]);

    if (loadError) {
        return (
            <div className={styles.errorState}>
                <MapPin size={24} />
                <p>Map could not be loaded. <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>Try again</a></p>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            {!leafletReady && (
                <div className={styles.skeleton}>
                    <div className={styles.skeletonPulse} />
                </div>
            )}
            <div
                ref={mapContainerRef}
                className={styles.mapContainer}
                style={{ opacity: leafletReady ? 1 : 0 }}
                aria-label={`Approximate map location near ${city}`}
            />
            <div className={styles.privacyBadge}>
                <MapPin size={13} />
                <span>Exact location shared after booking</span>
            </div>
        </div>
    );
};
