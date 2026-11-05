// ==========================================
//
// ==========================================
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Register() {
    const navigate = useNavigate();
    
    // ==========================================
    // ตัวแปร State สำหรับเก็บข้อมูลการสมัครสมาชิก
    // ==========================================
    const [formData, setFormData] = useState({
        firstname: '',
        lastname: '',
        phone: '',
        email: '',
        password: ''
    });

    const [profileFile, setProfileFile] = useState(null);       // เก็บไฟล์รูปโปรไฟล์ที่อัปโหลด
    const [previewUrl, setPreviewUrl] = useState(null);         // URL แสดงตัวอย่างรูปโปรไฟล์
    const [message, setMessage] = useState('');                 // ข้อความแจ้งเตือนผลลัพธ์
    const [isSuccess, setIsSuccess] = useState(false);

    // อัปเดตข้อมูลตัวหนังสือในฟอร์ม
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // เมื่อเลือกไฟล์รูปภาพโปรไฟล์
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    // ==========================================
    // ส่งข้อมูลการสมัครสมาชิกไปให้ Backend
    // ==========================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const data = new FormData();
        data.append('firstname', formData.firstname);
        data.append('lastname', formData.lastname);
        data.append('email', formData.email);
        data.append('password', formData.password);
        data.append('phone', formData.phone);
        if (profileFile) {
            data.append('profile_pic', profileFile);
        }

        try {
            const response = await axios.post('http://localhost:3001/api/register', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage('Registration successful!');
            setIsSuccess(true);
            setFormData({ firstname: '', lastname: '', phone: '', email: '', password: '' });
            setProfileFile(null);
            setPreviewUrl(null);
            
            // สมัครเสร็จแล้ว รอ 2 วินาทีแล้วพาไปหน้าล็อกอิน
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            setIsSuccess(false);
            if (error.response) {
                setMessage(error.response.data.message);
            } else {
                setMessage('Cannot connect to the server.');
            }
        }
    };

    const inputStyle = {
        width: '100%', padding: '10px 0', marginTop: '5px',
        backgroundColor: 'transparent', color: '#333',
        border: 'none', borderBottom: '1px solid #ccc',
        outline: 'none', fontSize: '14px', boxSizing: 'border-box'
    };

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column' }}>
            {/* แถบเมนูด้านบน */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: '#000000', borderBottom: '1px solid #222', color: '#ffffff', flexShrink: 0 }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer' }} onClick={() => navigate('/')}>
                    MOVIERENT
                </div>

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                    <input type="text" placeholder="Search movies..." style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', width: '220px', backgroundColor: '#222', color: '#fff', fontSize: '14px', outline: 'none' }} />
                    <span style={{ cursor: 'pointer', fontSize: '14px' }} onClick={() => navigate('/')}>Home</span>
                    <span style={{ cursor: 'pointer', fontSize: '14px' }} onClick={() => navigate('/guest-movies')}>Movies</span>
                    <span style={{ cursor: 'pointer', fontSize: '14px' }} onClick={() => navigate('/guest-top10')}>Top 10</span>
                    <button onClick={() => navigate('/login')} style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>Login</button>
                    <button onClick={() => navigate('/register')} style={{ padding: '6px 14px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Sign Up</button>
                </div>
            </nav>

            {/* กล่องสีขาวกรอกข้อมูลสมัครสมาชิก */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px', flex: 1 }}>
                <div style={{ width: '100%', maxWidth: '450px', padding: '40px', backgroundColor: '#ffffff', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                        <h2 style={{ fontSize: '24px', color: '#000', margin: '0 0 5px 0', fontWeight: 'normal' }}>Create an Account</h2>
                        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Join us and start watching your favorite movies.</p>
                    </div>

                    {/* กล่องแจ้งเตือนผลลัพธ์ */}
                    {message && (
                        <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: isSuccess ? '#d4edda' : '#f8d7da', color: isSuccess ? '#155724' : '#721c24', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* ส่วนอัปโหลดรูปโปรไฟล์ทรงกลม */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                            <label style={{ 
                                width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#f0f0f0',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                                overflow: 'hidden', border: '1px dashed #ccc', position: 'relative'
                            }}>
                                <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#888' }}>
                                        <span style={{ fontSize: '24px' }}>+</span>
                                        <div style={{ fontSize: '11px', marginTop: '2px' }}>Upload Photo</div>
                                    </div>
                                )}
                            </label>
                        </div>

                        {/* ชื่อ และ นามสกุล */}
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <input type="text" name="firstname" value={formData.firstname} onChange={handleChange} placeholder="First Name" required style={inputStyle} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <input type="text" name="lastname" value={formData.lastname} onChange={handleChange} placeholder="Last Name" required style={inputStyle} />
                            </div>
                        </div>

                        {/* เบอร์โทรศัพท์ */}
                        <div style={{ marginBottom: '15px' }}>
                            <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone Number" required style={inputStyle} />
                        </div>

                        {/* อีเมล */}
                        <div style={{ marginBottom: '15px' }}>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" required style={inputStyle} />
                        </div>

                        {/* รหัสผ่าน */}
                        <div style={{ marginBottom: '30px' }}>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Password" required style={inputStyle} />
                        </div>

                        {/* ปุ่มกดสมัครสมาชิก */}
                        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>
                            Sign Up
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '13px', color: '#666', margin: 0 }}>
                        Already have an account? <span onClick={() => navigate('/login')} style={{ color: '#000', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>Login</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;