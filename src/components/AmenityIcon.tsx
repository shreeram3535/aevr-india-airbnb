import React from 'react';

/**
 * Shared custom SVG amenity icons.
 * Used in both HostNewProperty (host form) and ListingDetails (guest view)
 * so icons stay identical across the app.
 *
 * Matching is case-insensitive: 'wifi', 'WiFi', and 'Wifi' all resolve correctly.
 */

interface AmenityIconProps {
    /** Amenity label — matched case-insensitively */
    name: string;
    /** Icon size in px (default 24) */
    size?: number;
    className?: string;
}

const AmenityIcon: React.FC<AmenityIconProps> = ({ name, size = 24, className }) => {
    const s: React.SVGProps<SVGSVGElement> = {
        width: size,
        height: size,
        viewBox: '0 0 32 32',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        'aria-hidden': true,
    };

    const key = name.trim().toLowerCase();

    // ── Connectivity & Tech ────────────────────────────────────────────
    if (['wifi', 'wi-fi', 'wireless internet'].includes(key))
        return <svg {...s}><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" fill="currentColor" /></svg>;

    if (['smart tv', 'tv', 'television', 'cable tv', 'netflix'].includes(key))
        return <svg {...s}><rect x="2" y="7" width="28" height="18" rx="3" /><path d="M10 25l2 4h8l2-4" /><line x1="8" y1="13" x2="24" y2="13" /><line x1="8" y1="18" x2="20" y2="18" /></svg>;

    if (['dedicated workspace', 'workspace', 'work desk', 'home office'].includes(key))
        return <svg {...s}><rect x="2" y="6" width="28" height="18" rx="3" /><line x1="2" y1="26" x2="30" y2="26" /><line x1="16" y1="24" x2="16" y2="26" /><line x1="9" y1="12" x2="23" y2="12" /><line x1="9" y1="17" x2="18" y2="17" /></svg>;

    // ── Climate ────────────────────────────────────────────────────────
    if (['ac', 'air conditioning', 'air conditioner', 'a/c'].includes(key))
        return <svg {...s}><rect x="2" y="6" width="28" height="12" rx="3" /><line x1="8" y1="18" x2="6" y2="26" /><line x1="16" y1="18" x2="16" y2="26" /><line x1="24" y1="18" x2="26" y2="26" /><line x1="7" y1="12" x2="25" y2="12" /></svg>;

    if (['heating', 'heater', 'room heating', 'central heating'].includes(key))
        return <svg {...s}><path d="M16 4v4M8 8l3 3M4 16h4M8 24l3-3M16 28v-4M24 24l-3-3M28 16h-4M24 8l-3 3" /><circle cx="16" cy="16" r="5" /></svg>;

    if (['ceiling fan', 'fan', 'table fan'].includes(key))
        return <svg {...s}><circle cx="16" cy="16" r="3" /><path d="M16 13V4a4 4 0 0 1 8 0" /><path d="M19 16h9a4 4 0 0 1 0 8" /><path d="M16 19v9a4 4 0 0 1-8 0" /><path d="M13 16H4a4 4 0 0 1 0-8" /></svg>;

    // ── Kitchen & Dining ───────────────────────────────────────────────
    if (['kitchen', 'fully equipped kitchen', 'kitchenette'].includes(key))
        return <svg {...s}><rect x="3" y="3" width="26" height="7" rx="2" /><path d="M3 10v18a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V10" /><line x1="10" y1="10" x2="10" y2="30" /><circle cx="20" cy="20" r="4" /><line x1="20" y1="16" x2="20" y2="13" /></svg>;

    if (['refrigerator', 'fridge', 'minibar', 'mini fridge'].includes(key))
        return <svg {...s}><rect x="6" y="2" width="20" height="28" rx="3" /><line x1="6" y1="14" x2="26" y2="14" /><line x1="13" y1="8" x2="13" y2="12" /><line x1="13" y1="18" x2="13" y2="24" /></svg>;

    if (['microwave', 'oven', 'microwave oven'].includes(key))
        return <svg {...s}><rect x="2" y="8" width="28" height="16" rx="3" /><rect x="5" y="11" width="16" height="10" rx="2" /><circle cx="25" cy="13" r="1" fill="currentColor" /><circle cx="25" cy="17" r="1" fill="currentColor" /><circle cx="25" cy="21" r="1" fill="currentColor" /></svg>;

    if (['breakfast included', 'breakfast', 'complimentary breakfast', 'morning meals'].includes(key))
        return <svg {...s}><path d="M4 16h24" /><path d="M6 16V10a10 10 0 0 1 20 0v6" /><path d="M4 20h24v2a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-2z" /></svg>;

    // ── Laundry ────────────────────────────────────────────────────────
    if (['washer', 'washing machine', 'laundry', 'laundry machine'].includes(key))
        return <svg {...s}><rect x="3" y="3" width="26" height="26" rx="4" /><circle cx="16" cy="18" r="6" /><circle cx="16" cy="18" r="3" /><line x1="8" y1="8" x2="8" y2="8" strokeWidth={3} /><line x1="13" y1="8" x2="19" y2="8" /></svg>;

    if (['dryer', 'clothes dryer', 'tumble dryer'].includes(key))
        return <svg {...s}><rect x="3" y="3" width="26" height="26" rx="4" /><circle cx="16" cy="18" r="6" /><path d="M12 14l8 8M20 14l-8 8" /><line x1="8" y1="8" x2="8" y2="8" strokeWidth={3} /><line x1="13" y1="8" x2="19" y2="8" /></svg>;

    if (['iron & board', 'iron', 'iron and board', 'ironing board'].includes(key))
        return <svg {...s}><path d="M4 20h20a6 6 0 0 0 6-6H4" /><path d="M4 20v4" /><circle cx="8" cy="24" r="2" /></svg>;

    // ── Outdoors & Recreation ──────────────────────────────────────────
    if (['pool', 'swimming pool', 'outdoor pool', 'indoor pool', 'private pool'].includes(key))
        return <svg {...s}><path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" /><path d="M2 26c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" /><path d="M10 14V6l6-4" /><line x1="16" y1="6" x2="22" y2="6" /></svg>;

    if (['plunge pool', 'splash pool', 'cold plunge'].includes(key))
        return <svg {...s}><rect x="6" y="12" width="20" height="14" rx="4" /><path d="M10 18c1-1 2-1 3 0s2 1 3 0 2-1 3 0" /><path d="M10 4v8M16 2v10M22 4v8" /></svg>;

    if (['hot tub / jacuzzi', 'hot tub', 'jacuzzi', 'whirlpool', 'spa tub'].includes(key))
        return <svg {...s}><path d="M4 22v2a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4v-2" /><path d="M4 22H28" /><path d="M8 22V16a8 8 0 0 1 16 0v6" /><path d="M10 8c0-2 1.5-4 4-4" /><path d="M18 8c0-2 1.5-4 4-4" /></svg>;

    if (['garden', 'lawn', 'courtyard', 'backyard'].includes(key))
        return <svg {...s}><path d="M16 28V16" /><path d="M16 16c0 0-4-6-8-8 0 0 2 8 8 8z" /><path d="M16 16c0 0 4-6 8-8 0 0-2 8-8 8z" /><path d="M16 20c0 0-5-3-9-2 0 0 3 7 9 2z" /><line x1="10" y1="28" x2="22" y2="28" /></svg>;

    if (['terrace', 'rooftop terrace', 'sun deck'].includes(key))
        return <svg {...s}><rect x="3" y="3" width="26" height="26" rx="2" /><line x1="3" y1="16" x2="29" y2="16" /><line x1="10" y1="16" x2="10" y2="29" /><line x1="22" y1="16" x2="22" y2="29" /></svg>;

    if (['balcony', 'private balcony', 'juliet balcony'].includes(key))
        return <svg {...s}><rect x="8" y="2" width="16" height="20" rx="2" /><line x1="3" y1="22" x2="29" y2="22" /><line x1="11" y1="8" x2="11" y2="22" /><line x1="21" y1="8" x2="21" y2="22" /></svg>;

    if (['bbq grill', 'bbq', 'barbeque', 'barbecue', 'grill'].includes(key))
        return <svg {...s}><path d="M5 12c0 6 4.5 10 11 10s11-4 11-10" /><path d="M4 12h24" /><line x1="16" y1="22" x2="16" y2="28" /><line x1="10" y1="28" x2="22" y2="28" /><path d="M9 6c1-2 3-2 4 0s3 2 4 0 3-2 4 0" /></svg>;

    if (['bonfire area', 'bonfire', 'fire pit', 'campfire'].includes(key))
        return <svg {...s}><path d="M16 22c-3 0-5-2-5-5 0-4 5-7 5-7s5 3 5 7c0 3-2 5-5 5z" /><path d="M8 28h16" /><line x1="16" y1="22" x2="16" y2="28" /></svg>;

    if (['private beach', 'beach access', 'beach', 'beachfront'].includes(key))
        return <svg {...s}><path d="M4 28c4-8 10-12 14-10" /><path d="M4 28c2-10 8-16 16-14" /><circle cx="22" cy="8" r="4" /><line x1="4" y1="28" x2="28" y2="28" /></svg>;

    if (['gym', 'fitness center', 'fitness room', 'exercise room'].includes(key))
        return <svg {...s}><path d="M6 10H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /><path d="M26 10h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" /><line x1="6" y1="16" x2="26" y2="16" /><rect x="6" y="10" width="4" height="12" rx="2" /><rect x="22" y="10" width="4" height="12" rx="2" /></svg>;

    if (['yoga space', 'yoga', 'meditation room', 'meditation space'].includes(key))
        return <svg {...s}><circle cx="16" cy="7" r="3" /><path d="M10 14c2-2 4-3 6-3s4 1 6 3" /><path d="M7 20l3-6 6 4 6-4 3 6" /><line x1="4" y1="28" x2="28" y2="28" /></svg>;

    if (['ayurvedic spa', 'spa', 'ayurveda', 'wellness spa', 'massage'].includes(key))
        return <svg {...s}><path d="M16 4c-5 5-8 10-8 14a8 8 0 0 0 16 0c0-4-3-9-8-14z" /><path d="M12 18a4 4 0 0 0 8 0" /></svg>;

    // ── Transport & Parking ────────────────────────────────────────────
    if (['free parking', 'parking', 'car parking', 'on-site parking', 'off-street parking'].includes(key))
        return <svg {...s}><rect x="3" y="3" width="26" height="26" rx="4" /><path d="M11 22V10h6a5 5 0 0 1 0 10h-6" /></svg>;

    if (['valet parking', 'valet service'].includes(key))
        return <svg {...s}><rect x="3" y="3" width="26" height="26" rx="4" /><path d="M11 22V10h6a5 5 0 0 1 0 10h-6" /><circle cx="23" cy="23" r="3" fill="currentColor" /></svg>;

    if (['ev charging', 'electric vehicle charging', 'ev charger', 'electric car charging'].includes(key))
        return <svg {...s}><path d="M10 2v10H4l12 18V20h6L10 2z" /></svg>;

    if (['cycle rental', 'bicycle rental', 'bike rental', 'cycling'].includes(key))
        return <svg {...s}><circle cx="8" cy="22" r="6" /><circle cx="24" cy="22" r="6" /><path d="M8 22l6-10h6" /><path d="M14 12l4 10" /><circle cx="18" cy="10" r="2" /></svg>;

    if (['airport transfer', 'airport pickup', 'airport shuttle', 'car transfer'].includes(key))
        return <svg {...s}><path d="M4 20l20-12v4l-20 8" /><path d="M4 20v4h6" /><line x1="14" y1="28" x2="28" y2="28" /></svg>;

    // ── Food & Hospitality ─────────────────────────────────────────────
    if (['restaurant', 'in-house restaurant', 'fine dining', 'on-site restaurant'].includes(key))
        return <svg {...s}><path d="M8 2v10a4 4 0 0 0 8 0V2" /><line x1="12" y1="12" x2="12" y2="30" /><path d="M20 2v6c0 3.3 2.7 6 6 6" /><line x1="26" y1="2" x2="26" y2="30" /></svg>;

    if (['butler service', 'butler', 'personal butler'].includes(key))
        return <svg {...s}><circle cx="16" cy="8" r="4" /><path d="M8 28v-4a8 8 0 0 1 16 0v4" /><path d="M10 16h12" /><path d="M16 16v6" /></svg>;

    if (['concierge', 'concierge service', '24/7 concierge'].includes(key))
        return <svg {...s}><path d="M4 26h24" /><path d="M16 8V4" /><path d="M4 26a12 12 0 0 1 24 0" /><circle cx="16" cy="7" r="3" /></svg>;

    if (['room service', 'in-room dining', '24hr room service'].includes(key))
        return <svg {...s}><circle cx="16" cy="14" r="8" /><path d="M8 22h16" /><path d="M12 26h8" /><path d="M13 10l3 4 3-4" /></svg>;

    if (['organic meals', 'organic food', 'farm-to-table', 'healthy meals'].includes(key))
        return <svg {...s}><path d="M16 4c-5 5-8 10-8 14a8 8 0 0 0 16 0c0-4-3-9-8-14z" /><path d="M10 24h12" /></svg>;

    if (['café on site', 'cafe', 'cafe on site', 'coffee shop', 'café', 'coffee'].includes(key))
        return <svg {...s}><path d="M6 12h16v10a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V12z" /><path d="M22 14h2a4 4 0 0 1 0 8h-2" /><path d="M10 4v4M14 2v6M18 4v4" /></svg>;

    // ── Nature & Views ─────────────────────────────────────────────────
    if (['nature trails', 'hiking trails', 'walking trails', 'trekking trails'].includes(key))
        return <svg {...s}><path d="M4 28l8-16 6 8 4-6 6 14" /><path d="M2 28h28" /></svg>;

    if (['estate walk', 'property walk', 'guided walk', 'nature walk'].includes(key))
        return <svg {...s}><path d="M4 28c6-12 18-12 24 0" /><path d="M4 20c3-6 9-6 12 0" /><line x1="2" y1="28" x2="30" y2="28" /></svg>;

    if (['mountain view', 'hill view', 'valley view', 'himalayan view'].includes(key))
        return <svg {...s}><path d="M2 28L12 8l8 12 4-6 6 14" /><line x1="2" y1="28" x2="30" y2="28" /></svg>;

    if (['sea view', 'ocean view', 'harbour view', 'bay view', 'water view'].includes(key))
        return <svg {...s}><path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" /><path d="M2 26c2-2 4-2 6 0s4 2 6 0 4-2 6 0 4 2 6 0" /><circle cx="16" cy="8" r="5" /></svg>;

    if (['lake view', 'river view', 'pond view', 'waterfall view', 'backwater view'].includes(key))
        return <svg {...s}><ellipse cx="16" cy="18" rx="12" ry="8" /><path d="M10 14c2-4 4-8 6-10 2 2 4 6 6 10" /></svg>;

    if (['forest view', 'jungle view', 'tea garden view', 'plantation view', 'greens view'].includes(key))
        return <svg {...s}><path d="M8 28l4-10 4 5 4-8 4 13" /><line x1="2" y1="28" x2="30" y2="28" /></svg>;

    // ── Safety & Convenience ───────────────────────────────────────────
    if (['24/7 security', 'security', 'security guard', 'security personnel', 'gated community'].includes(key))
        return <svg {...s}><path d="M16 3L4 8v8c0 7.5 5 14 12 16 7-2 12-8.5 12-16V8L16 3z" /><path d="M12 16l3 3 5-5" /></svg>;

    if (['cctv cameras', 'cctv', 'security cameras', 'surveillance cameras'].includes(key))
        return <svg {...s}><rect x="2" y="10" width="16" height="12" rx="2" /><path d="M18 14l8-4v10l-8-4" /><circle cx="9" cy="16" r="3" /></svg>;

    if (['smoke alarm', 'smoke detector', 'carbon monoxide alarm', 'fire alarm'].includes(key))
        return <svg {...s}><circle cx="16" cy="18" r="8" /><line x1="16" y1="2" x2="16" y2="10" /><line x1="10" y1="4" x2="13" y2="8" /><line x1="22" y1="4" x2="19" y2="8" /></svg>;

    if (['first aid kit', 'first aid', 'medical kit', 'emergency kit'].includes(key))
        return <svg {...s}><rect x="4" y="8" width="24" height="20" rx="3" /><line x1="16" y1="13" x2="16" y2="23" /><line x1="11" y1="18" x2="21" y2="18" /><path d="M11 8V6a3 3 0 0 1 6 0v2" /></svg>;

    if (['elevator', 'lift', 'accessible lift'].includes(key))
        return <svg {...s}><rect x="5" y="2" width="22" height="28" rx="3" /><line x1="16" y1="2" x2="16" y2="30" /><path d="M10 10l-3-4-3 4" /><path d="M22 22l3 4 3-4" /></svg>;

    if (['luggage storage', 'luggage room', 'left luggage', 'baggage storage'].includes(key))
        return <svg {...s}><rect x="6" y="10" width="20" height="18" rx="3" /><path d="M11 10V7a3 3 0 0 1 6 0v3" /><line x1="16" y1="14" x2="16" y2="24" /><line x1="11" y1="19" x2="21" y2="19" /></svg>;

    if (['pet friendly', 'pets allowed', 'pets welcome', 'dog friendly'].includes(key))
        return <svg {...s}><ellipse cx="8" cy="10" rx="3" ry="4" /><ellipse cx="24" cy="10" rx="3" ry="4" /><ellipse cx="4" cy="20" rx="3" ry="4" /><ellipse cx="28" cy="20" rx="3" ry="4" /><path d="M16 14c-5 0-9 3-9 8 0 3 4 6 9 6s9-3 9-6c0-5-4-8-9-8z" /></svg>;

    if (['fireplace', 'fire place', 'indoor fireplace', 'wood-burning fireplace'].includes(key))
        return <svg {...s}><path d="M6 28V10a10 10 0 0 1 20 0v18" /><path d="M4 28h24" /><path d="M16 22c-3 0-5-2-5-5 0-4 5-7 5-7s5 3 5 7c0 3-2 5-5 5z" /></svg>;

    // ── Default (unknown amenity) ──────────────────────────────────────
    return (
        <svg {...s}>
            <circle cx="16" cy="16" r="10" />
            <line x1="16" y1="10" x2="16" y2="22" />
            <line x1="10" y1="16" x2="22" y2="16" />
        </svg>
    );
};

export default AmenityIcon;
