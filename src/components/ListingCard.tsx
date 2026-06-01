import React, { useState, useEffect } from 'react';
import styles from './ListingCard.module.css';
import type { Listing } from '../types';
import { Star, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { favoritesService } from '../services/favorites';
import { getFallbackImage } from '../services/media';

interface ListingCardProps {
    listing: Listing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isFavorited, setIsFavorited] = useState(favoritesService.isFavorite(listing.id));
    const imageCount = listing.images.length;
    const hasImages = imageCount > 0;
    const fallbackMedia = listing.media.find((item) => item.kind === 'video' && item.thumbnailUrl)?.thumbnailUrl;
    const coverImage = hasImages
        ? (listing.images[currentImageIndex] ?? listing.images[0])
        : fallbackMedia ?? getFallbackImage();

    useEffect(() => {
        setIsFavorited(favoritesService.isFavorite(listing.id));

        // Sync with external updates (e.g. from other tabs or components)
        const handleUpdate = () => {
            setIsFavorited(favoritesService.isFavorite(listing.id));
        };
        window.addEventListener('favorites-updated', handleUpdate);
        return () => window.removeEventListener('favorites-updated', handleUpdate);
    }, [listing.id]);

    useEffect(() => {
        setCurrentImageIndex(0);
    }, [listing.id]);

    useEffect(() => {
        if (currentImageIndex >= imageCount) {
            setCurrentImageIndex(0);
        }
    }, [currentImageIndex, imageCount]);

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
        e.preventDefault(); // Prevent link click
        favoritesService.toggleFavorite(listing.id);
        // State updates via event listener, but optimistic update helps responsiveness.
        setIsFavorited((current) => !current);
    };

    const priceLabel = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: listing.currency ?? 'INR',
        maximumFractionDigits: 0,
    }).format(listing.price);

    return (
        <div className={styles.card}>
            <Link to={`/rooms/${listing.id}`} style={{ display: 'contents', color: 'inherit' }}>
                <div className={styles.imageContainer}>
                    <img
                        src={coverImage}
                        alt={listing.title}
                        className={styles.image}
                        onError={(event) => {
                            if (event.currentTarget.src !== getFallbackImage()) {
                                event.currentTarget.src = getFallbackImage();
                            }
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
                                style={{ display: currentImageIndex === 0 ? 'none' : 'flex' }} // Airbnb style: hide prev on first image
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

                    {/* Guest Favorite Badge */}
                    {listing.isGuestFavorite && (
                        <div className={styles.guestFavorite}>Guest favorite</div>
                    )}

                    {/* Carousel Dots Indicators */}
                    {listing.images.length > 1 && (
                        <div className={styles.dots}>
                            {listing.images.map((_, index) => (
                                <div
                                    key={index}
                                    className={`${styles.dot} ${index === currentImageIndex ? styles.activeDot : ''}`}
                                />
                            ))}
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
                        <Heart size={24} fill={isFavorited ? 'currentColor' : 'rgba(0,0,0,0.5)'} />
                    </button>

                </div>

                <div className={styles.info}>
                    <div className={styles.headerRow}>
                        <div className={styles.title}>{listing.location.city}, {listing.location.country}</div>
                        <div className={styles.rating}>
                            <Star size={14} fill="currentColor" />
                            <span>{listing.rating}</span>
                        </div>
                    </div>
                    <div className={styles.subtitle}>
                        Hosted by {listing.host.name}
                    </div>
                    <div className={styles.dates}>{listing.availableDates}</div>
                    <div className={styles.priceRow}>
                        <div className={styles.price}>{priceLabel}</div>
                        <div className={styles.period}>night</div>
                    </div>
                </div>
            </Link>
        </div>
    );
};
