Auth.requireLogin();

document
.getElementById("logoutBtn")
.addEventListener("click",(e)=>{

e.preventDefault();

Auth.logout();

});

async function loadVisitors(){

try{

const visitors=await apiRequest("/visitors/me");

const tbody=document.querySelector("#visitorTable tbody");

tbody.innerHTML="";

if(visitors.length===0){

tbody.innerHTML=`
<tr>

<td colspan="5">

No visitors found

</td>

</tr>
`;

return;

}

visitors.forEach(v=>{

tbody.innerHTML+=`

<tr>

<td>${v.visitorName}</td>

<td>${v.room ? v.room.roomNumber : "-"}</td>

<td>${v.purpose}</td>

<td>${fmtDate(v.checkInTime)}</td>

<td>${v.status}</td>

</tr>

`;

});

}catch(err){

console.log(err);

}

}

loadVisitors();