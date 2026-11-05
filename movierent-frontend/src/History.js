// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function History() {
    const navigate = useNavigate();
    const location = useLocation();

    // ดึงข้อมูลสมาชิกจากเครื่อง
    const [user] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // ==========================================
    // ตัวแปร State เก็บประวัติการเช่า
    // ==========================================
    const [historyList, setHistoryList] = useState([]); // รายการประวัติการเช่าทั้งหมดของคนนี้
    const [loading, setLoading] = useState(true);

    // ==========================================
    // เช็กสิทธิ์ล็อกอิน และดึงประวัติการเช่าจาก Backend
    // ==========================================
    useEffect(() => {
        // ถ้ายังไม่ได้ล็อกอิน ให้ส่งกลับไปหน้าล็อกอิน
        if (!user || !user.email) {
            navigate('/login');
        } else {
            const memberId = user.user_id || user.member_id || user.id;
            axios.get(`http://localhost:3001/api/history/${memberId}`)
                .then(res => {
                    setHistoryList(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error fetching history:', err);
                    setLoading(false);
                });
        }
    }, [user, navigate]);

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

    // กำหนดสีและข้อความของป้ายสถานะการเช่า
    const getStatusStyle = (statusId) => {
        if (statusId === 'S001') return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', text: 'Pending' };  // รอยืนยันสลิป
        if (statusId === 'S002') return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', text: 'Active' };   // อนุมัติแล้ว ดูหนังได้
        if (statusId === 'S003') return { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af', text: 'Expired' };  // หมดอายุการรับชม
        if (statusId === 'S004') return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', text: 'Rejected' };  // สลิปโดนปฏิเสธ
        return { bg: '#222', color: '#ccc', text: 'Unknown' };
    };

    if (loading) {
        return <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading history...</div>;
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
                    <span style={navLinkStyle('/home')} onClick={() => navigate('/home')}>Home</span>
                    <span style={navLinkStyle('/movies')} onClick={() => navigate('/movies')}>Movies</span>
                    <span style={navLinkStyle('/top10')} onClick={() => navigate('/top10')}>Top 10</span>
                    <span style={navLinkStyle('/history')} onClick={() => navigate('/history')}>History</span>
                    
                    <button onClick={handleLogout} style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                        Logout
                    </button>

                    <div onClick={() => navigate('/profile')} style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '1px solid #555', cursor: 'pointer' }}>
                        {user?.profile_pic ? (
                            <img src={`http://localhost:3001/uploads/${user.profile_pic}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '16px' }}>👤</span>
                        )}
                    </div>
                </div>
            </nav>

            {/* ตารางแสดงประวัติรายการเช่าหนัง */}
            <div style={{ padding: '40px 60px', maxWidth: '1050px', margin: '0 auto' }}>
                <h2 style={{ fontSize: '26px', marginBottom: '6px', fontWeight: 'bold' }}>Rental History</h2>
                <p style={{ color: '#888', marginBottom: '35px', fontSize: '14px' }}>Review transaction verification statuses and stream active rental titles.</p>

                {historyList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', backgroundColor: '#1f1f1f', borderRadius: '6px', color: '#aaa', border: '1px solid #333' }}>
                        No rental transactions recorded in your account history.
                    </div>
                ) : (
                    <div style={{ backgroundColor: '#1f1f1f', borderRadius: '6px', border: '1px solid #2a2a2a', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #2a2a2a', color: '#777', fontSize: '13px' }}>
                                    <th style={{ padding: '15px 20px', width: '80px', fontWeight: 'normal' }}>Poster</th>
                                    <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Order Details</th>
                                    <th style={{ padding: '15px 20px', width: '140px', fontWeight: 'normal' }}>Status</th>
                                    <th style={{ padding: '15px 20px', width: '150px', fontWeight: 'normal', textAlign: 'center' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyList.map(item => {
                                    const status = getStatusStyle(item.status_id);
                                    return (
                                        <tr key={item.rental_id} style={{ borderBottom: '1px solid #2a2a2a', transition: 'background 0.2s' }} className="history-row-hover">
                                            
                                            {/* รูปโปสเตอร์หนังขนาดเล็ก */}
                                            <td style={{ padding: '15px 20px', verticalAlign: 'middle' }}>
                                                <div style={{ width: '65px', height: '95px', backgroundColor: '#000', borderRadius: '4px', overflow: 'hidden', border: '1px solid #333' }}>
                                                    <img 
                                                        src={item.poster_pic ? `http://localhost:3001/uploads/${item.poster_pic}` : 'https://via.placeholder.com/65x95?text=No+Image'} 
                                                        alt={item.movie_name} 
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    />
                                                </div>
                                            </td>

                                            {/* ข้อมูลการสั่งเช่า */}
                                            <td style={{ padding: '15px 20px', verticalAlign: 'middle' }}>
                                                <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>
                                                    {item.movie_name}
                                                </h4>
                                                <div style={{ color: '#888', fontSize: '13px', lineHeight: '1.5' }}>
                                                    <div>Rental ID: <span style={{ color: '#aaa' }}>{item.rental_id}</span></div>
                                                    <div>Duration: <span style={{ color: '#aaa' }}>{item.duration_days} days</span></div>
                                                    <div>Total: <span style={{ color: '#fff', fontWeight: '500' }}>฿{Number(item.price || 0).toFixed(2)}</span></div>
                                                </div>
                                            </td>

                                            {/* ป้ายแสดงสถานะบิล */}
                                            <td style={{ padding: '15px 20px', verticalAlign: 'middle' }}>
                                                <span style={{ 
                                                    backgroundColor: status.bg, 
                                                    color: status.color, 
                                                    padding: '5px 12px', 
                                                    borderRadius: '4px', 
                                                    fontSize: '12px', 
                                                    fontWeight: 'bold',
                                                    display: 'inline-block',
                                                    border: `1px solid ${status.color}33`
                                                }}>
                                                    {status.text}
                                                </span>
                                            </td>

                                            {/* ปุ่ม Action ตามสถานะ */}
                                            <td style={{ padding: '15px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                                                {/* ถ้าอนุมัติแล้ว (S002) จะมีปุ่ม Watch Movie ให้กดดูหนังได้ */}
                                                {item.status_id === 'S002' && (
                                                    <button 
                                                        onClick={() => navigate(`/watch/${item.movie_id}`)}
                                                        style={{ padding: '8px 16px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'background 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#cc0812'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e50914'}
                                                    >
                                                        Watch Movie
                                                    </button>
                                                )}

                                                {/* ถ้าบิลโดนปฏิเสธ (S004) จะมีปุ่ม Rent Again ให้กดไปจ่ายเงินใหม่ได้ */}
                                                {item.status_id === 'S004' && (
                                                    <button 
                                                        onClick={() => navigate(`/checkout/${item.movie_id}`)}
                                                        style={{ padding: '7px 14px', backgroundColor: 'transparent', color: '#bbb', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#666'; e.currentTarget.style.color = '#fff'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#bbb'; }}
                                                    >
                                                        Rent Again
                                                    </button>
                                                )}

                                                {/* สถานะอื่นๆ (รอตรวจ หรือ หมดอายุ) */}
                                                {item.status_id !== 'S002' && item.status_id !== 'S004' && (
                                                    <span style={{ color: '#555', fontSize: '13px', fontStyle: 'italic' }}>No action</span>
                                                )}
                                            </td>

                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <style>{`
                .history-row-hover:hover {
                    background-color: #242424;
                }
            `}</style>
        </div>
    );
}

export default History;