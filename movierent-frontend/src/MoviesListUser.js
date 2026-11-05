// ==========================================
//
// ==========================================
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function MoviesListUser() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ดึงข้อมูลสมาชิกที่ล็อกอินอยู่จากเครื่อง
    const [user, setUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // อัปเดตข้อมูลผู้ใช้ตัวล่าสุดจาก Database
    useEffect(() => {
        const localUser = JSON.parse(localStorage.getItem('user'));
        const userId = localUser?.user_id || localUser?.member_id || localUser?.id;

        if (userId) {
            axios.get('http://localhost:3001/api/users')
                .then(res => {
                    const freshUser = res.data.find(m => String(m.user_id || m.member_id || m.id) === String(userId));
                    if (freshUser) {
                        setUser(freshUser);
                        localStorage.setItem('user', JSON.stringify(freshUser));
                    }
                })
                .catch(err => console.error("Error fetching fresh user data:", err));
        }
    }, []);

    // ==========================================
    // ตัวแปร State สำหรับเก็บข้อมูลหนัง ตัวกรอง และการค้นหา
    // ==========================================
    const [movies, setMovies] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');          // ข้อความในช่องค้นหาบนแถบเมนู
    const [searchResults, setSearchResults] = useState([]);      // รายการหนังที่ตรงกับคำค้นหา
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // ควบคุมการเปิด-ปิดผลการค้นหา

    const [selectedGenres, setSelectedGenres] = useState([]);   // หมวดหมู่หนังที่ติ๊กเลือกไว้
    const [sortBy, setSortBy] = useState('name_asc');            // รูปแบบการเรียงลำดับหนัง (ค่าเริ่มต้น: ชื่อ A-Z)

    // หมวดหมู่หนังพื้นฐาน
    const defaultGenres = [
        'Action', 'Sci-Fi', 'Drama', 'Adventure', 'Comedy', 
        'Thriller', 'Animation', 'Fantasy', 'Romance', 'Family', 
        'Crime', 'Music', 'Horror', 'Mystery', 'History'
    ];

    // รวมหมวดหมู่หนังทั้งหมดที่มีอยู่ในระบบแบบไม่ซ้ำกัน
    const availableGenres = Array.from(new Set([
        ...defaultGenres,
        ...movies.flatMap(movie => movie.genre ? movie.genre.split(',').map(g => g.trim()) : [])
    ])).filter(Boolean);

    // ==========================================
    // ดึงข้อมูลหนังทั้งหมดจาก Backend
    // ==========================================
    const fetchMovies = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/movies');
            setMovies(response.data);
        } catch (error) {
            console.error('Failed to load movies:', error);
        }
    }, []);

    useEffect(() => {
        fetchMovies();
    }, [fetchMovies]);

    // ฟังก์ชันพิมพ์ค้นหาหนังบนแถบเมนู
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

    // สลับการติ๊กเลือกหมวดหมู่หนัง
    const handleGenreClick = (genre) => {
        if (genre === 'All') {
            setSelectedGenres([]); 
        } else {
            setSelectedGenres(prev => {
                if (prev.includes(genre)) {
                    return prev.filter(g => g !== genre); 
                } else {
                    return [...prev, genre]; 
                }
            });
        }
    };

    // ==========================================
    // กรองและจัดเรียงลำดับหนังตามหมวดหมู่และราคา
    // ==========================================
    const processedMovies = movies
        .filter(movie => {
            if (selectedGenres.length === 0) return true; 
            if (!movie.genre) return false;
            
            const movieGenres = movie.genre.split(',').map(g => g.trim());
            return selectedGenres.every(g => movieGenres.includes(g));
        })
        .sort((a, b) => {
            if (sortBy === 'name_asc') {
                return a.movie_name.localeCompare(b.movie_name);
            } else if (sortBy === 'name_desc') {
                return b.movie_name.localeCompare(a.movie_name);
            } else if (sortBy === 'price_asc') {
                return Number(a.price) - Number(b.price);
            } else if (sortBy === 'price_desc') {
                return Number(b.price) - Number(a.price);
            } else if (sortBy === 'duration') {
                return Number(b.duration) - Number(a.duration);
            }
            return 0;
        });

    // ถ้ายังไม่ได้ล็อกอิน ให้ขึ้นเตือนพร้อมปุ่มไปหน้าล็อกอิน
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
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif' }}>
            {/* แถบเมนูด้านบน */}
            <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: '#000000', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }} onClick={() => navigate('/home')}>
                    MOVIERENT
                </div>

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                    {/* ช่องค้นหาหนัง */}
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
                            <div style={{ position: 'absolute', top: '38px', left: 0, width: '100%', backgroundColor: '#1f1f1f', border: '1px solid #333', borderRadius: '4px', zIndex: 100, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.5)' }}>
                                {searchResults.map(movie => (
                                    <div 
                                        key={movie.movie_id}
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setSearchQuery('');
                                            navigate(`/movie/${movie.movie_id}`);
                                        }}
                                        style={{ padding: '10px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid #2a2a2a', color: '#ddd', transition: 'background 0.2s' }}
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
                        style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '1px solid #555', cursor: 'pointer' }}
                    >
                        {user?.profile_pic ? (
                            <img src={`http://localhost:3001/uploads/${user.profile_pic}`} alt={user.firstname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '16px' }}>👤</span>
                        )}
                    </div>
                </div>
            </nav>

            <div style={{ padding: '40px 60px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '5px', fontWeight: 'normal' }}>Movie Catalog</h2>
                <p style={{ color: '#888', fontSize: '14px', marginTop: 0, marginBottom: '25px' }}>Explore and select movies to rent</p>
                
                {/* แถบปุ่มเลือกหมวดหมู่ และตัวเลือกจัดเรียงลำดับ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: '#181818', padding: '15px 20px', borderRadius: '6px', border: '1px solid #2a2a2a', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            onClick={() => handleGenreClick('All')}
                            style={{ padding: '6px 14px', borderRadius: '20px', border: selectedGenres.length === 0 ? '1px solid #e50914' : '1px solid #333', backgroundColor: selectedGenres.length === 0 ? '#e50914' : '#222', color: '#fff', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            All
                        </button>

                        {availableGenres.map((genre) => {
                            const isSelected = selectedGenres.includes(genre);
                            return (
                                <button
                                    key={genre}
                                    onClick={() => handleGenreClick(genre)}
                                    style={{ padding: '6px 14px', borderRadius: '20px', border: isSelected ? '1px solid #e50914' : '1px solid #333', backgroundColor: isSelected ? '#e50914' : '#222', color: '#fff', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    {genre}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#aaa' }}>Sort by:</label>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ padding: '8px 12px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', outline: 'none', cursor: 'pointer', fontSize: '14px' }}
                        >
                            <option value="name_asc">Title (A-Z)</option>
                            <option value="name_desc">Title (Z-A)</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                            <option value="duration">Duration: Longest</option>
                        </select>
                    </div>
                </div>

                {/* แสดงการ์ดรายการภาพยนตร์เป็นตาราง Grid */}
                {processedMovies.length === 0 ? (
                    <div style={{ textShadow: 'none', textAlign: 'center', padding: '60px 0', color: '#777' }}>
                        No movies found matching your selection.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                        {processedMovies.map((movie) => (
                            <div 
                                key={movie.movie_id} 
                                onClick={() => navigate(`/movie/${movie.movie_id}`)} 
                                style={{ backgroundColor: '#1f1f1f', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s' }} 
                                className="movie-card-hover"
                            >
                                <div style={{ width: '100%', height: '280px', backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                    <img src={movie.poster_pic ? `http://localhost:3001/uploads/${movie.poster_pic}` : 'https://via.placeholder.com/200x280?text=No+Image'} alt={movie.movie_name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                </div>

                                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'normal', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{movie.movie_name}</h4>
                                        
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', margin: '0 0 12px 0' }}>
                                            {movie.genre ? (
                                                movie.genre.split(',').map((g, index) => (
                                                    <span key={index} style={{ backgroundColor: '#2a2a2a', color: '#aaa', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #3a3a3a' }}>
                                                        {g.trim()}
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ color: '#888', fontSize: '11px' }}>General</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#888', fontSize: '12px' }}>{movie.duration} mins</span>
                                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>฿{movie.price}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <style>{`.movie-card-hover:hover { transform: scale(1.05); }`}</style>
        </div>
    );
}

export default MoviesListUser;