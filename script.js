// URL du backend
const API_BASE = 'https://scnew1.onrender.com/api';

// Inclusion dynamique du footer
document.addEventListener('DOMContentLoaded', () => {
  fetch('footer.html')
    .then(res => res.text())
    .then(html => {
      const footerContainer = document.createElement('div');
      footerContainer.innerHTML = html;
      document.body.appendChild(footerContainer);
      setupFooterButtons();
      fadeInOnScroll(); // au chargement pour ceux déjà visibles
    })
    .catch(console.error);
});

// Setup navigation boutons dans footer
function setupFooterButtons() {
  document.querySelectorAll('button.footer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = btn.getAttribute('data-link');
      if (link) window.location.href = link;
    });
  });
}

// Animation fade-in on scroll
function fadeInOnScroll() {
  const faders = document.querySelectorAll('.fade-in');
  const triggerBottom = window.innerHeight * 0.9;

  faders.forEach(fader => {
    const top = fader.getBoundingClientRect().top;
    if (top < triggerBottom) {
      fader.classList.add('visible');
    }
  });
}
window.addEventListener('scroll', fadeInOnScroll);

// Simple animation clic pour tous les boutons
document.addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') {
    e.target.style.transform = 'scale(0.95)';
    setTimeout(() => {
      e.target.style.transform = '';
    }, 150);
  }
});

// Gestion Auth (stockage token)
function saveToken(token) {
  localStorage.setItem('sc_token', token);
}
function getToken() {
  return localStorage.getItem('sc_token');
}
function removeToken() {
  localStorage.removeItem('sc_token');
}

// Fonction pour vérifier si utilisateur est connecté
function isLoggedIn() {
  return !!getToken();
}

// Helper fetch avec token dans header si connecté
async function apiFetch(endpoint, options = {}) {
  options.headers = options.headers || {};
  if (isLoggedIn()) {
    options.headers['Authorization'] = 'Bearer ' + getToken();
  }
  const res = await fetch(API_BASE + endpoint, options);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erreur API');
  }
  return res.json();
}

// Fonction d'inscription adaptée au backend
async function registerUser({ nom, prenom, telephone, password, typeCompte }) {
  const body = {
    phone: telephone,
    lastname: nom,
    firstname: prenom,
    password: password,
    accountType: typeCompte
  };
  return await apiFetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
