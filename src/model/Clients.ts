import { Socket } from 'socket.io';

export interface Clients {
  [key: string]: {
		socket: Socket | undefined,
		peerConnection: RTCPeerConnection | undefined;
    dataChannel: RTCDataChannel | undefined;
	};
}