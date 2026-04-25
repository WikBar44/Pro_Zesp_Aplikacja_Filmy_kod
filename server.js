const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'movies.json');

// Middleware
app.use(cors());
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

// Start serwera
app.listen(PORT, () => {
    console.log(`Serwer CineKeep działa na: http://localhost:${PORT}`);
});