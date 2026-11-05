// ==========================================
// นำเข้า React และเครื่องมือทำระบบเปลี่ยนหน้า (React Router)
// ==========================================
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// นำเข้าหน้าของฝั่งผู้ใช้งานทั่วไป (Guest) ยังไม่ล็อกอิน
import GuestHome from './GuestHome';
import GuestMovieList from './GuestMovieList'; 
import GuestTop10 from './GuestTop10'; 
import GuestMovieDetails from './GuestMovieDetails'; 

// นำเข้าหน้าล็อกอิน และสมัครสมาชิก
import Login from './Login';
import Register from './Register';

// นำเข้าหน้าของฝั่งสมาชิก (Member) ที่ล็อกอินแล้ว
import Home from './Home';
import MoviesListUser from './MoviesListUser'; 
import MovieDetails from './MovieDetails'; 
import Checkout from './Checkout'; 
import History from './History';
import Top10 from './Top10';
import WatchMovie from './WatchMovie'; 

// นำเข้าหน้าโปรไฟล์ที่ใช้ร่วมกันได้ทั้งแอดมินและสมาชิก
import Profile from './Profile';

// นำเข้าหน้าของฝั่งผู้ดูแลระบบ (Admin)
import AdminDashboard from './AdminDashboard';
import AdminAddMovie from './AdminAddMovie';
import AdminMovieList from './AdminMovieList';
import AdminEditMovie from './AdminEditMovie';
import AdminMemberList from './AdminMemberList'; 
import AdminAddMember from './AdminAddMember';
import AdminEditMember from './AdminEditMember';
import AdminPayments from './AdminPayments'; 
import AdminPaymentDetails from './AdminPaymentDetails'; 

// ==========================================
// ส่วนกำหนดแผนที่ URL ของทั้งเว็บไซต์
// ==========================================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* กลุ่มหน้าสำหรับคนทั่วไป (Guest) */}
        <Route path="/" element={<GuestHome />} />
        <Route path="/guest-movies" element={<GuestMovieList />} /> 
        <Route path="/guest-top10" element={<GuestTop10 />} /> 
        <Route path="/guest-movie/:id" element={<GuestMovieDetails />} />
        
        {/* หน้าล็อกอินและสมัครสมาชิก */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* กลุ่มหน้าสำหรับสมาชิกที่ล็อกอินแล้ว (User / Member) */}
        <Route path="/home" element={<Home />} />
        <Route path="/movies" element={<MoviesListUser />} /> 
        <Route path="/movie/:id" element={<MovieDetails />} />
        <Route path="/checkout/:id" element={<Checkout />} /> 
        <Route path="/history" element={<History />} /> 
        <Route path="/top10" element={<Top10 />} />
        <Route path="/watch/:id" element={<WatchMovie />} /> 

        {/* หน้าโปรไฟล์ส่วนตัว (เข้าได้ทั้ง Admin และ Member) */}
        <Route path="/profile" element={<Profile />} />
        
        {/* กลุ่มหน้าสำหรับผู้ดูแลระบบ (Admin) */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/add-movie" element={<AdminAddMovie />} />
        <Route path="/admin/movies" element={<AdminMovieList />} />
        <Route path="/admin/edit-movie/:id" element={<AdminEditMovie />} />
        <Route path="/admin/members" element={<AdminMemberList />} /> 
        <Route path="/admin/add-member" element={<AdminAddMember />} />
        <Route path="/admin/edit-member/:id" element={<AdminEditMember />} />
        
        {/* หน้าตรวจสลิปและประวัติการเงินฝั่งแอดมิน */}
        <Route path="/admin/payments" element={<AdminPayments />} /> 
        <Route path="/admin/payment-details/:id" element={<AdminPaymentDetails />} /> 
      </Routes>
    </BrowserRouter>
  );
}

export default App;