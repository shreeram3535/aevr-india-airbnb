import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, List, MapPin, X } from 'lucide-react';
import styles from './MapExplore.module.css';
import { api } from '../services/api';
import { hasValidCoords } from '../services/mapUtils';
import type { Listing } from '../types';
import { MapListingCard } from '../components/MapListingCard';

// ─── Leaflet types (loaded from CDN) ─────────────────────────────────────────
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        L: any;
    }
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

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

// ─── India centroid ───────────────────────────────────────────────────────────
const INDIA_CENTER: [number, number] = [20.5937, 78.9629];
const DEFAULT_ZOOM = 5;

// ─── Snap heights for the bottom sheet ───────────────────────────────────────
const SNAP = {
    collapsed: '72px',
    half: '52vh',
    full: '88vh',
} as const;

type SnapState = keyof typeof SNAP;

// ─── Component ────────────────────────────────────────────────────────────────
export const MapExplore: React.FC = () => {
    const navigate = useNavigate();

    // Data
    const [listings, setListings]               = useState<Listing[]>([]);
    const [mappableListings, setMappableListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading]             = useState(true);
    const [loadError, setLoadError]             = useState<string | null>(null);

    // Map
    const mapContainerRef   = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef    = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markersRef        = useRef<Map<string, any>>(new Map());
    const [leafletReady, setLeafletReady] = useState(false);

    // UI state
    const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
    const [sheetOpen, setSheetOpen]             = useState(false);
    const [snapState, setSnapState]             = useState<SnapState>('collapsed');

    // Bottom-sheet drag
    const sheetRef        = useRef<HTMLDivElement>(null);
    const dragStartY      = useRef<number>(0);
    const dragStartHeight = useRef<number>(0);
    const isDragging      = useRef(false);

    // ── Fetch listings ─────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const data = await api.fetchListings({});
            setListings(data);
            const mappable = data.filter(
                (l) => hasValidCoords(l.location?.lat, l.location?.lng)
            );
            setMappableListings(mappable);
        } catch (err) {
            console.error('MapExplore: fetchListings error', err);
            setLoadError('Could not load listings. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        loadLeaflet()
            .then(() => setLeafletReady(true))
            .catch(() => setLoadError('Could not load the map library.'));
    }, [fetchData]);

    // ── Build/rebuild markers once both map + listings are ready ──────────────
    const selectedListingRef = useRef<Listing | null>(null);
    selectedListingRef.current = selectedListing;

    const buildMarkers = useCallback(() => {
        const map = mapInstanceRef.current;
        if (!map || !window.L) return;

        const L = window.L;

        // Remove old markers
        markersRef.current.forEach((m) => m.remove());
        markersRef.current.clear();

        if (mappableListings.length === 0) return;

        const bounds: [number, number][] = [];

        mappableListings.forEach((listing) => {
            const lat = listing.location.lat;
            const lng = listing.location.lng;
            bounds.push([lat, lng]);

            const priceLabel = listing.price >= 1000
                ? `₹${(listing.price / 1000).toFixed(listing.price % 1000 === 0 ? 0 : 1)}k`
                : `₹${listing.price}`;

            const isSelected = selectedListingRef.current?.id === listing.id;

            const icon = L.divIcon({
                html: `<div class="map-price-marker${isSelected ? ' selected' : ''}">${priceLabel}</div>`,
                className: '',
                iconSize: [null, null],
                iconAnchor: [0, 0],
            });

            const marker = L.marker([lat, lng], { icon, zIndexOffset: isSelected ? 500 : 0 });
            marker.addTo(map);
            marker.on('click', () => {
                setSelectedListing(listing);
                map.panTo([lat, lng], { animate: true, duration: 0.5 });
            });

            markersRef.current.set(listing.id, marker);
        });

        // Fit map to all markers on first load
        if (bounds.length > 0) {
            try {
                map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
            } catch {
                map.setView(INDIA_CENTER, DEFAULT_ZOOM);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mappableListings]);

    // ── Update a single marker's selected style without rebuilding all ─────────
    const updateMarkerStyle = useCallback((
        listingId: string | null,
        prevListingId: string | null,
        price: number,
    ) => {
        const L = window.L;
        if (!L) return;

        // Deselect previous
        if (prevListingId) {
            const prevMarker = markersRef.current.get(prevListingId);
            const prevListing = mappableListings.find(l => l.id === prevListingId);
            if (prevMarker && prevListing) {
                const label = prevListing.price >= 1000
                    ? `₹${(prevListing.price / 1000).toFixed(prevListing.price % 1000 === 0 ? 0 : 1)}k`
                    : `₹${prevListing.price}`;
                prevMarker.setIcon(L.divIcon({
                    html: `<div class="map-price-marker">${label}</div>`,
                    className: '',
                    iconSize: [null, null],
                    iconAnchor: [0, 0],
                }));
                prevMarker.setZIndexOffset(0);
            }
        }

        // Select new
        if (listingId) {
            const marker = markersRef.current.get(listingId);
            if (marker) {
                const label = price >= 1000
                    ? `₹${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k`
                    : `₹${price}`;
                marker.setIcon(L.divIcon({
                    html: `<div class="map-price-marker selected">${label}</div>`,
                    className: '',
                    iconSize: [null, null],
                    iconAnchor: [0, 0],
                }));
                marker.setZIndexOffset(500);
            }
        }
    }, [mappableListings]);

    // ── Initialise Leaflet map ────────────────────────────────────────────────
    useEffect(() => {
        if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;

        const L = window.L;
        const map = L.map(mapContainerRef.current, {
            center: INDIA_CENTER,
            zoom: DEFAULT_ZOOM,
            zoomControl: false,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            dragging: true,
            attributionControl: true,
        });

        map.attributionControl.setPrefix('');

        L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            {
                maxZoom: 20,
                subdomains: 'abcd',
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            }
        ).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        // Click on map background → deselect
        map.on('click', () => setSelectedListing(null));

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
            markersRef.current.clear();
        };
    }, [leafletReady]);

    // ── Build markers once map + listings are both ready ──────────────────────
    useEffect(() => {
        if (mapInstanceRef.current && mappableListings.length > 0) {
            buildMarkers();
        }
    }, [buildMarkers, mappableListings]);

    // ── Track previous selected to update marker styles efficiently ───────────
    const prevSelectedRef = useRef<Listing | null>(null);
    useEffect(() => {
        const prev = prevSelectedRef.current;
        updateMarkerStyle(
            selectedListing?.id ?? null,
            prev?.id ?? null,
            selectedListing?.price ?? 0,
        );
        prevSelectedRef.current = selectedListing;
    }, [selectedListing, updateMarkerStyle]);

    // ── Bottom-sheet drag logic (mouse + touch) ───────────────────────────────
    const getSheetHeight = (snap: SnapState) => SNAP[snap];

    const snapFromDrag = (currentH: number): SnapState => {
        const vh = window.innerHeight;
        const halfVh = vh * 0.52;
        const fullVh = vh * 0.88;
        if (currentH > fullVh * 0.75) return 'full';
        if (currentH > halfVh * 0.6)  return 'half';
        return 'collapsed';
    };

    const onDragStart = useCallback((clientY: number) => {
        isDragging.current = true;
        dragStartY.current = clientY;
        const sheet = sheetRef.current;
        if (sheet) dragStartHeight.current = sheet.getBoundingClientRect().height;
    }, []);

    const onDragMove = useCallback((clientY: number) => {
        if (!isDragging.current || !sheetRef.current) return;
        const delta = dragStartY.current - clientY;
        const newH = Math.max(72, Math.min(window.innerHeight * 0.92, dragStartHeight.current + delta));
        sheetRef.current.style.height = `${newH}px`;
    }, []);

    const onDragEnd = useCallback((clientY: number) => {
        if (!isDragging.current || !sheetRef.current) return;
        isDragging.current = false;
        const delta = dragStartY.current - clientY;
        const newH = dragStartHeight.current + delta;
        const snap = snapFromDrag(newH);
        setSnapState(snap);
        sheetRef.current.style.height = getSheetHeight(snap);
        // If dragged to collapsed, close the sheet
        if (snap === 'collapsed') {
            setTimeout(() => setSheetOpen(false), 250);
        }
    }, []);

    // Mouse events
    const onMouseDown = (e: React.MouseEvent) => onDragStart(e.clientY);
    useEffect(() => {
        const move = (e: MouseEvent) => onDragMove(e.clientY);
        const up   = (e: MouseEvent) => onDragEnd(e.clientY);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };
    }, [onDragMove, onDragEnd]);

    // Touch events
    const onTouchStart = (e: React.TouchEvent) => onDragStart(e.touches[0].clientY);
    const onTouchMove  = (e: React.TouchEvent) => onDragMove(e.touches[0].clientY);
    const onTouchEnd   = (e: React.TouchEvent) => onDragEnd(e.changedTouches[0].clientY);

    // ── Open / close bottom sheet ─────────────────────────────────────────────
    const openSheet = () => {
        setSheetOpen(true);
        setSnapState('half');
    };

    const closeSheet = () => {
        setSnapState('collapsed');
        setTimeout(() => setSheetOpen(false), 280);
    };

    // ── Pan to listing when clicking from list ─────────────────────────────────
    const handleListItemClick = (listing: Listing) => {
        setSelectedListing(listing);
        const map = mapInstanceRef.current;
        if (map && hasValidCoords(listing.location?.lat, listing.location?.lng)) {
            map.flyTo([listing.location.lat, listing.location.lng], 13, {
                animate: true,
                duration: 0.8,
            });
        }
        closeSheet();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={styles.page}>
            {/* ── Top bar ─────────────────────────────────────────── */}
            <div className={styles.topBar}>
                <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
                    <ArrowLeft size={16} strokeWidth={2.5} />
                    Back
                </button>

                {!isLoading && mappableListings.length > 0 && (
                    <div className={styles.titlePill}>
                        <MapPin size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                        {mappableListings.length} stays in India
                    </div>
                )}

                <button className={styles.listToggleBtn} onClick={openSheet} aria-label="Show listings list">
                    <List size={16} />
                    Show list
                </button>
            </div>

            {/* ── Map ─────────────────────────────────────────────── */}
            <div className={styles.mapWrap}>
                <div
                    ref={mapContainerRef}
                    className={styles.mapContainer}
                    style={{ opacity: leafletReady ? 1 : 0 }}
                    aria-label="Interactive map of Aevr properties in India"
                />
            </div>

            {/* ── Loading ──────────────────────────────────────────── */}
            {isLoading && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.loadingSpinner} />
                    <span className={styles.loadingText}>Loading map…</span>
                </div>
            )}

            {/* ── Error ────────────────────────────────────────────── */}
            {loadError && !isLoading && (
                <div className={styles.errorState}>
                    <p>Something went wrong</p>
                    <span>{loadError}</span>
                    <button className={styles.retryBtn} onClick={fetchData}>Retry</button>
                </div>
            )}

            {/* ── Selected listing overlay card ─────────────────────── */}
            {selectedListing && !sheetOpen && (
                <div className={styles.overlayWrap}>
                    <MapListingCard
                        listing={selectedListing}
                        variant="overlay"
                        onClose={() => setSelectedListing(null)}
                    />
                </div>
            )}

            {/* ── Results badge ────────────────────────────────────── */}
            {!isLoading && !loadError && !selectedListing && !sheetOpen && mappableListings.length > 0 && (
                <div className={styles.resultsBadge}>
                    {mappableListings.length} properties on map
                </div>
            )}

            {/* ── Bottom Sheet ──────────────────────────────────────── */}
            {sheetOpen && (
                <>
                    <div className={styles.sheetBackdrop} onClick={closeSheet} />
                    <div
                        ref={sheetRef}
                        className={styles.sheet}
                        style={{ height: getSheetHeight(snapState), transition: isDragging.current ? 'none' : 'height 0.28s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                        {/* Drag handle */}
                        <div
                            className={styles.sheetHandle}
                            onMouseDown={onMouseDown}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >
                            <div className={styles.handleBar} />
                        </div>

                        {/* Sheet header */}
                        <div className={styles.sheetHeader}>
                            <div>
                                <div className={styles.sheetTitle}>Stays in India</div>
                                <div className={styles.sheetCount}>{listings.length} properties</div>
                            </div>
                            <button className={styles.sheetCloseBtn} onClick={closeSheet} aria-label="Close list">
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Listings grid */}
                        <div className={styles.sheetContent}>
                            {listings.length === 0 ? (
                                <div className={styles.noListingsMsg}>No listings found.</div>
                            ) : (
                                <div className={styles.listingsGrid}>
                                    {listings.map((listing, i) => (
                                        <MapListingCard
                                            key={listing.id}
                                            listing={listing}
                                            variant="list"
                                            cardIndex={i}
                                            onClick={() => handleListItemClick(listing)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
