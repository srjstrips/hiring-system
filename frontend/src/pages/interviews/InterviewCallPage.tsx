import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { interviewCallApi } from '@/api/interviewCall';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export default function InterviewCallPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const isHost = searchParams.get('as') === 'hr';

  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [status, setStatus] = useState('Waiting to join…');
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [name, setName] = useState(isHost ? 'Interviewer' : '');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerIdRef = useRef('');
  const lastSeqRef = useRef(0);
  const makingOfferRef = useRef(false);
  const pollTimer = useRef<number | null>(null);
  const remotePeerRef = useRef('');

  useEffect(() => {
    interviewCallApi.getRoom(token).then(setRoom).catch((e) => {
      setError(e.response?.data?.message ?? 'Interview room not found');
    });
    return () => {
      void cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const cleanup = async () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = null;
    if (peerIdRef.current) {
      try { await interviewCallApi.signal(token, { peerId: peerIdRef.current, type: 'leave' }); } catch { /* ignore */ }
    }
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const ensurePc = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    streamRef.current?.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (remoteVideoRef.current && stream) remoteVideoRef.current.srcObject = stream;
      setStatus('Connected');
    };
    pc.onicecandidate = (ev) => {
      if (!ev.candidate || !peerIdRef.current) return;
      void interviewCallApi.signal(token, { peerId: peerIdRef.current, type: 'ice', payload: ev.candidate });
    };
    pcRef.current = pc;
    return pc;
  };

  const startPolling = () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = window.setInterval(async () => {
      try {
        const data = await interviewCallApi.poll(token, peerIdRef.current, lastSeqRef.current);
        lastSeqRef.current = data.lastSeq;
        const others = data.peers.filter((p) => p.id !== peerIdRef.current);
        if (others.length === 0) {
          setStatus('Waiting for the other participant…');
        } else if (!remotePeerRef.current) {
          remotePeerRef.current = others[0].id;
          setStatus(`Connecting to ${others[0].name}…`);
          const shouldOffer = peerIdRef.current < others[0].id;
          if (shouldOffer && !makingOfferRef.current) {
            makingOfferRef.current = true;
            const pc = ensurePc();
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await interviewCallApi.signal(token, { peerId: peerIdRef.current, type: 'offer', payload: offer });
          }
        }

        for (const sig of data.signals) {
          const pc = ensurePc();
          if (sig.type === 'offer' && sig.payload) {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await interviewCallApi.signal(token, { peerId: peerIdRef.current, type: 'answer', payload: answer });
          }
          if (sig.type === 'answer' && sig.payload) {
            await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
          }
          if (sig.type === 'ice' && sig.payload) {
            try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload)); } catch { /* ignore */ }
          }
          if (sig.type === 'leave') {
            remotePeerRef.current = '';
            setStatus('The other participant left. Waiting…');
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
          }
        }
      } catch (e: any) {
        if (e.response?.status === 409) setError('Session expired. Refresh to rejoin.');
      }
    }, 900);
  };

  const join = async () => {
    setJoining(true);
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      const joined = await interviewCallApi.join(token, {
        role: isHost ? 'host' : 'guest',
        name: name.trim() || (isHost ? 'Interviewer' : 'Candidate'),
      });
      peerIdRef.current = joined.peerId;
      lastSeqRef.current = 0;
      setInCall(true);
      setStatus('Waiting for the other participant…');
      startPolling();
    } catch (e: any) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setError(e.response?.data?.message ?? e.message ?? 'Could not start camera/microphone');
    } finally {
      setJoining(false);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
    setCameraOff(next);
  };

  const leave = async () => {
    await cleanup();
    setInCall(false);
    setStatus('You left the call');
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
          <p className="text-xs uppercase tracking-widest text-orange-400">HireFlow video interview</p>
          <h1 className="text-2xl font-bold">{room?.title ?? 'Video interview'}</h1>
          <p className="text-sm text-zinc-400">
            {room?.jobTitle} · Round {room?.round} · {room?.candidateName}
          </p>
        </div>

        {!inCall ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 max-w-md space-y-4">
            <p className="text-sm text-zinc-300">
              Join this HireFlow video room. Allow camera and microphone when asked.
            </p>
            <input
              className="w-full rounded-md bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
              placeholder={isHost ? 'Your name (HR / interviewer)' : 'Your name'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={join} disabled={joining}>
              {joining ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Joining…</> : 'Join video call'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">{status}</p>
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="absolute bottom-3 right-3 w-36 h-24 object-cover rounded-lg border border-white/20 bg-zinc-900"
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={toggleMute}>{muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>
              <Button variant="outline" onClick={toggleCamera}>{cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}</Button>
              <Button variant="destructive" onClick={leave}><PhoneOff className="h-4 w-4 mr-1" /> Leave</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
