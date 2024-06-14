const socket = io();
let localStream;
let remoteStream;
let peerConnection;
let roomId;


navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    const localVideo = document.getElementById('local-video');
    localVideo.srcObject = localStream;
  })
  .catch(error => console.error('Error accessing media devices', error));

// Join room and create/answer offer
const joinRoomBtn = document.getElementById('join-room');
joinRoomBtn.addEventListener('click', () => {
  roomId = document.getElementById('room-id').value;
  socket.emit('join-room', roomId);
});

socket.on('room-created', async () => {
  console.log('Room created');
  const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };
  peerConnection = new RTCPeerConnection(servers);
  peerConnection.onicecandidate = handleIceCandidate;
  peerConnection.ontrack = handleRemoteStream;
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', offer, roomId);
});

socket.on('offer', async offer => {
  console.log('Received offer');
  const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };
  peerConnection = new RTCPeerConnection(servers);
  peerConnection.onicecandidate = handleIceCandidate;
  peerConnection.ontrack = handleRemoteStream;
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('answer', answer, roomId);
});

socket.on('answer', async answer => {
  console.log('Received answer');
  await peerConnection.setRemoteDescription(answer);
});

socket.on('ice-candidate', iceCandidate => {
  console.log('Received ice candidate');
  peerConnection.addIceCandidate(iceCandidate);
});

function handleIceCandidate(event) {
  if (event.candidate) {
    console.log('Sending ice candidate');
    socket.emit('ice-candidate', event.candidate, roomId);
  }
}

function handleRemoteStream(event) {
  console.log('Received remote stream');
  remoteStream = event.streams[0];
  const remoteVideo = document.getElementById('remote-video');
  remoteVideo.srcObject = remoteStream;
}