import { Link } from 'react-router-dom';
import styles from './HostApprovalStatus.module.css';
import type { HostApprovalStatus } from '../types';

export const HostApprovalStatusView = ({ status }: { status: HostApprovalStatus }) => {
    const pending = status === 'pending';

    return (
        <div className={styles.page}>
            <div className={styles.card}>
                <h1>{pending ? 'Your host account is under review' : 'Your host account was not approved'}</h1>
                <p>
                    {pending
                        ? 'An admin needs to approve your host account before you can create or manage listings.'
                        : 'Your host account is currently rejected. Contact an admin to review your account again.'}
                </p>
                <div className={styles.actions}>
                    <Link to="/" className={styles.primaryButton}>Back to guest mode</Link>
                    <Link to="/host/auth" className={styles.secondaryButton}>Switch account</Link>
                </div>
            </div>
        </div>
    );
};
