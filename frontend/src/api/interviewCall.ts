import axios from 'axios';

const http = axios.create({
  baseURL: (import.meta.env.VITE_API_URL ?? '/api/v1') + '/public/interviews',
  headers: { 'Content-Type': 'application/json' },
});

export const interviewCallApi = {
  getRoom: (token: string) => http.get(`/t/${token}`).then((r) => r.data.data),
  join: (token: string, body: { role: 'host' | 'guest'; name: string }) =>
    http.post(`/t/${token}/join`, body).then((r) => r.data.data as { peerId: string; peers: Array<{ id: string; role: string; name: string }> }),
  poll: (token: string, peerId: string, after: number) =>
    http.get(`/t/${token}/signal`, { params: { peerId, after } }).then((r) => r.data.data as {
      peers: Array<{ id: string; role: string; name: string }>;
      signals: Array<{ seq: number; from: string; type: 'offer' | 'answer' | 'ice' | 'leave'; payload: any }>;
      lastSeq: number;
    }),
  signal: (token: string, body: { peerId: string; type: 'offer' | 'answer' | 'ice' | 'leave'; payload?: unknown }) =>
    http.post(`/t/${token}/signal`, body).then((r) => r.data.data),
};
