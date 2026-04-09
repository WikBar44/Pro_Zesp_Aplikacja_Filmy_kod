// 1. INICJALIZACJA BAZY DANYCH
let movies = JSON.parse(localStorage.getItem('cinekeep_db')) || [];

function toggleReviewFields() {
    const status = document.getElementById('movie-status').value;
    const reviewFields = document.getElementById('review-fields');
    if (reviewFields) {
        reviewFields.style.display = status === 'watched' ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 2. START APLIKACJI
    renderMovies();

    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('login-user').value;
            
            alert(`Witaj ${user}! Zostałeś pomyślnie zalogowany.`);
            document.querySelector('[data-target="login-section"]').innerText = `👤 ${user}`;
            document.querySelector('[data-target="home"]').click();
        });
    }

    // 3. MECHANIZM PRZEŁĄCZANIA ZAKŁADEK
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-target');
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // 4. OBSŁUGA FORMULARZA DODAWANIA FILMU
    const form = document.getElementById('movie-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const movieData = {
                id: Date.now(),
                title: document.getElementById('movie-title').value,
                status: document.getElementById('movie-status').value,
                rating: document.getElementById('movie-rating').value || null,
                review: document.getElementById('movie-review').value || "",
                visibility: document.getElementById('movie-visibility').value
            };

            movies.push(movieData); 
            saveAndRefresh();       
            
            alert(`Film "${movieData.title}" został zapisany!`);
            this.reset();
            toggleReviewFields();
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

// 6. RENDEROWANIE LIST (Logika wyświetlania filmów w zakładkach)
function renderMovies() {
    const pendingList = document.getElementById('pending-list');
    const watchedList = document.getElementById('watched-list');

    if (!pendingList || !watchedList) return;

    pendingList.innerHTML = '';
    watchedList.innerHTML = '';

    movies.forEach((movie, index) => {
        const li = document.createElement('li');
        li.className = `movie-item ${movie.status === 'watched' ? 'watched' : ''}`;

        if (movie.status === 'pending') {
            li.innerHTML = `
                <span>${movie.title}</span>
                <button class="action-btn" onclick="markAsWatched(${index})">Obejrzane</button>
            `;
            pendingList.appendChild(li);
        } else {
            const visibilityIcon = movie.visibility === 'public' ? '🌍' : '🔒';
            const visibilityText = movie.visibility === 'public' ? 'Publiczna' : 'Prywatna';

            li.innerHTML = `
                <div>
                    <strong>${movie.title}</strong>
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

// 9. POMOCNICZA FUNKCJA ZAPISU I ODŚWIEŻANIA
function saveAndRefresh() {
    localStorage.setItem('cinekeep_db', JSON.stringify(movies));
    renderMovies();
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