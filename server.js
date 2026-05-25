import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;
const host = '0.0.0.0';

const allowedOrigins = [
    'http://localhost:5173',
    process.env.CLIENT_URL,
]
    .filter(Boolean)
    .map((origin) =>
        origin.replace(/\/$/, '')
    );

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

const openai = new OpenAI({
    apiKey:
        process.env.OPENROUTER_API_KEY,
});

app.get('/health', (req, res) => {
    res.json({
        ok: true,
    });
});

app.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        console.log(
            'Mensagem recebida:',
            message
        );

        const completion =
            await openai.chat.completions.create({
                model:
                    'openai/gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: message,
                    },
                ],
            });

        console.log(
            completion
        );
        res.json({
            response:
                completion
                    .choices[0]
                    .message.content,
        });
    } catch (error) {
        console.log(
            'ERRO COMPLETO:',
            error
        );
        res.status(500).json({
            error:
                'Erro ao consultar a IA',
        });
    }
});

const server = app.listen(port, host, () => {
    console.log(
        `Servidor rodando em http://${host}:${port}`
    );
});

server.on('error', (error) => {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
});
