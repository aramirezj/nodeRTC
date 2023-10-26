const { RTCPeerConnection, RTCSessionDescription } = require('wrtc');

export async function createWebRTCAnswer(offer) {
  // Crear una nueva conexión peer
  const peerConnection = new RTCPeerConnection();

  // Configurar el manejador para cuando se generen candidatos ICE
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('Nuevo candidato ICE:', event.candidate);
      // Aquí podrías enviar el candidato ICE al cliente si es necesario
    }
  };

  // Configurar el manejador para cuando se reciba un stream
  peerConnection.ontrack = (event) => {
    console.log('Stream recibido:', event.streams[0]);
    // Aquí podrías hacer algo con el stream, como guardarlo o procesarlo
  };

  // Establecer la descripción remota con la oferta recibida
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  // Crear y establecer la descripción local con la respuesta
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  // Devolver la respuesta
  return answer;
}
