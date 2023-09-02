import type WaveSurfer from 'wavesurfer.js';
import {
    appProcessStatusWritableStore,
    isAudioSelectedStore,
    currentFileUrlStore,
    currentTimeStore,
    durationStore,
    lastCuttedFileStore,
    audioExtensions
} from './stores';
import { open } from '@tauri-apps/api/dialog';
import { downloadDir } from '@tauri-apps/api/path';
import { get } from 'svelte/store';

export async function loadAudio(ws: WaveSurfer): Promise<boolean> {
    if (ws !== undefined) ws.pause();

    const url = (await open({
        multiple: false,
        filters: [{ name: 'Audio', extensions: audioExtensions }],
        directory: false,
        defaultPath: await downloadDir()
    })) as string | null;

    isAudioSelectedStore.set(false);

    if (url === null) {
        //user canceled selection
        if (get(currentFileUrlStore).length !== 0) {
            isAudioSelectedStore.set(true);
        }
        return false;
    }
    currentFileUrlStore.set(url);

    durationStore.set('');
    currentTimeStore.set('');
    lastCuttedFileStore.set('');
    appProcessStatusWritableStore.set('Loading...');
    return true;
}
