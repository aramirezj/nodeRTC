import { Server as SocketIoServer } from 'socket.io';
import { RTCIceCandidate, RTCPeerConnection, RTCSessionDescription } from 'wrtc';
import { Clients } from "./model/Clients";

/** Handler used to establish a RTC client <--> server <--> client, using the server to send all the information */

export class RTCServerHandler {
	io: SocketIoServer;
	clients: Clients = {}
	constructor(server: any) {


		this.io = new SocketIoServer(server, {
			cors: {
				origin: "http://localhost:4200",
				methods: ["GET", "POST"],
				credentials: true
			}
		});

		this._listenConnections();

	}

	private _listenConnections() {
		/**
		 * Socket connection, in the moment a connection is open, we save the Id and we listen for the following events:
				offer: After the socket connection, the client can send an event to establish a RTC connection server <--> client
				ice-candidate: We receive the ICEs from the client and we added to the existing RTC connection
				disconnect: The client has been disconnected so we clear the connection
		**/
		this.io.on('connection', (socket) => {
			const userId = socket.handshake.query.userId as string;
			//@ts-ignore typescript being drunk
			this.clients[userId] = { socket: socket };
			console.log(`Usuario conectado con ID: ${userId}`);

			//Offer event in order to start the RTC connection
			socket.on('offer', async (offer: RTCSessionDescriptionInit) => {
				console.log('Oferta recibida:', offer.type);
				const answer = await this.createWebRTCAnswer(offer, userId);
				socket.emit('answer', answer);
			});

			//Once the RTC is open, we can receive the ICEs and assign it to the RTCconnection
			socket.on('ice-candidate', (data: { candidate: RTCIceCandidateInit, userId: string }) => {
				const { candidate, userId } = data;
				if (candidate && this.clients[userId].peerConnection) {
					this.addIceCandidateToConnection(candidate, userId);
				} else {
					console.error('Candidato ICE recibido es undefined o la conexión no está definida');
				}
			});

			//We clean the connection when the client is disconnected
			socket.on('disconnect', () => {
				console.log(`Usuario ${userId} desconectado`);
				delete this.clients[userId];
			});
		});
	}

	/**
 * From the offer, creates the RTC connection 
 * @param offer  Offer to create the RTC
 * @param userId UserId trying to create it
 * @returns The answer from the question
 */
	async createWebRTCAnswer(offer: RTCSessionDescriptionInit, userId: string) {
		console.log(`Starting the creation of the RTC for the user ${userId}`);
		//Connection has been created for the client
		this.clients[userId].peerConnection = new RTCPeerConnection();


		const connection = this.clients[userId].peerConnection;
		//connection.ontrack = (event) => console.log('Stream recibido:', event.streams[0]);

		//The client can send the request for opening a channel, we retrieve and assign the channel to the RTCconnection
		connection.ondatachannel = (event) => {
			this.clients[userId].dataChannel = event.channel;
			this.setupDataChannel(userId);
		};

		await connection.setRemoteDescription(new RTCSessionDescription(offer));
		const answer = await connection.createAnswer();
		await connection.setLocalDescription(answer);

		return answer;
	}

	/**
	 * Once the RTCConnection is open, we create the candidates and asign it to the RTCconnection
	 * @param candidate IceCandidate
	 * @param userId UserId establishing 
	 */
	async addIceCandidateToConnection(candidate: RTCIceCandidateInit, userId: string) {
		if (!this.clients[userId].peerConnection) {
			console.error('La conexión peer no está definida');
			return;
		}

		try {
			const iceCandidate = new RTCIceCandidate(candidate);
			await this.clients[userId].peerConnection.addIceCandidate(iceCandidate);
			console.log('ICE candidate added correctly to the RTCConnection');
		} catch (error) {
			console.error('Error al añadir el candidato ICE:', error);
		}
	}

	/**
	 * With everything already ready, we have received to open a dataChannel with the user
	 * @param userId UserId that will get the channel created
	 */
	setupDataChannel(userId: string) {
		if (!this.clients[userId].dataChannel) {
			console.error('A data channel has been tried to create without connection');
			return;
		}

		this.clients[userId].dataChannel.onopen = () => console.log(`Data channel open for ${userId}`);
		this.clients[userId].dataChannel.onclose = () => console.log(`Data channel closed for ${userId}`);

		//When the channel receives a message, we will try to send it to other channel

		this.clients[userId].dataChannel.onmessage = (event) => {
			const message = JSON.parse(event.data);
			if (this.clients[message.targetId] && this.clients[message.targetId]?.dataChannel) {
				console.log(`Sending message from ${userId} to ${message.targetId}: ${message.text}`);
				this.clients[message.targetId].dataChannel!.send(JSON.stringify({ from: userId, text: message.text }));
			} else {
				console.log(`Client ${message.targetId} is not connected or the data channel is not open`);
			}
		};
	}
}


