import { DocumentSnapshot } from '../types/agent';

const DB_NAME = 'word-layouter-agent';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const MAX_SNAPSHOTS = 8;

function generateSnapshotId(): string {
    return `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function putSnapshot(snapshot: DocumentSnapshot): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(snapshot);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
    await pruneSnapshots();
}

export async function getSnapshot(snapshotId: string): Promise<DocumentSnapshot | null> {
    const db = await openDb();
    const snapshot = await new Promise<DocumentSnapshot | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).get(snapshotId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
    db.close();
    return snapshot || null;
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(snapshotId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
    db.close();
}

async function listSnapshots(): Promise<DocumentSnapshot[]> {
    const db = await openDb();
    const snapshots = await new Promise<DocumentSnapshot[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
    db.close();
    return snapshots;
}

async function pruneSnapshots(): Promise<void> {
    const snapshots = await listSnapshots();
    const stale = snapshots
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(MAX_SNAPSHOTS);
    await Promise.all(stale.map(snapshot => deleteSnapshot(snapshot.id)));
}

function byteArrayToBase64(bytes: number[]): string {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
}

function getCompressedDocumentBase64(): Promise<string> {
    return new Promise((resolve, reject) => {
        if (typeof Office === 'undefined' || !Office.context?.document?.getFileAsync) {
            reject(new Error('Office getFileAsync is unavailable'));
            return;
        }

        Office.context.document.getFileAsync(
            Office.FileType.Compressed,
            { sliceSize: 65536 },
            (result) => {
                if (result.status !== Office.AsyncResultStatus.Succeeded) {
                    reject(new Error(result.error?.message || '无法创建 docx 快照'));
                    return;
                }

                const file = result.value;
                const bytes: number[] = [];
                let index = 0;

                const readNext = () => {
                    file.getSliceAsync(index, (sliceResult) => {
                        if (sliceResult.status !== Office.AsyncResultStatus.Succeeded) {
                            file.closeAsync();
                            reject(new Error(sliceResult.error?.message || '读取文档快照分片失败'));
                            return;
                        }

                        bytes.push(...(sliceResult.value.data as number[]));
                        index += 1;

                        if (index < file.sliceCount) {
                            readNext();
                        } else {
                            file.closeAsync();
                            resolve(byteArrayToBase64(bytes));
                        }
                    });
                };

                readNext();
            }
        );
    });
}

export async function createTurnSnapshot(label: string): Promise<DocumentSnapshot> {
    const id = generateSnapshotId();

    try {
        const base64 = await getCompressedDocumentBase64();
        const snapshot: DocumentSnapshot = {
            id,
            label,
            createdAt: Date.now(),
            kind: 'docx',
            base64,
            canRestoreFully: true,
        };
        await putSnapshot(snapshot);
        return snapshot;
    } catch (error) {
        const ooxml = await Word.run(async (context) => {
            const result = context.document.body.getOoxml();
            await context.sync();
            return result.value;
        });
        const snapshot: DocumentSnapshot = {
            id,
            label,
            createdAt: Date.now(),
            kind: 'ooxml',
            ooxml,
            canRestoreFully: false,
        };
        await putSnapshot(snapshot);
        return snapshot;
    }
}

export async function restoreSnapshot(snapshotId: string): Promise<DocumentSnapshot> {
    const snapshot = await getSnapshot(snapshotId);
    if (!snapshot) {
        throw new Error('找不到可回退的文档快照');
    }

    await Word.run(async (context) => {
        if (snapshot.kind === 'docx' && snapshot.base64) {
            context.document.insertFileFromBase64(snapshot.base64, Word.InsertLocation.replace, {
                importStyles: true,
                importTheme: true,
                importParagraphSpacing: true,
                importPageColor: true,
                importCustomProperties: true,
            });
        } else if (snapshot.ooxml) {
            context.document.body.insertOoxml(snapshot.ooxml, Word.InsertLocation.replace);
        } else {
            throw new Error('快照数据为空');
        }
        await context.sync();
    });

    return snapshot;
}
