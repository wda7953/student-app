let allStudents = [];
let lastClassMap = {};
let currentFilter = '全部';

async function loadStudents() {
  const [students, classes] = await Promise.all([
    API.apiGet('getStudents'),
    API.apiGet('getClasses')
  ]);

  classes.forEach(c => {
    const d = new Date(c.date);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!lastClassMap[c.student_id] || ds > lastClassMap[c.student_id]) {
      lastClassMap[c.student_id] = ds;
    }
  });

  allStudents = students;
  applyFilter();
}

function sortByLastClass(students) {
  return [...students].sort((a, b) => {
    const da = lastClassMap[a.id] || '';
    const db = lastClassMap[b.id] || '';
    return db.localeCompare(da);
  });
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === filter);
  });
  applyFilter();
}

function applyFilter() {
  const query = document.getElementById('search').value;
  let students = allStudents;

  if (query) students = students.filter(s => s.name.includes(query));

  if (currentFilter === '武士') {
    students = students.filter(s => s.venue === '武士');
  } else if (currentFilter === '柔力') {
    students = students.filter(s => s.venue === '柔力');
  } else if (currentFilter === '共課夥伴') {
    students = students.filter(s => localStorage.getItem('partner_' + s.id));
  } else if (currentFilter === '單次') {
    students = students.filter(s => localStorage.getItem('single_rate_' + s.id));
  }

  renderStudents(students);
}

function renderStudents(students) {
  const active   = sortByLastClass(students.filter(s => s.status === 'active'));
  const inactive = sortByLastClass(students.filter(s => s.status !== 'active'));
  document.getElementById('active-list').innerHTML = active.length
    ? active.map(studentRow).join('')
    : '<li class="student-item" style="color:#8e8e93">無符合學員</li>';
  document.getElementById('inactive-list').innerHTML = inactive.map(studentRow).join('');
}

function studentRow(s) {
  const lastDate = lastClassMap[s.id] ? lastClassMap[s.id] : '未有記錄';
  const hasPartner = localStorage.getItem('partner_' + s.id);
  const hasRate = localStorage.getItem('single_rate_' + s.id);
  const tags = [
    hasPartner ? '共課' : null,
    hasRate ? '單次' : null
  ].filter(Boolean).map(t => `<span style="font-size:11px;padding:1px 5px;border-radius:8px;background:#EDE5D8;color:#4A3728;font-weight:600">${t}</span>`).join(' ');
  return `<li class="student-item" onclick="location.href='student.html?id=${s.id}'">
    <div>
      <div class="student-name">${s.name} ${tags}</div>
      <div class="student-meta">${[s.venue, lastDate].filter(Boolean).join(' · ')}</div>
    </div>
    <span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}">
      ${s.status === 'active' ? '在線' : '結案'}
    </span>
  </li>`;
}

// 舊的 filterStudents 保留相容
function filterStudents(query) { applyFilter(); }

loadStudents();
