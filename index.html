<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CineKeep - Twoja Lista Filmów</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <div class="container">
        <header>
            <h1>🎬 CineKeep</h1>
            <nav class="tabs">
                <button class="tab-btn" data-target="login-section">🔑 Logowanie</button>
                <button class="tab-btn active" data-target="home">🏠 Główna</button>
                <button class="tab-btn" data-target="watchlist">🍿 Kolejka</button>
                <button class="tab-btn" data-target="history">✅ Historia</button>
                <button class="tab-btn" data-target="community">👥 Społeczność</button>
                <button class="tab-btn" data-target="add">➕ Dodaj</button>
                <button class="tab-btn" data-target="recommendations">🤖 Rekomendacje AI</button>
            </nav>
        </header>

        <main id="content">
            <section id="home" class="tab-content active">
                <div class="section-header">
                    <h2>🔥 Proponowane dla Ciebie</h2>
                    <p>Najciekawsze premiery i trendy</p>
                </div>
                <div class="movie-grid">
                    <div class="movie-card">
                        <div class="poster">🎬</div>
                        <h4>Batman</h4>
                        <span class="tag">Akcja</span>
                    </div>
                    <div class="movie-card">
                        <div class="poster">🎬</div>
                        <h4>Diuna 2</h4>
                        <span class="tag">Sci-Fi</span>
                    </div>
                    <div class="movie-card">
                        <div class="poster">🎬</div>
                        <h4>Incepcja</h4>
                        <span class="tag">Thriller</span>
                    </div>
                </div>
            </section>

            <section id="watchlist" class="tab-content">
                <h2>🍿 Twoja Kolejka</h2>
                <div class="sort-container">
                    <label>Sortuj listę:</label>
                    <select class="sort-select" onchange="sortMovies(this.value)">
                        <option value="date-new">Najnowsze</option>
                        <option value="date-old">Najstarsze</option>
                        <option value="alpha">Alfabetycznie (A-Z)</option>
                    </select>
                </div>
                <ul class="movie-list" id="pending-list"></ul>
            </section>
            <section id="history" class="tab-content">
                <h2>✅ Twoja Historia</h2>
                <div class="sort-container">
                    <label>Sortuj historię:</label>
                    <select class="sort-select" onchange="sortMovies(this.value)">
                        <option value="date-new">Najnowsze</option>
                        <option value="date-old">Najstarsze</option>
                        <option value="alpha">Alfabetycznie (A-Z)</option>
                        <option value="rating-high">Ocena (od najwyższej)</option>
                        <option value="rating-low">Ocena (od najniższej)</option>
                    </select>
                </div>
                <ul class="movie-list" id="watched-list"></ul>
            </section>

            <section id="community" class="tab-content">
                <h2>💬 Recenzje Społeczności</h2>
                <p style="font-size: 0.9em; opacity: 0.7; margin-bottom: 20px;">Oto co ostatnio oglądali inni użytkownicy CineKeep:</p>
                <div id="community-reviews" class="reviews-grid">
                    </div>
            </section>

            <section id="add" class="tab-content">
                <h2>Dodaj nowy film</h2>
                <div class="form-box">
                    <form id="movie-form">
                        <label>Tytuł filmu</label>
                        <input type="text" id="movie-title" placeholder="np. Diuna" required>
                        
                        <label>Status</label>
                        <select id="movie-status" onchange="toggleReviewFields()">
                            <option value="pending">🍿 Do obejrzenia</option>
                            <option value="watched">✅ Już obejrzane</option>
                        </select>

                        <div id="review-fields" style="display: none; border-top: 1px solid #533483; margin-top: 15px; padding-top: 15px;">
                            <label>Twoja Ocena (1-10)</label>
                            <input type="number" id="movie-rating" min="1" max="10" placeholder="np. 9">
                            
                            <label>Twoja Recenzja</label>
                            <textarea id="movie-review" rows="3" placeholder="Co sądzisz o tym filmie?"></textarea>

                            <label>Widoczność recenzji:</label>
                            <select id="movie-visibility">
                                <option value="private">🔒 Prywatna (tylko dla mnie)</option>
                                <option value="public">🌍 Publiczna (dla wszystkich)</option>
                            </select>
                        </div>
                        
                        <button type="submit" class="submit-btn">Zapisz w mojej bazie</button>
                    </form>
                </div>
            </section>
            <section id="recommendations" class="tab-content">
                <h2>🤖 Inteligentne Rekomendacje</h2>
                
                <div class="filter-box">
                    <h4>Twoje Preferencje</h4>
                    <div class="filter-tags">
                        <label><input type="checkbox" value="Western"> Western</label>
                        <label><input type="checkbox" value="Sci-Fi"> Sci-Fi</label>
                        <label><input type="checkbox" value="Dramat"> Dramat</label>
                        <label><input type="checkbox" value="Komedia"> Komedia</label>
                    </div>
                    <button class="action-btn" style="margin-top: 10px;">Filtruj bazę</button>
                </div>

                <div class="ai-assistant">
                    <div class="chat-window" id="chat-window">
                        <p class="bot-msg">Cześć! Jestem Twoim asystentem filmowym. Jakiego filmu szukasz? (np. "Poleć mi western z Clintem Eastwoodem")</p>
                    </div>
                    <div class="chat-input-area">
                        <input type="text" id="user-query" placeholder="Zapytaj AI...">
                        <button id="send-query">Zapytaj</button>
                    </div>
                </div>
            </section>
            <section id="login-section" class="tab-content">
                <h2>Zaloguj się do CineKeep</h2>
                <div class="form-box">
                    <form id="login-form">
                        <label>Nazwa użytkownika</label>
                        <input type="text" id="login-user" placeholder="Twój login" required>
                        
                        <label>Hasło</label>
                        <input type="password" id="login-pass" placeholder="********" required>
                        
                        <button type="submit" class="submit-btn">Zaloguj się</button>
                        <p style="margin-top: 15px; font-size: 0.8em; text-align: center;">
                            Nie masz konta? <a href="#" style="color: #e94560;">Zarejestruj się</a>
                        </p>
                    </form>
                </div>
            </section>
        </main>

        <footer>
            <p>&copy; 2026 CineKeep Team - Projekt Zespołowy</p>
        </footer>
    </div>

    <script src="script.js"></script>
</body>
</html>