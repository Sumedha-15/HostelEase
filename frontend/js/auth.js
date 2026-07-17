const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const msgBox = document.getElementById('msg');

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.style.display = 'block';
  registerForm.style.display = 'none';
  msgBox.innerHTML = '';
});

tabRegister.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.style.display = 'block';
  loginForm.style.display = 'none';
  msgBox.innerHTML = '';
});

function showMsg(text, type = 'error') {
  msgBox.innerHTML = `<div class="msg ${type}">${text}</div>`;
}

function redirectAfterLogin(user) {

  switch (user.role) {

    case "admin":
    case "warden":
      window.location.href = "dashboard.html";
      break;

    case "student":
      window.location.href = "student-dashboard.html";
      break;

    default:
      window.location.href = "index.html";

  }

}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password }, auth: false });
    Auth.setSession(data.token, data.user);
    redirectAfterLogin(data.user);
  } catch (err) {
    showMsg(err.message);
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const body = {
      name: document.getElementById('regName').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value,
      studentId: document.getElementById('regStudentId').value,
      gender: document.getElementById('regGender').value,
      phone: document.getElementById('regPhone').value,
      role: 'student',
    };
    const data = await apiRequest('/auth/register', { method: 'POST', body, auth: false });
    Auth.setSession(data.token, data.user);
    redirectAfterLogin(data.user);
  } catch (err) {
    showMsg(err.message);
  }
});

// If already logged in, skip straight to the right landing page
if (Auth.getToken()) redirectAfterLogin(Auth.getUser());
