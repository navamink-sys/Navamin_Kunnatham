// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function AdminMovieList() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ==========================================
    // ตัวแปร State เก็บข้อมูลและตัวกรอง
    // ==========================================
    const [movies, setMovies] = useState([]); // รายชื่อหนังทั้งหมดจากฐานข้อมูล
    
    // ดึงข้อมูลแอดมินจากเครื่อง
    const [user, setUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

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

    const [searchTerm, setSearchTerm] = useState('');          // ข้อความในช่องค้นหา
    const [sortBy, setSortBy] = useState('id_asc');              // ตัวเลือกเรียงลำดับ
    const [selectedGenre, setSelectedGenre] = useState('All');   // ตัวเลือกกรองหมวดหมู่หนัง

    // รายชื่อหมวดหมู่หนังสำหรับเมนูกรอง
    const availableGenres = [
        'All', 'Action', 'Sci-Fi', 'Drama', 'Adventure', 'Comedy', 
        'Thriller', 'Animation', 'Fantasy', 'Romance', 'Family', 
        'Crime', 'Music', 'Horror', 'Mystery', 'History'
    ];

    // เช็กสิทธิ์แอดมิน ถ้าผ่านให้ไปดึงรายชื่อหนังมาแสดง
    useEffect(() => {
        if (!user || user.role !== 'Admin') {
            navigate('/login');
        }
        fetchMovies();
    }, [user, navigate]);

    // ==========================================
    // ดึงข้อมูลหนัง และระบบลบหนัง
    // ==========================================
    // ดึงรายชื่อหนังทั้งหมดจาก Backend
    const fetchMovies = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/movies');
            setMovies(response.data);
        } catch (error) {
            console.error('Error fetching movies:', error);
        }
    };

    // ลบหนังออกจากระบบ พร้อมถามยืนยันก่อนลบ
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this movie?')) {
            try {
                await axios.delete(`http://localhost:3001/api/movies/${id}`);
                fetchMovies(); // ลบเสร็จให้ดึงข้อมูลใหม่มาอัปเดตตารางทันที
            } catch (error) {
                console.error('Error details:', error);
                alert('Deletion failed: ' + (error.response?.data?.message || error.message));
            }
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

    // ==========================================
    // ระบบค้นหา และจัดเรียงลำดับตารางหนัง
    // ==========================================
    // กรองหนังตามคำค้นหา (ค้นได้ทั้ง รหัสหนัง และ ชื่อหนัง) และตามหมวดหมู่
    const filteredMovies = movies.filter(movie => {
        const matchesSearch = 
            movie.movie_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            movie.movie_name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesGenre = 
            selectedGenre === 'All' || 
            (movie.genre && movie.genre.toLowerCase().includes(selectedGenre.toLowerCase()));

        return matchesSearch && matchesGenre;
    });

    // จัดเรียงลำดับหนังในตาราง
    const sortedMovies = [...filteredMovies].sort((a, b) => {
        if (sortBy === 'id_asc') {
            return a.movie_id.localeCompare(b.movie_id);
        } else if (sortBy === 'id_desc') {
            return b.movie_id.localeCompare(a.movie_id);
        } else if (sortBy === 'name_asc') {
            return a.movie_name.localeCompare(b.movie_name);
        } else if (sortBy === 'name_desc') {
            return b.movie_name.localeCompare(a.movie_name);
        }
        return 0;
    });

    const controlStyle = {
        padding: '8px 12px',
        backgroundColor: '#222',
        color: '#fff',
        border: '1px solid #444',
        borderRadius: '4px',
        fontSize: '14px',
        outline: 'none',
        cursor: 'pointer'
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
                    
                    <button 
                        onClick={handleLogout} 
                        style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                    >
                        Logout
                    </button>

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

            <div style={{ padding: '40px 60px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 'normal' }}>Movie List</h2>
                    <button 
                        onClick={() => navigate('/admin/add-movie')} 
                        style={{ padding: '8px 16px', backgroundColor: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#000', fontSize: '14px' }}
                    >
                        + Add New Movie
                    </button>
                </div>

                {/* แถบเครื่องมือ: ค้นหา, เรียงลำดับ, กรองหมวดหมู่ */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '25px', backgroundColor: '#1f1f1f', padding: '15px 20px', borderRadius: '6px', border: '1px solid #333', alignItems: 'center' }}>
                    
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <input 
                            type="text" 
                            placeholder="Search by ID or movie title..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ ...controlStyle, width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#aaa' }}>Sort:</label>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)} 
                            style={controlStyle}
                        >
                            <option value="id_asc">Movie ID (Ascending)</option>
                            <option value="id_desc">Movie ID (Descending)</option>
                            <option value="name_asc">Title (A &rarr; Z)</option>
                            <option value="name_desc">Title (Z &rarr; A)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#aaa' }}>Genre:</label>
                        <select 
                            value={selectedGenre} 
                            onChange={(e) => setSelectedGenre(e.target.value)} 
                            style={controlStyle}
                        >
                            {availableGenres.map(genre => (
                                <option key={genre} value={genre}>
                                    {genre}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ตารางแสดงรายชื่อภาพยนตร์ */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#1f1f1f', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333' }}>
                    <thead>
                        <tr style={{ color: '#888', fontSize: '14px', borderBottom: '1px solid #333' }}>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>ID</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Movie Name</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Genre</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Price</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedMovies.length > 0 ? (
                            sortedMovies.map((movie) => (
                                <tr key={movie.movie_id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#ccc' }}>{movie.movie_id}</td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#fff' }}>{movie.movie_name}</td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#888' }}>{movie.genre}</td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#fff' }}>฿{movie.price}</td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px' }}>
                                        <span 
                                            onClick={() => navigate(`/admin/edit-movie/${movie.movie_id}`)} 
                                            style={{ color: '#60a5fa', cursor: 'pointer', marginRight: '20px' }}
                                        >
                                            Edit
                                        </span>
                                        <span 
                                            onClick={() => handleDelete(movie.movie_id)} 
                                            style={{ color: '#ff4d4d', cursor: 'pointer' }}
                                        >
                                            Delete
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>
                                    No movies found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminMovieList;