const BASE_URL = 'https://scnew1.onrender.com/api'; // Votre URL de backend

// Helper pour afficher les messages
function showMessage(elementId, message, type = 'error') {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `message-area ${type}`;
        messageElement.style.display = 'block';
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
    const currentPage = window.location.pathname.split('/').pop();

    if (!token && (currentPage === 'dashboard.html' || currentPage === 'profile.html')) {
        window.location.href = 'login.html';
    } else if (token && (currentPage === 'index.html' || currentPage === 'login.html' || currentPage === 'register.html' || currentPage === '')) {
        // Redirige vers le dashboard si déjà connecté sur les pages publiques
        window.location.href = 'dashboard.html';
    }
}

// --- Fonctions d'authentification ---

// Inscription
async function handleRegister(event) {
    event.preventDefault();
    const phone = document.getElementById('phone').value;
    const lastname = document.getElementById('lastname').value;
    const firstname = document.getElementById('firstname').value;
    const password = document.getElementById('password').value;
    const accountType = document.querySelector('input[name="accountType"]:checked').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;

    const phoneError = document.getElementById('phoneError');
    const passwordError = document.getElementById('passwordError');
    phoneError.textContent = '';
    passwordError.textContent = '';

    if (password.length < 6) {
        passwordError.textContent = 'Le mot de passe doit contenir au moins 6 caractères.';
        return;
    }
    if (!/^\d{10}$/.test(phone)) { // Simple validation 10 chiffres
        phoneError.textContent = 'Le numéro de téléphone doit contenir 10 chiffres.';
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

        const data = await response.json();

        if (response.ok) {
            showMessage('registerMessage', 'Inscription réussie ! Redirection vers la page de connexion...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showMessage('registerMessage', data.error || 'Erreur lors de l\'inscription.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('registerMessage', 'Une erreur est survenue. Veuillez réessayer plus tard.');
    }
}

// Connexion
async function handleLogin(event) {
    event.preventDefault();
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone, password }),
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            setUserInfo(data.user); // Stocke toutes les infos user
            showMessage('loginMessage', 'Connexion réussie ! Redirection vers le fil d\'actualités...', 'success');

            if (rememberMe) {
                // Pour "Se souvenir de moi", le token et les infos sont déjà dans localStorage.
                // On pourrait stocker une date d'expiration plus longue si on voulait gérer ça côté client
                // Mais le token JWT a déjà une expiration de 7j gérée côté serveur.
            }
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
        } else {
            showMessage('loginMessage', data.error || 'Erreur de connexion.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('loginMessage', 'Une erreur est survenue. Veuillez réessayer plus tard.');
    }
}

// Déconnexion
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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

    if (servicesFeed) { // S'assurer que nous sommes sur la bonne page
        servicesFeed.innerHTML = ''; // Nettoyer les services existants
        loadingSpinner.style.display = 'block';
        noServicesMessage.style.display = 'none';

        let url = `${BASE_URL}/services`;
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
                },
            });
            const services = await response.json();

            loadingSpinner.style.display = 'none';

            if (services.length === 0) {
                noServicesMessage.style.display = 'block';
            } else {
                services.forEach(service => {
                    const serviceCard = document.createElement('div');
                    serviceCard.className = 'service-card animate-on-scroll';

                    const initials = `${service.firstname ? service.firstname[0] : ''}${service.lastname ? service.lastname[0] : ''}`.toUpperCase();
                    const date = new Date(service.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });

                    serviceCard.innerHTML = `
                        <div class="card-header">
                            <div class="user-avatar">${initials}</div>
                            <div class="user-info">
                                <h4>${service.firstname} ${service.lastname}</h4>
                                <span>Posté le ${date} à ${service.location}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <p>${service.content}</p>
                            <p class="category-tag">Catégorie: ${service.category}</p>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-primary animate-btn request-service-btn" data-user-id="${service.userId}" data-service-id="${service._id}" data-poster-name="${service.firstname} ${service.lastname}">Demander</button>
                        </div>
                    `;
                    servicesFeed.appendChild(serviceCard);
                });

                // Animation au scroll
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('active');
                        }
                    });
                }, { threshold: 0.1 }); // Déclenche quand 10% de l'élément est visible

                document.querySelectorAll('.animate-on-scroll').forEach(card => {
                    observer.observe(card);
                });
            }
        } catch (error) {
            console.error('Erreur lors du chargement des services:', error);
            loadingSpinner.style.display = 'none';
            servicesFeed.innerHTML = '<p class="error-message" style="text-align:center;">Impossible de charger les services. Veuillez réessayer.</p>';
        }
    }
}

// Configure les écouteurs d'événements pour le tableau de bord
function setupDashboardEvents() {
    const searchInput = document.getElementById('searchServices');
    const searchButton = document.getElementById('searchButton');
    const filterCategory = document.getElementById('filterCategory');
    const servicesFeed = document.getElementById('servicesFeed'); // Parent pour la délégation d'événements

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

    if (!user || !token) {
        window.location.href = 'login.html'; // Redirige si pas connecté
        return;
    }

    // Afficher les informations actuelles
    document.getElementById('profileLastname').textContent = user.lastname || 'Non renseigné';
    document.getElementById('profileFirstname').textContent = user.firstname || 'Non renseigné';
    document.getElementById('profilePhone').textContent = user.phone || 'Non renseigné';
    document.getElementById('profileAccountType').textContent = user.accountType || 'Non défini';

    // Remplir les champs du formulaire de modification
    document.getElementById('editLastname').value = user.lastname || '';
    document.getElementById('editFirstname').value = user.firstname || '';
    document.getElementById('editPhone').value = user.phone || '';
    if (user.accountType === 'Particulier') {
        document.getElementById('editAccountTypeParticulier').checked = true;
    } else if (user.accountType === 'Prestataire') {
        document.getElementById('editAccountTypePrestataire').checked = true;
    }

    // Afficher/cacher la section prestataire
    const prestataireActions = document.getElementById('prestataireActions');
    if (user.accountType === 'Prestataire') {
        prestataireActions.style.display = 'block';
        loadMyServices(); // Charge les services du prestataire
    } else {
        prestataireActions.style.display = 'none';
    }
}

// Gère la modification du profil
async function handleEditProfile(event) {
    event.preventDefault();
    const token = getToken();
    const userId = getUserInfo().id;

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
            setUserInfo(data.user); // Met à jour les infos utilisateur dans localStorage
            showMessage('editProfileMessage', 'Profil mis à jour avec succès !', 'success');
            loadUserProfile(); // Recharge les infos affichées
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
    const userId = getUserInfo().id;

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
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ password: newPassword }),
        });

        const data = await response.json();

        if (response.ok) {
            showMessage('changePasswordMessage', 'Mot de passe changé avec succès !', 'success');
            document.getElementById('changePasswordForm').reset();
            document.getElementById('changePasswordFormContainer').style.display = 'none';
            document.getElementById('profileInfo').style.display = 'block';
        } else {
            showMessage('changePasswordMessage', data.error || 'Erreur lors du changement de mot de passe.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showMessage('changePasswordMessage', 'Une erreur est survenue lors du changement de mot de passe.');
    }
}

// Supprimer le compte
async function handleDeleteAccount() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et supprimera également tous vos services !')) {
        return;
    }

    const token = getToken();
    try {
        const response = await fetch(`${BASE_URL}/users/me`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });

        const data = await response.json();

        if (response.ok) {
            alert('Votre compte a été supprimé avec succès.');
            handleLogout(); // Déconnecte l'utilisateur après suppression
        } else {
            alert(data.error || 'Erreur lors de la suppression du compte.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Une erreur est survenue lors de la suppression du compte.');
    }
}

// Charge les services postés par l'utilisateur courant (Prestataire)
async function loadMyServices() {
    const myServicesList = document.getElementById('myServicesList');
    const noMyServicesMessage = document.getElementById('noMyServicesMessage');
    myServicesList.innerHTML = ''; // Nettoyer
    noMyServicesMessage.style.display = 'none';

    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch(`${BASE_URL}/users/me/services`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
        });
        const services = await response.json();

        if (services.length === 0) {
            noMyServicesMessage.style.display = 'block';
        } else {
            services.forEach(service => {
                const serviceCard = document.createElement('div');
                serviceCard.className = 'my-service-card';
                const date = new Date(service.createdAt).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                serviceCard.innerHTML = `
                    <p><strong>Service:</strong> ${service.content}</p>
                    <p><strong>Lieu:</strong> ${service.location}</p>
                    <p><strong>Catégorie:</strong> ${service.category}</p>
                    <p><em>Posté le ${date}</em></p>
                    <div class="my-service-card-actions">
                        <button class="btn btn-secondary animate-btn edit-my-service-btn" data-service-id="${service._id}" data-content="${service.content}" data-location="${service.location}" data-category="${service.category}">Modifier</button>
                        <button class="btn btn-danger animate-btn delete-my-service-btn" data-service-id="${service._id}">Supprimer</button>
                    </div>
                `;
                myServicesList.appendChild(serviceCard);
            });
        }
    } catch (error) {
        console.error('Erreur lors du chargement de mes services:', error);
        myServicesList.innerHTML = '<p class="error-message" style="text-align:center;">Impossible de charger vos services.</p>';
    }
}

// Gère l'ajout d'un service
async function handleAddService(event) {
    event.preventDefault();
    const token = getToken();
    const content = document.getElementById('serviceContent').value;
    const location = document.getElementById('serviceLocation').value;
    const category = document.getElementById('serviceCategory').value;

    if (!content || !location || !category) {
        showMessage('addServiceMessage', 
