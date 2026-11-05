// ==========================================
//
// ==========================================
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function GuestMovieList() {
    const navigate = useNavigate();
    const location = useLocation();

    // ==========================================
    // ตัวแปร State เก็บรายการหนังและตัวกรอง
    // ==========================================
    const [movies, setMovies] = useState([]);
    const [selectedGenres, setSelectedGenres] = useState([]); // หมวดหมู่หนังที่เลือกดู (เลือกได้หลายอัน)
    const [sortBy, setSortBy] = useState('name_asc');         // เรียงลำดับ (ค่าเริ่มต้น: ชื่อ A-Z)

    // หมวดหมู่หนังเริ่มต้น
    const defaultGenres = [
        'Action', 'Sci-Fi', 'Drama', 'Adventure', 'Comedy', 
        'Thriller', 'Animation', 'Fantasy', 'Romance', 'Family', 
        'Crime', 'Music', 'Horror', 'Mystery', 'History'
    ];

    // รวบรวมหมวดหมู่ทั้งหมด ไม่ให้มีชื่อซ้ำ
    const availableGenres = Array.from(new Set([
        ...defaultGenres,
        ...movies.flatMap(movie => movie.genre ? movie.genre.split(',').map(g => g.trim()) : [])
    ])).filter(Boolean);

    // ==========================================
    // ดึงข้อมูลหนังจาก Backend
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

    // ฟังก์ชันเวลากดปุ่มแท็กหมวดหมู่หนัง
    const handleGenreClick = (genre) => {
        if (genre === 'All') {
            setSelectedGenres([]); // ถ้ากด All ให้ล้างตัวกรองออกทั้งหมด
        } else {
            setSelectedGenres(prev => {
                if (prev.includes(genre)) return prev.filter(g => g !== genre); 
                return [...prev, genre]; 
            });
        }
    };

    // ==========================================
    // กรองและเรียงลำดับหนังก่อนนำไปแสดงบนหน้าจอ
    // ==========================================
    const processedMovies = movies
        .filter(movie => {
            if (selectedGenres.length === 0) return true; 
            if (!movie.genre) return false;
            
            const movieGenres = movie.genre.split(',').map(g => g.trim());
            return selectedGenres.every(g => movieGenres.includes(g));
        })
        .sort((a, b) => {
            if (sortBy === 'name_asc') return a.movie_name.localeCompare(b.movie_name);
            if (sortBy === 'name_desc') return b.movie_name.localeCompare(a.movie_name);
            if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
            if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
            return 0;
        });

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif' }}>
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: '#000000', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }} onClick={() => navigate('/')}>
                    MOVIERENT
                </div>

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                    <span style={navLinkStyle('/')} onClick={() => navigate('/')}>Home</span>
                    <span style={navLinkStyle('/guest-movies')} onClick={() => navigate('/guest-movies')}>Movies</span>
                    <span style={navLinkStyle('/guest-top10')} onClick={() => navigate('/guest-top10')}>Top 10</span>
                    
                    <button onClick={() => navigate('/login')} style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Login</button>
                    <button onClick={() => navigate('/register')} style={{ padding: '6px 14px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Sign Up</button>
                </div>
            </nav>

            <div style={{ padding: '40px 60px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '5px', fontWeight: 'normal' }}>Movie Catalog</h2>
                <p style={{ color: '#888', fontSize: '14px', marginTop: 0, marginBottom: '25px' }}>Explore and find movies that interest you.</p>
                
                {/* แถบปุ่มแท็กเลือกหมวดหมู่หนัง และเมนูดรอปดาวน์เรียงลำดับ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', backgroundColor: '#181818', padding: '15px 20px', borderRadius: '6px', border: '1px solid #2a2a2a', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                            onClick={() => handleGenreClick('All')}
                            style={{ padding: '6px 14px', borderRadius: '20px', border: selectedGenres.length === 0 ? '1px solid #e50914' : '1px solid #333', backgroundColor: selectedGenres.length === 0 ? '#e50914' : '#222', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                        >
                            All
                        </button>
                        {availableGenres.map((genre) => (
                            <button
                                key={genre}
                                onClick={() => handleGenreClick(genre)}
                                style={{ padding: '6px 14px', borderRadius: '20px', border: selectedGenres.includes(genre) ? '1px solid #e50914' : '1px solid #333', backgroundColor: selectedGenres.includes(genre) ? '#e50914' : '#222', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#aaa' }}>Sort by:</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 12px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', outline: 'none', cursor: 'pointer', fontSize: '14px' }}>
                            <option value="name_asc">Title (A-Z)</option>
                            <option value="name_desc">Title (Z-A)</option>
                            <option value="price_asc">Price: Low to High</option>
                            <option value="price_desc">Price: High to Low</option>
                        </select>
                    </div>
                </div>

                {/* การ์ดแสดงรายการภาพยนตร์เรียงเป็นตาราง Grid */}
                {processedMovies.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#777' }}>No movies found matching your criteria.</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                        {processedMovies.map((movie) => (
                            <div key={movie.movie_id} onClick={() => navigate(`/guest-movie/${movie.movie_id}`)} style={{ backgroundColor: '#1f1f1f', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
                                <div style={{ width: '100%', height: '280px', backgroundColor: '#000', overflow: 'hidden' }}>
                                    <img src={movie.poster_pic ? `http://localhost:3001/uploads/${movie.poster_pic}` : 'https://via.placeholder.com/200x280?text=No+Image'} alt={movie.movie_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 'normal', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{movie.movie_name}</h4>
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', margin: '0 0 12px 0' }}>
                                            {movie.genre ? movie.genre.split(',').map((g, index) => (
                                                <span key={index} style={{ backgroundColor: '#2a2a2a', color: '#aaa', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid #333' }}>{g.trim()}</span>
                                            )) : <span style={{ color: '#888', fontSize: '11px' }}>General</span>}
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
        </div>
    );
}

export default GuestMovieList;