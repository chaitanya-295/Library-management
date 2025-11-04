// Import required packages
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

// Create an Express application
const app = express();
const PORT = 3000;

// Middleware setup
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable parsing of JSON request bodies

// --- DATABASE CONNECTION CONFIGURATION ---
// Create a connection pool to the MySQL database
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',      // Default XAMPP username
    password: '',      // Default XAMPP password
    database: 'library_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- API ROUTES ---

// Helper function for sending consistent error responses
const sendError = (res, err, message = "An error occurred.") => {
    console.error(err);
    res.status(500).json({ error: message, details: err.message });
};

// --- BOOKS API ---

// GET all books (MODIFIED to include availability)
app.get('/api/books', async (req, res) => {
    try {
        // NEW: Query joins with transactions to calculate available copies
        const sql = `
            SELECT 
                b.*, 
                (b.copies - (SELECT COUNT(*) FROM transactions t WHERE t.book_id = b.id AND t.status = 'issued')) as available_copies
            FROM books b
        `;
        const [rows] = await dbPool.query(sql);
        res.json(rows);
    } catch (err) {
        sendError(res, err, "Failed to fetch books.");
    }
});


// POST a new book
app.post('/api/books', async (req, res) => {
    try {
        const { id, title, author, category, copies } = req.body;
        const sql = 'INSERT INTO books (id, title, author, category, copies) VALUES (?, ?, ?, ?, ?)';
        await dbPool.query(sql, [id, title, author, category, copies]);
        res.status(201).json({ message: 'Book added successfully' });
    } catch (err) {
        sendError(res, err, "Failed to add book.");
    }
});

// PUT (update) an existing book
app.put('/api/books/:id', async (req, res) => {
    try {
        const { title, author, category, copies } = req.body;
        const { id } = req.params;
        const sql = 'UPDATE books SET title = ?, author = ?, category = ?, copies = ? WHERE id = ?';
        await dbPool.query(sql, [title, author, category, copies, id]);
        res.json({ message: 'Book updated successfully' });
    } catch (err) {
        sendError(res, err, "Failed to update book.");
    }
});

// DELETE a book
app.delete('/api/books/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbPool.query('DELETE FROM books WHERE id = ?', [id]);
        res.json({ message: 'Book deleted successfully' });
    } catch (err) {
        // Check for foreign key constraint error
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ // 409 Conflict status
                error: 'Cannot delete this book as it has existing transaction records. Please ensure all copies are returned.'
            });
        }
        sendError(res, err, "Failed to delete book.");
    }
});


// --- STUDENTS API ---

// GET all students
app.get('/api/students', async (req, res) => {
    try {
        const [rows] = await dbPool.query('SELECT * FROM students');
        res.json(rows);
    } catch (err) {
        sendError(res, err, "Failed to fetch students.");
    }
});

// NEW: GET transaction history for a specific student
app.get('/api/students/:id/history', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT 
                t.issue_date,
                t.due_date,
                t.return_date,
                t.status,
                b.title AS book_title
            FROM transactions t
            JOIN books b ON t.book_id = b.id
            WHERE t.student_id = ?
            ORDER BY t.issue_date DESC
        `;
        const [rows] = await dbPool.query(sql, [id]);
        res.json(rows);
    } catch (err) {
        sendError(res, err, "Failed to fetch student history.");
    }
});


// POST a new student
app.post('/api/students', async (req, res) => {
    try {
        const { id, name, email, department } = req.body;
        const sql = 'INSERT INTO students (id, name, email, department) VALUES (?, ?, ?, ?)';
        await dbPool.query(sql, [id, name, email, department]);
        res.status(201).json({ message: 'Student added successfully' });
    } catch (err) {
        sendError(res, err, "Failed to add student.");
    }
});

// PUT (update) an existing student
app.put('/api/students/:id', async (req, res) => {
    try {
        const { name, email, department } = req.body;
        const { id } = req.params;
        const sql = 'UPDATE students SET name = ?, email = ?, department = ? WHERE id = ?';
        await dbPool.query(sql, [name, email, department, id]);
        res.json({ message: 'Student updated successfully' });
    } catch (err) {
        sendError(res, err, "Failed to update student.");
    }
});

// DELETE a student
app.delete('/api/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbPool.query('DELETE FROM students WHERE id = ?', [id]);
        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
         // Check for foreign key constraint error
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ // 409 Conflict status
                error: 'Cannot delete this student as they have existing transaction records.'
            });
        }
        sendError(res, err, "Failed to delete student.");
    }
});


// --- STAFF API ---

// GET all staff
app.get('/api/staffs', async (req, res) => {
    try {
        const [rows] = await dbPool.query('SELECT * FROM staff');
        res.json(rows);
    } catch (err) {
        sendError(res, err, "Failed to fetch staff.");
    }
});

// POST a new staff member
app.post('/api/staffs', async (req, res) => {
    try {
        const { id, name, role } = req.body;
        const sql = 'INSERT INTO staff (id, name, role) VALUES (?, ?, ?)';
        await dbPool.query(sql, [id, name, role]);
        res.status(201).json({ message: 'Staff member added successfully' });
    } catch (err) {
        sendError(res, err, "Failed to add staff member.");
    }
});

// PUT (update) an existing staff member
app.put('/api/staffs/:id', async (req, res) => {
    try {
        const { name, role } = req.body;
        const { id } = req.params;
        const sql = 'UPDATE staff SET name = ?, role = ? WHERE id = ?';
        await dbPool.query(sql, [name, role, id]);
        res.json({ message: 'Staff member updated successfully' });
    } catch (err) {
        sendError(res, err, "Failed to update staff member.");
    }
});

// DELETE a staff member
app.delete('/api/staffs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbPool.query('DELETE FROM staff WHERE id = ?', [id]);
        res.json({ message: 'Staff member deleted successfully' });
    } catch (err) {
        sendError(res, err, "Failed to delete staff member.");
    }
});

// --- RECENT ACTIVITY API ---
app.get('/api/activity', async (req, res) => {
    try {
        const sql = `
            SELECT 
                t.status, 
                t.issue_date, 
                t.return_date, 
                s.name as student_name, 
                b.title as book_title 
            FROM transactions t
            JOIN students s ON t.student_id = s.id
            JOIN books b ON t.book_id = b.id
            ORDER BY COALESCE(t.return_date, t.issue_date) DESC
            LIMIT 5
        `;
        const [rows] = await dbPool.query(sql);
        res.json(rows);
    } catch (err) {
        sendError(res, err, "Failed to fetch recent activity.");
    }
});


// --- TRANSACTIONS API ---
const FINE_PER_DAY = 5; // Fine amount per day

// POST to issue a book
app.post('/api/issue', async (req, res) => {
    try {
        const { studentId, bookId, issueDate, dueDate } = req.body;
        // Basic validation
        if (!studentId || !bookId || !issueDate || !dueDate) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }
        const sql = 'INSERT INTO transactions (book_id, student_id, issue_date, due_date, status) VALUES (?, ?, ?, ?, ?)';
        await dbPool.query(sql, [bookId, studentId, issueDate, dueDate, 'issued']);
        res.status(201).json({ message: 'Book issued successfully.' });
    } catch (err) {
        sendError(res, err, 'Failed to issue book.');
    }
});

// POST to check fine for a book
app.post('/api/check-fine', async (req, res) => {
    try {
        const { bookId, returnDate } = req.body;
        const sql = "SELECT due_date FROM transactions WHERE book_id = ? AND status = 'issued' ORDER BY issue_date DESC LIMIT 1";
        const [rows] = await dbPool.query(sql, [bookId]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No active issue record found for this book.' });
        }
        
        const dueDate = new Date(rows[0].due_date);
        const retDate = new Date(returnDate);

        let fine = 0;
        let overdueDays = 0;
        if (retDate > dueDate) {
            const timeDiff = retDate.getTime() - dueDate.getTime();
            overdueDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
            fine = overdueDays * FINE_PER_DAY;
        }

        res.json({ fine, overdueDays, dueDate: rows[0].due_date });
    } catch (err) {
        sendError(res, err, 'Failed to check fine.');
    }
});


// POST to return a book
app.post('/api/return', async (req, res) => {
    try {
        const { bookId, returnDate } = req.body;
        const findTransactionSql = "SELECT transaction_id, due_date FROM transactions WHERE book_id = ? AND status = 'issued' ORDER BY issue_date DESC LIMIT 1";
        const [rows] = await dbPool.query(findTransactionSql, [bookId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No active issue record found for this book.' });
        }

        const transactionId = rows[0].transaction_id;
        
        const updateSql = "UPDATE transactions SET return_date = ?, status = 'returned' WHERE transaction_id = ?";
        await dbPool.query(updateSql, [returnDate, transactionId]);
        
        res.json({ message: 'Book returned successfully.'});
    } catch (err) {
        sendError(res, err, 'Failed to return book.');
    }
});


// --- DASHBOARD STATS API ---
app.get('/api/stats', async (req, res) => {
    try {
        const [books] = await dbPool.query('SELECT SUM(copies) as count FROM books'); // Changed to SUM(copies) for accuracy
        const [students] = await dbPool.query('SELECT COUNT(*) as count FROM students');
        const [staff] = await dbPool.query('SELECT COUNT(*) as count FROM staff');
        const [overdue] = await dbPool.query("SELECT COUNT(*) as count FROM transactions WHERE due_date < CURDATE() AND status = 'issued'");

        res.json({
            totalBooks: books[0].count || 0,
            totalStudents: students[0].count,
            totalStaff: staff[0].count,
            overdueBooks: overdue[0].count
        });
    } catch (err) {
        sendError(res, err, "Failed to fetch dashboard stats.");
    }
});


// --- START THE SERVER ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});