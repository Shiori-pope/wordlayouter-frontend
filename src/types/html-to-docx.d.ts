declare module 'html-to-docx' {
  interface DocumentOptions {
    orientation?: 'portrait' | 'landscape';
    pageSize?: { width?: number; height?: number };
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    font?: string;
    fontSize?: number;
    table?: { row?: { cantSplit?: boolean } };
    lang?: string;
  }

  export default function HTMLtoDOCX(
    htmlString: string,
    headerHTMLString?: string | null,
    documentOptions?: DocumentOptions,
    footerHTMLString?: string | null
  ): Promise<Blob | Buffer>;
}
