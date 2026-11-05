// ==========================================
//และตั้งค่าเริ่มต้น
// ==========================================
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // เอาไว้เข้ารหัสพาสเวิร์ด
const multer = require('multer');   // เอาไว้อัปโหลดไฟล์รูป/วิดีโอ
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors()); // ยอมให้หน้าเว็บ React คุยกับ API ตัวนี้ได้
app.use(express.json()); // ให้เซิร์ฟเวอร์อ่านข้อมูลแบบ JSON ได้

// ==========================================
// ตั้งค่าต่อฐานข้อมูล MySQL
// ==========================================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'movierent_db' // ชื่อฐานข้อมูล
});

db.connect((err) => {
    if (err) {
        console.error('เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล:', err);
        return;
    }
    console.log('เชื่อมต่อฐานข้อมูล movierent_db สำเร็จแล้ว!');
});

// ==========================================
// ตั้งค่าระบบอัปโหลดไฟล์ (โฟลเดอร์ uploads)
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        // ถ้ายังไม่มีโฟลเดอร์ uploads ให้สร้างใหม่เลย
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // ตั้งชื่อไฟล์ใหม่ด้วยเวลาปัจจุบัน (กันชื่อไฟล์ซ้ำกัน)
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
app.use('/uploads', express.static('uploads')); // เปิดทางให้ฝั่งหน้าเว็บดึงรูปไปแสดงได้ตรงๆ

// ==========================================
// ฟังก์ชันผู้ช่วย เคลียร์ขยะอัตโนมัติ
// ==========================================
const autoDeleteExpiredRejected = () => {
    // ลบรายการเช่าที่ถูกแอดมินปัดตก (S004) และทิ้งไว้นานเกิน 3 วัน
    const cleanupQuery = `
        DELETE FROM rental 
        WHERE status_id = 'S004' 
        AND created_at < NOW() - INTERVAL 3 DAY
    `;
    db.query(cleanupQuery, (err, result) => {
        if (err) {
            console.error('Error auto-deleting rejected rentals:', err);
        } else if (result && result.affectedRows > 0) {
            console.log(`🧹 เคลียร์บิล Rejected ที่เกิน 3 วันออกแล้วจำนวน ${result.affectedRows} รายการ`);
        }
    });
};

// ==========================================
// API จิปาถะ & สุ่มเลข ID ใหม่
// ==========================================
app.get('/', (req, res) => {
    res.send('ยินดีต้อนรับสู่ Movierent API!'); // เอาไว้เทสว่า API รันติดไหม
});

// รันเลข ID สมาชิกคิวต่อไป (เช่น จาก M001 เป็น M002)
app.get('/api/next-member-id', (req, res) => {
    const query = 'SELECT member_id FROM member ORDER BY member_id DESC LIMIT 1';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรหัสสมาชิก' });
        
        let nextId = 'M001';
        if (results.length > 0) {
            const lastId = results[0].member_id;
            const currentNumber = parseInt(lastId.replace('M', '')) || 0;
            nextId = `M${String(currentNumber + 1).padStart(3, '0')}`;
        }
        res.status(200).json({ nextMemberId: nextId });
    });
});

// รันเลข ID หนังคิวต่อไป (เช่น จาก MOV001 เป็น MOV002)
app.get('/api/next-movie-id', (req, res) => {
    const query = 'SELECT movie_id FROM movie ORDER BY movie_id DESC LIMIT 1';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรหัสภาพยนตร์' });
        
        let nextId = 'MOV001';
        if (results.length > 0) {
            const lastId = results[0].movie_id;
            const currentNumber = parseInt(lastId.replace('MOV', '')) || 0;
            nextId = `MOV${String(currentNumber + 1).padStart(3, '0')}`;
        }
        res.status(200).json({ nextMovieId: nextId });
    });
});

// ==========================================
// API ระบบสมาชิก (สมัคร / ล็อกอิน / จัดการยูสเซอร์)
// ==========================================
app.post('/api/register', upload.single('profile_pic'), async (req, res) => {
    // สมัครสมาชิกใหม่ พร้อมอัปโหลดรูปโปรไฟล์
    const { firstname, lastname, phone, email, password, role, account_status } = req.body;
    const profile_pic = req.file ? req.file.filename : null;

    if (!firstname || !lastname || !phone || !email || !password) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        const checkUserQuery = 'SELECT * FROM member WHERE email = ?';
        db.query(checkUserQuery, [email], async (err, results) => {
            if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });
            if (results.length > 0) return res.status(400).json({ message: 'อีเมลนี้มีอยู่ในระบบแล้ว' });

            const getLatestIdQuery = 'SELECT member_id FROM member ORDER BY member_id DESC LIMIT 1';
            db.query(getLatestIdQuery, async (err, idResults) => {
                if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างรหัสสมาชิก' });

                let member_id = 'M001';
                if (idResults.length > 0) {
                    const lastId = idResults[0].member_id;
                    const nextNumber = parseInt(lastId.replace('M', '')) + 1;
                    member_id = `M${String(nextNumber).padStart(3, '0')}`;
                }

                // เอาพาสเวิร์ดมาเข้ารหัสก่อนเซฟลงฐานข้อมูล
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                const userRole = role || 'Member';
                const userStatus = account_status || 'Active';
                
                const insertQuery = `
                    INSERT INTO member (member_id, firstname, lastname, phone, email, password, profile_pic, account_status, role) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                db.query(insertQuery, [member_id, firstname, lastname, phone, email, hashedPassword, profile_pic, userStatus, userRole], (err) => {
                    if (err) return res.status(500).json({ message: 'ไม่สามารถบันทึกข้อมูลสมาชิกได้' });
                    res.status(201).json({ message: 'บันทึกข้อมูลสมาชิกสำเร็จเรียบร้อยแล้ว!' });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ message: 'เซิร์ฟเวอร์เกิดข้อผิดพลาด' });
    }
});

app.post('/api/login', (req, res) => {
    // ล็อกอินเข้าสู่ระบบ
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่าน' });

    const query = 'SELECT * FROM member WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล' });
        if (results.length === 0) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        const user = results[0];
        // เทียบพาสเวิร์ดที่พิมพ์มากับพาสเวิร์ดที่เข้ารหัสไว้
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        
        if (user.account_status !== 'Active') return res.status(403).json({ message: 'บัญชีของคุณถูกระงับการใช้งาน' });

        res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ!',
            user: {
                member_id: user.member_id,
                firstname: user.firstname,
                lastname: user.lastname,
                email: user.email,
                role: user.role,
                profile_pic: user.profile_pic
            }
        });
    });
});

// ดึงข้อมูลสมาชิกทั้งหมด (แอดมินใช้)
app.get('/api/users', (req, res) => {
    db.query('SELECT member_id AS id, firstname, lastname, email, phone, account_status, role, profile_pic FROM member', (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลสมาชิก' });
        res.status(200).json(results);
    });
});

// แก้ไขข้อมูลสมาชิก/โปรไฟล์
app.put('/api/users/:id', upload.single('profile_pic'), async (req, res) => {
    const memberId = req.params.id;
    const { firstname, lastname, phone, email, account_status, role, password } = req.body;
    const newProfilePic = req.file ? req.file.filename : null;

    if (!firstname || !lastname || !email) return res.status(400).json({ message: 'กรุณากรอกข้อมูลชื่อและอีเมลให้ครบถ้วน' });

    try {
        let query = '';
        let params = [];
        // ถ้ามีการส่งพาสเวิร์ดใหม่มาให้เปลี่ยนด้วย
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            if (newProfilePic) {
                query = `UPDATE member SET firstname = ?, lastname = ?, phone = ?, email = ?, password = ?, account_status = ?, role = ?, profile_pic = ? WHERE member_id = ?`;
                params = [firstname, lastname, phone || '', email, hashedPassword, account_status || 'Active', role || 'Member', newProfilePic, memberId];
            } else {
                query = `UPDATE member SET firstname = ?, lastname = ?, phone = ?, email = ?, password = ?, account_status = ?, role = ? WHERE member_id = ?`;
                params = [firstname, lastname, phone || '', email, hashedPassword, account_status || 'Active', role || 'Member', memberId];
            }
        } else {
            // เปลี่ยนแค่ข้อมูลทั่วไป ไม่เปลี่ยนพาสเวิร์ด
            if (newProfilePic) {
                query = `UPDATE member SET firstname = ?, lastname = ?, phone = ?, email = ?, account_status = ?, role = ?, profile_pic = ? WHERE member_id = ?`;
                params = [firstname, lastname, phone || '', email, account_status || 'Active', role || 'Member', newProfilePic, memberId];
            } else {
                query = `UPDATE member SET firstname = ?, lastname = ?, phone = ?, email = ?, account_status = ?, role = ? WHERE member_id = ?`;
                params = [firstname, lastname, phone || '', email, account_status || 'Active', role || 'Member', memberId];
            }
        }
        db.query(query, params, (err) => {
            if (err) return res.status(500).json({ message: 'ไม่สามารถอัปเดตข้อมูลสมาชิกได้' });
            res.status(200).json({ message: 'แก้ไขข้อมูลสมาชิกสำเร็จเรียบร้อยแล้ว!' });
        });
    } catch (error) {
        res.status(500).json({ message: 'เซิร์ฟเวอร์เกิดข้อผิดพลาด' });
    }
});

// แอดมินลบสมาชิกออกจากระบบ
app.delete('/api/users/:id', (req, res) => {
    const memberId = req.params.id;
    db.query('DELETE FROM member WHERE member_id = ?', [memberId], (err) => {
        if (err) return res.status(500).json({ message: 'ไม่สามารถลบข้อมูลสมาชิกได้' });
        res.status(200).json({ message: 'ลบข้อมูลสมาชิกสำเร็จเรียบร้อยแล้ว!' });
    });
});

// ==========================================
// API ดึงข้อมูลหนัง และระบบเช็คสิทธิ์ดูหนัง
// ==========================================
// ดึงรายการหนังทั้งหมดมาแสดงหน้าเว็บ
app.get('/api/movies', (req, res) => {
    db.query('SELECT *, movie_name, price, description, trailer FROM movie', (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลภาพยนตร์' });
        res.status(200).json(results);
    });
});

// จัดอันดับหนัง Top 10 ตามยอดเช่าและคะแนนรีวิว
app.get('/api/movies/top10', (req, res) => {
    const query = `
        SELECT 
            m.movie_id, 
            m.movie_name, 
            m.poster_pic, 
            m.genre, 
            m.price, 
            COUNT(r.rental_id) AS rental_count,
            COALESCE(AVG(rev.rating), 0) AS average_rating
        FROM movie m
        LEFT JOIN rental r ON m.movie_id = r.movie_id
        LEFT JOIN review rev ON m.movie_id = rev.movie_id
        GROUP BY m.movie_id, m.movie_name, m.poster_pic, m.genre, m.price
        ORDER BY rental_count DESC, average_rating DESC
        LIMIT 10
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching top 10 movies:", err);
            return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลภาพยนตร์ยอดนิยมได้' });
        }
        res.status(200).json(results);
    });
});

// ดึงรายละเอียดหนังรายเรื่อง
app.get('/api/movies/:id', (req, res) => {
    const movieId = req.params.id;
    db.query('SELECT *, movie_name, price, description, trailer FROM movie WHERE movie_id = ?', [movieId], (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลภาพยนตร์' });
        if (results.length === 0) return res.status(404).json({ message: 'ไม่พบข้อมูลภาพยนตร์นี้' });
        res.status(200).json(results[0]);
    });
});

// เอาไว้เช็คตอนก่อนจ่ายเงิน ว่ายูสเซอร์คนนี้เช่าหนังเรื่องนี้ค้างไว้อยู่หรือเปล่า (กันการเช่าซ้ำ)
app.get('/api/check-active-rental', (req, res) => {
    const { member_id, movie_id } = req.query;
    const query = `
        SELECT status_id, end_date FROM rental 
        WHERE member_id = ? AND movie_id = ? 
        AND status_id IN ('S001', 'S002') 
        AND (end_date IS NULL OR end_date >= CURDATE())
        ORDER BY rental_id DESC LIMIT 1
    `;
    db.query(query, [member_id, movie_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์การเช่า' });
        if (results.length > 0) {
            return res.status(200).json({ 
                isRented: true, 
                status_id: results[0].status_id, 
                end_date: results[0].end_date 
            });
        }
        res.status(200).json({ isRented: false });
    });
});

// เอาไว้เช็คก่อนกดเพลย์ดูหนัง ว่าจ่ายตังค์และแอดมินอนุมัติ (S002) แล้วหรือยัง
app.get('/api/watch/:movie_id/:member_id', (req, res) => {
    const { movie_id, member_id } = req.params;
    const query = `
        SELECT r.*, m.video_file, m.movie_name, m.poster_pic, m.description 
        FROM rental r
        JOIN movie m ON r.movie_id = m.movie_id
        WHERE r.member_id = ? AND r.movie_id = ? AND r.status_id = 'S002'
        ORDER BY r.rental_id DESC LIMIT 1
    `;
    db.query(query, [member_id, movie_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์การรับชม' });
        if (results.length === 0) {
            return res.status(403).json({ message: 'คุณยังไม่ได้รับสิทธิ์ในการรับชมภาพยนตร์เรื่องนี้ หรือสถานะยังไม่ได้รับการอนุมัติ' });
        }
        res.status(200).json(results[0]); // โยนชื่อไฟล์วิดีโอไปให้หน้าเว็บเล่น
    });
});

// ==========================================
// API ระบบแอดมิน (จัดการหนังและตรวจสลิปจ่ายเงิน)
// ==========================================
// แอดมินเพิ่มหนังใหม่เข้าระบบ
app.post('/api/admin/movies', upload.fields([{ name: 'poster' }, { name: 'video' }]), (req, res) => {
    const { movie_id, movie_name, genre, director, actor, duration, release_date, price, trailer, description, rental_status } = req.body;
    const poster_pic = req.files['poster'] ? req.files['poster'][0].filename : null;
    const video_file = req.files['video'] ? req.files['video'][0].filename : null;

    const query = `
        INSERT INTO movie (
            movie_id, movie_name, genre, director, actor, 
            duration, release_date, price, trailer, description, 
            rental_status, poster_pic, video_file
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.query(query, [
        movie_id, movie_name, genre, director || '', actor || '', 
        duration || 0, release_date || null, price || 0, trailer || '', description || '', 
        rental_status || 'Available', poster_pic, video_file
    ], (err) => {
        if (err) {
            console.error('Error saving movie details:', err);
            return res.status(500).json({ message: 'ไม่สามารถเพิ่มภาพยนตร์ลงฐานข้อมูลได้' });
        }
        res.status(201).json({ message: 'เพิ่มภาพยนตร์เข้าสู่ระบบสำเร็จแล้ว!' });
    });
});

// แอดมินแก้ไขข้อมูลหนัง
app.put('/api/movies/:id', upload.fields([{ name: 'poster_pic' }, { name: 'video' }]), (req, res) => {
    const movieId = req.params.id;
    const { movie_name, genre, director, actor, duration, release_date, price, trailer, description, rental_status } = req.body;
    
    const newPoster = req.files && req.files['poster_pic'] ? req.files['poster_pic'][0].filename : null;
    const newVideo = req.files && req.files['video'] ? req.files['video'][0].filename : null;

    let updateFields = [
        'movie_name = ?', 'genre = ?', 'director = ?', 'actor = ?', 
        'duration = ?', 'release_date = ?', 'price = ?', 'trailer = ?', 
        'description = ?', 'rental_status = ?'
    ];
    let params = [
        movie_name, genre, director || '', actor || '', 
        duration || 0, release_date || null, price, trailer || null, 
        description || '', rental_status || 'Available'
    ];

    if (newPoster) {
        updateFields.push('poster_pic = ?');
        params.push(newPoster);
    }
    if (newVideo) {
        updateFields.push('video_file = ?');
        params.push(newVideo);
    }

    params.push(movieId);
    
    const query = `UPDATE movie SET ${updateFields.join(', ')} WHERE movie_id = ?`;

    db.query(query, params, (err) => {
        if (err) {
            console.error('Error updating movie:', err);
            return res.status(500).json({ message: 'ไม่สามารถอัปเดตข้อมูลภาพยนตร์ได้' });
        }
        res.status(200).json({ message: 'แก้ไขข้อมูลภาพยนตร์สำเร็จเรียบร้อยแล้ว!' });
    });
});

// แอดมินลบหนังออก
app.delete('/api/movies/:id', (req, res) => {
    const movieId = req.params.id;
    db.query('DELETE FROM movie WHERE movie_id = ?', [movieId], (err) => {
        if (err) return res.status(500).json({ message: 'ไม่สามารถลบภาพยนตร์ได้' });
        res.status(200).json({ message: 'ลบภาพยนตร์สำเร็จเรียบร้อยแล้ว!' });
    });
});

// ดึงรายการจ่ายเงินทั้งหมดให้แอดมินดู (บิลใหม่/รอยืนยัน เด้งขึ้นบนสุด)
app.get('/api/admin/payments', (req, res) => {
    autoDeleteExpiredRejected(); // เคลียร์ขยะก่อนดึงข้อมูลมาแสดง
    const query = `
        SELECT r.rental_id, r.duration_days, r.member_id, m.firstname, m.lastname, m.email, mov.movie_name, mov.price, s.status_name, s.status_id, rc.receipt_id, rc.payment_slip
        FROM rental r JOIN member m ON r.member_id = m.member_id JOIN movie mov ON r.movie_id = mov.movie_id JOIN rental_status s ON r.status_id = s.status_id LEFT JOIN receipt rc ON r.rental_id = rc.rental_id
        ORDER BY CASE WHEN r.status_id = 'S001' THEN 0 ELSE 1 END, r.rental_id DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรายการชำระเงินได้' });
        res.status(200).json(results);
    });
});

// ดึงรายละเอียดบิลจ่ายเงินใบเดียว (เอาไว้กดดูสลิปแบบขยายใหญ่)
app.get('/api/admin/payments/:id', (req, res) => {
    const rentalId = req.params.id;
    const query = `
        SELECT r.rental_id, r.duration_days, r.start_date, r.end_date, m.member_id, m.firstname, m.lastname, m.email, m.phone, mov.movie_id, mov.movie_name, mov.poster_pic, mov.price, s.status_name, s.status_id, rc.receipt_id, rc.payment_slip
        FROM rental r JOIN member m ON r.member_id = m.member_id JOIN movie mov ON r.movie_id = mov.movie_id JOIN rental_status s ON r.status_id = s.status_id LEFT JOIN receipt rc ON r.rental_id = rc.rental_id WHERE r.rental_id = ?
    `;
    db.query(query, [rentalId], (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' });
        if (results.length === 0) return res.status(404).json({ message: 'ไม่พบรายการธุรกรรมนี้' });
        res.status(200).json(results[0]);
    });
});

// แอดมินกดตรวจสลิป (อนุมัติ / ปฏิเสธ / ยกเลิก)
app.put('/api/admin/payments/:id', (req, res) => {
    const rentalId = req.params.id;
    const { action, admin_id } = req.body;

    if (!action) return res.status(400).json({ message: 'กรุณาระบุการกระทำที่ต้องการดำเนินการ' });

    if (action === 'approve') {
        // กดปุ่ม อนุมัติ -> ให้สิทธิ์ดูหนังตามจำนวนวันที่ซื้อมา นับตั้งแต่วันนี้
        const queryDuration = 'SELECT duration_days FROM rental WHERE rental_id = ?';
        db.query(queryDuration, [rentalId], (err, results) => {
            if (err || results.length === 0) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลระยะเวลาเช่า' });

            const days = results[0].duration_days;
            const updateApprove = `UPDATE rental SET start_date = CURDATE(), end_date = DATE_ADD(CURDATE(), INTERVAL ? DAY), status_id = 'S002', admin_id = ? WHERE rental_id = ?`;
            db.query(updateApprove, [days, admin_id || null, rentalId], (err) => {
                if (err) return res.status(500).json({ message: 'อนุมัติการเช่าไม่สำเร็จ' });
                res.status(200).json({ message: 'อนุมัติการชำระเงินและการเช่าเสร็จสิ้น!' });
            });
        });
    } else if (action === 'reject') {
        // กดปุ่ม ปฏิเสธ (สลิปปลอม/ยอดไม่ตรง) -> เปลี่ยนสถานะเป็น S004 รอโดนลบอัตโนมัติ
        const updateReject = `UPDATE rental SET status_id = 'S004', admin_id = ? WHERE rental_id = ?`;
        db.query(updateReject, [admin_id || null, rentalId], (err) => {
            if (err) return res.status(500).json({ message: 'บันทึกการปฏิเสธไม่สำเร็จ' });
            res.status(200).json({ message: 'ปฏิเสธหลักฐานการชำระเงินเรียบร้อยแล้ว' });
        });
    } else if (action === 'cancel') {
        // แอดมินสั่งยกเลิกสิทธิ์กลางคัน (เช่น ทำผิดกฎ) -> เปลี่ยนเป็น S003
        const updateCancel = `UPDATE rental SET status_id = 'S003', admin_id = ? WHERE rental_id = ?`;
        db.query(updateCancel, [admin_id || null, rentalId], (err) => {
            if (err) return res.status(500).json({ message: 'ยกเลิกสิทธิ์การเช่าไม่สำเร็จ' });
            res.status(200).json({ message: 'ยกเลิกสิทธิ์การเช่าภาพยนตร์เรื่องนี้เรียบร้อยแล้ว' });
        });
    } else {
        res.status(400).json({ message: 'Action ไม่ถูกต้อง' });
    }
});

// ==========================================
// API บันทึกการจ่ายเงินของฝั่งผู้ใช้ & ดูประวัติ
// ==========================================
// ยูสเซอร์กดชำระเงินและแนบสลิป
app.post('/api/rentals', upload.single('slip_payment'), (req, res) => {
    const { movie_id, user_id, rental_plan } = req.body;
    const payment_slip = req.file ? req.file.filename : null;

    if (!movie_id || !user_id || !payment_slip) {
        return res.status(400).json({ message: 'ข้อมูลการเช่าหรือสลิปไม่ครบถ้วน' });
    }

    // เช็คก่อนว่าเช่าอยู่แล้วไหม
    const checkActiveQuery = `
        SELECT * FROM rental 
        WHERE member_id = ? AND movie_id = ? 
        AND status_id IN ('S001', 'S002') 
        AND (end_date IS NULL OR end_date >= CURDATE())
    `;
    db.query(checkActiveQuery, [user_id, movie_id], (err, activeResults) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
        if (activeResults.length > 0) {
            return res.status(400).json({ message: 'คุณกำลังเช่าภาพยนตร์เรื่องนี้อยู่แล้ว ไม่สามารถเช่าซ้ำได้จนกว่าจะหมดอายุ' });
        }

        const duration_days = rental_plan === 'month' ? 30 : 7;
        
        // เจนรหัสการเช่า (Rental ID) ใหม่
        const getLatestRentalId = 'SELECT rental_id FROM rental ORDER BY rental_id DESC LIMIT 1';
        db.query(getLatestRentalId, (err, rentalResults) => {
            if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });

            let nextRentalId = 'R001';
            if (rentalResults.length > 0) {
                const lastId = rentalResults[0].rental_id;
                const currentNumber = parseInt(lastId.replace('R', '')) || 0;
                nextRentalId = `R${String(currentNumber + 1).padStart(3, '0')}`;
            }

            // บันทึกบิลเช่าเป็นสถานะ รอยืนยัน (S001)
            const insertRental = `INSERT INTO rental (rental_id, start_date, end_date, duration_days, member_id, movie_id, status_id, admin_id) VALUES (?, NULL, NULL, ?, ?, ?, 'S001', NULL)`;
            db.query(insertRental, [nextRentalId, duration_days, user_id, movie_id], (err) => {
                if (err) return res.status(500).json({ message: 'บันทึกข้อมูลการเช่าไม่สำเร็จ' });

                // เจนรหัสใบเสร็จ (Receipt ID) ใหม่
                const getLatestReceiptId = 'SELECT receipt_id FROM receipt ORDER BY receipt_id DESC LIMIT 1';
                db.query(getLatestReceiptId, (err, receiptResults) => {
                    let nextReceiptId = 'REC001';
                    if (receiptResults.length > 0) {
                        const lastId = receiptResults[0].receipt_id;
                        const currentNumber = parseInt(lastId.replace('REC', '')) || 0;
                        nextReceiptId = `REC${String(currentNumber + 1).padStart(3, '0')}`;
                    }

                    // บันทึกรูปสลิปลงตารางใบเสร็จ
                    const insertReceipt = 'INSERT INTO receipt (receipt_id, payment_slip, rental_id) VALUES (?, ?, ?)';
                    db.query(insertReceipt, [nextReceiptId, payment_slip, nextRentalId], (err) => {
                        if (err) return res.status(500).json({ message: 'บันทึกหลักฐานชำระเงินไม่สำเร็จ' });
                        res.status(201).json({ message: 'ส่งข้อมูลและอัปโหลดสลิปสำเร็จ รอนุมัติจากผู้ดูแลระบบ' });
                    });
                });
            });
        });
    });
});

// ยูสเซอร์ดูหน้าประวัติการเช่าของตัวเอง
app.get('/api/history/:member_id', (req, res) => {
    autoDeleteExpiredRejected();
    const memberId = req.params.member_id;
    const query = `
        SELECT r.rental_id, r.start_date, r.end_date, r.duration_days, mov.movie_id, mov.movie_name, mov.poster_pic, mov.price, s.status_id, s.status_name
        FROM rental r JOIN movie mov ON r.movie_id = mov.movie_id JOIN rental_status s ON r.status_id = s.status_id WHERE r.member_id = ? ORDER BY r.rental_id DESC
    `;
    db.query(query, [memberId], (err, results) => {
        if (err) return res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลประวัติการเช่าได้' });
        res.status(200).json(results);
    });
});

// ลบประวัติการเช่าทิ้งถาวร
app.delete('/api/rentals/:id', (req, res) => {
    const rentalId = req.params.id;
    db.query('DELETE FROM rental WHERE rental_id = ?', [rentalId], (err) => {
        if (err) return res.status(500).json({ message: 'ไม่สามารถลบประวัติรายการเช่านี้ได้' });
        res.status(200).json({ message: 'ลบข้อมูลประวัติการเช่าออกจากระบบสำเร็จถาวร!' });
    });
});

// ==========================================
// API ระบบรีวิวและให้คะแนนดาว
// ==========================================
// เช็คก่อนว่ายูสเซอร์เคยเช่าหนังเรื่องนี้จริงไหม ถึงจะยอมให้โชว์ฟอร์มเขียนรีวิวได้
app.get('/api/check-review-permission', (req, res) => {
    const { member_id, movie_id } = req.query;
    const query = `SELECT * FROM rental WHERE member_id = ? AND movie_id = ? AND status_id = 'S002'`;
    db.query(query, [member_id, movie_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' });
        res.status(200).json({ canReview: results.length > 0 });
    });
});

// ดึงรีวิวและคะแนนเฉลี่ยทั้งหมดของหนังเรื่องนั้นๆ ไปโชว์หน้าเว็บ
app.get('/api/movies/:id/reviews', (req, res) => {
    const movieId = req.params.id;
    const query = `
        SELECT r.review_id, r.rating, m.firstname, m.lastname, m.profile_pic 
        FROM review r JOIN member m ON r.member_id = m.member_id WHERE r.movie_id = ? ORDER BY r.review_id DESC
    `;
    db.query(query, [movieId], (err, results) => {
        if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงคะแนนรีวิว' });
        
        let total = results.length;
        let avg = 0;
        // คำนวณหาค่าเฉลี่ยดาว
        if (total > 0) {
            let sum = results.reduce((acc, curr) => acc + Number(curr.rating), 0);
            avg = (sum / total).toFixed(1);
        }
        res.status(200).json({ reviews: results, averageRating: avg, totalReviews: total });
    });
});

// รับคะแนนรีวิวจากยูสเซอร์เซฟลงฐานข้อมูล
app.post('/api/reviews', (req, res) => {
    const { movie_id, member_id, rating } = req.body;

    if (!movie_id || !member_id || !rating) return res.status(400).json({ message: 'กรุณาระบุรหัสและคะแนนดาวให้ครบถ้วน' });

    const checkQuery = "SELECT * FROM rental WHERE member_id = ? AND movie_id = ? AND status_id = 'S002'";
    db.query(checkQuery, [member_id, movie_id], (err, results) => {
        if (err || results.length === 0) return res.status(403).json({ message: 'คุณต้องเช่าและได้รับอนุมัติภาพยนตร์เรื่องนี้ก่อน จึงจะให้คะแนนได้' });

        const checkExistingReview = "SELECT * FROM review WHERE movie_id = ? AND member_id = ?";
        db.query(checkExistingReview, [movie_id, member_id], (err, revResults) => {
            if (err) return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล' });

            if (revResults.length > 0) {
                const updateReview = "UPDATE review SET rating = ?, comment = '' WHERE movie_id = ? AND member_id = ?";
                db.query(updateReview, [rating, movie_id, member_id], (err) => {
                    if (err) return res.status(500).json({ message: 'ไม่สามารถอัปเดตคะแนนได้' });
                    res.status(200).json({ message: 'อัปเดตคะแนนภาพยนตร์สำเร็จเรียบร้อยแล้ว!' });
                });
            } else {
                const getLatestRevId = 'SELECT review_id FROM review ORDER BY review_id DESC LIMIT 1';
                db.query(getLatestRevId, (err, revIdResults) => {
                    let nextRevId = 'REV001';
                    if (revIdResults.length > 0) {
                        const lastRevId = revIdResults[0].review_id;
                        const currentNum = parseInt(lastRevId.replace('REV', '')) || 0;
                        nextRevId = `REV${String(currentNum + 1).padStart(3, '0')}`;
                    }

                    const insertQuery = "INSERT INTO review (review_id, movie_id, member_id, rating, comment) VALUES (?, ?, ?, ?, '')";
                    db.query(insertQuery, [nextRevId, movie_id, member_id, rating], (err) => {
                        if (err) return res.status(500).json({ message: 'ไม่สามารถบันทึกคะแนนลงฐานข้อมูลได้' });
                        res.status(201).json({ message: 'บันทึกคะแนนภาพยนตร์สำเร็จ!' });
                    });
                });
            }
        });
    });
});

// ==========================================
// API ดึงสถิติไปโชว์ในหน้า Dashboard ของแอดมิน
// ==========================================
app.get('/api/admin/dashboard-stats', (req, res) => {
    const { timeframe = 'monthly' } = req.query;

    const statsQuery = `SELECT (SELECT COUNT(*) FROM movie) AS total_movies, (SELECT COUNT(*) FROM member WHERE role = 'Member') AS total_members, (SELECT COUNT(*) FROM rental WHERE status_id = 'S001') AS pending_payments`;
    const topRentalsQuery = `SELECT m.movie_name, COUNT(r.rental_id) AS rental_count FROM movie m LEFT JOIN rental r ON m.movie_id = r.movie_id GROUP BY m.movie_id, m.movie_name ORDER BY rental_count DESC LIMIT 5`;
    const topRatedQuery = `SELECT m.movie_name, COALESCE(AVG(r.rating), 0) AS avg_rating FROM movie m JOIN review r ON m.movie_id = r.movie_id GROUP BY m.movie_id, m.movie_name ORDER BY avg_rating DESC LIMIT 3`;
    
    let revenueQuery = '';
    if (timeframe === 'daily') {
        revenueQuery = `SELECT DATE_FORMAT(r.start_date, '%Y-%m-%d') AS label, SUM(m.price) AS revenue FROM rental r JOIN movie m ON r.movie_id = m.movie_id WHERE r.status_id = 'S002' AND r.start_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(r.start_date) ORDER BY r.start_date`;
    } else if (timeframe === 'yearly') {
        revenueQuery = `SELECT YEAR(r.start_date) AS label, SUM(m.price) AS revenue FROM rental r JOIN movie m ON r.movie_id = m.movie_id WHERE r.status_id = 'S002' GROUP BY YEAR(r.start_date) ORDER BY label DESC LIMIT 5`;
    } else {
        revenueQuery = `SELECT MONTH(r.start_date) AS label, SUM(m.price) AS revenue FROM rental r JOIN movie m ON r.movie_id = m.movie_id WHERE r.status_id = 'S002' AND YEAR(r.start_date) = YEAR(CURDATE()) GROUP BY MONTH(r.start_date) ORDER BY label`;
    }

    db.query(statsQuery, (err, statsResults) => {
        if (err) return res.status(500).json({ message: 'Error fetching base stats' });
        db.query(topRentalsQuery, (err, rentalResults) => {
            if (err) return res.status(500).json({ message: 'Error fetching top rentals' });
            db.query(topRatedQuery, (err, ratedResults) => {
                if (err) return res.status(500).json({ message: 'Error fetching top rated' });
                db.query(revenueQuery, (err, revenueResults) => {
                    if (err) return res.status(500).json({ message: 'Error fetching revenue' });
                    res.status(200).json({ summary: statsResults[0], topRentals: rentalResults, topRated: ratedResults, chartData: revenueResults, timeframe });
                });
            });
        });
    });
});

// ==========================================
// สั่งให้เซิร์ฟเวอร์เริ่มทำงาน (Start Server)
// ==========================================
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`เซิร์ฟเวอร์ทำงานอยู่ที่ http://localhost:${PORT}`);
});