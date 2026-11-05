// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

function AdminPaymentDetails() {
    const { id } = useParams(); // รับค่า Rental ID จาก URL (เช่น R001)
    const navigate = useNavigate();
    const location = useLocation();

    // ดึงข้อมูลแอดมินที่กำลังตรวจสลิป
    const [adminUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // ==========================================
    // ตัวแปร State เก็บรายละเอียดบิล
    // ==========================================
    const [details, setDetails] = useState(null); // ข้อมูลบิล ทั้งชื่อลูกค้า ชื่อหนัง และรูปสลิป
    const [loading, setLoading] = useState(true);

    // เช็กสิทธิ์แอดมิน
    useEffect(() => {
        if (!adminUser || adminUser.role !== 'Admin') {
            navigate('/login');
        }
    }, [adminUser, navigate]);

    // ==========================================
    // ดึงรายละเอียดการเช่าและรูปสลิปจาก Backend
    // ==========================================
    useEffect(() => {
        axios.get(`http://localhost:3001/api/admin/payments/${id}`)
            .then(res => {
                setDetails(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert('Failed to load transaction details.');
                navigate('/admin/payments');
            });
    }, [id, navigate]);

    // ==========================================
    // ฟังก์ชันจัดการการกระทำของแอดมิน (อนุมัติ / ปฏิเสธ / ยกเลิกสิทธิ์)
    // ==========================================
    const handleAction = async (actionType) => {
        let confirmMsg = '';
        if (actionType === 'approve') confirmMsg = 'Confirm approval of this payment and grant movie streaming access?';
        else if (actionType === 'reject') confirmMsg = 'Are you sure you want to reject this payment receipt?';
        else if (actionType === 'cancel') confirmMsg = 'Are you sure you want to revoke active streaming access for this customer?';

        if (!window.confirm(confirmMsg)) return;

        const currentAdminId = adminUser.admin_id || adminUser.member_id || adminUser.id;

        try {
            const response = await axios.put(`http://localhost:3001/api/admin/payments/${id}`, {
                action: actionType,
                admin_id: currentAdminId
            });
            
            alert(response.data.message || 'Action completed successfully.');
            navigate('/admin/payments'); // เสร็จแล้วกลับไปหน้ารวมรายการชำระเงิน
        } catch (error) {
            console.error("Payment action error:", error);
            const errorMsg = error.response?.data?.message || 'Server connection error.';
            alert(`Error: ${errorMsg}`);
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

    if (loading) {
        return (
            <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                Loading payment details...
            </div>
        );
    }

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif', paddingBottom: '60px' }}>
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
                        title={`Admin: ${adminUser?.firstname}`}
                        style={{ 
                            width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#333', 
                            display: 'flex', justifyContent: 'center', alignItems: 'center', 
                            overflow: 'hidden', border: '1px solid #555', cursor: 'pointer' 
                        }}
                    >
                        {adminUser?.profile_pic ? (
                            <img 
                                src={`http://localhost:3001/uploads/${adminUser.profile_pic}`} 
                                alt={adminUser.firstname} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <span style={{ fontSize: '16px' }}>👤</span>
                        )}
                    </div>
                </div>
            </nav>

            <div style={{ padding: '40px 60px', maxWidth: '1200px', margin: '0 auto' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '40px' }}>
                    <button 
                        onClick={() => navigate('/admin/payments')} 
                        style={{ padding: '8px 16px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                    >
                        &larr; Back to Payments
                    </button>
                    <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>Payment Details ({details.rental_id})</h1>
                </div>

                <div style={{ display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
                    
                    {/* ฝั่งซ้าย: แสดงรูปสลิปโอนเงินขนาดใหญ่เพื่อตรวจดูความถูกต้อง */}
                    <div style={{ flex: 1, backgroundColor: '#1f1f1f', padding: '20px', borderRadius: '6px', border: '1px solid #333', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#aaa', alignSelf: 'flex-start' }}>Uploaded Receipt (Slip)</h3>
                        {details.payment_slip ? (
                            <img 
                                src={`http://localhost:3001/uploads/${details.payment_slip}`} 
                                alt="Payment Slip" 
                                style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', borderRadius: '4px', border: '1px solid #444' }}
                            />
                        ) : (
                            <div style={{ color: '#ef4444', padding: '40px' }}>Payment slip image not found.</div>
                        )}
                    </div>

                    {/* ฝั่งขวา: รายละเอียดลูกค้า, หนังที่เช่า, และปุ่มกดยืนยัน */}
                    <div style={{ width: '420px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        
                        {/* ข้อมูลลูกค้า */}
                        <div style={{ backgroundColor: '#1f1f1f', padding: '25px', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Customer Information</h3>
                            <p style={{ margin: '6px 0', fontSize: '14px' }}><strong style={{ color: '#aaa' }}>Member ID:</strong> {details.member_id}</p>
                            <p style={{ margin: '6px 0', fontSize: '14px' }}><strong style={{ color: '#aaa' }}>Name:</strong> {details.firstname} {details.lastname}</p>
                            <p style={{ margin: '6px 0', fontSize: '14px' }}><strong style={{ color: '#aaa' }}>Email:</strong> {details.email}</p>
                            <p style={{ margin: '6px 0', fontSize: '14px' }}><strong style={{ color: '#aaa' }}>Phone:</strong> {details.phone || '-'}</p>
                        </div>

                        {/* ข้อมูลแพ็กเกจการเช่าและยอดเงิน */}
                        <div style={{ backgroundColor: '#1f1f1f', padding: '25px', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', borderBottom: '1px solid #333', paddingBottom: '8px' }}>Rental Package Details</h3>
                            <p style={{ margin: '6px 0', fontSize: '14px' }}><strong style={{ color: '#aaa' }}>Movie:</strong> {details.movie_name}</p>
                            <p style={{ margin: '6px 0', fontSize: '14px' }}><strong style={{ color: '#aaa' }}>Duration:</strong> {details.duration_days} days</p>
                            <p style={{ margin: '15px 0 0 0', fontSize: '18px', fontWeight: 'bold', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Amount Payable:</span>
                                <span style={{ color: '#4ade80' }}>฿{Number(details.price).toFixed(2)}</span>
                            </p>
                        </div>

                        {/* โซนปุ่มกด Action ตามสถานะปัจจุบันของบิล */}
                        {details.status_id === 'S001' ? (
                            // สถานะ S001 (รอยืนยัน): โชว์ปุ่ม อนุมัติ และ ปฏิเสธสลิป
                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                <button 
                                    onClick={() => handleAction('approve')}
                                    style={{ flex: 1, padding: '14px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', transition: 'background 0.2s' }}
                                >
                                    Approve Payment
                                </button>
                                <button 
                                    onClick={() => handleAction('reject')}
                                    style={{ padding: '14px', backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}
                                >
                                    Reject Slip
                                </button>
                            </div>
                        ) : details.status_id === 'S002' ? (
                            // สถานะ S002 (อนุมัติแล้วกำลังดูได้): โชว์ปุ่ม ยึด/ยกเลิกสิทธิ์การดูหนัง
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '4px', textAlign: 'center', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '14px' }}>
                                    Current Status: <strong>Active Rental Access</strong>
                                </div>
                                <button 
                                    onClick={() => handleAction('cancel')}
                                    style={{ padding: '12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Revoke Rental Access
                                </button>
                            </div>
                        ) : (
                            // สถานะอื่นๆ (หมดอายุ หรือ ถูกปฏิเสธไปแล้ว)
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '4px', textAlign: 'center', color: '#aaa', border: '1px solid #333', fontSize: '14px' }}>
                                This transaction is concluded. Status: <span style={{ color: '#fff', fontWeight: 'bold' }}>{details.status_name}</span>
                            </div>
                        )}

                    </div>

                </div>
            </div>
        </div>
    );
}

export default AdminPaymentDetails;