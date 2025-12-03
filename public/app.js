let words = [];
let currentIndex = 0;

// Load words on page load
window.addEventListener('load', async () => {
    await loadWords();
    displayCurrentWord();
});

// Load words from server
async function loadWords() {
    const response = await fetch('/getWords');
    const data = await response.json();
    words = data.words;
}

// Display current word
function displayCurrentWord() {
    const wordDisplay = document.getElementById('wordDisplay');
    
    if (words.length === 0) {
        wordDisplay.innerHTML = '';
        document.getElementById('addCommentBtn').disabled = true;
        document.getElementById('prevBtn').disabled = true;
        document.getElementById('nextBtn').disabled = true;
        return;
    }
    
    document.getElementById('addCommentBtn').disabled = false;
    document.getElementById('prevBtn').disabled = false;
    document.getElementById('nextBtn').disabled = false;
    
    const word = words[currentIndex];
    
    wordDisplay.innerHTML = `
        <div class="word-counter">( ${String(currentIndex + 1).padStart(2, '0')}/${String(words.length).padStart(2, '0')} )</div>
        <div class="main-word">${word.word}</div>
        <div class="language">${word.language}</div>
        <div class="dotted-line"></div>
        <div class="definition">${word.definition}</div>
    `;
    
    displayComments(word.comments);
}

// Display comments
function displayComments(comments) {
    const commentsDiv = document.getElementById('commentsDisplay');
    if (!comments || comments.length === 0) {
        commentsDiv.innerHTML = '';
        return;
    }
    
    commentsDiv.innerHTML = '<h3 style="text-align:center; margin-bottom:20px; font-size:20px;">This reminds of...</h3>';
    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.textContent = comment.text;
        commentsDiv.appendChild(commentDiv);
    });
}

// Navigation
document.getElementById('prevBtn').addEventListener('click', () => {
    if (words.length === 0) return;
    currentIndex = (currentIndex - 1 + words.length) % words.length;
    displayCurrentWord();
});

document.getElementById('nextBtn').addEventListener('click', () => {
    if (words.length === 0) return;
    currentIndex = (currentIndex + 1) % words.length;
    displayCurrentWord();
});

// New Word Modal
const newWordModal = document.getElementById('newWordModal');
document.getElementById('newWordBtn').addEventListener('click', () => {
    newWordModal.style.display = 'block';
});
document.querySelector('.close').addEventListener('click', () => {
    newWordModal.style.display = 'none';
});

// Submit new word
document.getElementById('newWordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const wordData = {
        word: document.getElementById('wordInput').value,
        language: document.getElementById('languageInput').value,
        definition: document.getElementById('definitionInput').value
    };
    
    await fetch('/newWord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wordData)
    });
    
    await loadWords();
    currentIndex = words.length - 1;
    displayCurrentWord();
    newWordModal.style.display = 'none';
    document.getElementById('newWordForm').reset();
});

// Comment Modal
const commentModal = document.getElementById('commentModal');
document.getElementById('addCommentBtn').addEventListener('click', () => {
    if (words.length === 0) return;
    commentModal.style.display = 'block';
});
document.querySelector('.close-comment').addEventListener('click', () => {
    commentModal.style.display = 'none';
});

// Submit comment
document.getElementById('commentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const commentData = {
        wordId: words[currentIndex].id,
        comment: document.getElementById('commentInput').value
    };
    
    await fetch('/addComment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commentData)
    });
    
    await loadWords();
    displayCurrentWord();
    commentModal.style.display = 'none';
    document.getElementById('commentForm').reset();
});

// Close modals on outside click
window.addEventListener('click', (event) => {
    if (event.target === newWordModal) newWordModal.style.display = 'none';
    if (event.target === commentModal) commentModal.style.display = 'none';
});