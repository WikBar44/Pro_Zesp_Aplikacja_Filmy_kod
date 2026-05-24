// =================================================================
// 1. INICJALIZACJA BAZY DANYCH I ZMIENNYCH GLOBALNYCH
// =================================================================
let currentUser = null;
let movies = [];
let currentFilter = 'all';

// Pomocnicze zmienne globalne dla zakładek (będą zainicjalizowane na start)
let tabs = [];
let contents = [];

function toggleReviewFields() {
    const status = document.getElementById('movie-status').value;
    const reviewFields = document.getElementById('review-fields');
    if (reviewFields) {
        reviewFields.style.display = status === 'watched' ? 'block' : 'none';
    }
}

// =================================================================
// 2. START APLIKACJI (DOMContentLoaded)
// =================================================================
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
            // POPRAWKA (Sprawa 2 i 4): Pobieramy najświeższe dane konta prosto z bazy serwera
            const response = await fetch(`http://localhost:3000/api/users/me/${parsed.username}`);
            if (response.ok) {
                currentUser = await response.json();
                localStorage.setItem('cinekeep_logged_user', JSON.stringify(currentUser)); // Aktualizacja lokalna
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
// 3. FUNKCJE POMOCNICZE INTERFEJSU I REWIZJI KONT
// =================================================================
// Zastąp funkcję checkAccountStatusAndNavigate() w script.js:
async function checkAccountStatusAndNavigate() {
    if (!currentUser) return;

    try {
        const response = await fetch(`http://localhost:3000/api/users/me/${currentUser.username}`);
        if (response.ok) {
            currentUser = await response.json();
            localStorage.setItem('cinekeep_logged_user', JSON.stringify(currentUser));
        }
    } catch (e) { console.error(e); }

    // OBSŁUGA POWIADOMIEŃ (Sprawa 3)
    if (currentUser.notifications && currentUser.notifications.length > 0) {
        alert("🚨 NOWE POWIADOMIENIE OD ADMINISTRACJI:\n\n" + currentUser.notifications.join("\n"));
        // Czyścimy powiadomienia na serwerze, żeby nie wyskakiwały przy każdym odświeżeniu
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
        
        // Elementy formularza odwołania w HTML
        const appealTextarea = document.getElementById('appeal-text');
        const appealButton = document.getElementById('btn-submit-appeal');

        if (currentUser.status === 'muted') {
            infoText.innerHTML = `Twoja możliwość komentowania została zawieszona. Blokada wygasa: <strong>${new Date(currentUser.mutedUntil).toLocaleString()}</strong>.<br>Posiadasz ostrzeżeń: ${currentUser.warnings || 0}/3.`;
        } else {
            infoText.innerHTML = `Twoje konto zostało <strong>całkowicie zawieszone</strong> z powodu zebrania 3 ostrzeżeń. Oczekujesz na decyzję Administratora (BAN lub przywrócenie konta).`;
        }

        // BLOKADA FORMULARZA ODWOŁANIA (Sprawa 2):
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
    const navMenu = document.querySelector('.nav-menu'); // Pobieramy całe menu
    const loginTabBtn = document.querySelector('[data-target="login-section"]');
    const logoutBtn = document.getElementById('logout-btn');
    
    const modBtn = document.getElementById('nav-mod-btn');
    const adminBtn = document.getElementById('nav-admin-btn');
    const applyModBtn = document.getElementById('nav-apply-mod-btn');

    // Domyślnie ukrywamy panele specjalne
    if(modBtn) modBtn.style.display = 'none';
    if(adminBtn) adminBtn.style.display = 'none';
    if(applyModBtn) applyModBtn.style.display = 'none';

    if (currentUser) {
        // UŻYTKOWNIK ZALOGOWANY -> Pokazujemy całe menu nawigacyjne!
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
        // UŻYTKOWNIK NIEZALOGOWANY -> Całkowicie chowamy pasek menu
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

    // Wywołanie ładowania paneli przy ich otwieraniu
    if (target === 'mod-section') loadModeratorDashboard();
    if (target === 'admin-section') loadAdminDashboard();
}

// =================================================================
// 4. AUTORYZACJA (LOGOWANIE I REJESTRACJA)
// =================================================================
// =================================================================
// 4. AUTORYZACJA (LOGOWANIE I REJESTRACJA) - NOWA WERSJA
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

// 1. OBSŁUGA LOGOWANIA
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

// 2. OBSŁUGA ODDZIELNEJ REJESTRACJI (Z DUŻYM PRZYCISKIEM)
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
        
        const username = document.getElementById('reg-user').value;
        const password = document.getElementById('reg-pass').value;

        // NOWOŚĆ: Bezwzględna blokada rejestracji bez ptaszka!
        const isAccepted = document.getElementById('reg-accept').checked;
        if (!isAccepted) {
            alert("Błąd: Musisz zaakceptować regulamin serwisu, aby utworzyć konto!");
            return; // Przerywamy działanie funkcji, serwer nic nie dostanie
        }

        // Dalsza część Twojego kodu rejestracji (walidacja hasła, fetch, itd.)...
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
                toggleAuthViews('login'); // Automatyczny powrót do ekranu logowania
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
    // Resetujemy widok autoryzacji do ekranu logowania przy wylogowaniu
    toggleAuthViews('login');
    showSection('login-section');
    renderMovies();
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
        
        // NOWA WALIDACJA SEZONU (Wewnątrz submit #movie-form)
        const type = document.getElementById('movie-type').value;
        let season = "";

        if (type === 'tvshow') {
            const seasonInput = document.getElementById('movie-season').value.trim();
            const seasonNumber = parseInt(seasonInput);

            // Sprawdzamy czy podano poprawną liczbę z zakresu 1-100
            if (!seasonInput || isNaN(seasonNumber) || seasonNumber < 1 || seasonNumber > 100) {
                alert("Błąd: Proszę podać prawidłowy numer sezonu (liczba od 1 do 100)!");
                return; // Przerywamy dodawanie
            }
            season = `Sezon ${seasonNumber}`; // Samoczynnie formatujemy na "Sezon X"
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
// 6. RENDEROWANIE LIST (SPOŁECZNOŚĆ, KOLEJKA, HISTORIA)
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

        // Listy personalne użytkownika z plakietkami Typu (Wewnątrz renderMovies)
        if (isOwner) {
            // Generujemy małą plakietkę tekstową dla Twoich list
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

// Globalna zakładka społeczność (Zaktualizowana wersja w renderMovies)
        if (movie.status === 'watched' && movie.visibility === 'public') {
            
            // FILTRACJA (NOWOŚĆ): Sprawdzamy czy wpis pasuje do wybranego filtru typu
            if (currentCommunityFilter !== 'all' && movie.type !== currentCommunityFilter) {
                return; // Pomijamy ten wpis, jeśli nie zgadza się z filtrem typu
            }

            // PLAKIETKA TYPU (NOWOŚĆ): Dynamiczne budowanie etykiety
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

    // POPRAWKA: Dodatkowe nawiasy wokół statusów oraz pozwolenie na chowanie filmu (zmiana na private)
    if (currentUser && (currentUser.status === 'muted' || currentUser.status === 'suspended')) {
        if (currentVisibility !== 'public') { // Blokujemy tylko próbę upublicznienia
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
// 7. LOGIKA SYSTEMU KAR, MODERACJI I ADMINISTRACJI
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

        // Render odwołań i podań w loadAdminDashboard
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

        // TUTAJ: Wywołujemy logi automatycznie przy otwieraniu dashboardu admina
        loadAdminLogs();

    } catch (e) { 
        console.error(e); 
    }
}

// =================================================================
// FUNKCJA LOGÓW JEST TERAZ CAŁKOWICIE OSOBNO I JEST WIDOCZNA GLOBALNIE
// =================================================================
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
// 8. ASYSTENT AI, FORMULARZE SŁUCHACZY I WYSZUKIWARKA KONT
// =================================================================
document.getElementById('btn-submit-mod-apply')?.addEventListener('click', async () => {
    const text = document.getElementById('mod-apply-text').value;
    if(!text) return;
    try {
        const response = await fetch('http://localhost:3000/api/moderator/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                reportedUser: currentUser.username, // ZMIANA: reportedUser zamiast username
                text: text 
            })
        });
        alert((await response.json()).message);
        document.getElementById('mod-apply-text').value = '';
        showSection('home');
    } catch(e) { console.error(e); }
});

// POPRAWIONA OBSŁUGA ODWOŁANIA 
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


// Zaawansowany słuchacz wyszukiwania z obsługą podpowiedzi 
document.getElementById('btn-search-user')?.addEventListener('click', async () => {
    const username = document.getElementById('search-username-input').value.trim();
    const resultBox = document.getElementById('search-user-result');
    if (!username || !resultBox) return;

    try {
        const response = await fetch(`http://localhost:3000/api/admin/search-user/${username}`);
        if (!response.ok) {
            const err = await response.json();
            resultBox.style.display = 'block';
            resultBox.innerHTML = `<p style="color: #e94560; margin:0;">${err.message}</p>`;
            return;
        }

        const data = await response.json();
        resultBox.style.display = 'block';

        // SYTUACJA A: Znaleziono wielu pasujących użytkowników
        if (data.type === "list") {
            let listHtml = `<p style="margin: 0 0 10px 0; font-weight: bold; color: #ff9f43;">💡 Znaleziono kilku użytkowników. Kliknij właściwy login:</p><ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 5px;">`;
            
            data.users.forEach(u => {
                listHtml += `
                    <li style="background: #22254b; padding: 8px 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                        <span><strong>${u.username}</strong> (${u.role.toUpperCase()})</span>
                        <button class="tab-btn" style="padding: 4px 10px; font-size: 0.85em; background: #e94560; border: none; border-radius: 3px; color: white; cursor: pointer;" onclick="document.getElementById('search-username-input').value='${u.username}'; document.getElementById('btn-search-user').click();">Wybierz</button>
                    </li>
                `;
            });
            listHtml += `</ul>`;
            resultBox.innerHTML = listHtml;
            return;
        }

        // SYTUACJA B: Mamy jednego, konkretnego użytkownika (Wyświetlamy stary panel zarządzania)
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
// NOWE FUNKCJE: USUWANIE I EDYCJA FILMÓW PRZEZ UŻYTKOWNIKA
// =================================================================

// 1. Funkcja usuwająca film całkowicie z bazy
window.deleteMovieFromLibrary = async function(movieId) {
    if (!confirm("Czy na pewno chcesz całkowicie usunąć ten film i recenzję ze swojej biblioteki?")) return;

    try {
        const response = await fetch(`http://localhost:3000/api/movies/${movieId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        alert(data.message);

        // Odświeżamy dane z serwera i przerysowujemy listy
        loadMoviesFromServer();
    } catch (error) {
        console.error("Błąd podczas usuwania filmu:", error);
        alert("Nie udało się usunąć filmu.");
    }
};

// 2. Funkcja edytująca treść recenzji i ocenę
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

// Pokazywanie pola sezonu, jeśli wybrano Serial
window.toggleTvShowFields = function() {
    const type = document.getElementById('movie-type').value;
    const tvFields = document.getElementById('tvshow-fields');
    if (tvFields) {
        tvFields.style.display = type === 'tvshow' ? 'block' : 'none';
    }
};

// Logika filtrowania typu na społeczności
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

document.getElementById('send-query')?.addEventListener('click', () => {
    const input = document.getElementById('user-query');
    const chatWindow = document.getElementById('chat-window');

    if (input.value.trim() !== "") {
        const userMsg = document.createElement('p');
        userMsg.style.textAlign = "right";
        userMsg.innerHTML = `<span style="background: #e94560; padding: 8px; border-radius: 10px 10px 0 10px; display: inline-block;">${input.value}</span>`;
        chatWindow.appendChild(userMsg);

        setTimeout(() => {
            const botMsg = document.createElement('p');
            botMsg.className = "bot-msg";
            botMsg.innerText = "Analizuję Twoje preferencje... Funkcja AI zostanie w pełni aktywowana w Sprincie 6!";
            chatWindow.appendChild(botMsg);
            chatWindow.scrollTop = chatWindow.scrollHeight;
        }, 1000);

        input.value = "";
    }
});