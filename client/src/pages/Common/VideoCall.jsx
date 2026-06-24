import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, User, RefreshCw } from 'lucide-react';
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
  const [isFrontCamera, setIsFrontCamera] = useState(true);

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

  const switchCamera = async () => {
    if (!localStream) return;
    const newFacingMode = isFrontCamera ? 'environment' : 'user';
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: newFacingMode } },
        audio: false
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) throw new Error('No video track');

      const oldVideoTrack = localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        localStream.removeTrack(oldVideoTrack);
      }

      localStream.addTrack(newVideoTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(e => console.log(e));
      }

      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }
      setIsFrontCamera(!isFrontCamera);
      toast.success(`Swapped to ${newFacingMode === 'user' ? 'front' : 'rear'} camera`);
    } catch (err) {
      // Fallback to non-exact facingMode
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
          audio: false
        });
        const newVideoTrack = newStream.getVideoTracks()[0];
        if (newVideoTrack) {
          const oldVideoTrack = localStream.getVideoTracks()[0];
          if (oldVideoTrack) {
            oldVideoTrack.stop();
            localStream.removeTrack(oldVideoTrack);
          }
          localStream.addTrack(newVideoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
            localVideoRef.current.srcObject = localStream;
            localVideoRef.current.play().catch(e => console.log(e));
          }
          if (pcRef.current) {
            const senders = pcRef.current.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
            }
          }
          setIsFrontCamera(!isFrontCamera);
          toast.success(`Swapped to ${newFacingMode === 'user' ? 'front' : 'rear'} camera`);
        }
      } catch (fallbackErr) {
        console.error('Camera switch failed:', fallbackErr);
        toast.error('Camera switch not supported on this device');
      }
    }
  };

  return (
    <PageWrapper>
      <div className="fixed inset-0 h-[100dvh] w-screen bg-slate-955 overflow-hidden flex flex-col items-center justify-center z-50 select-none">
        
        {/* Remote Video Stream (Main screen) */}
        <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-950">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover transition-opacity duration-350"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-slate-400 p-4 max-w-sm text-center animate-pulse">
              {callStatus === 'waiting' ? (
                <>
                  <Loader2 className="animate-spin text-teal-400" size={44} />
                  <p className="text-base font-semibold tracking-wide text-teal-200">Waiting for peer to join...</p>
                </>
              ) : callStatus === 'connecting' ? (
                <>
                  <Loader2 className="animate-spin text-teal-400" size={44} />
                  <p className="text-base font-semibold tracking-wide text-teal-200">Securing P2P handshake...</p>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-md">
                    <User size={30} />
                  </div>
                  <p className="text-base font-semibold text-slate-350 tracking-wide">Call is not active</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Local Video Stream (Picture-in-Picture card) - Positioned below header */}
        <div className="absolute top-20 right-4 w-28 h-38 sm:w-36 sm:h-48 md:w-44 md:h-60 rounded-2xl overflow-hidden border border-slate-800/60 shadow-2xl bg-slate-950/80 backdrop-blur-md z-20 transition-all duration-300">
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
              <VideoOff size={20} />
            </div>
          )}
          {isCamOff && (
            <div className="absolute inset-0 bg-slate-950 flex items-center justify-center text-slate-400">
              <VideoOff size={20} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-extrabold text-white tracking-wide uppercase">
            You {isMuted && '(Muted)'}
          </div>
        </div>

        {/* Premium Top Navigation Glassmorphic Header */}
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between bg-slate-950/65 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-800/40 shadow-lg animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${callStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${callStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tele-Consultation</h4>
              <p className="text-[10px] text-slate-400 font-medium">Room: #{appointmentId.substring(appointmentId.length - 6)}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-extrabold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-md border border-teal-500/20">
              {callStatus === 'waiting' ? 'Waiting' : callStatus === 'connected' ? 'Connected' : callStatus}
            </span>
          </div>
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-6 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-30 flex items-center justify-center gap-3 sm:gap-4 bg-slate-900/90 backdrop-blur-lg px-4 py-3.5 sm:px-6 sm:py-4 rounded-3xl border border-slate-800/80 shadow-2xl max-w-sm mx-auto md:max-w-none">
          {/* Mute/Unmute Mic */}
          <button
            onClick={toggleMute}
            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-rose-500/25 text-rose-450 border border-rose-500/40 hover:bg-rose-500/35'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Switch Camera (Flip) - Only if hardware camera is active */}
          {localStream && !localStream.animInterval && (
            <button
              onClick={switchCamera}
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center justify-center transition-all"
              title="Switch Camera"
            >
              <RefreshCw size={18} className={!isFrontCamera ? 'rotate-180 transition-transform duration-300' : 'transition-transform duration-300'} />
            </button>
          )}

          {/* Camera On/Off */}
          <button
            onClick={toggleCam}
            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center transition-all ${
              isCamOff
                ? 'bg-rose-500/25 text-rose-455 border border-rose-500/40 hover:bg-rose-500/35'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title={isCamOff ? 'Turn Cam On' : 'Turn Cam Off'}
          >
            {isCamOff ? <VideoOff size={18} /> : <Video size={18} />}
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="h-11 w-16 sm:h-12 sm:w-20 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-950/40 transition-all hover:scale-105 active:scale-95 border border-rose-500/40"
            title="End Call"
          >
            <PhoneOff size={18} className="rotate-[135deg]" />
          </button>
        </div>

      </div>
    </PageWrapper>
  );
}
