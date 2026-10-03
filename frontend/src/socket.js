import { io } from 'socket.io-client';
import { API_URL } from './apiUrl';

export function connectSocket(token) {
  return io(API_URL, {
    auth: { token },
    autoConnect: true,
  });
}
