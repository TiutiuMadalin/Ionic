import React, {useState} from 'react';
import {IonCard, IonCardHeader} from "@ionic/react";

import '../theme/variables.css';

export function Collapsible(props: { children: any[]; }) {
    const [open, setOpen] = useState(false);

    return (
        //TODO use css file
        <IonCard onClick={() => setOpen(!open)} style={{width: "100%"}}>
            <IonCardHeader color="step-200">
                {props.children[0]}
            </IonCardHeader>
            {open && props.children[1]}
        </IonCard>
    );
}

export default Collapsible;
