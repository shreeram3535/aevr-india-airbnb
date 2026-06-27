import React from 'react';
import { Link } from 'react-router-dom';
import styles from './PrivacyPolicy.module.css';

export const PrivacyPolicy: React.FC = () => {
    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <Link to="/" className={styles.backLink}>
                    ← Back to Home
                </Link>

                <h1 className={styles.title}>PRIVACY POLICY</h1>
                <p className={styles.effectiveDate}>Effective Date: 26/06/2026</p>

                <div className={styles.introSection}>
                    <p>
                        AEVR India ("Company," "AEVR," "we," "our," or "us") is committed to protecting the privacy, confidentiality, and security of the information entrusted to us by our users, guests, property partners, and visitors. This Privacy Policy describes the manner in which AEVR India collects, processes, stores, uses, and safeguards personal information obtained through its website, mobile applications, digital platforms, and associated services.
                    </p>
                    <p>
                        By accessing or using the services provided by AEVR India, users acknowledge that they have read, understood, and consented to the practices described in this Privacy Policy.
                    </p>
                </div>

                <div className={styles.sectionsContainer}>
                    <section className={styles.section}>
                        <h2>1. Collection of Information</h2>
                        <p>
                            AEVR India may collect personal and non-personal information from users during account registration, booking activities, property onboarding, customer support interactions, marketing communications, and general use of our platform. Such information may include, but is not limited to, the user's name, contact details, email address, mobile number, address, booking information, payment details, identity verification information where required, and any information voluntarily submitted by the user.
                        </p>
                        <p>
                            In addition to personal information, AEVR India may automatically collect certain technical information, including IP addresses, browser type, operating system, device identifiers, usage statistics, cookies, and website interaction data to improve user experience and maintain platform security.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>2. Purpose of Information Processing</h2>
                        <p>
                            The information collected by AEVR India is used for the purpose of facilitating reservations, managing customer accounts, providing customer support, verifying user identity, processing transactions, communicating booking information, improving services, conducting business analytics, preventing fraud, complying with legal obligations, and delivering relevant promotional communications.
                        </p>
                        <p>
                            The processing of personal information is undertaken only to the extent necessary for legitimate business purposes and in accordance with applicable laws and regulations.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>3. Disclosure and Sharing of Information</h2>
                        <p>
                            AEVR India may share user information with property partners, payment service providers, technology vendors, operational service providers, and authorized business partners solely to facilitate services requested by the user. Information may also be disclosed to governmental authorities, regulatory bodies, courts, or law enforcement agencies where such disclosure is required under applicable laws.
                        </p>
                        <p>
                            AEVR India does not sell, rent, or commercially distribute personal information to unrelated third parties.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>4. Data Security</h2>
                        <p>
                            AEVR India maintains reasonable administrative, technical, and organizational safeguards to protect personal information against unauthorized access, misuse, alteration, disclosure, or destruction. Security measures may include encrypted communications, restricted access controls, secure servers, and internal data protection procedures.
                        </p>
                        <p>
                            While every reasonable effort is made to protect user information, no method of transmission over the internet or electronic storage can be guaranteed to be entirely secure. Accordingly, users acknowledge that information transmission is undertaken at their own risk.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>5. Cookies and Similar Technologies</h2>
                        <p>
                            AEVR India may use cookies, web beacons, and similar technologies to improve platform functionality, analyse user behaviour, personalize content, and enhance user experience. Users may choose to disable cookies through their browser settings; however, certain functionalities of the platform may be affected.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>6. Data Retention</h2>
                        <p>
                            Personal information shall be retained only for as long as necessary to fulfill the purposes for which it was collected, to comply with applicable legal obligations, resolve disputes, enforce agreements, and maintain business records. Upon expiration of the applicable retention period, information may be securely deleted or anonymized.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>7. User Rights</h2>
                        <p>
                            Users may request access to their personal information, seek correction of inaccurate information, request deletion of data where legally permissible, or withdraw consent for certain communications. Such requests may be submitted through the official contact channels of AEVR India and shall be addressed in accordance with applicable legal requirements.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>8. Third-Party Websites</h2>
                        <p>
                            The AEVR India platform may contain links to third-party websites or services that operate independently of the Company. AEVR India shall not be responsible for the privacy practices, content, or policies of such external websites, and users are encouraged to review their respective privacy policies.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>9. Children's Privacy</h2>
                        <p>
                            The services offered by AEVR India are not directed toward individuals below the age of eighteen years. The Company does not knowingly collect personal information from minors without appropriate parental or legal guardian consent.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>10. International Data Transfers</h2>
                        <p>
                            In certain circumstances, information may be processed or stored by service providers located outside India. AEVR India shall take reasonable measures to ensure that such transfers are conducted in accordance with applicable legal and data protection requirements.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>11. Limitation of Liability</h2>
                        <p>
                            AEVR India shall not be held liable for unauthorized access, data breaches, or disclosure of information resulting from circumstances beyond its reasonable control, including cyberattacks, technical failures, force majeure events, or actions attributable to third parties.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>12. Amendments to this Policy</h2>
                        <p>
                            AEVR India reserves the right to modify, revise, or update this Privacy Policy at any time in response to legal, operational, or business requirements. Any amendments shall become effective upon publication on the official website or digital platforms of the Company.
                        </p>
                    </section>

                    <section className={styles.section}>
                        <h2>13. Contact Information</h2>
                        <p>
                            Any questions, concerns, or requests relating to this Privacy Policy may be addressed to:
                        </p>
                        <div className={styles.contactCard}>
                            <strong>AEVR India</strong><br />
                            Email: <a href="mailto:privacy@aevr.in">privacy@aevr.in</a><br />
                            Support: <a href="mailto:support@aevr.in">support@aevr.in</a><br />
                            Website: <a href="https://www.aevr.in" target="_blank" rel="noreferrer">www.aevr.in</a>
                        </div>
                    </section>
                </div>

                <div className={styles.consentFooter}>
                    By continuing to access or use the services of AEVR India, users acknowledge and agree to the terms set forth in this Privacy Policy.
                </div>
            </div>
        </div>
    );
};
