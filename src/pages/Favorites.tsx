import { useEffect, useState } from 'react';
import styles from '../App.module.css'; // Reusing grid styles
import { ListingCard } from '../components/ListingCard';
import { api } from '../services/api';
import { favoritesService } from '../services/favorites';
import type { Listing } from '../types';

export const Favorites = () => {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadFavorites = async () => {
            setLoading(true);
            try {
                // In a real app, we might have an API to fetch by IDs.
                // Here we'll fetch all and filter client side or add a mock method.
                // For efficiency, we will fetch all and filter since mock data is small.
                const allListings = await api.fetchListings({});
                const favoriteIds = favoritesService.getFavorites();
                const favs = allListings.filter(l => favoriteIds.includes(l.id));
                setListings(favs);
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
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #f7f7f7',
                        borderTopColor: '#ff385c',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
            ) : listings.length > 0 ? (
                <div className={styles.grid}>
                    {listings.map((listing) => (
                        <ListingCard key={listing.id} listing={listing} />
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
