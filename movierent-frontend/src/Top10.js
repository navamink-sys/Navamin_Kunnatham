// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function Top10() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ==========================================
    // ตัวแปร State เก็บข้อมูลหนัง Top 10 และสถานะผู้ใช้
    // ==========================================
    const [topMovies, setTopMovies] = useState([]); // รายชื่อหนัง 10 อันดับยอดนิยม
    const [loading, setLoading] = useState(true);

    // ดึงข้อมูลสมาชิกจากเครื่อง
    const [user] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // ==========================================
    // ดึงข้อมูลหนัง Top 10 จาก Backend
    // ==========================================
    useEffect(() => {
        axios.get('http://localhost:3001/api/movies/top10')
            .then(res => {
                setTopMovies(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching top 10:", err);
                setLoading(false);
            });
    }, []);

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

    // กำหนดขนาดตัวเลขอันดับและตำแหน่ง
    const numberSize = '75px';       
    const numberBottom = '-15px';     
    const posterMarginLeft = '25px';  

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif' }}>
            {/* แถบเมนูด้านบน */}
            <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: '#000', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }} onClick={() => navigate('/home')}>
                    MOVIERENT
                </div>

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
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

            <div style={{ padding: '40px 40px', maxWidth: '1400px', margin: '0 auto' }}>
                
                <h1 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: 'bold' }}>Top 10 Popular Movies</h1>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '40px' }}>Ranked by highest rental count and audience satisfaction ratings.</p>

                {loading ? (
                    <div style={{ color: '#aaa', textAlign: 'center', padding: '50px' }}>Loading top movies data...</div>
                ) : topMovies.length === 0 ? (
                    <div style={{ color: '#aaa', textAlign: 'center', padding: '50px', backgroundColor: '#1f1f1f', borderRadius: '6px', border: '1px solid #333' }}>
                        No rental records found in the system.
                    </div>
                ) : (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateRows: 'auto auto', 
                        gap: '60px 0px', 
                        overflowX: 'auto',
                        paddingBottom: '20px'
                    }}>
                        
                        {/* แถวที่ 1: อันดับที่ 1 ถึง 5 */}
                        <div style={{ display: 'flex', gap: '35px', justifyContent: 'space-between', minWidth: '1200px' }}>
                            {topMovies.slice(0, 5).map((movie, index) => (
                                <div 
                                    key={movie.movie_id}
                                    onClick={() => navigate(`/movie/${movie.movie_id}`)}
                                    style={{ display: 'flex', alignItems: 'flex-end', position: 'relative', width: '220px', height: '185px', cursor: 'pointer' }}
                                    className="top10-card-item"
                                >
                                    {/* ตัวเลขอันดับตัวใหญ่ */}
                                    <div style={{
                                        fontSize: numberSize,
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        position: 'absolute',
                                        left: '0px',
                                        bottom: numberBottom,
                                        zIndex: 2,
                                        lineHeight: '1',
                                        userSelect: 'none'
                                    }}>
                                        {index + 1}
                                    </div>

                                    <div style={{ zIndex: 1, marginLeft: posterMarginLeft, flexShrink: 0 }}>
                                        <div style={{
                                            width: '125px',
                                            height: '185px',
                                            backgroundColor: '#000',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            boxShadow: '0px 10px 25px rgba(0,0,0,0.7)',
                                        }}>
                                            <img src={movie.poster_pic ? `http://localhost:3001/uploads/${movie.poster_pic}` : 'https://via.placeholder.com/125x185?text=No+Image'} alt={movie.movie_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '8px' }}>
                                            <span style={{ color: '#fbbf24', fontSize: '13px' }}>★</span>
                                            <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>
                                                {Number(movie.average_rating || 0).toFixed(1)}
                                                <span style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}> / 5</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* แถวที่ 2: อันดับที่ 6 ถึง 10 */}
                        <div style={{ display: 'flex', gap: '35px', justifyContent: 'space-between', minWidth: '1200px', marginTop: '20px' }}>
                            {topMovies.slice(5, 10).map((movie, index) => (
                                <div 
                                    key={movie.movie_id}
                                    onClick={() => navigate(`/movie/${movie.movie_id}`)}
                                    style={{ display: 'flex', alignItems: 'flex-end', position: 'relative', width: '220px', height: '185px', cursor: 'pointer' }}
                                    className="top10-card-item"
                                >
                                    {/* ตัวเลขอันดับตัวใหญ่ (เลข 10 ปรับเยื้องซ้ายเล็กน้อย) */}
                                    <div style={{
                                        fontSize: numberSize,
                                        fontWeight: '900',
                                        color: '#ffffff',
                                        position: 'absolute',
                                        left: index + 6 === 10 ? '-25px' : '0px',
                                        bottom: numberBottom,
                                        zIndex: 2,
                                        lineHeight: '1',
                                        userSelect: 'none'
                                    }}>
                                        {index + 6}
                                    </div>

                                    <div style={{ zIndex: 1, marginLeft: posterMarginLeft, flexShrink: 0 }}>
                                        <div style={{
                                            width: '125px',
                                            height: '185px',
                                            backgroundColor: '#000',
                                            borderRadius: '4px',
                                            overflow: 'hidden',
                                            boxShadow: '0px 10px 25px rgba(0,0,0,0.7)',
                                        }}>
                                            <img src={movie.poster_pic ? `http://localhost:3001/uploads/${movie.poster_pic}` : 'https://via.placeholder.com/125x185?text=No+Image'} alt={movie.movie_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '8px' }}>
                                            <span style={{ color: '#fbbf24', fontSize: '13px' }}>★</span>
                                            <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>
                                                {Number(movie.average_rating || 0).toFixed(1)}
                                                <span style={{ fontSize: '11px', color: '#888', fontWeight: 'normal' }}> / 5</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                )}
            </div>
            {/* เอฟเฟกต์การ์ดขยายเวลาเอาเมาส์ชี้ */}
            <style>{`
                .top10-card-item {
                    transition: transform 0.2s ease;
                }
                .top10-card-item:hover {
                    transform: scale(1.04);
                }
            `}</style>
        </div>
    );
}

export default Top10;