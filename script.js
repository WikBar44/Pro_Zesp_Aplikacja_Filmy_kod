function toggleReviewFields() {
    const status = document.getElementById('movie-status').value;
    const reviewFields = document.getElementById('review-fields');
    
    if (status === 'watched') {
        reviewFields.style.display = 'block';
    } else {
        reviewFields.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    // Mechanizm przełączania zakładek
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-target');
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // Obsługa formularza 
    const form = document.getElementById('movie-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const movieData = {
                title: document.getElementById('movie-title').value,
                status: document.getElementById('movie-status').value,
                rating: document.getElementById('movie-rating').value,
                review: document.getElementById('movie-review').value,
                visibility: document.getElementById('movie-visibility').value
            };

            console.log("Dane zebrane do Sprintu 3:", movieData);
            console.log("Dane z widocznością:", movieData);
            alert(`Film "${movieData.title}" został przygotowany do zapisu!`);
            
            this.reset();
            toggleReviewFields();
        });
    }
    document.getElementById('send-query')?.addEventListener('click', () => {
        const input = document.getElementById('user-query');
        const chatWindow = document.getElementById('chat-window');

        if (input.value.trim() !== "") {
            const userMsg = document.createElement('p');
            userMsg.style.textAlign = "right";
            userMsg.innerHTML = `<span style="background: #e94560; padding: 8px; border-radius: 10px 10px 0 10px; display: inline-block;">${input.value}</span>`;
            chatWindow.appendChild(userMsg);

            // Symulacja odpowiedzi AI (Sprint 6)
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