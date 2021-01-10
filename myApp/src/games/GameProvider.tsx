import React, {useCallback, useContext, useEffect, useReducer} from 'react';
import PropTypes from 'prop-types';
import {getLogger} from '../core';
import {GameProps} from './GameProps';
import {createGame, deleteGame, getGame, getGames, getOwners, newWebSocket, updateGame} from './GameApi';
import {AuthContext} from "../auth";
import {Storage} from "@capacitor/core";

const log = getLogger('GameProvider');

type SaveGameFn = (game: GameProps, connected: boolean) => Promise<any>;
type DeleteGameFn = (game: GameProps, connected: boolean) => Promise<any>;
type FetchGamesFn = (owners: string, partialName: string, offset: number, size: number, append: boolean, connected: boolean) => Promise<any>;
type UpdateServerFn = () => Promise<any>;
type FetchOwnersFn = (connected: boolean) => Promise<any>;
type getGameServerFN = (id: number, game: GameProps) => Promise<any>;

export interface GamesState {
    games?: GameProps[],
    fetching: boolean,
    fetchingError?: Error | null,
    saving: boolean,
    savingError?: Error | null,
    _saveGame?: SaveGameFn,
    deleting: boolean,
    deletingError?: Error | null,
    _deleteGame?: DeleteGameFn,
    _fetchGames?: FetchGamesFn,
    append: boolean,
    _fetchOwners?: FetchOwnersFn,
    fetchingOwners: boolean,
    fetchingOwnersError?: Error | null,
    _updateServer?: UpdateServerFn,
    _getGameServer?: getGameServerFN,
    oldGame?: GameProps,
}

interface ActionProps {
    type: string,
    payload?: any,
}

const initialState: GamesState = {
    fetching: false,
    fetchingOwners: false,
    saving: false,
    deleting: false,
    append: false,
    oldGame: undefined,
};

const FETCH_GAMES_STARTED = 'FETCH_GAMES_STARTED';
const FETCH_GAMES_SUCCEEDED = 'FETCH_GAMES_SUCCEEDED';
const FETCH_GAMES_FAILED = 'FETCH_GAMES_FAILED';
const SAVE_GAMES_STARTED = 'SAVE_GAMES_STARTED';
const SAVE_GAMES_SUCCEEDED = 'SAVE_GAMES_SUCCEEDED';
const SAVE_GAME_FAILED = 'SAVE_GAME_FAILED';
const DELETE_GAME_STARTED = 'DELETE_GAME_STARTED';
const DELETE_GAME_SUCCEEDED = 'DELETE_GAME_SUCCEEDED';
const DELETE_GAME_FAILED = 'DELETE_GAME_FAILED';
const FETCH_OWNERS_STARTED = 'FETCH_OWNERS_STARTED';
const FETCH_OWNERS_SUCCEEDED = 'FETCH_OWNERS_SUCCEEDED';
const FETCH_OWNERS_FAILED = 'FETCH_OWNERS_FAILED';
const CONFLICT = 'CONFLICT';
const CONFLICT_SOLVED = 'CONFLICT_SOLVED';


const reducer: (state: GamesState, action: ActionProps) => GamesState =
    (state, {type, payload}) => {
        switch (type) {
            case FETCH_GAMES_STARTED:
                return {...state, fetching: true, fetchingError: null};
            case FETCH_GAMES_SUCCEEDED:
                let oldGames: GameProps[] = [];
                if (payload.append) {
                    oldGames = state.games ? state.games : [];
                }
                const games = oldGames.concat(payload.games);
                return {...state, games: games, fetching: false};
            case FETCH_GAMES_FAILED:
                return {...state, fetchingError: payload.error, fetching: false};
            case SAVE_GAMES_STARTED:
                return {...state, savingError: null, saving: true};
            case SAVE_GAMES_SUCCEEDED: {
                const games = [...(state.games || [])];
                const game = payload.game;
                console.log("here");
                console.log(JSON.stringify(game));
                const index = games.findIndex(it => it._id === game._id);
                if (index === -1) {
                    games.splice(games.length, 0, game);
                } else {
                    games[index] = game;
                }
                return {...state, games: games, saving: false};
            }
            case SAVE_GAME_FAILED:
                return {...state, savingError: payload.error, saving: false};
            case DELETE_GAME_STARTED:
                return {...state, deletingError: null, deleting: true};
            case DELETE_GAME_SUCCEEDED: {
                const games = [...(state.games || [])];
                const game = payload.game;
                const index = games.findIndex(it => it._id === game._id);
                if (index !== -1) {
                    games.splice(index, 1);
                }
                return {...state, games: games, deleting: false};
            }
            case DELETE_GAME_FAILED:
                return {...state, deletingError: payload.error, deleting: false};
            case FETCH_OWNERS_STARTED:
                return {...state, fetchingOwners: true, fetchingOwnersError: null};
            case FETCH_OWNERS_SUCCEEDED:
                return {...state, owners: payload.owners, fetchingOwners: false};
            case FETCH_OWNERS_FAILED:
                return {...state, fetchingOwnersError: payload.error, fetchingOwners: false};
            case CONFLICT: {
                log("CONFLICT: " + JSON.stringify(payload.game));
                return {...state, oldGame: payload.game};
            }
            case CONFLICT_SOLVED: {
                log("CONFLICT_SOLVED");
                return {...state, oldGame: undefined};
            }
            default:
                return state;
        }
    };

export const GameContext = React.createContext<GamesState>(initialState);

interface GameProviderProps {
    children: PropTypes.ReactNodeLike,
}

export const GameProvider: React.FC<GameProviderProps> = ({children}) => {
    const {token, _id} = useContext(AuthContext);
    const [state, dispatch] = useReducer(reducer, initialState);
    const {
        games,
        fetching,
        fetchingError,
        saving,
        savingError,
        deleting,
        deletingError,
        append,
        fetchingOwners,
        oldGame
    } = state;
    useEffect(wsEffect, [token]);
    const _saveGame = useCallback<SaveGameFn>(saveGameCallback, [token]);
    const _deleteGame = useCallback<DeleteGameFn>(deleteGameCallback, [token]);
    const _fetchGames = useCallback<FetchGamesFn>(fetchGames, [token]);
    const _fetchOwners = useCallback<FetchOwnersFn>(fetchOwners, [token]);
    const _updateServer = useCallback<UpdateServerFn>(updateServerCallback, [token]);
    const _getGameServer = useCallback<getGameServerFN>(getGameServer, [token]);

    const value = {
        games, fetching, fetchingError, saving, savingError, _saveGame, _updateServer, _getGameServer,
        deleting, deletingError, _deleteGame, _fetchGames, append, _fetchOwners, fetchingOwners, oldGame
    };
    log('returns');
    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );

    async function getGameServer(id: number, game: GameProps) {
        const oldGame = await getGame(token, id);
        console.log("oldGame" + JSON.stringify(oldGame));
        console.log("version" + game.version);
        if (oldGame.version !== game.version || game.status !== 0)
            dispatch({type: CONFLICT, payload: {game: oldGame}});
    }

    async function updateServerCallback() {
        const allKeys = Storage.keys();
        let promisedGames;
        let i;

        promisedGames = await allKeys.then(function (allKeys) {
            const promises = [];
            for (i = 0; i < allKeys.keys.length; i++) {
                const promiseGame = Storage.get({key: allKeys.keys[i]});
                promises.push(promiseGame);
            }
            return promises;
        });

        for (i = 0; i < promisedGames.length; i++) {
            const promise = promisedGames[i];
            const game = await promise.then(function (it) {
                let object;
                try {
                    object = JSON.parse(it.value!);
                } catch (e) {
                    return null;
                }
                return object;
            });
            try {
                if (game !== null) {
                    if (game.status === 1) {
                        dispatch({type: DELETE_GAME_SUCCEEDED, payload: {game: game}});
                        await Storage.remove({key: game._id});
                        const oldGame = game;
                        delete oldGame._id;
                        oldGame.status = 0;
                        const newGame = await createGame(token, oldGame);
                        dispatch({type: SAVE_GAMES_SUCCEEDED, payload: {game: newGame}});
                        await Storage.set({
                            key: JSON.stringify(newGame._id),
                            value: JSON.stringify(newGame),
                        });
                    } else if (game.status === 2) {
                        game.status = 0;
                        const newGame = await updateGame(token, game);
                        dispatch({type: SAVE_GAMES_SUCCEEDED, payload: {game: newGame}});
                        await Storage.set({
                            key: JSON.stringify(newGame._id),
                            value: JSON.stringify(newGame),
                        });
                    } else if (game.status === 3) {
                        game.status = 0;
                        await deleteGame(token, game);
                        await Storage.remove({key: game._id});
                    }
                }
            } catch (e) {

            }
        }
    }

    async function fetchOwners(connected: boolean) {
        let canceled = false;
        if (!token?.trim()) {
            return;
        }
        try {
            log('fetchGames started');
            if (!connected) {
                throw new Error()
            }
            dispatch({type: FETCH_OWNERS_STARTED});
            const owners = await getOwners(token);
            log('fetchOwners succeeded');
            if (!canceled) {
                dispatch({type: FETCH_OWNERS_SUCCEEDED, payload: {owners}});
                return owners;
            }
        } catch (error) {
            log('fetchOwners failed');
            log('OFFLINE fetchOwners');
            // alert("OFFLINE!");
            let owners = JSON.parse((await Storage.get({
                key: String("owners")
            })).value);
            dispatch({type: FETCH_OWNERS_SUCCEEDED, payload: {owners}});
            return owners;
        }
    }

    async function fetchGames(owners: string, partialName: string, offset: number, size: number, append: boolean, connected: boolean) {
        let canceled = false;
        if (!token?.trim()) {
            return;
        }
        try {
            log('fetchGames started');
            if (!connected) {
                throw new Error()
            }
            dispatch({type: FETCH_GAMES_STARTED});
            const games = await getGames(token, owners, partialName, offset, size);
            log('fetchGames succeeded');
            if (!canceled) {
                dispatch({type: FETCH_GAMES_SUCCEEDED, payload: {games, append}});
                return games.length;
            }
        } catch (error) {
            log('fetchGames failed');
            log('OFFLINE fetchGames');
            // alert("OFFLINE!");
            const storageGames: any[] = [];
            await Storage.keys().then(function (allKeys) {
                allKeys.keys.forEach((key) => {
                    Storage.get({key}).then(function (it) {
                        try {
                            const object = JSON.parse(it.value);
                            if (String(object.userId) === String(_id))
                                storageGames.push(object);
                        } catch (e) {
                        }
                    });
                })
            });
            dispatch({type: FETCH_GAMES_SUCCEEDED, payload: {games: storageGames}});
            return 0;
        }
    }

    async function saveGameCallback(game: GameProps, connected: boolean) {
        try {
            log('saveGame started');
            if (!connected) {
                throw new Error()
            }
            dispatch({type: SAVE_GAMES_STARTED});
            const savedGame = await (game._id ? updateGame(token, game) : createGame(token, game));
            log('saveGame succeeded');
            dispatch({type: SAVE_GAMES_SUCCEEDED, payload: {game: savedGame}});
            dispatch({type: CONFLICT_SOLVED});
        } catch (error) {
            log('saveGame failed');
            if (game._id === undefined) {
                game._id = Date.now();
                game.status = 1;
                alert("Game saved locally");
            } else {
                game.status = 2;
                alert("Game updated locally");
            }
            await Storage.set({
                key: String(game._id),
                value: JSON.stringify(game)
            });
            dispatch({type: SAVE_GAMES_SUCCEEDED, payload: {game}});
        }
    }

    async function deleteGameCallback(game: GameProps, connected: boolean) {
        try {
            log('deleteGame started');
            if (!connected) {
                throw new Error()
            }
            dispatch({type: DELETE_GAME_STARTED});
            const deletedGame = await deleteGame(token, game);
            log('saveGame succeeded');
            dispatch({type: DELETE_GAME_SUCCEEDED, payload: {game: deletedGame}});
        } catch (error) {
            log('deleteGame failed');
            game.status = 3;
            await Storage.set({
                key: JSON.stringify(game._id),
                value: JSON.stringify(game)
            });
            alert("GAME WAS DELETED LOCALLY!");
            dispatch({type: DELETE_GAME_SUCCEEDED, payload: {game}});
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
                console.log(JSON.stringify(message));
                log(`ws message, game ${event}`);
                if (event === 'created' || event === 'updated') {
                    // TODO: restore notifications in case it works
                    // dispatch({type: SAVE_GAMES_SUCCEEDED, payload: {game}});
                }

                if (event === "deleted") {
                    // dispatch({type: DELETE_GAME_SUCCEEDED, payload: {game}});
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
