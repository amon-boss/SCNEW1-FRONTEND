document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://scnew1.onrender.com/api'; // Remplacez par l'URL de votre backend Render

    // Fonction pour charger le footer
    function loadFooter() {
        fetch('includes/footer.html')
            .then(response => response.text())
            .then(data => {
                const footerPlaceholder = document.getElementById('footer-placeholder');
                if (footerPlaceholder) {
                    footerPlaceholder.innerHTML = data;
                }
            })
            .catch(error => console.error('Erreur lors du chargement du footer:', error));
    }

    loadFooter();

    // Fonction pour les messages d'alerte temporaires
    function showAlert(message, type = 'error', targetElementId = 'alert-message') {
        const alertDiv = document.getElementById(targetElementId);
        if (alertDiv) {
            alertDiv.textContent = message;
            alertDiv.className = `alert alert-${type}`;
            alertDiv.classList.remove('hidden');
            setTimeout(() => {
                alertDiv.classList.add('hidden');
            }, 5000);
        }
    }

    // Fonction pour gérer la redirection après connexion/déconnexion
    function redirectTo(path) {
        window.location.href = path;
    }

    // Gestion de l'inscription (Page register.html)
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const phone = document.getElementById('phone').value;
            const lastname = document.getElementById('lastname').value;
            const firstname = document.getElementById('firstname').value;
            const password = document.getElementById('password').value;
            const accountType = document.querySelector('input[name="accountType"]:checked').value;
            const termsAccepted = document.getElementById('terms').checked;

            if (password.length < 6) {
                showAlert('Le mot de passe doit contenir au moins 6 caractères.');
                return;
            }
            if (!termsAccepted) {
                showAlert('Vous devez accepter la politique d\'utilisation.');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, lastname, firstname, password, accountType })
                });
                const data = await response.json();

                if (data.success) {
                    showAlert('Inscription réussie ! Vous pouvez maintenant vous connecter.', 'success');
                    setTimeout(() => redirectTo('login.html'), 2000);
                } else {
                    showAlert(data.error || "Erreur lors de l'inscription.");
                }
            } catch (error) {
                console.error('Erreur inscription:', error);
                showAlert("Erreur réseau ou serveur.");
            }
        });
    }

    // Gestion de la connexion (Page login.html)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const identifier = document.getElementById('identifier').value; // Peut être phone ou lastname
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me').checked;

            try {
                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                });
                const data = await response.json();

                if (data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user)); // Stocker les infos de l'utilisateur
                    if (rememberMe) {
                        localStorage.setItem('rememberMe', 'true');
                    } else {
                        localStorage.removeItem('rememberMe');
                    }
                    showAlert('Connexion réussie !', 'success');
                    setTimeout(() => redirectTo('newsfeed.html'), 1500);
                } else {
                    showAlert(data.error || "Identifiants invalides.");
                }
            } catch (error) {
                console.error('Erreur connexion:', error);
                showAlert("Erreur réseau ou serveur.");
            }
        });

        // Auto-remplir si "Se souvenir de moi" est coché
        if (localStorage.getItem('rememberMe') === 'true' && localStorage.getItem('user')) {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            // Il faudrait que le backend renvoie l'identifiant (phone ou lastname) pour pouvoir le pré-remplir
            // Pour l'instant, on ne peut pas pré-remplir le champ `identifier` de manière fiable juste avec `user`
            // car votre backend n'expose pas le mot de passe, ce qui est normal.
            // On peut juste se souvenir que l'utilisateur veut rester connecté et le rediriger directement.
            // Pour le moment, l'option "se souvenir" redirigera directement si déjà connecté.
        }
    }

    // Vérifier si l'utilisateur est déjà connecté au chargement de la page d'accueil ou de connexion
    const token = localStorage.getItem('token');
    const rememberMe = localStorage.getItem('rememberMe');

    // Rediriger vers le fil d'actualité si déjà connecté et "Se souvenir de moi"
    if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '/login.html') {
        if (token && rememberMe === 'true') {
            // Tenter de récupérer les infos utilisateur pour valider le token
            fetch(`${API_BASE_URL}/users/me`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(response => {
                if (response.ok) {
                    redirectTo('newsfeed.html');
                } else {
                    // Token invalide ou expiré, effacer et rester sur la page actuelle
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    localStorage.removeItem('rememberMe');
                }
            }).catch(() => {
                // Erreur réseau, rester sur la page actuelle
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('rememberMe');
            });
        }
    }


    // Gestion de la page du fil d'actualités (newsfeed.html)
    const newsfeedPage = document.getElementById('newsfeed-page');
    if (newsfeedPage) {
        const profileIcon = document.getElementById('profile-icon');
        const serviceListContainer = document.getElementById('service-list');
        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');
        const user = JSON.parse(localStorage.getItem('user')); // Récupérer l'utilisateur connecté

        if (!token) {
            showAlert('Veuillez vous connecter pour accéder au fil d\'actualités.', 'error', 'newsfeed-alert-message');
            setTimeout(() => redirectTo('login.html'), 2000);
            return;
        }

        profileIcon.addEventListener('click', () => redirectTo('profile.html'));

        // Fonction pour afficher les services
        async function fetchAndDisplayServices(searchTerm = '') {
            try {
                let url = `${API_BASE_URL}/services`;
                if (searchTerm) {
                    url += `/search?query=${encodeURIComponent(searchTerm)}`;
                }
                
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const services = await response.json();

                if (response.ok) {
                    serviceListContainer.innerHTML = ''; // Vider la liste existante
                    if (services.length === 0) {
                        serviceListContainer.innerHTML = '<p class="no-services-message">Aucun service trouvé pour votre recherche.</p>';
                        return;
                    }

                    services.forEach(service => {
                        const card = document.createElement('div');
                        card.classList.add('service-card', 'animated'); // Ajout de la classe animated
                        const initials = (service.firstname ? service.firstname[0] : '') + (service.lastname ? service.lastname[0] : '');
                        const postedDate = new Date(service.createdAt).toLocaleDateString('fr-FR', {
                            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        });

                        card.innerHTML = `
                            <div class="service-header">
                                <div class="profile-initials">${initials.toUpperCase()}</div>
                                <div class="service-info">
                                    <h4>${service.firstname} ${service.lastname}</h4>
                                    <p>Posté le ${postedDate} à ${service.location}</p>
                                </div>
                            </div>
                            <div class="service-content">
                                <p>${service.content}</p>
                            </div>
                            <button class="btn btn-request" data-user-id="${service.userId}" data-service-id="${service._id}">Demander</button>
                        `;
                        serviceListContainer.appendChild(card);
                    });

                    // Ajouter les écouteurs d'événements pour les boutons "Demander"
                    document.querySelectorAll('.btn-request').forEach(button => {
                        button.addEventListener('click', (e) => {
                            const serviceUserId = e.target.dataset.userId;
                            const serviceId = e.target.dataset.serviceId;
                            // Redirection vers la page de messagerie (à implémenter plus tard)
                            showAlert(`Fonctionnalité de messagerie pour le service ${serviceId} de l'utilisateur ${serviceUserId} à implémenter.`, 'success', 'newsfeed-alert-message');
                        });
                    });

                } else {
                    showAlert(services.error || "Erreur lors du chargement des services.", 'error', 'newsfeed-alert-message');
                }
            } catch (error) {
                console.error('Erreur chargement services:', error);
                showAlert("Erreur réseau lors du chargement des services.", 'error', 'newsfeed-alert-message');
            }
        }

        fetchAndDisplayServices(); // Charger les services au chargement de la page

        searchButton.addEventListener('click', () => {
            fetchAndDisplayServices(searchInput.value);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchAndDisplayServices(searchInput.value);
            }
        });
    }

    // Gestion de la page de profil (profile.html)
    const profilePage = document.getElementById('profile-page');
    if (profilePage) {
        const userProfileDiv = document.getElementById('user-profile-details');
        const accountTypeDisplay = document.getElementById('account-type-display');
        const toggleAccountTypeBtn = document.getElementById('toggle-account-type-btn');
        const createServiceSection = document.getElementById('create-service-section');
        const myServicesSection = document.getElementById('my-services-section');
        const postServiceForm = document.getElementById('post-service-form');
        const myServicesList = document.getElementById('my-services-list');
        const logoutBtn = document.getElementById('logout-btn');
        const deleteAccountBtn = document.getElementById('delete-account-btn');
        const messagesBtn = document.getElementById('messages-btn'); // Bouton messages

        if (!token) {
            showAlert('Veuillez vous connecter pour accéder à votre profil.', 'error', 'profile-alert-message');
            setTimeout(() => redirectTo('login.html'), 2000);
            return;
        }

        let currentUserData = null; // Pour stocker les données de l'utilisateur

        async function fetchUserProfile() {
            try {
                const response = await fetch(`${API_BASE_URL}/users/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const user = await response.json();

                if (response.ok) {
                    currentUserData = user; // Stocker les données
                    userProfileDiv.innerHTML = `
                        <p><strong>Nom:</strong> ${user.lastname}</p>
                        <p><strong>Prénom:</strong> ${user.firstname}</p>
                        <p><strong>Téléphone:</strong> ${user.phone || 'Non renseigné'}</p>
                        <p><strong>Type de compte:</strong> <span id="account-type-display">${user.accountType}</span></p>
                        <p><strong>Inscrit depuis:</strong> ${new Date(user.createdAt).toLocaleDateString('fr-FR')}</p>
                    `;
                    updateProfileUI(user.accountType);
                } else {
                    showAlert(user.error || "Erreur lors du chargement du profil.", 'error', 'profile-alert-message');
                }
            } catch (error) {
                console.error('Erreur chargement profil:', error);
                showAlert("Erreur réseau lors du chargement du profil.", 'error', 'profile-alert-message');
            }
        }

        async function updateAccountType() {
            if (!currentUserData) return;

            const newAccountType = currentUserData.accountType === 'Particulier' ? 'Prestataire' : 'Particulier';
            try {
                const response = await fetch(`${API_BASE_URL}/users/me`, { // Utilise /users/me pour la modification
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ accountType: newAccountType })
                });
                const data = await response.json();

                if (response.ok) {
                    currentUserData.accountType = newAccountType; // Mettre à jour localement
                    localStorage.setItem('user', JSON.stringify(currentUserData)); // Mettre à jour le localStorage
                    document.getElementById('account-type-display').textContent = newAccountType;
                    updateProfileUI(newAccountType);
                    showAlert('Type de compte mis à jour avec succès !', 'success', 'profile-alert-message');
                } else {
                    showAlert(data.error || "Erreur lors de la mise à jour du type de compte.", 'error', 'profile-alert-message');
                }
            } catch (error) {
                console.error('Erreur mise à jour type de compte:', error);
                showAlert("Erreur réseau ou serveur lors de la mise à jour.", 'error', 'profile-alert-message');
            }
        }

        function updateProfileUI(accountType) {
            if (accountType === 'Prestataire') {
                createServiceSection.classList.remove('hidden');
                myServicesSection.classList.remove('hidden');
                fetchMyServices();
            } else {
                createServiceSection.classList.add('hidden');
                myServicesSection.classList.add('hidden');
            }
        }

        async function fetchMyServices() {
            if (!currentUserData || currentUserData.accountType !== 'Prestataire') {
                myServicesList.innerHTML = '<p>Vous devez être Prestataire pour voir vos services.</p>';
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/services/my-services`, { // Nouvelle route pour les services de l'utilisateur
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const services = await response.json();

                if (response.ok) {
                    myServicesList.innerHTML = '';
                    if (services.length === 0) {
                        myServicesList.innerHTML = '<p>Vous n\'avez pas encore posté de service.</p>';
                        return;
                    }
                    services.forEach(service => {
                        const serviceItem = document.createElement('div');
                        serviceItem.classList.add('my-service-item');
                        serviceItem.innerHTML = `
                            <div class="service-text">
                                <p><strong>Service:</strong> ${service.content}</p>
                                <p><strong>Lieu:</strong> ${service.location}</p>
                                <p><small>Posté le: ${new Date(service.createdAt).toLocaleDateString('fr-FR')}</small></p>
                            </div>
                            <div class="service-actions">
                                <button class="btn btn-primary edit-service-btn" data-id="${service._id}" data-content="${service.content}" data-location="${service.location}">Modifier</button>
                                <button class="btn btn-danger delete-service-btn" data-id="${service._id}">Supprimer</button>
                            </div>
                        `;
                        myServicesList.appendChild(serviceItem);
                    });

                    // Ajouter les écouteurs pour modifier/supprimer
                    document.querySelectorAll('.edit-service-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const serviceId = e.target.dataset.id;
                            const currentContent = e.target.dataset.content;
                            const currentLocation = e.target.dataset.location;
                            const newContent = prompt('Modifier le contenu du service:', currentContent);
                            const newLocation = prompt('Modifier le lieu du service:', currentLocation);
                            if (newContent !== null && newLocation !== null && newContent.trim() !== '' && newLocation.trim() !== '') {
                                updateService(serviceId, newContent.trim(), newLocation.trim());
                            }
                        });
                    });

                    document.querySelectorAll('.delete-service-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const serviceId = e.target.dataset.id;
                            if (confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
                                deleteService(serviceId);
                            }
                        });
                    });

                } else {
                    showAlert(
