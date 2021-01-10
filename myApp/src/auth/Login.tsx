import React, {useContext, useState,useEffect} from 'react';
import {Redirect} from 'react-router-dom';
import {RouteComponentProps} from 'react-router';
import '../animations/AnimationLogin.css';
import {
    createAnimation,
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonLoading,
    IonPage,
    IonTitle,
    IonToolbar
} from '@ionic/react';
import {AuthContext} from './AuthProvider';
import {getLogger} from '../core';

const log = getLogger('Login');

interface LoginState {
    username?: string;
    password?: string;
}

export const Login: React.FC<RouteComponentProps> = () => {
    const {isAuthenticated, isAuthenticating, login, authenticationError} = useContext(AuthContext);
    const [state, setState] = useState<LoginState>({});
    const {username, password} = state;
    //useEffect(groupAnimations, []);
    useEffect(chainAnimations, []);
    const handleLogin = () => {
        log('handleLogin...');
        login?.(username, password);
    };
    log('render');
    if (isAuthenticated) {
        return <Redirect to={{pathname: '/'}}/>
    }
    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Login</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent>
                <div className="square-b">
                    <p>UserName</p>
                </div>
                <IonInput
                    placeholder="Username"
                    value={username}
                    onIonChange={e => setState({
                        ...state,
                        username: e.detail.value || ''
                    })}/>


                <div className="square-c">
                    <p>Password</p>
                </div>

                <IonInput
                    placeholder="Password"
                    value={password}
                    onIonChange={e => setState({
                        ...state,
                        password: e.detail.value || ''
                    })}/>
                <IonLoading isOpen={isAuthenticating}/>
                {authenticationError && (
                    <div>{authenticationError.message || 'Failed to authenticate'}</div>
                )}
                <IonButton onClick={handleLogin}>Login</IonButton>
            </IonContent>
        </IonPage>
    );
    function groupAnimations() {
        const elB = document.querySelector('.square-b');
        const elC = document.querySelector('.square-c');
        if (elB && elC) {
            const animationA = createAnimation()
                .addElement(elB)
                .fromTo('transform', 'scale(0.5)', 'scale(1)');
            const animationB = createAnimation()
                .addElement(elC)
                .fromTo('transform', 'scale(1)', 'scale(0.5)');
            const parentAnimation = createAnimation()
                .duration(10000)
                .addAnimation([animationA, animationB]);
            parentAnimation.play();    }
    }

    function chainAnimations() {
        const elB = document.querySelector('.square-b');
        const elC = document.querySelector('.square-c');
        if (elB && elC) {
            const animationA = createAnimation()
                .addElement(elB)
                .duration(5000)
                .fromTo('transform', 'scale(0.5)', 'scale(1)')
                .afterStyles({
                    'background': 'green'
                });
            const animationB = createAnimation()
                .addElement(elC)
                .duration(7000)
                .fromTo('transform', 'scale(1)', 'scale(0.5)')
                .afterStyles({
                    'background': 'green'
                });
            (async () => {
                await animationA.play();
                await animationB.play();
            })();
        }
    }
};
