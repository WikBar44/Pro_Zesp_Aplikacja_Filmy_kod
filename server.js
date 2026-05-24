const express = require('express');
const cors = require('cors'); 
const app = express();
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'movies.json');
const REPORTS_FILE = path.join(__dirname, 'reports.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// FUNKCJA POMOCNICZA: Odczyt danych z pliku
const readMovies = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        if (!data || data.trim() === "") return [];
        return JSON.parse(data);
    } catch (error) {
        console.error("Błąd odczytu pliku JSON:", error);
        return [];
    }
};

// FUNKCJA pomocnicza do odczytu zgłoszeń
const readReports = () => {
    if (!fs.existsSync(REPORTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8') || "[]");
};

// FUNKCJA POMOCNICZA: Zapis danych do pliku
const writeMovies = (movies) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(movies, null, 2));
};

// ENDPOINT: Pobieranie wszystkich filmów (GET)
app.get('/api/movies', (req, res) => {
    const movies = readMovies();
    res.json(movies);
});

// ENDPOINT: Dodawanie nowego filmu (POST) - Zaktualizowany z obsługą typów
app.post('/api/movies', (req, res) => {
    const movies = readMovies();
    const users = readUsers();
    const movieData = req.body;

    const userRecord = users.find(u => u.username === movieData.owner);

    // ZABEZPIECZENIE (Sprawa 6): Jeśli użytkownik ma status muted/suspended, wymuszamy visibility "private"
    if (userRecord && (userRecord.status === 'muted' || userRecord.status === 'suspended')) {
        movieData.visibility = "private";
    }

    // NOWOŚĆ: Upewniamy się, że pola typu i sezonu są prawidłowo sformatowane przed zapisem
    movieData.type = movieData.type || "movie"; // Jeśli brak typu, ustaw jako film
    if (movieData.type === 'movie') {
        movieData.season = ""; // Filmy nie mają sezonów
    } else if (movieData.type === 'tvshow' && !movieData.season) {
        movieData.season = "Sezon 1"; // Domyślny sezon dla serialu, jeśli użytkownik nic nie wpisał
    }

    movies.push(movieData);
    writeMovies(movies);
    res.status(201).json({ message: 'Film dodany!', movie: movieData });
});

// ENDPOINT: Aktualizacja całej listy
app.post('/api/movies/update', (req, res) => {
    const updatedMovies = req.body;
    writeMovies(updatedMovies);    
    res.json({ message: 'Baza zaktualizowana!' });
});
const USERS_FILE = path.join(__dirname, 'users.json');

const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
};

// 1. ENDPOINT: Usuwanie konkretnego filmu z biblioteki
app.delete('/api/movies/:id', (req, res) => {
    const movieId = req.params.id; // Zdejmujemy parseInt
    let movies = readMovies();

    const initialLength = movies.length;
    // Filtrujemy za pomocą "==", eliminując problem typu string/number
    movies = movies.filter(m => m.id != movieId);

    if (movies.length === initialLength) {
        return res.status(404).json({ message: "Nie znaleziono filmu o podanym ID." });
    }

    writeMovies(movies);
    res.json({ message: "Film został pomyślnie usunięty z Twojej biblioteki." });
});

// 2. ENDPOINT: Edycja samej oceny i treści recenzji filmu
app.put('/api/movies/:id', (req, res) => {
    const movieId = req.params.id; // Zdejmujemy parseInt, porównamy luźno za pomocą ==
    const { rating, review } = req.body;
    let movies = readMovies();

    let found = false;
    movies = movies.map(m => {
        // Używamy "==", aby dopasować liczbę do tekstu w razie niespójności typów
        if (m.id == movieId) {
            found = true;
            return { 
                ...m, 
                rating: parseInt(rating) || m.rating, // Zabezpieczenie wartości oceny
                review: review 
            };
        }
        return m;
    });

    if (!found) {
        return res.status(404).json({ message: "Nie znaleziono filmu do edycji." });
    }

    writeMovies(movies);
    res.json({ message: "Recenzja została pomyślnie zaktualizowana!" });
});

// Rejestracja
app.post('/api/register', (req, res) => {
    const users = readUsers();
    const { username, password } = req.body;

    // Walidacja unikalności loginu
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ message: "Ta nazwa użytkownika jest już zajęta!" });
    }

    // Walidacja hasła (Regex)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: "Hasło nie spełnia wymogów bezpieczeństwa." });
    }

    // Tworzenie rozbudowanego obiektu użytkownika
    const newUser = {
        username,
        password,
        role: "user",
        status: "active",
        warnings: 0,
        mutedUntil: null
    };

    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.status(201).json({ message: "Zarejestrowano pomyślnie" });
});

// Logowanie
app.post('/api/login', (req, res) => {
    const users = readUsers();
    const { username, password } = req.body;

    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ message: "Błędne dane logowania" });
    }

    // Jeśli użytkownik ma bana od Admina
    if (user.status === 'banned') {
        return res.status(403).json({ message: "Twoje konto zostało permanentnie zablokowane przez Administratora." });
    }

    // Zwracamy pełne informacje potrzebne dla frontendu
    res.json({ 
        message: "Zalogowano", 
        username: user.username, 
        role: user.role,
        status: user.status,
        mutedUntil: user.mutedUntil
    });
});

// =================================================================
// SYSTEM ADMINISTRACJI I MODERACJI (CineKeep)
// =================================================================
const LOGS_FILE = path.join(__dirname, 'logs.json');

const writeLog = (actionText) => {
    try {
        let logs = [];
        if (fs.existsSync(LOGS_FILE)) {
            const data = fs.readFileSync(LOGS_FILE, 'utf8');
            if (data && data.trim() !== "") {
                logs = JSON.parse(data);
            }
        }
        // Dodajemy nowy wpis na początek listy
        logs.unshift({
            id: Date.now(),
            date: new Date().toLocaleString('pl-PL'),
            text: actionText
        });
        fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error("Błąd zapisu logów administracyjnych:", error);
    }
};

// 1. ZWYKŁY UŻYTKOWNIK: Zgłaszanie recenzji/komentarza
app.post('/api/reports/add', (req, res) => {
    const { commentId, reportedUser, reason, reportedBy } = req.body;
    const reports = readReports();

    const newReport = {
        id: Date.now(),
        type: "comment_report",
        commentId,
        reportedUser,
        reason,
        reportedBy,
        status: "pending"
    };

    reports.push(newReport);
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
    res.status(201).json({ message: "Zgłoszenie zostało wysłane do moderacji." });
});

// 2. MODERATOR: Pobranie otwartych zgłoszeń
app.get('/api/moderator/reports', (req, res) => {
    const reports = readReports();
    const pendingReports = reports.filter(r => r.status === "pending" && r.type === "comment_report");
    res.json(pendingReports);
});

// 3. MODERATOR: Akcja na zgłoszeniu
app.post('/api/moderator/execute', (req, res) => {
    const { reportId, action, targetUser, commentId, executerUser } = req.body;
    let reports = readReports();
    let users = readUsers();
    let movies = readMovies();

    const account = users.find(u => u.username === targetUser);
    const executer = users.find(u => u.username === executerUser);
    
    // Obsługa nałożenia kary (Ostrzeżenia)
    if (action === 'warn' && account) {
        if (account.role === 'admin' || (account.role === 'moderator' && executer?.role !== 'admin')) {
            return res.status(403).json({ message: "Błąd: Nie masz uprawnień do ukarania tego członka administracji!" });
        }

        // UKRYWANIE POSTÓW
        movies = movies.map(m => m.owner === targetUser ? { ...m, visibility: "private" } : m);
        writeMovies(movies);

        // NALICZANIE KAR:
        users = users.map(u => {
            if (u.username === targetUser) {
                const newWarnings = (u.warnings || 0) + 1;
                let newStatus = "active";
                let muteTime = null;

                if (newWarnings >= 3) {
                    newStatus = "suspended";
                } else {
                    newStatus = "muted";
                    const date = new Date();
                    date.setDate(date.getDate() + 3);
                    muteTime = date.toISOString();
                }

                return { ...u, warnings: newWarnings, status: newStatus, mutedUntil: muteTime };
            }
            return u;
        });
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    }

    // Zamykanie i oznaczanie zgłoszenia jako załatwione
    if (reportId && reportId !== 0) {
        reports = reports.map(r => r.id === parseInt(reportId) ? { ...r, status: "resolved" } : r);
        fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
    }

    // DYNAMICZNE GENEROWANIE LOGÓW
    let logMessage = "";
    
    if (action === 'warn') {
        logMessage = `Moderator [${executerUser || 'System'}] nałożył ostrzeżenie na konto [${targetUser}]. Zgłoszenie ID: ${reportId || 'Brak (Szybka akcja)'}, Film ID: ${commentId || 'Brak'}`;
    } 
    else if (reportId && reportId !== 0) {
        const currentReport = reports.find(r => r.id === parseInt(reportId));
        const ukarany = currentReport ? (currentReport.reportedUser || currentReport.username || 'Nieznany') : 'Nieznany';
        
        logMessage = `Moderator [${executerUser || 'System'}] rozpatrzył/odrzucił zgłoszenie ID: ${reportId} dotyczące użytkownika [${ukarany}]`;
    } 
    else {
        logMessage = `Użytkownik [${executerUser || 'System'}] wywołał akcję moderatorską [${action}]`;
    }

    writeLog(logMessage);

    res.json({ message: "Akcja wykonana pomyślnie. Zmiany zapisano w bazie." });
});

// 4. UŻYTKOWNIK: Odwołanie od kary
app.post('/api/reports/appeal', (req, res) => {
    const { username, reason } = req.body;
    const reports = readReports();

    const newAppeal = {
        id: Date.now(),
        type: "appeal",
        reportedUser: username,
        reason: reason,
        status: "pending"
    };

    reports.push(newAppeal);
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
    res.json({ message: "Odwołanie zostało wysłane do Administratora." });
});

// 5. ADMIN: Pobranie wszystkich spraw (Zawieszenia, Odwołania i Podania)
app.get('/api/admin/dashboard', (req, res) => {
    const users = readUsers();
    const reports = readReports();

    const suspendedUsers = users.filter(u => u.status === 'suspended');
    
    // NAPRAWA: Filtrujemy zgłoszenia, które mają status pending ORAZ są odwołaniem LUB podaniem na moda
    const appeals = reports.filter(r => 
        (r.type === 'appeal' || r.type === 'mod_application') && r.status === 'pending'
    );

    res.json({ suspendedUsers, appeals });
});

// 6. ADMIN: Ostateczna decyzja (Ban lub Przywrócenie konta)
// Zastąp endpoint app.post('/api/admin/decision', ...) w server.js:
app.post('/api/admin/decision', (req, res) => {
    const { targetUser, decision, reportId } = req.body;
    let users = readUsers();
    let reports = readReports();

    // Szukamy oryginalnej sprawy, żeby wiedzieć czy to było podanie czy odwołanie
    const currentReport = reports.find(r => r.id === reportId);

    if (reportId) {
        reports = reports.map(r => r.id === reportId ? { ...r, status: "resolved" } : r);
        fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
    }

    users = users.map(u => {
        if (u.username === targetUser) {
            let userNotifications = u.notifications || [];
            
            if (decision === 'ban') {
                return { ...u, status: 'banned' };
            } else if (decision === 'promote_mod') {
                userNotifications.push(`🎉 Zostałeś awansowany na Moderatora przez Administratora!`);
                return { ...u, role: 'moderator', notifications: userNotifications };
            } else if (decision === 'demote_user') {
                // NOWOŚĆ: Degradacja moderatora do zwykłego użytkownika
                userNotifications.push(`⚠️ Twoje uprawnienia moderatorskie zostały cofnięte przez Administratora.`);
                return { ...u, role: 'user', notifications: userNotifications };
            } else if (decision === 'unban') {
                userNotifications.push(`💚 Twoje ograniczenia zostały zdjęte przez Administratora.`);
                return { ...u, status: 'active', warnings: 0, mutedUntil: null, notifications: userNotifications };
            } else if (decision === 'dismiss') {
                // POWIADOMIENIE O ODRZUCENIU (Sprawa 3)
            if (currentReport && currentReport.type === 'mod_application') {
                userNotifications.push(`❌ Twoje podanie o zostanie Moderatorem zostało odrzucone przez Administratora.`);
            } else if (currentReport && currentReport.type === 'appeal') {
                userNotifications.push(`❌ Twoje odwołanie od kary zostało odrzucone przez Administratora.`);
            }
                return { ...u, notifications: userNotifications };
            }
        }
        return u;
    });

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ message: "Decyzja została zapisana, a użytkownik powiadomiony." });
});

// DODATKOWY ENDPOINT DO CZYSZCZENIA POWIADOMIEŃ
app.post('/api/users/clear-notifications', (req, res) => {
    const { username } = req.body;
    let users = readUsers();
    users = users.map(u => u.username === username ? { ...u, notifications: [] } : u);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.json({ message: "Wyczyszczono" });
});

// ENDPOINT: Pobieranie logów audytowych dla Administratora
app.get('/api/admin/logs', (req, res) => {
    if (!fs.existsSync(LOGS_FILE)) return res.json([]);
    try {
        const data = fs.readFileSync(LOGS_FILE, 'utf8');
        res.json(JSON.parse(data || "[]"));
    } catch (e) {
        res.status(500).json({ message: "Błąd ładowania logów" });
    }
});

// ENDPOINT: Wyszukiwanie częściowe (Zaktualizowane w server.js)
app.get('/api/admin/search-user/:username', (req, res) => {
    const users = readUsers();
    const movies = readMovies();
    
    const query = req.params.username.toLowerCase();
    
    // Szukamy WSZYSTKICH użytkowników, którzy zawierają wpisaną frazę
    const matchedUsers = users.filter(u => u.username.toLowerCase().includes(query));
    
    if (matchedUsers.length === 0) {
        return res.status(404).json({ message: "Nie znaleziono użytkowników pasujących do wpisanej frazy." });
    }
    
    // Jeśli znaleziono dokładnie jednego użytkownika, zwracamy jego pełne dane (jak wcześniej)
    if (matchedUsers.length === 1) {
        const user = matchedUsers[0];
        const userMoviesCount = movies.filter(m => m.owner === user.username).length;
        
        return res.json({
            type: "single",
            user: {
                username: user.username,
                role: user.role,
                status: user.status,
                warnings: user.warnings,
                mutedUntil: user.mutedUntil,
                moviesCount: userMoviesCount
            }
        });
    }
    
    // Jeśli znaleziono wielu użytkowników, zwracamy ich listę (tylko loginy i rangi)
    const list = matchedUsers.map(u => ({ username: u.username, role: u.role }));
    res.json({
        type: "list",
        users: list
    });
});

// 7. PODANIE NA MODERATORA: Wysłanie prośby (Poprawione w server.js)
app.post('/api/moderator/apply', (req, res) => {
    const { username, reportedUser, text } = req.body;
    const reports = readReports();

    reports.push({
        id: Date.now(),
        type: "mod_application",
        reportedUser: reportedUser || username, // Przyjmie każdą formę przesłaną z frontu
        reason: text,
        status: "pending"
    });

    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2));
    res.json({ message: "Podanie zostało wysłane. Admin je rozpatrzy." });
});

app.get('/api/users/me/:username', (req, res) => {
    const users = readUsers();
    const reports = readReports();
    const user = users.find(u => u.username === req.params.username);
    
    if (!user) return res.status(404).json({ message: "Brak sesji" });

    // Sprawdzamy czy użytkownik ma już wysłane i oczekujące odwołanie
    const hasPendingAppeal = reports.some(r => r.reportedUser === user.username && r.type === 'appeal' && r.status === 'pending');

    res.json({ 
        username: user.username, 
        role: user.role, 
        status: user.status, 
        warnings: user.warnings, 
        mutedUntil: user.mutedUntil,
        hasPendingAppeal: hasPendingAppeal,
        notifications: user.notifications || [] // Zwracamy tablicę powiadomień
    });
});

// Start serwera
app.listen(PORT, () => {
    console.log(`Serwer CineKeep działa na: http://localhost:${PORT}`);
});