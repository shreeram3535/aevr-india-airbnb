import React, { useEffect, useState } from 'react';
import styles from './Header.module.css';
import { 
    Menu, 
    User,
    X, 
    Home, 
    Calendar, 
    Heart, 
    LayoutDashboard, 
    Flame, 
    UserCheck, 
    Shield, 
    LogOut, 
    LogIn 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';

export const Header: React.FC = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentUserName, setCurrentUserName] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<'guest' | 'host' | 'admin' | null>(null);
    const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadUser = async () => {
            const session = await authService.getSession();
            if (!session) {
                setCurrentUserName(null);
                setCurrentUserRole(null);
                setCurrentUserAvatarUrl(null);
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
            setCurrentUserAvatarUrl(summary?.avatarUrl ?? metadata.avatar_url ?? null);
        };

        loadUser();
    }, []);

    const getUserInitials = () => {
        if (!currentUserName) return null;
        const names = currentUserName.trim().split(/\s+/);
        if (names.length === 0) return null;
        if (names.length === 1) return names[0].charAt(0).toUpperCase();
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

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

    const handleLogout = async () => {
        try {
            setIsMenuOpen(false);
            await authService.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            navigate('/');
            window.location.reload();
        }
    };

    const roleBadgeLabel = currentUserRole ? currentUserRole.toUpperCase() : '';
    const initials = getUserInitials();

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
                
                <button 
                    type="button" 
                    className={styles.profileMenu}
                    aria-label="Open navigation drawer"
                    aria-expanded={isMenuOpen}
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                >
                    <Menu size={18} />
                    <div className={styles.avatar}>
                        {currentUserAvatarUrl ? (
                            <img src={currentUserAvatarUrl} alt={currentUserName ?? 'Avatar'} className={styles.avatarImage} />
                        ) : initials ? (
                            <span className={styles.avatarInitials}>{initials}</span>
                        ) : (
                            <div className={styles.defaultGuestAvatar} aria-label="Default avatar">
                                <User size={16} className={styles.guestAvatarIcon} />
                            </div>
                        )}
                    </div>
                </button>
            </div>

            {/* Drawer Overlay Backdrop */}
            <div 
                className={`${styles.drawerBackdrop} ${isMenuOpen ? styles.backdropOpen : ''}`} 
                onClick={() => setIsMenuOpen(false)}
            />

            {/* Right Side Drawer Panel */}
            <div className={`${styles.drawerPanel} ${isMenuOpen ? styles.drawerOpen : ''}`} role="menu" aria-label="Navigation Drawer">
                {/* Drawer Header */}
                <div className={styles.drawerHeader}>
                    <span className={styles.drawerTitle}>Menu</span>
                    <button 
                        type="button" 
                        className={styles.drawerCloseButton} 
                        onClick={() => setIsMenuOpen(false)}
                        aria-label="Close menu"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Drawer User Card */}
                <div className={styles.drawerUserSection}>
                    <div className={styles.drawerAvatarLarge}>
                        {currentUserAvatarUrl ? (
                            <img src={currentUserAvatarUrl} alt={currentUserName ?? 'Avatar'} className={styles.drawerAvatarImage} />
                        ) : initials ? (
                            <span className={styles.drawerAvatarInitials}>{initials}</span>
                        ) : (
                            <div className={styles.defaultGuestAvatar} aria-label="Default avatar">
                                <User size={24} className={styles.guestAvatarIcon} />
                            </div>
                        )}
                    </div>
                    <div className={styles.drawerUserInfo}>
                        <h3 className={styles.drawerWelcomeText}>
                            {currentUserName ? `Hi, ${currentUserName}` : 'Welcome to Aevr'}
                        </h3>
                        {currentUserRole ? (
                            <span className={styles.drawerRoleBadge}>{roleBadgeLabel}</span>
                        ) : (
                            <p className={styles.drawerSubText}>Sign in to unlock full features</p>
                        )}
                    </div>
                </div>

                {/* Drawer Links */}
                <div className={styles.drawerLinks}>
                    <button type="button" className={styles.drawerItem} onClick={() => handleNavigate('/')}>
                        <Home size={18} className={styles.drawerItemIcon} />
                        Home
                    </button>

                    {!currentUserRole ? (
                        <button type="button" className={styles.drawerItem} onClick={() => handleNavigate('/auth')}>
                            <LogIn size={18} className={styles.drawerItemIcon} />
                            Log In / Sign Up
                        </button>
                    ) : (
                        <>
                            <button type="button" className={styles.drawerItem} onClick={() => handleNavigate('/trips')}>
                                <Calendar size={18} className={styles.drawerItemIcon} />
                                Trips
                            </button>
                            <button type="button" className={styles.drawerItem} onClick={() => handleNavigate('/favorites')}>
                                <Heart size={18} className={styles.drawerItemIcon} />
                                Favorites
                            </button>
                            <button type="button" className={styles.drawerItem} onClick={handleSwitchToHosting}>
                                <LayoutDashboard size={18} className={styles.drawerItemIcon} />
                                Dashboard
                            </button>

                            {currentUserRole === 'admin' && (
                                <>
                                    <div className={styles.drawerDivider} />
                                    <div className={styles.drawerSectionLabel}>Admin Console</div>
                                    <button type="button" className={styles.drawerItem} onClick={() => handleNavigate('/host/flash-sales')}>
                                        <Flame size={18} className={styles.drawerItemIcon} />
                                        Flash Sales
                                    </button>
                                    <button type="button" className={styles.drawerItem} onClick={() => handleNavigate('/host/host-approvals')}>
                                        <UserCheck size={18} className={styles.drawerItemIcon} />
                                        Host Approvals
                                    </button>
                                    <button type="button" className={styles.drawerItem} onClick={() => handleNavigate('/host/guest-verification')}>
                                        <Shield size={18} className={styles.drawerItemIcon} />
                                        Guest Verification
                                    </button>
                                </>
                            )}

                            <div className={styles.drawerDivider} />
                            <button type="button" className={`${styles.drawerItem} ${styles.logoutButton}`} onClick={handleLogout}>
                                <LogOut size={18} className={styles.drawerItemIcon} />
                                Log Out
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};
