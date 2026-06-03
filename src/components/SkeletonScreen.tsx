import styles from './SkeletonScreen.module.css';

type SkeletonScreenVariant =
    | 'listing-grid'
    | 'admin-dashboard'
    | 'admin-table'
    | 'admin-form'
    | 'auth'
    | 'host-dashboard'
    | 'property-form'
    | 'listing-details'
    | 'trips';

type SkeletonScreenProps = {
    variant: SkeletonScreenVariant;
    count?: number;
};

const Line = ({ width = '100%' }: { width?: string }) => (
    <div className={styles.line} style={{ width }} />
);

const Block = ({ height, width = '100%' }: { height: number; width?: string }) => (
    <div className={styles.block} style={{ height, width }} />
);

const ListingCardSkeleton = () => (
    <div className={styles.listingCard}>
        <div className={styles.listingImage} />
        <div className={styles.listingMeta}>
            <Line width="82%" />
            <Line width="58%" />
            <Line width="42%" />
        </div>
    </div>
);

const AdminHeaderSkeleton = () => (
    <div className={styles.adminHeader}>
        <Block height={28} width="64%" />
        <Line width="92%" />
        <Line width="70%" />
    </div>
);

const StatSkeleton = () => (
    <div className={styles.statCard}>
        <Line width="44%" />
        <Block height={30} width="34%" />
        <Line width="72%" />
    </div>
);

const TableRowSkeleton = () => (
    <div className={styles.tableRow}>
        <div>
            <Line width="76%" />
            <div style={{ height: 10 }} />
            <Line width="50%" />
        </div>
        <Line width="72%" />
        <Block height={38} />
    </div>
);

export const SkeletonScreen = ({ variant, count = 8 }: SkeletonScreenProps) => {
    if (variant === 'listing-grid') {
        return (
            <div className={styles.homeGrid} aria-busy="true" aria-label="Loading listings">
                {Array.from({ length: count }).map((_, index) => (
                    <ListingCardSkeleton key={index} />
                ))}
            </div>
        );
    }

    if (variant === 'admin-dashboard') {
        return (
            <div className={styles.adminPanel} aria-busy="true" aria-label="Loading admin dashboard">
                <AdminHeaderSkeleton />
                <div className={styles.statsGrid}>
                    {Array.from({ length: 3 }).map((_, index) => <StatSkeleton key={index} />)}
                </div>
                <div className={styles.tableRows}>
                    {Array.from({ length: 3 }).map((_, index) => <TableRowSkeleton key={index} />)}
                </div>
            </div>
        );
    }

    if (variant === 'admin-table') {
        return (
            <div className={styles.adminPanel} aria-busy="true" aria-label="Loading admin table">
                <AdminHeaderSkeleton />
                <div className={styles.tableRows}>
                    {Array.from({ length: count }).map((_, index) => <TableRowSkeleton key={index} />)}
                </div>
            </div>
        );
    }

    if (variant === 'admin-form') {
        return (
            <div className={styles.adminPanel} aria-busy="true" aria-label="Loading admin form">
                <AdminHeaderSkeleton />
                <div className={styles.formGrid}>
                    <div className={styles.formPanel}>
                        <Block height={42} />
                        <Block height={42} />
                        <Block height={88} />
                    </div>
                    <div className={styles.formPanel}>
                        <Line width="60%" />
                        <Block height={120} />
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'auth') {
        return (
            <div className={styles.authShell} aria-busy="true" aria-label="Loading access">
                <div className={styles.authHero}>
                    <Block height={24} width="120px" />
                    <Block height={46} width="88%" />
                    <Line width="74%" />
                    <Line width="62%" />
                </div>
                <div className={styles.authCard}>
                    <Block height={42} />
                    <Block height={48} />
                    <Block height={48} />
                    <Block height={46} />
                </div>
            </div>
        );
    }

    if (variant === 'host-dashboard') {
        return (
            <div className={styles.hostDashboard} aria-busy="true" aria-label="Loading host dashboard">
                <AdminHeaderSkeleton />
                <div className={styles.hostStats}>
                    {Array.from({ length: 4 }).map((_, index) => <StatSkeleton key={index} />)}
                </div>
                <div className={styles.hostListingGrid}>
                    {Array.from({ length: 3 }).map((_, index) => <ListingCardSkeleton key={index} />)}
                </div>
            </div>
        );
    }

    if (variant === 'property-form') {
        return (
            <div className={styles.formShell} aria-busy="true" aria-label="Loading property form">
                <AdminHeaderSkeleton />
                <div className={styles.formGrid}>
                    <div className={styles.formPanel}>
                        {Array.from({ length: 6 }).map((_, index) => <Block key={index} height={46} />)}
                    </div>
                    <div className={styles.formPanel}>
                        <Block height={180} />
                        <Block height={46} />
                        <Block height={120} />
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'listing-details') {
        return (
            <div className={styles.detailsShell} aria-busy="true" aria-label="Loading listing details">
                <Block height={36} width="58%" />
                <div className={styles.detailsGallery}>
                    <Block height={360} />
                    <div className={styles.formPanel}>
                        <Block height={170} />
                        <Block height={170} />
                    </div>
                </div>
                <div className={styles.detailsBody}>
                    <div className={styles.formPanel}>
                        <Line width="64%" />
                        <Line width="92%" />
                        <Line width="84%" />
                        <Block height={120} />
                    </div>
                    <div className={styles.bookingCard}>
                        <Block height={28} width="56%" />
                        <Block height={48} />
                        <Block height={48} />
                        <Block height={46} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.tripList} aria-busy="true" aria-label="Loading trips">
            <Block height={34} width="240px" />
            {Array.from({ length: count }).map((_, index) => (
                <div className={styles.tripCard} key={index}>
                    <Block height={116} />
                    <div>
                        <Line width="72%" />
                        <div style={{ height: 12 }} />
                        <Line width="46%" />
                        <div style={{ height: 12 }} />
                        <Line width="58%" />
                    </div>
                    <Block height={38} />
                </div>
            ))}
        </div>
    );
};
