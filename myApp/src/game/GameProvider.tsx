import React, { useCallback, useEffect, useReducer } from 'react';
import PropTypes from 'prop-types';
import { getLogger } from '../core';
import { gameProps } from './gameProps';
import { createGame, getGames, newWebSocket, updateGame } from './gameApi';

const log = getLogger('GameProvider');

type SaveGameFn = (game: gameProps) => Promise<any>;

export interface GamesState {
    games?: gameProps[],
    fetching: boolean,
    fetchingError?: Error | null,
    saving: boolean,
    savingError?: Error | null,
    saveGame?: SaveGameFn,
}

interface ActionProps {
    type: string,
    payload?: any,
}

const initialState: GamesState = {
    fetching: false,
    saving: false,
};

const FETCH_ITEMS_STARTED = 'FETCH_ITEMS_STARTED';
const FETCH_ITEMS_SUCCEEDED = 'FETCH_ITEMS_SUCCEEDED';
const FETCH_ITEMS_FAILED = 'FETCH_ITEMS_FAILED';
const SAVE_ITEM_STARTED = 'SAVE_ITEM_STARTED';
const SAVE_ITEM_SUCCEEDED = 'SAVE_ITEM_SUCCEEDED';
const SAVE_ITEM_FAILED = 'SAVE_ITEM_FAILED';

const reducer: (state: GamesState, action: ActionProps) => GamesState =
    (state, { type, payload }) => {
        switch (type) {
            case FETCH_ITEMS_STARTED:
                return { ...state, fetching: true, fetchingError: null };
            case FETCH_ITEMS_SUCCEEDED:
                return { ...state, games: payload.games, fetching: false };
            case FETCH_ITEMS_FAILED:
                return { ...state, fetchingError: payload.error, fetching: false };
            case SAVE_ITEM_STARTED:
                return { ...state, savingError: null, saving: true };
            case SAVE_ITEM_SUCCEEDED:
                const games = [...(state.games || [])];
                const game = payload.game;
                const index = games.findIndex(it => it.id === game.id);
                if (index === -1) {
                    games.splice(0, 0, game);
                } else {
                    games[index] = game;
                }
                return { ...state, games, saving: false };
            case SAVE_ITEM_FAILED:
                return { ...state, savingError: payload.error, saving: false };
            default:
                return state;
        }
    };

export const GameContext = React.createContext<GamesState>(initialState);

interface GameProviderProps {
    children: PropTypes.ReactNodeLike,
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
    log("we good");
    const [state, dispatch] = useReducer(reducer, initialState);
    const { games, fetching, fetchingError, saving, savingError } = state;
    useEffect(getGamesEffect, []);
    useEffect(wsEffect, []);
    const saveGame = useCallback<SaveGameFn>(saveGameCallback, []);
    const value = { games, fetching, fetchingError, saving, savingError, saveGame };
    log('returns');
    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );

    function getGamesEffect() {
        let canceled = false;
        fetchGames();
        return () => {
            canceled = true;
        }

        async function fetchGames() {
            try {
                log('fetchItems started');
                dispatch({ type: FETCH_ITEMS_STARTED });
                const games = await getGames();
                log('fetchItems succeeded');
                if (!canceled) {
                    dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { games } });
                }
            } catch (error) {
                log('fetchItems failed');
                dispatch({ type: FETCH_ITEMS_FAILED, payload: { error } });
            }
        }
    }

    async function saveGameCallback(game: gameProps) {
        try {
            log('saveGame started');
            dispatch({ type: SAVE_ITEM_STARTED });
            const savedGame = await (game.id ? updateGame(game) : createGame(game));
            log('saveGame succeeded');
            dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { game: savedGame } });
        } catch (error) {
            log('saveGame failed');
            dispatch({ type: SAVE_ITEM_FAILED, payload: { error } });
        }
    }

    function wsEffect() {
        let canceled = false;
        log('wsEffect - connecting');
        const closeWebSocket = newWebSocket(message => {
            if (canceled) {
                return;
            }
            const { event, payload: { game }} = message;
            log(`ws message, game ${event}`);
            if (event === 'created' || event === 'updated') {
                dispatch({ type: SAVE_ITEM_SUCCEEDED, payload: { game } });
            }
        });
        return () => {
            log('wsEffect - disconnecting');
            canceled = true;
            closeWebSocket();
        }
    }
};
