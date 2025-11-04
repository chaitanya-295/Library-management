document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3000/api';

    // --- PAGE NAVIGATION ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');

    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const pageId = link.getAttribute('data-page');
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
        });
    });

    // --- ISSUE/RETURN TAB SWITCHING ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const formContents = document.querySelectorAll('.form-content');

    tabLinks.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            tabLinks.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            formContents.forEach(content => content.classList.toggle('active', content.id === `${tabId}-form`));
        });
    });

    // --- MODAL HANDLING ---
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form');
    // NEW: Reference to modal body for non-form content
    const modalBody = document.querySelector('.modal-body'); 
    const closeModalBtn = document.getElementById('modal-close-btn');

    const openModal = () => modal.style.display = 'flex';
    const closeModal = () => {
        modal.style.display = 'none';
        // NEW: Clear modal body when closing to prevent old content from showing
        modalBody.innerHTML = '<form id="modal-form"></form>';
    };

    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });

    // --- DYNAMIC MODAL FOR ADDING & EDITING ---
    const setupModal = async (type, id = null) => {
        modalBody.innerHTML = '<form id="modal-form"></form>'; // Ensure form is present
        const dynamicModalForm = document.getElementById('modal-form');
        const isEditing = id !== null;
        let item = {};
        
        if (isEditing) {
            try {
                // Fetch all items and find the specific one
                const response = await fetch(`${API_BASE_URL}/${type}s`);
                const items = await response.json();
                item = items.find(i => i.id === id) || {};
            } catch (error) {
                console.error(`Error fetching ${type}:`, error);
            }
        }

        dynamicModalForm.innerHTML = ''; // Clear previous form
        let fields = [];
        let title = isEditing ? `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}` : `Add New ${type.charAt(0).toUpperCase() + type.slice(1)}`;

        switch (type) {
            case 'book':
                fields = [
                    { name: 'id', label: 'Book ID', value: item.id || '', readonly: isEditing },
                    { name: 'title', label: 'Book Title', value: item.title || '' },
                    { name: 'author', label: 'Author Name', value: item.author || '' },
                    { name: 'category', label: 'Category', value: item.category || '' },
                    { name: 'copies', label: 'Number of Copies', type: 'number', value: item.copies || '' }
                ];
                break;
            case 'student':
                fields = [
                    { name: 'id', label: 'Student ID', value: item.id || '', readonly: isEditing },
                    { name: 'name', label: 'Student Name', value: item.name || '' },
                    { name: 'email', label: 'Email Address', type: 'email', value: item.email || '' },
                    { name: 'department', label: 'Department', value: item.department || '' }
                ];
                break;
            case 'staff':
                fields = [
                    { name: 'id', label: 'Staff ID', value: item.id || '', readonly: isEditing },
                    { name: 'name', label: 'Staff Name', value: item.name || '' },
                    { name: 'role', label: 'Role', value: item.role || '' }
                ];
                break;
        }

        modalTitle.textContent = title;

        fields.forEach(field => {
            dynamicModalForm.innerHTML += `
                <div class="form-group">
                    <label for="${field.name}">${field.label}</label>
                    <input type="${field.type || 'text'}" id="${field.name}" name="${field.name}" value="${field.value}" ${field.readonly ? 'readonly' : ''} required>
                </div>
            `;
        });
        dynamicModalForm.innerHTML += `<button type="submit" class="btn btn-primary form-submit-btn">${isEditing ? 'Update' : 'Add'} ${type.charAt(0).toUpperCase() + type.slice(1)}</button>`;

        dynamicModalForm.onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            const url = isEditing ? `${API_BASE_URL}/${type}s/${id}` : `${API_BASE_URL}/${type}s`;
            const method = isEditing ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                await renderApp(); // Re-render everything to show changes
                closeModal();
            } catch (error) {
                console.error(`Error saving ${type}:`, error);
                alert(`Failed to save ${type}. Please check the console for details.`);
            }
        };

        openModal();
    };
    
    // NEW: Function to show student history report
    const showStudentHistory = async (studentId, studentName) => {
        try {
            const response = await fetch(`${API_BASE_URL}/students/${studentId}/history`);
            const history = await response.json();

            modalTitle.textContent = `Transaction History for ${studentName}`;
            
            let contentHtml = '';
            if (history.length === 0) {
                contentHtml = '<p>No transaction history found for this student.</p>';
            } else {
                contentHtml = `
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>Book Title</th>
                                <th>Issue Date</th>
                                <th>Return Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${history.map(item => `
                                <tr>
                                    <td>${item.book_title}</td>
                                    <td>${new Date(item.issue_date).toLocaleDateString()}</td>
                                    <td>${item.return_date ? new Date(item.return_date).toLocaleDateString() : 'Not Returned'}</td>
                                    <td><span class="status-badge ${item.status}">${item.status}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
            // Replace the form with our history table
            modalBody.innerHTML = contentHtml;
            openModal();

        } catch (error) {
            console.error(`Error fetching history for student ${studentId}:`, error);
            alert('Could not fetch student history.');
        }
    };


    document.getElementById('add-book-btn').addEventListener('click', () => setupModal('book'));
    document.getElementById('add-student-btn').addEventListener('click', () => setupModal('student'));
    document.getElementById('add-staff-btn').addEventListener('click', () => setupModal('staff'));

    // --- RENDER FUNCTIONS ---
    // MODIFIED: renderBooks to show status
    const renderBooks = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/books`);
            const books = await response.json();
            const list = document.getElementById('book-list');
            const searchTerm = document.getElementById('book-search').value.toLowerCase();
            
            const filtered = books.filter(b => 
                b.title.toLowerCase().includes(searchTerm) || 
                b.author.toLowerCase().includes(searchTerm)
            );

            if (filtered.length === 0) {
                list.innerHTML = `<p>No books found. Click 'Add Book' to get started.</p>`;
                return;
            }
            list.innerHTML = filtered.map(book => {
                const isAvailable = book.available_copies > 0;
                const statusClass = isAvailable ? 'available' : 'unavailable';
                const statusText = isAvailable ? 'Available' : 'All Issued';
                
                return `
                <div class="card list-item-card">
                    <div class="item-details">
                        <h3>${book.title} (ID: ${book.id})</h3>
                        <p>by ${book.author} | Copies: ${book.available_copies} / ${book.copies}</p>
                    </div>
                    <div class="item-status">
                         <span class="status ${statusClass}">${statusText}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon edit-btn" data-id="${book.id}" data-type="book"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete-btn" data-id="${book.id}" data-type="book" data-name="${book.title}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `}).join('');
        } catch (error) {
            console.error("Error fetching books:", error);
            document.getElementById('book-list').innerHTML = `<p class="error">Could not load books. Is the backend server running?</p>`;
        }
    };

    // MODIFIED: renderStudents to add history button
    const renderStudents = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/students`);
            const students = await response.json();
            const list = document.getElementById('student-list');
            const searchTerm = document.getElementById('student-search').value.toLowerCase();

            const filtered = students.filter(s => 
                s.name.toLowerCase().includes(searchTerm) || 
                s.email.toLowerCase().includes(searchTerm)
            );

            if (filtered.length === 0) {
                list.innerHTML = `<p>No students found. Click 'Add Student' to get started.</p>`;
                return;
            }
            list.innerHTML = filtered.map(student => `
                <div class="card list-item-card">
                    <div class="item-details">
                        <h3>${student.name} (ID: ${student.id})</h3>
                        <p>${student.email} | Dept: ${student.department}</p>
                    </div>
                     <div class="item-actions">
                        <button class="btn-icon history-btn" data-id="${student.id}" data-name="${student.name}" title="View History"><i class="fa-solid fa-clock-rotate-left"></i></button>
                        <button class="btn-icon edit-btn" data-id="${student.id}" data-type="student"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete-btn" data-id="${student.id}" data-type="student" data-name="${student.name}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error("Error fetching students:", error);
            document.getElementById('student-list').innerHTML = `<p class="error">Could not load students. Is the backend server running?</p>`;
        }
    };

    const renderStaff = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/staffs`);
            const staff = await response.json();
            const grid = document.getElementById('staff-grid');
            const searchTerm = document.getElementById('staff-search').value.toLowerCase();
            
            const filtered = staff.filter(s => s.name.toLowerCase().includes(searchTerm));

            if (filtered.length === 0) {
                grid.innerHTML = `<p>No staff found. Click 'Add Staff' to get started.</p>`;
                return;
            }
            grid.innerHTML = filtered.map(person => `
                <div class="card staff-card">
                    <i class="fa-solid fa-user-tie staff-icon-large"></i>
                    <h3>${person.name} (ID: ${person.id})</h3>
                    <p>${person.role}</p>
                     <div class="staff-actions">
                        <button class="btn-icon edit-btn" data-id="${person.id}" data-type="staff"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-icon delete-btn" data-id="${person.id}" data-type="staff" data-name="${person.name}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error("Error fetching staff:", error);
            document.getElementById('staff-grid').innerHTML = `<p class="error">Could not load staff. Is the backend server running?</p>`;
        }
    };

    const renderDashboard = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/stats`);
            const stats = await response.json();
            document.getElementById('total-books-stat').textContent = stats.totalBooks;
            document.getElementById('total-students-stat').textContent = stats.totalStudents;
            document.getElementById('total-staff-stat').textContent = stats.totalStaff;
            document.getElementById('overdue-books-stat').textContent = stats.overdueBooks;
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const renderRecentActivity = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/activity`);
            const activities = await response.json();
            const list = document.getElementById('recent-activity-list');

            if (activities.length === 0) {
                list.innerHTML = `<li>No recent activity to show.</li>`;
                return;
            }

            list.innerHTML = activities.map(activity => {
                const action = activity.status === 'issued' ? 'issued' : 'returned';
                const date = activity.status === 'issued' ? new Date(activity.issue_date) : new Date(activity.return_date);
                const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                return `
                    <li class="activity-item">
                        <div class="activity-text">
                            <strong>${activity.student_name}</strong> ${action} the book <em>"${activity.book_title}"</em>.
                        </div>
                        <div class="activity-date">${formattedDate}</div>
                    </li>
                `;
            }).join('');
        } catch (error) {
            console.error("Error fetching recent activity:", error);
            document.getElementById('recent-activity-list').innerHTML = `<li>Could not load activity.</li>`;
        }
    };

    // --- EVENT DELEGATION FOR EDIT, DELETE, AND HISTORY ---
    // MODIFIED: Added history button logic
    document.querySelector('.main-content').addEventListener('click', async e => {
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.dataset.id;
            const type = editBtn.dataset.type;
            setupModal(type, id);
        }

        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            const type = deleteBtn.dataset.type;
            const name = deleteBtn.dataset.name;

            if (confirm(`Are you sure you want to delete ${name}?`)) {
                try {
                    const endpoint = type === 'staff' ? 'staffs' : `${type}s`;
                    const response = await fetch(`${API_BASE_URL}/${endpoint}/${id}`, { method: 'DELETE' });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to delete.');
                    }

                    await renderApp(); // Refresh the view
                } catch (error) {
                    console.error(`Error deleting ${type}:`, error);
                    alert(error.message); 
                }
            }
        }
        
        // NEW: Event listener for history button
        const historyBtn = e.target.closest('.history-btn');
        if (historyBtn) {
            const studentId = historyBtn.dataset.id;
            const studentName = historyBtn.dataset.name;
            showStudentHistory(studentId, studentName);
        }
    });

    // --- ISSUE & RETURN FORM LOGIC ---
    const issueForm = document.getElementById('issue-form');
    issueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            studentId: document.getElementById('issue-student-id').value,
            bookId: document.getElementById('issue-book-id').value,
            issueDate: document.getElementById('issue-date').value,
            dueDate: document.getElementById('due-date').value,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to issue book.');
            }
            alert('Book issued successfully!');
            issueForm.reset();
            await renderApp(); // Update stats & book status
        } catch (error) {
            console.error('Issue Error:', error);
            alert(error.message);
        }
    });

    const returnForm = document.getElementById('return-form');
    const returnBookIdInput = document.getElementById('return-book-id');
    const returnDateInput = document.getElementById('return-date');
    const fineDetailsDiv = document.getElementById('fine-details');

    const checkFine = async () => {
        const bookId = returnBookIdInput.value;
        const returnDate = returnDateInput.value;

        if (!bookId || !returnDate) {
            fineDetailsDiv.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/check-fine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, returnDate })
            });

            if (!response.ok) {
                fineDetailsDiv.style.display = 'none';
                return;
            }

            const data = await response.json();
            if (data.fine > 0) {
                fineDetailsDiv.innerHTML = `<strong>Fine due:</strong> $${data.fine.toFixed(2)} (${data.overdueDays} days overdue). <br> Due date was ${data.dueDate}.`;
                fineDetailsDiv.style.display = 'block';
            } else {
                fineDetailsDiv.innerHTML = `No fine due. Book returned on time.`;
                fineDetailsDiv.style.display = 'block';
            }
        } catch (error) {
            console.error("Error checking fine:", error);
            fineDetailsDiv.style.display = 'none';
        }
    };
    
    returnBookIdInput.addEventListener('input', checkFine);
    returnDateInput.addEventListener('input', checkFine);
    
    returnForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            bookId: returnBookIdInput.value,
            returnDate: returnDateInput.value,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
             if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to return book.');
            }
            alert('Book returned successfully!');
            returnForm.reset();
            fineDetailsDiv.style.display = 'none';
            await renderApp(); // Update stats & book status
        } catch(error) {
            console.error('Return Error:', error);
            alert(error.message);
        }
    });


    // --- MAIN APP INITIALIZER ---
    const renderApp = async () => {
        await renderDashboard();
        await renderRecentActivity();
        await renderBooks();
        await renderStudents();
        await renderStaff();
    };

    // --- EVENT LISTENERS FOR LIVE SEARCH ---
    document.getElementById('book-search').addEventListener('input', () => renderBooks());
    document.getElementById('student-search').addEventListener('input', () => renderStudents());
    document.getElementById('staff-search').addEventListener('input', () => renderStaff());

    // --- INITIAL RENDER ---
    renderApp();
});