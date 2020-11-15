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
  IonToolbar
} from '@ionic/react';
import { add } from 'ionicons/icons';
import Game from './Game';
import { getLogger } from '../core';
import { GameContext } from './GameProvider';

const log = getLogger('GamesList');

const GamesList: React.FC<RouteComponentProps> = ({ history }) => {
  const { games, fetching, fetchingError } = useContext(GameContext);
  log('rendering List');
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Games</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonLoading isOpen={fetching} message="Fetching items" />
        {games && (
          <IonList>
            {games.map(({ id, title ,releaseDate ,version}) =>
                <Game key={id} id={id} title={title} releaseDate={releaseDate} version={version} onEdit={id => history.push(`/game/${id}`)} />)}
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
      </IonContent>
    </IonPage>
  );
};

export default GamesList;
