import io from 'socket.io-client';
import { get } from 'svelte/store';
import { BASE_URL } from './generalStore.js';

let socket;

export function getSocket() {
    if (!socket) {
        socket = io(get(BASE_URL), { withCredentials: true });
    }
    return socket;
}