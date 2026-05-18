import React, { useEffect, useState } from 'react';
import styles from './Categories.module.css';
import { api } from '../services/api';
import type { Category } from '../types';
import * as Icons from 'lucide-react';

interface CategoriesProps {
    selectedCategory: string | null;
    onSelectCategory: (id: string) => void;
}

export const Categories: React.FC<CategoriesProps> = ({ selectedCategory, onSelectCategory }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await api.fetchCategories();
                setCategories(data);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        // Skeleton or simple loader could go here
        return <div className={styles.categoriesContainer} style={{ height: '78px' }}></div>;
    }

    return (
        <div className={styles.categoriesContainer}>
            {categories.map((cat) => {
                // Dynamically resolve icon from lucide-react
                const iconMap = Icons as unknown as Record<string, React.ElementType>;
                const IconComponent = iconMap[cat.iconName] ?? Icons.HelpCircle;

                return (
                    <button
                        key={cat.id}
                        className={`${styles.categoryItem} ${selectedCategory === cat.id ? styles.active : ''}`}
                        onClick={() => onSelectCategory(cat.id)}
                    >
                        <IconComponent className={styles.icon} strokeWidth={1.8} />
                        <span className={styles.label}>{cat.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
