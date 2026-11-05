// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function AdminAddMovie() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ดึงข้อมูลแอดมินจากเครื่อง
    const [user, setUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // ดักฟังว่าถ้าแอดมินไปแก้โปรไฟล์ตัวเอง ข้อมูลตรงนี้ต้องอัปเดตตามทันที
    useEffect(() => {
        const handleUserUpdate = (event) => {
            if (event.detail) {
                setUser(event.detail);
            } else {
                setUser(JSON.parse(localStorage.getItem('user')) || {});
            }
        };

        window.addEventListener('userUpdated', handleUserUpdate);
        window.addEventListener('storage', handleUserUpdate);

        return () => {
            window.removeEventListener('userUpdated', handleUserUpdate);
            window.removeEventListener('storage', handleUserUpdate);
        };
    }, []);

    // เช็คว่าถ้าไม่ใช่แอดมินให้เตะออก ถ้าเป็นแอดมินให้ไปเอารหัสหนังตัวถัดไปมารอไว้
    useEffect(() => {
        if (!user || user.role !== 'Admin') {
            navigate('/login');
        } else {
            fetchNextMovieId();
        }
    }, [user, navigate]);

    // ไปขอเลข ID หนังลำดับถัดไปจาก Backend (เช่น MOV029)
    const fetchNextMovieId = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/next-movie-id');
            setMovieData(prev => ({ ...prev, movie_id: response.data.nextMovieId }));
        } catch (error) {
            console.error('Error fetching next movie ID:', error);
        }
    };

    // ปุ่มออกจากระบบ
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

    // ==========================================
    // ตัวแปร State สำหรับเก็บข้อมูลหนัง
    // ==========================================
    const [movieData, setMovieData] = useState({
        movie_id: '',
        title: '',
        genre: '',
        director: '',
        actor: '',
        duration: '',
        release_date: '',
        price: '',
        trailer_url: '',
        summary: ''
    });

    const [posterFile, setPosterFile] = useState(null);       // เก็บไฟล์รูปโปสเตอร์ตัวจริง
    const [posterPreview, setPosterPreview] = useState(null); // เก็บ URL ตัวอย่างรูปโปสเตอร์เพื่อนำมาแสดง
    const [videoFile, setVideoFile] = useState(null);         // เก็บไฟล์วิดีโอหนัง (.mp4/.mkv)
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // รายชื่อหมวดหมู่หนังทั้งหมดที่ระบบมีให้เลือก
    const availableGenres = [
        'Action', 'Sci-Fi', 'Drama', 'Adventure', 'Comedy', 
        'Thriller', 'Animation', 'Fantasy', 'Romance', 'Family', 
        'Crime', 'Music', 'Horror', 'Mystery', 'History'
    ];
    const [selectedGenres, setSelectedGenres] = useState([]);         // หมวดหมู่ที่ติ๊กเลือกไว้
    const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false); // ควบคุมการเปิด-ปิดเมนูเลือกหมวดหมู่

    // ==========================================
    // ฟังก์ชันจัดการฟอร์ม และการเลือกไฟล์
    // ==========================================
    const handleChange = (e) => {
        setMovieData({ ...movieData, [e.target.name]: e.target.value });
    };

    // เมื่อเลือกรูปโปสเตอร์หนัง
    const handlePosterChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPosterFile(file);
            setPosterPreview(URL.createObjectURL(file));
        }
    };

    // เมื่อเลือกไฟล์วิดีโอหนังเต็มเรื่อง
    const handleVideoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setVideoFile(file);
        }
    };

    // ระบบติ๊กเลือกหมวดหมู่หนังหลายอัน (กดซ้ำเพื่อเอาออกได้)
    const toggleGenreSelection = (genre) => {
        let updated;
        if (selectedGenres.includes(genre)) {
            updated = selectedGenres.filter(g => g !== genre);
        } else {
            updated = [...selectedGenres, genre];
        }
        setSelectedGenres(updated);
        setMovieData({ ...movieData, genre: updated.join(', ') });
    };

    // ส่งข้อมูลหนัง รูปโปสเตอร์ และไฟล์วิดีโอไปให้ Backend บันทึก
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const formData = new FormData();
        formData.append('movie_id', movieData.movie_id);
        formData.append('movie_name', movieData.title);
        formData.append('genre', movieData.genre);
        formData.append('director', movieData.director);
        formData.append('actor', movieData.actor);
        formData.append('duration', movieData.duration);
        formData.append('release_date', movieData.release_date);
        formData.append('price', movieData.price);
        formData.append('trailer', movieData.trailer_url);
        formData.append('description', movieData.summary);
        formData.append('rental_status', 'Available');
        formData.append('poster', posterFile);
        formData.append('video', videoFile);

        try {
            const response = await axios.post('http://localhost:3001/api/admin/movies', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setIsSuccess(true);
            setMessage('Movie added successfully!');
            alert('Movie added successfully!');
            navigate('/admin/movies'); // บันทึกเสร็จแล้วพาไปหน้ารายชื่อหนัง
        } catch (error) {
            console.error(error);
            setIsSuccess(false);
            const errMsg = error.response?.data?.message || 'Error adding movie.';
            setMessage(errMsg);
            alert(errMsg);
        }
    };

    const inputStyle = {
        width: '100%', padding: '10px', marginTop: '6px',
        backgroundColor: '#222', color: '#fff',
        border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box',
        fontSize: '14px', outline: 'none'
    };

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif' }}>
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: '#000000', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }} onClick={() => navigate('/admin')}>
                    MOVIERENT <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>(Admin)</span>
                </div>

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                    <span style={navLinkStyle('/admin')} onClick={() => navigate('/admin')}>Dashboard</span>
                    <span style={navLinkStyle('/admin/movies')} onClick={() => navigate('/admin/movies')}>Movies</span>
                    <span style={navLinkStyle('/admin/members')} onClick={() => navigate('/admin/members')}>Members</span>
                    <span style={navLinkStyle('/admin/payments')} onClick={() => navigate('/admin/payments')}>Payments</span>
                    <button onClick={handleLogout} style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    
                    <div 
                        onClick={() => navigate('/profile')}
                        title={`Admin: ${user?.firstname}`}
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
                            <span style={{ fontSize: '16px', color: '#aaa', fontWeight: 'bold' }}>
                                {user?.firstname?.charAt(0)?.toUpperCase() || '👤'}
                            </span>
                        )}
                    </div>
                </div>
            </nav>

            <div style={{ padding: '40px 60px', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 'normal' }}>Add New Movie</h2>
                    <button onClick={() => navigate('/admin/movies')} style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>&larr; Back to Movie List</button>
                </div>

                {message && (
                    <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', backgroundColor: isSuccess ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)', border: `1px solid ${isSuccess ? '#2e7d32' : '#d32f2f'}`, color: isSuccess ? '#81c784' : '#e57373', textAlign: 'center', fontWeight: 'bold' }}>
                        {message}
                    </div>
                )}

                <div style={{ backgroundColor: '#1f1f1f', padding: '35px', borderRadius: '6px', border: '1px solid #333' }}>
                    <form onSubmit={handleSubmit}>
                        {/* รหัสหนัง (ล็อคไม่ให้แก้) และ ชื่อหนัง */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Movie ID (Auto Generated):</label>
                                <input type="text" name="movie_id" value={movieData.movie_id} disabled style={{ ...inputStyle, backgroundColor: '#111', color: '#777', cursor: 'not-allowed' }} />
                            </div>
                            <div style={{ flex: 2 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Movie Title:</label>
                                <input type="text" name="title" value={movieData.title} onChange={handleChange} required style={inputStyle} placeholder="Enter movie title" />
                            </div>
                        </div>

                        {/* เมนูดรอปดาวน์สำหรับเลือกหมวดหมู่หนัง */}
                        <div style={{ marginBottom: '20px', position: 'relative' }}>
                            <label style={{ fontSize: '14px', color: '#ccc' }}>Movie Genres (Select multiple):</label>
                            <div onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)} style={{ ...inputStyle, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '41px' }}>
                                <span style={{ color: selectedGenres.length > 0 ? '#fff' : '#888' }}>
                                    {selectedGenres.length > 0 ? selectedGenres.join(', ') : '-- Click to select genres --'}
                                </span>
                                <span>&#9660;</span>
                            </div>

                            {isGenreDropdownOpen && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '4px', zIndex: 10, marginTop: '4px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                    <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                        {availableGenres.map((genre) => (
                                            <div key={genre} onClick={() => toggleGenreSelection(genre)} style={{ padding: '8px 10px', cursor: 'pointer', backgroundColor: selectedGenres.includes(genre) ? '#333' : 'transparent', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '14px' }}>
                                                <span>{genre}</span>
                                                {selectedGenres.includes(genre) && <span style={{ color: '#4ade80' }}>&#10003;</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ผู้กำกับ และ นักแสดงนำ */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Director:</label>
                                <input type="text" name="director" value={movieData.director} onChange={handleChange} required style={inputStyle} placeholder="Director name" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Lead Actors:</label>
                                <input type="text" name="actor" value={movieData.actor} onChange={handleChange} required style={inputStyle} placeholder="Comma-separated names" />
                            </div>
                        </div>

                        {/* ความยาวหนัง (นาที) และ วันที่เข้าฉาย */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Duration (minutes):</label>
                                <input type="number" name="duration" value={movieData.duration} onChange={handleChange} required style={inputStyle} placeholder="e.g. 120" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Release Date:</label>
                                <input type="date" name="release_date" value={movieData.release_date} onChange={handleChange} required style={inputStyle} />
                            </div>
                        </div>

                        {/* ราคาค่าเช่า (บาท) */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Rental Price (THB):</label>
                                <input type="number" step="0.01" name="price" value={movieData.price} onChange={handleChange} required style={inputStyle} placeholder="e.g. 39" />
                            </div>
                        </div>

                        {/* ลิงก์ตัวอย่างหนังบน YouTube */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', color: '#ccc' }}>Trailer URL (YouTube):</label>
                            <input type="text" name="trailer_url" value={movieData.trailer_url} onChange={handleChange} style={inputStyle} placeholder="e.g. https://www.youtube.com/watch?v=..." />
                        </div>

                        {/* เรื่องย่อ */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', color: '#ccc' }}>Synopsis / Description:</label>
                            <textarea name="summary" value={movieData.summary} onChange={handleChange} rows="3" style={{ ...inputStyle, resize: 'vertical' }} placeholder="Brief movie description..."></textarea>
                        </div>

                        {/* อัปโหลดรูปภาพโปสเตอร์ */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', color: '#ccc', display: 'block', marginBottom: '6px' }}>Poster Image:</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ width: '130px', height: '180px', backgroundColor: '#111', border: '1px dashed #555', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                    {posterPreview ? (
                                        <img src={posterPreview} alt="Poster Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: '12px', color: '#666', textAlign: 'center', padding: '10px' }}>No poster</span>
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input type="file" accept="image/*" onChange={handlePosterChange} required style={{ ...inputStyle, border: 'none', padding: '8px 0', backgroundColor: 'transparent' }} />
                                    <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Vertical aspect ratio recommended (JPG, PNG)</p>
                                </div>
                            </div>
                        </div>

                        {/* อัปโหลดไฟล์วิดีโอหนังเต็มเรื่อง */}
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ fontSize: '14px', color: '#ccc', display: 'block', marginBottom: '6px' }}>Full Movie File (MP4/MKV):</label>
                            <input type="file" accept="video/*" onChange={handleVideoChange} required style={{ ...inputStyle, padding: '8px' }} />
                            <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>Upload source video file for stream playback</p>
                        </div>

                        {/* ปุ่มบันทึก */}
                        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px' }}>
                            Save Movie
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminAddMovie;