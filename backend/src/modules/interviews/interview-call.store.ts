import { randomUUID } from 'crypto';

export type CallSignalType = 'offer' | 'answer' | 'ice' | 'leave';
export type CallRole = 'host' | 'guest';

type SignalMsg = {
  seq: number;
  from: string;
  type: CallSignalType;
  payload: unknown;
};

type Peer = {
  id: string;
  role: CallRole;
  name: string;
  lastSeen: number;
};

type Room = {
  peers: Map<string, Peer>;
  signals: SignalMsg[];
  seq: number;
};

const rooms = new Map<string, Room>();
const PEER_TTL_MS = 40_000;

function prune(room: Room) {
  const now = Date.now();
  for (const [id, peer] of room.peers) {
    if (now - peer.lastSeen > PEER_TTL_MS) room.peers.delete(id);
  }
}

function getRoom(token: string): Room {
  let room = rooms.get(token);
  if (!room) {
    room = { peers: new Map(), signals: [], seq: 0 };
    rooms.set(token, room);
  }
  return room;
}

function listPeers(room: Room) {
  return [...room.peers.values()].map((p) => ({ id: p.id, role: p.role, name: p.name }));
}

export function joinCallRoom(token: string, role: CallRole, name: string) {
  const room = getRoom(token);
  prune(room);
  if (room.peers.size >= 4) {
    throw new Error('ROOM_FULL');
  }
  const id = randomUUID();
  room.peers.set(id, { id, role, name: name.slice(0, 80) || (role === 'host' ? 'Interviewer' : 'Candidate'), lastSeen: Date.now() });
  return { peerId: id, peers: listPeers(room) };
}

export function pullCallSignals(token: string, peerId: string, after: number) {
  const room = rooms.get(token);
  if (!room) return { peers: [] as ReturnType<typeof listPeers>, signals: [] as SignalMsg[], lastSeq: after };
  const peer = room.peers.get(peerId);
  if (!peer) return { peers: listPeers(room), signals: [] as SignalMsg[], lastSeq: room.seq, missing: true };
  peer.lastSeen = Date.now();
  prune(room);
  return {
    peers: listPeers(room),
    signals: room.signals.filter((s) => s.seq > after && s.from !== peerId),
    lastSeq: room.seq,
  };
}

export function pushCallSignal(token: string, from: string, type: CallSignalType, payload: unknown) {
  const room = getRoom(token);
  const peer = room.peers.get(from);
  if (!peer) throw new Error('NOT_IN_ROOM');
  peer.lastSeen = Date.now();
  room.seq += 1;
  room.signals.push({ seq: room.seq, from, type, payload });
  if (room.signals.length > 250) room.signals.splice(0, room.signals.length - 250);
  return room.seq;
}

export function leaveCallRoom(token: string, peerId: string) {
  const room = rooms.get(token);
  if (!room) return;
  if (!room.peers.has(peerId)) return;
  room.peers.delete(peerId);
  room.seq += 1;
  room.signals.push({ seq: room.seq, from: peerId, type: 'leave', payload: null });
}
