import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { getAllDocuments, findOrCreateDocument, updateDocument } from "./controllers/documentController" ;
import OpenAI from 'openai';
import { createServer } from 'http';
dotenv.config();

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

const PORT = Number(process.env.PORT || 3000) ;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/** Connect to MongoDB */
mongoose.connect(process.env.DATABASE_URL || "", { dbName: "Google-Docs" })
.then(() => { console.log("Database connected.");})
.catch((error) => { console.log("DB connection failed. " + error);}) ;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// LLM endpoint
app.post('/llm', async (req: Request, res: Response) => {
    try {
        const { text, query } = req.body;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant that helps with text analysis and editing." },
                { role: "user", content: `Text: ${text}\n\nQuery: ${query}` }
            ],
        });

        res.json({ response: completion.choices[0].message?.content });
    } catch (error) {
        console.error('Error in LLM endpoint:', error);
        res.status(500).json({ error: 'Failed to process LLM request' });
    }
});

io.on("connection", socket => {
  
    socket.on("get-all-documents", async () => {
      const allDocuments = await getAllDocuments() ;
      allDocuments.reverse() ; // To get most recent docs first.
      socket.emit("all-documents", allDocuments) ;
    })

    socket.on("get-document", async ( { documentId, documentName } ) => {
      socket.join(documentId) ;
      const document = await findOrCreateDocument({ documentId, documentName }) ;

      if(document)
        socket.emit("load-document", document.data) ;

      socket.on("send-changes", delta => {
        socket.broadcast.to(documentId).emit("receive-changes", delta) ;
      });

      socket.on("save-document", async (data) => {
        await updateDocument(documentId, { data }) ;
      })

    })

})

// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});