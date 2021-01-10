import React, {useContext, useEffect, useState} from 'react';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonLoading,
    IonPage,
    IonTitle,
    IonToolbar,
    IonFab,
    IonFabButton, IonIcon, IonActionSheet
} from '@ionic/react';

import {useCamera} from '@ionic/react-hooks/camera';
import {CameraPhoto, CameraResultType, CameraSource, FilesystemDirectory, Geolocation} from '@capacitor/core';
import {base64FromPath, useFilesystem} from '@ionic/react-hooks/filesystem';
import {getLogger} from '../core';
import {GameContext} from './GameProvider';
import {RouteComponentProps} from 'react-router';
import {GameProps} from './GameProps';
import {useNetwork} from "./useNetwork";
import {AuthContext} from "../auth";
import {camera, close, trash} from "ionicons/icons";
import {MyMap} from "../components/MyMap";

const log = getLogger('GameEdit');

interface GameEditProps extends RouteComponentProps<{
    _id?: string;
}> {
}

export interface Photo {
    photo: string;
}

export interface MyLocation {
    lat?: number;
    lng?: number;
}

const GameEdit: React.FC<GameEditProps> = ({history, match}) => {
    const {games, saving, savingError, _saveGame, oldGame, _getGameServer, _deleteGame} = useContext(GameContext);
    const {networkStatus} = useNetwork();
    const {_id} = useContext(AuthContext);

    const [appid, setAppid] = useState(0);
    const [photo, setPhoto] = useState<Photo>();
    const [name, setName] = useState('');
    const [developer, setDeveloper] = useState('');
    const [positive, setPositive] = useState(0);
    const [negative, setNegative] = useState(0);
    const [owners, setOwners] = useState('0 .. 0');
    const [price, setPrice] = useState(0);
    const [game0, setGame0] = useState<GameProps>();
    const [game1, setGame1] = useState<GameProps>();

    const [userId] = useState(Number(_id));

    const {getPhoto} = useCamera();

    const [location, setLocation] = useState<MyLocation>({lat: 0, lng: 0});

    if (!match.params._id)
        Geolocation.getCurrentPosition().then(position => {
            setLocation({lat: position.coords.latitude, lng: position.coords.longitude});
            console.log(JSON.stringify(location));
        }).catch((error) => error);

    const takePhoto = async () => {
        const cameraPhoto = await getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100
        });
        const savedFileImage = await savePicture(cameraPhoto);
        setPhoto(savedFileImage);
    };

    const savePicture = async (photo: CameraPhoto): Promise<Photo> => {
        return {
            photo: await base64FromPath(photo.webPath!)
        };
    };

    const deletePhoto = async () => {
        setPhoto(undefined);
    };

    useEffect(() => {
        log('useEffect');
        const routeId = match.params._id ? Number(match.params._id) : -1;
        const game = games?.find(it => it._id === routeId);
        setGame0(game);
        console.log(JSON.stringify(game));
        if (game) {
            game.appid && setAppid(game.appid);
            game.name && setName(game.name);
            game.developer && setDeveloper(game.developer);
            game.positive && setPositive(game.positive);
            game.negative && setNegative(game.negative);
            game.owners && setOwners(game.owners);
            game.price && setPrice(game.price);
            game.photo && setPhoto(game.photo);
            game.location && setLocation(game.location);
            _getGameServer?.(routeId, game);
        }
    }, [match.params._id, games, _getGameServer]);

    useEffect(() => {
        setGame1(oldGame);
        log("setOldGame: " + JSON.stringify(oldGame));
    }, [oldGame]);

    const handleSave = () => {
        const editedGame = game0 ? {
            ...game0,
            appid,
            name,
            developer,
            positive,
            negative,
            owners,
            price,
            userId,
            photo,
            location,
            status: 0,
            version: game0.version ? game0.version + 1 : 1
        } : {appid, name, developer, positive, negative, owners, price, userId, photo, location, status: 0, version: 1};
        _saveGame && _saveGame(editedGame, networkStatus.connected).then(() => history.goBack());
    };

    const handleConflict1 = () => {
        if (oldGame) {
            const editedGame = {
                ...game0,
                appid,
                name,
                developer,
                positive,
                negative,
                owners,
                price,
                userId,
                photo,
                location,
                status: 0,
                version: oldGame?.version + 1
            };
            _saveGame && _saveGame(editedGame, networkStatus.connected).then(() => {
                history.goBack();
            });
        }
    };

    const handleConflict2 = () => {
        if (oldGame) {
            const editedGame = {
                ...oldGame,
                _id: game0?._id,
                status: 0,
                version: oldGame?.version + 1
            };
            _saveGame && _saveGame(editedGame, networkStatus.connected).then(() => {
                history.goBack();
            });
        }
    };

    const handleDelete = () => {
        const editedGame = game0 ? {
            ...game0,
            appid,
            name,
            developer,
            positive,
            negative,
            owners,
            price,
            userId,
            photo,
            location,
            status: 0,
            version: 0
        } : {
            appid,
            name,
            developer,
            positive,
            negative,
            owners,
            price,
            userId,
            photo,
            location,
            status: 0,
            version: 0
        };
        _deleteGame?.(editedGame, networkStatus.connected).then(() => history.goBack());
    };

    const [photoToDelete, setPhotoToDelete] = useState<Photo>();

    log('render');
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>{match.params._id ? "Edit" : "Save"}</IonTitle>
                    <div>Network status is {JSON.stringify(networkStatus)}</div>
                    <IonButtons slot="end">
                        <IonButton onClick={handleSave}>
                            {match.params._id ? "Update" : "Save"}
                        </IonButton>
                        <IonButton onClick={handleDelete}>Delete</IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent>
                {photo && (<img onClick={() => setPhotoToDelete(photo)} src={photo.photo} height={'200px'}/>)}
                {!photo && (
                    <img src={'https://reactnativecode.com/wp-content/uploads/2018/02/Default_Image_Thumbnail.png'}
                         height={'200px'}/>)}
                <IonFab vertical="bottom" horizontal="center" slot="fixed">
                    <IonFabButton onClick={() => takePhoto()}>
                        <IonIcon icon={camera}/>
                    </IonFabButton>
                </IonFab>
                <IonActionSheet
                    isOpen={!!photoToDelete}
                    buttons={[{
                        text: 'Delete',
                        role: 'destructive',
                        icon: trash,
                        handler: () => {
                            if (photoToDelete) {
                                deletePhoto();
                                setPhotoToDelete(undefined);
                            }
                        }
                    }, {
                        text: 'Cancel',
                        icon: close,
                        role: 'cancel'
                    }]}
                    onDidDismiss={() => setPhotoToDelete(undefined)}
                />
                <IonList>
                    <IonLabel position="floating">Location {location.lat} {location.lng}</IonLabel>
                    <MyMap
                        lat={location.lat}
                        lng={location.lng}
                        onMapClick={(e: any) => setLocation({lat: e.latLng.lat(), lng: e.latLng.lng()})}
                        onMarkerClick={() => {
                        }}
                    />
                    <IonItem>
                        <IonLabel position="floating">Appid</IonLabel>
                        <IonInput type="number" value={appid}
                                  onIonChange={e => setAppid(parseInt(e.detail.value!, 10))}/>
                    </IonItem>
                    <IonItem>
                        <IonLabel position="floating">Name</IonLabel>
                        <IonInput value={name} onIonChange={e => setName(e.detail.value!)}/>
                    </IonItem>
                    <IonItem>
                        <IonLabel position="floating">Developer</IonLabel>
                        <IonInput value={developer} onIonChange={e => setDeveloper(e.detail.value!)}/>
                    </IonItem>
                    <IonItem>
                        <IonLabel position="floating">Positive</IonLabel>
                        <IonInput type="number" value={positive}
                                  onIonChange={e => setPositive(parseInt(e.detail.value!, 10))}/>
                    </IonItem>
                    <IonItem>
                        <IonLabel position="floating">Negative</IonLabel>
                        <IonInput type="number" value={negative}
                                  onIonChange={e => setNegative(parseInt(e.detail.value!, 10))}>
                        </IonInput>
                    </IonItem>
                    <IonItem>
                        <IonLabel position="floating">Owners</IonLabel>
                        <IonInput value={owners} onIonChange={e => setOwners(e.detail.value!)}/>
                    </IonItem>
                    <IonItem>
                        <IonLabel position="floating">Price</IonLabel>
                        <IonInput type="number" value={price}
                                  onIonChange={e => setPrice(parseInt(e.detail.value!, 10))}>
                        </IonInput>
                    </IonItem>
                </IonList>
                {game1 &&
                ((game1.photo && (<img src={game1.photo.photo} height={'200px'}/>)) || (!game1.photo &&
                    <img src={'https://reactnativecode.com/wp-content/uploads/2018/02/Default_Image_Thumbnail.png'}
                         height={'200px'}/>)) &&
                (
                    <IonList>
                        <IonLabel
                            position="floating">Location {game1.location ? game1.location.lat : 0} {game1.location ? game1.location.lng : 0}</IonLabel>
                        <MyMap
                            lat={game1.location ? game1.location.lat : 0}
                            lng={game1.location ? game1.location.lng : 0}
                            onMapClick={() => {
                            }}
                            onMarkerClick={() => {
                            }}
                        />
                        <IonItem>
                            <IonLabel>APPID: {game1.appid}</IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonLabel>NAME: {game1.name}</IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonLabel>DEVELOPER: {game1.developer}</IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonLabel>POSITIVE: {game1.positive}</IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonLabel>NEGATIVE: {game1.negative}</IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonLabel>OWNERS: {game1.owners}</IonLabel>
                        </IonItem>
                        <IonItem>
                            <IonLabel>PRICE: {game1.price}</IonLabel>
                        </IonItem>

                        <IonButton onClick={handleConflict1}>Choose first version</IonButton>
                        <IonButton onClick={handleConflict2}>Choose second version</IonButton>
                    </IonList>
                )
                }
                <IonLoading isOpen={saving}/>
                {savingError && (
                    <div>{savingError.message || 'Failed to save game'}</div>
                )}
            </IonContent>
        </IonPage>
    );
};

export default GameEdit;
