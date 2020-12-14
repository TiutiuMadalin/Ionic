import React, {useCallback, useContext, useEffect, useReducer} from 'react';
import PropTypes from 'prop-types';
import { getLogger } from '../core';
import { gameProps } from './gameProps';
import { createGame, getGames, newWebSocket, updateGame } from './gameApi';
import { AuthContext } from '../auth';
import { Plugins } from '@capacitor/core';

const log = getLogger('GameProvider');

type SaveGameFn = (game: gameProps) => Promise<any>;
type GetNextFn = ($event: CustomEvent<void>, games?: gameProps[]) => Promise<any>;

export interface GamesState {
    games?: gameProps[],
    fetching: boolean,
    fetchingError?: Error | null,
    saving: boolean,
    savingError?: Error | null,
    disableInfiniteScroll: boolean,
    saveGame?: SaveGameFn,
    getNext?: GetNextFn,
}

interface ActionProps {
    type: string,
    payload?: any,
}

const initialState: GamesState = {
    disableInfiniteScroll:false,
    fetching: false,
    saving: false,
};

const FETCH_ITEMS_STARTED = 'FETCH_ITEMS_STARTED';
const FETCH_ITEMS_SUCCEEDED = 'FETCH_ITEMS_SUCCEEDED';
const FETCH_ITEMS_FAILED = 'FETCH_ITEMS_FAILED';
const SAVE_ITEM_STARTED = 'SAVE_ITEM_STARTED';
const SAVE_ITEM_SUCCEEDED = 'SAVE_ITEM_SUCCEEDED';
const SAVE_ITEM_FAILED = 'SAVE_ITEM_FAILED';
const MORE_ITEMS = 'MORE_ITEMS';

const reducer: (state: GamesState, action: ActionProps) => GamesState =
     (state, {type, payload}) => {
        switch (type) {
            case MORE_ITEMS:
                return {...state, games: payload.games}
            case FETCH_ITEMS_STARTED:
                return {...state, fetching: true, fetchingError: null};
            case FETCH_ITEMS_SUCCEEDED:
                return {...state, games: payload.games, fetching: false};
            case FETCH_ITEMS_FAILED:
                return {...state, fetchingError: payload.error, fetching: false};
            case SAVE_ITEM_STARTED:
                return {...state, savingError: null, saving: true};
            case SAVE_ITEM_SUCCEEDED:
                const games = [...(state.games || [])];
                const game = payload.game;
                const index = games.findIndex(it => it._id === game._id);
                if (index === -1) {
                    games.splice(0, 0, game);
                } else {
                    games[index] = game;
                }
                return {...state, games, saving: false};
            case SAVE_ITEM_FAILED:
                return {...state, savingError: payload.error, saving: false};
            default:
                return state;
        }
    };

export const GameContext = React.createContext<GamesState>(initialState);

interface GameProviderProps {
    children: PropTypes.ReactNodeLike,
}
let max:number;
export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
    const { token } = useContext(AuthContext);
    const [state, dispatch] = useReducer(reducer, initialState);
    const { games, fetching, fetchingError, saving, savingError,disableInfiniteScroll } = state;
    useEffect(getGamesEffect, [token]);
    useEffect(wsEffect, [token]);
    const saveGame = useCallback<SaveGameFn>(saveGameCallback, [token]);
    const getNext = useCallback<GetNextFn>(getMoreGames, [token]);
    const value = { games, fetching, fetchingError, saving, savingError, saveGame ,getNext,disableInfiniteScroll};
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
            if (!token?.trim()) {
                return;
            }
            try {
                log('fetchItems started');
                dispatch({ type: FETCH_ITEMS_STARTED });
                let games = await getGames(token);
                const {Storage} = Plugins;
                log('fetchItems succeeded');
                if (!canceled) {
                    max=3;
                    if(games.length>max)
                        games=games.slice(0,max);
                    dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { games } });
                    await Storage.set({
                        key: 'items',
                        value: JSON.stringify(games)
                    });
                }
            } catch (error) {
                const {Storage} = Plugins;
                const itemsS = await Storage.get({key: 'items'});
                if(itemsS.value){
                    log('am gasit in local storege');
                    const parsedValue = JSON.parse(itemsS.value);
                    dispatch({ type: FETCH_ITEMS_SUCCEEDED, payload: { items: parsedValue } });
                }else {
                    log('fetchItems failed');
                    dispatch({type: FETCH_ITEMS_FAILED, payload: {error}});
                }
            }
        }
    }
    async function getMoreGames($event: CustomEvent<void>, games?: gameProps[]){


        let lista = await getGames(token);
        if(games) {
            if (lista.length-games.length > max) {
                lista = lista.slice(games.length, lista.length);
            }
            else {
                lista = lista.slice(games.length, games.length+max);
                }
            }


        dispatch({type: MORE_ITEMS, payload: {games: games?.concat(lista)} });


        ($event.target as HTMLIonInfiniteScrollElement).complete();
    }
    async function saveGameCallback(game: gameProps) {
        try {
            log('saveGame started');
            dispatch({ type: SAVE_ITEM_STARTED });
            const savedGame = await (game._id ? updateGame(token,game) : createGame(token,game));
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
        let closeWebSocket: () => void;
        if (token?.trim()) {
            closeWebSocket = newWebSocket(token, message => {
                if (canceled) {
                    return;
                }
                const {event, payload: game} = message;
                log(`ws message, game ${event}`);
                if (event === 'created' || event === 'updated') {
                    dispatch({type: SAVE_ITEM_SUCCEEDED, payload: {game}});
                }
            });
        }
        return () => {
            log('wsEffect - disconnecting');
            canceled = true;
            closeWebSocket?.();
        }
    }
};
