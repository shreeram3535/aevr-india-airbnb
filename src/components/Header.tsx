import React, { useEffect, useState } from 'react';
import styles from './Header.module.css';
import { Menu, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentUserName, setCurrentUserName] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<'guest' | 'host' | 'admin' | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const session = await authService.getSession();
            if (!session) {
                setCurrentUserName(null);
                setCurrentUserRole(null);
                return;
            }

            const summary = await api.getCurrentUserSummary();
            const metadata = session.user.user_metadata ?? {};
            const fallbackName = typeof metadata.full_name === 'string'
                ? metadata.full_name
                : typeof metadata.name === 'string'
                    ? metadata.name
                    : session.user.email ?? 'User';

            setCurrentUserName(summary?.name ?? fallbackName);
            setCurrentUserRole(summary?.role ?? 'guest');
        };

        loadUser();
    }, []);

    const handleNavigate = (path: string) => {
        setIsMenuOpen(false);
        navigate(path);
    };

    const resolveDashboardTarget = () => {
        if (currentUserRole === 'admin') {
            return '/host/admin';
        }

        if (currentUserRole === 'host') {
            return '/host';
        }

        return '/trips';
    };

    const handleSwitchToHosting = () => {
        setIsMenuOpen(false);
        navigate(resolveDashboardTarget());
    };

    const roleBadgeLabel = currentUserRole ? currentUserRole.toUpperCase() : '';

    return (
        <header className={styles.header}>
            {/* Logo */}
            <div className={styles.logoContainer}>
                <a href="/" className={styles.logoText} onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                    {/* Nest Logo */}
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm5 15h-2v-6H9v6H7v-7.81l5-4.5 5 4.5V18z" />
                        <circle cx="12" cy="14" r="1.5" />
                    </svg>
                    Aevr
                </a>
            </div>

            {/* User Menu */}
            <div className={styles.userMenu}>
                {!currentUserRole ? (
                    <button type="button" className={styles.hostLink} onClick={() => navigate('/auth')}>
                        Login
                    </button>
                ) : (
                    <>
                        <button type="button" className={styles.hostLink} onClick={() => navigate('/trips')}>
                            Trips
                        </button>
                        <button type="button" className={styles.hostLink} onClick={() => navigate('/favorites')}>
                            Favorites
                        </button>
                        <button type="button" className={styles.hostLink} onClick={handleSwitchToHosting}>
                            Dashboard
                        </button>
                        <div className={styles.userBadge}>
                            <span className={styles.userName}>{currentUserName ?? 'User'}</span>
                            <span className={styles.roleBadge}>{roleBadgeLabel}</span>
                        </div>
                    </>
                )}
                <div className={styles.profileMenu}>
                    <Menu size={18} />
                    <div className={styles.avatar}>
                        <UserCircle size={24} fill="currentColor" className={styles.userIcon} />
                    </div>
                </div>
            </div>

            <button
                type="button"
                className={styles.mobileMenuButton}
                aria-label="Open menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((value) => !value)}
            >
                <Menu size={22} />
            </button>

            {isMenuOpen && (
                <>
                    <button
                        type="button"
                        className={styles.menuBackdrop}
                        aria-label="Close menu"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <div className={styles.mobileMenuPanel} role="menu" aria-label="Mobile navigation">
                        {!currentUserRole ? (
                            <button type="button" className={styles.menuItem} onClick={() => handleNavigate('/auth')}>
                                Login
                            </button>
                        ) : (
                            <>
                                <button type="button" className={styles.menuItem} onClick={() => handleNavigate('/trips')}>
                                    Trips
                                </button>
                                <button type="button" className={styles.menuItem} onClick={() => handleNavigate('/favorites')}>
                                    Favorites
                                </button>
                                <button type="button" className={styles.menuItem} onClick={handleSwitchToHosting}>
                                    Dashboard
                                </button>
                            </>
                        )}
                        {currentUserRole === 'admin' && (
                            <>
                                <button type="button" className={styles.menuItem} onClick={() => handleNavigate('/host/flash-sales')}>
                                    Flash sales
                                </button>
                                <button type="button" className={styles.menuItem} onClick={() => handleNavigate('/host/host-approvals')}>
                                    Host approvals
                                </button>
                                <button type="button" className={styles.menuItem} onClick={() => handleNavigate('/host/guest-verification')}>
                                    Guest verification
                                </button>
                            </>
                        )}
                        <button type="button" className={styles.menuItem} onClick={() => handleNavigate('/')}>
                            Home
                        </button>
                    </div>
                </>
            )}
        </header>
    );
};
