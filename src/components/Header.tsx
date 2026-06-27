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
    MessageCircle,
    SlidersHorizontal
} from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { authService } from '../services/auth';
import { supabase } from '../services/supabase';

export const Header: React.FC = () => {
    const instagramUrl = 'https://www.instagram.com/aevrindia?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==';
    const whatsappUrl = 'https://wa.me/918890807482';
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [searchParams] = useSearchParams();

    const activeFiltersCount = Array.from(searchParams.keys()).filter(key => 
        ['category', 'sort', 'minPrice', 'maxPrice', 'guests', 'bedrooms', 'baths', 'favorites'].includes(key) && 
        (key !== 'sort' || searchParams.get('sort') !== 'recommended')
    ).length;

    const handleFilterClick = () => {
        if (pathname === '/') {
            window.dispatchEvent(new CustomEvent('toggle-filters'));
        } else {
            navigate('/?showFilters=true');
        }
    };

    useEffect(() => {
        localStorage.removeItem('theme');
        document.documentElement.setAttribute('data-theme', 'light');
    }, []);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [currentUserName, setCurrentUserName] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<'guest' | 'host' | 'admin' | null>(null);
    const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 30) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);


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

        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
                if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                    await loadUser();
                }
            });
            return () => {
                subscription.unsubscribe();
            };
        }
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
        <>
            <header className={`${styles.header} ${pathname === '/' && !isScrolled ? styles.headerTransparent : ''}`}>
                {/* Logo */}
                <div className={styles.logoContainer}>
                    <a href="/" className={styles.logoAnchor} onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                        {/* Gold Sunset Brand Icon */}
                        <svg viewBox="0 0 100 100" className={styles.logoIcon}>
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#B88A5A" strokeWidth="4" />
                            <path d="M 20 65 L 80 65" stroke="#B88A5A" strokeWidth="4" />
                            <path d="M 50 20 L 50 65" stroke="#B88A5A" strokeWidth="4" />
                            <path d="M 30 65 A 20 20 0 0 1 70 65" fill="none" stroke="#B88A5A" strokeWidth="4" />
                        </svg>
                        <div className={styles.logoTextWrapper}>
                            <span className={styles.logoText}>AEVR</span>
                            <span className={styles.logoSubtext}>STAYS THAT STAY WITH YOU</span>
                        </div>
                    </a>
                </div>

                {/* User Menu / Right Actions */}
                <div className={styles.userMenu}>
                    <button 
                        type="button" 
                        className={styles.wishlistBtn}
                        onClick={() => navigate('/favorites')}
                        aria-label="View Wishlist"
                    >
                        <Heart size={18} />
                        <span>Wishlist</span>
                    </button>

                    <button 
                        type="button" 
                        className={styles.filterToggleBtn}
                        onClick={handleFilterClick}
                        aria-label="Toggle filters"
                    >
                        <SlidersHorizontal size={18} />
                        <span>Filters</span>
                        {activeFiltersCount > 0 && (
                            <span className={styles.filterBadge}>{activeFiltersCount}</span>
                        )}
                    </button>

                    {!currentUserName ? (
                        <button 
                            type="button" 
                            className={styles.loginBtn}
                            onClick={() => navigate('/auth')}
                        >
                            <span className={styles.loginBtnTextFull}>Login / Sign up</span>
                            <span className={styles.loginBtnTextMobile}>Login</span>
                        </button>
                    ) : (
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
                                    <img src={currentUserAvatarUrl} alt={currentUserName} className={styles.avatarImage} />
                                ) : initials ? (
                                    <span className={styles.avatarInitials}>{initials}</span>
                                ) : (
                                    <div className={styles.defaultGuestAvatar} aria-label="Default avatar">
                                        <User size={16} className={styles.guestAvatarIcon} />
                                    </div>
                                )}
                            </div>
                        </button>
                    )}
                </div>
            </header>

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
        </>
    );
};
