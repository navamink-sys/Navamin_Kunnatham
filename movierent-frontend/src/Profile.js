// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function Profile() {
    const navigate = useNavigate();
    const location = useLocation();

    // ดึงข้อมูลผู้ใช้จากเครื่อง
    const [user, setUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // ==========================================
    // ตัวแปร State สำหรับข้อมูลในฟอร์มแก้ไขโปรไฟล์
    // ==========================================
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        email: '',
        phone: '',
        password: ''
    });

    const [profileFile, setProfileFile] = useState(null);       // ไฟล์รูปภาพโปรไฟล์ใหม่
    const [previewUrl, setPreviewUrl] = useState(null);         // URL แสดงตัวอย่างรูปโปรไฟล์
    const [message, setMessage] = useState('');                 // ข้อความแจ้งเตือนผลลัพธ์
    const [isSuccess, setIsSuccess] = useState(false);
    const [loading, setLoading] = useState(true);

    // ==========================================
    // ดึงข้อมูลโปรไฟล์ล่าสุดของตัวเองจาก Backend
    // ==========================================
    useEffect(() => {
        const userId = user?.user_id || user?.member_id || user?.id;
        
        // ถ้าไม่ได้ล็อกอิน ให้ส่งกลับไปหน้าล็อกอิน
        if (!userId) {
            navigate('/login');
            return;
        }

        axios.get('http://localhost:3001/api/users')
            .then(res => {
                const freshUser = res.data.find(m => String(m.user_id || m.member_id || m.id) === String(userId));
                if (freshUser) {
                    setFormData({
                        firstname: freshUser.firstname || '',
                        lastname: freshUser.lastname || '',
                        email: freshUser.email || '',
                        phone: freshUser.phone || '',
                        password: '' // เว้นว่างไว้เสมอ ถ้าไม่พิมพ์คือไม่เปลี่ยนรหัส
                    });
                    
                    if (freshUser.profile_pic) {
                        setPreviewUrl(`http://localhost:3001/uploads/${freshUser.profile_pic}`);
                    }
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Error fetching user details:", err);
                setLoading(false);
            });
    }, [user, navigate]);

    // ==========================================
    // ฟังก์ชันจัดการฟอร์ม และบันทึกข้อมูล
    // ==========================================
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // เมื่อเลือกรูปภาพโปรไฟล์ใหม่
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // ส่งข้อมูลที่แก้ไขแล้วไปอัปเดตที่ Backend
    const handleSubmit = async (e) => {
        e.preventDefault();
        const userId = user?.user_id || user?.member_id || user?.id;
        
        const data = new FormData();
        data.append('firstname', formData.firstname);
        data.append('lastname', formData.lastname);
        data.append('email', formData.email);
        data.append('phone', formData.phone);
        data.append('role', user.role || 'Member');
        data.append('account_status', user.account_status || 'Active');

        // แนบพาสเวิร์ดเฉพาะเมื่อมีการพิมพ์เปลี่ยนใหม่
        if (formData.password && formData.password.trim() !== '') {
            data.append('password', formData.password);
        }
        // แนบไฟล์รูปเฉพาะเมื่อมีการเลือกรูปใหม่
        if (profileFile) {
            data.append('profile_pic', profileFile);
        }

        try {
            await axios.put(`http://localhost:3001/api/users/${userId}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setMessage('Profile updated successfully!');
            setIsSuccess(true);
            
            // ดึงข้อมูลที่เพิ่งอัปเดตใหม่มาเซฟทับลง LocalStorage ทันที
            const resUsers = await axios.get('http://localhost:3001/api/users');
            const updatedUser = resUsers.data.find(m => String(m.user_id || m.member_id || m.id) === String(userId));
            
            if (updatedUser) {
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser);
                // ยิง Event ให้แถบ Navbar ทุกหน้าอัปเดตรูปและชื่อตามทันที
                window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
            }

            setFormData(prev => ({ ...prev, password: '' })); // ล้างช่องกรอกรหัสผ่าน
        } catch (error) {
            setIsSuccess(false);
            setMessage(error.response?.data?.message || 'Unable to connect to the server.');
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

    const inputStyle = {
        width: '100%', padding: '12px 15px', marginTop: '6px',
        backgroundColor: '#222', color: '#fff',
        border: '1px solid #444', borderRadius: '4px', boxSizing: 'border-box',
        fontSize: '14px', outline: 'none'
    };

    if (loading) return <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading profile...</div>;

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif' }}>
            
            {/* แถบเมนูด้านบน (สลับเมนูอัตโนมัติว่าเป็นแอดมินหรือสมาชิกทั่วไป) */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: '#000000', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }} onClick={() => navigate(user?.role === 'Admin' ? '/admin' : '/home')}>
                    MOVIERENT {user?.role === 'Admin' && <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>(Admin)</span>}
                </div>

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                    {user?.role === 'Admin' ? (
                        <>
                            <span style={navLinkStyle('/admin')} onClick={() => navigate('/admin')}>Dashboard</span>
                            <span style={navLinkStyle('/admin/movies')} onClick={() => navigate('/admin/movies')}>Movies</span>
                            <span style={navLinkStyle('/admin/members')} onClick={() => navigate('/admin/members')}>Members</span>
                            <span style={navLinkStyle('/admin/payments')} onClick={() => navigate('/admin/payments')}>Payments</span>
                        </>
                    ) : (
                        <>
                            <span style={navLinkStyle('/home')} onClick={() => navigate('/home')}>Home</span>
                            <span style={navLinkStyle('/movies')} onClick={() => navigate('/movies')}>Movies</span>
                            <span style={navLinkStyle('/top10')} onClick={() => navigate('/top10')}>Top 10</span>
                            <span style={navLinkStyle('/history')} onClick={() => navigate('/history')}>History</span>
                        </>
                    )}
                    
                    <button onClick={handleLogout} style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Logout</button>
                    
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '1px solid #fff' }}>
                        {user?.profile_pic ? (
                            <img src={`http://localhost:3001/uploads/${user.profile_pic}`} alt={user.firstname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '16px' }}>👤</span>
                        )}
                    </div>
                </div>
            </nav>

            <div style={{ padding: '40px 60px', maxWidth: '700px', margin: '0 auto' }}>
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '28px', margin: '0 0 5px 0', fontWeight: 'bold' }}>Manage Profile</h2>
                    <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>Update your account details and password</p>
                </div>

                {/* กล่องแจ้งเตือนผลลัพธ์ */}
                {message && (
                    <div style={{ padding: '15px', marginBottom: '25px', borderRadius: '4px', backgroundColor: isSuccess ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)', border: `1px solid ${isSuccess ? '#2e7d32' : '#d32f2f'}`, color: isSuccess ? '#81c784' : '#e57373', textAlign: 'center', fontWeight: 'bold' }}>
                        {message}
                    </div>
                )}

                <div style={{ backgroundColor: '#1f1f1f', padding: '40px', borderRadius: '8px', border: '1px solid #333' }}>
                    <form onSubmit={handleSubmit}>
                        
                        {/* รูปโปรไฟล์ทรงกลม สามารถคลิกเพื่อเลือกเปลี่ยนรูปได้ */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '35px' }}>
                            <label style={{ 
                                width: '130px', height: '130px', borderRadius: '50%', backgroundColor: '#111',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                                overflow: 'hidden', border: '2px solid #555', position: 'relative', transition: 'border-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fff'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = '#555'}
                            >
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '32px' }}>+</span>
                                        <span style={{ fontSize: '12px' }}>Change Photo</span>
                                    </div>
                                )}
                            </label>
                            <span style={{ fontSize: '14px', color: '#888', marginTop: '15px' }}>
                                Role: <strong style={{ color: user.role === 'Admin' ? '#60a5fa' : '#4ade80' }}>{user.role}</strong>
                            </span>
                        </div>

                        {/* ชื่อ และ นามสกุล */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>First Name:</label>
                                <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Last Name:</label>
                                <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} required style={inputStyle} />
                            </div>
                        </div>

                        {/* อีเมล */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', color: '#ccc' }}>Email Address:</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} required style={inputStyle} />
                        </div>

                        {/* เบอร์โทรศัพท์ */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', color: '#ccc' }}>Phone Number:</label>
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} />
                        </div>

                        {/* รหัสผ่านใหม่ (ถ้าไม่ต้องการเปลี่ยนให้เว้นว่างไว้) */}
                        <div style={{ marginBottom: '35px' }}>
                            <label style={{ fontSize: '14px', color: '#ccc' }}>New Password (Leave blank to keep unchanged):</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} style={inputStyle} placeholder="Enter a new password" />
                        </div>

                        {/* ปุ่มบันทึกการเปลี่ยนแปลง */}
                        <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e5e5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                            Save Profile Changes
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Profile;