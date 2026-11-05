// ==========================================
//
// ==========================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function GuestHome() {
    const navigate = useNavigate();
    const location = useLocation();

    // ตัวแปรกันหน้าเว็บพังเวลาเปลี่ยนหน้า แล้วมีคำสั่งเวลา (Timeout) ค้างอยู่
    const isMountedRef = useRef(true);
    const timeoutIdsRef = useRef([]);

    // ฟังก์ชันช่วยสั่งหน่วงเวลาแบบปลอดภัย ถ้าปิดหน้าไปแล้วจะไม่ทำงานต่อ
    const safeSetTimeout = useCallback((fn, delay) => {
        const id = setTimeout(() => {
            timeoutIdsRef.current = timeoutIdsRef.current.filter(t => t !== id);
            if (isMountedRef.current) fn();
        }, delay);
        timeoutIdsRef.current.push(id);
        return id;
    }, []);

    // ฟังก์ชันสั่งยกเลิกตัวหน่วงเวลาทั้งหมด
    const clearAllSafeTimeouts = useCallback(() => {
        timeoutIdsRef.current.forEach(id => clearTimeout(id));
        timeoutIdsRef.current = [];
    }, []);

    // ==========================================
    // ตัวแปร State สำหรับข้อมูลหนังและเอฟเฟกต์หน้าจอ
    // ==========================================
    const [movies, setMovies] = useState([]);
    const [, setFeaturedMovie] = useState(null);
    const [, setUnshownPool] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false); // แฟลชสีดำตอนสลับวิดีโอ

    const [isMuted, setIsMuted] = useState(true);        // เช็คว่าเปิดหรือปิดเสียงวิดีโอพื้นหลัง
    const isMutedRef = useRef(true);

    // ตัวแปรควบคุมเครื่องเล่นวิดีโอ YouTube 2 ตัวสลับกัน (Dual Player A/B)
    const playerARef = useRef(null);
    const playerBRef = useRef(null);
    const playerAInstance = useRef(null);
    const playerBInstance = useRef(null);

    const [activePlayer, setActivePlayer] = useState('A'); // ตัวเล่นไหนกำลังแสดงอยู่ (A หรือ B)
    const activePlayerRef = useRef('A');
    const fadeAudioTimerRef = useRef(null);                // ตัวนับเวลาค่อยๆ เฟดเสียงเบาลง
    const preloadedMovieRef = useRef(null);                // หนังเรื่องถัดไปที่โหลดมารอไว้ล่วงหน้า

    // ฟังก์ชันแกะเอา Video ID จากลิงก์ YouTube
    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // สุ่มวินาทีเริ่มต้นเล่นตัวอย่างหนัง (ระหว่างวินาทีที่ 20 ถึง 90)
    const getRandomStartTime = () => Math.floor(Math.random() * (90 - 20 + 1)) + 20;

    // ฟังก์ชันสุ่มสลับตำแหน่งหนังในอาเรย์
    const shuffleArray = useCallback((array) => {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, []);

    // ฟังก์ชันค่อยๆ เบาเสียงวิดีโอลงก่อนจะสลับเรื่อง
    const fadeOutAudio = useCallback(() => {
        if (fadeAudioTimerRef.current) clearInterval(fadeAudioTimerRef.current);
        const activeInstance = activePlayerRef.current === 'A' ? playerAInstance.current : playerBInstance.current;

        if (activeInstance) {
            let currentVolume = 100;
            try {
                if (typeof activeInstance.getVolume === 'function') {
                    currentVolume = activeInstance.getVolume();
                }
            } catch (e) {
                currentVolume = 100;
            }

            fadeAudioTimerRef.current = setInterval(() => {
                if (!isMountedRef.current) {
                    clearInterval(fadeAudioTimerRef.current);
                    return;
                }
                currentVolume -= 5;
                try {
                    if (currentVolume > 0 && typeof activeInstance.setVolume === 'function') {
                        activeInstance.setVolume(currentVolume);
                    } else if (typeof activeInstance.setVolume === 'function') {
                        activeInstance.setVolume(0);
                        clearInterval(fadeAudioTimerRef.current);
                    }
                } catch (err) {
                    clearInterval(fadeAudioTimerRef.current);
                }
            }, 150);
        }
    }, []);

    // ฟังก์ชันเปิดแสดงวิดีโอและตั้งเวลาเฟดเสียง
    const triggerVideoEffects = useCallback(() => {
        setIsVisible(true);
        setIsFlashing(false);

        safeSetTimeout(() => {
            if (!isMutedRef.current) {
                fadeOutAudio();
            }
        }, 13000);
    }, [fadeOutAudio, safeSetTimeout]);

    // โหลดสคริปต์ YouTube IFrame API มาใส่เว็บ
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }, []);

    // ==========================================
    // ดึงข้อมูลหนังจาก Backend และตั้งค่าเริ่มเล่นวิดีโอ
    // ==========================================
    useEffect(() => {
        let cancelled = false;

        axios.get('http://localhost:3001/api/movies')
            .then(res => {
                if (cancelled) return;
                const data = res.data;
                setMovies(data);

                if (data.length > 0) {
                    let pool = shuffleArray(data);
                    const firstFeatured = pool.pop();
                    setFeaturedMovie(firstFeatured);

                    if (pool.length === 0) pool = shuffleArray(data);
                    const secondFeatured = pool.pop();
                    preloadedMovieRef.current = secondFeatured;
                    setUnshownPool(pool);

                    const videoIdA = getYouTubeId(firstFeatured.trailer);
                    const videoIdB = getYouTubeId(secondFeatured?.trailer);

                    if (!videoIdA) {
                        triggerVideoEffects();
                    }

                    // เริ่มตั้งค่าเครื่องเล่น YouTube ฝั่ง A และ B
                    const initPlayers = () => {
                        if (cancelled || !isMountedRef.current) return;

                        if (playerARef.current && videoIdA && !playerAInstance.current) {
                            playerAInstance.current = new window.YT.Player(playerARef.current, {
                                height: '100%', width: '100%', videoId: videoIdA,
                                playerVars: {
                                    autoplay: 1, mute: 0, controls: 0, disablekb: 1, fs: 0,
                                    iv_load_policy: 3, modestbranding: 1, rel: 0, loop: 1,
                                    playlist: videoIdA, start: getRandomStartTime(), playsinline: 1
                                },
                                events: {
                                    onReady: (e) => {
                                        try {
                                            if (cancelled || !isMountedRef.current) return;
                                            e.target.playVideo();
                                            e.target.setVolume(isMutedRef.current ? 0 : 100);
                                            triggerVideoEffects();
                                        } catch (err) {}
                                    },
                                    onStateChange: (e) => {
                                        try {
                                            if (cancelled || !isMountedRef.current) return;
                                            if (e.data === window.YT.PlayerState.ENDED) e.target.playVideo();
                                        } catch (err) {}
                                    }
                                }
                            });
                        }
                        if (playerBRef.current && videoIdB && !playerBInstance.current) {
                            playerBInstance.current = new window.YT.Player(playerBRef.current, {
                                height: '100%', width: '100%', videoId: videoIdB,
                                playerVars: {
                                    autoplay: 1, mute: 0, controls: 0, disablekb: 1, fs: 0,
                                    iv_load_policy: 3, modestbranding: 1, rel: 0, loop: 1,
                                    playlist: videoIdB, start: getRandomStartTime(), playsinline: 1
                                },
                                events: {
                                    onReady: (e) => {
                                        try {
                                            if (cancelled || !isMountedRef.current) return;
                                            e.target.setVolume(0);
                                        } catch (err) {}
                                    },
                                    onStateChange: (e) => {
                                        try {
                                            if (cancelled || !isMountedRef.current) return;
                                            if (e.data === window.YT.PlayerState.ENDED) e.target.playVideo();
                                        } catch (err) {}
                                    }
                                }
                            });
                        }
                    };

                    if (window.YT && window.YT.Player) {
                        initPlayers();
                    } else {
                        window.onYouTubeIframeAPIReady = initPlayers;
                    }
                }
            })
            .catch(err => console.error('Failed to load movies data:', err));

        return () => { cancelled = true; };
    }, [shuffleArray, triggerVideoEffects]);

    // ลูปเปลี่ยนตัวอย่างหนังเรื่องใหม่ทุกๆ 15 วินาที
    useEffect(() => {
        if (movies.length === 0) return;

        const interval = setInterval(() => {
            if (!isMountedRef.current) return;

            const movieToShow = preloadedMovieRef.current;
            if (!movieToShow) return;

            if (fadeAudioTimerRef.current) clearInterval(fadeAudioTimerRef.current);
            fadeAudioTimerRef.current = null;

            setIsVisible(false);
            setIsFlashing(true);

            // สลับสถานะตัวเล่นวิดีโอระหว่าง Player A กับ Player B
            const nextActive = activePlayerRef.current === 'A' ? 'B' : 'A';
            const nextInstance = nextActive === 'A' ? playerAInstance.current : playerBInstance.current;
            const prevInstance = nextActive === 'A' ? playerBInstance.current : playerAInstance.current;

            safeSetTimeout(() => {
                setFeaturedMovie(movieToShow);

                try {
                    if (nextInstance && typeof nextInstance.setVolume === 'function') {
                        nextInstance.setVolume(isMutedRef.current ? 0 : 100);
                        nextInstance.playVideo();
                    }
                    if (prevInstance && typeof prevInstance.setVolume === 'function') {
                        prevInstance.setVolume(0);
                    }
                } catch (err) {}

                setActivePlayer(nextActive);
                activePlayerRef.current = nextActive;

                triggerVideoEffects();

                // โหลดหนังเรื่องถัดไปมารอไว้ในเครื่องเล่นตัวที่พักอยู่
                setUnshownPool(currentPool => {
                    let pool = [...currentPool];
                    if (pool.length === 0) pool = shuffleArray(movies);

                    const upcomingMovie = pool.pop();
                    preloadedMovieRef.current = upcomingMovie;
                    const upcomingVideoId = getYouTubeId(upcomingMovie?.trailer);

                    safeSetTimeout(() => {
                        try {
                            if (prevInstance && upcomingVideoId && typeof prevInstance.loadVideoById === 'function') {
                                prevInstance.loadVideoById({
                                    videoId: upcomingVideoId,
                                    startSeconds: getRandomStartTime()
                                });
                                if (typeof prevInstance.setVolume === 'function') {
                                    prevInstance.setVolume(0);
                                }
                            }
                        } catch (err) {}
                    }, 9400);

                    return pool;
                });
            }, 600);

        }, 15000);

        return () => clearInterval(interval);
    }, [movies, shuffleArray, triggerVideoEffects, safeSetTimeout]);

    // เคลียร์เมมโมรีและทำลายตัวเล่นวิดีโอเมื่อปิดหน้านี้
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            clearAllSafeTimeouts();

            if (fadeAudioTimerRef.current) {
                clearInterval(fadeAudioTimerRef.current);
                fadeAudioTimerRef.current = null;
            }

            try {
                if (playerAInstance.current && typeof playerAInstance.current.destroy === 'function') {
                    playerAInstance.current.destroy();
                    playerAInstance.current = null;
                }
                if (playerBInstance.current && typeof playerBInstance.current.destroy === 'function') {
                    playerBInstance.current.destroy();
                    playerBInstance.current = null;
                }
            } catch (err) {}
        };
    }, [clearAllSafeTimeouts]);

    // สลับเปิด-ปิดเสียงวิดีโอ
    const toggleAudio = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const currentMuteStatus = !isMuted;
        setIsMuted(currentMuteStatus);
        isMutedRef.current = currentMuteStatus;

        try {
            if (activePlayerRef.current === 'A' && playerAInstance.current && typeof playerAInstance.current.setVolume === 'function') {
                playerAInstance.current.setVolume(currentMuteStatus ? 0 : 100);
            } else if (activePlayerRef.current === 'B' && playerBInstance.current && typeof playerBInstance.current.setVolume === 'function') {
                playerBInstance.current.setVolume(currentMuteStatus ? 0 : 100);
            }
        } catch (err) {}
    };

    const isActive = (path) => location.pathname === path;

    const navLinkStyle = (path) => ({
        cursor: 'pointer',
        color: '#fff',
        fontSize: '14px',
        paddingBottom: '4px',
        borderBottom: isActive(path) ? '2px solid #fff' : '2px solid transparent',
        transition: 'border-color 0.2s'
    });

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', color: '#ffffff', minHeight: '100vh', fontFamily: 'sans-serif', position: 'relative', overflowX: 'hidden' }}>
            
            {/* โซนวิดีโอพื้นหลัง YouTube แบบเล่นวนอัตโนมัติ */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '75vh', overflow: 'hidden', zIndex: 0, backgroundColor: '#000', opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#141414', zIndex: 3, opacity: isFlashing ? 1 : 0, transition: 'opacity 0.3s ease-in-out', pointerEvents: 'none' }}></div>
                
                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                    <div style={{ width: '100vw', height: '56.25vw', minHeight: '75vh', minWidth: '133.33vh', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: activePlayer === 'A' ? 1 : 0, transition: 'opacity 0.6s ease-in-out', zIndex: activePlayer === 'A' ? 2 : 1 }}>
                        <div ref={playerARef} style={{ width: '100%', height: '100%' }}></div>
                    </div>
                    <div style={{ width: '100vw', height: '56.25vw', minHeight: '75vh', minWidth: '133.33vh', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: activePlayer === 'B' ? 1 : 0, transition: 'opacity 0.6s ease-in-out', zIndex: activePlayer === 'B' ? 2 : 1 }}>
                        <div ref={playerBRef} style={{ width: '100%', height: '100%' }}></div>
                    </div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 4, pointerEvents: 'auto', background: 'transparent' }}></div>
                </div>
            </div>

            {/* เลเยอร์ไล่เฉดสีดำทับวิดีโอเพื่อให้อ่านตัวหนังสือออก */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '75vh', background: 'linear-gradient(to right, #141414 15%, transparent 60%), linear-gradient(to bottom, transparent 60%, #141414 100%)', zIndex: 1 }}></div>

            {/* แถบเมนูด้านบน */}
            <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: 'rgba(0,0,0,0.8)', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }} onClick={() => navigate('/')}>
                    MOVIERENT
                </div>

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                    <span style={navLinkStyle('/')} onClick={() => navigate('/')}>Home</span>
                    <span style={navLinkStyle('/guest-movies')} onClick={() => navigate('/guest-movies')}>Movies</span>
                    <span style={navLinkStyle('/guest-top10')} onClick={() => navigate('/guest-top10')}>Top 10</span>
                    
                    <button 
                        onClick={() => navigate('/login')} 
                        style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', transition: 'border-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fff'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#555'}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => navigate('/register')} 
                        style={{ padding: '6px 14px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                    >
                        Sign Up
                    </button>
                </div>
            </nav>

            {/* ข้อความต้อนรับ และปุ่มเชิญชวนให้เริ่มใช้งาน */}
            <div style={{ position: 'relative', zIndex: 1, padding: '100px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', minHeight: '45vh' }}>
                
                {/* ปุ่มเปิด-ปิดเสียงวิดีโอ */}
                <button
                    onClick={toggleAudio}
                    style={{
                        position: 'absolute', top: '20px', left: '60px', zIndex: 20,
                        backgroundColor: 'rgba(20, 20, 20, 0.6)', color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '50%',
                        width: '42px', height: '42px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                        cursor: 'pointer', backdropFilter: 'blur(4px)', transition: 'all 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(40, 40, 40, 0.8)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(20, 20, 20, 0.6)'}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <line x1="23" y1="9" x2="17" y2="15"></line>
                            <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                    )}
                </button>

                <div style={{ maxWidth: '600px' }}>
                    <h1 style={{ fontSize: '42px', marginBottom: '15px', lineHeight: '1.2', fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                        Rent. Watch. Review.<br />All in One Place.
                    </h1>
                    <p style={{ fontSize: '15px', color: '#eee', maxWidth: '500px', marginBottom: '35px', lineHeight: '1.5', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                        Discover a wide variety of your favorite movies. Rent and stream instantly, backed by authentic user reviews and ratings.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button 
                            onClick={() => navigate('/register')} 
                            style={{ 
                                padding: '12px 24px', backgroundColor: '#ffffff', color: '#000000', 
                                fontSize: '14px', fontWeight: 'bold', border: 'none', borderRadius: '0px', 
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px',
                                transition: 'background-color 0.2s' 
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                            <span>GET STARTED NOW</span>
                            <span style={{ fontSize: '16px' }}>&rarr;</span>
                        </button>

                        <button 
                            onClick={() => navigate('/login')} 
                            style={{ 
                                padding: '12px 24px', backgroundColor: 'transparent', color: '#ffffff', 
                                fontSize: '14px', fontWeight: 'bold', border: '1px solid #ffffff', borderRadius: '0px', 
                                cursor: 'pointer', transition: 'all 0.2s' 
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.color = '#000000'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ffffff'; }}
                        >
                            Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuestHome;