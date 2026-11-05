// ==========================================
// (รวมถึงชุดวาดกราฟ Chart.js และระบบพิมพ์ PDF)
// ==========================================
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import { useReactToPrint } from 'react-to-print';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

// ลงทะเบียนโมดูลของ Chart.js เพื่อให้สามารถวาดกราฟแท่งและกราฟเส้นได้
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

function AdminDashboard() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [currentUser] = useState(() => {
        return JSON.parse(localStorage.getItem('user')) || {};
    });

    // ==========================================
    // ตัวแปร State สำหรับเก็บข้อมูลสถิติและควบคุม Modal
    // ==========================================
    const [statsData, setStatsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState('monthly'); 

    //  ตัวแปร State ควบคุมการเปิด-ปิด Modal สำหรับดูข้อมูลทั้งหมด
    const [showTopRentalsModal, setShowTopRentalsModal] = useState(false);
    const [showTopRatedModal, setShowTopRatedModal] = useState(false);

    const [allTopRentals, setAllTopRentals] = useState([]);
    const [allTopRated, setAllTopRated] = useState([]);

    const contentRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: contentRef,
        documentTitle: 'MovieRent_Official_Report',
    });

    // ==========================================
    // ดึงข้อมูลสถิติจาก Backend
    // ==========================================
    useEffect(() => {
        if (!currentUser || currentUser.role !== 'Admin') {
            navigate('/login');
            return;
        }

        axios.get(`http://localhost:3001/api/admin/dashboard-stats?timeframe=${timeframe}`)
            .then(res => {
                setStatsData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching stats:", err);
                setLoading(false);
            });

        // ดึงข้อมูลแบบเต็ม (ทั้งหมด) สำหรับใส่ใน Modal
        axios.get('http://localhost:3001/api/movies/top10')
            .then(res => setAllTopRentals(res.data))
            .catch(err => console.error("Error fetching all top rentals:", err));

        // ดึงข้อมูลหนังทั้งหมดมาเรียงตามคะแนนรีวิวสำหรับ Modal
        axios.get('http://localhost:3001/api/movies')
            .then(async res => {
                const movies = res.data;
                const ratedPromises = movies.map(async (m) => {
                    try {
                        const revRes = await axios.get(`http://localhost:3001/api/movies/${m.movie_id}/reviews`);
                        return { movie_name: m.movie_name, avg_rating: revRes.data.averageRating, total_reviews: revRes.data.totalReviews };
                    } catch (e) {
                        return { movie_name: m.movie_name, avg_rating: 0, total_reviews: 0 };
                    }
                });
                const allRated = await Promise.all(ratedPromises);
                allRated.sort((a, b) => b.avg_rating - a.avg_rating);
                setAllTopRated(allRated);
            })
            .catch(err => console.error("Error fetching all rated movies:", err));

    }, [currentUser, navigate, timeframe]);

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
    // เตรียมข้อมูลสำหรับวาดกราฟหน้าจอสีดำ
    // ==========================================
    const barChartData = {
        labels: statsData?.topRentals?.map(item => item.movie_name) || [],
        datasets: [
            {
                label: 'Rental Count',
                data: statsData?.topRentals?.map(item => item.rental_count) || [],
                backgroundColor: ['#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'],
                borderRadius: 4,
            }
        ]
    };

    let chartLabels = [];
    let chartValues = [];

    if (statsData?.chartData) {
        if (timeframe === 'monthly') {
            chartLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const revenueArray = Array(12).fill(0);
            statsData.chartData.forEach(item => {
                revenueArray[item.label - 1] = item.revenue;
            });
            chartValues = revenueArray;
        } else if (timeframe === 'daily') {
            chartLabels = statsData.chartData.map(item => item.label);
            chartValues = statsData.chartData.map(item => item.revenue);
        } else if (timeframe === 'yearly') {
            const sortedData = [...statsData.chartData].sort((a, b) => a.label - b.label);
            chartLabels = sortedData.map(item => item.label);
            chartValues = sortedData.map(item => item.revenue);
        }
    }

    const lineChartData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Rental Revenue (THB)',
                data: chartValues,
                borderColor: '#9ca3af',
                backgroundColor: 'rgba(156, 163, 175, 0.08)',
                pointBackgroundColor: '#fff',
                pointHoverBackgroundColor: '#e50914',
                tension: 0.2,
                fill: true
            }
        ]
    };

    const thaiMonths = [
        "มกราคม (Jan)", "กุมภาพันธ์ (Feb)", "มีนาคม (Mar)", "เมษายน (Apr)", 
        "พฤษภาคม (May)", "มิถุนายน (Jun)", "กรกฎาคม (Jul)", "สิงหาคม (Aug)", 
        "กันยายน (Sep)", "ตุลาคม (Oct)", "พฤศจิกายน (Nov)", "ธันวาคม (Dec)"
    ];
    
    const monthlyPrintRevenue = Array(12).fill(0);
    if (statsData?.chartData && timeframe === 'monthly') {
        statsData.chartData.forEach(item => {
            monthlyPrintRevenue[item.label - 1] = Number(item.revenue);
        });
    }
    const totalAnnualRevenue = monthlyPrintRevenue.reduce((a, b) => a + b, 0);

    if (loading && !statsData) {
        return <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading dashboard analytics...</div>;
    }

    // ==========================================
    // ส่วนหน้าตาหน้าเว็บ (UI / JSX)
    // ==========================================
    return (
        <div style={{ backgroundColor: '#141414', minHeight: '100vh', color: '#ffffff', fontFamily: 'sans-serif', paddingBottom: '40px', position: 'relative' }}>
            
            {/* แถบเมนูด้านบน */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', backgroundColor: '#000000', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', cursor: 'pointer', color: '#fff' }} onClick={() => navigate('/admin')}>
                    MOVIERENT <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>(Admin)</span>
                </div>

                <div style={{ display: 'flex', gap: '25px', alignItems: 'center' }}>
                    <span style={navLinkStyle('/admin')} onClick={() => navigate('/admin')}>Dashboard</span>
                    <span style={navLinkStyle('/admin/movies')} onClick={() => navigate('/admin/movies')}>Movies</span>
                    <span style={navLinkStyle('/admin/members')} onClick={() => navigate('/admin/members')}>Members</span> 
                    <span style={navLinkStyle('/admin/payments')} onClick={() => navigate('/admin/payments')}>Payments</span>
                    
                    <button onClick={handleLogout} style={{ padding: '6px 14px', backgroundColor: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}>
                        Logout
                    </button>

                    <div 
                        onClick={() => navigate('/profile')}
                        title={`Admin: ${currentUser?.firstname}`}
                        style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', border: '1px solid #555', cursor: 'pointer' }}
                    >
                        {currentUser?.profile_pic ? (
                            <img src={`http://localhost:3001/uploads/${currentUser.profile_pic}`} alt={currentUser.firstname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ fontSize: '16px', color: '#aaa', fontWeight: 'bold' }}>{currentUser?.firstname?.charAt(0)?.toUpperCase() || '👤'}</span>
                        )}
                    </div>
                </div>
            </nav>

            {/* ส่วน Dashboard หน้าจอสีดำ */}
            <div style={{ padding: '40px 60px', maxWidth: '1300px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '35px' }}>
                    <div>
                        <h2 style={{ fontSize: '28px', margin: '0 0 6px 0', fontWeight: 'bold', letterSpacing: '0.5px' }}>Overview Dashboard</h2>
                        <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>System statistics, metrics overview, and rental management</p>
                    </div>
                    <button 
                        onClick={handlePrint} 
                        style={{ padding: '10px 18px', backgroundColor: '#e50914', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                         Export PDF Report
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '25px', marginBottom: '35px' }}>
                    <div onClick={() => navigate('/admin/movies')} style={{ backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '8px', border: '1px solid #2d2d2d', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#444'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2d2d2d'}>
                        <span style={{ color: '#888', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Movies</span>
                        <h3 style={{ fontSize: '36px', margin: 0, fontWeight: 'bold', color: '#fff' }}>{statsData?.summary?.total_movies || 0}</h3>
                    </div>
                    <div onClick={() => navigate('/admin/members')} style={{ backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '8px', border: '1px solid #2d2d2d', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#444'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#2d2d2d'}>
                        <span style={{ color: '#888', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registered Members</span>
                        <h3 style={{ fontSize: '36px', margin: 0, fontWeight: 'bold', color: '#fff' }}>{statsData?.summary?.total_members || 0}</h3>
                    </div>
                    <div onClick={() => navigate('/admin/payments')} style={{ backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '8px', border: statsData?.summary?.pending_payments > 0 ? '1px solid #d97706' : '1px solid #2d2d2d', display: 'flex', flexDirection: 'column', gap: '10px', cursor: 'pointer', transition: 'border-color 0.2s' }} onMouseEnter={(e) => !statsData?.summary?.pending_payments && (e.currentTarget.style.borderColor = '#444')} onMouseLeave={(e) => !statsData?.summary?.pending_payments && (e.currentTarget.style.borderColor = '#2d2d2d')}>
                        <span style={{ color: '#888', fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Payments</span>
                        <h3 style={{ fontSize: '36px', margin: 0, fontWeight: 'bold', color: statsData?.summary?.pending_payments > 0 ? '#f59e0b' : '#fff' }}>{statsData?.summary?.pending_payments || 0}</h3>
                    </div>
                </div>

                {/* ส่วนแสดงกราฟแท่ง (Top 5 หนังยอดฮิต) และรายการหนังคะแนนรีวิวสูงสุด (พร้อมปุ่ม View All) */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '35px' }}>
                    
                    {/* กล่อง Top 5 Most Rented Movies */}
                    <div style={{ backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '8px', border: '1px solid #2d2d2d', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#e5e7eb', letterSpacing: '0.3px' }}>Top 5 Most Rented Movies</h4>
                            {/*  ปุ่ม View All สำหรับเปิดดูรายการทั้งหมด */}
                            <button 
                                onClick={() => setShowTopRentalsModal(true)}
                                style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                            >
                                View All
                            </button>
                        </div>
                        {statsData?.topRentals?.length > 0 ? (
                            <div style={{ height: '290px' }}>
                                <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#888' } }, y: { grid: { color: '#2d2d2d' }, ticks: { color: '#888' } } } }} />
                            </div>
                        ) : (
                            <div style={{ color: '#555', textAlign: 'center', padding: '110px 0', fontSize: '14px', fontStyle: 'italic' }}>No rental records found.</div>
                        )}
                    </div>

                    {/* กล่อง Highest Rated Movies */}
                    <div style={{ backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '8px', border: '1px solid #2d2d2d', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#e5e7eb', letterSpacing: '0.3px' }}>Highest Rated Movies</h4>
                            {/*  ปุ่ม View All สำหรับเปิดดูรายการคะแนนสูงสุดทั้งหมด */}
                            <button 
                                onClick={() => setShowTopRatedModal(true)}
                                style={{ background: 'transparent', border: '1px solid #444', color: '#aaa', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                            >
                                View All
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, justifyContent: 'center' }}>
                            {statsData?.topRated && statsData.topRated.length > 0 ? (
                                statsData.topRated.map((movie, index) => (
                                    <div key={index} style={{ backgroundColor: '#141414', border: '1px solid #2d2d2d', padding: '14px 18px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#fff', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{movie.movie_name}</div>
                                            <div style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 'bold', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="#e5e7eb"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                                {Number(movie.avg_rating).toFixed(2)}
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#444' }}>0{index + 1}</div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: '#555', textAlign: 'center', padding: '60px 0', fontSize: '13px', fontStyle: 'italic' }}>No rating records found.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#1e1e1e', padding: '25px', borderRadius: '8px', border: '1px solid #2d2d2d' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#e5e7eb', letterSpacing: '0.3px' }}>Rental Revenue Trends</h4>
                        <select 
                            value={timeframe} 
                            onChange={(e) => setTimeframe(e.target.value)}
                            style={{ padding: '6px 12px', backgroundColor: '#222', color: '#fff', border: '1px solid #444', borderRadius: '4px', outline: 'none', cursor: 'pointer', fontSize: '13px' }}
                        >
                            <option value="daily">Daily (Last 7 Days)</option>
                            <option value="monthly">Monthly (Current Year)</option>
                            <option value="yearly">Yearly (Last 5 Years)</option>
                        </select>
                    </div>
                    <div style={{ height: '310px' }}>
                        <Line data={lineChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#2d2d2d' }, ticks: { color: '#888' } }, y: { grid: { color: '#2d2d2d' }, ticks: { color: '#888' } } } }} />
                    </div>
                </div>
            </div>

            {/* =========================================================================
                 MODAL POPUP: แสดงรายการหนังยอดเช่าสูงสุดทั้งหมด
                ========================================================================= */}
            {showTopRentalsModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '8px', width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 25px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>All Most Rented Movies</h3>
                            <button onClick={() => setShowTopRentalsModal(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ padding: '20px 25px', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ color: '#888', borderBottom: '1px solid #333' }}>
                                        <th style={{ padding: '10px' }}>Rank</th>
                                        <th style={{ padding: '10px' }}>Movie Name</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>Rental Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTopRentals.map((m, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                            <td style={{ padding: '12px 10px', color: '#aaa' }}>#{idx + 1}</td>
                                            <td style={{ padding: '12px 10px', color: '#fff', fontWeight: '500' }}>{m.movie_name}</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>{m.rental_count} ครั้ง</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                 MODAL POPUP: แสดงรายการหนังคะแนนรีวิวสูงสุดทั้งหมด
                ========================================================================= */}
            {showTopRatedModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '8px', width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '20px 25px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>All Highest Rated Movies</h3>
                            <button onClick={() => setShowTopRatedModal(false)} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        <div style={{ padding: '20px 25px', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ color: '#888', borderBottom: '1px solid #333' }}>
                                        <th style={{ padding: '10px' }}>Rank</th>
                                        <th style={{ padding: '10px' }}>Movie Name</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>Average Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allTopRated.map((m, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                            <td style={{ padding: '12px 10px', color: '#aaa' }}>#{idx + 1}</td>
                                            <td style={{ padding: '12px 10px', color: '#fff', fontWeight: '500' }}>{m.movie_name}</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'right', color: '#fbbf24', fontWeight: 'bold' }}>★ {Number(m.avg_rating).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                📄 โซนเอกสารซ่อน (Hidden Print Area): หน้ากระดาษ A4 สีขาว สำหรับสั่งพิมพ์ PDF
                ========================================================================= */}
            <div style={{ display: 'none' }}>
                <div ref={contentRef} style={{ padding: '40px', backgroundColor: '#fff', color: '#000', fontFamily: 'sans-serif' }}>
                    <style>{`
                        @media print {
                            @page { size: A4 portrait; margin: 15mm; }
                            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                            .page-break { page-break-after: always; padding-top: 20px; }
                            .print-header { text-align: center; margin-bottom: 30px; }
                            .print-logo-bar { font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 4px; margin-bottom: 40px; text-align: left; }
                            .print-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
                            .print-table th, .print-table td { border: 1px solid #000; padding: 10px; text-align: center; }
                            .print-table th { background-color: #f2f2f2 !important; font-weight: bold; }
                            .text-left { text-align: left !important; padding-left: 15px !important; }
                        }
                    `}</style>

                    <div className="page-break">
                        <div className="print-logo-bar">||||||||||||||||||||<br/>M O V I E R E N T</div>
                        <div className="print-header">
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0' }}>บริษัท มูฟวี่เรนท์ จำกัด</h2>
                            <h3 style={{ fontSize: '18px', fontWeight: 'normal', margin: '10px 0' }}>รายงานสถิติผู้ใช้งานระบบ</h3>
                            <p style={{ fontSize: '16px', margin: '15px 0 5px 0', textAlign: 'left', fontWeight: 'bold' }}>ประจำงวด ปี (Year)</p>
                        </div>
                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '15%' }}>รายการ</th>
                                    <th style={{ width: '50%' }}>รายละเอียด</th>
                                    <th style={{ width: '35%' }}>จำนวน (รายการ/คน)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td>1</td><td>ยอดเข้าชม (Views)</td><td>7,265</td></tr>
                                <tr><td>2</td><td>ผู้ใช้ใหม่ (New Users)</td><td>365</td></tr>
                                <tr><td>3</td><td>ผู้ใช้งานอยู่ (Active Users)</td><td>{statsData?.summary?.total_members ? statsData.summary.total_members.toLocaleString() : '0'}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="page-break">
                        <div className="print-logo-bar">||||||||||||||||||||<br/>M O V I E R E N T</div>
                        <div className="print-header">
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0' }}>บริษัท มูฟวี่เรนท์ จำกัด</h2>
                            <h3 style={{ fontSize: '18px', fontWeight: 'normal', margin: '10px 0' }}>รายงานสถิติภาพยนตร์ยอดนิยม รายได้ และคะแนนความพึงพอใจ</h3>
                            <p style={{ fontSize: '16px', margin: '15px 0 5px 0', textAlign: 'left', fontWeight: 'bold' }}>ประจำงวด ปี (Year)</p>
                        </div>
                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '8%' }}>ลำดับ</th>
                                    <th style={{ width: '32%' }}>ชื่อภาพยนตร์</th>
                                    <th style={{ width: '15%' }}>จำนวนครั้งที่เช่า</th>
                                    <th style={{ width: '15%' }}>รายได้</th>
                                    <th style={{ width: '15%' }}>คะแนนเฉลี่ย</th>
                                    <th style={{ width: '15%' }}>แนวโน้มคะแนน</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statsData?.topRentals?.length > 0 ? (
                                    statsData.topRentals.map((movie, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td className="text-left">{movie.movie_name}</td>
                                            <td>{movie.rental_count}</td>
                                            <td>{(movie.rental_count * 39).toLocaleString()}</td> 
                                            <td>4.50</td> 
                                            <td>+1.50%</td> 
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="6">ไม่มีข้อมูลสถิติภาพยนตร์</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <div className="print-logo-bar">||||||||||||||||||||<br/>M O V I E R E N T</div>
                        <div className="print-header">
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '5px 0' }}>บริษัท มูฟวี่เรนท์ จำกัด</h2>
                            <h3 style={{ fontSize: '18px', fontWeight: 'normal', margin: '10px 0' }}>รายงานสรุปรายได้จากการเช่าภาพยนตร์ประจำปี</h3>
                            <p style={{ fontSize: '16px', margin: '15px 0 5px 0', textAlign: 'left', fontWeight: 'bold' }}>ประจำงวด ปี (Year)</p>
                        </div>
                        <table className="print-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '20%' }}>งวดเดือน</th>
                                    <th style={{ width: '45%' }}>รายละเอียด</th>
                                    <th style={{ width: '35%' }}>รายได้สุทธิ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {thaiMonths.map((monthName, index) => (
                                    <tr key={index}>
                                        <td>เดือน {index + 1}</td>
                                        <td>{monthName}</td>
                                        <td>{monthlyPrintRevenue[index].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td colSpan="2" style={{ fontWeight: 'bold', textAlign: 'right', paddingRight: '20px' }}>รวม รายได้สุทธิทั้งสิ้น (12 เดือน)</td>
                                    <td style={{ fontWeight: 'bold' }}>{totalAnnualRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

        </div>
    );
}

export default AdminDashboard;