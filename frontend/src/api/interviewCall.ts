import axios from 'axios';

function getAuthToken(preferStaff = false) {
  const staff = localStorage.getItem('accessToken');
  const candidate = localStorage.getItem('candidateAccessToken');
  // Hosts must use the staff JWT; candidates use the career-portal JWT.
  // Preferring candidate always broke HR joins when both tokens existed in the same browser.
  if (preferStaff) return staff || candidate;
  return candidate || staff;
}

const http = axios.create({
  baseURL: (import.meta.env.VITE_API_URL ?? '/api/v1') + '/public/interviews',
  headers: { 'Content-Type': 'application/json' },
});

function withAuth(preferStaff: boolean) {
  return {
    headers: (() => {
      const token = getAuthToken(preferStaff);
      return token ? { Authorization: `Bearer ${token}` } : {};
    })(),
  };
}

export const interviewCallApi = {
  getRoom: (token: string, preferStaff = false) =>
    http.get(`/t/${token}`, withAuth(preferStaff)).then((r) => r.data.data),
  join: (token: string, body: { role: 'host' | 'guest'; name: string }, preferStaff = false) =>
    http
      .post(`/t/${token}/join`, body, withAuth(preferStaff))
      .then(
        (r) =>
          r.data.data as {
            peerId: string;
            peers: Array<{ id: string; role: string; name: string }>;
          }
      ),
  poll: (token: string, peerId: string, after: number, preferStaff = false) =>
    http
      .get(`/t/${token}/signal`, { params: { peerId, after }, ...withAuth(preferStaff) })
      .then(
        (r) =>
          r.data.data as {
            peers: Array<{ id: string; role: string; name: string }>;
            signals: Array<{
              seq: number;
              from: string;
              type: 'offer' | 'answer' | 'ice' | 'leave';
              payload: any;
            }>;
            lastSeq: number;
          }
      ),
  signal: (
    token: string,
    body: { peerId: string; type: 'offer' | 'answer' | 'ice' | 'leave'; payload?: unknown },
    preferStaff = false
  ) => http.post(`/t/${token}/signal`, body, withAuth(preferStaff)).then((r) => r.data.data),
};
