import { useEffect, useRef, useState } from 'react';
import { MapPin, Search, Maximize2 } from 'lucide-react';
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
        if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = LEAFLET_CSS;
            document.head.appendChild(link);
        }
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadLeaflet()
            .then(() => setLeafletReady(true))
            .catch(() => setLoadError(true));
    }, []);

    useEffect(() => {
        if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

        const L = window.L;
        const { lat: fLat, lng: fLng } = fuzzCoordinates(lat, lng, listingId);

        const map = L.map(mapContainerRef.current, {
            center: [fLat, fLng],
            zoom: 14,
            zoomControl: false,
            scrollWheelZoom: false,
            doubleClickZoom: true,
            dragging: true,
            attributionControl: true,
        });

        map.attributionControl.setPrefix('');
        mapInstanceRef.current = map;

        // CartoDB Voyager — closest free tiles to Google Maps style
        // Warm roads, green parks, clean labels, no messy OSM red dots
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 20,
            subdomains: 'abcd',
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        }).addTo(map);

        // Airbnb-style: black circle with house icon, NO teardrop pin
        const markerHtml = `
            <div class="airbnb-map-marker">
                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" class="airbnb-map-marker-icon">
                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                </svg>
            </div>
        `;
        const icon = L.divIcon({
            html: markerHtml,
            className: '',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });
        L.marker([fLat, fLng], { icon }).addTo(map);

        // Zoom on the right side, like Airbnb
        L.control.zoom({ position: 'topright' }).addTo(map);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [leafletReady]);

    // Invalidate map size when fullscreen toggles
    useEffect(() => {
        if (mapInstanceRef.current) {
            setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
        }
    }, [isFullscreen]);

    const handleFullscreen = () => {
        setIsFullscreen((prev) => !prev);
    };

    if (loadError) {
        return (
            <div className={styles.errorState}>
                <MapPin size={24} />
                <p>Map could not be loaded. <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>Try again</a></p>
            </div>
        );
    }

    return (
        <div
            ref={wrapperRef}
            className={`${styles.wrapper} ${isFullscreen ? styles.wrapperFullscreen : ''}`}
        >
            {/* Top-left search button — Airbnb UI element */}
            {leafletReady && (
                <button
                    className={styles.searchBtn}
                    aria-label="Search this area"
                    type="button"
                    onClick={() => {
                        const map = mapInstanceRef.current;
                        if (map) map.setView(map.getCenter(), map.getZoom());
                    }}
                >
                    <Search size={16} strokeWidth={2.5} />
                </button>
            )}

            {/* Top-right fullscreen button — Airbnb UI element */}
            {leafletReady && (
                <button
                    className={styles.fullscreenBtn}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'View larger map'}
                    type="button"
                    onClick={handleFullscreen}
                >
                    <Maximize2 size={16} strokeWidth={2.5} />
                </button>
            )}

            {!leafletReady && (
                <div className={styles.skeleton}>
                    <div className={styles.skeletonShimmer} />
                </div>
            )}

            <div
                ref={mapContainerRef}
                className={styles.mapContainer}
                style={{ opacity: leafletReady ? 1 : 0 }}
                aria-label={`Approximate map location near ${city}`}
            />

            {/* Privacy note — exactly like Airbnb: plain text below the map */}
        </div>
    );
};
