import React, { useContext } from 'react';
import { RouteComponentProps } from 'react-router';
import {
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonList, IonLoading,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent
} from '@ionic/react';
import {add} from 'ionicons/icons';
import Game from './Game';
import { getLogger } from '../core';
import { GameContext } from './GameProvider';
import {AuthContext} from "../auth";

const log = getLogger('GamesList');

const GamesList: React.FC<RouteComponentProps> = ({ history }) => {
  let { games, fetching, fetchingError,getNext,disableInfiniteScroll } = useContext(GameContext);
  const{logout}=useContext(AuthContext);
  const handleLogout= ()=>{
    logout?.();
  }
  log('rendering List');
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Games
            <IonButton onClick={handleLogout}>Logout</IonButton>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonLoading isOpen={fetching} message="Fetching items" />
        {games && (
          <IonList>
            {games.map(({ _id, title ,releaseDate ,version}) =>
                <Game key={_id} _id={_id} title={title} releaseDate={releaseDate} version={version} onEdit={_id => history.push(`/game/${_id}`)} />)}
          </IonList>
        )}
        {fetchingError && (
          <div>{fetchingError.message || 'Failed to fetch items'}</div>
        )}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton  onClick={() => history.push('/game')}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
        <IonInfiniteScroll threshold="100px" disabled={disableInfiniteScroll}
                           onIonInfinite={(e: CustomEvent<void>) => getNext?.(e, games)}>
          <IonInfiniteScrollContent
              loadingText="Loading more Posts">
          </IonInfiniteScrollContent>
        </IonInfiniteScroll>
      </IonContent>
    </IonPage>
  );
};

export default GamesList;
