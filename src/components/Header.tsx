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
    Building2,
    LogOut, 
    LogIn,
    Instagram,
    MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';

export const Header: React.FC = () => {
    const instagramUrl = 'https://www.instagram.com/aevrindia?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==';
    const whatsappUrl = 'https://wa.me/918890807482';
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
                        viewBox="0 0 100 100"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <defs>
                            <linearGradient id="header-logo-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#008489" />
                                <stop offset="100%" stopColor="#00b3b0" />
                            </linearGradient>
                        </defs>
                        <path d="M 50 12 L 85 45 C 89 49, 89 55, 85 59 L 80 64 C 76 68, 70 68, 66 64 L 50 48 L 34 64 C 30 68, 24 68, 20 64 L 15 59 C 11 55, 11 49, 15 45 Z" fill="url(#header-logo-grad)" />
                        <path d="M 50 38 L 72 60 L 72 78 C 72 84, 67 89, 61 89 L 39 89 C 33 89, 28 84, 28 78 L 28 60 Z" fill="none" stroke="url(#header-logo-grad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M 40 70 C 40 70, 50 62, 50 62 C 50 62, 60 70, 60 70" fill="none" stroke="url(#header-logo-grad)" strokeWidth="6" strokeLinecap="round" />
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
                                    <button type="button" className={styles.drawerItem} onClick={() => handleNavigate('/host/properties')}>
                                        <Building2 size={18} className={styles.drawerItemIcon} />
                                        Properties
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

                    <div className={styles.drawerDivider} />
                    <div className={styles.drawerSectionLabel}>Contact</div>
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.drawerAnchorItem}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <MessageCircle size={18} className={styles.drawerItemIcon} />
                        WhatsApp: +91 88908 07482
                    </a>
                    <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.drawerAnchorItem}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        <Instagram size={18} className={styles.drawerItemIcon} />
                        Instagram
                    </a>
                </div>
            </div>
        </header>
    );
};
