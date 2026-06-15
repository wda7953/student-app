let allStudents = [];

async function loadStudents() {
  allStudents = await API.apiGet('getStudents');
  renderStudents(allStudents);
}

function renderStudents(students) {
  const active = students.filter(s => s.status === 'active');
  const inactive = students.filter(s => s.status !== 'active');
  document.getElementById('active-list').innerHTML = active.length
    ? active.map(studentRow).join('')
    : '<li class="student-item" style="color:#8e8e93">尚無在線學員</li>';
  document.getElementById('inactive-list').innerHTML = inactive.map(studentRow).join('');
}

function studentRow(s) {
  return `<li class="student-item" onclick="location.href='student.html?id=${s.id}'">
    <div>
      <div class="student-name">${s.name}</div>
      <div class="student-meta">${[s.venue, s.level].filter(Boolean).join(' · ')}</div>
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
