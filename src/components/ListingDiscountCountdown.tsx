import React, { useState, useEffect } from 'react';
import styles from './ListingDiscountCountdown.module.css';

export interface ListingDiscountCountdownProps {
    endTime?: string | null;
    className?: string;
}

export const ListingDiscountCountdown: React.FC<ListingDiscountCountdownProps> = ({ endTime, className }) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(() => {
        if (!endTime) return null;
        const target = new Date(endTime).getTime();
        if (isNaN(target)) return null;
        const diff = Math.floor((target - Date.now()) / 1000);
        return diff > 0 ? diff : null;
    });

    useEffect(() => {
        if (!endTime) {
            setTimeLeft(null);
            return;
        }

        const calculateTimeLeft = () => {
            const target = new Date(endTime).getTime();
            if (isNaN(target)) return null;
            const diff = Math.floor((target - Date.now()) / 1000);
            return diff > 0 ? diff : null;
        };

        setTimeLeft(calculateTimeLeft());

        const interval = setInterval(() => {
            const remaining = calculateTimeLeft();
            setTimeLeft(remaining);
            if (remaining === null) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    if (timeLeft === null || timeLeft <= 0) {
        return null;
    }

    const days = Math.floor(timeLeft / 86400);
    const hours = Math.floor((timeLeft % 86400) / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    const formatted = parts.join(' ');

    return (
        <span className={`${styles.plainCountdown} ${className || ''}`}>
            {formatted}
        </span>
    );
};

export default ListingDiscountCountdown;
