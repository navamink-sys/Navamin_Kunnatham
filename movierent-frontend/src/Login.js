// ==========================================
//
// ==========================================
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
    const navigate = useNavigate();
    
    // ==========================================
    // ตัวแปร State เก็บข้อมูลกรอกฟอร์ม และข้อความแจ้งเตือน
    // ==========================================
    const [loginData, setLoginData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');

    // อัปเดตข้อมูลเมื่อพิมพ์อีเมลหรือรหัสผ่าน
    const handleChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    // ==========================================
    // ส่งข้อมูลไปตรวจกับ Backend ตอนกดยืนยันล็อกอิน
    // ==========================================
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3001/api/login', loginData);
            const loggedInUser = response.data.user;
            
            // บันทึกข้อมูลผู้ใช้ลง LocalStorage ของเบราว์เซอร์ เพื่อให้จำสถานะล็อกอินไว้ได้
            localStorage.setItem('user', JSON.stringify(loggedInUser));

            // แยกทางเดิน: ถ้าเป็น Admin ส่งไปหน้า /admin ถ้าเป็น Member ทั่วไปส่งไปหน้า /home
            if (loggedInUser.role === 'Admin') {
                navigate('/admin');
            } else {
                navigate('/home');
            }
        } catch (error) {
            // ถ้าล็อกอินไม่ผ่าน ให้ดึงข้อความแจ้งเตือนจาก Backend มาโชว์
            if (error.response) {
                setMessage(error.response.data.message);
            } else {
                setMessage('Cannot connect to the server.');
            }
        }
    };

    const inputStyle = {
        width: '100%', padding: '10px 0', marginTop: '10px',
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

            {/* การ์ดสีขาวสำหรับกรอกอีเมลและรหัสผ่านตรงกลางจอ */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '50px 20px', flex: 1 }}>
                <div style={{ width: '100%', maxWidth: '420px', padding: '40px', backgroundColor: '#ffffff', borderRadius: '6px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                        <h2 style={{ fontSize: '24px', color: '#000', margin: '0 0 5px 0', fontWeight: 'normal' }}>Login</h2>
                        <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Sign in to continue (Admin or Member)</p>
                    </div>
                    
                    {/* ข้อความแจ้งเตือนสีแดงเวลากรอกรหัสผ่านผิด */}
                    {message && <p style={{ color: '#d9534f', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', marginBottom: '15px' }}>{message}</p>}
                    
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '15px' }}>
                            <input type="email" name="email" value={loginData.email} onChange={handleChange} placeholder="Email" required style={inputStyle} />
                        </div>
                        <div style={{ marginBottom: '30px' }}>
                            <input type="password" name="password" value={loginData.password} onChange={handleChange} placeholder="Password" required style={inputStyle} />
                        </div>
                        
                        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', marginBottom: '20px' }}>
                            Login
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '13px', color: '#666', margin: 0 }}>
                        Don't have an account? <span onClick={() => navigate('/register')} style={{ color: '#000', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}>Sign Up</span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Login;