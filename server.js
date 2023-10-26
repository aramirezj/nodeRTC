const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require('wrtc');

const app = express();
const server = http.createServer(app);

// Configurar CORS
app.use(cors({
  origin: 'http://localhost:4200', // Reemplaza con el origen de tu aplicación Angular
  methods: ['GET', 'POST'],
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:4200",
    methods: ["GET", "POST"],
    credentials: true
  }
});

server.listen(3000, () => {
  console.log('Servidor escuchando en el puerto 3000');
});


const clients = {};
const connections = {};



/**
 * Socket connection, in the moment a connection is open, we save the Id and we listen for the following events:
		offer: After the socket connection, the client can send an event to establish a RTC connection
		ice-candidate: We receive the ICEs from the client and we added to the existing RTC connection
		disconnect: The client has been disconnected so we clear the connection
**/
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  clients[userId] = socket;
  console.log(`Usuario conectado con ID: ${userId}`);

	//Registramos evento offer para iniciar un RTC
  socket.on('offer', async (offer) => {
    console.log('Oferta recibida:', offer.type);
    const answer = await createWebRTCAnswer(offer, userId);
    socket.emit('answer', answer);
  });

	//Once the RTC is open, we can receive the ICEs and assign it to the RTCconnection
	socket.on('ice-candidate', (data) => {
		const { candidate, userId } = data;

		if (candidate && connections[userId]) {
			addIceCandidateToConnection(candidate, userId);
		} else {
			console.error('Candidato ICE recibido es undefined o la conexión no está definida');
		}
	});
	
	//We clean the connection
	socket.on('disconnect', () => {
    console.log(`Usuario ${userId} desconectado`);
    delete clients[userId];
		delete connections[userId];
  });
});


//From the offer, creates the RTC connection 
async function createWebRTCAnswer(offer, userId) {
  console.log(`Vamos a iniciar la RTC para ${userId}`);
	//Connection has been created for the client

	connections[userId] = {
		peerConnection: new RTCPeerConnection(),
		dataChannel: null
	};

	const connection = connections[userId].peerConnection;
  connection.ontrack = (event) => console.log('Stream recibido:', event.streams[0]);

	//The client can send the request for opening a channel, we retrieve and assign the channel to the RTCconnection
	connection.ondatachannel = (event) => {
		connections[userId].dataChannel = event.channel;
    setupDataChannel(userId);
  };

  await connection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await connection.createAnswer();
  await connection.setLocalDescription(answer);

  return answer;
}

/** Once the RTCConnection is open, we create the candidates and asign it to the RTCconnection */
async function addIceCandidateToConnection(candidate, userId) {
  if (!connections[userId].peerConnection) {
    console.error('La conexión peer no está definida');
    return;
  }

  try {
    const iceCandidate = new RTCIceCandidate(candidate);
    await connections[userId].peerConnection.addIceCandidate(iceCandidate);
    console.log('ICE candidate added correctly to the RTCConnection');
  } catch (error) {
    console.error('Error al añadir el candidato ICE:', error);
  }
}

/** With everything already ready, we have received to open a dataChannel with the user  */
function setupDataChannel(userId) {

  if (!connections[userId].dataChannel) return console.error('A data channel has been tried to create without connection');

  connections[userId].dataChannel.onopen = () => console.log(`Data channel open for ${userId}` );
	connections[userId].dataChannel.onclose = () => console.log(`Data channel closed for ${userId}`);

	//When the channel receives a message, we will try to send it to other chanel
  connections[userId].dataChannel.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (clients[message.targetId] && connections[message.targetId].dataChannel) {
      console.log(`Sending message from ${userId} to ${message.targetId}: ${message.text}`);
      connections[message.targetId].dataChannel.send(JSON.stringify({ from: userId, text: message.text }));
    } else {
      console.log(`Client ${message.targetId} is not connected or the data channel is not open`);
    }
  };

}
