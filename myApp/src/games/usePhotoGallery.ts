import {useCamera} from '@ionic/react-hooks/camera';
import {CameraPhoto, CameraResultType, CameraSource, FilesystemDirectory} from '@capacitor/core';
import {useEffect, useState} from 'react';
import {base64FromPath, useFilesystem} from '@ionic/react-hooks/filesystem';
import {useStorage} from '@ionic/react-hooks/storage';

export interface Photo {
    filepath: string;
    webviewPath?: string;
}

const PHOTO_STORAGE = 'photos';

export function usePhotoGallery() {
    const {getPhoto} = useCamera();
    const [photo, setPhoto] = useState<Photo>();

    const takePhoto = async () => {
        const cameraPhoto = await getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100
        });
        const fileName = new Date().getTime() + '.jpeg';
        const savedFileImage = await savePicture(cameraPhoto, fileName);
        setPhoto(savedFileImage);
        set(PHOTO_STORAGE, JSON.stringify(savedFileImage));
    };

    const {deleteFile, readFile, writeFile} = useFilesystem();
    const savePicture = async (photo: CameraPhoto, fileName: string): Promise<Photo> => {
        const base64Data = await base64FromPath(photo.webPath!);
        await writeFile({
            path: fileName,
            data: base64Data,
            directory: FilesystemDirectory.Data
        });

        return {
            filepath: fileName,
            webviewPath: photo.webPath
        };
    };

    const {get, set} = useStorage();
    useEffect(() => {
        const loadSaved = async () => {
            const photosString = await get(PHOTO_STORAGE);
            if (photosString) {
                const photo = (photosString ? JSON.parse(photosString) : null) as Photo;
                const file = await readFile({
                    path: photo.filepath,
                    directory: FilesystemDirectory.Data
                });
                photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
                setPhoto(photo);
            }
        };
        loadSaved();
    }, [get, photo, readFile]);


    return {
        photo,
        takePhoto
    };
}
