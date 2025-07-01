const BASE_URL = 'https://scnew1.onrender.com/api'; // Correction: Ajouter /api car vos routes backend commencent par /api

// Helper pour afficher les messages
function showMessage(elementId, message, type = 'error') {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message-area ${type}`;
        messageElement.style.display = 'block';
        // Cache le message après 5 secondes
        setTimeout(() => {
            messageElement.style.display = 'none';
            messageElement.textContent = '';
        }, 5000);
    }
}

// Helper pour obtenir le token JWT
function getToken() {
    return localStorage.getItem('token');
}

// Helper pour obtenir les informations utilisateur du localStorage
function getUserInfo() {
    const userString = localStorage.getItem('user');
    return userString ? JSON.parse(userString) : null;
}

// Helper pour stocker les informations utilisateur
function setUserInfo(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

// Redirection si non authentifié ou pour le tableau de bord
function checkAuthAndRedirect() {
    const token = getToken();
    // Utiliser window.location.pathname pour obtenir le chemin après le domaine
    // Puis split('/').pop() pour obtenir le nom du fichier HTML
    const currentPage = window.location.pathname.split('/').pop() || 'index.html'; // Si vide, c'est la racine

    // Redirige vers la page de connexion si pas de token sur les pages protégées
    if (!token && (currentPage === 'dashboard.html' || currentPage === 'profile.html')) {
        window.location.href = 'login.html';
        return true; // Indique qu'une redirection a eu lieu
    }
    // Redirige vers le dashboard si déjà connecté sur les pages publiques (accueil, connexion, inscription)
    // S'assurer que le token existe pour cette redirection
    else if (token && (currentPage === 'index.html' || currentPage === 'login.html' || currentPage === 'register.html')) {
        window.location.href = 'dashboard.html';
        return true; // Indique qu'une redirection a eu lieu
    }
    // Ne rien faire si l'utilisateur est sur une page publique sans être connecté
    // ou sur une page protégée en étant connecté.
    return false; // Pas de redirection nécessaire
}

// --- Fonctions d'authentification ---

// Inscription
async function handleRegister(event) {
    event.preventDefault(); // Empêche le rechargement de la page
    const phone = document.getElementById('phone').value;
    const lastname = document.getElementById('lastname').value;
    const firstname = document.getElementById('firstname').value; 
    const password = document.getElementById('password').value;
    const accountType = document.querySelector('input[name="accountType"]:checked').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;

    const phoneError = document.getElementById('phoneError');
    const passwordError = document.getElementById('passwordError');
    // Réinitialiser les messages d'erreur à chaque soumission
    if (phoneError) phoneError.textContent = '';
    if (passwordError) passwordError.textContent = '';


    if (password.length < 6) {
        if (passwordError) passwordError.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
        return;
    }
    // Validation du numéro de téléphone (exemple simple pour 10 chiffres)
    if (!/^\d{10}$/.test(phone)) {
        if (phoneError) phoneError.textContent = 'Le numéro de téléphone doit contenir 10 chiffres.';
        return;
    }

    if (!acceptTerms) {
        showMessage('registerMessage', 'Vous devez accepter la politique d\'utilisation.', 'error');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, lastname, firstname, password, accountType }),
        });

        const data = await response.json(); // Toujours tenter de parser la réponse JSON

        if (response.ok) { // response.ok est vrai pour les codes de statut 2xx
            showMessage('registerMessage', 'Inscription réussie ! Redirection vers la page de connexion...', 'success');
            // Redirection après un court délai pour que l'utilisateur lise le message
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            // Afficher l'erreur retournée par le backend si présente, sinon un message générique
            showMessage('registerMessage', data.error || 'Erreur lors de l\'inscription.');
        }
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        // Message pour les erreurs réseau ou autres exceptions non liées à la réponse du serveur
        showMessage('registerMessage', 'Une erreur réseau est survenue ou le serveur est inaccessible. Veuillez réessayer plus tard.');
    }
}

// Connexion
async function handleLogin(event) {
    event.preventDefault(); // Empêche le rechargement de la page
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked; // Gérer si nécessaire

    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, password }),
        });

        const data = await response.json(); // Toujours tenter de parser la réponse JSON

        if (response.ok) {
            localStorage.setItem('token', data.token);
            setUserInfo(data.user); // Stocke toutes les infos user
            showMessage('loginMessage', 'Connexion réussie ! Redirection vers le fil d\'actualités...', 'success');

            // Le "rememberMe" est implicitement géré par l'expiration du JWT (7j)
            // Si vous voulez une persistance plus longue, un "refresh token" côté backend serait nécessaire.

            // Redirection après un court délai
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            showMessage('loginMessage', data.error || 'Identifiants invalides ou erreur de connexion.');
        }
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        showMessage('loginMessage', 'Une erreur réseau est survenue ou le serveur est inaccessible. Veuillez réessayer plus tard.');
    }
}

// Déconnexion
function handleLogout() {
    localStorage.removeItem('token'); // Supprime le token
    localStorage.removeItem('user'); // Supprime les informations utilisateur
    window.location.href = 'index.html'; // Redirige vers la page d'accueil
}

// --- Fonctions du Tableau de Bord ---

// Affiche le message de bienvenue avec le nom de l'utilisateur
function displayUserGreeting() {
    const user = getUserInfo();
    const userGreetingElement = document.getElementById('userGreeting');
    if (user && userGreetingElement) {
        userGreetingElement.textContent = `Bonjour, ${user.firstname || 'Utilisateur'}!`;
    }
}

// Charge les services sur le fil d'actualités
async function loadServices(searchQuery = '', categoryFilter = '') {
    const servicesFeed = document.getElementById('servicesFeed');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const noServicesMessage = document.getElementById('noServicesMessage');

    if (!servicesFeed) return; // Quitter si l'élément n'est pas trouvé (pas sur la bonne page)

    servicesFeed.innerHTML = ''; // Nettoyer les services existants
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (noServicesMessage) noServicesMessage.style.display = 'none';

    let url = `${BASE_URL}/services`; // Utilise la BASE_URL configurée avec /api
    const params = new URLSearchParams();
    if (searchQuery) {
        params.append('search', searchQuery);
    }
    if (categoryFilter) {
        params.append('category', categoryFilter);
    }
    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Pas besoin d'autorisation pour GET /services (route publique)
            },
        });

        // Vérifier si la réponse est JSON valide avant de parser
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const services = await response.json();

            if (loadingSpinner) loadingSpinner.style.display = 'none';

            if (services.length === 0) {
                if (noServicesMessage) noServicesMessage.style.display = 'block';
            } else {
                services.forEach(service => {
                    const serviceCard = document.createElement('div');
                    serviceCard.className = 'service-card animate-on-scroll';

                    const initials = `${service.firstname ? service.firstname[0] : ''}${service.lastname ? service.lastname[0] : ''}`.toUpperCase();
                    // Assurer un format de date correct
                    const date = service.createdAt ? new Date(service.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : 'Date inconnue';
                    const locationText = service.location ? `à ${service.location}` : '';

                    serviceCard.innerHTML = `
                        <div class="card-header">
                            <div class="user-avatar">${initials || '?'}</div>
                            <div class="user-info">
                                <h4>${service.firstname || 'Utilisateur'} ${service.lastname || ''}</h4>
                                <span>Posté le ${date} ${locationText}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <p>${service.content || 'Pas de description.'}</p>
                            <p class="category-tag">Catégorie: ${service.category || 'Non spécifiée'}</p>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-primary animate-btn request-service-btn" data-user-id="${service.userId}" data-service-id="${service._id}" data-poster-name="${service.firstname} ${service.lastname}">Demander</button>
                        </div>
                    `;
                    servicesFeed.appendChild(serviceCard);
                });

                // Animation au scroll - attacher l'observateur après que les cartes soient ajoutées
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('active');
                            observer.unobserve(entry.target); // Arrêter d'observer une fois l'animation déclenchée
                        }
                    });
                }, { threshold: 0.1 });

                document.querySelectorAll('.animate-on-scroll').forEach(card => {
                    observer.observe(card);
                });
            }
        } else {
            // Si la réponse n'est pas JSON, cela indique une erreur serveur (ex: 500 HTML)
            throw new Error(`Réponse non JSON reçue: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des services:', error);
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (servicesFeed) servicesFeed.innerHTML = '<p class="error-message" style="text-align:center;">Impossible de charger les services. Veuillez réessayer.</p>';
    }
}

// Configure les écouteurs d'événements pour le tableau de bord
function setupDashboardEvents() {
    // Vérifiez si les éléments existent avant d'ajouter des écouteurs
    const searchInput = document.getElementById('searchServices');
    const searchButton = document.getElementById('searchButton');
    const filterCategory = document.getElementById('filterCategory');
    const servicesFeed = document.getElementById('servicesFeed');

    if (searchInput && searchButton && filterCategory && servicesFeed) {
        displayUserGreeting(); // Affiche le nom de l'utilisateur

        searchButton.addEventListener('click', () => {
            loadServices(searchInput.value, filterCategory.value);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                loadServices(searchInput.value, filterCategory.value);
            }
        });

        filterCategory.addEventListener('change', () => {
            loadServices(searchInput.value, filterCategory.value);
        });

        // Délégation d'événements pour les boutons "Demander"
        servicesFeed.addEventListener('click', (event) => {
            if (event.target.classList.contains('request-service-btn')) {
                const posterName = event.target.dataset.posterName;
                alert(`Fonctionnalité de messagerie avec ${posterName} en cours de développement !`);
                // Pour une implémentation réelle, redirigerait vers une page de chat ou ouvrirait un modal
                // window.location.href = `message.html?userId=${event.target.dataset.userId}`;
            }
        });
    }
}


// --- Fonctions du Profil ---

// Charge les informations du profil
async function loadUserProfile() {
    const user = getUserInfo();
    const token = getToken();

    // Redirige si pas connecté, mais seulement si la fonction de vérification n'a pas déjà redirigé.
    if (!user || !token) {
        if (!checkAuthAndRedirect()) { // Appelle et vérifie si la redirection a eu lieu
             window.location.href = 'login.html'; // Fallback si checkAuthAndRedirect ne redirige pas pour une raison quelconque
        }
        return;
    }

    // Récupérer les informations de l'utilisateur depuis le backend pour être sûr qu'elles sont à jour
    try {
        const response = await fetch(`${BASE_URL}/users/me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Si le token est invalide ou expiré, déconnecter l'utilisateur
            if (response.status === 401 || response.status === 403) {
                alert('Votre session a expiré. Veuillez vous reconnecter.');
                handleLogout();
                return;
            }
            throw new Error('Impossible de charger le profil utilisateur.');
        }

        const updatedUser = await response.json();
        setUserInfo(updatedUser); // Mettre à jour les infos dans localStorage avec les données fraîches

        // Afficher les informations actuelles
        document.getElementById('profileLastname').textContent = updatedUser.lastname || 'Non renseigné';
        document.getElementById('profileFirstname').textContent = updatedUser.firstname || 'Non renseigné';
        document.getElementById('profilePhone').textContent = updatedUser.phone || 'Non renseigné';
        document.getElementById('profileAccountType').textContent = updatedUser.accountType || 'Non défini';

        // Remplir les champs du formulaire de modification
        document.getElementById('editLastname').value = updatedUser.lastname || '';
        document.getElementById('editFirstname').value = updatedUser.firstname || '';
        document.getElementById('editPhone').value = updatedUser.phone || '';
        if (updatedUser.accountType === 'Particulier') {
            document.getElementById('editAccountTypeParticulier').checked = true;
        } else if (updatedUser.accountType === 'Prestataire') {
            document.getElementById('editAccountTypePrestataire').checked = true;
        }

        // Afficher/cacher la section prestataire
        const prestataireActions = document.getElementById('prestataireActions');
        if (updatedUser.accountType === 'Prestataire') {
            if (prestataireActions) prestataireActions.style.display = 'block';
            loadMyServices(); // Charge les services du prestataire
        } else {
            if (prestataireActions) prestataireActions.style.display = 'none';
        }

    } catch (error) {
        console.error('Erreur lors du chargement du profil utilisateur:', error);
        showMessage('profileInfo', 'Erreur lors du chargement de votre profil. Veuillez réessayer.');
    }
}

// Gère la modification du profil
async function handleEditProfile(event) {
    event.preventDefault();
    const token = getToken();
    const userInfo = getUserInfo(); // Obtenir les informations actuelles pour l'ID

    if (!token || !userInfo) {
        showMessage('editProfileMessage', 'Non autorisé. Veuillez vous reconnecter.', 'error');
        handleLogout();
        return;
    }

    const lastname = document.getElementById('editLastname').value;
    const firstname = document.getElementById('editFirstname').value;
    const phone = document.getElementById('editPhone').value;
    const accountType = document.querySelector('input[name="accountType"]:checked').value;

    try {
        const response = await fetch(`${BASE_URL}/users/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ lastname, firstname, phone, accountType }),
        });

        const data = await response.json();

        if (response.ok) {
            setUserInfo(data.user); // Met à jour les infos utilisateur dans localStorage avec les nouvelles données
            showMessage('editProfileMessage', 'Profil mis à jour avec succès !', 'success');
            loadUserProfile(); // Recharge les infos affichées pour refléter les changements
            // Cacher le formulaire de modification et réafficher les infos de profil
            document.getElementById('editProfileFormContainer').style.display = 'none';
            document.getElementById('profileInfo').style.display = 'block';
        } else {
            showMessage('editProfileMessage', data.error || 'Erreur lors de la mise à jour du profil.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('editProfileMessage', 'Une erreur est survenue lors de la mise à jour.');
    }
}

// Gère le changement de mot de passe
async function handleChangePassword(event) {
    event.preventDefault();
    const token = getToken();
    const userInfo = getUserInfo();

    if (!token || !userInfo) {
        showMessage('changePasswordMessage', 'Non autorisé. Veuillez vous reconnecter.', 'error');
        handleLogout();
        return;
    }

    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    if (newPassword.length < 6) {
        showMessage('changePasswordMessage', 'Le nouveau mot de passe doit contenir au moins 6 caractères.', 'error');
        return;
    }
    if (newPassword !== confirmNewPassword) {
        showMessage('changePasswordMessage', 'Les mots de passe ne correspondent pas.', 'error');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/users/me`, {
