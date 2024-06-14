const socket = io();
let localStream;
let remoteStream;
let peerConnection;
let targetSocketId;

// Get user media (camera and microphone)
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    const localVideo = document.getElementById('local-video');
    localVideo.srcObject = localStream;
  })
  .catch(error => console.error('Error accessing media devices', error));

// Listen for 'match-found' event from the server
socket.on('match-found', async (matchedSocketId) => {
  console.log('Match found with:', matchedSocketId);
  targetSocketId = matchedSocketId;

  const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };
  peerConnection = new RTCPeerConnection(servers);
  setupPeerConnection(peerConnection);

  // Create an offer if this client's ID is lexicographically smaller
  if (socket.id < targetSocketId) {
    console.log('Creating offer');
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', offer, targetSocketId);
    } catch (error) {
      console.error('Error creating offer', error);
    }
  }
});

socket.on('offer', async (offer, senderSocketId) => {
  console.log('Received offer from:', senderSocketId);
  targetSocketId = senderSocketId;

  const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };
  peerConnection = new RTCPeerConnection(servers);
  setupPeerConnection(peerConnection);

  try {
    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, targetSocketId);
  } catch (error) {
    console.error('Error handling offer', error);
  }
});

socket.on('answer', async (answer) => {
  console.log('Received answer');
  try {
    await peerConnection.setRemoteDescription(answer);
  } catch (error) {
    console.error('Error handling answer', error);
  }
});

socket.on('ice-candidate', async (iceCandidate) => {
  console.log('Received ice candidate');
  try {
    await peerConnection.addIceCandidate(iceCandidate);
  } catch (error) {
    console.error('Error handling ice candidate', error);
  }
});

function setupPeerConnection(peerConnection) {
  peerConnection.onicecandidate = handleIceCandidate;
  peerConnection.ontrack = handleRemoteStream;
  peerConnection.onnegotiationneeded = handleNegotiationNeeded;

  if (localStream) {
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  } else {
    console.error('Local stream not available');
  }
}

function handleIceCandidate(event) {
  if (event.candidate) {
    console.log('Sending ice candidate');
    socket.emit('ice-candidate', event.candidate, targetSocketId);
  }
}

function handleRemoteStream(event) {
  console.log('Received remote stream');
  remoteStream = event.streams[0];
  const remoteVideo = document.getElementById('remote-video');
  remoteVideo.srcObject = remoteStream;
}

function handleNegotiationNeeded() {
  console.log('Negotiation needed');
  // Handle renegotiation logic if needed
}

// Clean up resources when the user disconnects
window.addEventListener('beforeunload', () => {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
    remoteStream = null;
  }
});