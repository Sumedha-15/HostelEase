Auth.requireLogin();
renderTopbar('complaints.html');
const user = Auth.getUser();
const msgBox = document.getElementById('msg');

function showMsg(text, type = 'error') {
  msgBox.innerHTML = `<div class="msg ${type}">${text}</div>`;
  setTimeout(() => (msgBox.innerHTML = ''), 5000);
}

function isStaff() { return user.role === 'admin' || user.role === 'warden'; }

async function loadComplaints() {
  const path = isStaff() ? '/complaints' : '/complaints/me';
  const complaints = await apiRequest(path);
  const rows = complaints
    .map((c) => {
      const studentName = isStaff() && c.student ? c.student.name : user.name;
      const roomNum = c.room ? (c.room.roomNumber || '-') : '-';
      let actions = '';
      if (isStaff() && !['resolved', 'closed'].includes(c.status)) {
        actions = `<button data-id="${c._id}" data-action="in_progress" class="markBtn secondary">In progress</button>
                   <button data-id="${c._id}" data-action="resolved" class="markBtn">Resolve</button>`;
      }
      if (!isStaff() && c.status === 'resolved' && !c.studentRating) {
        actions = `<button data-id="${c._id}" class="rateBtn secondary">Rate</button>`;
      }
      return `<tr>
        <td>${studentName}</td>
        <td>${roomNum}</td>
        <td>${c.category}</td>
        <td>${c.description}</td>
        <td>${badge(c.priority)}</td>
        <td>${badge(c.status)}</td>
        <td>${actions}</td>
      </tr>`;
    })
    .join('');
  document.querySelector('#complaintsTable tbody').innerHTML = rows || '<tr><td colspan="7">No complaints yet</td></tr>';

  document.querySelectorAll('.markBtn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await apiRequest(`/complaints/${btn.dataset.id}`, { method: 'PATCH', body: { status: btn.dataset.action } });
        showMsg('Complaint updated', 'success');
        await loadComplaints();
      } catch (err) {
        showMsg(err.message);
      }
    });
  });

  document.querySelectorAll('.rateBtn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const rating = prompt('Rate resolution 1-5:');
      if (!rating || isNaN(Number(rating))) return;
      try {
        await apiRequest(`/complaints/${btn.dataset.id}/rate`, { method: 'POST', body: { rating: Number(rating) } });
        showMsg('Thanks for your feedback!', 'success');
        await loadComplaints();
      } catch (err) {
        showMsg(err.message);
      }
    });
  });
}

async function init() {
  document.getElementById('complaintsHeading').textContent = isStaff() ? 'All complaints' : 'My complaints';
  if (!isStaff()) {
    document.getElementById('studentComplaintCard').style.display = 'block';
    document.getElementById('complaintForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await apiRequest('/complaints', {
          method: 'POST',
          body: { category: document.getElementById('cCategory').value, description: document.getElementById('cDesc').value },
        });
        showMsg('Complaint filed', 'success');
        document.getElementById('cDesc').value = '';
        await loadComplaints();
      } catch (err) {
        showMsg(err.message);
      }
    });
  }
  try {
    await loadComplaints();
  } catch (err) {
    showMsg(err.message);
  }
}

init();
