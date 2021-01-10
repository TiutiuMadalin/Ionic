import {MyLocation, Photo} from "./GameEdit";

export interface GameProps {
    _id?: number;
    appid?: number;
    photo?: Photo;
    location?: MyLocation;
    name: string;
    developer?: string;
    positive?: number;
    negative?: number;
    owners?: string;
    price?: number;
    userId?: number;
    status: number;
    version: number;
}
