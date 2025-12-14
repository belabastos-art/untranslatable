// Load dependencies
import 'dotenv/config';
import express from 'express';
import { Low } from 'lowdb';
import { createServer } from 'http';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Server } from 'socket.io';

// Setup Cloudinary for audio storage
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup file upload (1MB max)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 1 * 1024 * 1024 }
});

let app = express();

// Adapter to use GitHub Gist as database
class GistAdapter {
    constructor(gistId, token, filename) {
        this.gistId = gistId;
        this.token = token;
        this.filename = filename;
    }

    // Read data from Gist
    async read() {
        const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        // Check if request was successful
        if (!response.ok) {
            console.error('GitHub API Error:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error details:', errorText);
            return null;
        }
        
        const gist = await response.json();
        
        // Check if gist has files
        if (!gist.files) {
            console.error('Gist response has no files:', gist);
            return null;
        }
        
        // Check if our file exists
        if (!gist.files[this.filename]) {
            console.error(`File "${this.filename}" not found in gist. Available files:`, Object.keys(gist.files));
            return null;
        }
        
        const content = gist.files[this.filename].content;
        
        return content ? JSON.parse(content) : null;
    }

    // Write data to Gist
    async write(data) {
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
    }
}

// Setup database
let defaultData = { words: [] };
let adapter = new GistAdapter(
    process.env.GIST_ID,
    process.env.GIST_TOKEN,
    process.env.GIST_FILENAME
);
let db = new Low(adapter, defaultData);

// Load database
await db.read();
db.data ||= defaultData;
console.log('Database ready');

// Serve static files from public folder
app.use('/', express.static('public'));
app.use(express.json());

// Setup server with Socket.io for real-time updates
let server = createServer(app);
let io = new Server(server);

// Handle user connections
io.on('connection', (socket) => {
    console.log('User connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Get all words
app.get('/getWords', async (request, response) => {
    await db.read();
    response.json({ words: db.data.words });
});

// Upload audio to Cloudinary
app.post('/uploadAudio', upload.single('audio'), async (request, response) => {
    if (!request.file) {
        return response.status(400).json({ error: 'No audio file' });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
        {
            resource_type: 'video',
            folder: 'untranslatable',
            format: 'mp3'
        },
        (error, result) => {
            if (error) {
                return response.status(500).json({ error: 'Upload failed' });
            }
            response.json({ audioUrl: result.secure_url });
        }
    );

    uploadStream.end(request.file.buffer);
});

// Add new word
app.post('/newWord', async (request, response) => {
    let newWord = {
        id: Date.now(),
        word: request.body.word,
        language: request.body.language,
        definition: request.body.definition,
        audioUrl: request.body.audioUrl || null,
        comments: []
    };
    
    db.data.words.push(newWord);
    await db.write();
    
    // Tell all connected users about new word
    io.emit('newWord', newWord);
    
    response.json({ task: "success", word: newWord });
});

// Add comment to word
app.post('/addComment', async (request, response) => {
    await db.read();
    
    let word = db.data.words.find(w => w.id == request.body.wordId);
    
    if (word) {
        let newComment = {
            text: request.body.comment,
            timestamp: new Date().toISOString()
        };
        
        word.comments.push(newComment);
        await db.write();
        
        // Tell all connected users about new comment
        io.emit('newComment', {
            wordId: request.body.wordId,
            comment: newComment
        });
        
        response.json({ task: "success" });
    } else {
        response.status(404).json({ task: "error", message: "Word not found" });
    }
});

// Start server
let port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log('Server running on port:', port);
});