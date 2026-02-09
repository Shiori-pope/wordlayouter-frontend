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

const LandingPage: React.FC = () => {
    return (
        <div className="landing-container">
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
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.5px' }}>Word AI</span>
                    </div>
                    <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
                        <a href="#features" className="nav-link">功能特性</a>
                        <a href="#install" className="nav-link">安装教程</a>
                        <a href="https://github.com" className="nav-link"><Share24Regular /></a>
                        <a href="/taskpane.html" className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.9rem' }}>立即体验</a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section style={{
                paddingTop: '160px', paddingBottom: '100px',
                textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center'
            }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '6px 16px', borderRadius: '100px', background: 'rgba(79, 70, 229, 0.1)',
                    border: '1px solid rgba(79, 70, 229, 0.2)', color: '#818cf8',
                    fontSize: '0.9rem', fontWeight: 600, marginBottom: '32px'
                }}>
                    <span className="animate-pulse">✨</span> 基于 DeepSeek R1 强力驱动
                </div>
                <h1 className="hero-title" style={{
                    fontSize: '4.5rem', lineHeight: 1.1, maxWidth: '900px',
                    marginBottom: '24px', letterSpacing: '-2px'
                }}>
                    让您的文字工作<br />
                    <span className="gradient-text">更智慧，更优雅</span>
                </h1>
                <p style={{
                    color: 'var(--text-muted)', fontSize: '1.25rem', maxWidth: '600px',
                    marginBottom: '40px'
                }}>
                    Word Layouter 是一款为 Office 用户量身定制的智能插件，集成了最先进的 AI 模型，助您一键润色、智能排版。
                </p>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <a href="#install" className="btn-primary" style={{ fontSize: '1.1rem', padding: '16px 40px' }}>
                        添加至 Word <ArrowRight24Regular style={{ marginLeft: 8 }} />
                    </a>
                    <button className="glass-card" style={{
                        color: '#fff', padding: '16px 40px', fontSize: '1.1rem',
                        cursor: 'pointer', transition: 'all 0.3s'
                    }}>
                        观看视频演练
                    </button>
                </div>

                {/* Floating Preview Image / Icon */}
                <div style={{ marginTop: '80px', position: 'relative' }}>
                    <div className="glass-card animate-float" style={{
                        width: '800px', height: '450px', background: 'rgba(255,255,255,0.02)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{ opacity: 0.3, textAlign: 'center' }}>
                            <Sparkle24Filled style={{ width: 120, height: 120, marginBottom: 20 }} />
                            <p>AI 排版引擎预览界面</p>
                        </div>
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
                <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '60px' }}>核心功能</h2>
                <div className="feature-grid">
                    <div className="glass-card feature-item">
                        <div className="feature-icon"><DocumentEdit24Regular /></div>
                        <h3>智能写作与润色</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                            基于上下文进行一键扩写、缩写、润色，支持学术、职场、文学等多种语气切换。
                        </p>
                    </div>
                    <div className="glass-card feature-item">
                        <div className="feature-icon"><Table24Regular /></div>
                        <h3>原生文档排版</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                            支持 HTML 与 Word 样式的精准转换，一键生成符合规范的标题、表格和列表。
                        </p>
                    </div>
                    <div className="glass-card feature-item">
                        <div className="feature-icon"><Beaker24Regular /></div>
                        <h3>数学公式处理</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>
                            自动识别 LaTeX 公式并转换为 Word 原生可编辑公式，论文辅助工作的完美搭档。
                        </p>
                    </div>
                </div>
            </section>

            {/* Installation Section */}
            <section id="install" style={{ padding: '100px 20px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '24px' }}>如何开始？</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '40px' }}>简单几步，即可在您的 Word 中开启智能创作之旅。</p>

                    <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                            <div>
                                <h4 style={{ marginBottom: '4px' }}>下载 manifest.xml</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>点击右侧按钮下载插件描述文件。</p>
                            </div>
                            <a href="/manifest.xml" download className="btn-primary" style={{ marginLeft: 'auto' }}>
                                <ArrowDownload24Regular /> 下载
                            </a>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                            <div>
                                <h4 style={{ marginBottom: '4px' }}>在 Word 中插入</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>在 Word 菜单栏选择“插入” - “我的加载项” - “管理我的加载项”。</p>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '24px', display: 'flex', gap: '20px', alignItems: 'center' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
                            <div>
                                <h4 style={{ marginBottom: '4px' }}>上传并启动</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>选择“上传我的加载项”，选择刚才下载的 manifest.xml 文件即可。</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '60px 20px', textAlign: 'center', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    &copy; 2026 Word Layouter. Powered by Google Gemini & DeepSeek.
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
