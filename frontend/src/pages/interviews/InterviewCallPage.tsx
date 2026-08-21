import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { interviewCallApi } from '@/api/interviewCall';
import { interviewsApi } from '@/api/dashboard';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2, UserCircle2, CheckCircle2 } from 'lucide-react';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

async function playVideo(el: HTMLVideoElement | null) {
  if (!el) return;
  try {
    await el.play();
  } catch {
    /* autoplay may be blocked until user gesture; muted local preview usually works */
  }
}

export default function InterviewCallPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const staffToken = (() => {
    try {
      return localStorage.getItem('accessToken');
    } catch {
      return null;
    }
  })();

  const isHost = Boolean(staffToken) || searchParams.get('as') === 'hr';

  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [status, setStatus] = useState('Waiting to join…');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [ending, setEnding] = useState(false);
  const [name, setName] = useState(isHost ? 'Interviewer' : '');
  const [hasLocalVideo, setHasLocalVideo] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerIdRef = useRef('');
  const lastSeqRef = useRef(0);
  const makingOfferRef = useRef(false);
  const pollTimer = useRef<number | null>(null);
  const remotePeerRef = useRef('');
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);

  const safeNavigateBack = () => {
    if (isHost && room?.applicationId) {
      navigate(`/applications/${room.applicationId}`, { replace: true });
      return;
    }
    navigate('/careers/jobs', { replace: true });
  };

  // Attach local preview AFTER the in-call <video> mounts (join used to set srcObject too early).
  useEffect(() => {
    if (!inCall) return;
    const stream = streamRef.current;
    const el = localVideoRef.current;
    if (!stream || !el || cameraOff) return;
    if (el.srcObject !== stream) el.srcObject = stream;
    void playVideo(el);
  }, [inCall, cameraOff, hasLocalVideo]);

  useEffect(() => {
    interviewCallApi
      .getRoom(token, isHost)
      .then((r) => setRoom(r))
      .catch((e) => {
        setError(e.response?.data?.message ?? 'Interview room not found');
      });

    return () => {
      void cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const flushPendingIce = async (pc: RTCPeerConnection) => {
    if (!remoteDescSetRef.current) return;
    const queued = pendingIceRef.current.splice(0);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore stale candidates */
      }
    }
  };

  const resetPeerConnection = () => {
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    makingOfferRef.current = false;
    pendingIceRef.current = [];
    remoteDescSetRef.current = false;
  };

  const cleanup = async () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = null;
    remotePeerRef.current = '';

    const currentPeerId = peerIdRef.current;
    if (currentPeerId) {
      try {
        await interviewCallApi.signal(token, { peerId: currentPeerId, type: 'leave' }, isHost);
      } catch {
        /* ignore */
      }
    }
    resetPeerConnection();

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setHasLocalVideo(false);

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const ensurePc = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);

    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) {
        pc.addTrack(track, stream);
      }
    }

    pc.ontrack = (ev) => {
      const remoteStream = ev.streams[0] ?? new MediaStream([ev.track]);
      const el = remoteVideoRef.current;
      if (el) {
        el.srcObject = remoteStream;
        el.muted = false;
        void playVideo(el);
      }
      setStatus('Connected — you should see and hear each other');
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !peerIdRef.current) return;
      void interviewCallApi.signal(
        token,
        { peerId: peerIdRef.current, type: 'ice', payload: ev.candidate.toJSON() },
        isHost
      );
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') setStatus('Connected — you should see and hear each other');
      if (state === 'disconnected' || state === 'failed') {
        setStatus('Connection interrupted. Waiting to reconnect…');
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const maybeCreateOffer = async (remotePeerId: string) => {
    if (!peerIdRef.current || !remotePeerId) return;
    // Deterministic offerer avoids glare when both join at once.
    const shouldOffer = peerIdRef.current < remotePeerId;
    if (!shouldOffer || makingOfferRef.current) return;

    makingOfferRef.current = true;
    try {
      const pc = ensurePc();
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      await interviewCallApi.signal(
        token,
        { peerId: peerIdRef.current, type: 'offer', payload: pc.localDescription },
        isHost
      );
    } catch (e: any) {
      makingOfferRef.current = false;
      setStatus(e?.message ?? 'Could not start connection. Retrying…');
    }
  };

  const handleSignals = async (signals: Array<{ type: string; payload: any; from: string }>) => {
    for (const sig of signals) {
      const pc = ensurePc();

      if (sig.type === 'offer' && sig.payload) {
        // If we already sent an offer and receive one (glare), the polite peer backs down.
        const polite = peerIdRef.current > (remotePeerRef.current || sig.from);
        if (makingOfferRef.current && !polite) {
          continue;
        }
        if (makingOfferRef.current && polite) {
          await pc.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit).catch(() => undefined);
          makingOfferRef.current = false;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
        remoteDescSetRef.current = true;
        await flushPendingIce(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await interviewCallApi.signal(
          token,
          { peerId: peerIdRef.current, type: 'answer', payload: pc.localDescription },
          isHost
        );
      }

      if (sig.type === 'answer' && sig.payload) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          remoteDescSetRef.current = true;
          await flushPendingIce(pc);
        }
      }

      if (sig.type === 'ice' && sig.payload) {
        if (!remoteDescSetRef.current || !pc.remoteDescription) {
          pendingIceRef.current.push(sig.payload);
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
          } catch {
            /* ignore */
          }
        }
      }

      if (sig.type === 'leave') {
        remotePeerRef.current = '';
        setStatus('The other participant left. Waiting…');
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        resetPeerConnection();
      }
    }
  };

  const startPolling = () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = window.setInterval(async () => {
      try {
        const data = await interviewCallApi.poll(token, peerIdRef.current, lastSeqRef.current, isHost);
        lastSeqRef.current = data.lastSeq;

        const others = data.peers.filter((p: any) => p.id !== peerIdRef.current);
        if (others.length === 0) {
          if (remotePeerRef.current) {
            remotePeerRef.current = '';
            setStatus('Waiting for the other participant…');
          } else {
            setStatus('Waiting for the other participant…');
          }
        } else {
          const remoteId = others[0].id;
          if (remotePeerRef.current !== remoteId) {
            remotePeerRef.current = remoteId;
            setStatus(`Connecting to ${others[0].name}…`);
            await maybeCreateOffer(remoteId);
          }
        }

        if (data.signals.length) {
          await handleSignals(data.signals);
        }
      } catch (e: any) {
        const statusCode = e?.response?.status;
        if (statusCode === 409) {
          setError('Session expired. Refresh to rejoin.');
          return;
        }
        if (statusCode === 410) {
          setStatus(e?.response?.data?.message ?? 'Interview ended.');
          setInCall(false);
          void cleanup().finally(() => safeNavigateBack());
          return;
        }
        if (statusCode === 403 || statusCode === 401) {
          setError('You are not allowed to join this interview.');
          return;
        }
        // Transient network errors — keep polling.
      }
    }, 800);
  };

  const getMediaWithFallback = async () => {
    const videoConstraints: MediaTrackConstraints = {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err: any) {
      try {
        setCameraOff(true);
        setStatus('Camera unavailable. Joining with microphone only…');
        return await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch {
        throw err;
      }
    }
  };

  const join = async () => {
    setJoining(true);
    setError('');

    try {
      if (!window.isSecureContext && location.hostname !== 'localhost') {
        throw new Error('Camera/mic require HTTPS (or localhost). Open this page over a secure URL.');
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera/microphone access.');
      }

      setStatus('Requesting camera and microphone…');
      const stream = await getMediaWithFallback();
      streamRef.current = stream;

      const hasVideo = stream.getVideoTracks().length > 0;
      setHasLocalVideo(hasVideo);
      if (!hasVideo) setCameraOff(true);

      const joined = await interviewCallApi.join(
        token,
        {
          role: isHost ? 'host' : 'guest',
          name: name.trim() || (isHost ? 'Interviewer' : 'Candidate'),
        },
        isHost
      );

      peerIdRef.current = joined.peerId;
      lastSeqRef.current = 0;
      remotePeerRef.current = '';
      makingOfferRef.current = false;
      setInCall(true);
      setStatus('Waiting for the other participant…');

      // If the other person is already in the room, start negotiating immediately.
      const others = (joined.peers ?? []).filter((p) => p.id !== joined.peerId);
      if (others[0]) {
        remotePeerRef.current = others[0].id;
        setStatus(`Connecting to ${others[0].name}…`);
        await maybeCreateOffer(others[0].id);
      }

      startPolling();
    } catch (e: any) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setHasLocalVideo(false);
      const msg =
        e?.name === 'NotAllowedError'
          ? 'Camera/microphone permission denied. Allow access in the browser address bar and try again.'
          : e?.name === 'NotFoundError'
            ? 'No camera or microphone was found on this device.'
            : e.response?.data?.message ?? e?.message ?? 'Could not start camera/microphone';
      setError(msg);
    } finally {
      setJoining(false);
    }
  };

  const toggleMute = () => {
    const audioTracks = streamRef.current?.getAudioTracks() ?? [];
    if (!audioTracks.length) return;
    const next = !muted;
    audioTracks.forEach((t) => {
      t.enabled = !next;
    });
    setMuted(next);
  };

  const toggleCamera = () => {
    const videoTracks = streamRef.current?.getVideoTracks() ?? [];
    if (!videoTracks.length) {
      setError('No camera track available. Rejoin and allow camera access.');
      return;
    }
    const next = !cameraOff;
    videoTracks.forEach((t) => {
      t.enabled = !next;
    });
    setCameraOff(next);
  };

  const leave = async () => {
    await cleanup();
    setInCall(false);
    safeNavigateBack();
  };

  const endInterview = async () => {
    if (!room?.id) return;
    const ok = window.confirm(
      'End this interview?\nThis will mark the interview as completed for both participants.'
    );
    if (!ok) return;

    setEnding(true);
    try {
      await interviewsApi.updateStatus(room.id, { status: 'COMPLETED' });
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to end interview');
      setEnding(false);
      return;
    }

    await cleanup();
    setInCall(false);
    setEnding(false);
    safeNavigateBack();
  };

  if (error && !room) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-orange-400">SRJ video interview</p>
          <h1 className="text-2xl font-bold">{room?.title ?? 'Video interview'}</h1>
          <p className="text-sm text-zinc-400">
            {room?.jobTitle} · Round {room?.round} · {room?.candidateName}
          </p>
        </div>

        {!inCall ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 max-w-md space-y-4">
            <p className="text-sm text-zinc-300">
              Join this video room. When prompted, allow <strong>camera</strong> and <strong>microphone</strong> so
              both of you can see and hear each other.
            </p>
            <input
              className="w-full rounded-md bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
              placeholder={isHost ? 'Your name (HR / interviewer)' : 'Your name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={join} disabled={joining}>
              {joining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining…
                </>
              ) : (
                'Join video call'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">{status}</p>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {!cameraOff && hasLocalVideo ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute bottom-3 right-3 w-40 h-28 object-cover rounded-lg border border-white/20 bg-zinc-900 -scale-x-100"
                />
              ) : (
                <div className="absolute bottom-3 right-3 flex h-28 w-40 flex-col items-center justify-center gap-1 rounded-lg border border-white/20 bg-zinc-900">
                  <UserCircle2 className="h-8 w-8 text-orange-400" />
                  <span className="text-[10px] text-zinc-400">{cameraOff ? 'Camera off' : 'No camera'}</span>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-2 flex-wrap">
              <Button variant="outline" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button variant="outline" onClick={toggleCamera} title={cameraOff ? 'Turn camera on' : 'Turn camera off'}>
                {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </Button>

              {isHost && (
                <Button
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={endInterview}
                  disabled={ending}
                  title="End interview and mark as completed"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" /> End Interview
                </Button>
              )}

              <Button variant="destructive" onClick={leave} disabled={ending}>
                <PhoneOff className="h-4 w-4 mr-1" /> Leave
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
