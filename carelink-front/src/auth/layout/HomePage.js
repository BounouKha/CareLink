import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// CSS is now handled by UnifiedBaseLayout.css
import BaseLayout from './BaseLayout';
import { useCareTranslation } from '../../hooks/useCareTranslation';

const HomePage = () => {
    const navigate = useNavigate();
    const { t } = useCareTranslation();


    return (
        <BaseLayout>

            {/* Hero Section */}
            <div className="container-fluid d-flex align-items-center justify-content-center" style={{ 
                minHeight: '100vh', 
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.8)'
            }}>
                <div className="row align-items-center w-100">
                    <div className="col-lg-6 col-md-12 text-center text-lg-start mb-5 mb-lg-0">
                        <div style={{ opacity: 0, animation: 'fadeInUp 1s ease forwards 0.3s' }}>
                            <h1 
                                className="display-3 fw-bold mb-4"
                                style={{
                                   
                                    WebkitBackgroundClip: 'text',
                                    
                                    backgroundClip: 'text',
                                    textShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                }}
                            >
                                {t('homepage.title')}
                            </h1>
                            <p 
                                className="lead mb-5"
                                style={{ 
                                    color: '#6b7280', 
                                    fontSize: '1.25rem',
                                    lineHeight: '1.6',
                                    opacity: 0,
                                    animation: 'fadeInUp 1s ease forwards 0.6s',
                                }}
                            >
                                {t('homepage.subtitle')}
                            </p>
                            <div 
                                className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start"
                                style={{ opacity: 0, animation: 'fadeInUp 1s ease forwards 0.9s' }}
                            >
                                <button 
                                    className="btn btn-primary btn-lg px-4 py-3 fw-semibold"
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-2px)';
                                        e.target.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
                                    }}
                                    onClick={() => navigate('/login')}
                                >
                                    {t('homepage.getStarted')}
                                </button>
                                <button 
                                    className="btn btn-outline-primary btn-lg px-4 py-3 fw-semibold"
                                    style={{
                                        border: '2px solid #667eea',
                                        color: '#667eea',
                                        borderRadius: '12px',
                                        background: 'transparent',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.background = '#667eea';
                                        e.target.style.color = 'white';
                                        e.target.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.background = 'transparent';
                                        e.target.style.color = '#667eea';
                                        e.target.style.transform = 'translateY(0)';
                                    }}
                                    onClick={() => navigate('/register')}
                                >
                                    {t('homepage.learnMore')}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="col-lg-6 col-md-12 text-center">
                        <div 
                            style={{ 
                                opacity: 0, 
                                animation: 'fadeInRight 1s ease forwards 0.6s',
                                position: 'relative'
                            }}
                        >
                            <img 
                                src="/homepage.png" 
                                alt="CareLink Platform" 
                                className="img-fluid"
                                style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: '20px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                                    transition: 'all 0.3s ease',
                                    position: 'relative',
                                    zIndex: 2
                                }}
                                onMouseEnter={(e) => {
                                    e.target.style.transform = 'scale(1.02)';
                                }}
                                onMouseLeave={(e) => {
                                    e.target.style.transform = 'scale(1)';
                                }}
                            />
                            {/* Image glow effect */}
                            <div 
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '120%',
                                    height: '120%',
                                    background: 'radial-gradient(circle, rgba(102, 126, 234, 0.2) 0%, transparent 70%)',
                                    borderRadius: '50%',
                                    animation: 'glow 3s ease-in-out infinite alternate',
                                    zIndex: 1
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="container-fluid py-5" style={{ 
                background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(226, 232, 240, 0.8) 100%)',
                borderRadius: '30px',
                marginTop: '50px',
            }}>
                <div className="container">
                    <div className="row">
                        <div className="col-12 text-center mb-5">
                            <h2 
                                className="display-5 fw-bold mb-3"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text'
                                }}
                            >
                                {t('homepage.whyChooseTitle')}
                            </h2>
                            <div 
                                style={{
                                    width: '80px',
                                    height: '4px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    margin: '0 auto',
                                    borderRadius: '2px'
                                }}
                            />
                        </div>
                    </div>
                    
                    <div className="row g-2">
                        {[
                            { icon: '🏠', title: t('homepage.features.household.title'), desc: t('homepage.features.household.description') },
                            { icon: '👨‍👩‍👧‍👦', title: t('homepage.features.family.title'), desc: t('homepage.features.family.description') },
                            { icon: '📱', title: t('homepage.features.easyToUse.title'), desc: t('homepage.features.easyToUse.description') },
                            { icon: '🔒', title: t('homepage.features.secure.title'), desc: t('homepage.features.secure.description') }
                        ].map((feature, index) => (
                            <div key={index} className="col-lg-3 col-md-6">
                                <div 
                                    className="card h-100 border-0 shadow-sm"
                                    style={{
                                        borderRadius: '16px',
                                        transition: 'all 0.3s ease',
                                        opacity: 0,
                                        animation: `fadeInUp 1s ease forwards ${1.2 + index * 0.2}s`
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-6px)',
                                        e.target.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
                                        
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        
                                    }}
                                >
                                    <div className="card-body text-center p-4">
                                        <div 
                                            className="mb-3"
                                            style={{ fontSize: '3rem' }}
                                        >
                                            {feature.icon}
                                        </div>
                                        <h5 className="card-title fw-semibold mb-3" style={{ color: '#1f2937' }}>
                                            {feature.title}
                                        </h5>
                                        <p className="card-text" style={{ color: '#6b7280', lineHeight: '1.6' }}>
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @keyframes fadeInRight {
                    from {
                        opacity: 0;
                        transform: translateX(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @keyframes glow {
                    0% {
                        opacity: 0.3;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        opacity: 0.6;
                        transform: translate(-50%, -50%) scale(1.1);
                    }
                }
            `}</style>
        </BaseLayout>
    );
};

export default HomePage;
