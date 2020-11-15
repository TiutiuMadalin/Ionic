import React from 'react';
import { IonItem, IonLabel } from '@ionic/react';
import {gameProps} from "./gameProps";

interface gamePropsExt extends gameProps {
    onEdit: (id?: string) => void;
}
const Game: React.FC<gamePropsExt> = ({ id, title,releaseDate,version,onEdit }) => {
  return (
    <IonItem onClick={() => onEdit(id)}>
      <IonLabel>{title} {releaseDate} Version:{version}</IonLabel>
    </IonItem>
  );
};

export default Game;
