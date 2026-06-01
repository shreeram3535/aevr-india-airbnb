const STORAGE_KEY = 'airbnb_clone_favorites';

export const favoritesService = {
    getFavorites: (): string[] => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
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

        localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));

        // Dispatch a custom event so components can react (simple state management)
        window.dispatchEvent(new Event('favorites-updated'));

        return isFavorited;
    }
};
