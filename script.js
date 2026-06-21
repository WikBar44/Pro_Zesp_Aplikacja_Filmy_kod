// =================================================================
// 1. INICJALIZACJA BAZY DANYCH I ZMIENNYCH GLOBALNYCH
// =================================================================

let currentUser = null;
let movies = [];
let currentFilter = 'all';
let tabs = [];
let contents = [];

function toggleReviewFields() {
    const status = document.getElementById('movie-status').value;
    const reviewFields = document.getElementById('review-fields');
    if (reviewFields) {
        reviewFields.style.display = status === 'watched' ? 'block' : 'none';
    }
}

// =============================
// 2. START APLIKACJI 
// =============================

document.addEventListener('DOMContentLoaded', async () => {
    tabs = document.querySelectorAll('.tab-btn');
    contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-target');
            showSection(target);
        });
    });

    const savedUser = localStorage.getItem('cinekeep_logged_user');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        try {
            const response = await fetch(`http://localhost:3000/api/users/me/${parsed.username}`);
            if (response.ok) {
                currentUser = await response.json();
                localStorage.setItem('cinekeep_logged_user', JSON.stringify(currentUser));
            } else {
                currentUser = parsed;
            }
        } catch(e) {
            currentUser = parsed;
        }
        updateUI();
        checkAccountStatusAndNavigate();
    } else {
        showSection('login-section');
    }

    loadMoviesFromServer();
});

// =================================================================
// FUNKCJE POMOCNICZE INTERFEJSU I REWIZJI KONT
// =================================================================

async function checkAccountStatusAndNavigate() {
    if (!currentUser) return;

    try {
        const response = await fetch(`http://localhost:3000/api/users/me/${currentUser.username}`);
        if (response.ok) {
            currentUser = await response.json();
            localStorage.setItem('cinekeep_logged_user', JSON.stringify(currentUser));
        }
    } catch (e) { console.error(e); }

    // OBSŁUGA POWIADOMIEŃ
    if (currentUser.notifications && currentUser.notifications.length > 0) {
        alert("🚨 NOWE POWIADOMIENIE OD ADMINISTRACJI:\n\n" + currentUser.notifications.join("\n"));
        fetch('http://localhost:3000/api/users/clear-notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username })
        });
        currentUser.notifications = [];
        localStorage.setItem('cinekeep_logged_user', JSON.stringify(currentUser));
    }

    if (currentUser.status === 'muted' || currentUser.status === 'suspended') {
        showSection('muted-warning-section');
        const infoText = document.getElementById('mute-info-text');
        
        // Elementy formularza odwołania
        const appealTextarea = document.getElementById('appeal-text');
        const appealButton = document.getElementById('btn-submit-appeal');

        if (currentUser.status === 'muted') {
            infoText.innerHTML = `Twoja możliwość komentowania została zawieszona. Blokada wygasa: <strong>${new Date(currentUser.mutedUntil).toLocaleString()}</strong>.<br>Posiadasz ostrzeżeń: ${currentUser.warnings || 0}/3.`;
        } else {
            infoText.innerHTML = `Twoje konto zostało <strong>całkowicie zawieszone</strong> z powodu zebrania 3 ostrzeżeń. Oczekujesz na decyzję Administratora (BAN lub przywrócenie konta).`;
        }

        // BLOKADA FORMULARZA ODWOŁANIA
        if (currentUser.hasPendingAppeal) {
            if(appealTextarea) {
                appealTextarea.disabled = true;
                appealTextarea.placeholder = "Twoje odwołanie zostało już wysłane i oczekuje na decyzję Administratora. Nie możesz wysłać kolejnego wniosku.";
                appealTextarea.value = "";
            }
            if(appealButton) appealButton.style.display = 'none';
        } else {
            if(appealTextarea) {
                appealTextarea.disabled = false;
                appealTextarea.placeholder = "Napisz odwołanie do administracji...";
            }
            if(appealButton) appealButton.style.display = 'block';
        }
    } else {
        showSection('home');
    }
}

function updateUI() {
    const navMenu = document.querySelector('.nav-menu');
    const loginTabBtn = document.querySelector('[data-target="login-section"]');
    const logoutBtn = document.getElementById('logout-btn');
    
    const modBtn = document.getElementById('nav-mod-btn');
    const adminBtn = document.getElementById('nav-admin-btn');
    const applyModBtn = document.getElementById('nav-apply-mod-btn');

    if(modBtn) modBtn.style.display = 'none';
    if(adminBtn) adminBtn.style.display = 'none';
    if(applyModBtn) applyModBtn.style.display = 'none';

    if (currentUser) {
        // UŻYTKOWNIK ZALOGOWANY
        if (navMenu) navMenu.style.display = 'flex'; 

        loginTabBtn.innerHTML = `👤 ${currentUser.username}`;
        loginTabBtn.classList.add('user-logged');
        if (logoutBtn) logoutBtn.style.display = "inline-block";

        // Pokazywanie przycisków menu na podstawie roli
        if (currentUser.role === 'admin') {
            if(adminBtn) adminBtn.style.display = 'inline-block';
            if(modBtn) modBtn.style.display = 'inline-block'; 
        } else if (currentUser.role === 'moderator') {
            if(modBtn) modBtn.style.display = 'inline-block';
        } else if (currentUser.role === 'user' && currentUser.status === 'active') {
            if(applyModBtn) applyModBtn.style.display = 'inline-block';
        }
    } else {
        // UŻYTKOWNIK NIEZALOGOWANY
        if (navMenu) navMenu.style.display = 'none'; 

        loginTabBtn.innerHTML = `🔑 Logowanie`;
        loginTabBtn.classList.remove('user-logged');
        if (logoutBtn) logoutBtn.style.display = "none";
    }
}

function showSection(target) {
    if (tabs.length === 0 || contents.length === 0) return;
    
    if (!currentUser && target !== 'login-section') {
        target = 'login-section';
    }
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));

    const targetSection = document.getElementById(target);
    if (targetSection) targetSection.classList.add('active');

    const activeTab = document.querySelector(`[data-target="${target}"]`);
    if (activeTab) activeTab.classList.add('active');

    if (target === 'mod-section') loadModeratorDashboard();
    if (target === 'admin-section') loadAdminDashboard();
}

// =================================================================
// 4. AUTORYZACJA (LOGOWANIE I REJESTRACJA)
// =================================================================

// Funkcja przełączająca widoki między Logowaniem a Rejestracją
window.toggleAuthViews = function(view) {
    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');
    
    if (view === 'register') {
        if(loginBox) loginBox.style.display = 'none';
        if(registerBox) registerBox.style.display = 'block';
    } else {
        if(loginBox) loginBox.style.display = 'block';
        if(registerBox) registerBox.style.display = 'none';
    }
}

// OBSŁUGA LOGOWANIA
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-user').value;
        const password = document.getElementById('login-pass').value;

        try {
            const response = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                currentUser = data; 
                localStorage.setItem('cinekeep_logged_user', JSON.stringify(currentUser));

                loginForm.reset();
                updateUI();

                const chatBox = document.getElementById('ai-chat-box');
                if (chatBox) {
                    chatBox.innerHTML = `
                        <p style="text-align: left; margin: 0; color: #00b4d8;">
                            <strong>Asystent:</strong> Cześć! Podaj mi swój nastrój, ulubiony gatunek lub aktora, a znajdę dla Ciebie idealny film lub serial! 🎬 Sprawdź mnie – odpowiadam tylko na tematy filmowe!
                        </p>
                    `;
                }

                if (typeof checkAiLimit === "function") {
                    checkAiLimit();
                }

                alert("Witaj z powrotem, " + currentUser.username + "!");
                checkAccountStatusAndNavigate(); 
                loadMoviesFromServer();
            } else {
                alert("Błąd logowania: " + data.message);
            }
        } catch (error) {
            console.error("Błąd logowania:", error);
            alert("Błąd połączenia przy logowaniu.");
        }
    });
}

// OBSŁUGA REJESTRACJI 
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
        
        const username = document.getElementById('reg-user').value;
        const password = document.getElementById('reg-pass').value;

        //Blokada rejestracji
        const isAccepted = document.getElementById('reg-accept').checked;
        if (!isAccepted) {
            alert("Błąd: Musisz zaakceptować regulamin serwisu, aby utworzyć konto!");
            return;
        }

        const passwordError = isPasswordStrong(password);
        if (passwordError) {
            alert(passwordError);
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert("Konto założone pomyślnie! Możesz się teraz zalogować.");
                registerForm.reset();
                toggleAuthViews('login');
            } else {
                alert("Błąd rejestracji: " + data.message);
            }
        } catch (error) {
            console.error("Błąd rejestracji:", error);
            alert("Serwer nie odpowiada przy rejestracji.");
        }
    });
}

// Funkcja walidacji hasła
function isPasswordStrong(password) {
    if (password.length < 8) return "Hasło musi mieć min. 8 znaków.";
    if (!/[A-Z]/.test(password)) return "Hasło musi mieć min. jedną dużą literę.";
    if (!/[0-9]/.test(password)) return "Hasło musi mieć min. jedną cyfrę.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Hasło musi mieć min. jeden znak specjalny.";
    return null;
}

// Obsługa przycisku wylogowania
document.getElementById('logout-btn')?.addEventListener('click', () => {
    currentUser = null;
    localStorage.removeItem('cinekeep_logged_user');
    alert("Wylogowano pomyślnie.");
    updateUI();
    
    toggleAuthViews('login');
    showSection('login-section');
    renderMovies();

    // Czyszczenie okna czatu AI z wiadomości
    const chatBox = document.getElementById('ai-chat-box');
    if (chatBox) {
        chatBox.innerHTML = `
            <p style="text-align: left; margin: 0; color: #00b4d8;">
                <strong>Asystent:</strong> Cześć! Podaj mi swój nastrój, ulubiony gatunek lub aktora, a znajdę dla Ciebie idealny film lub serial! 🎬 Sprawdź mnie – odpowiadam tylko na tematy filmowe!
            </p>
        `;
    }

    if (typeof checkAiLimit === "function") {
        checkAiLimit();
    }
}); 

// =================================================================
// 5. OBSŁUGA FILMÓW (DODAWANIE, FILTROWANIE, SORTOWANIE)
// =================================================================

const form = document.getElementById('movie-form');
if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!currentUser) {
            alert("Musisz być zalogowany, aby dodać film!");
            return;
        }

        const selectedTags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(cb => cb.value);
        
        const type = document.getElementById('movie-type').value;
        let season = "";

        if (type === 'tvshow') {
            const seasonInput = document.getElementById('movie-season').value.trim();
            const seasonNumber = parseInt(seasonInput);

            if (!seasonInput || isNaN(seasonNumber) || seasonNumber < 1 || seasonNumber > 100) {
                alert("Błąd: Proszę podać prawidłowy numer sezonu (liczba od 1 do 100)!");
                return;
            }
            season = `Sezon ${seasonNumber}`;
        }

        const movieData = {
            id: Date.now(),
            title: document.getElementById('movie-title').value,
            status: document.getElementById('movie-status').value,
            rating: document.getElementById('movie-rating').value || null,
            review: document.getElementById('movie-review').value || "",
            visibility: document.getElementById('movie-visibility').value,
            tags: selectedTags,
            owner: currentUser.username,
            type: type,      
            season: season
        };

        try {
            const response = await fetch('http://localhost:3000/api/movies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movieData)
            });

            if (response.ok) {
                alert(`Film "${movieData.title}" został zapisany!`);
                this.reset();
                toggleReviewFields();
                toggleTvShowFields();
                loadMoviesFromServer();
            } else {
                throw new Error('Błąd serwera przy zapisie');
            }
        } catch (error) {
            console.error("Błąd dodawania:", error);
            alert("Nie udało się zapisać filmu.");
        }
    });
}

window.filterByTag = function(tag) {
    currentFilter = tag;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.innerText === tag || (tag === 'all' && btn.innerText === 'Wszystkie')) {
            btn.classList.add('active');
        }
    });
    renderMovies();
};

window.sortMovies = function(criteria) {
    if (criteria === 'alpha') {
        movies.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
    } else if (criteria === 'rating-high') {
        movies.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (criteria === 'rating-low') {
        movies.sort((a, b) => {
            if (!a.rating) return 1;
            if (!b.rating) return -1;
            return a.rating - b.rating;
        });
    } else if (criteria === 'date-new') {
        movies.sort((a, b) => b.id - a.id);
    } else if (criteria === 'date-old') {
        movies.sort((a, b) => a.id - b.id);
    }
    renderMovies();
};

async function loadMoviesFromServer() {
    try {
        const response = await fetch('http://localhost:3000/api/movies');
        movies = await response.json();
        renderMovies();
    } catch (error) {
        console.error("Nie udało się pobrać filmów:", error);
    }
}

// =================================================================
// RENDEROWANIE LIST (SPOŁECZNOŚĆ, KOLEJKA, HISTORIA)
// =================================================================

function renderMovies() {
    const pendingList = document.getElementById('pending-list');
    const watchedList = document.getElementById('watched-list');
    const communityList = document.getElementById('community-reviews');

    if (!pendingList || !watchedList || !communityList) return;

    pendingList.innerHTML = '';
    watchedList.innerHTML = '';
    communityList.innerHTML = '';

    let filteredMovies = movies;
    if (currentFilter !== 'all') {
        filteredMovies = movies.filter(movie => movie.tags && movie.tags.includes(currentFilter));
    }

    filteredMovies.forEach((movie, index) => {
        const isOwner = currentUser && movie.owner === currentUser.username;

        const li = document.createElement('li');
        li.className = `movie-item ${movie.status === 'watched' ? 'watched' : ''}`;

        const tagsHtml = movie.tags && movie.tags.length > 0 
            ? `<div class="movie-tags-display">${movie.tags.map(t => `<span class="mini-tag">${t}</span>`).join('')}</div>` 
            : '';

        // Listy personalne z plakietkami typu
        if (isOwner) {
            const typeLabel = movie.type === 'tvshow' 
                ? `<span style="color: #00b4d8; font-size: 0.8em; font-weight: bold; margin-right: 5px;">[📺 Serial, ${movie.season}]</span>` 
                : `<span style="color: #74b9ff; font-size: 0.8em; font-weight: bold; margin-right: 5px;">[🎬 Film]</span>`;

            if (movie.status === 'pending') {
                li.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div>${typeLabel} <strong style="color: #fff;">${movie.title}</strong>${tagsHtml}</div>
                        <div class="movie-actions">
                            <button class="action-btn" onclick="markAsWatched(${index})">Obejrzane</button>
                            <button class="mod-btn-reject" style="padding: 5px 10px; font-size: 0.85em; margin-left: 5px;" onclick="deleteMovieFromLibrary(${movie.id})">🗑️ Usuń</button>
                        </div>
                    </div>
                `;
                pendingList.appendChild(li);
            } else if (movie.status === 'watched') {
                const visibilityIcon = movie.visibility === 'public' ? '🌍' : '🔒';
                const visibilityText = movie.visibility === 'public' ? 'Publiczna' : 'Prywatna';

                li.innerHTML = `
                    <div style="flex: 1; text-align: left;">
                        <div style="margin-bottom: 5px;">${typeLabel} <strong style="font-size: 1.1em; color: #fff;">${movie.title}</strong> ${tagsHtml}</div>
                        <div class="user-rating" style="margin: 3px 0;">⭐ ${movie.rating || '?'}/10</div>
                        <p style="font-size: 0.9em; opacity: 0.8; margin: 5px 0; font-style: italic;">"${movie.review}"</p>
                    </div>
                    <div class="movie-actions" style="display: flex; gap: 5px; align-items: center;">
                        <button class="visibility-btn" onclick="toggleVisibility(${index})" title="Zmień widoczność">
                            ${visibilityIcon} <span style="font-size: 0.7em;">${visibilityText}</span>
                        </button>
                        <button class="action-btn" style="background: #ff9f43; padding: 6px 10px; font-size: 0.8em;" onclick="editMovieReview(${movie.id}, '${movie.rating}', \`${movie.review.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`)">📝 Edytuj</button>
                        <button class="mod-btn-reject" style="padding: 6px 10px; font-size: 0.8em;" onclick="deleteMovieFromLibrary(${movie.id})">🗑️ Usuń</button>
                    </div>
                `;
                watchedList.appendChild(li);
            }
        }

        // Globalna zakładka społeczność
        if (movie.status === 'watched' && movie.visibility === 'public') {
            
            // FILTRACJA
            if (currentCommunityFilter !== 'all' && movie.type !== currentCommunityFilter) {
                return;
            }

            // PLAKIETKA
            let typeTag = '';
            if (movie.type === 'tvshow') {
                typeTag = `<span style="background: #00b4d8; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: bold; margin-right: 8px;">📺 SERIAL (${movie.season || 'Sezon 1'})</span>`;
            } else {
                typeTag = `<span style="background: #74b9ff; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: bold; margin-right: 8px;">🎬 FILM</span>`;
            }

            const isAdminOrMod = currentUser && (currentUser.role === 'admin' || currentUser.role === 'moderator');
            const actionButtonHtml = isAdminOrMod
                ? `<button class="mod-btn-reject" style="padding: 3px 8px; font-size: 0.8em; margin-left: 10px;" onclick="executeModAction(0, 'warn', '${movie.owner}', ${movie.id}, '${currentUser.username}')">🗑️ Szybkie usuwanie i warning</button>`
                : `<button class="report-inline-btn" onclick="reportComment(${movie.id}, '${movie.owner}')">⚠️ Zgłoś recenzję</button>`;

            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';
            reviewCard.innerHTML = `
                <h4 style="display: flex; align-items: center; margin-top: 0;">${typeTag} ${movie.title}</h4>
                <div class="rating">Ocena: ⭐ ${movie.rating}/10</div>
                <p>"${movie.review}"</p>
                <div style="margin-bottom: 10px;">${tagsHtml}</div>
                <small>Dodano przez: ${movie.owner || 'Anonimowy użytkownik'}</small>
                ${actionButtonHtml}
            `;
            communityList.appendChild(reviewCard);
        }
    });
}

window.markAsWatched = function(index) {
    const rating = prompt("Jak oceniasz ten film (1-10)?", "10");
    const review = prompt("Twoja krótka recenzja:", "Świetny film!");
    
    if (rating !== null) {
        movies[index].status = 'watched';
        movies[index].rating = rating;
        movies[index].review = review;
        saveAndRefresh();
    }
};

window.toggleVisibility = function(index) {
    const currentVisibility = movies[index].visibility;

    if (currentUser && (currentUser.status === 'muted' || currentUser.status === 'suspended')) {
        if (currentVisibility !== 'public') {
            alert("Błąd: Nie możesz upubliczniać filmów, ponieważ Twoje konto posiada aktywne ograniczenia społecznościowe!");
            return;
        }
    }

    movies[index].visibility = (currentVisibility === 'public') ? 'private' : 'public';
    saveAndRefresh();
};

async function saveAndRefresh() {
    try {
        const response = await fetch('http://localhost:3000/api/movies/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movies)
        });
        if (!response.ok) throw new Error('Błąd podczas zapisu');
        renderMovies();
    } catch (error) {
        console.error(error);
        alert("Nie udało się zapisać danych.");
    }
}

// =================================================================
// LOGIKA SYSTEMU KAR, MODERACJI I ADMINISTRACJI
// =================================================================

async function reportComment(commentId, reportedUser) {
    if (!currentUser) { alert("Musisz być zalogowany, aby zgłaszać posty."); return; }
    if (currentUser.username === reportedUser) { alert("Nie możesz zgłosić samego siebie!"); return; }

    const reason = prompt("Podaj powód zgłoszenia tej recenzji (np. wulgaryzmy, spam):");
    if (!reason) return;

    try {
        const response = await fetch('http://localhost:3000/api/reports/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentId, reportedUser, reason, reportedBy: currentUser.username })
        });
        alert((await response.json()).message);
    } catch (e) { console.error(e); }
}

async function loadModeratorDashboard() {
    const list = document.getElementById('mod-reports-list');
    if (!list) return;

    try {
        const response = await fetch('http://localhost:3000/api/moderator/reports');
        let reports = await response.json();

        reports = reports.filter(r => r.type !== 'mod_application');

        if (reports.length === 0) {
            list.innerHTML = '<p class="empty-info">Brak aktywnych zgłoszeń w kolejce.</p>';
            return;
        }

        list.innerHTML = reports.map(r => `
            <li class="report-item">
                <p><strong>Zgłoszony użytkownik:</strong> ${r.reportedUser}</p>
                <p><strong>Powód zgłoszenia:</strong> <span style="color:#ff9f43;">${r.reason}</span></p>
                <p><small>Zgłoszone przez: ${r.reportedBy} | ID Filmu: ${r.commentId}</small></p>
                <div class="report-actions">
                    <button class="mod-btn-approve" onclick="executeModAction(${r.id}, 'warn', '${r.reportedUser}', ${r.commentId}, '${currentUser.username}')">⚠️ Daj Ostrzeżenie i Usuń</button>
                    <button class="mod-btn-reject" onclick="executeModAction(${r.id}, 'dismiss')">❌ Odrzuć zgłoszenie</button>
                </div>
            </li>
        `).join('');
    } catch (e) { console.error(e); }
}

async function executeModAction(reportId, action, targetUser = '', commentId = 0) {
    try {
        const response = await fetch('http://localhost:3000/api/moderator/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reportId, 
                action, 
                targetUser, 
                commentId,
                executerUser: currentUser ? currentUser.username : '' 
            })
        });
        
        const data = await response.json();
        alert(data.message);
        
        loadModeratorDashboard();
        loadMoviesFromServer();
        document.getElementById('btn-search-user')?.click();
    } catch (e) { console.error(e); }
}

async function loadAdminDashboard() {
    const suspendedList = document.getElementById('admin-suspended-list');
    const appealsList = document.getElementById('admin-appeals-list');
    if (!suspendedList || !appealsList) return;

    try {
        const response = await fetch('http://localhost:3000/api/admin/dashboard');
        const data = await response.json();

        if(data.suspendedUsers.length === 0) {
            suspendedList.innerHTML = '<p class="empty-info">Brak kont oczekujących na wyrok.</p>';
        } else {
            suspendedList.innerHTML = data.suspendedUsers.map(u => `
                <li class="report-item">
                    <p><strong>Użytkownik:</strong> ${u.username}</p>
                    <p>Ostrzeżenia: <span style="color:#e94560;">${u.warnings}</span></p>
                    <div class="report-actions">
                        <button class="mod-btn-reject" onclick="executeAdminDecision('${u.username}', 'ban')">🔨 BANUJ NA ZAWSZE</button>
                        <button class="mod-btn-approve" onclick="executeAdminDecision('${u.username}', 'unban')">💚 Przywróć</button>
                    </div>
                </li>
            `).join('');
        }

        // Render odwołań i podań
        if(data.appeals.length === 0) {
            appealsList.innerHTML = '<p class="empty-info">Brak nowych odwołań/podań.</p>';
        } else {
            appealsList.innerHTML = data.appeals.map(a => {
                let typSprawy = '';
                let przyciskAkceptacji = '';

                if (a.type === 'appeal') {
                    typSprawy = '✉️ ODWOŁANIE OD KARY';
                    przyciskAkceptacji = `<button class="mod-btn-approve" onclick="executeAdminDecision('${a.reportedUser}', 'unban', ${a.id})">✅ Zaakceptuj odwołanie (Odbanuj)</button>`;
                } else if (a.type === 'mod_application' || a.type === 'mod-apply') {
                    typSprawy = '📝 PODANIE NA MODERATORA';
                    przyciskAkceptacji = `<button class="mod-btn-approve" onclick="executeAdminDecision('${a.reportedUser}', 'promote_mod', ${a.id})">⭐ Awansuj na Moderatora</button>`;
                }

                const trescPodania = a.reason || a.text || 'Brak treści';

                return `
                    <li class="report-item appeal-item">
                        <p><strong>Typ:</strong> ${typSprawy}</p>
                        <p><strong>Od użytkownika:</strong> ${a.reportedUser || a.username}</p>
                        <p><strong>Treść uzasadnienia:</strong> "${trescPodania}"</p>
                        <div class="report-actions">
                            ${przyciskAkceptacji}
                            <button class="mod-btn-reject" onclick="executeAdminDecision('${a.reportedUser || a.username}', 'dismiss', ${a.id})">❌ Odrzuć/Usuń sprawę</button>
                        </div>
                    </li>
                `;
            }).join('');
        }

        loadAdminLogs();

    } catch (e) { 
        console.error(e); 
    }
}

// ======================
// FUNKCJA LOGÓW
// ======================

async function loadAdminLogs() {
    const logsContainer = document.getElementById('admin-logs-list');
    if (!logsContainer) return;

    try {
        const response = await fetch('http://localhost:3000/api/admin/logs');
        const logs = await response.json();

        if (!logs || logs.length === 0) {
            logsContainer.innerHTML = '<p style="color: #888; margin: 0;">Brak zarejestrowanych działań w systemie.</p>';
            return;
        }

        logsContainer.innerHTML = logs.map(log => `
            <div style="margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px; line-height: 1.4em; text-align: left;">
                <span style="color: #ff9f43; font-weight: bold;">[${log.date}]</span> 
                <span style="color: #fff;">${log.text}</span>
            </div>
        `).join('');
    } catch (e) {
        console.error("Błąd ładowania logów na frontendzie:", e);
        logsContainer.innerHTML = '<p style="color: #e94560; margin: 0;">Nie udało się pobrać logów z serwera.</p>';
    }
}

async function executeAdminDecision(targetUser, decision, reportId = null) {
    try {
        const response = await fetch('http://localhost:3000/api/admin/decision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUser, decision, reportId })
        });
        alert((await response.json()).message);
        loadAdminDashboard();
        document.getElementById('btn-search-user')?.click();
    } catch (e) { console.error(e); }
}

// =================================================================
// ASYSTENT AI, FORMULARZE SŁUCHACZY I WYSZUKIWARKA KONT
// =================================================================
document.getElementById('btn-submit-mod-apply')?.addEventListener('click', async () => {
    const text = document.getElementById('mod-apply-text').value;
    if(!text) return;
    try {
        const response = await fetch('http://localhost:3000/api/moderator/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reportedUser: currentUser.username,
                text: text 
            })
        });
        alert((await response.json()).message);
        document.getElementById('mod-apply-text').value = '';
        showSection('home');
    } catch(e) { console.error(e); }
});

// OBSŁUGA ODWOŁANIA 
document.getElementById('btn-submit-appeal')?.addEventListener('click', async (e) => {
    if (e) e.preventDefault();
    const text = document.getElementById('appeal-text').value.trim();
    if (!text) {
        alert("Proszę wpisać treść uzasadnienia przed wysłaniem!");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/reports/appeal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, reason: text })
        });

        const data = await response.json();
        alert(data.message);

        if (response.ok) {
            document.getElementById('appeal-text').value = '';
            currentUser.hasPendingAppeal = true;
            localStorage.setItem('cinekeep_logged_user', JSON.stringify(currentUser));
            
            checkAccountStatusAndNavigate();
        }
    } catch(e) { 
        console.error(error); 
        alert("Wystąpił błąd sieciowy przy wysyłaniu odwołania.");
    }
});

//============================================================
// Słuchacz wyszukiwania z obsługą podpowiedzi 
//============================================================

document.getElementById('btn-search-user')?.addEventListener('click', async () => {
    const username = document.getElementById('search-username-input').value.trim();
    const resultBox = document.getElementById('search-user-result');
    if (!username || !resultBox) return;

    try {
        const response = await fetch(`http://localhost:3000/api/admin/search-user/${username}?t=${Date.now()}`);
        if (!response.ok) {
            const err = await response.json();
            resultBox.style.display = 'block';
            resultBox.innerHTML = `<p style="color: #e94560; margin:0;">${err.message}</p>`;
            return;
        }

        const data = await response.json();
        resultBox.style.display = 'block';

        // Znaleziono wielu pasujących użytkowników
        if (data.type === "list") {
            let listHtml = `<p style="margin: 0 0 10px 0; font-weight: bold; color: #ff9f43;">💡 Znaleziono kilku użytkowników. Kliknij właściwy login:</p><ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px;">`;
            
            data.users.forEach(u => {
                listHtml += `
                    <li style="background: #22254b; padding: 8px 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                        <span><strong>${u.username}</strong> (${u.role.toUpperCase()})</span>
                        <button class="search-select-btn" style="padding: 4px 10px; font-size: 0.85em; background: #e94560; border: none; border-radius: 3px; color: white; cursor: pointer;" onclick="selectAndSearchUser('${u.username}')">Wybierz</button>
                    </li>
                `;
            });
            listHtml += `</ul>`;
            resultBox.innerHTML = listHtml;
            return;
        }

        //Mamy jednego, konkretnego użytkownika
        const u = data.user;

        let roleActionBtn = '';
        if (currentUser && currentUser.role === 'admin') {
            if (u.role === 'user') {
                roleActionBtn = `<button class="mod-btn-approve" style="background: #00b4d8;" onclick="executeAdminDecision('${u.username}', 'promote_mod')">⭐ Awansuj na Moda</button>`;
            } else if (u.role === 'moderator') {
                roleActionBtn = `<button class="mod-btn-reject" style="background: #f77f00;" onclick="executeAdminDecision('${u.username}', 'demote_user')">⬇️ Degraduj do Użytkownika</button>`;
            }
        }

        let akcjeHtml = '';
        if (currentUser && u.username === currentUser.username) {
            akcjeHtml = `<p style="color: #ff9f43; font-size: 0.9em; margin: 0; padding: 5px 0;">✨ To jest Twoje konto administratora. Opcje zarządzania są zablokowane.</p>`;
        } else {
            akcjeHtml = `
                <button class="mod-btn-reject" onclick="executeAdminDecision('${u.username}', 'ban')">🔨 Zbanuj konto</button>
                <button class="mod-btn-approve" onclick="executeAdminDecision('${u.username}', 'unban')">💚 Przebacz (Reset kar)</button>
                <button class="mod-btn-approve" style="background: #ff9f43;" onclick="executeModAction(0, 'warn', '${u.username}', 0, '${currentUser.username}')">⚠️ Daj +1 Ostrzeżenie</button>
                ${roleActionBtn}
            `;
        }

        const blokadaInfo = u.mutedUntil ? new Date(u.mutedUntil).toLocaleString() : 'Brak blokady';

        resultBox.innerHTML = `
            <div style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 10px;">
                <h4 style="margin: 0; font-size: 1.2em;">Konto: <span style="color:#ff9f43;">${u.username}</span></h4>
                <p style="margin: 5px 0 0 0; font-size: 0.9em; opacity: 0.7;">Ranga: <strong>${u.role.toUpperCase()}</strong> | Status: <span style="color: ${u.status === 'active' ? '#4e9f3d' : '#e94560'}"><strong>${u.status.toUpperCase()}</strong></span></p>
            </div>
            <div style="margin-bottom: 15px; font-size: 0.9em; display: flex; gap: 20px;">
                <p style="margin: 0;">📊 Dodane recenzje: <strong>${u.moviesCount}</strong></p>
                <p style="margin: 0;">⚠️ Liczba ostrzeżeń: <strong>${u.warnings || 0}/3</strong></p>
            </div>
            <p style="font-size: 0.85em; opacity: 0.6; margin: 0 0 15px 0;">⏳ Wyciszenie aktywne do: ${blokadaInfo}</p>
            <div class="report-actions" style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${akcjeHtml}
            </div>
        `;
    } catch (e) { console.error(e); }
});

// =================================================================
// USUWANIE I EDYCJA FILMÓW PRZEZ UŻYTKOWNIKA
// =================================================================

// Funkcja usuwająca
window.deleteMovieFromLibrary = async function(movieId) {
    if (!confirm("Czy na pewno chcesz całkowicie usunąć ten film i recenzję ze swojej biblioteki?")) return;

    try {
        const response = await fetch(`http://localhost:3000/api/movies/${movieId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        alert(data.message);

        loadMoviesFromServer();
    } catch (error) {
        console.error("Błąd podczas usuwania filmu:", error);
        alert("Nie udało się usunąć filmu.");
    }
};

// Funkcja edytująca
window.editMovieReview = async function(movieId, oldRating, oldReview) {
    const newRating = prompt("Zmień ocenę filmu (1-10):", oldRating);
    if (newRating === null) return;

    const ratingNum = parseInt(newRating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 10) {
        alert("Błąd: Ocena musi być liczbą z zakresu 1-10!");
        return;
    }

    const newReview = prompt("Popraw treść swojej recenzji:", oldReview);
    if (newReview === null) return; 

    try {
        const response = await fetch(`http://localhost:3000/api/movies/${movieId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: ratingNum, review: newReview })
        });

        const data = await response.json();
        alert(data.message);

        loadMoviesFromServer();
    } catch (error) {
        console.error("Błąd podczas edycji recenzji:", error);
        alert("Nie udało się zapisać zmian.");
    }
};

window.toggleTvShowFields = function() {
    const type = document.getElementById('movie-type').value;
    const tvFields = document.getElementById('tvshow-fields');
    if (tvFields) {
        tvFields.style.display = type === 'tvshow' ? 'block' : 'none';
    }
};

let currentCommunityFilter = 'all';
window.filterCommunityType = function(type) {
    currentCommunityFilter = type;
    
    ['all', 'movie', 'tvshow'].forEach(t => {
        const btn = document.getElementById(`comm-filter-${t}`);
        if (btn) {
            if (t === type) {
                btn.style.background = '#e94560';
                btn.style.border = 'none';
            } else {
                btn.style.background = '#1a1a2e';
                btn.style.border = '1px solid rgba(255,255,255,0.2)';
            }
        }
    });
    renderMovies();
};

// =============================================
// INTELIGENTNY ASYSTENT AI Z LIMITAMI ZAPYTAŃ
// =============================================

function checkAiLimit() {
    if (!currentUser) return 0;
    
    const today = new Date().toDateString();
    const storageKey = `ai_limit_${currentUser.username}`;
    
    let aiData = JSON.parse(localStorage.getItem(storageKey)) || { date: today, count: 0 };
    
    // Reset licznika
    if (aiData.date !== today) {
        aiData = { date: today, count: 0 };
    }
    
    const remaining = Math.max(0, 4 - aiData.count);
    const counterEl = document.getElementById('ai-usage-counter');
    if (counterEl) counterEl.innerText = `Pozostało zapytań na dziś: ${remaining}/4`;
    
    return remaining;
}

window.askCineKeepAI = async function() {
    const inputEl = document.getElementById('ai-input');
    const chatBox = document.getElementById('ai-chat-box');
    if (!inputEl || !chatBox) return;

    const userQuery = inputEl.value.trim();
    if (!userQuery) return;

    const remainingRequests = checkAiLimit();
    
    // BLOKADA
    if (remainingRequests <= 0 && currentUser.role === 'user') {
        alert("Osiągnąłeś dzienny limit 4 zapytań do Asystenta AI. Zapraszamy jutro!");
        return;
    }

    chatBox.innerHTML += `
        <p style="text-align: right; margin-top: 10px;">
            <span style="background: #e94560; padding: 8px 12px; border-radius: 10px 10px 0 10px; display: inline-block; color: #fff;">
                <strong>Ty:</strong> ${userQuery}
            </span>
        </p>
    `;
    inputEl.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = `load-${Date.now()}`;
    chatBox.innerHTML += `<p id="${loadingId}" style="color: #888; font-style: italic; margin-top: 10px;">🤖 Asystent myśli...</p>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // Ządanie do serwera 
        const response = await fetch('http://localhost:3000/api/ai/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: userQuery, username: currentUser.username })
        });
        
        const data = await response.json();
        
        document.getElementById(loadingId)?.remove();

        chatBox.innerHTML += `
            <p style="text-align: left; margin-top: 10px; color: #00b4d8;">
                <strong>Asystent:</strong> ${data.reply}
            </p>
        `;
        chatBox.scrollTop = chatBox.scrollHeight;

        if (response.ok) {
            const today = new Date().toDateString();
            const storageKey = `ai_limit_${currentUser.username}`;
            let aiData = JSON.parse(localStorage.getItem(storageKey)) || { date: today, count: 0 };
            if (aiData.date !== today) aiData = { date: today, count: 0 };
            
            aiData.count++;
            localStorage.setItem(storageKey, JSON.stringify(aiData));
            
            checkAiLimit();
        }

    } catch (error) {
        document.getElementById(loadingId)?.remove();
        chatBox.innerHTML += `<p style="color: #e94560; margin-top: 10px;"><strong>System:</strong> Błąd połączenia z serwerem AI.</p>`;
    }
};

// =================================================================
// ELENSTYCZNE PREMIERY TYGODNIOWE
// =================================================================
window.loadUpcomingReleases = async function() {
    const grid = document.getElementById('upcoming-releases-grid');
    if (!grid) return;

    try {
        const apiKey = "16c0871d2ebe3568c20452558483524c";  

        //zakres dat
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Niedziela, 1 = Poniedziałek, ..., 6 = Sobota
        
        let monday = new Date(today);
        let dateFrom, dateTo;
        
        if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
            dateFrom = today.toISOString().split('T')[0];
            
            const sunday = new Date(today);
            const daysToNextSunday = (7 - dayOfWeek) + 7;
            sunday.setDate(today.getDate() + daysToNextSunday);
            dateTo = sunday.toISOString().split('T')[0];
        } else {
            const distanceFromMonday = 1 - dayOfWeek;
            monday.setDate(today.getDate() + distanceFromMonday);
            
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            
            dateFrom = monday.toISOString().split('T')[0];
            dateTo = sunday.toISOString().split('T')[0];
        }

        const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=pl-PL&sort_by=popularity.desc&primary_release_date.gte=${dateFrom}&primary_release_date.lte=${dateTo}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("API Error");

        const data = await response.json();
        let movies = data.results || [];

        if (movies.length > 0) {
            // Sortowanie
            movies.sort((a, b) => {
                if (!a.release_date) return 1;
                if (!b.release_date) return -1;
                return b.release_date.localeCompare(a.release_date);
            });

            // Lista maksymalnie 20 filmów
            grid.innerHTML = movies.slice(0, 20).map(movie => {
                const posterUrl = movie.poster_path 
                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
                    : 'https://via.placeholder.com/150x220?text=CineKeep';
                
                let displayDate = '2026';
                if (movie.release_date) {
                    const parts = movie.release_date.split('-');
                    displayDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
                }

                const tmdbLink = `https://www.themoviedb.org/movie/${movie.id}?language=pl-PL`;

                return `
                    <div class="movie-card" onclick="window.open('${tmdbLink}', '_blank')" style="cursor: pointer; min-width: 180px; max-width: 180px; flex-shrink: 0; margin: 0; box-sizing: border-box;" title="Zobacz szczegóły na TMDB">
                        <div class="poster" style="background-image: url('${posterUrl}'); background-size: cover; background-position: center; min-height: 250px; border-radius: 4px;"></div>
                        <h4 style="margin: 10px 0 5px 0; font-size: 0.95em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;" title="${movie.title}">${movie.title}</h4>
                        <span class="tag" style="background: #e94560; padding: 2px 8px; border-radius: 3px; font-size: 0.75em; color: #fff; display: inline-block;">📅 ${displayDate}</span>
                    </div>
                `;
            }).join('');
        } else {
            grid.innerHTML = '<p style="color: #888; padding: 20px; grid-column: 1/-1; text-align: center;">Brak nowych premier w tym okresie.</p>';
        }
    } catch (error) {
        console.error("Błąd ładowania premier tygodniowych:", error);
    }
};


window.selectAndSearchUser = function(username) {
    const input = document.getElementById('search-username-input');
    const searchBtn = document.getElementById('btn-search-user');
    
    if (input && searchBtn) {
        input.value = username; 
        
        setTimeout(() => {
            searchBtn.click();
        }, 50);
    }
};

setTimeout(() => {
    if (typeof loadUpcomingReleases === 'function') {
        loadUpcomingReleases();
    }
}, 300);