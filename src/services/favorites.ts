const getStorageKey = (): string => {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const value = localStorage.getItem(key);
                if (value) {
                    const parsed = JSON.parse(value);
                    const userId = parsed?.user?.id;
                    if (userId) {
                        const userKey = `airbnb_clone_favorites_${userId}`;
                        // Migrate anonymous favorites to this user's wishlist
                        const anonKey = 'airbnb_clone_favorites_anonymous';
                        const anonStored = localStorage.getItem(anonKey);
                        if (anonStored) {
                            try {
                                const anonFavs = JSON.parse(anonStored);
                                if (Array.isArray(anonFavs) && anonFavs.length > 0) {
                                    const userStored = localStorage.getItem(userKey);
                                    const userFavs = userStored ? JSON.parse(userStored) : [];
                                    const merged = Array.from(new Set([...userFavs, ...anonFavs]));
                                    localStorage.setItem(userKey, JSON.stringify(merged));
                                }
                            } catch (e) {
                                console.error('Failed to migrate anonymous favorites:', e);
                            }
                            localStorage.removeItem(anonKey);
                        }
                        return userKey;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Failed to parse user ID from localStorage:', e);
    }
    return 'airbnb_clone_favorites_anonymous';
};

export const favoritesService = {
    getFavorites: (): string[] => {
        try {
            const key = getStorageKey();
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    },

    isFavorite: (id: string): boolean => {
        const favorites = favoritesService.getFavorites();
        return favorites.includes(id);
    },

    toggleFavorite: (id: string): boolean => { // Returns new state (true=favorited)
        const favorites = favoritesService.getFavorites();
        const index = favorites.indexOf(id);
        let newFavorites;
        let isFavorited;

        if (index === -1) {
            newFavorites = [...favorites, id];
            isFavorited = true;
        } else {
            newFavorites = favorites.filter(favId => favId !== id);
            isFavorited = false;
        }

        const key = getStorageKey();
        localStorage.setItem(key, JSON.stringify(newFavorites));

        // Dispatch a custom event so components can react (simple state management)
        window.dispatchEvent(new Event('favorites-updated'));

        return isFavorited;
    }
};
