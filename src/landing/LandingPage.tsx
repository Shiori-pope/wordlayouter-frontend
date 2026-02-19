import * as React from 'react';
import {
    Sparkle24Filled,
    DocumentEdit24Regular,
    Table24Regular,
    Beaker24Regular,
    ArrowDownload24Regular,
    ArrowRight24Regular,
    Share24Regular
} from '@fluentui/react-icons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { Helmet } from 'react-helmet-async';

const LandingPage: React.FC = () => {
    const { t } = useTranslation();

    // Structured data for SEO
    React.useEffect(() => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.text = JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Word Layouter",
            "description": t('hero.subtitle'),
            "url": "https://wordlayouter.top",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Windows, macOS",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            },
            "author": {
                "@type": "Organization",
                "name": "Word Layouter"
            }
        });
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(script);
        };
    }, [t]);

    return (
        <>
            <Helmet>
                <title>{t('hero.title')} | Word Layouter</title>
                <meta name="description" content={t('hero.subtitle')} />
                <meta property="og:title" content={t('hero.title')} />
                <meta property="og:description" content={t('hero.subtitle')} />
                <meta property="twitter:title" content={t('hero.title')} />
                <meta property="twitter:description" content={t('hero.subtitle')} />
            </Helmet>
            <div className="landing-container">
            <LanguageSwitcher />
            {/* Background Gradients */}
            <div className="fixed inset-0 -z-10 bg-[#050505] overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-[120px] animate-pulse-slow"></div>
            </div>

            {/* Navigation */}
            <nav style={{
                position: 'fixed', top: 0, width: '100%', zIndex: 100,
                height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div className="glass-card" style={{
                    width: '90%', maxWidth: '1200px', height: '56px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 24px', margin: '0 20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Sparkle24Filled style={{ color: '#fff', width: 20, height: 20 }} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>Word Layouter</span>
                    </div>
                    <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                        <a href="#features" className="nav-link">{t('nav.features')}</a>
                        <a href="#install" className="nav-link">{t('nav.install')}</a>
                        <a href="https://github.com" className="nav-link"><Share24Regular /></a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section style={{
                paddingTop: '160px', paddingBottom: '100px',
                textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
                <h1 className="hero-title" style={{
                    fontSize: '4.5rem', lineHeight: 1.1, maxWidth: '900px',
                    marginBottom: '24px', letterSpacing: '-2px'
                }}>
                    {t('hero.title')}
                </h1>
                <p style={{
                    color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '600px',
                    marginBottom: '40px'
                }}>
                    {t('hero.subtitle')}
                </p>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <a href="#install" className="btn-primary" style={{ fontSize: '1.1rem', padding: '16px 40px' }}>
                        {t('hero.button')} <ArrowRight24Regular style={{ marginLeft: 8 }} />
                    </a>
                    <a href="https://www.douyin.com/user/self?from_tab_name=main&modal_id=7605269720782114089" target="_blank" rel="noopener noreferrer" className="glass-card" style={{
                        color: '#fff', padding: '16px 40px', fontSize: '1.1rem',
                        cursor: 'pointer', transition: 'all 0.3s', display: 'inline-block', textDecoration: 'none'
                    }}>
                        {t('hero.videoIntro')}
                    </a>
                </div>

                {/* Floating Preview Image / Icon */}
                <div style={{ marginTop: '80px', position: 'relative' }}>
                    <div className="glass-card animate-float" style={{
                        width: '800px', height: '450px',
                        background: 'rgba(255,255,255,0.02)',
                        overflow: 'hidden',
                        padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <img
                            src="/assets/preview.png"
                            alt={t('hero.previewAlt')}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <div style={{
                        position: 'absolute', top: '-40px', left: '-40px',
                        width: 80, height: 80, borderRadius: 20, background: '#4f46e5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 2
                    }}>
                        <DocumentEdit24Regular style={{ width: 40, height: 40 }} />
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" style={{ padding: '100px 20px', maxWidth: '1200px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '60px' }}>{t('features.title')}</h2>
                <div className="feature-grid">
                    <div className="glass-card feature-item">
                        <div className="feature-icon"><DocumentEdit24Regular /></div>
                        <h3>{t('features.intelligentWriting.title')}</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                            {t('features.intelligentWriting.desc')}
                        </p>
                    </div>
                    <div className="glass-card feature-item">
                        <div className="feature-icon"><Table24Regular /></div>
                        <h3>{t('features.nativeLayout.title')}</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                            {t('features.nativeLayout.desc')}
                        </p>
                    </div>
                    <div className="glass-card feature-item">
                        <div className="feature-icon"><Beaker24Regular /></div>
                        <h3>{t('features.formulaProcessing.title')}</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                            {t('features.formulaProcessing.desc')}
                        </p>
                    </div>
                </div>
            </section>

            {/* Installation Section */}
            <section id="install" style={{ padding: '100px 20px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '24px' }}>{t('install.title')}</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>{t('install.description')}</p>

                    <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                            <div>
                                <h4 style={{ marginBottom: '4px' }}>{t('install.steps.1.title')}</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('install.steps.1.desc')}</p>
                            </div>
                            <a href="/assets/installer.zip" download className="btn-primary" style={{ marginLeft: 'auto' }}>
                                <ArrowDownload24Regular /> {t('install.download')}
                            </a>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                            <div>
                                <h4 style={{ marginBottom: '4px' }}>{t('install.steps.2.title')}</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('install.steps.2.desc')}</p>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
                            <div>
                                <h4 style={{ marginBottom: '4px' }}>{t('install.steps.3.title')}</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('install.steps.3.desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '60px 20px', textAlign: 'center', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {t('footer')}
                </p>
            </footer>
        </div>
        </>
    );
};

export default LandingPage;
