import axios from 'axios';
import { getLogger } from '../core';
import { gameProps } from './gameProps';

const log = getLogger('gameApi');

const baseUrl = 'localhost:3000';
const gameUrl = `http://${baseUrl}/game`;

interface ResponseProps<T> {
    data: T;
}

function withLogs<T>(promise: Promise<ResponseProps<T>>, fnName: string): Promise<T> {
    log(`${fnName} - started`);
    return promise
        .then(res => {
            log(`${fnName} - succeeded`);
            return Promise.resolve(res.data);
        })
        .catch(err => {
            log(`${fnName} - failed`);
            return Promise.reject(err);
        });
}

const config = {
    headers: {
        'Content-Type': 'application/json'
    }
};

export const getGames: () => Promise<gameProps[]> = () => {
    return withLogs(axios.get(gameUrl, config), 'getGames');
}

export const createGame: (game: gameProps) => Promise<gameProps[]> = game => {
    return withLogs(axios.post(gameUrl, game, config), 'createGame');
}

export const updateGame: (game: gameProps) => Promise<gameProps[]> = game => {
    return withLogs(axios.put(`${gameUrl}/${game.id}`, game, config), 'updateGame');
}

interface MessageData {
    event: string;
    payload: {
        game: gameProps;
    };
}

export const newWebSocket = (onMessage: (data: MessageData) => void) => {
    const ws = new WebSocket(`ws://${baseUrl}`)
    ws.onopen = () => {
        log('web socket onopen');
    };
    ws.onclose = () => {
        log('web socket onclose');
    };
    ws.onerror = error => {
        log('web socket onerror', error);
    };
    ws.onmessage = messageEvent => {
        log('web socket onmessage');
        onMessage(JSON.parse(messageEvent.data));
    };
    return () => {
        ws.close();
    }
}