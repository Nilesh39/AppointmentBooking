import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { useSocketStore } from '../../store/socketStore.js';
import { PageWrapper } from '../../components/Shared/PageWrapper.jsx';
import toast from 'react-hot-toast';

// Generate a mock media stream (e.g. if camera/microphone is missing, blocked, or locked by another window)
const createMockStream = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  
  let angle = 0;
  const animInterval = setInterval(() => {
    if (!canvas) {
      clearInterval(animInterval);
      return;
    }
    // Draw background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw text header
    ctx.fillStyle = '#14b8a6'; // teal-500
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MediConnect Consult Room', canvas.width / 2, canvas.height / 2 - 30);
    
    // Draw descriptive text
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#94a3b8'; // slate-400
    ctx.fillText('Virtual Video Stream Active', canvas.width / 2, canvas.height / 2 + 10);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.fillText('(Physical camera is busy or unavailable)', canvas.width / 2, canvas.height / 2 + 35);
    
    // Draw pulsing green indicator dot
    ctx.fillStyle = '#10b981'; // emerald-500
    ctx.beginPath();
    const pulse = 10 + Math.abs(Math.sin(angle)) * 6;
    ctx.arc(canvas.width / 2, canvas.height / 2 + 80, pulse, 0, 2 * Math.PI);
    ctx.fill();
    
    angle += 0.08;
  }, 100);

  const videoStream = canvas.captureStream(10); // 10 FPS
  const videoTrack = videoStream.getVideoTracks()[0];

  // Create mock silent audio track using AudioContext buffer source
  let audioTrack = null;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    const bufferSource = audioCtx.createBufferSource();
    const silenceBuffer = audioCtx.createBuffer(1, 22050, 44100); // 0.5s of absolute silence
    bufferSource.buffer = silenceBuffer;
    bufferSource.loop = true;
    bufferSource.connect(dest);
    bufferSource.start();
    audioTrack = dest.stream.getAudioTracks()[0];
  } catch (e) {
    console.error('AudioContext not supported, silent track fallback failed:', e);
  }

  const tracks = [];
  if (videoTrack) tracks.push(videoTrack);
  if (audioTrack) tracks.push(audioTrack);
  
  const mockStream = new MediaStream(tracks);
  mockStream.animInterval = animInterval;

  return mockStream;
};

export default function VideoCall() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, connectSocket } = useSocketStore();

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callStatus, setCallStatus] = useState('initializing'); // initializing, waiting, connecting, connected, disconnected

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);

  // Bind local stream to video element once mounted
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => console.log('Local autoplay block:', err));
    }
  }, [localStream]);

  // Bind remote stream to video element once mounted
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(err => console.log('Remote autoplay block:', err));
    }
  }, [remoteStream]);

  // STUN servers configuration for NAT traversal
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    if (!user) return;
    
    // Ensure socket is connected
    connectSocket(user._id);

    // Initialize media stream
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setCallStatus('waiting');
      } catch (err) {
        console.warn('Error accessing physical media devices, falling back to mock stream:', err);
        toast.error('Webcam/Mic is busy or unavailable. Loading virtual consult card...');
        
        try {
          const mockStream = createMockStream();
          setLocalStream(mockStream);
          setCallStatus('waiting');
        } catch (fallbackErr) {
          console.error('Failed to create mock stream:', fallbackErr);
          setCallStatus('disconnected');
        }
      }
    };

    initMedia();

    return () => {
      cleanupCall();
    };
  }, [user, appointmentId]);

  // Handle peer connection and signaling when socket & stream are ready
  useEffect(() => {
    if (!socket || !localStream || !appointmentId) return;

    socket.emit('join_call', appointmentId);

    const iceCandidatesQueue = [];

    const processIceQueue = async () => {
      while (iceCandidatesQueue.length > 0) {
        const candidate = iceCandidatesQueue.shift();
        try {
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.error('Error processing queued ICE candidate:', err);
        }
      }
    };

    const setupPeerConnection = () => {
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      // Add local tracks to peer connection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      // Handle remote stream tracks
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setCallStatus('connected');
        }
      };

      // Handle ice candidates generated locally
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', {
            room: appointmentId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        switch (pc.connectionState) {
          case 'connected':
            setCallStatus('connected');
            break;
          case 'disconnected':
          case 'failed':
            setCallStatus('disconnected');
            toast.error('Connection lost. Trying to reconnect...');
            break;
          case 'closed':
            setCallStatus('disconnected');
            break;
          default:
            break;
        }
      };
    };

    setupPeerConnection();

    // Socket Event Listeners for signaling
    socket.on('user_joined_call', async (socketId) => {
      console.log('Opponent joined call:', socketId);
      setCallStatus('connecting');
      try {
        if (pcRef.current) {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socket.emit('webrtc_offer', { room: appointmentId, offer });
        }
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    });

    socket.on('webrtc_offer', async (offer) => {
      console.log('Received WebRTC offer');
      setCallStatus('connecting');
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socket.emit('webrtc_answer', { room: appointmentId, answer });
          await processIceQueue();
        }
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('webrtc_answer', async (answer) => {
      console.log('Received WebRTC answer');
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await processIceQueue();
        }
      } catch (err) {
        console.error('Error handling answer:', err);
      }
    });

    socket.on('webrtc_ice_candidate', async (candidate) => {
      try {
        if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          iceCandidatesQueue.push(candidate);
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    socket.on('user_left_call', () => {
      toast.error('The other user has left the call.');
      setCallStatus('disconnected');
      setRemoteStream(null);
    });

    return () => {
      socket.off('user_joined_call');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('user_left_call');
      if (socket) {
        socket.emit('leave_call', appointmentId);
      }
    };
  }, [socket, localStream, appointmentId]);

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      if (localStream.animInterval) {
        clearInterval(localStream.animInterval);
      }
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
  };

  const handleEndCall = () => {
    cleanupCall();
    toast.success('Call ended');
    const returnPath = user?.role === 'doctor' ? '/doctor/dashboard' : '/patient/appointments';
    navigate(returnPath);
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <PageWrapper>
      <div className="relative min-h-[92vh] w-full bg-slate-955 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-center">
        
        {/* Remote Video Stream (Main screen) */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-900">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-slate-400">
              {callStatus === 'waiting' ? (
                <>
                  <Loader2 className="animate-spin text-teal-400" size={48} />
                  <p className="text-lg font-medium animate-pulse">Waiting for the other participant to join...</p>
                </>
              ) : callStatus === 'connecting' ? (
                <>
                  <Loader2 className="animate-spin text-teal-400" size={48} />
                  <p className="text-lg font-medium">Connecting call...</p>
                </>
              ) : (
                <>
                  <div className="h-20 w-20 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-md">
                    <User size={36} />
                  </div>
                  <p className="text-lg font-medium">Call is not active</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Local Video Stream (Picture-in-Picture card) */}
        <div className="absolute top-6 right-6 w-36 h-48 md:w-48 md:h-64 rounded-xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950/80 backdrop-blur-md z-20">
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 bg-slate-900">
              <VideoOff size={24} />
            </div>
          )}
          {isCamOff && (
            <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-slate-400">
              <VideoOff size={24} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] text-white">
            You {isMuted && '(Muted)'}
          </div>
        </div>

        {/* Top Floating Status Info */}
        <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-xs font-semibold text-white shadow-md">
          <div className={`h-2.5 w-2.5 rounded-full ${callStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
          <span className="capitalize">Status: {callStatus === 'waiting' ? 'Waiting' : callStatus === 'connected' ? 'Connected' : callStatus}</span>
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-slate-900/90 backdrop-blur-lg px-6 py-4 rounded-full border border-slate-800/80 shadow-2xl">
          {/* Mute/Unmute */}
          <button
            onClick={toggleMute}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-950 transition-all hover:scale-105 active:scale-95"
            title="End Call"
          >
            <PhoneOff size={24} className="rotate-[135deg]" />
          </button>

          {/* Camera On/Off */}
          <button
            onClick={toggleCam}
            className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
              isCamOff
                ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50 hover:bg-rose-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
            }`}
            title={isCamOff ? 'Turn Cam On' : 'Turn Cam Off'}
          >
            {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        </div>

      </div>
    </PageWrapper>
  );
}
