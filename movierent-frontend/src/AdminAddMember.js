// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function AdminAddMember() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ดึงข้อมูลแอดมินที่ล็อกอินค้างไว้อยู่ในเครื่อง
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

    // ==========================================
    // ตัวแปร State สำหรับเก็บข้อมูลในฟอร์ม
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

    const [profileFile, setProfileFile] = useState(null);       // เก็บไฟล์รูปโปรไฟล์ตัวจริง
    const [profilePreview, setProfilePreview] = useState(null); // เก็บ URL เอาไว้โชว์ตัวอย่างรูปบนจอ
    const [message, setMessage] = useState('');                 // ข้อความแจ้งเตือนผลลัพธ์
    const [isSuccess, setIsSuccess] = useState(false);          // เช็คว่าทำสำเร็จหรือพัง

    // ==========================================
    // เช็กสิทธิ์แอดมิน และดึงรหัสสมาชิกถัดไปมารอไว้
    // ==========================================
    useEffect(() => {
        // ถ้าไม่ได้ล็อกอิน หรือไม่ใช่แอดมิน ให้เตะกลับไปหน้าล็อกอิน
        if (!user || user.role !== 'Admin') {
            navigate('/login');
        } else {
            fetchNextMemberId(); // ไปเอารหัสสมาชิกตัวต่อไปมารอเลย
        }
    }, [user, navigate]);

    // ไปถาม Backend ว่ารหัสสมาชิกล่าสุดคืออะไร แล้วเอารหัสถัดไปมาใส่ฟอร์มให้อัตโนมัติ
    const fetchNextMemberId = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/next-member-id');
            setMemberData(prev => ({ ...prev, member_id: response.data.nextMemberId }));
        } catch (error) {
            console.error('Error fetching next member ID:', error);
        }
    };

    // ปุ่มออกจากระบบ
    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const isActive = (path) => location.pathname === path;

    // สไตล์ของลิงก์บนแถบเมนูด้านบน (ถ้าอยู่หน้านั้นจะมีขีดเส้นใต้สีขาว)
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
    // ฟังก์ชันจัดการเมื่อพิมพ์ข้อมูล หรือเลือกไฟล์รูป
    // ==========================================
    // อัปเดตข้อมูลตัวหนังสือในฟอร์มตามที่พิมพ์
    const handleChange = (e) => {
        setMemberData({ ...memberData, [e.target.name]: e.target.value });
    };

    // เมื่อแอดมินเลือกไฟล์รูปภาพ ให้เก็บไฟล์และสร้างลิงก์ตัวอย่างรูป
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileFile(file);
            setProfilePreview(URL.createObjectURL(file));
        }
    };

    // เมื่อกดปุ่มเซฟ ส่งข้อมูลสมาชิกทั้งหมดไปให้ Backend บันทึก
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // แพ็กข้อมูลทั้งหมดเป็น FormData เพื่อให้ส่งไฟล์รูปได้
        const formData = new FormData();
        formData.append('firstname', memberData.firstname);
        formData.append('lastname', memberData.lastname);
        formData.append('email', memberData.email);
        formData.append('password', memberData.password);
        formData.append('phone', memberData.phone);
        formData.append('account_status', memberData.account_status);
        formData.append('role', memberData.role);
        
        if (profileFile) {
            formData.append('profile_pic', profileFile);
        }

        try {
            const response = await axios.post('http://localhost:3001/api/register', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage(response.data.message || 'Member account created successfully!');
            setIsSuccess(true);
            
            // สำเร็จแล้วรอ 1.5 วินาที แล้วพาเด้งกลับไปหน้ารายชื่อสมาชิก
            setTimeout(() => navigate('/admin/members'), 1500);
        } catch (error) {
            setIsSuccess(false);
            if (error.response) {
                setMessage(error.response.data.message);
            } else {
                setMessage('Cannot connect to the server.');
            }
        }
    };

    // สไตล์ตกแต่งช่องกรอกข้อมูล
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
            {/* แถบเมนูด้านบนของแอดมิน */}
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
                                {user?.firstname?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        )}
                    </div>
                </div>
            </nav>

            {/* กล่องเนื้อหาฟอร์มเพิ่มสมาชิก */}
            <div style={{ padding: '40px 60px', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                    <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 'normal' }}>Add New Member</h2>
                    <button onClick={() => navigate('/admin/members')} style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>&larr; Back to Member List</button>
                </div>

                {/* กล่องแจ้งเตือนผลลัพธ์ (เขียว=สำเร็จ / แดง=มีข้อผิดพลาด) */}
                {message && (
                    <div style={{ padding: '12px', marginBottom: '20px', borderRadius: '4px', backgroundColor: isSuccess ? 'rgba(46, 125, 50, 0.2)' : 'rgba(211, 47, 47, 0.2)', border: `1px solid ${isSuccess ? '#2e7d32' : '#d32f2f'}`, color: isSuccess ? '#81c784' : '#e57373', textAlign: 'center', fontWeight: 'bold' }}>
                        {message}
                    </div>
                )}

                <div style={{ backgroundColor: '#1f1f1f', padding: '35px', borderRadius: '6px', border: '1px solid #333' }}>
                    <form onSubmit={handleSubmit}>
                        {/* ส่วนอัปโหลดรูปโปรไฟล์ทรงกลม */}
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
                                <input type="text" name="firstname" value={memberData.firstname} onChange={handleChange} required style={inputStyle} placeholder="First name" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Last Name:</label>
                                <input type="text" name="lastname" value={memberData.lastname} onChange={handleChange} required style={inputStyle} placeholder="Last name" />
                            </div>
                        </div>

                        {/* อีเมล และ รหัสผ่าน */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Email Address:</label>
                                <input type="email" name="email" value={memberData.email} onChange={handleChange} required style={inputStyle} placeholder="example@email.com" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Password:</label>
                                <input type="password" name="password" value={memberData.password} onChange={handleChange} required style={inputStyle} placeholder="Enter account password" />
                            </div>
                        </div>

                        {/* เบอร์โทรศัพท์ และ สถานะบัญชี */}
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Phone Number:</label>
                                <input type="text" name="phone" value={memberData.phone} onChange={handleChange} required style={inputStyle} placeholder="e.g. 0987654321" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '14px', color: '#ccc' }}>Account Status:</label>
                                <select name="account_status" value={memberData.account_status} onChange={handleChange} style={inputStyle}>
                                    <option value="Active">Active</option>
                                    <option value="Suspended">Suspended</option>
                                </select>
                            </div>
                        </div>

                        {/* สิทธิ์ผู้ใช้งาน (Member หรือ Admin) */}
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ fontSize: '14px', color: '#ccc' }}>User Role:</label>
                            <select name="role" value={memberData.role} onChange={handleChange} style={inputStyle}>
                                <option value="Member">Member</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>

                        {/* ปุ่มกดยืนยันบันทึกข้อมูล */}
                        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '15px' }}>
                            Save Member
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AdminAddMember;