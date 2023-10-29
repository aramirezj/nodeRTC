import cors from 'cors';
import express from 'express';
import http from 'http';
import { RTCClientHandler } from './rtcClient';
const app = express();
const server = http.createServer(app);

// CORS
app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

server.listen(3000,'0.0.0.0', () => {
  console.log('Servidor escuchando en el puerto 3000');
});


//const rtcHandler:RTCServerHandler = new RTCServerHandler(server);

const rtcHandler:RTCClientHandler = new RTCClientHandler(server);






