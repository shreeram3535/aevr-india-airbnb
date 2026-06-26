import { useEffect, useState, useRef, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Clock3,
    ShieldCheck,
    Sparkles,
    X,
    BedDouble,
    Waves,
    Mountain,
    Home as HomeIcon,
    Rocket,
    Umbrella,
    Tractor,
    Minimize,
    Gem,
    Castle,
    Tent,
    Star,
    Mail,
    MessageCircle,
    Plus,
    Minus,
    Search,
    Building2,
    Compass,
    MapPin,
    User,
    ChevronDown,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Leaf,
    Check,
    Maximize2,
    MoreHorizontal,
    UploadCloud,
    Trash2
} from 'lucide-react';
import styles from '../App.module.css'; // Reusing the grid styles from App module

import { ListingCard } from '../components/ListingCard';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { api } from '../services/api';
import type { FlashSaleDrop, Listing, ListingFilters, ListingSortOption, PresetVideo } from '../types';

const SORT_OPTIONS: Array<{ value: ListingSortOption; label: string }> = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
    { value: 'rating_desc', label: 'Top rated' },
];

const FILTER_CATEGORIES = [
    { slug: 'icons', label: 'Icons', Icon: Star },
    { slug: 'rooms', label: 'Rooms', Icon: BedDouble },
    { slug: 'amazing-pools', label: 'Amazing pools', Icon: Waves },
    { slug: 'amazing-views', label: 'Amazing views', Icon: Mountain },
    { slug: 'cabins', label: 'Cabins', Icon: HomeIcon },
    { slug: 'omg', label: 'OMG!', Icon: Rocket },
    { slug: 'beachfront', label: 'Beachfront', Icon: Umbrella },
    { slug: 'farms', label: 'Farms', Icon: Tractor },
    { slug: 'tiny-homes', label: 'Tiny homes', Icon: Minimize },
    { slug: 'luxe', label: 'Luxe', Icon: Gem },
    { slug: 'castles', label: 'Castles', Icon: Castle },
    { slug: 'camping', label: 'Camping', Icon: Tent },
];

const BUDGET_MIN = 0;
const BUDGET_MAX = 50000;
const BUDGET_STEP = 1000;

const parseNumberParam = (value: string | null) => {
    if (!value) {
        return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const clampBudgetParam = (value: number | undefined) => {
    if (value === undefined) {
        return undefined;
    }

    return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, value));
};

const parseSortParam = (value: string | null): ListingSortOption => {
    if (value === 'price_asc' || value === 'price_desc' || value === 'rating_desc') {
        return value;
    }

    return 'recommended';
};


const PRESET_VIDEOS: PresetVideo[] = [
    {
        name: "Scenic Coastal Escape",
        url: "/sample_tour_1.mp4",
        thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=240&auto=format&fit=crop",
        duration: "0:15"
    },
    {
        name: "Beautiful Ocean Joyride",
        url: "/sample_tour_2.mp4",
        thumb: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=240&auto=format&fit=crop",
        duration: "0:15"
    },
    {
        name: "Scenic Forest Trail (WebM)",
        url: "/sample_tour_3.webm",
        thumb: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=240&auto=format&fit=crop",
        duration: "0:15"
    }
];

const DB_NAME = 'aevr_video_db';
const STORE_NAME = 'videos';
const DB_VERSION = 3;

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                console.warn(`Database opened, but store ${STORE_NAME} is missing. Re-opening with higher version.`);
                db.close();
                const req2 = indexedDB.open(DB_NAME, DB_VERSION + 1);
                req2.onupgradeneeded = () => {
                    const db2 = req2.result;
                    db2.createObjectStore(STORE_NAME);
                };
                req2.onsuccess = () => resolve(req2.result);
                req2.onerror = () => reject(req2.error);
            } else {
                resolve(db);
            }
        };
        request.onerror = () => reject(request.error);
    });
};

const saveVideoFile = async (key: string, file: File): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.put(file, key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (err) {
                reject(err);
            }
        });
    } catch (e) {
        throw e;
    }
};

const getVideoFile = async (key: string): Promise<File | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readonly');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            } catch (err) {
                reject(err);
            }
        });
    } catch (e) {
        throw e;
    }
};

const deleteVideoFile = async (key: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            try {
                const transaction = db.transaction(STORE_NAME, 'readwrite');
                const store = transaction.objectStore(STORE_NAME);
                const request = store.delete(key);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (err) {
                reject(err);
            }
        });
    } catch (e) {
        throw e;
    }
};

const getStoredVideoList = (): PresetVideo[] => {
    const saved = localStorage.getItem('aevr_tour_videos');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Error parsing saved videos from localStorage", e);
        }
    }
    return PRESET_VIDEOS;
};

const VideoDashboardCard = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [videoList, setVideoList] = useState<PresetVideo[]>(PRESET_VIDEOS);
    const [videoSrc, setVideoSrc] = useState<string>(PRESET_VIDEOS[0].url);
    const [activePreset, setActivePreset] = useState<number | null>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isMuted, setIsMuted] = useState<boolean>(true);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [duration, setDuration] = useState<number>(0);
    const [userRole, setUserRole] = useState<'guest' | 'host' | 'admin' | null>(null);
    const [isUsingSupabase, setIsUsingSupabase] = useState<boolean>(false);
    const [isUploading, setIsUploading] = useState<boolean>(false);

    // Sync fallback list to localStorage (only if not using Supabase)
    useEffect(() => {
        if (!isUsingSupabase && videoList.length > 0) {
            localStorage.setItem('aevr_tour_videos', JSON.stringify(videoList));
        }
    }, [videoList, isUsingSupabase]);

    // Load custom/preset videos on mount
    useEffect(() => {
        const loadVideos = async () => {
            try {
                // 1. Try to fetch from Supabase
                const dbVideos = await api.fetchTourVideos();
                if (dbVideos && dbVideos.length > 0) {
                    setVideoList(dbVideos);
                    setVideoSrc(dbVideos[0].url);
                    setIsUsingSupabase(true);
                    return;
                }
            } catch (err) {
                console.warn("Failed to load tour videos from Supabase, falling back to local storage:", err);
            }

            // 2. Fallback to IndexedDB / localStorage
            setIsUsingSupabase(false);
            const listToLoad = getStoredVideoList();
            const loadedList = await Promise.all(
                listToLoad.map(async (video) => {
                    if (video.isLocal && video.id) {
                        try {
                            const file = await getVideoFile(video.id);
                            if (file) {
                                const objectUrl = URL.createObjectURL(file);
                                return { ...video, url: objectUrl };
                            }
                        } catch (err) {
                            console.error("Failed to load IndexedDB video file", err);
                        }
                        return null;
                    }
                    return video;
                })
            );
            
            const cleanList = loadedList.filter((v): v is PresetVideo => v !== null);
            
            if (cleanList.length > 0) {
                setVideoList(cleanList);
                setVideoSrc(cleanList[0].url);
            } else {
                setVideoList(PRESET_VIDEOS);
                setVideoSrc(PRESET_VIDEOS[0].url);
            }
        };

        const checkRole = async () => {
            try {
                const role = await api.getCurrentUserRole();
                setUserRole(role);
            } catch (err) {
                console.error("Error fetching user role", err);
            }
        };

        loadVideos();
        checkRole();
    }, []);

    useEffect(() => {
        setVideoError(null);
        setCurrentTime(0);
        setDuration(0);

        if (videoRef.current) {
            videoRef.current.load();
            if (isPlaying) {
                videoRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch((err) => {
                        console.log("Play failed", err);
                        setIsPlaying(false);
                    });
            }
        }
    }, [videoSrc]);

    const handlePlayPause = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(() => setVideoError("Could not play video source."));
        }
    };

    const handleMuteUnmute = () => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        setCurrentTime(videoRef.current.currentTime);
    };

    const handleLoadedMetadata = () => {
        if (!videoRef.current) return;
        setDuration(videoRef.current.duration);
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current || duration === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = clickX / width;
        const newTime = percentage * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handlePresetClick = (index: number) => {
        setActivePreset(index);
        setVideoSrc(videoList[index].url);
        setVideoError(null);
    };

    const handleRemoveVideo = async (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const targetVideo = videoList[index];
        if (!targetVideo) return;

        try {
            if (isUsingSupabase && targetVideo.id) {
                await api.deleteTourVideo(targetVideo.id, targetVideo.url);
            } else if (targetVideo.isLocal && targetVideo.id) {
                await deleteVideoFile(targetVideo.id);
            }
        } catch (err) {
            console.error("Failed to delete video:", err);
            setVideoError("Failed to delete video from database/storage.");
            return;
        }

        setVideoList(prev => {
            const nextList = prev.filter((_, i) => i !== index);
            if (activePreset === index) {
                if (nextList.length > 0) {
                    setActivePreset(0);
                    setVideoSrc(nextList[0].url);
                } else {
                    setActivePreset(null);
                    setVideoSrc('');
                }
            } else if (activePreset !== null && activePreset > index) {
                setActivePreset(activePreset - 1);
            }
            return nextList;
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setVideoError(null);

        try {
            if (isUsingSupabase) {
                // Upload to Supabase Storage & Database
                const newVideo = await api.uploadTourVideo(file);
                setVideoList(prev => {
                    const nextList = [...prev, newVideo];
                    setActivePreset(nextList.length - 1);
                    return nextList;
                });
                setVideoSrc(newVideo.url);
            } else {
                // Local IndexedDB fallback
                const objectUrl = URL.createObjectURL(file);
                const displayTitle = file.name.length > 22 ? file.name.substring(0, 19) + "..." : file.name;
                const id = 'video_' + Date.now();
                
                await saveVideoFile(id, file);

                const newVideo: PresetVideo = {
                    id,
                    name: displayTitle,
                    url: objectUrl,
                    thumb: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=240&auto=format&fit=crop",
                    duration: "Local File",
                    isLocal: true
                };

                setVideoList(prev => {
                    const nextList = [...prev, newVideo];
                    setActivePreset(nextList.length - 1);
                    return nextList;
                });
                setVideoSrc(objectUrl);
            }
        } catch (err) {
            console.error("Video upload failed:", err);
            setVideoError(err instanceof Error ? err.message : "Failed to load chosen video file.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFullScreen = () => {
        if (!videoRef.current) return;
        if (videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen();
        } else if ((videoRef.current as any).webkitRequestFullscreen) {
            (videoRef.current as any).webkitRequestFullscreen();
        } else if ((videoRef.current as any).msRequestFullscreen) {
            (videoRef.current as any).msRequestFullscreen();
        }
    };

    const formatTime = (time: number) => {
        if (isNaN(time) || !isFinite(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={styles.videoDashboardCard}>
            <div className={styles.videoLeftColumn}>
                <div className={`${styles.videoPlayerContainer} ${userRole !== 'admin' ? styles.videoPlayerFullHeight : ''}`}>
                    <video
                        ref={videoRef}
                        className={styles.customVideo}
                        src={videoSrc}
                        loop
                        muted={isMuted}
                        playsInline
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onError={() => setVideoError("Error loading video source. Make sure it is a valid format (e.g. MP4).")}
                        onClick={handlePlayPause}
                    />
                    
                    {!isPlaying && !videoError && (
                        <button type="button" className={styles.videoPlayOverlayBtn} onClick={handlePlayPause} aria-label="Play video">
                            <Play size={28} fill="currentColor" />
                        </button>
                    )}

                    <div className={styles.videoControlsOverlay}>
                        <div className={styles.videoControlsRow}>
                            <button type="button" className={styles.videoControlBtn} onClick={handlePlayPause} aria-label={isPlaying ? "Pause" : "Play"}>
                                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                            </button>
                            <button type="button" className={styles.videoControlBtn} onClick={handleMuteUnmute} aria-label={isMuted ? "Unmute" : "Mute"}>
                                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <span className={styles.videoProgressTime}>
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                            
                            <div className={styles.videoProgressBar} onClick={handleProgressClick}>
                                <div className={styles.videoProgressFill} style={{ width: `${progressPercentage}%` }}>
                                    <div className={styles.videoProgressThumb} />
                                </div>
                            </div>

                            <button type="button" className={styles.videoControlBtn} onClick={handleFullScreen} aria-label="Fullscreen">
                                <Maximize2 size={16} />
                            </button>
                            <button type="button" className={styles.videoControlBtn} aria-label="More options">
                                <MoreHorizontal size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {userRole === 'admin' && (
                    <div className={styles.uploadCard}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <div className={styles.uploadCardHeader}>
                            <div className={styles.uploadIconWrapper}>
                                <UploadCloud size={20} />
                            </div>
                            <div className={styles.uploadCardText}>
                                <span className={styles.uploadCardTitle}>Upload your own tour video</span>
                                <span className={styles.uploadCardSubtitle}>MP4, WebM up to 200MB</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className={styles.uploadCardButton}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading...' : 'Upload Video'}
                        </button>
                    </div>
                )}
            </div>


            <div className={styles.videoSourcePanel}>
                <div className={styles.videoPanelHeader}>
                    <Leaf className={styles.leafIcon} size={20} />
                    <h2 className={styles.videoPanelTitle}>Aevr Villa Tour</h2>
                    <p className={styles.videoPanelSubtitle}>Experience curated retreats through our travel guide gallery, or upload your own video to test.</p>
                </div>

                <div className={styles.presetSectionTitle}>Select Tour Video</div>
                <div className={styles.presetGrid}>
                    {videoList.map((preset, index) => (
                        <div
                            key={index}
                            role="button"
                            tabIndex={0}
                            className={`${styles.presetItem} ${activePreset === index ? styles.presetItemActive : ''}`}
                            onClick={() => handlePresetClick(index)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handlePresetClick(index);
                                }
                            }}
                        >
                            <div className={styles.presetThumbWrapper}>
                                <img src={preset.thumb} className={styles.presetThumb} alt={preset.name} />
                                <div className={styles.presetPlayOverlay}>
                                    <Play size={10} fill="currentColor" />
                                </div>
                            </div>
                            <div className={styles.presetInfo}>
                                <span className={styles.presetName}>{preset.name}</span>
                                <div className={styles.presetDurationRow}>
                                    <Clock3 size={11} className={styles.durationIcon} />
                                    <span className={styles.presetDuration}>{preset.duration}</span>
                                </div>
                            </div>
                            <div className={styles.presetRightActions}>
                                {activePreset === index && (
                                    <div className={styles.activeCheckCircle}>
                                        <Check size={12} strokeWidth={3} />
                                    </div>
                                )}
                                {userRole === 'admin' && (
                                    <button
                                        type="button"
                                        className={styles.presetRemoveBtn}
                                        onClick={(e) => handleRemoveVideo(index, e)}
                                        aria-label={`Remove video ${preset.name}`}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {videoError && (
                    <div className={styles.videoErrorAlert} role="alert">
                        {videoError}
                    </div>
                )}
            </div>
        </div>
    );
};

const HERO_IMAGES = [
    '/coastal_calm_hero.png',
    '/beige_palace_hero.png',
    '/heritage_palace_hero.png'
];

export const Home = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const categoryParam = searchParams.get('category');
    const luxurySection = searchParams.get('luxurySection') === '1';
    const categoryFilter = !luxurySection && categoryParam && categoryParam !== 'icons' ? categoryParam : undefined;
    const search = searchParams.get('search') ?? undefined;
    const sort = parseSortParam(searchParams.get('sort'));
    const minBudgetParam = clampBudgetParam(parseNumberParam(searchParams.get('minPrice')));
    const maxBudgetParam = clampBudgetParam(parseNumberParam(searchParams.get('maxPrice')));
    
    let budgetMinValue = minBudgetParam ?? BUDGET_MIN;
    let budgetMaxValue = maxBudgetParam ?? BUDGET_MAX;

    // Enforce a minimum gap of BUDGET_STEP to prevent overlap lock
    if (budgetMaxValue - budgetMinValue < BUDGET_STEP) {
        if (maxBudgetParam !== undefined && minBudgetParam === undefined) {
            budgetMinValue = Math.max(BUDGET_MIN, budgetMaxValue - BUDGET_STEP);
            if (budgetMaxValue - budgetMinValue < BUDGET_STEP) {
                budgetMaxValue = budgetMinValue + BUDGET_STEP;
            }
        } else {
            budgetMaxValue = Math.min(BUDGET_MAX, budgetMinValue + BUDGET_STEP);
            if (budgetMaxValue - budgetMinValue < BUDGET_STEP) {
                budgetMinValue = budgetMaxValue - BUDGET_STEP;
            }
        }
    }

    const minPrice = budgetMinValue > BUDGET_MIN ? budgetMinValue : undefined;
    const maxPrice = budgetMaxValue < BUDGET_MAX ? budgetMaxValue : undefined;
    const guests = parseNumberParam(searchParams.get('guests'));
    const bedrooms = parseNumberParam(searchParams.get('bedrooms'));
    const baths = parseNumberParam(searchParams.get('baths'));
    const guestFavoriteOnly = searchParams.get('favorites') === '1';

    const [listings, setListings] = useState<Listing[]>([]);
    const [activeDrop, setActiveDrop] = useState<FlashSaleDrop | null>(null);
    const [activeDrops, setActiveDrops] = useState<FlashSaleDrop[]>([]);
    const [nowTs, setNowTs] = useState(Date.now());
    const [loading, setLoading] = useState(true);
    const [listingError, setListingError] = useState<string | null>(null);

    const [heroSearchQuery, setHeroSearchQuery] = useState(searchParams.get('search') ?? '');
    const [heroGuests, setHeroGuests] = useState(searchParams.get('guests') ?? '');
    const [heroBedrooms, setHeroBedrooms] = useState(searchParams.get('bedrooms') ?? '');

    const [roomsOpen, setRoomsOpen] = useState(false);
    const [guestsOpen, setGuestsOpen] = useState(false);
    const [currentHeroImageIndex, setCurrentHeroImageIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentHeroImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const handleCloseAll = () => {
            setRoomsOpen(false);
            setGuestsOpen(false);
        };
        document.addEventListener('click', handleCloseAll);
        return () => document.removeEventListener('click', handleCloseAll);
    }, []);

    const toggleRooms = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRoomsOpen(prev => !prev);
        setGuestsOpen(false);
    };

    const toggleGuests = (e: React.MouseEvent) => {
        e.stopPropagation();
        setGuestsOpen(prev => !prev);
        setRoomsOpen(false);
    };

    useEffect(() => {
        setHeroSearchQuery(searchParams.get('search') ?? '');
        setHeroGuests(searchParams.get('guests') ?? '');
        setHeroBedrooms(searchParams.get('bedrooms') ?? '');
    }, [searchParams]);

    const updateParams = (patch: Record<string, string | number | boolean | null | undefined>) => {
        const params = new URLSearchParams(searchParams);
        Object.entries(patch).forEach(([key, value]) => {
            if (value === null || value === undefined || value === '') {
                params.delete(key);
                return;
            }

            params.set(key, String(value));
        });
        setSearchParams(params);
    };

    const handleHeroSearch = (e: React.FormEvent) => {
        e.preventDefault();
        updateParams({
            search: heroSearchQuery || null,
            guests: heroGuests || null,
            bedrooms: heroBedrooms || null,
        });
    };

    const handleSelectCategory = (id: string) => {
        const next = new URLSearchParams(searchParams);
        if (categoryParam === id) {
            next.delete('category');
        } else {
            next.delete('luxurySection');
            next.set('category', id);
        }
        setSearchParams(next);
    };

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams);
        ['category', 'luxurySection', 'sort', 'minPrice', 'maxPrice', 'guests', 'bedrooms', 'baths', 'favorites', 'search'].forEach((key) => params.delete(key));
        setSearchParams(params);
    };

    const toggleFavoritesOnly = () => {
        updateParams({ favorites: guestFavoriteOnly ? null : 1 });
    };

    const handleMinBudgetChange = (value: string) => {
        const valNum = Number(value);
        if (Number.isNaN(valNum)) return;
        const nextMinBudget = Math.min(valNum, budgetMaxValue - BUDGET_STEP);
        updateParams({ minPrice: nextMinBudget <= BUDGET_MIN ? null : nextMinBudget });
    };

    const handleMaxBudgetChange = (value: string) => {
        const valNum = Number(value);
        if (Number.isNaN(valNum)) return;
        const nextMaxBudget = Math.max(valNum, budgetMinValue + BUDGET_STEP);
        updateParams({ maxPrice: nextMaxBudget >= BUDGET_MAX ? null : nextMaxBudget });
    };

    const changeGuests = (delta: number) => {
        const nextVal = (guests ?? 0) + delta;
        updateParams({ guests: nextVal <= 0 ? null : nextVal });
    };

    const changeBedrooms = (delta: number) => {
        const nextVal = (bedrooms ?? 0) + delta;
        updateParams({ bedrooms: nextVal <= 0 ? null : nextVal });
    };

    const changeBaths = (delta: number) => {
        const nextVal = (baths ?? 0) + delta;
        updateParams({ baths: nextVal <= 0 ? null : nextVal });
    };

    const isMinSliderOnTop = budgetMinValue > BUDGET_MAX * 0.5;

    useEffect(() => {
        const loadListings = async () => {
            setLoading(true);
            setListingError(null);
            try {
                const filters: ListingFilters = {
                    category: categoryFilter,
                    luxurySection,
                    search,
                    sort,
                    minPrice,
                    maxPrice,
                    guests,
                    bedrooms,
                    baths,
                    guestFavoriteOnly,
                };

                // Fetch listings and flash-sale drop in PARALLEL to halve wait time
                const [listingsResult, flashSaleResult] = await Promise.allSettled([
                    api.fetchListings(filters),
                    api.fetchActiveFlashDrops(new Date()),
                ]);

                if (listingsResult.status === 'fulfilled') {
                    setListings(listingsResult.value);
                } else {
                    const message = listingsResult.reason instanceof Error
                        ? listingsResult.reason.message
                        : 'Could not load listings from Supabase.';
                    setListings([]);
                    setListingError(message);
                    if (import.meta.env.DEV) {
                        console.error(listingsResult.reason);
                    }
                }

                if (flashSaleResult.status === 'fulfilled') {
                    const drops = flashSaleResult.value;
                    setActiveDrops(drops);
                    setActiveDrop(drops.length > 0 ? drops[0] : null);
                } else {
                    setActiveDrops([]);
                    setActiveDrop(null);
                    if (import.meta.env.DEV) {
                        console.error(flashSaleResult.reason);
                    }
                }
            } finally {
                setLoading(false);
            }
        };
        loadListings();
    }, [categoryFilter, luxurySection, search, sort, minPrice, maxPrice, guests, bedrooms, baths, guestFavoriteOnly]);

    const formatBudget = (value: number) =>
        new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(value);

    const budgetLabel = minPrice === undefined && maxPrice === undefined
        ? 'Any price'
        : `${formatBudget(minPrice ?? BUDGET_MIN)} - ${maxPrice === undefined ? 'Any price' : formatBudget(maxPrice)}`;
    const budgetMinProgress = `${((budgetMinValue - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%`;
    const budgetMaxProgress = `${((budgetMaxValue - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%`;

    useEffect(() => {
        const id = window.setInterval(() => setNowTs(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, []);

    const activeFiltersCount = [
        Boolean(categoryFilter),
        luxurySection,
        sort !== 'recommended',
        minPrice !== undefined,
        maxPrice !== undefined,
        guests !== undefined,
        bedrooms !== undefined,
        baths !== undefined,
        guestFavoriteOnly,
    ].filter(Boolean).length;

    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const handleToggle = () => {
            setShowFilters((prev) => !prev);
        };
        window.addEventListener('toggle-filters', handleToggle);
        return () => window.removeEventListener('toggle-filters', handleToggle);
    }, []);

    useEffect(() => {
        if (searchParams.get('showFilters') === 'true') {
            setShowFilters(true);
            const next = new URLSearchParams(searchParams);
            next.delete('showFilters');
            setSearchParams(next, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const remainingMs = activeDrop ? new Date(activeDrop.endAt).getTime() - nowTs : 0;
    const hasActiveDrop = Boolean(activeDrop && remainingMs > 0);
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    const countdown = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    return (
        <>
            <div className={styles.heroSection}>
                {HERO_IMAGES.map((imgUrl, idx) => (
                    <div
                        key={imgUrl}
                        className={`${styles.heroBgImage} ${idx === currentHeroImageIndex ? styles.heroBgImageActive : ''}`}
                        style={{ backgroundImage: `url(${imgUrl})` }}
                    />
                ))}
                <div className={styles.heroOverlay} />
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        Experience India's Finest Stays
                    </h1>
                    
                    <p className={styles.heroSubtitle}>
                        <span className={styles.coastalBlueText}>Handpicked Luxury.</span> Fully Verified Stays.
                    </p>
                    <p className={styles.heroDescription}>
                        Experience India's most extraordinary private villas and heritage estates, professionally managed with a 100% comfort guarantee for your perfect escape.
                    </p>

                    <div className={styles.heroSearchContainer}>
                        <form className={styles.heroSearchForm} onSubmit={handleHeroSearch}>
                            <div className={`${styles.searchField} ${styles.destinationField}`}>
                                <MapPin size={20} className={styles.searchFieldIcon} />
                                <div className={styles.searchFieldTextGroup}>
                                    <label className={styles.searchFieldLabel} htmlFor="hero-destination">Where to?</label>
                                    <div className={styles.inputDropdownWrapper}>
                                        <input
                                            id="hero-destination"
                                            type="text"
                                            placeholder="Search destinations"
                                            value={heroSearchQuery}
                                            onChange={(e) => setHeroSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.searchDivider} />
                            <div 
                                className={`${styles.searchField} ${styles.interactiveField}`} 
                                onClick={toggleRooms}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setRoomsOpen(prev => !prev); setGuestsOpen(false); } }}
                            >
                                <BedDouble size={20} className={styles.searchFieldIcon} />
                                <div className={styles.searchFieldTextGroup}>
                                    <span className={styles.searchFieldLabel}>Rooms</span>
                                    <div className={styles.customSelectTrigger}>
                                        <span className={styles.customSelectValue}>
                                            {heroBedrooms ? (heroBedrooms === '5' ? '5+ rooms' : `${heroBedrooms} room${heroBedrooms === '1' ? '' : 's'}`) : 'Add rooms'}
                                        </span>
                                        <ChevronDown size={14} className={`${styles.selectChevron} ${roomsOpen ? styles.chevronRotated : ''}`} />
                                    </div>
                                </div>
                                {roomsOpen && (
                                    <div className={styles.customDropdownMenu} onClick={(e) => e.stopPropagation()}>
                                        {[
                                            { value: '', label: 'Add rooms' },
                                            { value: '1', label: '1 room' },
                                            { value: '2', label: '2 rooms' },
                                            { value: '3', label: '3 rooms' },
                                            { value: '4', label: '4 rooms' },
                                            { value: '5', label: '5+ rooms' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`${styles.customDropdownOption} ${heroBedrooms === opt.value ? styles.optionActive : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHeroBedrooms(opt.value);
                                                    updateParams({ bedrooms: opt.value || null });
                                                    setRoomsOpen(false);
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={styles.searchDivider} />
                            <div 
                                className={`${styles.searchField} ${styles.interactiveField}`} 
                                onClick={toggleGuests}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setGuestsOpen(prev => !prev); setRoomsOpen(false); } }}
                            >
                                <User size={20} className={styles.searchFieldIcon} />
                                <div className={styles.searchFieldTextGroup}>
                                    <span className={styles.searchFieldLabel}>Guests</span>
                                    <div className={styles.customSelectTrigger}>
                                        <span className={styles.customSelectValue}>
                                            {heroGuests ? (heroGuests === '6' ? '6+ guests' : `${heroGuests} guest${heroGuests === '1' ? '' : 's'}`) : 'Add guests'}
                                        </span>
                                        <ChevronDown size={14} className={`${styles.selectChevron} ${guestsOpen ? styles.chevronRotated : ''}`} />
                                    </div>
                                </div>
                                {guestsOpen && (
                                    <div className={styles.customDropdownMenu} onClick={(e) => e.stopPropagation()}>
                                        {[
                                            { value: '', label: 'Add guests' },
                                            { value: '1', label: '1 guest' },
                                            { value: '2', label: '2 guests' },
                                            { value: '3', label: '3 guests' },
                                            { value: '4', label: '4 guests' },
                                            { value: '6', label: '6+ guests' }
                                        ].map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`${styles.customDropdownOption} ${heroGuests === opt.value ? styles.optionActive : ''}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setHeroGuests(opt.value);
                                                    updateParams({ guests: opt.value || null });
                                                    setGuestsOpen(false);
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button type="submit" className={styles.heroSearchButton} aria-label="Search">
                                <Search size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

                {/* Mode toggle: Aevr / Aevr Luxe (placed below stats) */}
                <div className={styles.homeModeToggleContainer}>
                    <div className={styles.homeModeToggle}>
                        <div className={`${styles.sliderIndicator} ${luxurySection ? styles.sliderIndicatorLuxe : ''}`} />
                        <button
                            type="button"
                            className={`${styles.modeButton} ${!luxurySection ? styles.modeButtonActive : ''}`}
                            onClick={() => {
                                const next = new URLSearchParams(searchParams);
                                next.delete('luxurySection');
                                next.delete('category');
                                setSearchParams(next);
                            }}
                        >
                            Aevr
                        </button>
                        <button
                            type="button"
                            className={`${styles.modeButton} ${luxurySection ? `${styles.modeButtonActive} ${styles.modeButtonActiveLuxe}` : ''}`}
                            onClick={() => {
                                const next = new URLSearchParams(searchParams);
                                next.delete('category');
                                next.set('luxurySection', '1');
                                setSearchParams(next);
                            }}
                        >
                            Aevr Luxe
                        </button>
                    </div>
                    <p className={styles.modeToggleSubtitle}>
                        {!luxurySection 
                            ? 'Discover every stay on AEVR — from budget-friendly escapes to premium luxury villas.' 
                            : 'Explore our handpicked collection of luxury villas and heritage stays, priced above ₹10,000 per night.'}
                    </p>
                </div>

            <main className={`${styles.homeMainContainer} ${luxurySection ? styles.homeModeLuxe : styles.homeModeAevr}`}>
                {hasActiveDrop && activeDrop && (
                    <section className={styles.flashSaleCard}>
                        <img
                            className={styles.flashSaleImage}
                            src={activeDrop.listing.images[0] ?? 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop'}
                            alt={activeDrop.listing.title}
                        />
                        <div className={styles.flashSaleBody}>
                            <div className={styles.flashSaleMeta}>
                                <span className={styles.flashSaleBadge}>
                                    <ShieldCheck size={14} /> Verified by AevrLux
                                </span>
                                <span className={styles.flashSaleTimer}>
                                    <Clock3 size={14} /> {countdown}
                                </span>
                            </div>
                            <h2>{activeDrop.listing.title}</h2>
                            <p>{activeDrop.listing.location.city}, {activeDrop.listing.location.country}</p>
                            <div className={styles.flashSalePricing}>
                                <span className={styles.flashOldPrice}>₹{Math.round(activeDrop.listing.price).toLocaleString('en-IN')}</span>
                                <strong>₹{Math.round(activeDrop.salePrice).toLocaleString('en-IN')}</strong>
                                <span className={styles.flashDiscount}>{Math.round(activeDrop.discountPercent)}% OFF</span>
                            </div>
                            <a className={styles.flashSaleCta} href={`/rooms/${activeDrop.listing.id}`}>View drop</a>
                        </div>
                    </section>
                )}


            {showFilters && (
                <div className={styles.modalBackdrop} onClick={() => setShowFilters(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <button className={styles.closeModalButton} onClick={() => setShowFilters(false)} aria-label="Close filters">
                                <X size={18} />
                            </button>
                            <h2>Filters</h2>
                            <div style={{ width: 18 }} />
                        </div>

                        <div className={styles.modalBody}>
                            {/* Sort Section */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterSectionHeader}>
                                    <h3>Sort Stays</h3>
                                    <p>Choose how listings are ordered in your results</p>
                                </div>
                                <div className={styles.sortOptionsPills}>
                                    {SORT_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={`${styles.sortPill} ${sort === option.value ? styles.sortPillActive : ''}`}
                                            onClick={() => updateParams({ sort: option.value })}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Range / Budget Section */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterSectionHeader}>
                                    <h3>Budget</h3>
                                    <p>Nightly prices before taxes and additional fees</p>
                                </div>
                                <div className={styles.budgetSliderShell}>
                                    <div className={styles.budgetValueRow}>
                                        <strong className={styles.budgetValue}>{budgetLabel}</strong>
                                        <span>/night</span>
                                    </div>
                                    <div
                                        className={styles.budgetRange}
                                        style={{
                                            '--budget-min-progress': budgetMinProgress,
                                            '--budget-max-progress': budgetMaxProgress,
                                        } as CSSProperties}
                                    >
                                        <input
                                            aria-label="Minimum nightly budget"
                                            className={`${styles.budgetSlider} ${styles.budgetSliderMin}`}
                                            type="range"
                                            min={BUDGET_MIN}
                                            max={BUDGET_MAX}
                                            step={BUDGET_STEP}
                                            value={budgetMinValue}
                                            onChange={(e) => handleMinBudgetChange(e.target.value)}
                                            style={{ zIndex: isMinSliderOnTop ? 3 : 4 }}
                                        />
                                        <input
                                            aria-label="Maximum nightly budget"
                                            className={`${styles.budgetSlider} ${styles.budgetSliderMax}`}
                                            type="range"
                                            min={BUDGET_MIN}
                                            max={BUDGET_MAX}
                                            step={BUDGET_STEP}
                                            value={budgetMaxValue}
                                            onChange={(e) => handleMaxBudgetChange(e.target.value)}
                                            style={{ zIndex: isMinSliderOnTop ? 4 : 3 }}
                                        />
                                    </div>
                                </div>

                                <div className={styles.priceInputRow}>
                                    <div className={styles.priceInputContainer}>
                                        <span className={styles.priceInputLabel}>min price</span>
                                        <div className={styles.priceInputInner}>
                                            <span className={styles.currencyPrefix}>₹</span>
                                            <input
                                                type="number"
                                                min={BUDGET_MIN}
                                                max={BUDGET_MAX}
                                                value={minPrice ?? BUDGET_MIN}
                                                onChange={(e) => handleMinBudgetChange(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.priceInputDivider}>–</div>
                                    <div className={styles.priceInputContainer}>
                                        <span className={styles.priceInputLabel}>max price</span>
                                        <div className={styles.priceInputInner}>
                                            <span className={styles.currencyPrefix}>₹</span>
                                            <input
                                                type="number"
                                                min={BUDGET_MIN}
                                                max={BUDGET_MAX}
                                                value={maxPrice ?? BUDGET_MAX}
                                                onChange={(e) => handleMaxBudgetChange(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.quickChips}>
                                    <button type="button" className={styles.quickChip} onClick={() => updateParams({ minPrice: null, maxPrice: 5000 })}>
                                        Under ₹5k
                                    </button>
                                    <button type="button" className={styles.quickChip} onClick={() => updateParams({ minPrice: null, maxPrice: 10000 })}>
                                        Under ₹10k
                                    </button>
                                </div>
                            </div>

                            {/* Rooms and Beds Increment/Decrement Section */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterSectionHeader}>
                                    <h3>Rooms and Beds</h3>
                                    <p>Specify the required space and capacity for your group</p>
                                </div>
                                <div className={styles.countersContainer}>
                                    <div className={styles.counterControl}>
                                        <div className={styles.counterLabel}>
                                            <strong>Guests</strong>
                                            <span>Number of total guests</span>
                                        </div>
                                        <div className={styles.counterActions}>
                                            <button
                                                type="button"
                                                onClick={() => changeGuests(-1)}
                                                disabled={!guests}
                                                className={styles.counterBtn}
                                                aria-label="Decrease guests"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className={styles.counterValue}>{guests ?? 'Any'}</span>
                                            <button
                                                type="button"
                                                onClick={() => changeGuests(1)}
                                                className={styles.counterBtn}
                                                aria-label="Increase guests"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.counterControl}>
                                        <div className={styles.counterLabel}>
                                            <strong>Bedrooms</strong>
                                            <span>Number of bedrooms needed</span>
                                        </div>
                                        <div className={styles.counterActions}>
                                            <button
                                                type="button"
                                                onClick={() => changeBedrooms(-1)}
                                                disabled={!bedrooms}
                                                className={styles.counterBtn}
                                                aria-label="Decrease bedrooms"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className={styles.counterValue}>{bedrooms ?? 'Any'}</span>
                                            <button
                                                type="button"
                                                onClick={() => changeBedrooms(1)}
                                                className={styles.counterBtn}
                                                aria-label="Increase bedrooms"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={styles.counterControl}>
                                        <div className={styles.counterLabel}>
                                            <strong>Bathrooms</strong>
                                            <span>Number of bathrooms needed</span>
                                        </div>
                                        <div className={styles.counterActions}>
                                            <button
                                                type="button"
                                                onClick={() => changeBaths(-1)}
                                                disabled={!baths}
                                                className={styles.counterBtn}
                                                aria-label="Decrease bathrooms"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className={styles.counterValue}>{baths ?? 'Any'}</span>
                                            <button
                                                type="button"
                                                onClick={() => changeBaths(1)}
                                                className={styles.counterBtn}
                                                aria-label="Increase bathrooms"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Property Category Selection Section */}
                            <div className={styles.filterSection}>
                                <div className={styles.filterSectionHeader}>
                                    <h3>Property Styles</h3>
                                    <p>Select category to match your specific style preference</p>
                                </div>
                                <div className={styles.categoryFilterPills}>
                                    {FILTER_CATEGORIES.map((cat) => {
                                        const Icon = cat.Icon;
                                        const isActive = categoryParam === cat.slug;
                                        return (
                                            <button
                                                key={cat.slug}
                                                type="button"
                                                className={`${styles.categoryFilterPill} ${isActive ? styles.categoryFilterPillActive : ''}`}
                                                onClick={() => handleSelectCategory(cat.slug)}
                                            >
                                                <Icon size={14} />
                                                <span>{cat.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Guest Favorites toggle */}
                            <div className={styles.filterSection}>
                                <div className={styles.toggleRow}>
                                    <div className={styles.toggleLabel}>
                                        <h3>Guest favorites</h3>
                                        <p>Stays that guests love most, rated 4.9+ stars</p>
                                    </div>
                                    <button
                                        type="button"
                                        className={`${styles.favoriteToggle} ${guestFavoriteOnly ? styles.favoriteToggleActive : ''}`}
                                        onClick={toggleFavoritesOnly}
                                    >
                                        <Sparkles size={14} />
                                        <span>Guest favorites</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button type="button" className={styles.clearAllButton} onClick={clearFilters} disabled={activeFiltersCount === 0}>
                                Clear all
                            </button>
                            <button type="button" className={styles.showStaysButton} onClick={() => setShowFilters(false)}>
                                {loading ? 'Loading...' : `Show ${listings.length} stay${listings.length === 1 ? '' : 's'}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

                {loading ? (
                    <SkeletonScreen variant="listing-grid" />
                ) : listingError ? (
                    <div className={`${styles.emptyState} ${styles.debugErrorState}`} role="status">
                        <h2>Listings could not load</h2>
                        <p>{listingError}</p>
                    </div>
                ) : listings.length > 0 ? (
                    <>
                        <div className={styles.sectionHeaderRow}>
                            <h2 className={styles.sectionHeading}>{luxurySection ? 'Aevr Luxe stays' : 'Featured stays'}</h2>
                        </div>
                        <div className={styles.grid}>
                            {listings.map((listing, index) => (
                                <ListingCard key={listing.id} listing={listing} activeFlashSale={activeDrops} cardIndex={index} />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <h2>No listings found</h2>
                        <p>No properties found matching your search.</p>
                        <button type="button" className={styles.clearFiltersBtn} onClick={clearFilters}>
                            Clear Filters
                        </button>
                    </div>
                )}
            </main>

            <section className={styles.bottomDashboardSection}>
                <div className={styles.bottomDashboardContainer}>
                    {/* Card 1: Why choose AEVR? */}
                    <div className={styles.dashboardCard}>
                        <h2 className={styles.dashboardCardTitle}>Why choose AEVR?</h2>
                        <div className={styles.compactFeaturesGrid}>
                            <div className={styles.featureItem}>
                                <Building2 className={styles.featureIcon} size={20} />
                                <div className={styles.featureTextGroup}>
                                    <h3 className={styles.featureTitle}>Curated Stays</h3>
                                    <p className={styles.featureDescription}>Handpicked villas for quality & comfort</p>
                                </div>
                            </div>
                            <div className={styles.featureItem}>
                                <Sparkles className={styles.featureIcon} size={20} />
                                <div className={styles.featureTextGroup}>
                                    <h3 className={styles.featureTitle}>Best Prices</h3>
                                    <p className={styles.featureDescription}>Transparent pricing with no hidden fees</p>
                                </div>
                            </div>
                            <div className={styles.featureItem}>
                                <Compass className={styles.featureIcon} size={20} />
                                <div className={styles.featureTextGroup}>
                                    <h3 className={styles.featureTitle}>Local Experiences</h3>
                                    <p className={styles.featureDescription}>Discover like a local with curated guides</p>
                                </div>
                            </div>
                            <div className={styles.featureItem}>
                                <ShieldCheck className={styles.featureIcon} size={20} />
                                <div className={styles.featureTextGroup}>
                                    <h3 className={styles.featureTitle}>Safe & Secure</h3>
                                    <p className={styles.featureDescription}>Trusted by 1000+ families for secure stays</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Interactive Video Player Card */}
                    <VideoDashboardCard />
                </div>
            </section>

            <div className={styles.contactFloatGroup}>
                <a
                    className={`${styles.contactFloatButton} ${styles.whatsappFloat}`}
                    href="https://wa.me/918890807482"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Message on WhatsApp"
                >
                    <img src="/whatsapp.svg" alt="" aria-hidden="true" />
                </a>
                <a
                    className={`${styles.contactFloatButton} ${styles.emailFloat}`}
                    href="https://mail.google.com/mail/?view=cm&fs=1&to=Aevrindia%40gmail.com"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Email Aevrindia@gmail.com"
                >
                    <Mail size={30} aria-hidden="true" />
                </a>
                <a
                    className={`${styles.contactFloatButton} ${styles.instagramFloat}`}
                    href="https://www.instagram.com/aevrindia?igsh=c2dna3Z3Zm5hN293"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open Aevr India on Instagram"
                >
                    <img src="/instagram.svg" alt="" aria-hidden="true" />
                </a>
                <button
                    className={`${styles.contactFloatButton} ${styles.chatFloat}`}
                    type="button"
                    aria-label="Open contact options"
                >
                    <MessageCircle size={30} aria-hidden="true" />
                </button>
            </div>
        </>
    );
};
