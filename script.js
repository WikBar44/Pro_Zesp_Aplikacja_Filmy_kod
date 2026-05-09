// 1. INICJALIZACJA BAZY DANYCH
let currentUser = "null";
let movies = JSON.parse(localStorage.getItem('cinekeep_db')) || [];

function toggleReviewFields() {
    const status = document.getElementById('movie-status').value;
    const reviewFields = document.getElementById('review-fields');
    if (reviewFields) {
        reviewFields.style.display = status === 'watched' ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('cinekeep_logged_user');
    if (savedUser) {
        currentUser = savedUser;
        updateUI();
    }
    loadMoviesFromServer();

    // 2. START APLIKACJI
    renderMovies();

    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
 
// --- FUNKCJA AKTUALIZACJI INTERFEJSU ---
function updateUI() {
    const loginTabBtn = document.querySelector('[data-target="login-section"]');
    const logoutBtn = document.getElementById('logout-btn');

    if (currentUser) {
        // Zmiana tekstu przycisku logowania na nazwę użytkownika
        loginTabBtn.innerHTML = `👤 ${currentUser}`;
        loginTabBtn.classList.add('user-logged');
        // Pokaż przycisk wyloguj
        if (logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
        // Przywrócenie pierwotnego stanu
        loginTabBtn.innerHTML = `🔑 Logowanie`;
        loginTabBtn.classList.remove('user-logged');
        // Ukryj przycisk wyloguj
        if (logoutBtn) logoutBtn.style.display = "none";
    }
}

// --- OBSŁUGA WYLOGOWANIA ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('cinekeep_logged_user');
        alert("Wylogowano pomyślnie.");
        updateUI();
        showSection('login-section');
        renderMovies();
    });
}

// --- TWOJA POPRAWIONA SEKCJA LOGOWANIA I REJESTRACJI ---
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
                currentUser = data.username;
                localStorage.setItem('cinekeep_logged_user', currentUser);

                loginForm.reset();
                updateUI();
                alert("Witaj z powrotem, " + currentUser + "!");
                showSection('home');
                loadMoviesFromServer();
            } else {
                alert("Błąd logowania: " + data.message);
            }
        } catch (error) {
            console.error("Błąd fetch logowania:", error);
            alert("Błąd połączenia przy logowaniu.");
        }
    });

    const registerLink = loginForm.querySelector('a');
    if (registerLink) {
        registerLink.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const username = document.getElementById('login-user').value;
            const password = document.getElementById('login-pass').value;
            const passwordError = isPasswordStrong(password);

            if (passwordError) {
                alert(passwordError);
                return; // Przerywamy rejestrację
            }

            if (!username || !password) {
                alert("Wpisz dane do rejestracji!");
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
                    alert("Konto założone! Teraz kliknij 'Zaloguj się'.");
                } else {
                    alert("Błąd rejestracji: " + data.message);
                }
            } catch (error) {
                console.error("Błąd fetch rejestracji:", error);
                alert("Serwer nie odpowiada przy rejestracji.");
            }
        });
    }
}

// --- NA START STRONY: Sprawdź czy użytkownik był już zalogowany ---
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('cinekeep_user');
    if (savedUser) {
        currentUser = savedUser;
        updateUI();
    }
});

    // Obsługa wylogowania
    document.getElementById('logout-btn').addEventListener('click', () => {
        currentUser = null;
        sessionStorage.removeItem('user'); // Opcjonalnie, jeśli chcesz czyścić sesję
        updateUI();
        showSection('login-section');
        loadMoviesFromServer(); // Odświeżamy listę, by pokazać pusty stan/logowanie
    });

// Funkcja pomocnicza do sprawdzania siły hasła
function isPasswordStrong(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    if (password.length < minLength) return "Hasło musi mieć min. 8 znaków.";
    if (!hasUpperCase) return "Hasło musi mieć min. jedną dużą literę.";
    if (!hasNumber) return "Hasło musi mieć min. jedną cyfrę.";
    if (!hasSpecialChar) return "Hasło musi mieć min. jeden znak specjalny.";
    
    return null; // Hasło jest poprawne
}

    // 3. MECHANIZM PRZEŁĄCZANIA ZAKŁADEK
    function showSection(target) {
        // Usuń klasę active ze wszystkich przycisków i sekcji
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        // Dodaj klasę active do wybranej sekcji
        const targetSection = document.getElementById(target);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Dodaj klasę active do przycisku w menu, który odpowiada tej sekcji
        const activeTab = document.querySelector(`[data-target="${target}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    // Obsługa kliknięć w menu (używa funkcji powyżej)
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-target');
            showSection(target);
        });
    })

    // 4. OBSŁUGA FORMULARZA DODAWANIA FILMU
    const form = document.getElementById('movie-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const selectedTags = Array.from(document.querySelectorAll('input[name="tags"]:checked'))
                          .map(cb => cb.value);
            const movieData = {
                id: Date.now(),
                title: document.getElementById('movie-title').value,
                status: document.getElementById('movie-status').value,
                rating: document.getElementById('movie-rating').value || null,
                review: document.getElementById('movie-review').value || "",
                visibility: document.getElementById('movie-visibility').value,
                tags: selectedTags,
                owner: currentUser
            };

            try {
                // WYSYŁKA DO SERWERA (Node.js)
                const response = await fetch('http://localhost:3000/api/movies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });

                if (response.ok) {
                    alert(`Film "${movieData.title}" został zapisany na serwerze!`);
                    this.reset();
                    toggleReviewFields();
                    loadMoviesFromServer();
                } else {
                    throw new Error('Błąd serwera przy zapisie');
                }
            } catch (error) {
                console.error("Błąd dodawania:", error);
                alert("Nie udało się zapisać filmu. Czy serwer Node.js jest włączony?");
            }
        });
    }

    // 5. OBSŁUGA ASYSTENTA AI (CZATBOTA)
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
});
// Filtrowanie tagów
let currentFilter = 'all';
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

// 6. RENDEROWANIE LIST 
function renderMovies() {
    const pendingList = document.getElementById('pending-list');
    const watchedList = document.getElementById('watched-list');
    const communityList = document.getElementById('community-reviews');

    if (!pendingList || !watchedList || !communityList) return;

    pendingList.innerHTML = '';
    watchedList.innerHTML = '';
    communityList.innerHTML = '';

    // 1. LOGIKA FILTROWANIA (Tagi)
    let filteredMovies = movies;
    if (currentFilter !== 'all') {
        filteredMovies = movies.filter(movie => 
            movie.tags && movie.tags.includes(currentFilter)
        );
    }

    filteredMovies.forEach((movie, index) => {
        // Sprawdzamy, czy aktualnie zalogowany użytkownik jest właścicielem filmu
        const isOwner = movie.owner === currentUser;

        const li = document.createElement('li');
        li.className = `movie-item ${movie.status === 'watched' ? 'watched' : ''}`;

        const tagsHtml = movie.tags && movie.tags.length > 0 
            ? `<div class="movie-tags-display">
                ${movie.tags.map(t => `<span class="mini-tag">${t}</span>`).join('')}
               </div>` 
            : '';

        // 2. LOGIKA DLA TWOICH LIST PERSONALNYCH (Tylko Twoje filmy)
        if (isOwner) {
            if (movie.status === 'pending') {
                li.innerHTML = `
                    <div>
                        <span>${movie.title}</span>
                        ${tagsHtml}
                    </div>
                    <button class="action-btn" onclick="markAsWatched(${index})">Obejrzane</button>
                `;
                pendingList.appendChild(li);
            } else if (movie.status === 'watched') {
                const visibilityIcon = movie.visibility === 'public' ? '🌍' : '🔒';
                const visibilityText = movie.visibility === 'public' ? 'Publiczna' : 'Prywatna';

                li.innerHTML = `
                    <div>
                        <strong>${movie.title}</strong>
                        ${tagsHtml}
                        <div class="user-rating">⭐ ${movie.rating || '?'}/10</div>
                        <p style="font-size: 0.8em; opacity: 0.8; margin: 5px 0;">${movie.review}</p>
                    </div>
                    <div class="movie-actions">
                        <button class="visibility-btn" onclick="toggleVisibility(${index})" title="Zmień widoczność">
                            ${visibilityIcon} <span style="font-size: 0.7em;">${visibilityText}</span>
                        </button>
                    </div>
                `;
                watchedList.appendChild(li);
            }
        }

        // 3. LOGIKA DLA ZAKŁADKI SPOŁECZNOŚĆ (Publiczne filmy wszystkich użytkowników)
        if (movie.status === 'watched' && movie.visibility === 'public') {
            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';
            reviewCard.innerHTML = `
                <h4>${movie.title}</h4>
                <div class="rating">Ocena: ⭐ ${movie.rating}/10</div>
                <p>"${movie.review}"</p>
                <div style="margin-bottom: 10px;">${tagsHtml}</div>
                <small>Dodano przez: ${movie.owner || 'Anonimowy użytkownik'}</small>
            `;
            communityList.appendChild(reviewCard);
        }
    });
}

// 7. PRZENOSZENIE FILMU (Z Kolejki do Historii)
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

// 8. PRZEŁĄCZANIE WIDOCZNOŚCI (Publiczna / Prywatna)
window.toggleVisibility = function(index) {
    movies[index].visibility = (movies[index].visibility === 'public') ? 'private' : 'public';
    saveAndRefresh();
};

// 9. POMOCNICZA FUNKCJA ZAPISU NA SERWER I ODŚWIEŻANIA
async function saveAndRefresh() {
    try {
        const response = await fetch('http://localhost:3000/api/movies/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(movies) // Serwer otrzyma pełną listę
        });

        if (!response.ok) throw new Error('Błąd podczas zapisu na serwerze');

        console.log("Dane pomyślnie zsynchronizowane z serwerem.");
        renderMovies();
    } catch (error) {
        console.error("Błąd:", error);
        alert("Nie udało się zapisać danych na serwerze!");
    }
}

// 10. FUNKCJA: Sortowanie bazy filmów
window.sortMovies = function(criteria) {
    if (criteria === 'alpha') {
        movies.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
    } 
    else if (criteria === 'rating-high') {
        movies.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } 
    else if (criteria === 'rating-low') {
        // Od najniższej oceny
        movies.sort((a, b) => {
            if (!a.rating) return 1;
            if (!b.rating) return -1;
            return a.rating - b.rating;
        });
    }
    else if (criteria === 'date-new') {
        movies.sort((a, b) => b.id - a.id);
    }
    else if (criteria === 'date-old') {
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
window.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('cinekeep_logged_user');
    
    if (savedUser) {
        currentUser = savedUser;
        updateUI();
        showSection('home');
        loadMoviesFromServer();
        console.log("Automatycznie zalogowano jako:", currentUser);
    }
});