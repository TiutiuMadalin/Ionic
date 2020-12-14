import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getLogger } from '../core';
import { login as loginApi } from './authApi';
import { Plugins } from '@capacitor/core';

const log = getLogger('AuthProvider');

type LoginFn = (username?: string, password?: string) => void;
type LogoutFn = ()=>void;

export interface AuthState {
    authenticationError: Error | null;
    isAuthenticated: boolean;
    isAuthenticating: boolean;
    login?: LoginFn;
    logout?: LogoutFn;
    pendingAuthentication?: boolean;
    username?: string;
    password?: string;
    token: string;
}

function setFinalState() {
    const {Storage} = Plugins;
    asyncState();
    return finalState;

    async function asyncState() {
        const as = await Storage.get({key: 'AuthState'});
        if(as.value!=null){
            finalState = JSON.parse(as.value);
        }else{
            finalState = initialState;
        }
    }
}
const initialState: AuthState = {
    isAuthenticated: false,
    isAuthenticating: false,
    authenticationError: null,
    pendingAuthentication: false,
    token: '',
};

let finalState : any;

export const AuthContext = React.createContext<AuthState>(setFinalState());

interface AuthProviderProps {
    children: PropTypes.ReactNodeLike,
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [state, setState] = useState<AuthState>(setFinalState());
    const { isAuthenticated, isAuthenticating, authenticationError, pendingAuthentication, token } = state;
    const login = useCallback<LoginFn>(loginCallback, []);
    const logout=useCallback<LogoutFn>(logoutCallback,[]);
    useEffect(authenticationEffect, [pendingAuthentication]);
    const value = { isAuthenticated, login,logout, isAuthenticating, authenticationError, token };
    log('render');
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );

    function loginCallback(username?: string, password?: string): void {
        log('login');
        setState({
            ...state,
            pendingAuthentication: true,
            username,
            password
        });
    }

    function logoutCallback(){
        setState({
            isAuthenticated: false,
            isAuthenticating: false,
            authenticationError: null,
            pendingAuthentication: false,
            token: '',
            username: undefined,
            password: undefined
        });
        console.log(state);
        setStateAs(state);

        async function setStateAs(stateToSave: any) {
            const {Storage} = Plugins;
            await Storage.remove({key: 'AuthState'})
        }
    }

    function authenticationEffect() {
        let canceled = false;
        authenticate();
        return () => {
            canceled = true;
        }

        async function authenticate() {
            if (!pendingAuthentication) {
                log('authenticate, !pendingAuthentication, return');
                return;
            }
            try {
                log('authenticate...');
                setState({
                    ...state,
                    isAuthenticating: true,
                });
                const { username, password } = state;
                const { token } = await loginApi(username, password);
                if (canceled) {
                    return;
                }
                log('authenticate succeeded');
                const { Storage } = Plugins;
                setState({
                    ...state,
                    token,
                    pendingAuthentication: false,
                    isAuthenticated: true,
                    isAuthenticating: false,
                });
                await Storage.set({
                    key: "AuthState",
                    value: JSON.stringify({
                        ...state,
                        token,
                        pendingAuthentication: false,
                        isAuthenticated: true,
                        isAuthenticating: false,})
                })
            } catch (error) {
                if (canceled) {
                    return;
                }
                log('authenticate failed');
                setState({
                    ...state,
                    authenticationError: error,
                    pendingAuthentication: false,
                    isAuthenticating: false,
                });
            }
        }
    }
};
