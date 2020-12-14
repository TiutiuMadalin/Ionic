import React from 'react';
import { IonItem, IonLabel } from '@ionic/react';
import {gameProps} from "./gameProps";

interface gamePropsExt extends gameProps {
    onEdit: (_id?: string) => void;
}
const Game: React.FC<gamePropsExt> = ({ _id, title,releaseDate,version,onEdit }) => {
  return (
    <IonItem onClick={() => onEdit(_id)}>
      <IonLabel>{title} Release Date:{releaseDate} Version:{version}</IonLabel>
    </IonItem>
  );
};

export default Game;
