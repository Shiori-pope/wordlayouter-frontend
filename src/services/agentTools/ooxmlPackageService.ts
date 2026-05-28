import JSZip from 'jszip';

export interface OoxmlPackage {
    zip: JSZip;
    base64: string;
}

function byteArrayToBase64(bytes: number[]): string {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
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
            (fileResult) => {
                if (fileResult.status !== Office.AsyncResultStatus.Succeeded || !fileResult.value) {
                    reject(fileResult.error || new Error('读取 docx 文件失败'));
                    return;
                }

                const file = fileResult.value;
                const chunks: number[] = [];
                let index = 0;

                const readNext = () => {
                    file.getSliceAsync(index, (sliceResult) => {
                        if (sliceResult.status !== Office.AsyncResultStatus.Succeeded || !sliceResult.value) {
                            file.closeAsync();
                            reject(sliceResult.error || new Error('读取 docx 分片失败'));
                            return;
                        }

                        chunks.push(...Array.from(sliceResult.value.data as number[]));
                        index += 1;
                        if (index < file.sliceCount) {
                            readNext();
                        } else {
                            file.closeAsync();
                            resolve(byteArrayToBase64(chunks));
                        }
                    });
                };

                readNext();
            }
        );
    });
}

export async function getCurrentDocxPackage(): Promise<OoxmlPackage> {
    const base64 = await getCompressedDocumentBase64();
    const zip = await JSZip.loadAsync(base64, { base64: true });
    return { zip, base64 };
}

export async function replaceCurrentDocxPackage(pkg: OoxmlPackage): Promise<string> {
    const base64 = await pkg.zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
    await Word.run(async (context) => {
        context.document.insertFileFromBase64(base64, Word.InsertLocation.replace, {
            importStyles: true,
            importTheme: true,
            importParagraphSpacing: true,
            importPageColor: true,
            importCustomProperties: true,
        });
        await context.sync();
    });
    return base64;
}

export async function readPart(pkg: OoxmlPackage, partName: string): Promise<string | null> {
    const normalized = partName.replace(/^\/+/, '');
    const file = pkg.zip.file(normalized);
    return file ? file.async('string') : null;
}

export function writePart(pkg: OoxmlPackage, partName: string, xml: string): void {
    pkg.zip.file(partName.replace(/^\/+/, ''), xml);
}

export async function parseXmlPart(pkg: OoxmlPackage, partName: string): Promise<Document | null> {
    const xml = await readPart(pkg, partName);
    if (!xml) return null;
    return new DOMParser().parseFromString(xml, 'application/xml');
}

export function serializeXml(doc: Document): string {
    return new XMLSerializer().serializeToString(doc);
}

export async function ensureContentType(pkg: OoxmlPackage, partName: string, contentType: string): Promise<void> {
    const doc = await parseXmlPart(pkg, '[Content_Types].xml');
    if (!doc) return;
    const part = partName.startsWith('/') ? partName : `/${partName}`;
    const exists = Array.from(doc.getElementsByTagName('Override'))
        .some(node => node.getAttribute('PartName') === part);
    if (!exists) {
        const override = doc.createElement('Override');
        override.setAttribute('PartName', part);
        override.setAttribute('ContentType', contentType);
        doc.documentElement.appendChild(override);
        writePart(pkg, '[Content_Types].xml', serializeXml(doc));
    }
}

export async function ensureRelationship(pkg: OoxmlPackage, relsPart: string, type: string, target: string): Promise<string> {
    const doc = await parseXmlPart(pkg, relsPart);
    if (!doc) return 'rId1';
    const relationships = Array.from(doc.getElementsByTagName('Relationship'));
    const existing = relationships.find(node => node.getAttribute('Type') === type && node.getAttribute('Target') === target);
    if (existing?.getAttribute('Id')) return existing.getAttribute('Id') || 'rId1';

    const maxId = relationships.reduce((max, node) => {
        const id = node.getAttribute('Id') || '';
        const match = id.match(/^rId(\d+)$/);
        return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const id = `rId${maxId + 1}`;
    const relationship = doc.createElement('Relationship');
    relationship.setAttribute('Id', id);
    relationship.setAttribute('Type', type);
    relationship.setAttribute('Target', target);
    doc.documentElement.appendChild(relationship);
    writePart(pkg, relsPart, serializeXml(doc));
    return id;
}
