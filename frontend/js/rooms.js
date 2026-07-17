Auth.requireLogin();
renderTopbar('rooms.html');
const user = Auth.getUser();
const msgBox = document.getElementById('msg');

function showMsg(text, type = 'error') {
  msgBox.innerHTML = `<div class="msg ${type}">${text}</div>`;
  setTimeout(() => (msgBox.innerHTML = ''), 5000);
}

let currentRooms = [];

async function loadRooms() {
  const rooms = await apiRequest('/rooms');
  currentRooms = rooms;
  const rows = rooms
    .map((r) => {
      const free = r.capacity - r.occupants.length;
      const occupantNames = user.role === 'admin' || user.role === 'warden'
        ? (r.occupants.length ? r.occupants.map((o) => `${o.name} (${o.studentId})`).join(', ') : '<em>— empty —</em>')
        : '—';
      const vacancyBadge = free > 0
        ? `<span class="badge vacant">${free} vacant</span>`
        : `<span class="badge full">full</span>`;
      return `<tr>
        <td>${r.hostel ? r.hostel.name : '-'}</td>
        <td>${r.roomNumber}</td>
        <td>${r.floor}</td>
        <td>${r.roomType}</td>
        <td>${r.capacity}</td>
        <td>${r.occupants.length} ${vacancyBadge}</td>
        <td>${occupantNames}</td>
        <td>${fmtMoney(r.monthlyRent)}</td>
        <td>${badge(r.status)}</td>
      </tr>`;
    })
    .join('');
  document.querySelector('#roomsTable tbody').innerHTML = rows || '<tr><td colspan="9">No rooms yet</td></tr>';
}

async function loadMyAllocation() {
  const box = document.getElementById('myAllocationBox');
  try {
    const alloc = await apiRequest('/allocations/me');
    if (!alloc || !alloc._id) {
      box.innerHTML = '<p>You have no active allocation. Submit a request below.</p>';
      return;
    }
    if (alloc.status === 'allocated') {
      box.innerHTML = `<p>Allocated to <strong>Room ${alloc.room.roomNumber}</strong> (Floor ${alloc.room.floor}, ${alloc.room.roomType}) — ${fmtMoney(alloc.room.monthlyRent)}/month. ${badge(alloc.status)}</p>`;
    } else if (alloc.status === 'pending') {
      box.innerHTML = `<p>Your room request has been submitted and is waiting for admin approval. ${badge(alloc.status)}</p>`;
    } else if (alloc.status === 'waitlisted') {
      box.innerHTML = `<p>You are on the waitlist at position <strong>#${alloc.waitlistPosition}</strong> for a ${alloc.preferredRoomType} room. ${badge(alloc.status)}</p>`;
    } else {
      box.innerHTML = `<p>Allocation status: ${badge(alloc.status)}</p>`;
    }
  } catch (err) {
    box.innerHTML = `<p>${err.message}</p>`;
  }
}

// Only rooms that are active AND have a free seat, for the admin's allocate dropdown
function availableRoomOptions() {
  return currentRooms
    .filter((r) => r.status === 'active' && r.occupants.length < r.capacity)
    .map((r) => `<option value="${r._id}">Room ${r.roomNumber} (${r.roomType}, ${r.capacity - r.occupants.length} free)</option>`)
    .join('');
}

async function loadPendingRequests() {
  const requests = await apiRequest('/allocations?status=pending');
  const tbody = document.querySelector('#pendingTable tbody');
  if (!requests.length) {
    tbody.innerHTML = '<tr><td colspan="6">No pending requests</td></tr>';
    return;
  }
  const options = availableRoomOptions();
  tbody.innerHTML = requests
    .map(
      (a) => `<tr data-id="${a._id}">
        <td>${a.student.name} (${a.student.studentId})</td>
        <td>${a.preferredRoomType || '-'}</td>
        <td>${a.preferredFloor ?? '-'}</td>
        <td>${new Date(a.createdAt).toLocaleDateString()}</td>
        <td><select class="allocRoomSelect">${options || '<option value="">No rooms available</option>'}</select></td>
        <td>
          <button type="button" class="allocateBtn" ${options ? '' : 'disabled'}>Allocate</button>
          <button type="button" class="rejectBtn">Reject</button>
        </td>
      </tr>`
    )
    .join('');

  tbody.querySelectorAll('.allocateBtn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const id = row.dataset.id;
      const roomId = row.querySelector('.allocRoomSelect').value;
      if (!roomId) return;
      try {
        const res = await apiRequest(`/allocations/${id}/allocate`, { method: 'POST', body: { roomId } });
        showMsg(res.message, 'success');
        await loadPendingRequests();
        await loadRooms();
      } catch (err) {
        showMsg(err.message);
      }
    });
  });

  tbody.querySelectorAll('.rejectBtn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const row = btn.closest('tr');
      const id = row.dataset.id;
      try {
        const res = await apiRequest(`/allocations/${id}/reject`, { method: 'POST' });
        showMsg(res.message, 'success');
        await loadPendingRequests();
      } catch (err) {
        showMsg(err.message);
      }
    });
  });
}

async function init() {
  try {
    if (user.role === 'student') {
      document.getElementById('studentAllocationCard').style.display = 'block';
      await loadMyAllocation();

      document.getElementById('requestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const preferredRoomType = document.getElementById('prefType').value;
          const floorVal = document.getElementById('prefFloor').value;
          const body = { preferredRoomType };
          if (floorVal !== '') body.preferredFloor = Number(floorVal);
          const res = await apiRequest('/allocations/request', { method: 'POST', body });
          showMsg(res.message, 'success');
          await loadMyAllocation();
          await loadRooms();
        } catch (err) {
          showMsg(err.message);
        }
      });
    }

    if (user.role === 'admin' || user.role === 'warden') {
      document.getElementById('pendingRequestsCard').style.display = 'block';
      await loadRooms();
      await loadPendingRequests();

      if (user.role === 'admin') {
        document.getElementById('adminCreateCard').style.display = 'block';

        document.getElementById('hostelForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            await apiRequest('/hostels', {
              method: 'POST',
              body: {
                name: document.getElementById('hName').value,
                genderCategory: document.getElementById('hGender').value,
                totalFloors: Number(document.getElementById('hFloors').value),
              },
            });
            showMsg('Hostel created', 'success');
            await loadHostelOptions();
          } catch (err) {
            showMsg(err.message);
          }
        });

        document.getElementById('roomForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            await apiRequest('/rooms', {
              method: 'POST',
              body: {
                hostel: document.getElementById('rHostel').value,
                roomNumber: document.getElementById('rNumber').value,
                floor: Number(document.getElementById('rFloor').value),
                roomType: document.getElementById('rType').value,
                capacity: Number(document.getElementById('rCapacity').value),
                monthlyRent: Number(document.getElementById('rRent').value),
              },
            });
            showMsg('Room created', 'success');
            await loadRooms();
          } catch (err) {
            showMsg(err.message);
          }
        });

        await loadHostelOptions();
      }
    }

    await loadRooms();
  } catch (err) {
    showMsg(err.message);
  }
}

async function loadHostelOptions() {
  const hostels = await apiRequest('/hostels');
  document.getElementById('rHostel').innerHTML = hostels.map((h) => `<option value="${h._id}">${h.name}</option>`).join('');
}

init();