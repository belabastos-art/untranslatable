// Install and load dependencies
import 'dotenv/config';
import express from 'express';
import { Low } from 'lowdb';
import { createServer } from 'http';

// Initialize express app
let app = express();

// Custom Gist Adapter for LowDB
class GistAdapter {
    constructor(gistId, token, filename) {
        this.gistId = gistId;
        this.token = token;
        this.filename = filename;
    }

    async read() {
        try {
            const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            const gist = await response.json();
            const content = gist.files[this.filename]?.content;
            
            return content ? JSON.parse(content) : null;
        } catch (error) {
            console.error('Error reading from Gist:', error);
            return null;
        }
    }

    async write(data) {
        try {
            await fetch(`https://api.github.com/gists/${this.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: {
                        [this.filename]: {
                            content: JSON.stringify(data, null, 2)
                        }
                    }
                })
            });
        } catch (error) {
            console.error('Error writing to Gist:', error);
        }
    }
}

// Connect to database with custom Gist adapter
let defaultData = { words: [] };
let adapter = new GistAdapter(
    process.env.GIST_ID,
    process.env.GIST_TOKEN,
    process.env.GIST_FILENAME
);
let db = new Low(adapter, defaultData);

// Initialize/read database
await db.read();
db.data ||= defaultData;
console.log('Database initialized');
console.log('Current words:', db.data.words.length);

// Serve static files
app.use('/', express.static('public'));

// Parse JSON
app.use(express.json());

// Route to get all words
app.get('/getWords', async (request, response) => {
    await db.read();
    response.json({ words: db.data.words });
});

// Route to add a new word
app.post('/newWord', async (request, response) => {
    console.log('New word submission:', request.body);
    
    let newWord = {
        id: Date.now(),
        word: request.body.word,
        language: request.body.language,
        definition: request.body.definition,
        comments: []
    };
    
    db.data.words.push(newWord);
    await db.write();
    
    response.json({ task: "success", word: newWord });
});

// Route to add a comment to a word
app.post('/addComment', async (request, response) => {
    console.log('New comment:', request.body);
    
    await db.read();
    
    let word = db.data.words.find(w => w.id === request.body.wordId);
    if (word) {
        word.comments.push({
            text: request.body.comment,
            timestamp: new Date().toISOString()
        });
        
        await db.write();
        response.json({ task: "success" });
    } else {
        response.status(404).json({ task: "error", message: "Word not found" });
    }
});

// Initialize HTTP server
let server = createServer(app);
let port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('Server listening at port:', port);
});