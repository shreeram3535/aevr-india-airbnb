import { useState } from 'react';
import { Link } from 'react-router-dom';

interface FAQ {
  question: string;
  answer: string;
}

interface Section {
  id: number;
  title: string;
  emoji: string;
  description: string;
  faqs: FAQ[];
}

const SECTIONS_DATA: Section[] = [
  {
    id: 1,
    title: 'Booking Support',
    emoji: '🏡',
    description: 'Reservations, check-in, modifications',
    faqs: [
      {
        question: 'How do I make a reservation for a luxury villa?',
        answer: 'Reservations can be made directly through our website by selecting your desired villa, dates, and number of guests. Our curation team will verify the availability and send you a confirmation within 2 hours. If you require personalized concierge planning, you can contact our luxury travel advisors via WhatsApp.'
      },
      {
        question: 'What is the check-in process for Aevr stays?',
        answer: 'Every Aevr stay includes a personalized check-in experience. A dedicated villa host will meet you at the property, give you a detailed tour, hand over the keys, and help you get settled. Please share your expected arrival time at least 24 hours in advance to coordinate.'
      },
      {
        question: 'Can I modify my booking dates after confirmation?',
        answer: "Booking modifications are subject to availability and the specific villa's hosting policies. To request a modification, navigate to your Trips page or contact our support team. Additional charges or rate differences may apply depending on the seasonal rates of the new dates."
      }
    ]
  },
  {
    id: 2,
    title: 'Payments & Refunds',
    emoji: '💳',
    description: 'UPI, cards, refund timeline',
    faqs: [
      {
        question: 'Which payment methods are accepted on Aevr?',
        answer: 'We accept all major credit/debit cards (Visa, Mastercard, American Express), Net Banking, and secure UPI transfers. For high-value transactions, bank transfers (NEFT/IMPS) can also be arranged via our concierge service.'
      },
      {
        question: 'What is the timeline for processing refunds?',
        answer: "Once a refund is approved, it is initiated immediately. UPI refunds generally reflect within 24 to 48 hours. Card and Net Banking refunds may take 5 to 7 business days to credit back to your account, depending on your bank's billing cycle."
      },
      {
        question: 'Are there any hidden fees in the billing?',
        answer: 'No, Aevr believes in absolute transparency. The price shown at the time of booking includes the villa rental, standard housekeeping, and service fees. Any extra services (such as private chef, airport transfers, or custom decorations) will be billed separately and clearly.'
      }
    ]
  },
  {
    id: 3,
    title: 'Property Owners',
    emoji: '🔑',
    description: 'listing, payouts, hosting fees',
    faqs: [
      {
        question: 'How do I list my property on Aevr?',
        answer: "Head to the 'Host your home' page, fill in your villa details, upload photos, and submit. Our team will review and approve if it meets Aevr's luxury standards. Once approved, your property goes live automatically."
      },
      {
        question: 'What is the payout schedule for hosts?',
        answer: "Payouts are processed 24 hours after the guest's scheduled check-in time. This holds security for both guests and hosts. Funds are transferred directly to your registered bank account and typically settle within 1-2 business days."
      }
    ]
  },
  {
    id: 4,
    title: 'Account & Security',
    emoji: '🔐',
    description: 'password reset, phone change, compromised account',
    faqs: [
      {
        question: 'How do I reset my account password?',
        answer: "To reset your password, go to the Auth page and click 'Forgot Password'. Enter your registered email address, and we will send you a secure link to reset it. For security reasons, the link expires in 30 minutes."
      },
      {
        question: 'Can I change my registered phone number?',
        answer: 'Yes. You can update your phone number under your Profile Settings. For security, you will be required to verify both your old number and the new number via a one-time passcode (OTP).'
      },
      {
        question: 'What should I do if I suspect my account is compromised?',
        answer: 'If you notice unauthorized changes or bookings, please contact us immediately via support@aevr.in or call our support line. We will temporarily freeze your account, investigate the activity, and guide you through the recovery process safely.'
      }
    ]
  },
  {
    id: 5,
    title: 'Policies & Legal',
    emoji: '📋',
    description: 'cancellation policy, T&C, DPDP Act 2023',
    faqs: [
      {
        question: "What is Aevr's standard cancellation policy?",
        answer: 'Our general policy offers a full refund for cancellations made at least 14 days before check-in. Cancellations made between 7 and 14 days prior receive a 50% refund. No refunds are provided for cancellations within 7 days of check-in, though exceptions apply under extenuating circumstances.'
      },
      {
        question: 'Where can I read the Terms & Conditions?',
        answer: "You can access our comprehensive Terms & Conditions anytime by clicking the 'Terms' link in the footer of our website. These terms govern guest obligations, booking agreements, and host responsibilities."
      },
      {
        question: 'How does Aevr comply with the DPDP Act 2023?',
        answer: "Aevr is fully compliant with India's Digital Personal Data Protection (DPDP) Act 2023. We collect and process personal data only with your explicit consent, use it strictly for bookings and verification, and respect your rights to access, correct, or erase your personal information."
      }
    ]
  },
  {
    id: 6,
    title: 'Safety & Trust',
    emoji: '🛡️',
    description: 'property verification, guest ID, listing mismatch',
    faqs: [
      {
        question: 'How does Aevr verify properties?',
        answer: 'Every property listed on Aevr is reviewed and verified by our team to ensure the details, photos, and amenities match what guests see online.'
      },
      {
        question: 'Why do I need to submit a guest ID before check-in?',
        answer: 'To comply with local regulations and ensure safety, all guests must submit a government-issued photo ID (Aadhaar, Passport, or driving license) prior to check-in. Aevr stores these IDs in encrypted servers securely.'
      },
      {
        question: 'What should I do if the villa does not match the listing?',
        answer: 'If you arrive and find a significant mismatch in amenities or quality, notify us within 2 hours of check-in. We will investigate immediately and either relocate you to a comparable villa or issue a full refund.'
      }
    ]
  },
  {
    id: 7,
    title: 'FAQs',
    emoji: '❓',
    description: 'general questions about Aevr',
    faqs: [
      {
        question: 'What makes Aevr different from other booking platforms?',
        answer: 'Aevr is dedicated exclusively to handpicked, ultra-luxury villas and stays. We do not mass-list. Every villa is vetted for premium aesthetics, luxury hospitality, and has a dedicated concierge to elevate your vacation experience.'
      },
      {
        question: 'Is housekeeping included in my stay?',
        answer: 'Yes, daily housekeeping is included in the booking rate for all Aevr villas. Our staff maintains the highest standards of cleanliness and hygiene, scheduling services at your convenience to respect your privacy.'
      },
      {
        question: 'Are concierge services available?',
        answer: 'Concierge services vary by property. Some villas offer add-ons like private chefs, transport, or local experiences. Check the property listing or contact the host directly.'
      }
    ]
  },
  {
    id: 8,
    title: 'Report an Issue',
    emoji: '🚨',
    description: 'safety, fake listings, bad host/guest',
    faqs: [
      {
        question: 'How do I report a safety concern during my stay?',
        answer: 'For immediate safety concerns or emergencies, contact our 24/7 support line or use the WhatsApp support button in the app. If there is a medical or law enforcement emergency, please contact local emergency services immediately.'
      },
      {
        question: 'What should I do if I suspect a listing is fake?',
        answer: "If you find a listing that uses copyrighted images or seems suspicious, click 'Report Listing' on the property page or email support@aevr.in. Our moderation team will audit the listing within 12 hours."
      },
      {
        question: 'How do I report a bad hosting or guest experience?',
        answer: 'You can submit feedback through the reviews section after your stay. For serious issues, please submit a detailed report to support@aevr.in. We take host and guest conduct very seriously and suspend accounts that violate our code of conduct.'
      }
    ]
  },
  {
    id: 9,
    title: 'Contact Us',
    emoji: '💬',
    description: 'WhatsApp +91 88908 07482, support@aevr.in, @aevrindia',
    faqs: [
      {
        question: 'How can I contact Aevr on WhatsApp?',
        answer: 'You can chat with our support and concierge team directly on WhatsApp at https://wa.me/918890807482. We are active 24/7 to assist you with booking requests, inquiries, and on-stay support.'
      },
      {
        question: "What is Aevr's official email address?",
        answer: 'For official support, partnerships, and general queries, you can reach out to us at support@aevr.in. We aim to respond to all emails within 2 to 4 hours.'
      },
      {
        question: 'Where can I follow Aevr on social media?',
        answer: 'Stay updated with our latest luxury property launches, travel guides, and exclusive offers by following our official Instagram handle: @aevrindia (https://instagram.com/aevrindia).'
      }
    ]
  }
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [expandedFaqs, setExpandedFaqs] = useState<{ [key: string]: boolean }>({});
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter sections and FAQs based on search input
  const filteredSections = SECTIONS_DATA.filter((section) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const matchesTitle = section.title.toLowerCase().includes(query);
    const matchesDesc = section.description.toLowerCase().includes(query);
    const matchesFaqs = section.faqs.some(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    );

    return matchesTitle || matchesDesc || matchesFaqs;
  });

  const toggleFaq = (sectionId: number, faqIndex: number) => {
    const key = `${sectionId}-${faqIndex}`;
    setExpandedFaqs((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleBackToGrid = () => {
    setActiveSection(null);
    setExpandedFaqs({});
  };

  const selectSection = (section: Section) => {
    setActiveSection(section);
    // Pre-expand FAQs that match the current search query, if any
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const newExpanded: { [key: string]: boolean } = {};
      section.faqs.forEach((faq, index) => {
        if (
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query)
        ) {
          newExpanded[`${section.id}-${index}`] = true;
        }
      });
      setExpandedFaqs(newExpanded);
    } else {
      setExpandedFaqs({});
    }
  };

  // Custom SVGs for section cards
  const renderSectionIcon = (id: number, size = 24) => {
    const strokeColor = '#2E3A43';
    switch (id) {
      case 1: // Booking Support
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        );
      case 2: // Payments & Refunds
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width={22} height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
            <line x1="5" y1="15" x2="9" y2="15" />
          </svg>
        );
      case 3: // Property Owners
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 1.5 1.5M15.5 7.5 14 6" />
          </svg>
        );
      case 4: // Account & Security
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
      case 5: // Policies & Legal
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        );
      case 6: // Safety & Trust
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case 7: // FAQs
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 8: // Report an Issue
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 9: // Contact Us
        return (
          <svg viewBox="0 0 24 24" width={size} height={size} stroke={strokeColor} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
        backgroundColor: '#FCFAF7', // Matches AEVR body bg
        color: '#282B2B',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}
    >
      {/* HEADER */}
      <header
        style={{
          backgroundColor: '#2E3A43', // Dark slate blue matching the screenshot
          padding: '54px 24px',
          color: '#FFFFFF',
          textAlign: 'center',
          boxShadow: '0 4px 20px rgba(40, 43, 43, 0.08)'
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 18px',
              borderRadius: '50px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              marginBottom: '24px',
              textDecoration: 'none',
              transition: 'all 0.2s',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              stroke="#B88A5A"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span
              style={{
                fontWeight: 'bold',
                letterSpacing: '0.15em',
                fontSize: '13px',
                color: '#FFFFFF'
              }}
            >
              AEVR
            </span>
            <span
              style={{
                fontSize: '12px',
                color: '#CBD5E1',
                borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                paddingLeft: '10px',
                fontStyle: 'italic'
              }}
            >
              Support Center
            </span>
          </Link>

          <h1
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '42px',
              fontWeight: 'normal',
              margin: '0 0 14px 0',
              letterSpacing: '-0.01em',
              color: '#FFFFFF'
            }}
          >
            How can we help you?
          </h1>
          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '17px',
              color: '#CBD5E1',
              margin: '0 0 36px 0',
              fontStyle: 'italic',
              fontWeight: '300',
              letterSpacing: '0.02em'
            }}
          >
            Stays that stay with you — and support that stays with you too.
          </p>

          {/* Live Search Bar */}
          <div
            style={{
              position: 'relative',
              maxWidth: '560px',
              margin: '0 auto'
            }}
          >
            <input
              type="text"
              placeholder="Search sections, questions, policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              style={{
                width: '100%',
                padding: '16px 20px 16px 48px',
                borderRadius: '6px',
                border: 'none',
                outline: 'none',
                fontFamily: "'Outfit', -apple-system, sans-serif",
                fontSize: '16px',
                color: '#282B2B',
                boxShadow: isSearchFocused
                  ? '0 0 0 3px rgba(184, 138, 90, 0.4), 0 8px 30px rgba(0, 0, 0, 0.15)'
                  : '0 4px 15px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
            />
            {/* Search Glass SVG */}
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              stroke="#2E3A43"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: '18px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.7
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontFamily: 'sans-serif',
                  padding: '4px'
                }}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main
        style={{
          flex: 1,
          maxWidth: '1000px',
          width: '100%',
          margin: '0 auto',
          padding: '54px 24px',
          boxSizing: 'border-box'
        }}
      >
        {!activeSection ? (
          /* GRID VIEW */
          <div>
            {filteredSections.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
                  gap: '36px 28px'
                }}
              >
                {filteredSections.map((section) => {
                  const isHovered = hoveredCard === section.id;
                  return (
                    <div
                      key={section.id}
                      onClick={() => selectSection(section)}
                      onMouseEnter={() => setHoveredCard(section.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #2E3A43', // Solid border
                        borderRadius: '4px', // Mild rounding matching screenshot
                        padding: '28px 24px',
                        cursor: 'pointer',
                        transform: isHovered ? 'translate(3px, -3px)' : 'none',
                        boxShadow: isHovered
                          ? '-9px 9px 0px #2E3A43' // Solid offset shadow bottom-left
                          : '-6px 6px 0px #2E3A43',
                        transition: 'all 0.2s ease-in-out',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: '190px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '14px'
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: '#E2ECF5',
                              padding: '8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {renderSectionIcon(section.id)}
                          </div>
                          <h2
                            style={{
                              fontFamily: "'Playfair Display', Georgia, serif",
                              fontSize: '20px',
                              fontWeight: 'bold',
                              margin: 0,
                              color: '#2E3A43'
                            }}
                          >
                            {section.title}
                          </h2>
                        </div>
                        <p
                          style={{
                            fontSize: '14px',
                            color: '#4A5568',
                            lineHeight: '1.6',
                            margin: '0 0 16px 0',
                            fontFamily: "'Outfit', -apple-system, sans-serif"
                          }}
                        >
                          {section.description}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '14px',
                          color: '#2E3A43',
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontFamily: "'Outfit', -apple-system, sans-serif"
                        }}
                      >
                        View answers &rarr;
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* NO RESULTS STATE */
              <div
                style={{
                  textAlign: 'center',
                  padding: '64px 32px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #2E3A43',
                  borderRadius: '4px',
                  boxShadow: '-6px 6px 0px #2E3A43',
                  marginTop: '16px'
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="48"
                  height="48"
                  stroke="#2E3A43"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ marginBottom: '20px' }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <h3
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#2E3A43',
                    margin: '0 0 12px 0'
                  }}
                >
                  No results found
                </h3>
                <p
                  style={{
                    color: '#4A5568',
                    fontSize: '15px',
                    lineHeight: '1.6',
                    maxWidth: '440px',
                    margin: '0 auto 24px auto',
                    fontFamily: "'Outfit', -apple-system, sans-serif"
                  }}
                >
                  We couldn't find any articles or guidelines matching "{searchQuery}".
                </p>
                <button
                  onClick={() => {
                    const contact = SECTIONS_DATA.find((s) => s.id === 9);
                    if (contact) {
                      selectSection(contact);
                    }
                  }}
                  style={{
                    backgroundColor: '#2E3A43',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '12px 24px',
                    fontSize: '15px',
                    fontFamily: "'Outfit', -apple-system, sans-serif",
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(46, 74, 97, 0.15)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4A6B8A')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2E3A43')}
                >
                  Contact Our Concierge Support &rarr;
                </button>
              </div>
            )}
          </div>
        ) : (
          /* DETAIL VIEW */
          <div>
            {/* Back Button */}
            <button
              onClick={handleBackToGrid}
              style={{
                background: 'none',
                border: 'none',
                color: '#4A6B8A',
                cursor: 'pointer',
                fontFamily: "'Outfit', -apple-system, sans-serif",
                fontSize: '15px',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 0',
                marginBottom: '28px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#2E3A43')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#4A6B8A')}
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Help Center
            </button>

            {/* Section Banner Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '16px',
                borderBottom: '1px solid #D6E2EC',
                paddingBottom: '20px'
              }}
            >
              <div
                style={{
                  backgroundColor: '#E2ECF5',
                  padding: '12px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {renderSectionIcon(activeSection.id, 32)}
              </div>
              <div>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '28px',
                    fontWeight: 'bold',
                    margin: 0,
                    color: '#2E3A43'
                  }}
                >
                  {activeSection.title}
                </h2>
                <p
                  style={{
                    margin: '6px 0 0 0',
                    color: '#4A6B8A',
                    fontSize: '15px',
                    fontStyle: 'italic',
                    fontFamily: "'Playfair Display', Georgia, serif"
                  }}
                >
                  {activeSection.description}
                </p>
              </div>
            </div>

            {/* Special Contact Card for Section 9 (Contact Us) */}
            {activeSection.id === 9 && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D6E2EC',
                  borderRadius: '6px',
                  padding: '24px',
                  marginBottom: '28px',
                  boxShadow: '0 4px 12px rgba(46, 74, 97, 0.03)'
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 'normal',
                    color: '#2E4A61',
                    margin: '0 0 16px 0',
                    borderBottom: '1px solid #F4F7FA',
                    paddingBottom: '8px'
                  }}
                >
                  Direct Support Channels
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px'
                  }}
                >
                  <a
                    href="https://wa.me/918890807482"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: 'none',
                      color: '#2E4A61',
                      padding: '16px',
                      borderRadius: '6px',
                      border: '1px solid #D6E2EC',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: '#F4F7FA',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#4A6B8A')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#D6E2EC')}
                  >
                    {/* WhatsApp Icon */}
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="#25D366" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <div>
                      <div style={{ fontSize: '12px', color: '#4A6B8A' }}>WhatsApp</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>+91 88908 07482</div>
                    </div>
                  </a>

                  <a
                    href="mailto:support@aevr.in"
                    style={{
                      textDecoration: 'none',
                      color: '#2E4A61',
                      padding: '16px',
                      borderRadius: '6px',
                      border: '1px solid #D6E2EC',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: '#F4F7FA',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#4A6B8A')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#D6E2EC')}
                  >
                    {/* Mail Icon */}
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="#4A6B8A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <div>
                      <div style={{ fontSize: '12px', color: '#4A6B8A' }}>Email Support</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>support@aevr.in</div>
                    </div>
                  </a>

                  <a
                    href="https://instagram.com/aevrindia"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: 'none',
                      color: '#2E4A61',
                      padding: '16px',
                      borderRadius: '6px',
                      border: '1px solid #D6E2EC',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: '#F4F7FA',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#4A6B8A')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#D6E2EC')}
                  >
                    {/* Instagram Icon */}
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="#E1306C" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                    <div>
                      <div style={{ fontSize: '12px', color: '#4A6B8A' }}>Instagram</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>@aevrindia</div>
                    </div>
                  </a>

                  <a
                    href="https://www.aevr.in"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: 'none',
                      color: '#2E4A61',
                      padding: '16px',
                      borderRadius: '6px',
                      border: '1px solid #D6E2EC',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: '#F4F7FA',
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#4A6B8A')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#D6E2EC')}
                  >
                    {/* Globe Icon */}
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="#4A6B8A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <div>
                      <div style={{ fontSize: '12px', color: '#4A6B8A' }}>Website</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>www.aevr.in</div>
                    </div>
                  </a>
                </div>
              </div>
            )}

            {/* Accordion List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px' }}>
              {activeSection.faqs.map((faq, index) => {
                const isExpanded = !!expandedFaqs[`${activeSection.id}-${index}`];
                return (
                  <div
                    key={index}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D6E2EC',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(46, 74, 97, 0.02)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Header trigger */}
                    <button
                      onClick={() => toggleFaq(activeSection.id, index)}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        color: '#2E4A61',
                        fontFamily: 'Georgia, serif',
                        outline: 'none'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '17px',
                          fontWeight: 'normal',
                          lineHeight: '1.4',
                          paddingRight: '16px'
                        }}
                      >
                        {faq.question}
                      </span>
                      <span
                        style={{
                          fontSize: '22px',
                          color: '#4A6B8A',
                          lineHeight: '1',
                          userSelect: 'none',
                          fontWeight: '300'
                        }}
                      >
                        {isExpanded ? '\u2212' : '+'}
                      </span>
                    </button>

                    {/* Collapsible Answer */}
                    <div
                      style={{
                        maxHeight: isExpanded ? '400px' : '0',
                        opacity: isExpanded ? 1 : 0,
                        transition: 'all 0.3s cubic-bezier(0, 1, 0, 1)',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          padding: '0 24px 24px 24px',
                          borderTop: '1px solid #F4F7FA',
                          color: '#3C546C',
                          fontSize: '15px',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* STILL NEED HELP BANNER */}
            <div
              style={{
                backgroundColor: '#2E4A61',
                borderRadius: '8px',
                padding: '40px 32px',
                color: '#FFFFFF',
                textAlign: 'center',
                boxShadow: '0 8px 30px rgba(46, 74, 97, 0.15)',
                marginBottom: '20px'
              }}
            >
              <h3
                style={{
                  fontSize: '24px',
                  fontWeight: 'normal',
                  margin: '0 0 12px 0',
                  letterSpacing: '-0.01em'
                }}
              >
                Still Need Help?
              </h3>
              <p
                style={{
                  fontSize: '15px',
                  color: '#A8C4D8',
                  margin: '0 0 28px 0',
                  fontStyle: 'italic',
                  fontWeight: '300'
                }}
              >
                Our 24/7 dedicated luxury concierge and support advisors are always at your service.
              </p>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <a
                  href="https://wa.me/918890807482"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#2E4A61',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    padding: '12px 28px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#E2ECF5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="#25D366" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  Chat on WhatsApp
                </a>

                <a
                  href="mailto:support@aevr.in"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    border: '2px solid #FFFFFF',
                    padding: '10px 26px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  Email support@aevr.in
                </a>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER STRIP */}
      <footer
        style={{
          borderTop: '1px solid #D6E2EC',
          backgroundColor: '#FFFFFF',
          padding: '24px 20px',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '14px',
            color: '#4A6B8A'
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} AEVR India. Stays That Stay With You.
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link
              to="/privacy-policy"
              style={{
                color: '#4A6B8A',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#2E4A61')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#4A6B8A')}
            >
              Privacy Policy
            </Link>
            <a
              href="#"
              style={{
                color: '#4A6B8A',
                textDecoration: 'none',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#2E4A61')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#4A6B8A')}
            >
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
