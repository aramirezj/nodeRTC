import { Server as SocketIoServer } from 'socket.io';
import { Clients } from "./model/Clients";

/** Handler used to establish a RTC client <--> client, using the server to send the initial information to be able to connect later */
export class RTCClientHandler {
	io: SocketIoServer;
	clients: Clients = {};

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
		this.io.on('connection', (socket) => {
			const userId = socket.handshake.query.userId as string;
			//@ts-ignore typescript being drunk
			this.clients[userId] = { socket: socket };
			console.log(`Usuario conectado con ID: ${userId}`);

			socket.on('offer', (data: { offer: RTCSessionDescriptionInit, targetUserId: string }) => {
				const { offer, targetUserId } = data;
				console.log('Oferta recibida:', offer.type);
				if (this.clients[targetUserId]) {
					console.log(`Reenviando oferta a ${targetUserId}`);
					this.clients[targetUserId].socket.emit('offer', {offer, userId});
				} else {
					console.error(`Usuario ${targetUserId} no está conectado`);
				}
			});

			socket.on('answer', (data: { answer: RTCSessionDescriptionInit, targetUserId: string }) => {
				console.log('La data de la answer es;')
				console.log(data);
				const { answer, targetUserId } = data;
				console.log('Respuesta recibida');
				if (this.clients[targetUserId]) {
					console.log(`Reenviando respuesta a ${targetUserId}`);
					this.clients[targetUserId].socket.emit('answer', answer);
				} else {
					console.error(`Usuario ${targetUserId} no está conectado`);
				}
			});

			socket.on('ice-candidate', (data: { candidate: RTCIceCandidateInit, targetUserId: string }) => {
				const { candidate, targetUserId } = data;
				console.log('Candidato ICE recibido');
				if (this.clients[targetUserId]) {
					console.log(`Reenviando candidato ICE a ${targetUserId}`);
					this.clients[targetUserId].socket.emit('ice-candidate', candidate);
				} else {
					console.error(`Usuario ${targetUserId} no está conectado`);
				}
			});

			socket.on('disconnect', () => {
				console.log(`Usuario ${userId} desconectado`);
				delete this.clients[userId];
			});
		});
	}
}
