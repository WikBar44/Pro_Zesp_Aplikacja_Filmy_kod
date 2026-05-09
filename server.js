const express = require('express');
const cors = require('cors'); 
const app = express();
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'movies.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
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

// FUNKCJA POMOCNICZA: Zapis danych do pliku
const writeMovies = (movies) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(movies, null, 2));
};

// ENDPOINT: Pobieranie wszystkich filmów (GET)
app.get('/api/movies', (req, res) => {
    const movies = readMovies();
    res.json(movies);
});

// ENDPOINT: Dodawanie nowego filmu (POST)
app.post('/api/movies', (req, res) => {
    const movies = readMovies();
    const newMovie = req.body;
    
    movies.push(newMovie);
    writeMovies(movies);
    
    res.status(201).json({ message: 'Film dodany pomyślnie!', movie: newMovie });
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

// Rejestracja
app.post('/api/register', (req, res) => {
    const users = readUsers();
    const { username, password } = req.body;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
            message: "Hasło musi mieć min. 8 znaków, dużą literę, cyfrę i znak specjalny." 
        });
    }

    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: "Ta nazwa użytkownika jest już zajęta!" });
    }

    users.push({ username, password });
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    res.status(201).json({ message: "Zarejestrowano pomyślnie" });
});

// Logowanie
app.post('/api/login', (req, res) => {
    const users = readUsers();
    const { username, password } = req.body;

    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ message: "Zalogowano", username: user.username });
    } else {
        res.status(401).json({ message: "Błędne dane" });
    }
});

// Start serwera
app.listen(PORT, () => {
    console.log(`Serwer CineKeep działa na: http://localhost:${PORT}`);
});