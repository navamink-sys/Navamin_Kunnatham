// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function WatchMovie() {
    const navigate = useNavigate();
    const { id } = useParams(); // รับ Movie ID จาก URL เพื่อดูว่าจะเปิดเล่นหนังเรื่องไหน

    // ==========================================
    // ตัวแปร State เก็บข้อมูลวิดีโอและสถานะสิทธิ์
    // ==========================================
    const [movieData, setMovieData] = useState(null);       // ข้อมูลไฟล์วิดีโอและชื่อหนัง
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');   // ข้อความแจ้งเตือนถ้าไม่มีสิทธิ์ดู

    // ==========================================
    // ตรวจสอบสิทธิ์การรับชม และดึงไฟล์วิดีโอจาก Backend
    // ==========================================
    useEffect(() => {
        const localUser = JSON.parse(localStorage.getItem('user'));
        console.log("👤 ข้อมูลผู้ใช้จาก LocalStorage:", localUser);

        // รองรับการดึงรหัสสมาชิกจากทุกรูปแบบคีย์ที่เป็นไปได้ (member_id, id, user_id)
        const memberId = localUser?.member_id || localUser?.id || localUser?.user_id;

        // ถ้ายังไม่ได้ล็อกอิน ให้เด้งไปหน้าล็อกอิน
        if (!memberId) {
            alert('กรุณาเข้าสู่ระบบก่อนรับชมภาพยนตร์');
            navigate('/login');
            return;
        }

        // ยิง API ไปตรวจสิทธิ์ว่าบิลได้รับการอนุมัติ (S002) หรือยัง ถ้าผ่านจะส่งชื่อไฟล์วิดีโอกลับมา
        axios.get(`http://localhost:3001/api/watch/${id}/${memberId}`)
            .then(res => {
                setMovieData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Permission denied or error:", err);
                setErrorMessage(err.response?.data?.message || 'คุณไม่มีสิทธิ์รับชมภาพยนตร์เรื่องนี้');
                setLoading(false);
            });
    }, [id, navigate]);

    if (loading) {
        return (
            <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px' }}>
                กำลังตรวจสอบสิทธิ์การรับชม...
            </div>
        );
    }

    // ถ้าไม่มีสิทธิ์ดู (เช่น บิลยังไม่อนุมัติ หรือยังไม่ได้เช่า) ให้แสดงหน้าแจ้งเตือนพร้อมปุ่มกลับ
    if (errorMessage) {
        return (
            <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px', textAlign: 'center' }}>
                <h2 style={{ color: '#ff4d4d', marginBottom: '15px' }}>⚠️ ไม่สามารถเข้าชมได้</h2>
                <p style={{ color: '#ccc', marginBottom: '25px', fontSize: '16px' }}>{errorMessage}</p>
                <button 
                    onClick={() => navigate('/history')} 
                    style={{ padding: '10px 20px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    กลับไปที่ประวัติการเช่า / หน้าหลัก
                </button>
            </div>
        );
    }

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif' }}>
            {/* แถบ Navbar ด้านบน */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 40px', backgroundColor: '#000', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }} onClick={() => navigate('/home')}>
                    MOVIERENT — WATCHING
                </div>
                <button 
                    onClick={() => navigate('/history')}
                    style={{ padding: '6px 14px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                >
                    ← กลับหน้าประวัติการเช่า
                </button>
            </nav>

            {/* กล่องแสดงเครื่องเล่นวิดีโอ HTML5 */}
            <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
                <h1 style={{ fontSize: '26px', marginBottom: '15px', fontWeight: 'bold' }}>🎬 {movieData?.movie_name}</h1>
                
                <div style={{ width: '100%', backgroundColor: '#000', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', border: '1px solid #333' }}>
                    {movieData?.video_file ? (
                        // ดึงไฟล์วิดีโอจากโฟลเดอร์ uploads ของ Backend มาเล่น
                        <video 
                            controls 
                            autoPlay 
                            width="100%" 
                            style={{ display: 'block', maxHeight: '550px', outline: 'none' }}
                            src={`http://localhost:3001/uploads/${movieData.video_file}`}
                        >
                            เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ
                        </video>
                    ) : (
                        <div style={{ height: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#777', fontStyle: 'italic' }}>
                            ไม่พบไฟล์วิดีโอสำหรับภาพยนตร์เรื่องนี้
                        </div>
                    )}
                </div>

                {/* กล่องเรื่องย่อด้านล่างวิดีโอ */}
                <div style={{ marginTop: '20px', backgroundColor: '#1f1f1f', padding: '20px', borderRadius: '6px', border: '1px solid #333' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#ddd' }}>เรื่องย่อ</h3>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '14px', lineHeight: '1.6' }}>
                        {movieData?.description || 'ไม่มีรายละเอียดสำหรับภาพยนตร์เรื่องนี้'}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default WatchMovie;