const socket = io();
let localStream;
let peerConnection;
const userId = Math.floor(Math.random() * 10000); // Unique identifier for the user

const configuration = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

document.getElementById('startCall').onclick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
            socket.emit('candidate', candidate, userId);
        }
    };

    peerConnection.ontrack = (event) => {
        const remoteStream = event.streams[0];
        const remoteUser = document.createElement('div');
        remoteUser.classList.add('user');
        remoteUser.id = `user-${userId}`;
        const indicator = document.createElement('div');
        indicator.classList.add('indicator');
        const span = document.createElement('span');
        span.textContent = `User ${userId}`;
        remoteUser.appendChild(indicator);
        remoteUser.appendChild(span);
        document.getElementById('users').appendChild(remoteUser);

        const audio = document.createElement('audio');
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        remoteUser.appendChild(audio);
    };

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer, userId);

    monitorSpeaking(localStream, 'localUser');
    socket.emit('user-connected', userId);
};

socket.on('offer', async (offer, userId) => {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(configuration);

        peerConnection.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit('candidate', candidate, userId);
            }
        };

        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            const remoteUser = document.createElement('div');
            remoteUser.classList.add('user');
            remoteUser.id = `user-${userId}`;
            const indicator = document.createElement('div');
            indicator.classList.add('indicator');
            const span = document.createElement('span');
            span.textContent = `User ${userId}`;
            remoteUser.appendChild(indicator);
            remoteUser.appendChild(span);
            document.getElementById('users').appendChild(remoteUser);

            const audio = document.createElement('audio');
            audio.srcObject = remoteStream;
            audio.autoplay = true;
            remoteUser.appendChild(audio);
        };

        localStream.getTracks().forEach((track) => {
            peerConnection.addTrack(track, localStream);
        });
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, userId);
});

socket.on('answer', async (answer, userId) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', async (candidate, userId) => {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
});

socket.on('speaking', ({ id, isSpeaking }) => {
    const userElement = id === userId ? document.getElementById('localUser') : document.getElementById(`user-${id}`);
    if (userElement) {
        const indicator = userElement.querySelector('.indicator');
        if (isSpeaking) {
            indicator.classList.add('speaking');
        } else {
            indicator.classList.remove('speaking');
        }
    }
});

socket.on('user-connected', (userId) => {
    const remoteUser = document.createElement('div');
    remoteUser.classList.add('user');
    remoteUser.id = `user-${userId}`;
    const indicator = document.createElement('div');
    indicator.classList.add('indicator');
    const span = document.createElement('span');
    span.textContent = `User ${userId}`;
    remoteUser.appendChild(indicator);
    remoteUser.appendChild(span);
    document.getElementById('users').appendChild(remoteUser);
});

socket.on('user-disconnected', (userId) => {
    const userElement = document.getElementById(`user-${userId}`);
    if (userElement) {
        userElement.remove();
    }
});

function monitorSpeaking(stream, userId) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkSpeaking = () => {
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / bufferLength;

        const speaking = average > 10;
        socket.emit('speaking', speaking, userId);

        requestAnimationFrame(checkSpeaking);
    };

    checkSpeaking();
}
