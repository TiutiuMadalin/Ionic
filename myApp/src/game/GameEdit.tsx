import React, { useContext, useEffect, useState } from 'react';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonLoading,
    IonPage,
    IonTitle,
    IonToolbar,
    IonLabel
} from '@ionic/react';
import { getLogger } from '../core';
import { GameContext } from './GameProvider';
import { RouteComponentProps } from 'react-router';
import { gameProps } from './gameProps';

const log = getLogger('GameEdit');

interface GameEditProps extends RouteComponentProps<{
    id?: string;
}> {}

const GameEdit: React.FC<GameEditProps> = ({ history, match }) => {
    const { games, saving, savingError, saveGame } = useContext(GameContext);
    const [version, setVersion] = useState('');
    const [title, setTitle] = useState('');
    const [game, setGame] = useState<gameProps>();
    useEffect(() => {
        log('useEffect');
        const routeId = match.params.id || '';
        const game = games?.find(it => it._id === routeId);
        setGame(game);
        if (game) {
            setTitle(game.title);
            setVersion(game.version);
        }
    }, [match.params.id, games]);
    const handleSave = () => {

        const editedGame = game ? { ...game, title, version } : { title: title, version: version };
        saveGame && saveGame(editedGame).then(() => history.goBack());
    };
    log('render');
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Edit</IonTitle>
        <IonButtons slot="end">
    <IonButton onClick={handleSave}>
    Save
    </IonButton>
    </IonButtons>
    </IonToolbar>
    </IonHeader>
    <IonContent>
        <IonLabel>Title</IonLabel>
        <IonInput value={title} onIonChange={e => setTitle(e.detail.value || '')} />
        <IonLabel>Version</IonLabel>
        <IonInput value={version} onIonChange={e => setVersion(e.detail.value || '')} />
        <IonLoading isOpen={saving} />
        {savingError && (
            <div>{savingError.message || 'Failed to save item'}</div>
        )}
    </IonContent>

    </IonPage>
);
};

export default GameEdit;
