import React from 'react';
import styles from './Footer.module.css';
import { Globe, Instagram, MessageCircle } from 'lucide-react';

const INSTAGRAM_URL = 'https://www.instagram.com/aevrindia?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==';
const WHATSAPP_URL = 'https://wa.me/918890807482';

export const Footer: React.FC = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.content}>
                <div className={styles.section}>
                    <h3>Support</h3>
                    <ul>
                        <li><a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp: +91 88908 07482</a></li>
                        <li><a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram: @aevrindia</a></li>
                        <li><a href="#">Help Center</a></li>
                        <li><a href="#">Disability support</a></li>
                    </ul>
                </div>
                <div className={styles.section}>
                    <h3>Hosting</h3>
                    <ul>
                        <li><a href="#">Aevr your home</a></li>
                        <li><a href="#">AirCover for Hosts</a></li>
                        <li><a href="#">Hosting resources</a></li>
                        <li><a href="#">Community forum</a></li>
                    </ul>
                </div>
                <div className={styles.section}>
                    <h3>Aevr</h3>
                    <ul>
                        <li><a href="#">Newsroom</a></li>
                        <li><a href="#">New features</a></li>
                        <li><a href="#">Careers</a></li>
                        <li><a href="#">Investors</a></li>
                    </ul>
                </div>
            </div>
            <div className={styles.bottomBar}>
                <div className={styles.left}>
                    <span>© 2026 Aevr, Inc.</span>
                    <span>·</span>
                    <a href="#">Privacy</a>
                    <span>·</span>
                    <a href="#">Terms</a>
                    <span>·</span>
                    <a href="#">Sitemap</a>
                </div>
                <div className={styles.right}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={16} /> English (IN)</span>
                    <span>₹ INR</span>
                    <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className={styles.socialLink} aria-label="Chat on WhatsApp">
                        <MessageCircle size={16} /> WhatsApp
                    </a>
                    <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className={styles.socialLink} aria-label="Visit Instagram">
                        <Instagram size={16} /> Instagram
                    </a>
                </div>
            </div>
        </footer>
    );
};
