import React from 'react';
import styles from './Categories.module.css';
import * as Icons from 'lucide-react';

interface CategoriesProps {
    selectedCategory: string | null;
    onSelectCategory: (id: string) => void;
    showFilters?: boolean;
    onToggleFilters?: () => void;
    activeFiltersCount?: number;
}

export const Categories: React.FC<CategoriesProps> = ({
    showFilters = false,
    onToggleFilters,
    activeFiltersCount = 0,
}) => {
    return (
        <div className={styles.categoriesWrapper}>
            <div className={styles.taglineWrapper}>
                <Icons.Compass size={18} className={styles.taglineIcon} />
                <span className={styles.taglineText}>Explore exceptional stays across India</span>
            </div>
            {onToggleFilters && (
                <div className={styles.filterActionWrapper}>
                    <button
                        type="button"
                        className={`${styles.filterButton} ${showFilters ? styles.filterButtonActive : ''}`}
                        onClick={onToggleFilters}
                        aria-label="Toggle search filters"
                        aria-expanded={showFilters}
                    >
                        <Icons.SlidersHorizontal size={16} />
                        <span className={styles.filterButtonLabel}>Filters</span>
                        {activeFiltersCount > 0 && (
                            <span className={styles.filterBadge}>{activeFiltersCount}</span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
