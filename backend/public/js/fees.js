Auth.requireLogin();
renderTopbar('fees.html');


const user = Auth.getUser();
const msgBox = document.getElementById('msg');
let studentsMap = {};
function showMsg(text, type = 'error') {
  msgBox.innerHTML = `<div class="msg ${type}">${text}</div>`;
  setTimeout(() => (msgBox.innerHTML = ''), 5000);
}

function isStaff() {
  return user.role === 'admin' || user.role === 'warden';
}

/* ---------------- LOAD STUDENTS ---------------- */

async function loadStudents() {
  try {
    const users = await apiRequest('/users');

    const studentSelect = document.getElementById('gStudent');

    studentSelect.innerHTML =
      '<option value="">Select Student</option>';

    studentsMap = {};

    users
      .filter((u) => u.role === 'student')
      .forEach((student) => {

        studentsMap[student._id] = student;

        studentSelect.innerHTML += `
          <option value="${student._id}">
            ${student.name} (${student.studentId || student.email})
          </option>
        `;
      });

    studentSelect.addEventListener('change', autoSelectRoom);
    if (!window.feeStudentSelect) {
    window.feeStudentSelect = new TomSelect("#gStudent", {
        create: false,
        sortField: {
            field: "text",
            direction: "asc"
        },
        placeholder: "Search student..."
    });
}

  } catch (err) {
    console.error(err);
    showMsg('Unable to load students');
  }
}

/* ---------------- LOAD ROOMS ---------------- */

async function loadRooms() {
  try {

    const rooms = await apiRequest('/rooms');

    const roomSelect = document.getElementById('gRoom');

    roomSelect.innerHTML =
      '<option value="">Select Room</option>';

    rooms.forEach((room) => {

      roomSelect.innerHTML += `
        <option value="${room._id}">
          Room ${room.roomNumber} (${room.roomType})
        </option>
      `;
    });

    roomSelect.disabled = true;

  } catch (err) {
    console.error(err);
    showMsg('Unable to load rooms');
  }
}
function autoSelectRoom() {

    const studentId =
        document.getElementById('gStudent').value;

    const roomSelect =
        document.getElementById('gRoom');

    if (!studentId) {

        roomSelect.value = "";

        return;
    }

    const student = studentsMap[studentId];

    if (!student) return;

    if (!student.currentRoom){

        roomSelect.value = "";

        showMsg("Student has no room allocated.");

        return;
    }

    roomSelect.value = student.currentRoom._id;
}

/* ---------------- LOAD FEES ---------------- */

async function loadFees() {
  const path = isStaff() ? '/fees' : '/fees/me';

  const records = await apiRequest(path);

  const rows = records
    .map((r) => {
      const studentName =
        isStaff() && r.student ? r.student.name : user.name;

      const payBtn =
        isStaff() && r.status !== 'paid'
          ? `<button data-id="${r._id}" class="payBtn secondary">Record payment</button>`
          : '';

      return `
      <tr>
        <td>${studentName}</td>
        <td>${r.billingCycle}</td>
        <td>${fmtMoney(r.roomRent)}</td>
        <td>${fmtMoney(r.messCharges)}</td>
        <td>${fmtMoney(r.lateFine)}</td>
        <td>${fmtMoney(r.totalAmount)}</td>
        <td>${fmtMoney(r.amountPaid)}</td>
        <td>${fmtMoney(r.balance)}</td>
        <td>${badge(r.status)}</td>
        <td>${payBtn}</td>
      </tr>`;
    })
    .join('');

  document.querySelector('#feesTable tbody').innerHTML =
    rows || '<tr><td colspan="10">No fee records yet</td></tr>';

  document.querySelectorAll('.payBtn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const amount = prompt('Enter payment amount (₹):');

      if (!amount || isNaN(Number(amount))) return;

      const method = prompt(
        'Payment method (cash/upi/card/bank_transfer):',
        'upi'
      );

      try {
        await apiRequest(`/fees/${btn.dataset.id}/pay`, {
          method: 'POST',
          body: {
            amount: Number(amount),
            method: method || 'cash',
          },
        });

        showMsg('Payment recorded', 'success');
        await loadFees();
      } catch (err) {
        showMsg(err.message);
      }
    });
  });
}

/* ---------------- INIT ---------------- */

async function init() {
  document.getElementById('feesHeading').textContent =
    isStaff()
      ? 'All student fee records'
      : 'My fee records';

  if (isStaff()) {
    document.getElementById('adminGenerateCard').style.display = 'block';

    // Load dropdowns
    await loadStudents();
    await loadRooms();

    document
      .getElementById('genForm')
      .addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
          await apiRequest('/fees/generate', {
            method: 'POST',
            body: {
              studentId: document.getElementById('gStudent').value,
              roomId: document.getElementById('gRoom').value,
              billingCycle: document.getElementById('gCycle').value,
              messCharges: Number(
                document.getElementById('gMess').value
              ),
              dueDate: document.getElementById('gDue').value,
            },
          });

          showMsg('Fee record generated', 'success');

          await loadFees();
        } catch (err) {
          showMsg(err.message);
        }
      });
  }

  try {
    await loadFees();
  } catch (err) {
    showMsg(err.message);
  }
}

init();