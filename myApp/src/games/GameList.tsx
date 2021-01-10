import {
    IonButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonHeader,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonList,
    IonLoading,
    IonPage,
    IonRow,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar
} from '@ionic/react';
import React, {useContext, useEffect, useState} from 'react';
import {Redirect, RouteComponentProps} from "react-router";
import {add} from "ionicons/icons";
import {getLogger} from '../core';
import {GameContext} from './GameProvider';

import '../theme/variables.css';
import Game from "./Game";
import {AuthContext} from "../auth";

import {useAppState} from './useAppState';
import {useNetwork} from './useNetwork';
import {Network, NetworkStatus} from "@capacitor/core";
import {useBackgroundTask} from "./useBackgroundTask";
import AnimationTitle from "../animations/AnimationTitle";

const log = getLogger('GameList');

let offset = 0;
const size = 12;

const GameList: React.FC<RouteComponentProps> = ({history}) => {
    const {
        games,
        fetching,
        fetchingError,
        _deleteGame,
        _fetchGames,
        _fetchOwners,
        _updateServer
    } = useContext(GameContext);
    const [disableInfiniteScroll, setDisableInfiniteScroll] = useState(false);
    const {logout} = useContext(AuthContext);
    const [ownerRanges, setOwnerRanges] = useState([]);
    const [filter, setFilter] = useState("all");
    const [partialName, setPartialName] = useState('');

    const {appState} = useAppState();
    const {networkStatus} = useNetwork();

    useEffect(() => {
        if (networkStatus.connected)
            _updateServer && _updateServer();
    }, [_updateServer, networkStatus.connected]);

   /* useBackgroundTask(() => new Promise(async resolve => {
         console.log("My Background Task");
         continuouslyCheckNetwork();
     }));

     async function continuouslyCheckNetwork() {
        const handler = Network.addListener('networkStatusChange', handleNetworkStatusChange);
         Network.getStatus().then(handleNetworkStatusChange);
        let canceled = false;
         return () => {
             canceled = true;
            handler.remove();
        }

        function handleNetworkStatusChange(status: NetworkStatus) {
             console.log('useNetwork - status change', status);
             if (!canceled) {
                 // TODO: TRY TO SEND LOCAL DATA TO SERVER
                //_updateServer && _updateServer();
             }
        }
     }*/

    const handleLogout = () => {
        logout?.();
        return <Redirect to={{pathname: "/login"}}/>;
    };

    useEffect(() => {
        Network.getStatus().then((status: NetworkStatus) => {
                _fetchOwners?.(status.connected).then((owners) => setOwnerRanges(owners && (owners).concat("all")));
                _fetchGames?.(filter === "all" ? '' : filter, partialName, offset, size, false, status.connected).then(function (len) {
                        setDisableInfiniteScroll(len < size);
                    }
                )
            }
        )
    }, [_fetchGames, _fetchOwners, filter, partialName]);

    async function searchNext($event: CustomEvent<void>) {
        offset += size;
        if (_fetchGames) {
            const len = await _fetchGames(filter === "all" ? '' : filter, partialName, offset, size, true, networkStatus.connected);
            if (len > 0)
                setDisableInfiniteScroll(len < size);
            else
                setDisableInfiniteScroll(true);
        }
        await ($event.target as HTMLIonInfiniteScrollElement).complete();
    }

    log('render');
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonRow class="ion-align-items-center ion-margin">
                        <IonTitle><AnimationTitle></AnimationTitle></IonTitle>
                        <div>Network status is {JSON.stringify(networkStatus)}</div>
                        <IonButton class="ion-margin-end" onClick={handleLogout}>Logout</IonButton>
                    </IonRow>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                <IonRow class="ion-align-items-center ion-margin">
                    <IonSelect value={filter} placeholder="Select owner range"
                               onIonChange={e => {
                                   offset = 0;
                                   setFilter(e.detail.value)
                               }}>
                        {ownerRanges.map(ownerRange => <IonSelectOption key={ownerRange}
                                                                        value={ownerRange}>{ownerRange}</IonSelectOption>)}
                    </IonSelect>
                    <IonSearchbar
                        value={partialName}
                        placeholder="Search by name"
                        debounce={1000}
                        onIonChange={e => {
                            offset = 0;
                            setPartialName(e.detail.value!)
                        }}>
                    </IonSearchbar>
                </IonRow>
                <IonLoading isOpen={fetching} message="Fetching games"/>
                {games && (
                    <IonList>
                        {games.map(({
                                        _id,
                                        appid,
                                        photo,
                                        location,
                                        name,
                                        developer,
                                        positive,
                                        negative,
                                        owners,
                                        price,
                                        version,
                                        status
                                    }) =>
                            <Game key={_id} _id={_id} appid={appid} photo={photo} location={location} name={name}
                                  developer={developer} positive={positive}
                                  negative={negative} owners={owners} price={price} version={version} status={status}
                                  onEdit={_id => history.push(`/game/${_id}`)}
                                  onDelete={_id => _deleteGame && _deleteGame({
                                      _id: _id,
                                      name: name,
                                      version: version,
                                      status: status
                                  }, networkStatus.connected)}/>)}
                    </IonList>
                )}
                {fetchingError && (
                    <div>{fetchingError.message || 'Failed to fetch games'}</div>
                )}
                <IonInfiniteScroll threshold="100px" disabled={disableInfiniteScroll}
                                   onIonInfinite={(e: CustomEvent<void>) => searchNext(e)}>
                    <IonInfiniteScrollContent loadingText="Loading more good gammes..."/>
                </IonInfiniteScroll>
                <IonFab vertical="bottom" horizontal="end" slot="fixed">
                    <IonFabButton onClick={() => history.push('/game')}>
                        <IonIcon icon={add}/>
                    </IonFabButton>
                </IonFab>
            </IonContent>
        </IonPage>
    );
};

export default GameList;
