/* schoolData_v4
 - teacher create/edit with photo
 - student create with photo
 - visiting card generation
 - export profile/consolidated table to PDF (jsPDF + autotable)
*/

// --- demo users (keep lowercase names for convenience) ---
const demoUsers = [
  { name: 'cpadmin', id: '1111111111111', role: 'principal' },
  { name: 'teacher1', id: '2222222222222', role: 'teacher' },
  { name: 'parent1', id: '3333333333333', role: 'parent' }
];

// --- storage key & seed ---
const KEY = 'schoolData_v4';
function seedIfEmpty() {
  if (!localStorage.getItem(KEY)) {
    const base = { 
      students: [], 
      teachers: [], 
      parents: [], 
      fees: [], 
      classes: [], 
      classSubjects: {} 
    };

    // add sample teacher matching demo user
    base.teachers.push({
      id: 'T-2001',
      name: 'teacher1',
      idCard: '2222222222222',
      classesTaught: ['1'],
      subjects: ['Math', 'English'],
      periods: 'Math:1-2,English:3-4',
      photo: ''
    });

    // sample student
    base.students.push({
      code: '100001',
      name: 'Ali Khan',
      father: 'Asif Khan',
      fatherCNIC: '4444444444444',
      class: '1',
      previousSchool: '',
      address: 'Somewhere',
      dob: '2015-01-01',
      photo: '',
      fees: { paid: 0, due: 2000, fine: 0 },
      feeVouchers: [],
      markSheets: { firstTerm: { subjects: {}, percentage: 0 }, secondTerm: { subjects: {}, percentage: 0 }, thirdTerm: { subjects: {}, percentage: 0 }, final: { subjects: {}, percentage: 0 } },
      attendance: { totalDays: 0, present: 0, absent: 0 },
      dailyDiary: [],
      performance: { daily: [], monthly: [] },
      todayTest: { subject: '', totalMarks: 0, obtainedMarks: 0, percentage: 0 }
    });
    const subjects = ['Math', 'Science', 'English', 'Urdu', 'Social Studies', 'Islamiyat', 'Computer', 'Art', 'Physical Education'];
    subjects.forEach(s => {
      base.students[0].markSheets.firstTerm.subjects[s] = 0;
      base.students[0].markSheets.secondTerm.subjects[s] = 0;
      base.students[0].markSheets.thirdTerm.subjects[s] = 0;
      base.students[0].markSheets.final.subjects[s] = 0;
    });
    base.parents.push({ fatherName: base.students[0].father, fatherCNIC: base.students[0].fatherCNIC, studentCode: base.students[0].code });

    // Initialize sample class and subjects
    base.classes.push({ id: 'C-1001', name: '1' });
    base.classSubjects['1'] = ['Math', 'English'];

    localStorage.setItem(KEY, JSON.stringify(base));
  }
}
function getData() { 
  seedIfEmpty(); 
  let data = JSON.parse(localStorage.getItem(KEY));
  // Ensure classes is an array and classSubjects is an object
  if (!Array.isArray(data.classes)) {
    console.warn('Invalid classes data, resetting to empty array');
    data.classes = [];
  }
  if (typeof data.classSubjects !== 'object' || data.classSubjects === null) {
    console.warn('Invalid classSubjects data, resetting to empty object');
    data.classSubjects = {};
  }
  // Ensure every student has fees and performance objects
  data.students = data.students.map(s => ({
    ...s,
    fees: s.fees || { paid: 0, due: 0, fine: 0 },
    performance: s.performance || { daily: [], monthly: [] }
  }));
  return data;
}
function saveData(payload) { 
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Error saving data to localStorage:', err);
    alert('Failed to save data. Please check storage permissions or try again.');
  }
}

// --- hamburger toggle ---
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const hamburger = document.getElementById('hamburgerToggle');
  if (sidebar && hamburger) {
    sidebar.classList.toggle('active');
    hamburger.style.display = 'block'; // Ensure hamburger button is always visible
    console.log('Sidebar toggled:', sidebar.classList.contains('active') ? 'visible' : 'hidden');
  } else {
    console.error('Sidebar or hamburger button not found:', { sidebar: !!sidebar, hamburger: !!hamburger });
  }
}
document.getElementById('hamburgerToggle')?.addEventListener('click', toggleSidebar);
document.getElementById('hamburgerToggle')?.addEventListener('touchstart', e => {
  e.preventDefault();
  toggleSidebar();
});

// --- view helper ---
function showView(id) {
  try {
    // Remove active class from all views
    const views = document.querySelectorAll('.view');
    if (!views.length) throw new Error('No views found in DOM');
    views.forEach(v => v.classList.remove('active'));

    // Add active class to the target view
    const view = document.getElementById(id);
    if (!view) throw new Error(`View with ID ${id} not found`);
    view.classList.add('active');

    // Toggle sidebar visibility and main content margin
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburgerToggle');
    const mainContent = document.querySelector('.main-content');
    if (!sidebar || !hamburger || !mainContent) {
      console.error('Missing DOM elements:', { sidebar: !!sidebar, hamburger: !!hamburger, mainContent: !!mainContent });
      throw new Error('Sidebar, hamburger button, or main-content not found');
    }

    if (id === 'view-login') {
      sidebar.classList.add('hidden');
      hamburger.classList.add('hidden');
      mainContent.classList.remove('logged-in');
    } else {
      sidebar.classList.remove('hidden');
      hamburger.classList.remove('hidden');
      hamburger.style.display = 'block'; // Ensure hamburger is always visible
      mainContent.classList.add('logged-in');
      // Auto-hide sidebar on all views, but keep hamburger visible
      sidebar.classList.remove('active');
      console.log('Sidebar hidden on view change:', id);
    }

    // Render view-specific content
    if (id === 'view-dashboard') renderDashboard();
    if (id === 'view-students') renderStudentsList();
    if (id === 'view-fees') renderFeesTable();
    if (id === 'view-teachers') renderTeachersList();
    if (id === 'view-teacher') { 
      populateTeacherClassSelect(); 
      const table = document.getElementById('consolidatedClassTable');
      if (table) table.innerHTML = ''; 
    }
    if (id === 'view-classes') renderClassesList();
    if (id === 'view-subjects') renderClassSubjectsList();
  } catch (err) {
    console.error(`Error in showView for ${id}:`, err);
    alert(`An error occurred while loading the view: ${err.message}. Please try again.`);
  }
}

// --- nav handlers ---
function setupNavHandlers() {
  const navLinks = [
    { id: 'nav-dashboard', view: 'view-dashboard' },
    { id: 'nav-admit', view: 'view-admit' },
    { id: 'nav-students', view: 'view-students' },
    { id: 'nav-fees', view: 'view-fees' },
    { id: 'nav-teachers', view: 'view-teachers' },
    { id: 'nav-teacher', view: 'view-teacher' },
    { id: 'nav-classes', view: 'view-classes' },
    { id: 'nav-subjects', view: 'view-subjects' },
    { id: 'nav-logout', view: null }
  ];
  navLinks.forEach(link => {
    const element = document.getElementById(link.id);
    if (element) {
      element.addEventListener('click', e => {
        e.preventDefault();
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburgerToggle');
        if (sidebar) {
          sidebar.classList.remove('active'); // Auto-hide sidebar on nav click
          console.log('Sidebar hidden on nav click:', link.id);
        }
        if (hamburger) hamburger.style.display = 'block'; // Ensure hamburger remains visible
        if (link.id === 'nav-logout') {
          logout();
        } else {
          showView(link.view);
        }
      });
      element.addEventListener('touchstart', e => {
        e.preventDefault();
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburgerToggle');
        if (sidebar) {
          sidebar.classList.remove('active'); // Auto-hide sidebar on nav click
          console.log('Sidebar hidden on nav touch:', link.id);
        }
        if (hamburger) hamburger.style.display = 'block'; // Ensure hamburger remains visible
        if (link.id === 'nav-logout') {
          logout();
        } else {
          showView(link.view);
        }
      });
    } else {
      console.warn(`Navigation element ${link.id} not found in DOM`);
    }
  });
}

// --- login ---
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = (document.getElementById('loginName')?.value || '').trim();
  const id = (document.getElementById('loginId')?.value || '').trim();
  const rolePick = document.getElementById('loginRole')?.value;
  if (!name || !id || !rolePick) { alert('Please fill all login fields'); return; }

  const user = demoUsers.find(u => u.name.toLowerCase() === name.toLowerCase() && u.id === id && (
    (rolePick === 'cpadmin' && u.role === 'principal') ||
    (rolePick === 'teacher' && u.role === 'teacher') ||
    (rolePick === 'parent' && u.role === 'parent')
  ));
  if (!user) { alert('Invalid credentials (use demo accounts)'); return; }
  const cur = { name: user.name, role: user.role, id: user.id };
  localStorage.setItem('currentUser', JSON.stringify(cur));
  document.querySelectorAll('.principal-only').forEach(el => el.style.display = cur.role === 'principal' ? 'block' : 'none');
  document.querySelectorAll('.teacher-only').forEach(el => el.style.display = cur.role === 'teacher' ? 'block' : 'none');
  document.getElementById('dash-welcome').innerText = `Welcome, ${cur.name} (${cur.role})`;
  document.getElementById('sidebar-user').innerText = `${cur.name} (${cur.role})`;
  showView('view-dashboard');
  try {
    populateFilters();
    // Ensure hamburger button is visible after login
    const hamburger = document.getElementById('hamburgerToggle');
    if (hamburger) hamburger.style.display = 'block';
    console.log('Login successful, hamburger button set to visible');
  } catch (err) {
    console.error('Error in populateFilters:', err);
  }
});

// --- logout ---
function logout() {
  localStorage.removeItem('currentUser');
  document.getElementById('sidebar-user').innerText = 'School App';
  showView('view-login');
}

// --- dashboard ---
function renderDashboard() {
  const d = getData();
  document.getElementById('dashCountStudents').innerText = d.students.length;
  document.getElementById('dashCountTeachers').innerText = d.teachers.length;
}

// --- utility: generate 6-digit unique code ---
function generate6Digit() {
  const data = getData();
  let code;
  do { code = Math.floor(100000 + Math.random() * 900000).toString(); } while (data.students.some(s => s.code === code));
  return code;
}

// --- file to base64 helper ---
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = e => rej(e);
    reader.readAsDataURL(file);
  });
}

// --- admit student (principal) ---
document.getElementById('admitForm').addEventListener('submit', async e => {
  e.preventDefault();
  const cur = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!cur || cur.role !== 'principal') { alert('Only principal can admit'); return; }
  const name = document.getElementById('studentName')?.value.trim();
  const father = document.getElementById('fatherName')?.value.trim();
  const fatherCNIC = document.getElementById('fatherCNIC')?.value.trim();
  const klass = document.getElementById('studentClassSection')?.value;
  const prev = document.getElementById('previousSchool')?.value.trim();
  const address = document.getElementById('address')?.value.trim();
  const dob = document.getElementById('dob')?.value;
  const photoInput = document.getElementById('studentPhoto');
  const paid = parseFloat(document.getElementById('feesPaid')?.value || 0);
  const due = parseFloat(document.getElementById('feesDue')?.value || 0);
  if (!name || !father || !fatherCNIC || !klass) { alert('Fill required fields'); return; }
  const data = getData();
  const code = generate6Digit();
  let photoBase = '';
  if (photoInput && photoInput.files && photoInput.files[0]) {
    try {
      photoBase = await fileToBase64(photoInput.files[0]);
    } catch (err) {
      console.error('Error converting photo to base64:', err);
    }
  }
  const student = {
    code, name, father, fatherCNIC, class: klass, previousSchool: prev, address, dob, photo: photoBase,
    fees: { paid, due, fine: 0 }, feeVouchers: [],
    markSheets: { firstTerm: { subjects: {}, percentage: 0 }, secondTerm: { subjects: {}, percentage: 0 }, thirdTerm: { subjects: {}, percentage: 0 }, final: { subjects: {}, percentage: 0 } },
    attendance: { totalDays: 0, present: 0, absent: 0 }, dailyDiary: [], performance: { daily: [], monthly: [] },
    todayTest: { subject: '', totalMarks: 0, obtainedMarks: 0, percentage: 0 }
  };
  const subjects = data.classSubjects[klass] || [];
  subjects.forEach(s => {
    student.markSheets.firstTerm.subjects[s] = 0;
    student.markSheets.secondTerm.subjects[s] = 0;
    student.markSheets.thirdTerm.subjects[s] = 0;
    student.markSheets.final.subjects[s] = 0;
  });
  data.students.push(student);
  data.parents.push({ fatherName: father, fatherCNIC, studentCode: code });
  saveData(data);
  alert(`Student admitted. Code: ${code}`);
  e.target.reset();
  renderDashboard();
  renderStudentsList();
  populateFilters();
  showView('view-students');
});

// --- teachers management (principal) ---
document.getElementById('teacherCreateForm').addEventListener('submit', async e => {
  e.preventDefault();
  const cur = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!cur || cur.role !== 'principal') { alert('Only principal can create teachers'); return; }
  const internalId = document.getElementById('teacherInternalId')?.value || null;
  const tname = document.getElementById('teacherName')?.value.trim();
  const tid = document.getElementById('teacherIdCard')?.value.trim();
  const classesRaw = document.getElementById('teacherClasses')?.value.trim();
  const subjRaw = document.getElementById('teacherSubjects')?.value.trim();
  const periods = document.getElementById('teacherPeriods')?.value.trim();
  const photoInput = document.getElementById('teacherPhoto');
  if (!tname || !tid) { alert('Fill required'); return; }
  const classesTaught = classesRaw ? classesRaw.split(',').map(x => x.trim()) : [];
  const subjects = subjRaw ? subjRaw.split(',').map(x => x.trim()) : [];
  const data = getData();
  let photoBase = '';
  if (photoInput && photoInput.files && photoInput.files[0]) {
    photoBase = await fileToBase64(photoInput.files[0]);
  }
  if (internalId) {
    const t = data.teachers.find(x => x.id === internalId);
    if (!t) return alert('Teacher not found');
    t.name = tname; t.idCard = tid; t.classesTaught = classesTaught; t.subjects = subjects; t.periods = periods;
    if (photoBase) t.photo = photoBase;
    const uIdx = demoUsers.findIndex(u => u.id === tid || u.name.toLowerCase() === t.name.toLowerCase());
    if (uIdx === -1) demoUsers.push({ name: tname.toLowerCase(), id: tid, role: 'teacher' });
    else demoUsers[uIdx] = { name: tname.toLowerCase(), id: tid, role: 'teacher' };
    saveData(data);
    alert('Teacher updated');
  } else {
    const idVal = 'T-' + Date.now().toString(36);
    data.teachers.push({ id: idVal, name: tname, idCard: tid, classesTaught, subjects, periods, photo: photoBase });
    demoUsers.push({ name: tname.toLowerCase(), id: tid, role: 'teacher' });
    saveData(data);
    alert('Teacher created');
  }
  e.target.reset();
  document.getElementById('teacherInternalId').value = '';
  renderTeachersList();
  populateFilters();
});

document.getElementById('teacherResetBtn').addEventListener('click', () => {
  document.getElementById('teacherCreateForm')?.reset();
  document.getElementById('teacherInternalId').value = '';
});

function renderTeachersList() {
  const data = getData();
  const container = document.getElementById('teachersList');
  if (!container) {
    console.error('Teachers list container not found');
    return;
  }
  if (!data.teachers.length) container.innerHTML = '<p class="muted">No teachers yet.</p>';
  else container.innerHTML = data.teachers.map(t => `
    <div class="student-row">
      <div>
        <strong>${t.name}</strong>
        <div class="muted">ID: ${t.idCard}</div>
        <div class="muted">Classes: ${t.classesTaught.join(', ') || '-' } | Subjects: ${t.subjects.join(', ') || '-'}</div>
      </div>
      <div>
        <button class="btn small" onclick="editTeacher('${t.id}')">Edit</button>
        <button class="btn small" onclick="viewTeacherCard('${t.id}')">Profile</button>
      </div>
    </div>
  `).join('');
}

function editTeacher(id) {
  const data = getData();
  const t = data.teachers.find(x => x.id === id);
  if (!t) return alert('Teacher not found');
  document.getElementById('teacherInternalId').value = t.id;
  document.getElementById('teacherName').value = t.name;
  document.getElementById('teacherIdCard').value = t.idCard;
  document.getElementById('teacherClasses').value = (t.classesTaught || []).join(', ');
  document.getElementById('teacherSubjects').value = (t.subjects || []).join(', ');
  document.getElementById('teacherPeriods').value = t.periods || '';
  showView('view-teachers');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function viewTeacherCard(id) {
  const data = getData();
  const t = data.teachers.find(x => x.id === id);
  if (!t) return alert('Teacher not found');
  document.getElementById('profileName').innerText = `Teacher: ${t.name}`;
  document.getElementById('profileVisitingCard').innerHTML = generateVisitingCardHTML({ type: 'teacher', name: t.name, role: 'Teacher', extra: `Classes: ${(t.classesTaught || []).join(', ')}`, photo: t.photo });
  document.getElementById('profileInfo').innerHTML = `<p><strong>ID Card:</strong> ${t.idCard}</p><p><strong>Subjects:</strong> ${(t.subjects || []).join(', ')}</p><p><strong>Periods:</strong> ${t.periods || '-'}</p>`;
  document.getElementById('profileToday').innerHTML = `<p class="muted">Teacher profile (read-only)</p>`;
  document.getElementById('profileMonthly').innerHTML = '';
  showView('view-student-profile');
}

function generateVisitingCardHTML({ type = 'student', name = '', role = '', extra = '', photo = '' }) {
  const img = photo ? `<img src="${photo}" alt="photo">` : `<img src="https://via.placeholder.com/84" alt="photo">`;
  return `<div class="visiting-card">${img}<div class="vc-text"><h3>${name}</h3><p>${role}</p><p>${extra}</p></div></div>`;
}

// --- students list & filters ---
function populateFilters() {
  const data = getData();
  const classes = Array.isArray(data.classes) ? [...new Set(data.classes.map(c => c.name))].sort() : [];
  const selectors = [
    { id: 'filterClass', defaultOption: '<option value="">All Classes</option>' },
    { id: 'teacherClassSelect', defaultOption: '<option value="">Select Class</option>' },
    { id: 'studentClassSection', defaultOption: '<option value="">Select Class/Section</option>' },
    { id: 'subjectClassSelect', defaultOption: '<option value="">Select Class</option>' }
  ];
  selectors.forEach(sel => {
    const element = document.getElementById(sel.id);
    if (element) {
      element.innerHTML = sel.defaultOption + classes.map(c => `<option value="${c}">${c}</option>`).join('');
    } else {
      console.warn(`Selector ${sel.id} not found in DOM`);
    }
  });
  const feeSel = document.getElementById('feeStudentSelect');
  if (feeSel) {
    feeSel.innerHTML = '<option value="">Select Student</option>' + data.students.map(s => `<option value="${s.code}">${s.name} — ${s.class} (${s.code})</option>`).join('');
  } else {
    console.warn('feeStudentSelect not found in DOM');
  }
}

function renderStudentsList() {
  const data = getData();
  const q = (document.getElementById('searchStudent')?.value || '').trim().toLowerCase();
  const filterClass = document.getElementById('filterClass')?.value;
  let list = data.students.slice();
  if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || (s.code && s.code.includes(q)));
  if (filterClass) list = list.filter(s => s.class === filterClass);
  const container = document.getElementById('studentsList');
  if (!container) {
    console.error('Students list container not found');
    return;
  }
  if (list.length === 0) container.innerHTML = '<p class="muted">No students found.</p>';
  else container.innerHTML = list.map(s => `
    <div class="student-row">
      <div>
        <div style="font-weight:700">${s.name} <span class="smallcode">${s.code}</span></div>
        <div class="muted">${s.class} — Father's: ${s.father}</div>
      </div>
      <div>
        <button class="btn small" onclick="viewStudent('${s.code}')">Open</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('searchStudent')?.addEventListener('input', debounce(renderStudentsList, 300));
document.getElementById('filterClass')?.addEventListener('change', renderStudentsList);

// --- view student profile ---
function viewStudent(code) {
  try {
    const data = getData();
    const s = data.students.find(x => x.code === code);
    if (!s) { 
      console.error(`Student with code ${code} not found`);
      throw new Error('Student not found');
    }

    const profileName = document.getElementById('profileName');
    const profileVisitingCard = document.getElementById('profileVisitingCard');
    const profileInfo = document.getElementById('profileInfo');
    const profileToday = document.getElementById('profileToday');
    const profileMonthly = document.getElementById('profileMonthly');

    if (!profileName || !profileVisitingCard || !profileInfo || !profileToday || !profileMonthly) {
      console.error('One or more profile DOM elements not found');
      throw new Error('Missing profile DOM elements');
    }

    profileName.innerText = `${s.name} — ${s.class} (${s.code})`;
    profileVisitingCard.innerHTML = generateVisitingCardHTML({ 
      type: 'student', 
      name: s.name, 
      role: `Class ${s.class}`, 
      extra: `Father: ${s.father}`, 
      photo: s.photo || '' 
    });
    profileInfo.innerHTML = `
      <p><strong>Father:</strong> ${s.father || 'N/A'} &nbsp; | &nbsp; <strong>Father CNIC:</strong> ${s.fatherCNIC || 'N/A'}</p>
      <p><strong>DOB:</strong> ${s.dob || 'N/A'} &nbsp; | &nbsp; <strong>Previous School:</strong> ${s.previousSchool || 'N/A'}</p>
      <p><strong>Address:</strong> ${s.address || 'N/A'}</p>
      <p><strong>Fees (Paid/Due/Fine):</strong> ${s.fees?.paid || 0}/${s.fees?.due || 0}/${s.fees?.fine || 0}</p>`;
    profileToday.innerHTML = (!s.performance?.daily?.length) ? '<p class="muted">No recent records.</p>' : `
      <table><thead><tr><th>Subject</th><th>Marks</th><th>Date</th></tr></thead><tbody>
        ${s.performance.daily.slice(-8).reverse().map(p => `<tr><td>${p.subject || 'N/A'}</td><td>${p.marks || 0}/${p.total || 0}</td><td>${p.date || 'N/A'}</td></tr>`).join('')}
      </tbody></table>`;
    profileMonthly.innerHTML = (!s.performance?.monthly?.length) ? '<p class="muted">No monthly data.</p>' : 
      s.performance.monthly.map(m => `<div><strong>${m.month || 'N/A'}</strong> — ${m.subject || 'N/A'} Avg: ${m.average || 'N/A'}</div>`).join('');
    showView('view-student-profile');
  } catch (err) {
    console.error(`Error rendering student profile for code ${code}:`, err);
    alert(`Error loading student profile: ${err.message}. Returning to students list.`);
    showView('view-students');
  }
}

document.getElementById('backToList')?.addEventListener('click', e => {
  e.preventDefault();
  showView('view-students');
});

// --- export profile to PDF ---
document.getElementById('exportPdf')?.addEventListener('click', async () => {
  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) throw new Error('jsPDF library not loaded');
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.setFontSize(18);
    doc.setTextColor(0, 82, 159);
    doc.text('My School Name', 40, 40);
    const profileInfo = document.getElementById('profileInfo')?.innerText || 'No profile info';
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(profileInfo, 40, 80);
    const s = getCurrentlyViewedProfile();
    if (s && s.performance && s.performance.daily) {
      const rows = s.performance.daily.slice().reverse().slice(0, 30).map(p => [p.date || 'N/A', p.subject || 'N/A', `${p.marks || 0}/${p.total || 0}`, `${p.total > 0 ? ((p.marks/p.total)*100).toFixed(2) : '0'}%`]);
      if (rows.length > 0) {
        doc.autoTable({ startY: 200, head: [['Date', 'Subject', 'Marks', 'Percentage']], body: rows, theme: 'grid', headStyles: { fillColor: [0, 82, 159] } });
      } else {
        doc.text('No performance records.', 40, 220);
      }
    } else {
      doc.text('No performance records.', 40, 220);
    }
    doc.save(`${(s ? s.name : 'profile')}_profile.pdf`);
  } catch (err) {
    console.error('Error exporting PDF:', err);
    alert('Failed to export PDF. Please ensure jsPDF is loaded and try again.');
  }
});

function getCurrentlyViewedProfile() {
  const title = document.getElementById('profileName')?.innerText;
  if (!title) return null;
  const data = getData();
  const m = title.match(/\((\d{6})\)$/);
  if (m) {
    const code = m[1];
    return data.students.find(s => s.code === code);
  } else {
    const tmatch = title.replace('Teacher: ', '').trim();
    return data.teachers.find(t => t.name === tmatch);
  }
}

// --- fees module ---
document.getElementById('feeForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const studentCode = document.getElementById('feeStudentSelect')?.value;
  if (!studentCode) { alert('Select student'); return; }
  const amount = parseFloat(document.getElementById('feeAmount')?.value) || 0;
  const date = document.getElementById('feeDate')?.value || new Date().toISOString().slice(0, 10);
  const paidStatus = document.getElementById('feePaidStatus')?.value;
  const data = getData();
  const s = data.students.find(x => x.code === studentCode);
  if (!s) { alert('Student not found'); return; }
  data.fees.push({ id: Date.now().toString(36), studentCode, name: s.name, class: s.class, amount, date, paid: paidStatus === 'paid' });
  if (paidStatus === 'paid') { s.fees.paid += amount; s.fees.due = Math.max(0, s.fees.due - amount); } else { s.fees.due += amount; }
  saveData(data);
  alert('Fee record saved');
  document.getElementById('feeForm')?.reset();
  populateFilters();
  renderFeesTable();
});

document.getElementById('feeSearch')?.addEventListener('input', debounce(renderFeesTable, 300));
document.getElementById('feeReport')?.addEventListener('click', () => {
  try {
    const data = getData();
    const rows = data.fees.map(f => [f.name, f.class, f.amount, f.date, f.paid ? 'Paid' : 'Unpaid']);
    if (rows.length === 0) return alert('No fee records to export');
    const { jsPDF } = window.jspdf;
    if (!jsPDF) throw new Error('jsPDF library not loaded');
    const doc = new jsPDF('p', 'pt', 'a4');
    doc.text('Fees Report', 40, 40);
    doc.autoTable({ startY: 60, head: [['Name', 'Class', 'Amount', 'Date', 'Status']], body: rows, theme: 'grid' });
    doc.save('fees_report.pdf');
  } catch (err) {
    console.error('Error exporting fees report:', err);
    alert('Failed to export fees report. Please ensure jsPDF is loaded and try again.');
  }
});

function renderFeesTable() {
  const data = getData();
  const q = (document.getElementById('feeSearch')?.value || '').trim().toLowerCase();
  const rows = data.fees.filter(f => !q || f.name.toLowerCase().includes(q) || f.class.toLowerCase().includes(q)).map(f => `
    <tr><td>${f.name}</td><td>${f.class}</td><td>${f.amount}</td><td>${f.date}</td><td>${f.paid ? '<span class="badge-paid">Paid</span>' : '<span class="badge-unpaid">Unpaid</span>'}</td></tr>
  `).join('');
  const table = rows ? `<table><thead><tr><th>Name</th><th>Class</th><th>Amount</th><th>Date</th><th>Paid</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="muted">No fee records.</p>';
  document.getElementById('feesTable').innerHTML = table;
}

// --- teacher panel ---
document.getElementById('loadClassBtn')?.addEventListener('click', () => {
  const klass = document.getElementById('teacherClassSelect')?.value;
  const subject = document.getElementById('teacherSubjectSelect')?.value;
  const date = document.getElementById('marksDate')?.value || new Date().toISOString().slice(0, 10);
  if (!klass || !subject) { alert('Select class and subject'); return; }
  const data = getData();
  const students = data.students.filter(s => s.class === klass);
  if (!students.length) { document.getElementById('teacherStudentsTable').innerHTML = '<p class="muted">No students in this class.</p>'; return; }
  let html = `<table><thead><tr><th>Student</th><th>Total Marks</th><th>Obtained</th><th>Percentage</th></tr></thead><tbody>`;
  students.forEach(s => {
    const recentMark = s.performance.daily.slice().reverse().find(p => p.subject === subject && p.date === date);
    const obtained = (recentMark ? recentMark.marks : '');
    const total = (recentMark ? recentMark.total : 100);
    html += `
      <tr>
        <td>${s.name} <div class="muted smallcode">${s.code}</div></td>
        <td><input type="number" class="input-total" data-code="${s.code}" value="${total}"></td>
        <td><input type="number" class="input-obtained" data-code="${s.code}" value="${obtained}"></td>
        <td class="calc" id="perc-${s.code}">${obtained !== '' ? ((obtained/total*100) || 0).toFixed(2) + '%' : '-'}</td>
      </tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('teacherStudentsTable').innerHTML = html;
  document.querySelectorAll('.input-total, .input-obtained').forEach(inp => {
    inp.addEventListener('input', () => {
      const code = inp.dataset.code;
      const total = parseFloat(document.querySelector(`.input-total[data-code="${code}"]`)?.value) || 0;
      const obt = parseFloat(document.querySelector(`.input-obtained[data-code="${code}"]`)?.value);
      const percEl = document.getElementById(`perc-${code}`);
      if (!isNaN(obt) && total > 0) percEl.innerText = ((obt/total*100) || 0).toFixed(2) + '%';
      else percEl.innerText = '-';
    });
    inp.addEventListener('touchstart', () => inp.focus());
  });
});

document.getElementById('saveMarksBtn')?.addEventListener('click', () => {
  const klass = document.getElementById('teacherClassSelect')?.value;
  const subject = document.getElementById('teacherSubjectSelect')?.value;
  const date = document.getElementById('marksDate')?.value || new Date().toISOString().slice(0, 10);
  if (!klass || !subject) { alert('Select class & subject'); return; }
  const data = getData();
  const students = data.students.filter(s => s.class === klass);
  let changed = 0;
  students.forEach(s => {
    const tot = parseFloat(document.querySelector(`.input-total[data-code="${s.code}"]`)?.value) || 0;
    const obt = parseFloat(document.querySelector(`.input-obtained[data-code="${s.code}"]`)?.value);
    if (!isNaN(obt)) {
      s.performance.daily.push({ subject, total: tot, marks: obt, date });
      const month = date.slice(0, 7);
      let monthly = s.performance.monthly.find(m => m.month === month && m.subject === subject);
      if (!monthly) { monthly = { month, subject, marks: [] }; s.performance.monthly.push(monthly); }
      monthly.marks.push(obt);
      monthly.average = ((monthly.marks.reduce((a, b) => a + b, 0)/monthly.marks.length) || 0).toFixed(2);
      changed++;
    }
  });
  saveData(data);
  alert(`Saved marks for ${changed} students (subject: ${subject})`);
  buildConsolidatedTable(klass);
});

document.getElementById('viewClassConsolidatedBtn')?.addEventListener('click', () => {
  const klass = document.getElementById('teacherClassSelect')?.value;
  if (!klass) { alert('Select class'); return; }
  buildConsolidatedTable(klass);
});

document.getElementById('exportConsolidatedPdf')?.addEventListener('click', () => {
  try {
    const klass = document.getElementById('teacherClassSelect')?.value;
    if (!klass) throw new Error('Select class');
    const { jsPDF } = window.jspdf;
    if (!jsPDF) throw new Error('jsPDF library not loaded');
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(16);
    doc.text(`Class ${klass} Consolidated Performance`, 40, 40);
    const table = document.querySelector('#consolidatedClassTable table');
    if (!table) throw new Error('No consolidated table to export');
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText);
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.replace(/\n/g, ' ')));
    doc.autoTable({ startY: 60, head: [headers], body: rows, styles: { fontSize: 8 }, headStyles: { fillColor: [0, 82, 159] } });
    doc.save(`Class_${klass}_Consolidated.pdf`);
  } catch (err) {
    console.error('Error exporting consolidated PDF:', err);
    alert('Failed to export consolidated report. Please ensure jsPDF is loaded and try again.');
  }
});

function buildConsolidatedTable(klass) {
  const data = getData();
  const students = data.students.filter(s => s.class === klass);
  const subjects = data.classSubjects[klass] || [];
  if (!students.length) { document.getElementById('consolidatedClassTable').innerHTML = '<p class="muted">No students in this class.</p>'; return; }
  let html = `<table><thead><tr><th>Student</th>${subjects.map(sub => `<th>${sub}</th>`).join('')}<th>Overall Avg%</th></tr></thead><tbody>`;
  students.forEach(s => {
    let totalPercSum = 0;
    let countPerc = 0;
    const cells = subjects.map(sub => {
      const recent = s.performance.daily.slice().reverse().find(p => p.subject === sub);
      if (recent) {
        const perc = recent.total > 0 ? (recent.marks/recent.total*100) : 0;
        totalPercSum += perc;
        countPerc++;
        const cls = perc < 40 ? 'status-low' : (perc < 60 ? 'status-mid' : 'status-high');
        return `<td><div class="${cls}">${recent.marks}/${recent.total} (${perc.toFixed(1)}%)</div></td>`;
      } else {
        const fallback = (s.markSheets && s.markSheets.final && s.markSheets.final.subjects && s.markSheets.final.subjects[sub]) ? s.markSheets.final.subjects[sub] : '-';
        return `<td>${fallback === '-' ? '-' : fallback}</td>`;
      }
    }).join('');
    const overall = countPerc ? (totalPercSum/countPerc).toFixed(2) : '-';
    html += `<tr><td style="min-width:160px">${s.name} <div class="muted smallcode">${s.code}</div></td>${cells}<td>${overall === '-' ? '-' : overall + '%'}</td></tr>`;
  });
  html += `</tbody></table>`;
  document.getElementById('consolidatedClassTable').innerHTML = html;
}

function populateTeacherClassSelect() {
  const cur = JSON.parse(localStorage.getItem('currentUser') || 'null');
  const data = getData();
  const sel = document.getElementById('teacherClassSelect');
  if (!sel) {
    console.warn('teacherClassSelect not found in DOM');
    return;
  }
  sel.innerHTML = '<option value="">Select Class</option>';
  const classes = Array.isArray(data.classes) ? data.classes.map(c => c.name).sort() : [];
  if (cur && cur.role === 'teacher') {
    const teacher = data.teachers.find(t => t.idCard === cur.id || t.name.toLowerCase() === cur.name.toLowerCase());
    if (teacher) {
      (teacher.classesTaught || []).forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
      const subjSel = document.getElementById('teacherSubjectSelect');
      if (subjSel) subjSel.innerHTML = `<option value="">Select Subject</option>` + ((teacher.subjects || []).map(s => `<option>${s}</option>`).join(''));
    } else {
      classes.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
    }
  } else {
    classes.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
  }
}

// --- classes management (principal) ---
document.getElementById('classCreateForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const cur = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!cur || cur.role !== 'principal') { alert('Only principal can create classes'); return; }
  const internalId = document.getElementById('classInternalId')?.value || null;
  const cname = document.getElementById('className')?.value.trim();
  const section = document.getElementById('classSection')?.value.trim();
  const fullName = section ? `${cname}-(${section})` : cname;
  if (!cname) { alert('Class name is required'); return; }
  const data = getData();
  if (internalId) {
    const c = data.classes.find(x => x.id === internalId);
    if (!c) return alert('Class not found');
    const oldName = c.name;
    c.name = fullName;
    if (oldName !== fullName && data.classSubjects[oldName]) {
      data.classSubjects[fullName] = data.classSubjects[oldName];
      delete data.classSubjects[oldName];
      data.students.forEach(s => { if (s.class === oldName) s.class = fullName; });
      data.teachers.forEach(t => { t.classesTaught = t.classesTaught.map(tc => tc === oldName ? fullName : tc); });
    }
    saveData(data);
    alert('Class updated');
  } else {
    if (data.classes.some(c => c.name === fullName)) { alert('Class already exists'); return; }
    const idVal = 'C-' + Date.now().toString(36);
    data.classes.push({ id: idVal, name: fullName });
    data.classSubjects[fullName] = [];
    saveData(data);
    alert('Class created');
  }
  e.target.reset();
  document.getElementById('classInternalId').value = '';
  try {
    renderClassesList();
    populateFilters();
  } catch (err) {
    console.error('Error after saving class:', err);
    alert('Error updating class list. Please refresh and try again.');
  }
});

document.getElementById('classResetBtn')?.addEventListener('click', () => {
  document.getElementById('classCreateForm')?.reset();
  document.getElementById('classInternalId').value = '';
});

function renderClassesList() {
  const data = getData();
  const container = document.getElementById('classesList');
  if (!container) {
    console.error('Classes list container not found');
    return;
  }
  if (!data.classes.length) container.innerHTML = '<p class="muted">No classes yet.</p>';
  else container.innerHTML = data.classes.map(c => `
    <div class="student-row">
      <div>
        <strong>${c.name}</strong>
      </div>
      <div>
        <button class="btn small" onclick="editClass('${c.id}')">Edit</button>
      </div>
    </div>
  `).join('');
}

function editClass(id) {
  const data = getData();
  const c = data.classes.find(x => x.id === id);
  if (!c) return alert('Class not found');
  const [name, section] = c.name.split('-(');
  document.getElementById('classInternalId').value = c.id;
  document.getElementById('className').value = name || c.name;
  document.getElementById('classSection').value = section ? section.replace(')', '') : '';
  showView('view-classes');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- subjects management (principal) ---
document.getElementById('subjectAssignForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const cur = JSON.parse(localStorage.getItem('currentUser') || 'null');
  if (!cur || cur.role !== 'principal') { alert('Only principal can assign subjects'); return; }
  const klass = document.getElementById('subjectClassSelect')?.value;
  const subjectsRaw = document.getElementById('subjectsList')?.value.trim();
  if (!klass || !subjectsRaw) { alert('Select class and enter subjects'); return; }
  const subjects = subjectsRaw.split(',').map(s => s.trim()).filter(s => s);
  const data = getData();
  data.classSubjects[klass] = subjects;
  data.students.filter(s => s.class === klass).forEach(s => {
    ['firstTerm', 'secondTerm', 'thirdTerm', 'final'].forEach(term => {
      subjects.forEach(sub => {
        if (!s.markSheets[term].subjects[sub]) s.markSheets[term].subjects[sub] = 0;
      });
    });
  });
  saveData(data);
  alert('Subjects assigned');
  e.target.reset();
  renderClassSubjectsList();
});

function renderClassSubjectsList() {
  const data = getData();
  const container = document.getElementById('classSubjectsList');
  if (!container) {
    console.error('Class subjects list container not found');
    return;
  }
  const classes = Object.keys(data.classSubjects);
  if (!classes.length) container.innerHTML = '<p class="muted">No subjects assigned.</p>';
  else container.innerHTML = classes.map(c => `
    <div class="student-row">
      <div>
        <strong>${c}</strong>
        <div class="muted">Subjects: ${data.classSubjects[c].join(', ') || 'None'}</div>
      </div>
    </div>
  `).join('');
}

// --- debounce utility ---
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// --- initialization ---
document.addEventListener('DOMContentLoaded', () => {
  try {
    const cur = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const hamburger = document.getElementById('hamburgerToggle');
    const sidebar = document.getElementById('sidebar');
    if (cur) {
      document.getElementById('sidebar-user').innerText = `${cur.name} (${cur.role})`;
      document.querySelectorAll('.principal-only').forEach(el => el.style.display = cur.role === 'principal' ? 'block' : 'none');
      document.querySelectorAll('.teacher-only').forEach(el => el.style.display = cur.role === 'teacher' ? 'block' : 'none');
      showView('view-dashboard');
      // Ensure hamburger button is visible on Headquarters
      if (hamburger) {
        hamburger.style.display = 'block';
        console.log('Hamburger button set to visible on init');
      }
      if (sidebar) {
        sidebar.classList.remove('active'); // Ensure sidebar is hidden initially
        console.log('Sidebar initialized as hidden');
      }
    } else {
      showView('view-login');
      if (hamburger) {
        hamburger.classList.add('hidden');
        console.log('Hamburger button hidden on login view');
      }
      if (sidebar) {
        sidebar.classList.add('hidden');
        console.log('Sidebar hidden on login view');
      }
    }
    setupNavHandlers();
    populateFilters();
  } catch (err) {
    console.error('Initialization error:', err);
    alert('Error initializing app. Please refresh and try again.');
  }
});