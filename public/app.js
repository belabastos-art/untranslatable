let words = [];
let currentIndex = 0;
let mediaRecorder;
let audioChunks = [];
let recordedAudioBlob = null;
let recordingTimeout;

let socket = io();

socket.on('newWord', (newWord) => {
    words.push(newWord);
    if (words.length == 1 || currentIndex == words.length - 2) {
        currentIndex = words.length - 1;
        displayCurrentWord();
    }
});

socket.on('newComment', (data) => {
    const word = words.find(w => w.id == data.wordId);
    if (word) {
        word.comments.push(data.comment);
        if (words[currentIndex].id == data.wordId) {
            displayComments(word.comments);
        }
    }
});

window.addEventListener('load', async () => {
    await loadWords();
    displayCurrentWord();
    setupEventListeners();
});

async function loadWords() {
    const response = await fetch('/getWords');
    const data = await response.json();
    words = data.words;
}

function displayCurrentWord() {
    const wordDisplay = document.getElementById('wordDisplay');
    
    if (words.length == 0) {
        wordDisplay.innerHTML = `
            <div class="navigation">
                <button id="prevBtn" class="nav-btn" disabled>&lt;</button>
                <button id="nextBtn" class="nav-btn" disabled>&gt;</button>
            </div>
        `;
        document.getElementById('addCommentBtn').disabled = true;
        return;
    }
    
    document.getElementById('addCommentBtn').disabled = false;
    const word = words[currentIndex];
    
    wordDisplay.innerHTML = `
        <div class="word-counter">( ${String(currentIndex + 1).padStart(2, '0')}/${String(words.length).padStart(2, '0')} )</div>
        <div class="main-word">${word.word}</div>
        <div class="language">${word.language}</div>
        <div class="dotted-line"></div>
        <div class="definition">${word.definition}</div>
        <div class="navigation">
            <button id="prevBtn" class="nav-btn">&lt;</button>
            <button id="nextBtn" class="nav-btn">&gt;</button>
        </div>
    `;
    
    document.getElementById('prevBtn').addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + words.length) % words.length;
        displayCurrentWord();
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % words.length;
        displayCurrentWord();
    });
    
    if (word.audioUrl) {
        const audioIconDiv = document.createElement('div');
        audioIconDiv.className = 'audio-icon-container';
        audioIconDiv.innerHTML = '<span class="audio-icon">🔊</span>';
        audioIconDiv.addEventListener('click', () => {
            const audio = new Audio(word.audioUrl);
            audio.play();
        });
        
        const languageDiv = wordDisplay.querySelector('.language');
        languageDiv.parentNode.insertBefore(audioIconDiv, languageDiv);
    }
    
    displayComments(word.comments);
}

function displayComments(comments) {
    const commentsDiv = document.getElementById('commentsDisplay');
    
    if (!comments || comments.length == 0) {
        commentsDiv.innerHTML = '';
        return;
    }
    
    commentsDiv.innerHTML = '';
    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-item';
        commentDiv.textContent = comment.text;
        commentsDiv.appendChild(commentDiv);
    });
}

function setupEventListeners() {
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    const recordingStatus = document.getElementById('recordingStatus');
    const audioPlayback = document.getElementById('audioPlayback');
    
    recordBtn.addEventListener('click', async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = () => {
            recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioPlayback.src = URL.createObjectURL(recordedAudioBlob);
            audioPlayback.style.display = 'block';
            recordingStatus.textContent = 'Recording saved!';
        };
        
        mediaRecorder.start();
        recordBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        recordingStatus.textContent = 'Recording... (max 3 seconds)';
        
        recordingTimeout = setTimeout(() => {
            if (mediaRecorder.state == 'recording') stopRecording();
        }, 3000);
    });
    
    stopBtn.addEventListener('click', stopRecording);
    
    const newWordModal = document.getElementById('newWordModal');
    document.getElementById('newWordBtn').addEventListener('click', () => {
        document.getElementById('newWordForm').reset();
        recordedAudioBlob = null;
        audioPlayback.style.display = 'none';
        audioPlayback.src = '';
        recordingStatus.textContent = '';
        recordBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        newWordModal.style.display = 'block';
    });
    
    document.querySelector('.close').addEventListener('click', () => {
        newWordModal.style.display = 'none';
    });
    
    document.getElementById('newWordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitWordBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
        
        let audioUrl = null;
        
        if (recordedAudioBlob) {
            const formData = new FormData();
            formData.append('audio', recordedAudioBlob, 'pronunciation.webm');
            
            const response = await fetch('/uploadAudio', { method: 'POST', body: formData });
            const data = await response.json();
            
            if (response.ok && data.audioUrl) {
                audioUrl = data.audioUrl;
            }
        }
        
        await fetch('/newWord', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                word: document.getElementById('wordInput').value,
                language: document.getElementById('languageInput').value,
                definition: document.getElementById('definitionInput').value,
                audioUrl: audioUrl
            })
        });
        
        newWordModal.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
    });
    
    const commentModal = document.getElementById('commentModal');
    document.getElementById('addCommentBtn').addEventListener('click', () => {
        if (words.length == 0) return;
        commentModal.style.display = 'block';
    });
    
    document.querySelector('.close-comment').addEventListener('click', () => {
        commentModal.style.display = 'none';
    });
    
    document.getElementById('commentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        await fetch('/addComment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                wordId: words[currentIndex].id,
                comment: document.getElementById('commentInput').value
            })
        });
        
        commentModal.style.display = 'none';
        document.getElementById('commentForm').reset();
    });
    
    window.addEventListener('click', (event) => {
        if (event.target == newWordModal) newWordModal.style.display = 'none';
        if (event.target == commentModal) commentModal.style.display = 'none';
    });
}

function stopRecording() {
    clearTimeout(recordingTimeout);
    if (mediaRecorder && mediaRecorder.state == 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('recordBtn').style.display = 'inline-block';
    document.getElementById('stopBtn').style.display = 'none';
}
