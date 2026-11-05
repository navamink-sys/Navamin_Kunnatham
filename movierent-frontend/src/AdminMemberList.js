// ==========================================
//
// ==========================================
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function AdminMemberList() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // ==========================================
    // ตัวแปร State เก็บข้อมูลและตัวกรอง
    // ==========================================
    const [members, setMembers] = useState([]); // รายชื่อสมาชิกทั้งหมดที่ดึงมาจากฐานข้อมูล
    
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

    const [searchTerm, setSearchTerm] = useState('');      // ข้อความที่พิมพ์ในช่องค้นหา
    const [sortBy, setSortBy] = useState('id_asc');          // เรียงลำดับ (ค่าเริ่มต้น: รหัสสมาชิกน้อยไปมาก)
    const [selectedRole, setSelectedRole] = useState('All'); // กรองดูเฉพาะ Member หรือ Admin

    const availableRoles = ['All', 'Member', 'Admin'];

    // เช็กสิทธิ์แอดมิน ถ้าผ่านให้ไปดึงข้อมูลสมาชิกมาแสดง
    useEffect(() => {
        if (!user || user.role !== 'Admin') {
            navigate('/login');
        } else {
            fetchMembers();
        }
    }, [user, navigate]);

    // ==========================================
    // ดึงข้อมูลสมาชิก และระบบลบสมาชิก
    // ==========================================
    // ดึงรายชื่อสมาชิกทั้งหมดจาก Backend
    const fetchMembers = async () => {
        try {
            const response = await axios.get('http://localhost:3001/api/users');
            setMembers(response.data);
        } catch (error) {
            console.error('Error fetching members:', error);
        }
    };

    // ลบสมาชิกออกจากระบบ พร้อมถามยืนยันก่อนลบ
    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this member account?')) {
            try {
                await axios.delete(`http://localhost:3001/api/users/${id}`);
                fetchMembers(); // ลบเสร็จให้ดึงข้อมูลใหม่มาอัปเดตตารางทันที
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
    // ระบบค้นหา และจัดเรียงลำดับตารางสมาชิก
    // ==========================================
    // กรองสมาชิกตามข้อความค้นหา (ค้นหาได้ทั้ง รหัส, ชื่อ-นามสกุล, และอีเมล)
    const filteredMembers = members.filter(member => {
        const id = member.user_id || member.id || ''; 
        const fullName = `${member.firstname} ${member.lastname}`.toLowerCase();
        
        const matchesSearch = 
            String(id).toLowerCase().includes(searchTerm.toLowerCase()) ||
            fullName.includes(searchTerm.toLowerCase()) ||
            (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesRole = 
            selectedRole === 'All' || 
            (member.role && member.role.toLowerCase() === selectedRole.toLowerCase());

        return matchesSearch && matchesRole;
    });

    // จัดเรียงลำดับรายชื่อสมาชิกในตาราง
    const sortedMembers = [...filteredMembers].sort((a, b) => {
        const idA = String(a.user_id || a.id || '');
        const idB = String(b.user_id || b.id || '');
        const nameA = String(a.firstname || '');
        const nameB = String(b.firstname || '');

        if (sortBy === 'id_asc') {
            return idA.localeCompare(idB);
        } else if (sortBy === 'id_desc') {
            return idB.localeCompare(idA);
        } else if (sortBy === 'name_asc') {
            return nameA.localeCompare(nameB);
        } else if (sortBy === 'name_desc') {
            return nameB.localeCompare(nameA);
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
                    <h2 style={{ fontSize: '24px', margin: 0, fontWeight: 'normal' }}>Member List</h2>
                    <button 
                        onClick={() => navigate('/admin/add-member')} 
                        style={{ padding: '8px 16px', backgroundColor: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#000', fontSize: '14px' }}
                    >
                        + Add New Member
                    </button>
                </div>

                {/* แถบเครื่องมือ: ช่องค้นหา, ตัวเลือกเรียงลำดับ, และกรองบทบาท */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '25px', backgroundColor: '#1f1f1f', padding: '15px 20px', borderRadius: '6px', border: '1px solid #333', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <input 
                            type="text" 
                            placeholder="Search by ID, name, or email..." 
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
                            <option value="id_asc">Member ID (Ascending)</option>
                            <option value="id_desc">Member ID (Descending)</option>
                            <option value="name_asc">Name (A &rarr; Z)</option>
                            <option value="name_desc">Name (Z &rarr; A)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '14px', color: '#aaa' }}>Role:</label>
                        <select 
                            value={selectedRole} 
                            onChange={(e) => setSelectedRole(e.target.value)} 
                            style={controlStyle}
                        >
                            {availableRoles.map(role => (
                                <option key={role} value={role}>
                                    {role}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ตารางแสดงรายชื่อสมาชิก */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: '#1f1f1f', borderRadius: '6px', overflow: 'hidden', border: '1px solid #333' }}>
                    <thead>
                        <tr style={{ color: '#888', fontSize: '14px', borderBottom: '1px solid #333' }}>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>ID</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Name</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Email</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Role</th>
                            <th style={{ padding: '15px 20px', fontWeight: 'normal' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMembers.length > 0 ? (
                            sortedMembers.map((member) => (
                                <tr key={member.user_id || member.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#ccc' }}>
                                        {member.user_id || member.id}
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <img 
                                            src={member.profile_pic ? `http://localhost:3001/uploads/${member.profile_pic}` : 'https://via.placeholder.com/35x35?text=U'} 
                                            alt={member.firstname}
                                            style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #444' }}
                                        />
                                        {member.firstname} {member.lastname}
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px', color: '#888' }}>
                                        {member.email}
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px' }}>
                                        {/* แถบป้ายบอกสิทธิ์ผู้ใช้ (สีฟ้า=แอดมิน / สีเทา=สมาชิก) */}
                                        <span style={{ 
                                            padding: '4px 10px', 
                                            borderRadius: '12px', 
                                            fontSize: '12px', 
                                            backgroundColor: member.role === 'Admin' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                            color: member.role === 'Admin' ? '#60a5fa' : '#ccc'
                                        }}>
                                            {member.role || 'Member'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px 20px', fontSize: '14px' }}>
                                        <span 
                                            onClick={() => navigate(`/admin/edit-member/${member.user_id || member.id}`)} 
                                            style={{ color: '#60a5fa', cursor: 'pointer', marginRight: '20px' }}
                                        >
                                            Edit
                                        </span>
                                        <span 
                                            onClick={() => handleDelete(member.user_id || member.id)} 
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
                                    No members found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminMemberList;