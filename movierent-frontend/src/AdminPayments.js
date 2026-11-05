// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function AdminPayments() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ดึงข้อมูลแอดมินจากเครื่อง
    const [currentUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // ==========================================
    // ตัวแปร State สำหรับรายการชำระเงินและตัวกรอง
    // ==========================================
    const [payments, setPayments] = useState([]);               // รายการบิลทั้งหมดจากฐานข้อมูล
    const [loading, setLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState('');           // คำค้นหา
    const [sortBy, setSortBy] = useState('id_desc');             // เรียงลำดับ (ค่าเริ่มต้น: บิลใหม่สุดขึ้นก่อน)
    const [selectedStatus, setSelectedStatus] = useState('All'); // กรองดูเฉพาะบิลรอตรวจ (Pending) หรือประวัติเดิม (History)

    // เช็กสิทธิ์แอดมิน
    useEffect(() => {
        if (!currentUser || currentUser.role !== 'Admin') {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    // ==========================================
    // ดึงรายการบิล และระบบลบบิลประวัติ
    // ==========================================
    // ดึงข้อมูลการชำระเงินทั้งหมดจาก Backend
    const fetchPayments = () => {
        axios.get('http://localhost:3001/api/admin/payments')
            .then(res => {
                setPayments(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching payments:", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    // แอดมินลบประวัติการเช่าออกจากฐานข้อมูลถาวร
    const handleDeleteHistory = async (rentalId) => {
        if (!window.confirm(`Are you sure you want to permanently delete transaction record #${rentalId}?`)) return;

        try {
            await axios.delete(`http://localhost:3001/api/rentals/${rentalId}`);
            alert('Transaction record deleted successfully!');
            fetchPayments(); // ดึงข้อมูลใหม่มาอัปเดตตาราง
        } catch (error) {
            console.error("Error deleting rental:", error);
            alert('Failed to delete transaction record.');
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

    // กำหนดสีป้ายสถานะ (S001 เหลือง=รอตรวจ / S002 เขียว=อนุมัติแล้ว / S003 เทา=หมดอายุ / S004 แดง=ปฏิเสธ)
    const getStatusBadgeStyle = (statusId) => {
        const base = { padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block' };
        if (statusId === 'S001') return { ...base, backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }; 
        if (statusId === 'S002') return { ...base, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }; 
        if (statusId === 'S003') return { ...base, backgroundColor: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af' }; 
        if (statusId === 'S004') return { ...base, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' };   
        return { ...base, backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ccc' };
    };

    // ==========================================
    // ระบบค้นหา และจัดเรียงตารางบิลชำระเงิน
    // ==========================================
    // กรองบิลตามคำค้นหา (ค้นได้ทั้ง รหัสบิล, ชื่อลูกค้า, ชื่อหนัง, อีเมล) และตามสถานะ
    const filteredPayments = payments.filter(p => {
        const id = String(p.rental_id || '');
        const fullName = `${p.firstname} ${p.lastname}`.toLowerCase();
        const movieName = String(p.movie_name || p.title || '').toLowerCase();
        const email = String(p.email || '').toLowerCase();

        const matchesSearch = 
            id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fullName.includes(searchTerm.toLowerCase()) ||
            movieName.includes(searchTerm.toLowerCase()) ||
            email.includes(searchTerm.toLowerCase());

        const matchesStatus = 
            selectedStatus === 'All' || 
            (selectedStatus === 'Pending' && p.status_id === 'S001') ||
            (selectedStatus === 'History' && p.status_id !== 'S001');

        return matchesSearch && matchesStatus;
    });

    // เรียงลำดับรายการบิลในตาราง
    const sortedPayments = [...filteredPayments].sort((a, b) => {
        if (sortBy === 'id_asc') return String(a.rental_id).localeCompare(String(b.rental_id));
        if (sortBy === 'id_desc') return String(b.rental_id).localeCompare(String(a.rental_id));
        if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
        if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
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
                    <button onClick={handleLogout} style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    
                    <div 
                        onClick={() => navigate('/profile')}
                        title={`Admin: ${currentUser?.firstname}`}
                        style={{ 
                            width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#333', 
                            display: 'flex', justifyContent: 'center', alignItems: 'center', 
                            overflow: 'hidden', border: '1px solid #555', cursor: 'pointer' 
                        }}
                    >
                        {currentUser?.profile_pic ? (
                            <img 
                                src={`http://localhost:3001/uploads/${currentUser.profile_pic}`} 
                                alt={currentUser.firstname} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ fontSize: '16px', color: '#aaa', fontWeight: 'bold' }}>
                                {currentUser?.firstname?.charAt(0)?.toUpperCase() || 'A'}
                            </span>
                        )}
                    </div>
                </div>
            </nav>

            <div style={{ padding: '40px 60px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 'normal' }}>Payment List</h2>
                </div>

                {/* แถบเครื่องมือ: ค้นหา, เรียงลำดับ, และกรองดูเฉพาะรายการรอยืนยัน */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '25px', backgroundColor: '#1f1f1f', padding: '15px 20px', borderRadius: '6px', border: '1px solid #333', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <input 
                            type="text" 
                            placeholder="Search by ID, customer name, email, or movie title..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ ...controlStyle, width: '100%', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#aaa' }}>Sort:</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={controlStyle}>
                            <option value="id_desc">Transaction ID (Newest &rarr; Oldest)</option>
                            <option value="id_asc">Transaction ID (Oldest &rarr; Newest)</option>
                            <option value="price_desc">Price (High &rarr; Low)</option>
                            <option value="price_asc">Price (Low &rarr; High)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#aaa' }}>Status:</label>
                        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} style={controlStyle}>
                            <option value="All">All Transactions</option>
                            <option value="Pending">Pending Verification</option>
                            <option value="History">Processed History</option>
                        </select>
                    </div>
                </div>

                {/* ตารางแสดงรายการธุรกรรม */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#1f1f1f', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333' }}>
                    <thead>
                        <tr style={{ color: '#888', fontSize: '14px', borderBottom: '1px solid #333' }}>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>ID</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Customer</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Movie</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Price</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Status</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>Loading payments...</td>
                            </tr>
                        ) : sortedPayments.length > 0 ? (
                            sortedPayments.map((p) => (
                                <tr key={p.rental_id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#ccc', fontWeight: 'bold' }}>{p.rental_id}</td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#fff' }}>
                                        <div>{p.firstname} {p.lastname}</div>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{p.email}</div>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#fff' }}>
                                        <div style={{ fontWeight: '500' }}>{p.movie_name || p.title}</div>
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>Duration: {p.duration_days} days</div>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>฿{Number(p.price || 0).toFixed(2)}</td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px' }}>
                                        <span style={getStatusBadgeStyle(p.status_id)}>{p.status_name}</span>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px' }}>
                                        <span 
                                            onClick={() => navigate(`/admin/payment-details/${p.rental_id}`)} 
                                            style={{ color: '#60a5fa', cursor: 'pointer', marginRight: '20px' }}
                                        >
                                            {p.status_id === 'S001' ? 'Verify' : 'Details'}
                                        </span>
                                        {/* ถ้าไม่ใช่บิลรอตรวจ (เป็นบิลประวัติที่เสร็จสิ้นแล้ว) จะมีปุ่ม Delete ให้ลบได้ */}
                                        {p.status_id !== 'S001' && (
                                            <span 
                                                onClick={() => handleDeleteHistory(p.rental_id)} 
                                                style={{ color: '#ff4d4d', cursor: 'pointer' }}
                                            >
                                                Delete
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No payment records found matching your criteria.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminPayments;