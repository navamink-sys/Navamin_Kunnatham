// ==========================================
//
// ==========================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function Home() {
    const navigate = useNavigate();
    const location = useLocation();

    // ดึงข้อมูลสมาชิกที่ล็อกอินอยู่
    const [user, setUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    const isMountedRef = useRef(true);
    const timeoutIdsRef = useRef([]);

    // ฟังก์ชันสั่งหน่วงเวลาแบบปลอดภัย
    const safeSetTimeout = useCallback((fn, delay) => {
        const id = setTimeout(() => {
            timeoutIdsRef.current = timeoutIdsRef.current.filter(t => t !== id);
            if (isMountedRef.current) fn();
        }, delay);
        timeoutIdsRef.current.push(id);
        return id;
    }, []);

    const clearAllSafeTimeouts = useCallback(() => {
        timeoutIdsRef.current.forEach(id => clearTimeout(id));
        timeoutIdsRef.current = [];
    }, []);

    // ดึงข้อมูลผู้ใช้ตัวล่าสุดมาอัปเดตใหม่
    useEffect(() => {
        let cancelled = false;
        const localUser = JSON.parse(localStorage.getItem('user'));
        const userId = localUser?.user_id || localUser?.member_id || localUser?.id;

        if (userId) {
            axios.get('http://localhost:3001/api/users')
                .then(res => {
                    if (cancelled) return;
                    const freshUser = res.data.find(m => String(m.user_id || m.member_id || m.id) === String(userId));
                    if (freshUser) {
                        setUser(freshUser);
                        localStorage.setItem('user', JSON.stringify(freshUser));
                    }
                })
                .catch(err => console.error("Error fetching fresh user data:", err));
        }

        return () => { cancelled = true; };
    }, []);

    // ==========================================
    // ตัวแปร State สำหรับข้อมูลหนังและแอนิเมชัน
    // ==========================================
    const [movies, setMovies] = useState([]);
    const [recommendedMovies, setRecommendedMovies] = useState([]); // หนังแนะนำตามประวัติการเช่า
    const [featuredMovie, setFeaturedMovie] = useState(null);       // หนังเด่นที่กำลังฉายตัวอย่างอยู่ตรงหัวเว็บ
    const [, setUnshownPool] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const [isTextVisible, setIsTextVisible] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(true);
    const [isFlashing, setIsFlashing] = useState(false);
    const [isCenterTitleVisible, setIsCenterTitleVisible] = useState(false);
    const [isDirectorVisible, setIsDirectorVisible] = useState(false);
    const [isDirectorHiding, setIsDirectorHiding] = useState(false);

    const [isMuted, setIsMuted] = useState(true);
    const isMutedRef = useRef(true);

    // ตัวแปรค้นหาหนังตรงแถบเมนู
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // ตัวแปรควบคุมเครื่องเล่น YouTube A/B
    const playerARef = useRef(null);
    const playerBRef = useRef(null);
    const playerAInstance = useRef(null);
    const playerBInstance = useRef(null);

    const [activePlayer, setActivePlayer] = useState('A');
    const activePlayerRef = useRef('A');
    const fadeAudioTimerRef = useRef(null);
    const preloadedMovieRef = useRef(null); 
    const hasRevealedInitialRef = useRef(false); 

    const getYouTubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const getRandomStartTime = () => Math.floor(Math.random() * (90 - 20 + 1)) + 20;

    const shuffleArray = useCallback((array) => {
        let shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, []);

    // ฟังก์ชันค่อยๆ เบาเสียงวิดีโอลงก่อนสลับเรื่อง
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

    // ลำดับแอนิเมชันเปิดข้อความชื่อเรื่องและชื่อผู้กำกับตามจังหวะวิดีโอ
    const triggerTextAnimations = useCallback(() => {
        setIsVisible(true);
        setIsFlashing(false);

        safeSetTimeout(() => { setIsCenterTitleVisible(true); }, 500);
        safeSetTimeout(() => { setIsTextVisible(true); }, 2500);
        safeSetTimeout(() => { setIsCenterTitleVisible(false); }, 2000);
        safeSetTimeout(() => { setIsTransitioning(false); }, 3000);
        safeSetTimeout(() => { setIsDirectorVisible(true); }, 4000);
        safeSetTimeout(() => { setIsDirectorHiding(true); }, 13500);

        safeSetTimeout(() => {
            if (!isMutedRef.current) {
                fadeOutAudio();
            }
        }, 13000);
    }, [fadeOutAudio, safeSetTimeout]);

    // โหลด YouTube IFrame API
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }, []);

    // ดึงข้อมูลหนัง และตั้งค่าตัวเล่นวิดีโอ YouTube
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
                        hasRevealedInitialRef.current = true;
                        triggerTextAnimations();
                    }

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
                                        } catch (err) {}
                                    },
                                    onStateChange: (e) => {
                                        try {
                                            if (cancelled || !isMountedRef.current) return;
                                            if (e.data === window.YT.PlayerState.ENDED) e.target.playVideo();
                                            if (e.data === window.YT.PlayerState.PLAYING && !hasRevealedInitialRef.current) {
                                                hasRevealedInitialRef.current = true;
                                                triggerTextAnimations();
                                            }
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
            .catch(err => console.error('Failed to load movies:', err));

        return () => { cancelled = true; };
    }, [shuffleArray, triggerTextAnimations]);

    // ==========================================
    // อัลกอริทึมแนะนำหนังตามประวัติการเช่า (Recommended for You)
    // ==========================================
    useEffect(() => {
        const currentUserId = user?.user_id || user?.member_id || user?.id;
        
        if (movies.length > 0 && currentUserId) {
            axios.get(`http://localhost:3001/api/history/${currentUserId}`)
                .then(res => {
                    const history = res.data;
                    
                    if (history.length > 0) {
                        const rentedMovieIds = history.map(h => h.movie_id);
                        const genreCounts = {};
                        
                        // นับความถี่ของหมวดหมู่หนังที่ยูสเซอร์เคยเช่าไป
                        history.forEach(h => {
                            const rentedMovie = movies.find(m => m.movie_id === h.movie_id);
                            if (rentedMovie && rentedMovie.genre) {
                                rentedMovie.genre.split(',').forEach(g => {
                                    const trimmed = g.trim();
                                    genreCounts[trimmed] = (genreCounts[trimmed] || 0) + 1;
                                });
                            }
                        });

                        // หาหมวดหมู่ที่ยูสเซอร์ชอบเช่าดูมากที่สุด
                        const topGenres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);
                        
                        if (topGenres.length > 0) {
                            const topGenre = topGenres[0];
                            // แนะนำหนังในหมวดหมู่นั้นที่ยูสเซอร์ยังไม่เคยเช่า
                            const recommended = movies.filter(m => 
                                m.genre && m.genre.includes(topGenre) && !rentedMovieIds.includes(m.movie_id)
                            );
                            
                            // ถ้าหนังไม่พอ 8 เรื่อง ให้เอาเรื่องอื่นมาเติมให้เต็ม
                            if (recommended.length < 8) {
                                const otherMovies = movies.filter(m => !rentedMovieIds.includes(m.movie_id) && !recommended.includes(m));
                                setRecommendedMovies([...recommended, ...otherMovies].slice(0, 8));
                            } else {
                                setRecommendedMovies(recommended.slice(0, 8));
                            }
                        } else {
                            setRecommendedMovies([...movies].sort(() => 0.5 - Math.random()).slice(0, 8));
                        }
                    } else {
                        // ถ้าไม่เคยเช่าหนังเลย ให้สุ่มหนังมาแนะนำ 8 เรื่อง
                        setRecommendedMovies([...movies].sort(() => 0.5 - Math.random()).slice(0, 8));
                    }
                })
                .catch(err => {
                    console.error('Error fetching recommendation data:', err);
                });
        }
    }, [movies, user]);

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
            setIsTextVisible(false);
            setIsTransitioning(true);
            setIsCenterTitleVisible(false);
            setIsDirectorVisible(false);
            setIsDirectorHiding(false);
            setIsFlashing(true);

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

                triggerTextAnimations();

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
    }, [movies, shuffleArray, triggerTextAnimations, safeSetTimeout]);

    // เคลียร์เมมโมรีและตัวเล่นวิดีโอเมื่อปิดหน้านี้
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

    // เปิด-ปิดเสียงวิดีโอ
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

    // ค้นหาหนังตรงแถบเมนู
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.trim() === '') {
            setSearchResults([]);
            setIsDropdownOpen(false);
        } else {
            const filtered = movies.filter(movie =>
                movie.movie_name.toLowerCase().includes(query.toLowerCase())
            );
            setSearchResults(filtered);
            setIsDropdownOpen(true);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const isActive = (path) => location.pathname === path;

    const navLinkStyle = (path) => ({
        cursor: 'pointer',
        color: '#fff',
        fontSize: '14px',
        paddingBottom: '2px',
        borderBottom: isActive(path) ? '2px solid #fff' : '2px solid transparent',
        display: 'inline-block',
        transition: 'border-color 0.2s'
    });

    if (!user || !user.firstname) {
        return (
            <div style={{ backgroundColor: '#141414', color: '#fff', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', fontFamily: 'sans-serif' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'normal' }}>You are not logged in</h2>
                <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px', fontSize: '14px', fontWeight: 'bold' }}>
                    Go to Login
                </button>
            </div>
        );
    }

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif', position: 'relative', overflowX: 'hidden' }}>

            {/* วิดีโอพื้นหลัง YouTube */}
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '75vh', overflow: 'hidden', zIndex: 0, backgroundColor: '#000', opacity: isVisible ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}>

                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: '#141414', zIndex: 3, opacity: isFlashing ? 1 : 0, transition: 'opacity 0.3s ease-in-out', pointerEvents: 'none' }}></div>

                <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                    <div style={{
                        width: '100vw', height: '56.25vw', minHeight: '75vh', minWidth: '133.33vh',
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
                        opacity: activePlayer === 'A' ? 1 : 0,
                        transition: 'opacity 0.6s ease-in-out',
                        zIndex: activePlayer === 'A' ? 2 : 1
                    }}>
                        <div ref={playerARef} style={{ width: '100%', height: '100%' }}></div>
                    </div>

                    <div style={{
                        width: '100vw', height: '56.25vw', minHeight: '75vh', minWidth: '133.33vh',
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
                        opacity: activePlayer === 'B' ? 1 : 0,
                        transition: 'opacity 0.6s ease-in-out',
                        zIndex: activePlayer === 'B' ? 2 : 1
                    }}>
                        <div ref={playerBRef} style={{ width: '100%', height: '100%' }}></div>
                    </div>

                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 4, pointerEvents: 'auto', background: 'transparent' }}></div>
                </div>
            </div>

            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '75vh', background: 'linear-gradient(to right, #141414 15%, transparent 60%), linear-gradient(to bottom, transparent 60%, #141414 100%)', zIndex: 1 }}></div>

            {/* แถบเมนูด้านบนของสมาชิก */}
            <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: 'rgba(0,0,0,0.8)', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }} onClick={() => navigate('/home')}>
                    MOVIERENT
                </div>

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search movies..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={() => { if (searchQuery.trim() !== '') setIsDropdownOpen(true); }}
                            style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', width: '220px', backgroundColor: '#222', color: '#fff', fontSize: '14px', outline: 'none' }}
                        />

                        {isDropdownOpen && searchResults.length > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: '38px',
                                left: 0,
                                width: '100%',
                                backgroundColor: '#1f1f1f',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                zIndex: 100,
                                maxHeight: '250px',
                                overflowY: 'auto',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
                            }}>
                                {searchResults.map(movie => (
                                    <div
                                        key={movie.movie_id}
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setSearchQuery('');
                                            navigate(`/movie/${movie.movie_id}`);
                                        }}
                                        style={{
                                            padding: '10px 12px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #2a2a2a',
                                            color: '#ddd',
                                            transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2c2c2c'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        {movie.movie_name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <span style={navLinkStyle('/home')} onClick={() => navigate('/home')}>Home</span>
                    <span style={navLinkStyle('/movies')} onClick={() => navigate('/movies')}>Movies</span>
                    <span style={navLinkStyle('/top10')} onClick={() => navigate('/top10')}>Top 10</span>
                    <span style={navLinkStyle('/history')} onClick={() => navigate('/history')}>History</span>

                    <button
                        onClick={handleLogout}
                        style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                    >
                        Logout
                    </button>

                    <div
                        onClick={() => navigate('/profile')}
                        title={`User: ${user?.firstname}`}
                        style={{
                            width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#333',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            overflow: 'hidden', border: '1px solid #555', cursor: 'pointer'
                        }}
                    >
                        {user?.profile_pic ? (
                            <img
                                src={`http://localhost:3001/uploads/${user.profile_pic}`}
                                alt={user.firstname}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ fontSize: '16px' }}>👤</span>
                        )}
                    </div>
                </div>
            </nav>

            {/* โซนแสดงข้อมูลหนังเด่นด้านบน */}
            <div style={{
                position: 'relative', zIndex: 1, padding: '80px 60px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '380px',
            }}>

                <button
                    onClick={toggleAudio}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '60px',
                        zIndex: 20,
                        backgroundColor: 'rgba(20, 20, 20, 0.6)',
                        color: '#fff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '50%',
                        width: '42px',
                        height: '42px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.2s ease-in-out'
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

                <div style={{
                    maxWidth: '600px',
                    opacity: isTextVisible ? 1 : 0,
                    transform: isTextVisible ? 'translateY(0)' : 'translateY(10px)',
                    transition: 'all 0.6s ease-in-out'
                }}>
                    <h3 style={{ color: '#fff', fontSize: '42px', fontWeight: 'bold', margin: '0 0 10px 0', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                        {featuredMovie ? featuredMovie.movie_name : 'Loading...'}
                    </h3>

                    <div style={{ display: 'flex', gap: '15px', color: '#ccc', fontSize: '14px', marginBottom: '20px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{featuredMovie?.rental_status}</span>
                        <span>{featuredMovie?.duration} mins</span>
                        <span>{featuredMovie?.genre}</span>
                    </div>

                    <p style={{ color: '#eee', fontSize: '16px', lineHeight: '1.6', marginBottom: '40px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                        {featuredMovie?.description || 'No description available for this movie.'}
                    </p>

                    <button
                        onClick={() => featuredMovie && navigate(`/movie/${featuredMovie.movie_id}`)}
                        style={{
                            padding: '12px 30px', backgroundColor: '#fff', color: '#000',
                            border: 'none', borderRadius: '4px', cursor: 'pointer',
                            fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                    >
                        ▶ Watch Trailer
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    position: 'relative',
                    width: '500px',
                    height: '330px',
                    overflow: 'visible'
                }}>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        position: 'absolute',
                        right: isTransitioning ? 'calc(50% - -550px)' : '0px',
                        transition: 'right 1s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{
                            maxWidth: '250px',
                            textAlign: 'right',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                            opacity: (isDirectorVisible && !isDirectorHiding) ? 1 : 0,
                            transform: (isDirectorVisible && !isDirectorHiding) ? 'translateX(0)' : 'translateX(30px)',
                            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                            visibility: (isDirectorVisible && !isDirectorHiding) ? 'visible' : 'hidden'
                        }}>
                            <h4 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#fff' }}>Director</h4>
                            <p style={{ color: '#ddd', fontSize: '14px', margin: '0 0 15px 0' }}>{featuredMovie?.director || '-'}</p>
                        </div>

                        <div
                            onClick={() => featuredMovie && navigate(`/movie/${featuredMovie.movie_id}`)}
                            style={{
                                width: '220px', height: '330px',
                                boxShadow: '0 10px 40px rgba(0,0,0,1)',
                                border: '1px solid #444',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                flexShrink: 0,
                                transform: isTransitioning ? 'scale(1.1)' : 'scale(1)',
                                transition: 'transform 1s cubic-bezier(0.16, 1, 0.3, 1)',
                                zIndex: 5
                            }}
                            className="movie-card-hover"
                        >
                           <img
                                src={featuredMovie?.poster_pic ? `http://localhost:3001/uploads/${featuredMovie.poster_pic}` : 'https://via.placeholder.com/220x330?text=No+Image'}
                                alt={featuredMovie?.movie_name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                    </div>

                    <div style={{
                        position: 'absolute',
                        top: isCenterTitleVisible ? '360px' : '350px',
                        left: '-82%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        fontSize: '22px',
                        fontWeight: 'bold',
                        color: '#fff',
                        textShadow: '2px 2px 6px rgba(0,0,0,0.9)',
                        opacity: isCenterTitleVisible ? 1 : 0,
                        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        zIndex: 10,
                        pointerEvents: 'none',
                        display: isTransitioning ? 'block' : 'none'
                    }}>
                        {featuredMovie?.movie_name || ''}
                    </div>
                </div>
            </div>

            {/* แถวหนังเข้าใหม่ (New Releases) */}
            <div style={{ position: 'relative', zIndex: 1, padding: '0 60px 40px 60px' }}>
                <h3 style={{ borderLeft: '3px solid #e50914', paddingLeft: '10px', fontSize: '18px', marginBottom: '20px' }}>New Releases</h3>
                <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' }}>
                    {[...movies]
                        .sort((a, b) => {
                            const idA = parseInt(String(a.movie_id).replace(/\D/g, '')) || 0;
                            const idB = parseInt(String(b.movie_id).replace(/\D/g, '')) || 0;
                            if (idB !== idA) return idB - idA;
                            return String(b.movie_id).localeCompare(String(a.movie_id));
                        })
                        .slice(0, 8)
                        .map(movie => (
                            <div
                                key={`new-${movie.movie_id}`}
                                onClick={() => navigate(`/movie/${movie.movie_id}`)}
                                style={{ width: '160px', flexShrink: 0, cursor: 'pointer', transition: 'transform 0.2s' }}
                                className="movie-card-hover"
                            >
                                <img
                                    src={movie.poster_pic ? `http://localhost:3001/uploads/${movie.poster_pic}` : 'https://via.placeholder.com/160x240?text=No+Image'}
                                    alt={movie.movie_name}
                                    style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #333' }}
                                />
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.movie_name}</p>
                            </div>
                        ))}
                </div>
            </div>

            {/* แถวหนังแนะนำเฉพาะคุณ (Recommended for You) */}
            <div style={{ position: 'relative', zIndex: 1, padding: '0 60px 60px 60px' }}>
                <h3 style={{ borderLeft: '3px solid #4ade80', paddingLeft: '10px', fontSize: '18px', marginBottom: '20px' }}>
                    Recommended for You
                </h3>
                <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' }}>
                    {recommendedMovies.length > 0 ? (
                        recommendedMovies.map(movie => (
                            <div
                                key={`rec-${movie.movie_id}`}
                                onClick={() => navigate(`/movie/${movie.movie_id}`)}
                                style={{ width: '160px', flexShrink: 0, cursor: 'pointer', transition: 'transform 0.2s' }}
                                className="movie-card-hover"
                            >
                                <img
                                    src={movie.poster_pic ? `http://localhost:3001/uploads/${movie.poster_pic}` : 'https://via.placeholder.com/160x240?text=No+Image'}
                                    alt={movie.movie_name}
                                    style={{ width: '100%', height: '240px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #333' }}
                                />
                                <p style={{ margin: '8px 0 0 0', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.movie_name}</p>
                            </div>
                        ))
                    ) : (
                        <div style={{ color: '#888', fontSize: '14px', fontStyle: 'italic', paddingLeft: '10px' }}>
                            Processing movie recommendations based on your preferences...
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .movie-card-hover:hover { transform: scale(1.05); }
                div::-webkit-scrollbar { height: 8px; }
                div::-webkit-scrollbar-thumb { background-color: #333; border-radius: 4px; }
            `}</style>

        </div>
    );
}

export default Home;