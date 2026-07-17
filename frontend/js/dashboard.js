Auth.requireLogin();
renderTopbar('dashboard.html');

async function load() {
  try {
    const [summary, occupancy, defaulters] = await Promise.all([
      apiRequest('/dashboard/summary'),
      apiRequest('/dashboard/occupancy'),
      apiRequest('/fees/defaulters'),
    ]);

    document.getElementById('statCards').innerHTML = `
      <div class="stat"><div class="value">${occupancy.overall.occupancyRate}%</div><div class="label">Overall occupancy</div></div>
      <div class="stat"><div class="value">${summary.openComplaints}</div><div class="label">Open complaints (${summary.criticalComplaints} critical)</div></div>
      <div class="stat"><div class="value">${summary.activeVisitors}</div><div class="label">Visitors on premises</div></div>
    `;

    const occRows = occupancy.perHostel
      .map(
        (h) => `<tr>
          <td>${h.hostel}</td><td>${h.totalRooms}</td><td>${h.totalCapacity}</td>
          <td>${h.totalOccupied}</td><td>${h.vacantSeats}</td><td>${h.occupancyRate}%</td>
        </tr>`
      )
      .join('');
    document.querySelector('#occupancyTable tbody').innerHTML = occRows || '<tr><td colspan="6">No hostels yet</td></tr>';

    const typeRows = Object.entries(occupancy.roomTypeBreakdown)
      .map(([type, v]) => {
        const rate = v.capacity ? ((v.occupied / v.capacity) * 100).toFixed(1) : 0;
        return `<tr><td>${type}</td><td>${v.capacity}</td><td>${v.occupied}</td><td>${rate}%</td></tr>`;
      })
      .join('');
    document.querySelector('#roomTypeTable tbody').innerHTML = typeRows || '<tr><td colspan="4">No rooms yet</td></tr>';

    const defRows = defaulters
      .map(
        (d) => `<tr><td>${d.student.name}</td><td>${d.student.studentId || '-'}</td><td>${fmtMoney(d.outstandingBalance)}</td></tr>`
      )
      .join('');
    document.querySelector('#defaultersTable tbody').innerHTML = defRows || '<tr><td colspan="3">No defaulters 🎉</td></tr>';
  } catch (err) {
    document.getElementById('msg').innerHTML = `<div class="msg error">${err.message}</div>`;
  }
}

load();
