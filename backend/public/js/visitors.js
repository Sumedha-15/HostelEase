Auth.requireLogin();
renderTopbar("visitors.html");

const msgBox = document.getElementById("msg");

function showMsg(text, type = "error") {
    msgBox.innerHTML = `<div class="msg ${type}">${text}</div>`;
    setTimeout(() => msgBox.innerHTML = "", 5000);
}
let studentsMap = {};

/* -------------------- Load Students -------------------- */

async function loadStudents() {

    try {

        const users = await apiRequest("/users");

        const select = document.getElementById("vHost");

        select.innerHTML = `<option value="">Select Student</option>`;

        studentsMap = {};

        users
            .filter(u => u.role === "student")
            .forEach(student => {

                studentsMap[student._id] = student;

                select.innerHTML += `
                <option value="${student._id}">
                    ${student.name} (${student.studentId})
                </option>
                `;

            });

        select.addEventListener("change", autoSelectRoom);

    } catch (err) {

        console.log(err);

    }
    if (!window.visitorStudentSelect) {
    window.visitorStudentSelect = new TomSelect("#vHost", {
        create: false,
        sortField: {
            field: "text",
            direction: "asc"
        },
        placeholder: "Search student..."
    });
}

}

/* -------------------- Load Rooms -------------------- */

async function loadRooms() {

    try {

        const rooms = await apiRequest("/rooms");

        const select = document.getElementById("vRoom");

        select.innerHTML = `<option value="">Select Room</option>`;

        rooms.forEach(room => {

            select.innerHTML += `
            <option value="${room._id}">
                Room ${room.roomNumber} (${room.roomType})
            </option>
            `;

        });

        select.disabled = true;

    } catch (err) {

        console.log(err);

    }

}
function autoSelectRoom() {

    const studentId = document.getElementById("vHost").value;

    const roomSelect = document.getElementById("vRoom");

    if (!studentId) {

        roomSelect.value = "";

        return;
    }

    const student = studentsMap[studentId];

    if (!student || !student.currentRoom) {

        roomSelect.value = "";

        showMsg("Student has no room allocated.");

        return;
    }
    console.log(student.currentRoom._id);
console.log(roomSelect.options.length);
for (let i = 0; i < roomSelect.options.length; i++) {
    console.log(roomSelect.options[i].value);
}
roomSelect.value = student.currentRoom._id;
}

/* -------------------- Load Visitors -------------------- */

async function loadVisitors() {

    try {

        const visitors = await apiRequest("/visitors");

        const tbody = document.querySelector("#visitorsTable tbody");

        tbody.innerHTML = "";

        if (visitors.length === 0) {

            tbody.innerHTML = `
            <tr>
                <td colspan="8">No visitor records yet</td>
            </tr>
            `;

            return;

        }

        visitors.forEach(v => {

            tbody.innerHTML += `
            <tr>

                <td>${v.visitorName}</td>

                <td>${v.hostStudent ? v.hostStudent.name : "-"}</td>

                <td>${v.room ? v.room.roomNumber : "-"}</td>

                <td>${v.purpose}</td>

                <td>${fmtDate(v.checkInTime)}</td>

                <td>${fmtDate(v.checkOutTime)}</td>

                <td>${badge(v.status)}</td>

                <td>

                    ${
                        v.status !== "checked_out"
                        ? `<button class="checkoutBtn secondary" data-id="${v._id}">
                            Check Out
                           </button>`
                        : ""
                    }

                </td>

            </tr>
            `;

        });

        document.querySelectorAll(".checkoutBtn").forEach(btn => {

            btn.addEventListener("click", async () => {

                try {

                    await apiRequest(`/visitors/${btn.dataset.id}/checkout`, {
                        method: "POST"
                    });

                    showMsg("Visitor checked out", "success");

                    loadVisitors();

                } catch (err) {

                    showMsg(err.message);

                }

            });

        });

    } catch (err) {

        showMsg(err.message);

    }

}

/* -------------------- Check In -------------------- */

document.getElementById("checkinForm").addEventListener("submit", async function(e){

    e.preventDefault();

    try{

        await apiRequest("/visitors/checkin",{

            method:"POST",

            body:{

                hostStudentId:document.getElementById("vHost").value,

                room:document.getElementById("vRoom").value,

                visitorName:document.getElementById("vName").value,

                idProofType:document.getElementById("vIdType").value,

                idProofNumber:document.getElementById("vIdNum").value,

                purpose:document.getElementById("vPurpose").value

            }

        });

        showMsg("Visitor checked in successfully","success");

        this.reset();

        loadVisitors();

    }

    catch(err){

        showMsg(err.message);

    }

});

/* -------------------- Init -------------------- */

async function init(){

    await loadStudents();

    await loadRooms();

    await loadVisitors();

}

init();