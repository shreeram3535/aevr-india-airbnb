import React from 'react';
import { Star, MapPin, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Listing } from '../types';
import styles from './MapListingCard.module.css';

interface MapListingCardProps {
    listing: Listing;
    variant: 'overlay' | 'list';
    onClose?: () => void;
    onClick?: () => void;
    cardIndex?: number;
}

const formatPrice = (price: number) =>
    price >= 1000
        ? `₹${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}k`
        : `₹${price}`;

export const MapListingCard: React.FC<MapListingCardProps> = ({
    listing,
    variant,
    onClose,
    onClick,
    cardIndex = 0,
}) => {
    const imageUrl = listing.images?.[0] ?? listing.media?.[0]?.url ?? '';
    const city = listing.location?.city ?? '';
    const country = listing.location?.country ?? '';
    const locationStr = country.toLowerCase() === 'india' ? city : `${city}, ${country}`;

    if (variant === 'overlay') {
        return (
            <Link
                to={`/rooms/${listing.id}`}
                className={styles.overlay}
                onClick={onClick}
                style={{ textDecoration: 'none' }}
            >
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt={listing.title}
                        className={styles.overlayImage}
                    />
                )}
                <div className={styles.overlayBody}>
                    <div className={styles.overlayTitle}>{listing.title}</div>
                    {locationStr && (
                        <div className={styles.overlayLocation}>
                            <MapPin size={11} />
                            {locationStr}
                        </div>
                    )}
                    <div className={styles.overlayRating}>
                        <Star size={11} className={styles.starIcon} fill="#ff385c" />
                        <span>{listing.rating?.toFixed(1) ?? '—'}</span>
                        {listing.reviewCount > 0 && (
                            <span style={{ color: '#767676' }}>({listing.reviewCount})</span>
                        )}
                    </div>
                    <div className={styles.overlayFooter}>
                        <span className={styles.overlayPrice}>
                            {formatPrice(listing.price)}
                            <span className={styles.overlayPriceUnit}> / night</span>
                        </span>
                    </div>
                </div>
                {onClose && (
                    <button
                        className={styles.closeBtn}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
                        aria-label="Close"
                    >
                        <X size={14} strokeWidth={2.5} />
                    </button>
                )}
            </Link>
        );
    }

    // list variant
    return (
        <Link
            to={`/rooms/${listing.id}`}
            className={styles.listCard}
            onClick={onClick}
            style={{ textDecoration: 'none', '--card-index': cardIndex } as React.CSSProperties}
        >
            <div className={styles.listImageWrap}>
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt={listing.title}
                        className={styles.listImage}
                    />
                )}
                {listing.isGuestFavorite && (
                    <div className={styles.guestFavBadge}>Guest favourite</div>
                )}
            </div>
            <div className={styles.listBody}>
                <div className={styles.listTitle}>{listing.title}</div>
                {locationStr && (
                    <div className={styles.listSubtitle}>{locationStr}</div>
                )}
                <div className={styles.listFooter}>
                    <span className={styles.listPrice}>
                        {formatPrice(listing.price)}
                        <span className={styles.listPriceUnit}> / night</span>
                    </span>
                    <span className={styles.listRating}>
                        <Star size={11} className={styles.starIcon} fill="#ff385c" />
                        {listing.rating?.toFixed(1) ?? '—'}
                    </span>
                </div>
            </div>
        </Link>
    );
};
