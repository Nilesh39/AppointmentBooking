import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Loader2, User, RefreshCw, RotateCcw } from 'lucide-react';
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
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const [iceState, setIceState] = useState('new'); // Track ICE connection state for debugging

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const remoteStreamRef = useRef(null); // Keep ref to accumulate tracks into single stream
  const localStreamRef = useRef(null);  // Keep ref to avoid stale closures in callbacks

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
      remoteVideoRef.current.play()
        .then(() => {
          setShowPlayOverlay(false);
        })
        .catch(err => {
          console.warn('Remote video play blocked (autoplay restriction):', err);
          setShowPlayOverlay(true);
        });
    }
  }, [remoteStream]);

  // Manual play handler for autoplay-blocked browsers (iOS Safari, etc.)
  const handleStartAudioManual = useCallback(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play()
        .then(() => {
          setShowPlayOverlay(false);
          toast.success('Audio & Video stream connected!');
        })
        .catch(err => {
          console.error('Manual audio play click failed:', err);
          toast.error('Could not start stream. Please reload the page.');
        });
    }
  }, []);

  const cleanupCall = useCallback(() => {
    const currentStream = localStreamRef.current;
    if (currentStream) {
      console.log('[WebRTC] Stopping all local stream tracks in cleanupCall');
      currentStream.getTracks().forEach((track) => track.stop());
      if (currentStream.animInterval) {
        clearInterval(currentStream.animInterval);
      }
    }
    if (pcRef.current) {
      console.log('[WebRTC] Closing peer connection in cleanupCall');
      pcRef.current.close();
      pcRef.current = null;
    }
    remoteStreamRef.current = null;
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []); // Depend on nothing as we use refs to prevent stale closure bugs

  // Full page reload for stuck/frozen states
  const handleReloadCall = useCallback(() => {
    cleanupCall();
    window.location.reload();
  }, [cleanupCall]);

  // STUN + TURN servers configuration for NAT traversal
  // TURN servers are critical for connections behind symmetric NAT (mobile networks, corporate firewalls)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // Free TURN relay servers for NAT traversal when STUN fails
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 10,
  };

  useEffect(() => {
    if (!user) return;
    
    // Ensure socket is connected
    connectSocket(user._id);

    // Initialize media stream
    const initMedia = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera and Microphone APIs are not supported in this browser context (non-secure HTTP connection).');
        }
        
        let stream;
        try {
          // Attempt to get both video and audio
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
            }, 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          });
        } catch (mediaErr) {
          console.warn('Failed to acquire both audio and video, trying video-only first:', mediaErr);
          try {
            // Attempt to get video only
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            toast('Microphone is unavailable. Video call started without audio.', { icon: '⚠️' });
          } catch (videoErr) {
            try {
              // Attempt to get audio only
              stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
              toast('Camera is unavailable. Call started with audio only.', { icon: '⚠️' });
            } catch (audioErr) {
              // Both failed, throw final error
              throw new Error('Unable to access any camera or microphone hardware. Permissions might be denied.');
            }
          }
        }
        
        setLocalStream(stream);
        localStreamRef.current = stream; // Keep ref updated
        setCallStatus('waiting');
      } catch (err) {
        console.warn('Error accessing physical media devices, falling back to mock stream:', err);
        
        // Show context-specific error toast
        if (!window.isSecureContext) {
          toast.error('Security Block: WebRTC requires HTTPS on mobile. Loading virtual consult card...', { duration: 6000 });
        } else {
          toast.error(`${err.message || 'Camera/Mic blocked.'} Loading virtual consult card...`, { duration: 6000 });
        }
        
        try {
          const mockStream = createMockStream();
          setLocalStream(mockStream);
          localStreamRef.current = mockStream; // Keep ref updated
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
    console.log(`[WebRTC] Local user joined call room: ${appointmentId}`);

    const iceCandidatesQueue = [];

    const processIceQueue = async () => {
      console.log(`[WebRTC] Processing queued ICE candidates: ${iceCandidatesQueue.length}`);
      while (iceCandidatesQueue.length > 0) {
        const candidate = iceCandidatesQueue.shift();
        try {
          if (pcRef.current) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[WebRTC] Processed queued ICE candidate successfully');
          }
        } catch (err) {
          console.error('[WebRTC] Error processing queued ICE candidate:', err);
        }
      }
    };

    const setupPeerConnection = () => {
      // Close any existing peer connection first
      if (pcRef.current) {
        console.log('[WebRTC] Closing existing peer connection in setupPeerConnection');
        pcRef.current.close();
        pcRef.current = null;
      }

      console.log('[WebRTC] Initializing new RTCPeerConnection');
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      // Add local tracks to peer connection
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
        console.log(`[WebRTC] Added local track to peer connection: kind=${track.kind}, id=${track.id}`);
      });

      // Handle remote stream tracks - accumulate into single MediaStream
      pc.ontrack = (event) => {
        console.log(`[WebRTC] Remote track received: kind=${event.track.kind}, id=${event.track.id}`);
        
        const remoteStreamInstance = event.streams[0] || new MediaStream();
        
        if (!event.streams[0]) {
          if (!remoteStreamRef.current) {
            remoteStreamRef.current = new MediaStream();
          }
          const hasTrack = remoteStreamRef.current.getTracks().some(t => t.id === event.track.id);
          if (!hasTrack) {
            remoteStreamRef.current.addTrack(event.track);
          }
        } else {
          remoteStreamRef.current = remoteStreamInstance;
        }

        // CRITICAL FIX: Create a new MediaStream instance from the tracks to force React state update.
        // This guarantees that React triggers a re-render, re-binding the updated stream to the video element.
        const updatedStream = new MediaStream(remoteStreamRef.current.getTracks());
        setRemoteStream(updatedStream);
        setCallStatus('connected');
        console.log(`[WebRTC] Remote stream updated. Current tracks:`, updatedStream.getTracks().map(t => t.kind));
      };

      // Handle ice candidates generated locally
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`[WebRTC] Local ICE candidate generated: type=${event.candidate.type || 'unknown'}, candidate=${event.candidate.candidate.substring(0, 30)}...`);
          socket.emit('webrtc_ice_candidate', {
            room: appointmentId,
            candidate: event.candidate,
          });
        }
      };

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log('[WebRTC] ICE Connection State Change:', state);
        setIceState(state);

        if (state === 'connected' || state === 'completed') {
          setCallStatus('connected');
        } else if (state === 'failed') {
          console.warn('[WebRTC] ICE connection failed — likely NAT traversal issue');
          toast.error('Connection failed. Tap "Reload" to retry.', { duration: 5000 });
          setCallStatus('disconnected');
        } else if (state === 'disconnected') {
          console.log('[WebRTC] ICE connection disconnected');
          toast('Connection interrupted. Attempting to reconnect...', { icon: '⏳' });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection State Change:', pc.connectionState);
        switch (pc.connectionState) {
          case 'connected':
            setCallStatus('connected');
            break;
          case 'disconnected':
            toast('Peer connection interrupted...', { icon: '⏳' });
            break;
          case 'failed':
            setCallStatus('disconnected');
            toast.error('Connection failed. Please reload to retry.');
            break;
          case 'closed':
            setCallStatus('disconnected');
            break;
          default:
            break;
        }
      };

      // Log ICE gathering state for debugging
      pc.onicegatheringstatechange = () => {
        console.log('[WebRTC] ICE Gathering State Change:', pc.iceGatheringState);
      };
    };

    setupPeerConnection();

    // Socket Event Listeners for signaling
    socket.on('user_joined_call', async (socketId) => {
      console.log('[WebRTC] Signaling: user_joined_call received, remote peer socket ID:', socketId);
      setCallStatus('connecting');
      try {
        if (!pcRef.current) {
          console.log('[WebRTC] PeerConnection is null, initializing it before creating offer');
          setupPeerConnection();
        }
        if (pcRef.current) {
          const offer = await pcRef.current.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pcRef.current.setLocalDescription(offer);
          socket.emit('webrtc_offer', { room: appointmentId, offer });
          console.log('[WebRTC] Signaling: Offer created and sent to room');
        }
      } catch (err) {
        console.error('[WebRTC] Error creating offer:', err);
        toast.error('Failed to create call offer. Please reload.');
      }
    });

    socket.on('webrtc_offer', async (offer) => {
      console.log('[WebRTC] Signaling: Received offer from remote peer');
      setCallStatus('connecting');
      try {
        if (!pcRef.current) {
          console.log('[WebRTC] PeerConnection is null, initializing it before handling offer');
          setupPeerConnection();
        }
        
        if (pcRef.current) {
          // If signaling state is not stable, we need to handle collisions
          if (pcRef.current.signalingState !== 'stable') {
            console.warn('[WebRTC] Received offer in non-stable state:', pcRef.current.signalingState, '. Re-initializing peer connection.');
            setupPeerConnection();
          }
          
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          console.log('[WebRTC] Remote description (Offer) set successfully');
          
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socket.emit('webrtc_answer', { room: appointmentId, answer });
          console.log('[WebRTC] Signaling: Answer created and sent to room');
          
          await processIceQueue();
        }
      } catch (err) {
        console.error('[WebRTC] Error handling offer:', err);
        toast.error('Failed to process call offer. Please reload.');
      }
    });

    socket.on('webrtc_answer', async (answer) => {
      console.log('[WebRTC] Signaling: Received answer from remote peer');
      try {
        if (pcRef.current) {
          if (pcRef.current.signalingState === 'have-local-offer') {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('[WebRTC] Remote description (Answer) set successfully');
            await processIceQueue();
          } else {
            console.warn('[WebRTC] Received answer in unexpected state:', pcRef.current.signalingState);
          }
        } else {
          console.warn('[WebRTC] Received answer but pcRef.current is null');
        }
      } catch (err) {
        console.error('[WebRTC] Error handling answer:', err);
      }
    });

    socket.on('webrtc_ice_candidate', async (candidate) => {
      try {
        if (candidate) {
          console.log('[WebRTC] Signaling: Received remote ICE candidate:', candidate.candidate ? candidate.candidate.substring(0, 30) + '...' : 'null');
          if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[WebRTC] Remote ICE candidate added successfully');
          } else {
            console.log('[WebRTC] Remote description not set yet, queuing remote ICE candidate');
            iceCandidatesQueue.push(candidate);
          }
        }
      } catch (err) {
        // Non-fatal: some ICE candidates may arrive after connection is established
        console.warn('[WebRTC] Error adding ICE candidate (non-fatal):', err.message);
      }
    });

    socket.on('user_left_call', () => {
      console.log('[WebRTC] Signaling: user_left_call received');
      toast.error('The other user has left the call.');
      setCallStatus('disconnected');
      setRemoteStream(null);
      remoteStreamRef.current = null;
      if (pcRef.current) {
        console.log('[WebRTC] Closing and nullifying PeerConnection on remote user departure');
        pcRef.current.close();
        pcRef.current = null;
      }
    });

    return () => {
      socket.off('user_joined_call');
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('user_left_call');
      if (socket) {
        console.log('[WebRTC] Local user leaving call room:', appointmentId);
        socket.emit('leave_call', appointmentId);
      }
    };
  }, [socket, localStream, appointmentId]);



  const handleEndCall = () => {
    cleanupCall();
    toast.success('Call ended');
    const returnPath = user?.role === 'doctor' ? '/doctor/dashboard' : '/patient/appointments';
    navigate(returnPath);
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        console.log(`[WebRTC] Audio track enabled state toggled to: ${audioTrack.enabled}`);
      } else {
        toast.error('No microphone track available');
      }
    }
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamOff(!videoTrack.enabled);
        console.log(`[WebRTC] Video track enabled state toggled to: ${videoTrack.enabled}`);
      } else {
        toast.error('No camera track available');
      }
    }
  };

  const switchCamera = async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newFacingMode = isFrontCamera ? 'environment' : 'user';
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: newFacingMode } },
        audio: false
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) throw new Error('No video track');

      const oldVideoTrack = stream.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        stream.removeTrack(oldVideoTrack);
      }

      stream.addTrack(newVideoTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(e => console.log(e));
      }

      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
          console.log('[WebRTC] Swapped video sender track dynamically');
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
          const oldVideoTrack = stream.getVideoTracks()[0];
          if (oldVideoTrack) {
            oldVideoTrack.stop();
            stream.removeTrack(oldVideoTrack);
          }
          stream.addTrack(newVideoTrack);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(e => console.log(e));
          }
          if (pcRef.current) {
            const senders = pcRef.current.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if (videoSender) {
              await videoSender.replaceTrack(newVideoTrack);
              console.log('[WebRTC] Swapped video sender track dynamically (fallback)');
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
                  <p className="text-xs text-slate-500">Share the appointment link with the other person</p>
                </>
              ) : callStatus === 'connecting' ? (
                <>
                  <Loader2 className="animate-spin text-teal-400" size={44} />
                  <p className="text-base font-semibold tracking-wide text-teal-200">Establishing connection...</p>
                  <p className="text-xs text-slate-500">Negotiating secure P2P media channel</p>
                </>
              ) : callStatus === 'disconnected' ? (
                <>
                  <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-rose-800/40 flex items-center justify-center text-rose-400 shadow-md">
                    <PhoneOff size={28} />
                  </div>
                  <p className="text-base font-semibold text-slate-300 tracking-wide">Call Disconnected</p>
                  <p className="text-xs text-slate-500">The connection was lost or the other person left</p>
                  <button
                    onClick={handleReloadCall}
                    className="mt-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Reconnect Call
                  </button>
                </>
              ) : (
                <>
                  <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-md">
                    <User size={30} />
                  </div>
                  <p className="text-base font-semibold text-slate-350 tracking-wide">Call is not active</p>
                  <button
                    onClick={handleReloadCall}
                    className="mt-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-lg transition-all flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Retry Connection
                  </button>
                </>
              )}
            </div>
          )}

          {/* Autoplay Blocked Overlay - Tap to connect audio/video stream */}
          {showPlayOverlay && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center animate-bounce">
                <Mic size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Audio Autoplay Blocked</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">Your browser blocked automatic audio playback. Tap the button below to connect the audio & video stream.</p>
              </div>
              <button
                onClick={handleStartAudioManual}
                className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-900/40 transition-all hover:scale-105 active:scale-95"
              >
                Connect Audio & Video
              </button>
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
          <div className="flex items-center gap-2">
            {/* Reload button in header */}
            <button
              onClick={handleReloadCall}
              className="h-7 w-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700/50"
              title="Reload Call"
            >
              <RotateCcw size={12} />
            </button>
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
