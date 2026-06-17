let allStudents = [];
let lastClassMap = {};

async function loadStudents() {
  // 同時抓學員與所有課程，計算每人最近上課日
  const [students, classes] = await Promise.all([
    API.apiGet('getStudents'),
    API.apiGet('getClasses')
  ]);

  // 建立 student_id → 最近上課日 的對照表
  classes.forEach(c => {
    if (!lastClassMap[c.student_id] || c.date > lastClassMap[c.student_id]) {
      lastClassMap[c.student_id] = c.date;
    }
  });

  allStudents = students;
  renderStudents(allStudents);
}

function sortByLastClass(students) {
  return [...students].sort((a, b) => {
    const da = lastClassMap[a.id] || '';
    const db = lastClassMap[b.id] || '';
    return db.localeCompare(da); // 最近的排前面，沒有記錄的排最後
  });
}

function renderStudents(students) {
  const active   = sortByLastClass(students.filter(s => s.status === 'active'));
  const inactive = sortByLastClass(students.filter(s => s.status !== 'active'));
  document.getElementById('active-list').innerHTML = active.length
    ? active.map(studentRow).join('')
    : '<li class="student-item" style="color:#8e8e93">尚無在線學員</li>';
  document.getElementById('inactive-list').innerHTML = inactive.map(studentRow).join('');
}

function studentRow(s) {
  const lastDate = lastClassMap[s.id] ? lastClassMap[s.id] : '未有記錄';
  return `<li class="student-item" onclick="location.href='student.html?id=${s.id}'">
    <div>
      <div class="student-name">${s.name}</div>
      <div class="student-meta">${[s.venue, lastDate].filter(Boolean).join(' · ')}</div>
    </div>
    <span class="badge ${s.status === 'active' ? 'badge-active' : 'badge-inactive'}">
      ${s.status === 'active' ? '在線' : '結案'}
    </span>
  </li>`;
}

function filterStudents(query) {
  const filtered = allStudents.filter(s => s.name.includes(query));
  renderStudents(filtered);
}

loadStudents();
