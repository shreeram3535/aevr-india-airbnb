import { useEffect, useState } from 'react';
import styles from '../App.module.css'; // Reusing grid styles
import { ListingCard } from '../components/ListingCard';
import { SkeletonScreen } from '../components/SkeletonScreen';
import { api } from '../services/api';
import { favoritesService } from '../services/favorites';
import type { Listing, FlashSaleDrop } from '../types';

export const Favorites = () => {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDrops, setActiveDrops] = useState<FlashSaleDrop[]>([]);

    useEffect(() => {
        const loadFavorites = async () => {
            setLoading(true);
            try {
                const [standardListings, luxeListings, drops] = await Promise.all([
                    api.fetchListings({}),
                    api.fetchListings({ luxurySection: true }),
                    api.fetchActiveFlashDrops(),
                ]);
                const allListings = [...standardListings, ...luxeListings];
                const favoriteIds = favoritesService.getFavorites();
                const favs = allListings.filter(l => favoriteIds.includes(l.id));
                setListings(favs);
                setActiveDrops(drops);
            } catch (error) {
                console.error('Error loading favorites or flash sale drop:', error);
            } finally {
                setLoading(false);
            }
        };

        loadFavorites();

        // Re-load if favorites change (unfavoriting from this page)
        window.addEventListener('favorites-updated', loadFavorites);
        return () => window.removeEventListener('favorites-updated', loadFavorites);
    }, []);

    return (
        <main className={styles.mainContainer}>
            <h1 style={{ marginBottom: '24px', fontSize: '32px', fontWeight: 600 }}>Your favorites</h1>

            {loading ? (
                <SkeletonScreen variant="listing-grid" count={4} />
            ) : listings.length > 0 ? (
                <div className={styles.grid}>
                    {listings.map((listing, index) => (
                        <ListingCard key={listing.id} listing={listing} activeFlashSale={activeDrops} cardIndex={index} />
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <h2>No favorites yet</h2>
                    <p>Click the heart icon on any listing to save it here.</p>
                </div>
            )}
        </main>
    );
};
