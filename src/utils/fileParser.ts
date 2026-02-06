/**
 * 文件解析工具
 * 支持 Word (.docx), PDF (.pdf), 文本 (.txt), 图片 (.png, .jpg, .jpeg)
 */

export interface ParsedFile {
  type: 'text' | 'image';
  content: string;  // 文本内容或 base64
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// 文件大小限制
export const FILE_SIZE_LIMITS = {
  TEXT: 10 * 1024 * 1024,  // 10MB
  IMAGE: 5 * 1024 * 1024,  // 5MB
};

// 支持的文件类型
export const SUPPORTED_EXTENSIONS = {
  TEXT: ['txt', 'docx'],  // 暂时移除 PDF，因为兼容性问题
  IMAGE: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
};

/**
 * 获取文件扩展名
 */
export function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/**
 * 检查文件类型是否支持
 */
export function isFileSupported(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return [...SUPPORTED_EXTENSIONS.TEXT, ...SUPPORTED_EXTENSIONS.IMAGE].includes(ext);
}

/**
 * 检查是否为图片文件
 */
export function isImageFile(fileName: string): boolean {
  const ext = getFileExtension(fileName);
  return SUPPORTED_EXTENSIONS.IMAGE.includes(ext);
}

/**
 * 检查文件大小是否在限制内
 */
export function isFileSizeValid(file: File): boolean {
  const ext = getFileExtension(file.name);
  const limit = SUPPORTED_EXTENSIONS.IMAGE.includes(ext)
    ? FILE_SIZE_LIMITS.IMAGE
    : FILE_SIZE_LIMITS.TEXT;
  return file.size <= limit;
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * 解析文件
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = getFileExtension(file.name);

  // 检查文件大小
  if (!isFileSizeValid(file)) {
    const limit = SUPPORTED_EXTENSIONS.IMAGE.includes(ext)
      ? FILE_SIZE_LIMITS.IMAGE
      : FILE_SIZE_LIMITS.TEXT;
    throw new Error(`文件大小超过限制 (${formatFileSize(limit)})`);
  }

  switch (ext) {
    case 'docx':
      return parseDocx(file);
    case 'pdf':
      return parsePdf(file);
    case 'txt':
      return parseTxt(file);
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return parseImage(file);
    default:
      throw new Error(`不支持的文件类型: .${ext}`);
  }
}

/**
 * 解析文本文件
 */
async function parseTxt(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        type: 'text',
        content: reader.result as string,
        fileName: file.name,
        fileSize: file.size,
        mimeType: 'text/plain',
      });
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * 解析 Word 文档 (.docx)
 * 使用 mammoth 库
 */
async function parseDocx(file: File): Promise<ParsedFile> {
  try {
    // 动态导入 mammoth
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });

    return {
      type: 'text',
      content: result.value,
      fileName: file.name,
      fileSize: file.size,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  } catch (error) {
    console.error('解析 Word 文档失败:', error);
    throw new Error('解析 Word 文档失败，请确保文件格式正确');
  }
}

/**
 * 解析 PDF 文件
 * 使用 pdfjs-dist 库
 */
async function parsePdf(file: File): Promise<ParsedFile> {
  try {
    // 动态导入 pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');

    // 禁用 worker，直接在主线程解析（避免跨域问题）
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;

    let fullText = '';

    // 逐页提取文本
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n\n';
    }

    // 如果没有提取到文本，可能是扫描版 PDF
    if (!fullText.trim()) {
      throw new Error('PDF 无法提取文本（可能是扫描版或图片 PDF）');
    }

    return {
      type: 'text',
      content: fullText.trim(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: 'application/pdf',
    };
  } catch (error) {
    console.error('解析 PDF 失败:', error);
    const msg = error instanceof Error ? error.message : '未知错误';
    if (msg.includes('无法提取文本')) {
      throw new Error(msg);
    }
    throw new Error('PDF 解析失败：' + msg);
  }
}

/**
 * 解析图片文件
 * 转换为 base64
 */
async function parseImage(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({
        type: 'image',
        content: base64,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    };
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 获取图片的 data URL
 */
export function getImageDataUrl(parsedFile: ParsedFile): string {
  if (parsedFile.type !== 'image') {
    throw new Error('不是图片文件');
  }
  return `data:${parsedFile.mimeType};base64,${parsedFile.content}`;
}
