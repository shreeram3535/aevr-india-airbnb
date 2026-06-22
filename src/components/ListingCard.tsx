import React, { useState, useEffect } from 'react';
import styles from './ListingCard.module.css';
import type { Listing, FlashSaleDrop } from '../types';
import { Heart, ChevronLeft, ChevronRight, Star, BedDouble, Users, Waves, Mountain, Compass, Sparkles, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { favoritesService } from '../services/favorites';
import { getFallbackImage } from '../services/media';

const getFormattedLocation = (city: string, country: string) => {
    const cleanCity = city.trim();
    const cleanCityLower = cleanCity.toLowerCase();
    if (cleanCityLower === 'alibaug') return 'Alibaug, Maharashtra';
    if (cleanCityLower === 'udaipur') return 'Udaipur, Rajasthan';
    if (cleanCityLower === 'manali') return 'Manali, Himachal Pradesh';
    if (cleanCityLower === 'goa') return 'Goa';
    if (cleanCityLower === 'jaipur') return 'Jaipur, Rajasthan';
    if (cleanCityLower === 'munnar') return 'Munnar, Kerala';
    if (cleanCityLower === 'coorg') return 'Coorg, Karnataka';
    if (cleanCityLower === 'shimla') return 'Shimla, Himachal Pradesh';
    if (cleanCityLower === 'pondicherry') return 'Puducherry';
    
    if (country.toLowerCase() === 'india') return cleanCity;
    return `${cleanCity}, ${country}`;
};

const getHostedByLabel = (listing: { category: string; price: number }) => {
    const normalizedCategory = listing.category.toLowerCase();
    const isLuxeCategory = normalizedCategory.includes('luxe') || normalizedCategory.includes('luxury');
    const isHighPrice = listing.price >= 10000;
    if (isLuxeCategory || isHighPrice) {
        return 'Hosted by Aevr Luxe';
    }
    return 'Hosted by Aevr';
};

const getSpecialAmenity = (listing: Listing) => {
    const title = listing.title.toLowerCase();
    const desc = listing.description.toLowerCase();
    const cat = listing.category.toLowerCase();
    const city = listing.location.city.toLowerCase();

    // Match Mountain View
    if (
        title.includes('mountain') || title.includes('hill') || title.includes('himalayan') || title.includes('pine') ||
        desc.includes('mountain') || desc.includes('hill') || desc.includes('himalayan') ||
        cat === 'amazing-views' || cat === 'cabins' ||
        city === 'manali' || city === 'shimla' || city === 'coorg' || city === 'munnar'
    ) {
        return { label: 'Mountain View', Icon: Mountain };
    }

    // Match Lake View / Water View
    if (
        title.includes('lake') || title.includes('backwater') || title.includes('haveli') || title.includes('aaravali') || 
        desc.includes('lake') || desc.includes('backwater')
    ) {
        return { label: 'Lake View', Icon: Waves };
    }

    // Match Private Pool / Beach View
    if (
        title.includes('pool') || title.includes('beach') || title.includes('sol banyan') || title.includes('ekaant') ||
        desc.includes('pool') || desc.includes('beach') ||
        cat === 'amazing-pools' || cat === 'beachfront' ||
        city === 'goa' || city === 'alibaug' || city === 'pondicherry'
    ) {
        return { label: 'Private Pool', Icon: Waves };
    }

    // Fallback check in listing's amenities array
    if (listing.amenities.some(a => a.toLowerCase().includes('pool'))) {
        return { label: 'Private Pool', Icon: Waves };
    }
    if (listing.amenities.some(a => a.toLowerCase().includes('mountain'))) {
        return { label: 'Mountain View', Icon: Mountain };
    }
    if (listing.amenities.some(a => a.toLowerCase().includes('lake'))) {
        return { label: 'Lake View', Icon: Waves };
    }

    // Ultimate Fallback
    return { label: 'Garden View', Icon: Compass };
};

interface ListingCardProps {
    listing: Listing;
    cardIndex?: number;
    activeFlashSale?: FlashSaleDrop | FlashSaleDrop[] | null;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, cardIndex, activeFlashSale }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorited, setIsFavorited] = useState(() => favoritesService.isFavorite(listing.id));
    const [imageLoaded, setImageLoaded] = useState(false);
    const imageCount = listing.images.length;
    const hasImages = imageCount > 0;
    const fallbackMedia = listing.media.find((item) => item.kind === 'video' && item.thumbnailUrl)?.thumbnailUrl;
    const coverImage = hasImages
        ? (listing.images[currentImageIndex] ?? listing.images[0])
        : fallbackMedia ?? getFallbackImage();

    useEffect(() => {
        const handleUpdate = () => {
            setIsFavorited(favoritesService.isFavorite(listing.id));
        };
        window.addEventListener('favorites-updated', handleUpdate);
        return () => window.removeEventListener('favorites-updated', handleUpdate);
    }, [listing.id]);

    useEffect(() => {
        setImageLoaded(false);
    }, [coverImage]);

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!hasImages) return;
        setCurrentImageIndex((prev) => (prev + 1) % imageCount);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!hasImages) return;
        setCurrentImageIndex((prev) => (prev - 1 + imageCount) % imageCount);
    };

    const toggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        favoritesService.toggleFavorite(listing.id);
    };

    const getActiveDrop = () => {
        if (!activeFlashSale) return null;
        if (Array.isArray(activeFlashSale)) {
            return activeFlashSale.find((d) => d.listingId === listing.id) ?? null;
        }
        return activeFlashSale.listingId === listing.id ? activeFlashSale : null;
    };
    const activeDrop = getActiveDrop();
    const isOnSale = Boolean(activeDrop);
    const currentPrice = isOnSale && activeDrop ? activeDrop.salePrice : listing.price;

    const priceLabel = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: listing.currency ?? 'INR',
        maximumFractionDigits: 0,
    }).format(currentPrice);

    const originalPriceLabel = isOnSale ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: listing.currency ?? 'INR',
        maximumFractionDigits: 0,
    }).format(listing.price) : null;

    const beds = listing.beds ?? Math.max(1, Math.ceil((listing.guestCountMax ?? 4) / 2));
    const guests = listing.guestCountMax ?? (beds * 2);
    const { label: specialAmenityLabel, Icon: SpecialAmenityIcon } = getSpecialAmenity(listing);

    const isLuxe = getHostedByLabel(listing).includes('Luxe');

    return (
        <div 
            className={styles.card}
            style={{ '--card-index': cardIndex } as React.CSSProperties}
        >
            <Link to={`/rooms/${listing.id}`} style={{ display: 'contents', color: 'inherit' }}>
                <div className={styles.imageContainer}>
                    <div className={`${styles.shimmer} ${imageLoaded ? styles.shimmerHidden : ''}`} />
                    <img
                        src={coverImage}
                        alt={listing.title}
                        className={styles.image}
                        loading={cardIndex !== undefined && cardIndex < 4 ? 'eager' : 'lazy'}
                        fetchPriority={cardIndex !== undefined && cardIndex < 2 ? 'high' : 'auto'}
                        decoding="async"
                        onLoad={() => setImageLoaded(true)}
                        onError={(event) => {
                            if (event.currentTarget.src !== getFallbackImage()) {
                                event.currentTarget.src = getFallbackImage();
                            }
                            setImageLoaded(true);
                        }}
                    />

                    {/* Navigation Arrows */}
                    {listing.images.length > 1 && (
                        <>
                            <button
                                type="button"
                                aria-label="Previous image"
                                className={`${styles.navButton} ${styles.prevButton}`}
                                onClick={prevImage}
                                style={{ display: currentImageIndex === 0 ? 'none' : 'flex' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                type="button"
                                aria-label="Next image"
                                className={`${styles.navButton} ${styles.nextButton}`}
                                onClick={nextImage}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </>
                    )}

                    {/* Quick View Overlay */}
                    <div className={styles.quickViewOverlay}>
                        <Eye size={14} className={styles.quickViewIcon} />
                        <span>Quick View</span>
                    </div>

                    {/* Guest Favorite / Flash Sale Badge */}
                    {isOnSale ? (
                        <div className={`${styles.guestFavorite} ${styles.flashSaleBadge}`}>⚡ Flash Sale</div>
                    ) : (listing.isGuestFavorite || listing.title.toLowerCase().includes('ekaant')) && (
                        <div className={`${styles.guestFavorite} ${isLuxe ? styles.guestFavoriteLuxe : ''}`}>
                            {isLuxe ? (
                                <>
                                    <Sparkles size={11} className={styles.luxeBadgeIcon} />
                                    <span>AEVR Luxe Choice</span>
                                </>
                            ) : (
                                'AEVR Choice'
                            )}
                        </div>
                    )}

                    {/* Carousel Dots Indicators */}
                    {listing.images.length > 1 && (
                        <div className={styles.dots}>
                            {Array.from({ length: Math.min(3, listing.images.length) }).map((_, index) => {
                                const activeDotIndex = listing.images.length <= 3
                                    ? currentImageIndex
                                    : Math.min(2, Math.floor((currentImageIndex / listing.images.length) * 3));
                                return (
                                    <div
                                        key={index}
                                        className={`${styles.dot} ${index === activeDotIndex ? styles.activeDot : ''}`}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {/* Heart Icon */}
                    <button
                        type="button"
                        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        className={`${styles.heartButton} ${isFavorited ? styles.favorited : ''}`}
                        onClick={toggleFavorite}
                        style={{ zIndex: 4 }}
                    >
                        <Heart size={16} />
                    </button>
                </div>

                <div className={styles.info}>
                    <div className={styles.rowOne}>
                        <div className={styles.location}>
                            {getFormattedLocation(listing.location.city, listing.location.country)}
                        </div>
                        <div className={styles.statusRight}>
                            {listing.reviewCount === 0 || listing.rating === 0 ? (
                                <span className={styles.goldNewLabel}>New</span>
                            ) : (
                                <span className={styles.rating}>
                                    <Star size={11} className={styles.starIcon} />
                                    <span>{listing.rating.toFixed(1)} ({listing.reviewCount})</span>
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className={styles.title}>{listing.title}</div>
                    <div className={styles.hostedBy}>{getHostedByLabel({ category: listing.category, price: listing.price })}</div>

                    {/* Amenities Row */}
                    <div className={styles.amenitiesRow}>
                        <div className={styles.amenityItem}>
                            <BedDouble size={14} className={styles.amenityIcon} />
                            <span>{beds} Bed{beds > 1 ? 's' : ''}</span>
                        </div>
                        <div className={styles.amenityItem}>
                            <Users size={14} className={styles.amenityIcon} />
                            <span>{guests} Guest{guests > 1 ? 's' : ''}</span>
                        </div>
                        <div className={styles.amenityItem}>
                            <SpecialAmenityIcon size={14} className={styles.amenityIcon} />
                            <span>{specialAmenityLabel}</span>
                        </div>
                    </div>
                    
                    <div className={styles.rowFour}>
                        <div className={styles.priceAndPeriod}>
                            {isOnSale && originalPriceLabel && (
                                <span className={styles.originalPrice}>{originalPriceLabel}</span>
                            )}
                            <span className={styles.price}>{priceLabel}</span>
                            <span className={styles.period}> / night</span>
                            {isOnSale && activeDrop && (
                                <span className={styles.saleBadge}>
                                    {Math.round(activeDrop.discountPercent)}% OFF
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
};
