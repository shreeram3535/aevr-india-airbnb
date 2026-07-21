import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import styles from './DiscountCountdown.module.css';

export interface DiscountCountdownProps {
    endTime: string | Date;
    onExpire?: () => void;
    className?: string;
}

export const DiscountCountdown: React.FC<DiscountCountdownProps> = ({
    endTime,
    onExpire,
    className = '',
}) => {
    const onExpireRef = useRef(onExpire);
    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    const [timeLeftMs, setTimeLeftMs] = useState<number>(() => {
        if (!endTime) return 0;
        const targetMs = new Date(endTime).getTime();
        return Math.max(0, targetMs - Date.now());
    });

    useEffect(() => {
        if (!endTime) {
            setTimeLeftMs(0);
            return;
        }

        const targetMs = new Date(endTime).getTime();

        const updateTimer = () => {
            const diff = targetMs - Date.now();
            if (diff <= 0) {
                setTimeLeftMs(0);
                onExpireRef.current?.();
                return false;
            }
            setTimeLeftMs(diff);
            return true;
        };

        const isStillActive = updateTimer();
        if (!isStillActive) return;

        const intervalId = setInterval(() => {
            const active = updateTimer();
            if (!active) {
                clearInterval(intervalId);
            }
        }, 1000);

        return () => {
            clearInterval(intervalId);
        };
    }, [endTime]);

    if (timeLeftMs <= 0) {
        return null;
    }

    const totalSeconds = Math.floor(timeLeftMs / 1000);
    const totalHours = Math.floor(totalSeconds / 3600);

    let countdownText = '';
    if (totalHours >= 24) {
        const days = Math.ceil(totalSeconds / (3600 * 24));
        countdownText = `Ends in ${days} day${days > 1 ? 's' : ''} left`;
    } else {
        const hours = totalHours;
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const hh = String(hours).padStart(2, '0');
        const mm = String(minutes).padStart(2, '0');
        const ss = String(seconds).padStart(2, '0');

        countdownText = `Ends in ${hh}:${mm}:${ss}`;
    }

    return (
        <div className={`${styles.badge} ${className}`}>
            <Clock size={13} className={styles.icon} />
            <span>{countdownText}</span>
        </div>
    );
};

export default DiscountCountdown;
