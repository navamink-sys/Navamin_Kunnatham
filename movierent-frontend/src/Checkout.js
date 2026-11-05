// ==========================================
//
// ==========================================
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

function Checkout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams(); // รับ Movie ID จาก URL เพื่อดูว่าจะเช่าเรื่องไหน
    
    // ดึงข้อมูลสมาชิกที่กำลังล็อกอินอยู่
    const [user, setUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // ดึงข้อมูลผู้ใช้ตัวล่าสุดจาก Database มาอัปเดตใหม่อีกรอบ
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
    // ตัวแปร State สำหรับจัดการการจ่ายเงิน
    // ==========================================
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [rentalPlan, setRentalPlan] = useState('week'); // แผนการเช่า (week = 7 วัน, month = 30 วัน)
    const [price, setPrice] = useState(39);                // ยอดเงินที่ต้องโอน
    const [selectedFile, setSelectedFile] = useState(null); // ไฟล์สลิปโอนเงินที่ยูสเซอร์เลือก
    const [previewUrl, setPreviewUrl] = useState(null);    // แสดงตัวอย่างรูปสลิป

    // ตัวแปรสำหรับช่องค้นหาหนังตรงแถบเมนู
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [allMovies, setAllMovies] = useState([]);

    // ระบบจับเวลาถอยหลังการจ่ายเงิน 30 นาที (1800 วินาที)
    const [timeLeft, setTimeLeft] = useState(1800);
    const [isExpired, setIsExpired] = useState(false);

    // ==========================================
    // ระบบนับเวลาถอยหลัง 30 นาที (เซฟลงเครื่องกันยูสเซอร์กดรีเฟรชหนี)
    // ==========================================
    useEffect(() => {
        if (!id) return;
        const timerKey = `checkout_time_${id}`;
        const storedStartTime = localStorage.getItem(timerKey);
        const now = Math.floor(Date.now() / 1000);

        if (storedStartTime) {
            const elapsed = now - parseInt(storedStartTime, 10);
            const remaining = 1800 - elapsed;
            if (remaining <= 0) {
                setTimeLeft(0);
                setIsExpired(true);
            } else {
                setTimeLeft(remaining);
            }
        } else {
            localStorage.setItem(timerKey, now.toString());
            setTimeLeft(1800);
        }

        // นับเวลาถอยหลังทีละ 1 วินาที
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setIsExpired(true);
                    localStorage.removeItem(timerKey); 
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [id]);

    // ถ้าหมดเวลา 30 นาที ให้ดีดกลับไปหน้ารายละเอียดหนังทันที
    useEffect(() => {
        if (isExpired) {
            alert('Payment window expired (30 minutes). This checkout session has been cancelled.');
            navigate(`/movie/${id}`);
        }
    }, [isExpired, navigate, id]);

    // ฟังก์ชันแปลงเลขวินาทีเป็นรูปแบบ นาที:วินาที (เช่น 29:59)
    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // เช็กก่อนว่ามีสิทธิ์เช่าอยู่แล้วหรือยัง ถ้าเช่าอยู่แล้วห้ามจ่ายเงินซ้ำ
    useEffect(() => {
        const userId = user?.user_id || user?.member_id || user?.id;
        if (userId && id) {
            axios.get(`http://localhost:3001/api/check-active-rental`, {
                params: { member_id: userId, movie_id: id }
            })
            .then(res => {
                if (res.data && res.data.isRented) {
                    alert('You currently have an active rental session for this movie.');
                    navigate(`/movie/${id}`);
                }
            })
            .catch(err => console.error("Error checking active rental in checkout:", err));
        }
    }, [user, id, navigate]);

    // ดึงข้อมูลหนังเรื่องที่กำลังจะเช่ามาแสดง
    const fetchMovieDetail = useCallback(async () => {
        try {
            const response = await axios.get(`http://localhost:3001/api/movies/${id}`);
            setMovie(response.data);
            
            if (response.data.price) {
                setPrice(Number(response.data.price));
            }

            const allRes = await axios.get('http://localhost:3001/api/movies');
            setAllMovies(allRes.data);

            setLoading(false);
        } catch (error) {
            console.error('Failed to load movie details:', error);
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchMovieDetail();
    }, [fetchMovieDetail]);

    // ==========================================
    // ฟังก์ชันการทำงานของฟอร์ม
    // ==========================================
    // ค้นหาหนังตรงแถบเมนู
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim() === '') {
            setSearchResults([]);
            setIsDropdownOpen(false);
        } else {
            const filtered = allMovies.filter(m => 
                m.movie_name.toLowerCase().includes(query.toLowerCase())
            );
            setSearchResults(filtered);
            setIsDropdownOpen(true);
        }
    };

    // สลับแพ็กเกจเช่า (สัปดาห์ = ราคาปกติ / เดือน = ราคา x 2.5)
    const handlePlanChange = (plan) => {
        setRentalPlan(plan);
        const basePrice = Number(movie?.price || 39);
        if (plan === 'week') {
            setPrice(basePrice);
        } else {
            setPrice(Number((basePrice * 2.5).toFixed(2)));
        }
    };

    // เมื่อเลือกไฟล์สลิปโอนเงิน
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // ส่งหลักฐานการโอนเงินและข้อมูลการเช่าไปให้ Backend
    const handlePaymentSubmit = async () => {
        if (!selectedFile) {
            alert('Please upload your payment slip before proceeding.');
            return;
        }

        const formData = new FormData();
        formData.append('movie_id', id);
        formData.append('user_id', user?.user_id || user?.member_id || user?.id);
        formData.append('rental_plan', rentalPlan);
        formData.append('amount', price);
        formData.append('slip_payment', selectedFile);

        try {
            const response = await axios.post('http://localhost:3001/api/rentals', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            if (response.status === 200 || response.status === 201) {
                localStorage.removeItem(`checkout_time_${id}`); // เคลียร์ตัวจับเวลาทิ้ง
                alert('Rental request submitted successfully! Awaiting admin verification.');
                navigate('/history'); // ส่งเสร็จพาไปหน้าประวัติการเช่าเพื่อรอยืนยัน
            }
        } catch (error) {
            console.error('Payment checkout error:', error);
            alert(error.response?.data?.message || 'Failed to submit payment information.');
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

    if (loading) {
        return (
            <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                Loading checkout session...
            </div>
        );
    }

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif', paddingBottom: '60px' }}>
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
                                {searchResults.map(m => (
                                    <div 
                                        key={m.movie_id}
                                        onClick={() => {
                                            setIsDropdownOpen(false);
                                            setSearchQuery('');
                                            navigate(`/movie/${m.movie_id}`);
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
                                        {m.movie_name}
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

            {/* เนื้อหาหน้า Checkout */}
            <div style={{ padding: '40px 60px', maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '40px' }}>Order Checkout</h1>

                <div style={{ display: 'flex', gap: '80px', alignItems: 'flex-start' }}>
                    
                    {/* ฝั่งซ้าย: รายละเอียดหนัง, ปุ่มเลือกแพ็กเกจ, และช่องอัปโหลดสลิป */}
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '30px', marginBottom: '40px' }}>
                            <div style={{ width: '180px', height: '260px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #333', flexShrink: 0 }}>
                                <img 
                                    src={movie?.poster_pic ? `http://localhost:3001/uploads/${movie.poster_pic}` : 'https://via.placeholder.com/180x260?text=No+Image'} 
                                    alt={movie?.movie_name} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>

                            <div style={{ fontSize: '14px', color: '#ccc', lineHeight: '1.8', flex: 1 }}>
                                <h2 style={{ fontSize: '22px', color: '#fff', margin: '0 0 10px 0', fontWeight: 'bold' }}>{movie?.movie_name}</h2>
                                
                                <p style={{ margin: '0 0 12px 0', color: '#888' }}>
                                    {movie?.release_date ? movie.release_date.substring(0, 4) : '-'} • {movie?.duration ? `${Math.floor(movie.duration / 60)}h ${movie.duration % 60}m` : '-'}
                                </p>
                                
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                                    {movie?.genre && movie.genre.split(',').map((g, index) => (
                                        <span key={index} style={{ border: '1px solid #555', padding: '3px 10px', borderRadius: '4px', fontSize: '12px', color: '#ccc' }}>
                                            {g.trim()}
                                        </span>
                                    ))}
                                </div>

                                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '20px' }}>
                                    {movie?.description || 'No description available for this movie.'}
                                </p>
                                
                                <div style={{ borderTop: '1px solid #222', paddingTop: '15px', display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px 0' }}>
                                    <span style={{ color: '#fff', fontWeight: 'bold' }}>Director</span> <span style={{ color: '#aaa' }}>{movie?.director || '-'}</span>
                                    <span style={{ color: '#fff', fontWeight: 'bold' }}>Stars</span> <span style={{ color: '#aaa' }}>{movie?.actor || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* ปุ่มเลือกแพ็กเกจระยะเวลาเช่า */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
                            <button 
                                onClick={() => handlePlanChange('week')}
                                style={{
                                    padding: '12px 24px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                                    backgroundColor: rentalPlan === 'week' ? '#fff' : '#333',
                                    color: rentalPlan === 'week' ? '#000' : '#fff',
                                    border: rentalPlan === 'week' ? 'none' : '1px solid #555',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Rent for THB {movie?.price || 39} / WEEK
                            </button>
                            <span style={{ color: '#666' }}>or</span>
                            <button 
                                onClick={() => handlePlanChange('month')}
                                style={{
                                    padding: '12px 24px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                                    backgroundColor: rentalPlan === 'month' ? '#fff' : '#333',
                                    color: rentalPlan === 'month' ? '#000' : '#fff',
                                    border: rentalPlan === 'month' ? 'none' : '1px solid #555',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Rent for THB {(movie?.price ? movie.price * 2.5 : 97.5).toFixed(2)} / MONTH
                            </button>
                        </div>

                        <div style={{ borderBottom: '1px solid #333', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginBottom: '40px' }}>
                            <span style={{ color: '#aaa' }}>Subtotal</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>฿ {price.toFixed(2)}</span>
                        </div>

                        {/* กล่องอัปโหลดรูปภาพสลิปโอนเงิน */}
                        <div style={{ backgroundColor: '#1f1f1f', color: '#fff', padding: '25px', borderRadius: '6px', maxWidth: '420px', border: '1px solid #2a2a2a' }}>
                            <label style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', marginBottom: '15px', color: '#fff' }}>Upload Payment Slip</label>
                            
                            <label style={{
                                border: '1px dashed #444', borderRadius: '4px', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: '#141414', transition: 'border-color 0.2s'
                            }}>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileChange} 
                                    style={{ display: 'none' }} 
                                />
                                <div style={{ backgroundColor: '#2a2a2a', width: '45px', height: '45px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '12px' }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                </div>
                                <span style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>Browse Files</span>
                                <span style={{ fontSize: '12px', color: '#666' }}>Drag and drop receipt image here</span>
                            </label>

                            {selectedFile && (
                                <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#141414', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #333' }}>
                                    {previewUrl && <img src={previewUrl} alt="Slip Preview" style={{ width: '45px', height: '60px', objectFit: 'cover', borderRadius: '2px', border: '1px solid #444' }} />}
                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: '#aaa' }}>
                                        <strong style={{ color: '#fff' }}>Selected file:</strong> <br /> {selectedFile.name}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ฝั่งขวา: กล่องนับเวลาถอยหลัง และ QR Code พร้อมเพย์ */}
                    <div style={{ width: '380px', flexShrink: 0 }}>
                        
                        {/* ตัวเลขนับถอยหลัง 30 นาที */}
                        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '20px', borderRadius: '6px', textAlign: 'center', marginBottom: '25px' }}>
                            <div style={{ fontSize: '14px', marginBottom: '8px' }}>Complete payment & upload slip within:</div>
                            <div style={{ fontSize: '38px', fontWeight: 'bold', letterSpacing: '3px' }}>{formatTime(timeLeft)}</div>
                        </div>

                        <div style={{ borderBottom: '1px solid #333', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginBottom: '25px' }}>
                            <span style={{ color: '#aaa' }}>Total Amount</span>
                            <span style={{ fontWeight: 'bold', color: '#fff' }}>฿ {price.toFixed(2)}</span>
                        </div>

                        {/* กล่องแสดง QR Code พร้อมเพย์สร้างแบบไดนามิกตามราคา */}
                        <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' }}>
                            <img 
                                src={`https://promptpay.io/0825537661/${price}.png`} 
                                alt="PromptPay QR Code" 
                                style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '250px' }}
                            />
                            <p style={{ marginTop: '15px', color: '#444', fontSize: '14px', fontWeight: 'bold' }}>Scan to Pay with PromptPay</p>
                        </div>
                    </div>

                </div>

                {/* ปุ่มกดยืนยันชำระเงินด้านล่างสุด */}
                <div style={{ marginTop: '60px', borderTop: '1px solid #222', paddingTop: '30px' }}>
                    <button
                        onClick={handlePaymentSubmit}
                        disabled={isExpired}
                        style={{
                            padding: '12px 45px', backgroundColor: isExpired ? '#555' : '#fff', color: isExpired ? '#999' : '#000', border: 'none', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: isExpired ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => !isExpired && (e.currentTarget.style.backgroundColor = '#e6e6e6')}
                        onMouseLeave={(e) => !isExpired && (e.currentTarget.style.backgroundColor = '#fff')}
                    >
                        {isExpired ? 'Session Expired' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Checkout;