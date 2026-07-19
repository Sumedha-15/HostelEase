Auth.requireLogin();

const user = Auth.getUser();

document.getElementById("studentName").innerHTML =
`Welcome, ${user.name} 👋`;

document.getElementById("studentEmail").innerHTML =
user.email;

document.getElementById("studentId").innerHTML =
`Student ID : ${user.studentId}`;

document.getElementById("profileName").innerHTML =
user.name;

document.getElementById("profileEmail").innerHTML =
user.email;

document.getElementById("profileId").innerHTML =
user.studentId;

/* Logout */

document
.getElementById("logoutBtn")
.addEventListener("click",(e)=>{

e.preventDefault();

Auth.logout();

});

/* ---------------- ROOM ---------------- */

async function loadRoom(){

try{

const allocation=await apiRequest("/allocations/me");

if(allocation.room){

document.getElementById("roomNumber").innerHTML=
allocation.room.roomNumber;

document.getElementById("roomType").innerHTML=
allocation.room.roomType;

}else{

document.getElementById("roomNumber").innerHTML=
"Not Allocated";

}

}catch(err){

console.log(err);

}

}

/* ---------------- FEES ---------------- */

async function loadFees(){

try{

const fees=await apiRequest("/fees/me");

let pending=0;

fees.forEach(f=>{

pending+=f.balance;

});

document.getElementById("pendingFees").innerHTML=
fmtMoney(pending);

}catch(err){

console.log(err);

}

}

/* ---------------- COMPLAINTS ---------------- */

async function loadComplaints(){

try{

const complaints=await apiRequest("/complaints/me");

document.getElementById("complaintCount").innerHTML=
complaints.length;

}catch(err){

console.log(err);

}

}

async function loadVisitors() {

    try {

        const visitors = await apiRequest("/visitors/me");

        document.getElementById("visitorCount").innerHTML =
            visitors.length;

    } catch (err) {

        console.log(err);

        document.getElementById("visitorCount").innerHTML = "0";

    }

}

loadVisitors();





loadRoom();

loadFees();

loadComplaints();