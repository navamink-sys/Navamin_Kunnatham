// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

function AdminEditMember() {
    const navigate = useNavigate();
    const { id } = useParams(); // รับค่า ID สมาชิกจาก URL (เช่น /admin/edit-member/M001)
    const location = useLocation();
    
    // ดึงข้อมูลแอดมินที่กำลังใช้งานอยู่
    const [user, setUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // ดักฟังว่าถ้าแอดมินมีการอัปเดตข้อมูลตัวเอง ข้อมูลตรงนี้ต้องอัปเดตตาม
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

    // ==========================================
    // ตัวแปร State สำหรับเก็บข้อมูลสมาชิกที่ต้องการแก้
    // ==========================================
    const [memberData, setMemberData] = useState({
        member_id: '',
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        phone: '',
        account_status: 'Active',
        role: 'Member'
    });

    const [profileFile, setProfileFile] = useState(null);       // เก็บไฟล์รูปใหม่ (ถ้ามีการเลือกเปลี่ยน)
    const [profilePreview, setProfilePreview] = useState(null); // แสดงตัวอย่างรูปโปรไฟล์บนจอ
    const [message, setMessage] = useState('');                 // ข้อความแจ้งเตือนผลลัพธ์
    const [isSuccess, setIsSuccess] = useState(false);

    // เช็กสิทธิ์แอดมิน ถ้าไม่ใช่ให้เตะออก
    useEffect(() => {
        if (!user || user.role !== 'Admin') {
            navigate('/login');
        }
    }, [user, navigate]);

    // ==========================================
    // ดึงข้อมูลเดิมของสมาชิกคนนี้มาจาก Backend เพื่อใส่ลงฟอร์ม
    // ==========================================
    useEffect(() => {
        axios.get(`http://localhost:3001/api/users`)
            .then(res => {
                // ค้นหาสมาชิกที่มี ID ตรงกับ URL ที่กดเข้ามา
                const currentMember = res.data.find(m => String(m.member_id || m.id || m.user_id) === String(id));
                
                if (currentMember) {
                    setMemberData({
                        member_id: currentMember.member_id || currentMember.id || currentMember.user_id || '',
                        firstname: currentMember.firstname || currentMember.name || '',
                        lastname: currentMember.lastname || '',
                        email: currentMember.email || '',
                        password: '', // พาสเวิร์ดเว้นว่างไว้ ถ้าไม่กรอกแปลว่าไม่เปลี่ยน
                        phone: currentMember.phone || currentMember.tel || '',
                        account_status: currentMember.account_status || currentMember.status || 'Active',
                        role: currentMember.role || 'Member'
                    });

                    // ถ้าสมาชิกมีรูปเดิมอยู่แล้ว ให้ดึงรูปจากโฟลเดอร์ uploads มาโชว์
                    if (currentMember.profile_pic) {
                        setProfilePreview(`http://localhost:3001/uploads/${currentMember.profile_pic}`);
                    }
                } else {
                    setMessage('Member record not found in the system.');
                    setIsSuccess(false);
                }
            })
            .catch(err => {
                console.error(err);
                setMessage('Error loading member details.');
            });
    }, [id]);

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
    // จัดการการพิมพ์ข้อมูล และเลือกไฟล์รูปใหม่
    // ==========================================
    const handleChange = (e) => {
        setMemberData({ ...memberData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileFile(file);
            setProfilePreview(URL.createObjectURL(file));
        }
    };

    // ส่งข้อมูลที่แก้ไขแล้วกลับไปอัปเดตที่ Backend
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append('firstname', memberData.firstname);
        formData.append('lastname', memberData.lastname);
        formData.append('email', memberData.email);
        formData.append('phone', memberData.phone);
        formData.append('account_status', memberData.account_status);
        formData.append('role', memberData.role);
        
        // ถ้ามีการพิมพ์พาสเวิร์ดใหม่ ถึงจะแนบส่งไปเปลี่ยน
        if (memberData.password && memberData.password.trim() !== '') {
            formData.append('password', memberData.password);
        }
        
        // ถ้ามีการเลือกรูปใหม่ ถึงจะแนบส่งไปอัปเดต
        if (profileFile) {
            formData.append('profile_pic', profileFile);
        }

        try {
            await axios.put(`http://localhost:3001/api/users/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            setMessage('Member updated successfully!');
            setIsSuccess(true);
            
            // กรณีพิเศษ: ถ้าแอดมินคนนี้ดันมาแก้ไขข้อมูลแอคเคานต์ของตัวเอง ให้รีเฟรชข้อมูลใน LocalStorage ทันที
            const currentUser = JSON.parse(localStorage.getItem('user'));
            const currentUserId = String(currentUser?.user_id || currentUser?.member_id || currentUser?.id || '');
            
            if (currentUser && currentUserId === String(id)) {
                const resUsers = await axios.get('http://localhost:3001/api/users');
                const updatedAdmin = resUsers.data.find(m => String(m.user_id || m.member_id || m.id) === String(id));
                
                if (updatedAdmin) {
                    localStorage.setItem('user', JSON.stringify(updatedAdmin));
                    setUser(updatedAdmin);
                    window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedAdmin }));
                }
            }
            
            // สำเร็จแล้วดีเลย์เล็กน้อยแล้วกลับไปหน้ารายชื่อสมาชิก
            setTimeout(() => {
                navigate('/admin/members');
            }, 800);

        } catch (error) {
            setIsSuccess(false);
            console.error('Update Error:', error);
            setMessage('Cannot connect to the server.');
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
                    <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 'normal' }}>Edit Member ({id})</h2>
                    <button onClick={() => navigate('/admin/members')} style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>&larr; Back to Member List</button>
                </div>

                {message && (
                    <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', backgroundColor: isSuccess ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)', border: `1px solid ${isSuccess ? '#2e7d32' : '#d32f2f'}`, color: isSuccess ? '#81c784' : '#e57373', textAlign: 'center', fontWeight: 'bold' }}>
                        {message}
                    </div>
                )}

                <div style={{ backgroundColor: '#1f1f1f', padding: '35px', borderRadius: '6px', border: '1px solid #333' }}>
                    <form onSubmit={handleSubmit}>
                        {/* รูปโปรไฟล์เดิม/พรีวิวรูปใหม่ */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '30px' }}>
                            <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>Member ID: {memberData.member_id}</div>
                            <label style={{ 
                                width: '140px', height: '140px', borderRadius: '50%', backgroundColor: '#333',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                                overflow: 'hidden', border: '2px solid #555', position: 'relative'
                            }}>
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                {profilePreview ? (
                                    <img src={profilePreview} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#aaa', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                        <span style={{ fontSize: '12px' }}>Upload Photo</span>
                                    </div>
                                )}
                            </label>
                        </div>

                        {/* ชื่อ และ นามสกุล */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>First Name:</label>
                                <input type="text" name="firstname" value={memberData.firstname} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Last Name:</label>
                                <input type="text" name="lastname" value={memberData.lastname} onChange={handleChange} required style={inputStyle} />
                            </div>
                        </div>

                        {/* อีเมล และ รหัสผ่านใหม่ (ถ้าเว้นว่างไว้คือไม่เปลี่ยน) */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Email Address:</label>
                                <input type="email" name="email" value={memberData.email} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>New Password (Leave blank to keep unchanged):</label>
                                <input type="password" name="password" value={memberData.password} onChange={handleChange} style={inputStyle} placeholder="Enter only to change password" />
                            </div>
                        </div>

                        {/* เบอร์โทรศัพท์ และ สถานะบัญชี (Active/Suspended) */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Phone Number:</label>
                                <input type="text" name="phone" value={memberData.phone} onChange={handleChange} required style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Account Status:</label>
                                <select name="account_status" value={memberData.account_status} onChange={handleChange} style={inputStyle}>
                                    <option value="Active">Active</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>
                        </div>

                        {/* สิทธิ์ผู้ใช้งาน */}
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ fontSize: '14px', color: '#ccc' }}>User Role:</label>
                            <select name="role" value={memberData.role} onChange={handleChange} style={inputStyle}>
                                <option value="Member">Member</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>

                        {/* ปุ่มบันทึกการเปลี่ยนแปลง */}
                        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px' }}>
                            Save Member Changes
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminEditMember;