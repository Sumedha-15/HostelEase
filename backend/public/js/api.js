// Small fetch wrapper shared by every page. Uses in-memory + localStorage
// only for the JWT token (not app data), since the token must survive a
// page reload for a usable demo.
const API_BASE = '/api';
const Auth = {
  getToken() { return localStorage.getItem('hostelease_token'); },
  getUser() {
    const raw = localStorage.getItem('hostelease_user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('hostelease_token', token);
    localStorage.setItem('hostelease_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('hostelease_token');
    localStorage.removeItem('hostelease_user');
  },
  requireLogin() {
    if (!this.getToken()) window.location.href = 'index.html';
  },
  logout() {
    this.clear();
    window.location.href = 'index.html';
  },
};

async function apiRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = Auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try { data = await res.json(); } catch (e) { data = {}; }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString();
}

function fmtMoney(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function badge(text) {
  return `<span class="badge ${text}">${text.replace('_', ' ')}</span>`;
}

function renderTopbar(activePage) {
  const user = Auth.getUser();
  if (!user) return;
 const links = [
  { href: 'dashboard.html', label: 'Dashboard', roles: ['admin', 'warden'] },
  { href: 'rooms.html', label: 'Rooms', roles: ['admin', 'warden', 'student'] },
  { href: 'fees.html', label: 'Fees', roles: ['admin', 'warden', 'student'] },
  { href: 'complaints.html', label: 'Complaints', roles: ['admin', 'warden', 'student'] },
  { href: 'visitors.html', label: 'Visitors', roles: ['admin', 'warden'] },
];
  const nav = links
    .filter((l) => l.roles.includes(user.role))
    .map((l) => `<a href="${l.href}" class="${activePage === l.href ? 'active' : ''}">${l.label}</a>`)
    .join('');

  document.getElementById('topbar').innerHTML = `
    <div class="brand">Hostel<span>Ease</span></div>
    <nav>${nav}<a href="#" id="logoutLink">Logout</a></nav>
    <div class="user-chip">${user.name} · ${user.role}</div>
  `;
  document.getElementById('logoutLink').addEventListener('click', (e) => {
    e.preventDefault();
    Auth.logout();
  });
}
