import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;
const host = '0.0.0.0';
const openRouterBaseURL = 'https://openrouter.ai/api/v1';
const chatModel = 'deepseek/deepseek-chat-v3-0324:free';
const clientURL = (
    process.env.CLIENT_URL || 'https://ia-front-one.vercel.app'
)

if (!process.env.OPENROUTER_API_KEY) {
    console.error(
        'Erro: variável OPENROUTER_API_KEY não foi configurada.'
    );
    process.exit(1);
}

const allowedOrigins = [
    'http://localhost:5173',
    clientURL,
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
    baseURL: openRouterBaseURL,
    apiKey:
        process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': clientURL,
        'X-Title': 'Chat AI',
    },
});

function getProviderError(error) {
    const encodedError =
        error.headers?.['x-error-json'];

    if (encodedError) {
        try {
            return JSON.parse(
                Buffer.from(encodedError, 'base64').toString('utf8')
            );
        } catch {
            return encodedError;
        }
    }

    return error.error || error.response?.data;
}

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
                    chatModel,
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
        console.error('Erro ao consultar OpenRouter:', {
            status: error.status,
            code: error.code,
            type: error.type,
            message: error.message,
            responseError:
                getProviderError(error),
        });

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
    console.log('OpenRouter configurado:', {
        baseURL: openRouterBaseURL,
        model: chatModel,
        clientURL,
        apiKeyLoaded:
            process.env.OPENROUTER_API_KEY.startsWith('sk-or-v1-'),
    });
});

server.on('error', (error) => {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
});
