// ==========================================
//
// ==========================================
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

// ชิ้นส่วนรูปดาวแบบโมเดิร์น พร้อมรองรับการคลิกเลือกดาวและลูกเล่น Hover ขยายใหญ่
const ModernStar = ({ filled, onClick, size = 20, hoverable = false }) => (
    <svg 
        onClick={onClick}
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill={filled ? "#e5e7eb" : "none"} 
        stroke={filled ? "#e5e7eb" : "#555"} 
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ 
            cursor: onClick ? 'pointer' : 'default', 
            transition: 'transform 0.15s ease, fill 0.15s ease',
            filter: filled ? 'drop-shadow(0px 0px 4px rgba(229, 231, 235, 0.2))' : 'none'
        }}
        onMouseEnter={(e) => hoverable && (e.currentTarget.style.transform = 'scale(1.15)')}
        onMouseLeave={(e) => hoverable && (e.currentTarget.style.transform = 'scale(1)')}
    >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

function MovieDetails() {
    const navigate = useNavigate();
    const { id } = useParams(); // รับ Movie ID จาก URL
    const location = useLocation();

    // ดึงข้อมูลผู้ใช้จากเครื่อง
    const [user, setUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });
    const [movie, setMovie] = useState(null);
    
    // ==========================================
    // ตัวแปร State สำหรับข้อมูลรีวิว และสิทธิ์การเช่า
    // ==========================================
    const [reviewsData, setReviewsData] = useState({ reviews: [], averageRating: 0, totalReviews: 0 });
    const [canReview, setCanReview] = useState(false);       // สิทธิ์ในการให้คะแนนดาว (ต้องเช่าและอนุมัติแล้วเท่านั้น)
    const [rating, setRating] = useState(5);                 // คะแนนดาวที่เลือก
    const [hoverRating, setHoverRating] = useState(0);       // ตัวอย่างดาวเวลาเอาเมาส์ไปชี้
    const [rentalStatus, setRentalStatus] = useState(null);  // สถานะการเช่าของยูสเซอร์คนนี้กับหนังเรื่องนี้

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

    // ดึงคะแนนรีวิวของหนังเรื่องนี้
    const fetchReviews = useCallback(async () => {
        try {
            const res = await axios.get(`http://localhost:3001/api/movies/${id}/reviews`);
            setReviewsData(res.data);
        } catch (err) {
            console.error("Error fetching reviews:", err);
        }
    }, [id]);

    // ตรวจสอบว่ายูสเซอร์คนนี้กำลังเช่าหนังเรื่องนี้อยู่ไหม (ถ้าเช่าอยู่จะแสดงปุ่มดูหนัง แทนปุ่มเช่า)
    const checkActiveRental = useCallback(async () => {
        const currentUserId = user?.member_id || user?.id || user?.user_id;
        if (!currentUserId || !id) return;

        try {
            const res = await axios.get(`http://localhost:3001/api/check-active-rental`, {
                params: { member_id: currentUserId, movie_id: id }
            });
            setRentalStatus(res.data);
        } catch (err) {
            console.error("Error checking rental status:", err);
        }
    }, [user, id]);

    // เช็คสิทธิ์และดึงข้อมูลหนัง
    useEffect(() => {
        if (!user || !user.firstname) {
            navigate('/login');
            return;
        }
        axios.get(`http://localhost:3001/api/movies/${id}`)
            .then(res => setMovie(res.data))
            .catch(err => console.error('Failed to load movie details:', err));

        fetchReviews();
        checkActiveRental();
    }, [id, user, navigate, fetchReviews, checkActiveRental]);

    // ตรวจสอบสิทธิ์ว่ามีสิทธิ์เขียนรีวิวให้คะแนนดาวไหม
    useEffect(() => {
        const currentUserId = user?.member_id || user?.id;
        if (currentUserId && id) {
            axios.get(`http://localhost:3001/api/check-review-permission`, {
                params: { member_id: currentUserId, movie_id: id }
            })
            .then(res => setCanReview(res.data.canReview))
            .catch(err => console.error("Error checking review permission:", err));
        }
    }, [user, id]);

    // ==========================================
    // ฟังก์ชันส่งคะแนนรีวิวไปเซฟลง Database
    // ==========================================
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        const currentMemberId = user?.member_id || user?.id || user?.user_id;

        if (!currentMemberId) {
            alert('User profile not found. Please log in again.');
            navigate('/login');
            return;
        }

        try {
            await axios.post(`http://localhost:3001/api/reviews`, {
                movie_id: id,
                member_id: currentMemberId,
                rating: parseInt(rating)
            });
            alert('Review rating submitted successfully!');
            fetchReviews(); // ดึงคะแนนใหม่มาอัปเดตบนหน้าจอทันที
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit movie rating.');
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
        paddingBottom: '4px',
        borderBottom: isActive(path) ? '2px solid #fff' : '2px solid transparent',
        transition: 'border-color 0.2s'
    });

    const getEmbedUrl = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
    };

    const renderModernStars = (count, size = 18) => (
        <div style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((starIndex) => (
                <ModernStar key={starIndex} filled={starIndex <= count} size={size} />
            ))}
        </div>
    );

    if (!movie) {
        return <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
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
                    <input 
                        type="text" 
                        placeholder="Search movies..." 
                        style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', width: '220px', backgroundColor: '#222', color: '#fff', fontSize: '14px', outline: 'none' }} 
                    />
       
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

            <div style={{ padding: '40px 60px', maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* หัวข้อชื่อหนัง และคะแนนดาวเฉลี่ย */}
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

                {/* โปสเตอร์ และวิดีโอตัวอย่างหนัง Trailer */}
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

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
                    
                    {/* รายละเอียดเนื้อเรื่องย่อ ผู้กำกับ นักแสดง */}
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

                    {/* โซนปุ่มสั่งเช่าหนัง / ปุ่มกดดูหนัง (ถ้าเช่าแล้ว) */}
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '10px' }}>
                        
                        {rentalStatus?.status_id === 'S002' ? (
                            // เช่าและอนุมัติแล้ว -> ขึ้นปุ่มสตรีมดูหนังได้ทันที
                            <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '6px', border: '1px solid #10b981', textAlign: 'center' }}>
                                <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '15px', marginBottom: '8px' }}>
                                    ✓ You currently own active rental access
                                </div>
                                <div style={{ color: '#aaa', fontSize: '13px', marginBottom: '15px' }}>
                                    Expires on: <strong style={{ color: '#fff' }}>{rentalStatus.end_date ? new Date(rentalStatus.end_date).toLocaleDateString('en-US') : '-'}</strong>
                                </div>
                                <button 
                                    onClick={() => navigate(`/watch/${movie.movie_id}`)}
                                    style={{ width: '100%', padding: '12px', backgroundColor: '#e50914', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    ▶ Stream Movie Now
                                </button>
                            </div>
                        ) : rentalStatus?.status_id === 'S001' ? (
                            // เพิ่งจ่ายเงินและแนบสลิป อยู่ระหว่างรอแอดมินอนุมัติ
                            <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '6px', border: '1px solid #f59e0b', textAlign: 'center' }}>
                                <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                                    ⏳ Pending payment verification
                                </div>
                                <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '15px' }}>
                                    Duplicate rentals are disabled while verification is in progress.
                                </div>
                                <button 
                                    onClick={() => navigate('/history')}
                                    style={{ width: '100%', padding: '10px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    View Rental History
                                </button>
                            </div>
                        ) : (
                            // ยังไม่เคยเช่า -> โชว์ปุ่มเลือกเช่ารายสัปดาห์ หรือรายเดือนเพื่อไปหน้า Checkout
                            <>
                                <button 
                                    onClick={() => navigate(`/checkout/${movie.movie_id}`)}
                                    style={{ padding: '12px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Rent for THB {movie.price} / WEEK
                                </button>

                                <div style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>or</div>

                                <button 
                                    onClick={() => navigate(`/checkout/${movie.movie_id}`)}
                                    style={{ padding: '12px', backgroundColor: '#333', color: '#fff', fontWeight: 'bold', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Rent for THB {(movie.price * 2.5).toFixed(2)} / MONTH
                                </button>
                            </>
                        )}

                    </div>

                </div>

                {/* ส่วนให้คะแนนดาวรีวิว และอ่านรีวิวของคนอื่น */}
                <div style={{ marginTop: '50px', borderTop: '1px solid #333', paddingTop: '30px' }}>
                    <h3 style={{ fontSize: '22px', marginBottom: '20px' }}>Audience Ratings</h3>

                    {/* ถ้ามีสิทธิ์รีวิว จะแสดงฟอร์มคลิกเลือกดาว */}
                    {canReview ? (
                        <form onSubmit={handleReviewSubmit} style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '6px', marginBottom: '30px', border: '1px solid #444', display: 'flex', alignItems: 'center', gap: '25px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px' }}>Rate this movie:</h4>
                        
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {[1, 2, 3, 4, 5].map((starVal) => (
                                    <div 
                                        key={starVal}
                                        onClick={() => setRating(starVal)}
                                        onMouseEnter={() => setHoverRating(starVal)}
                                        onMouseLeave={() => setHoverRating(0)}
                                    >
                                        <ModernStar 
                                            filled={starVal <= (hoverRating || rating)} 
                                            size={28} 
                                            hoverable={true} 
                                        />
                                    </div>
                                ))}
                                <span style={{ marginLeft: '10px', fontSize: '14px', color: '#e5e7eb', fontWeight: 'bold' }}>
                                    {hoverRating || rating} / 5
                                </span>
                            </div>

                            <button type="submit" style={{ padding: '10px 24px', backgroundColor: '#e50914', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                Submit Rating
                            </button>
                        </form>
                    ) : (
                        <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '6px', marginBottom: '30px', border: '1px solid #333', color: '#888', fontStyle: 'italic' }}>
                            * You must rent and have your payment approved for this movie before submitting a rating.
                        </div>
                    )}

                    {/* รายการรีวิวทั้งหมด */}
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

export default MovieDetails;