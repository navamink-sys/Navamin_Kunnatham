// ==========================================
//
// ==========================================
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// ชิ้นส่วนไอคอนดาวคะแนนรีวิว
const ModernStar = ({ filled, size = 20 }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? "#e5e7eb" : "none"}
        stroke={filled ? "#e5e7eb" : "#555"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
            filter: filled ? 'drop-shadow(0px 0px 4px rgba(229, 231, 235, 0.2))' : 'none'
        }}
    >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

function GuestMovieDetails() {
    const navigate = useNavigate();
    const { id } = useParams(); // รับ Movie ID จาก URL
    const location = useLocation();

    // ==========================================
    // ตัวแปร State เก็บข้อมูลหนังและรีวิว
    // ==========================================
    const [movie, setMovie] = useState(null);
    const [reviewsData, setReviewsData] = useState({ reviews: [], averageRating: 0, totalReviews: 0 });
    const [loading, setLoading] = useState(true);

    // ดึงคะแนนรีวิวทั้งหมดของหนังเรื่องนี้
    const fetchReviews = useCallback(async () => {
        try {
            const res = await axios.get(`http://localhost:3001/api/movies/${id}/reviews`);
            setReviewsData(res.data);
        } catch (err) {
            console.error("Error fetching reviews:", err);
        }
    }, [id]);

    // ==========================================
    // ดึงรายละเอียดหนัง และเลื่อนหน้าจอขึ้นบนสุด
    // ==========================================
    useEffect(() => {
        setLoading(true);
        axios.get(`http://localhost:3001/api/movies/${id}`)
            .then(res => setMovie(res.data))
            .catch(err => console.error('Failed to load movie details:', err))
            .finally(() => setLoading(false));

        fetchReviews();
        window.scrollTo(0, 0); // เลื่อนหน้าจอกลับขึ้นไปบนสุด
    }, [id, fetchReviews]);

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

    // แปลงลิงก์ YouTube ทั่วไปให้เป็นลิงก์แบบ Embed เพื่อใส่ในแท็ก iframe ได้
    const getEmbedUrl = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
    };

    // ฟังก์ชันวาดดาว 5 ดวง
    const renderModernStars = (count, size = 18) => (
        <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((starIndex) => (
                <ModernStar key={starIndex} filled={starIndex <= count} size={size} />
            ))}
        </div>
    );

    // คนทั่วไปกดปุ่มเช่า จะถูกส่งไปหน้าล็อกอินก่อน
    const goToLogin = () => navigate('/login');

    if (loading) {
        return (
            <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                Loading...
            </div>
        );
    }

    if (!movie) {
        return (
            <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                <p>Movie details not found.</p>
                <button
                    onClick={() => navigate('/guest-movies')}
                    style={{ padding: '10px 20px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    Back to Movies
                </button>
            </div>
        );
    }

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif' }}>
            <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: '#000000', borderBottom: '1px solid #222' }}>
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

            <div style={{ padding: '40px 60px', maxWidth: '1200px', margin: '0 auto' }}>

                {/* หัวข้อชื่อเรื่อง และคะแนนดาวเฉลี่ย */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                    <h1 style={{ fontSize: '48px', margin: 0, fontWeight: 'bold' }}>{movie.movie_name}</h1>

                    <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '20px', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ModernStar filled={true} size={22} />
                                <strong>{reviewsData.averageRating}</strong>
                                <span style={{ fontSize: '14px', color: '#888' }}>/5</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>RATING ({reviewsData.totalReviews} ratings)</div>
                        </div>
                    </div>
                </div>

                {/* โปสเตอร์หนัง และตัวเล่นวิดีโอตัวอย่างหนัง (Trailer) */}
                <div style={{ display: 'flex', gap: '20px', height: '420px', marginBottom: '30px' }}>
                    <div style={{ width: '280px', flexShrink: 0, backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden' }}>
                        <img
                            src={movie.poster_pic ? `http://localhost:3001/uploads/${movie.poster_pic}` : 'https://via.placeholder.com/280x420?text=No+Image'}
                            alt={movie.movie_name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>

                    <div style={{ flex: 1, backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {movie.trailer ? (
                            <iframe
                                width="100%"
                                height="100%"
                                src={getEmbedUrl(movie.trailer)}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <div style={{ color: '#666' }}>
                                <h3>Trailer Unavailable</h3>
                            </div>
                        )}
                    </div>
                </div>

                {/* รายละเอียดเนื้อเรื่องย่อ, ผู้กำกับ, นักแสดง และปุ่มกดเช่า */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>

                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            {movie.genre && movie.genre.split(',').map((g, index) => (
                                <span key={index} style={{ border: '1px solid #555', padding: '5px 15px', borderRadius: '4px', fontSize: '13px', color: '#ccc' }}>
                                    {g.trim()}
                                </span>
                            ))}
                        </div>

                        <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#ddd', marginBottom: '30px' }}>
                            {movie.description || 'No description available for this movie.'}
                        </p>

                        <div style={{ borderTop: '1px solid #333' }}>
                            <div style={{ display: 'flex', padding: '15px 0', borderBottom: '1px solid #333' }}>
                                <div style={{ width: '120px', fontWeight: 'bold', fontSize: '15px' }}>Director</div>
                                <div style={{ color: '#aaa', fontSize: '15px' }}>{movie.director || '-'}</div>
                            </div>
                            <div style={{ display: 'flex', padding: '15px 0', borderBottom: '1px solid #333' }}>
                                <div style={{ width: '120px', fontWeight: 'bold', fontSize: '15px' }}>Stars</div>
                                <div style={{ color: '#aaa', fontSize: '15px' }}>{movie.actor || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* ปุ่มราคาค่าเช่า (กดแล้วจะส่งไปล็อกอิน) */}
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '10px' }}>
                        <button
                            onClick={goToLogin}
                            style={{ padding: '12px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                        >
                            Rent for THB {movie.price} / WEEK
                        </button>

                        <div style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>or</div>

                        <button
                            onClick={goToLogin}
                            style={{ padding: '12px', backgroundColor: '#333', color: '#fff', fontWeight: 'bold', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                        >
                            Rent for THB {(movie.price * 2.5).toFixed(2)} / MONTH
                        </button>

                        <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginTop: '5px' }}>
                            * Please login or create an account before renting.
                        </p>
                    </div>

                </div>

                {/* ส่วนแสดงรีวิวจากผู้ใช้คนอื่นๆ */}
                <div style={{ marginTop: '50px', borderTop: '1px solid #333', paddingTop: '30px' }}>
                    <h3 style={{ fontSize: '22px', marginBottom: '20px' }}>Audience Ratings</h3>

                    <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '6px', marginBottom: '30px', border: '1px solid #333', color: '#888', fontStyle: 'italic' }}>
                        * Please login and rent this movie to rate it.
                    </div>

                    <div>
                        {reviewsData.reviews.length > 0 ? (
                            reviewsData.reviews.map((rev) => (
                                <div key={rev.review_id} style={{ backgroundColor: '#1f1f1f', padding: '15px 20px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#444', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {rev.profile_pic ? (
                                                <img src={`http://localhost:3001/uploads/${rev.profile_pic}`} alt={rev.firstname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : '👤'}
                                        </div>
                                        <strong style={{ fontSize: '15px' }}>{rev.firstname} {rev.lastname}</strong>
                                    </div>
                                    <div>
                                        {renderModernStars(rev.rating, 18)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p style={{ color: '#666', fontStyle: 'italic' }}>No ratings available for this movie yet.</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default GuestMovieDetails;