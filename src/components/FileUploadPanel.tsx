import * as React from 'react';
import { useState, useRef, useCallback } from 'react';
import {
  Button,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  Attach24Regular,
  Dismiss12Regular,
  Document16Regular,
  Image16Regular,
} from '@fluentui/react-icons';
import {
  ParsedFile,
  parseFile,
  isFileSupported,
  isImageFile,
  formatFileSize,
  SUPPORTED_EXTENSIONS,
} from '../utils/fileParser';
import { ModelConfig } from '../types/modelConfig';

const useStyles = makeStyles({
  attachBtn: {
    minWidth: 'auto',
    maxWidth: '80px',
    ...shorthands.padding('4px', '8px'),
    ...shorthands.borderRadius('4px'),
    fontSize: '12px',
    color: tokens.colorNeutralForeground2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    ':hover': {
      background: tokens.colorNeutralBackground1Hover,
    },
  },
  fileStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    ...shorthands.padding('6px', '12px'),
    background: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('8px', '8px', '0', '0'),
    borderBottom: 'none',
  },
  fileTag: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    ...shorthands.padding('2px', '8px'),
    ...shorthands.borderRadius('10px'),
    background: tokens.colorNeutralBackground1,
    fontSize: '11px',
    color: tokens.colorNeutralForeground2,
  },
  fileName: {
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileSize: {
    color: tokens.colorNeutralForeground3,
    fontSize: '10px',
  },
  removeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    ...shorthands.padding('0'),
    ...shorthands.borderRadius('50%'),
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
    ':hover': {
      background: tokens.colorNeutralBackground1Hover,
      color: tokens.colorNeutralForeground1,
    },
  },
  hiddenInput: {
    display: 'none',
  },
  errorText: {
    color: '#ef4444',
    fontSize: '11px',
    ...shorthands.padding('4px', '12px'),
  },
});

interface FileUploadPanelProps {
  currentModel: ModelConfig | null;
  onFilesChange: (files: ParsedFile[]) => void;
  uploadedFiles: ParsedFile[];
}

export const FileUploadButton: React.FC<{
  currentModel: ModelConfig | null;
  onFilesChange: (files: ParsedFile[]) => void;
  uploadedFiles: ParsedFile[];
  onError?: (error: string) => void;
}> = ({ currentModel, onFilesChange, uploadedFiles, onError }) => {
  const styles = useStyles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportsVision = currentModel?.supportsVision ?? false;

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: ParsedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!isFileSupported(file.name)) {
        onError?.(`不支持的文件类型: ${file.name}`);
        continue;
      }

      if (isImageFile(file.name) && !supportsVision) {
        onError?.('当前模型不支持图片，请选择支持视觉的模型');
        continue;
      }

      try {
        const parsed = await parseFile(file);
        newFiles.push(parsed);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : '文件解析失败');
      }
    }

    if (newFiles.length > 0) {
      onFilesChange([...uploadedFiles, ...newFiles]);
    }
  }, [uploadedFiles, onFilesChange, supportsVision, onError]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const acceptTypes = [
    ...SUPPORTED_EXTENSIONS.TEXT.map(ext => `.${ext}`),
    ...(supportsVision ? SUPPORTED_EXTENSIONS.IMAGE.map(ext => `.${ext}`) : []),
  ].join(',');

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className={styles.hiddenInput}
        accept={acceptTypes}
        multiple
        onChange={handleInputChange}
      />
      <Button
        className={styles.attachBtn}
        icon={<Attach24Regular style={{ width: 16, height: 16 }} />}
        size="small"
        appearance="subtle"
        onClick={handleClick}
        title={supportsVision ? '上传文件或图片' : '上传文件'}
      >
        附件
      </Button>
    </>
  );
};

export const FileStrip: React.FC<{
  files: ParsedFile[];
  onRemove: (index: number) => void;
}> = ({ files, onRemove }) => {
  const styles = useStyles();

  if (files.length === 0) return null;

  return (
    <div className={styles.fileStrip}>
      {files.map((file, index) => (
        <div key={index} className={styles.fileTag}>
          {file.type === 'image' ? (
            <Image16Regular style={{ width: 12, height: 12 }} />
          ) : (
            <Document16Regular style={{ width: 12, height: 12 }} />
          )}
          <span className={styles.fileName} title={file.fileName}>
            {file.fileName}
          </span>
          <span className={styles.fileSize}>
            {formatFileSize(file.fileSize)}
          </span>
          <button
            className={styles.removeBtn}
            onClick={() => onRemove(index)}
            title="移除"
          >
            <Dismiss12Regular style={{ width: 10, height: 10 }} />
          </button>
        </div>
      ))}
    </div>
  );
};

const FileUploadPanel: React.FC<FileUploadPanelProps> = ({
  currentModel,
  onFilesChange,
  uploadedFiles,
}) => {
  const styles = useStyles();
  const [error, setError] = useState<string | null>(null);

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  return (
    <>
      <FileUploadButton
        currentModel={currentModel}
        onFilesChange={onFilesChange}
        uploadedFiles={uploadedFiles}
        onError={setError}
      />
      {error && <Text className={styles.errorText}>{error}</Text>}
    </>
  );
};

export default FileUploadPanel;
