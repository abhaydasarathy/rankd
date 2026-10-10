import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, ExternalLink, Trash2, Loader2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { uploadProofDocument } from '../../services/proofService';

export default function EvidenceUploader({
  documents = [],
  onDocumentsChange,
  studentId = 'student-demo',
  title = 'SUPPORTING EVIDENCE',
  required = false,
  helperText = 'PDF, JPG, PNG or Google Drive Link',
  uploadStatusText = '',
  setUploadStatusText,
  accept = '.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg',
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
}) {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'drive'
  const [driveUrlInput, setDriveUrlInput] = useState('');

  const handleAddDriveLink = (e) => {
    e?.preventDefault();
    const url = (driveUrlInput || '').trim();
    if (!url) return;

    if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
      setErrorMessage("Please enter a valid Google Drive file sharing link (e.g., https://drive.google.com/file/d/...)");
      return;
    }

    setErrorMessage('');
    const newDriveDoc = {
      id: `drive-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fileName: 'Google_Drive_Document.pdf',
      fileSize: 'Google Drive Link',
      fileType: 'application/pdf',
      publicUrl: url,
      driveUrl: url,
      uploadedAt: new Date().toISOString(),
    };

    onDocumentsChange([...documents, newDriveDoc]);
    setDriveUrlInput('');
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 KB';
    if (typeof bytes === 'string') {
      if (bytes.includes('KB') || bytes.includes('MB') || bytes.includes('Bytes') || bytes.includes('B')) {
        return bytes;
      }
      bytes = Number(bytes) || 0;
      if (bytes === 0) return '0 KB';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + (sizes[i] || 'KB');
  };

  const handleFilesUpload = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    const files = Array.from(filesList);

    const validFiles = [];
    const errors = [];

    for (const file of files) {
      const nameLower = (file.name || '').toLowerCase();
      const extMatch = accept.split(',').some(ext => nameLower.endsWith(ext.trim().toLowerCase()));
      const mimeMatch = allowedTypes.includes(file.type) || 
                        (file.type === '' && extMatch) || 
                        (file.type.startsWith('image/') && allowedTypes.includes('image/jpeg')); // generic image check fallback

      if (!extMatch && !mimeMatch) {
        errors.push(`"${file.name}": Unsupported file type. Please follow the requested formats.`);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        errors.push(`"${file.name}": Exceeds the 10 MB limit.`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
    } else {
      setErrorMessage('');
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    if (setUploadStatusText) {
      setUploadStatusText(`Uploading ${validFiles.length} document${validFiles.length > 1 ? 's' : ''}...`);
    }

    const newDocs = [];

    for (const file of validFiles) {
      try {
        const result = await uploadProofDocument(studentId, file);
        if (result && result.publicUrl) {
          newDocs.push({
            id: result.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            fileName: result.fileName || file.name,
            fileSize: result.fileSize || file.size,
            fileType: result.fileType || file.type || 'application/pdf',
            publicUrl: result.publicUrl,
            storagePath: result.storagePath || '',
            uploadedAt: result.uploadedAt || new Date().toISOString(),
          });
        } else {
          const localUrl = URL.createObjectURL(file);
          newDocs.push({
            id: `local-doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/pdf',
            publicUrl: localUrl,
            storagePath: '',
            uploadedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('Upload fallback to local URL:', err);
        const localUrl = URL.createObjectURL(file);
        newDocs.push({
          id: `local-doc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          publicUrl: localUrl,
          storagePath: '',
          uploadedAt: new Date().toISOString(),
        });
      }
    }

    onDocumentsChange([...documents, ...newDocs]);
    setIsUploading(false);
    if (setUploadStatusText) setUploadStatusText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (docId) => {
    onDocumentsChange(documents.filter((d) => d.id !== docId));
  };

  return (
    <div className="space-y-3">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          {documents.length > 0 ? (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
            >
              {documents.length} document{documents.length > 1 ? 's' : ''} attached
            </span>
          ) : required ? (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
            >
              Required for verification
            </span>
          ) : (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}
            >
              Optional verification evidence
            </span>
          )}
        </div>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {helperText}
        </span>
      </div>

      {/* Hidden File Input with multiple attribute */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          if (e.target.files && e.target.files.length > 0) {
            handleFilesUpload(e.target.files);
          }
        }}
        className="hidden"
      />

      {/* Mode Selector Tabs (Upload Document vs Google Drive Link) */}
      <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => setUploadMode('file')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] border cursor-pointer transition-colors flex items-center gap-1.5 ${
            uploadMode === 'file' ? 'bg-[var(--green-light)] text-[var(--green-text)] border-[var(--green)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)]'
          }`}
        >
          <UploadCloud size={13} />
          <span>Upload File</span>
        </button>

        <button
          type="button"
          onClick={() => setUploadMode('drive')}
          className={`text-xs font-semibold px-3 py-1.5 rounded-[var(--radius-sm)] border cursor-pointer transition-colors flex items-center gap-1.5 ${
            uploadMode === 'drive' ? 'bg-[var(--green-light)] text-[var(--green-text)] border-[var(--green)]' : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border)]'
          }`}
        >
          <LinkIcon size={13} />
          <span>Google Drive Link</span>
        </button>
      </div>

      {/* Google Drive Link Input Box */}
      {uploadMode === 'drive' && (
        <form onSubmit={handleAddDriveLink} className="p-3.5 rounded-[var(--radius-lg)] border bg-[var(--bg-card)] space-y-2" style={{ borderColor: 'var(--border)' }}>
          <label className="text-xs font-semibold block" style={{ color: 'var(--text-primary)' }}>
            Google Drive Sharing Link <span className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>(Shared as 'Anyone with the link → Viewer')</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={driveUrlInput}
              onChange={(e) => setDriveUrlInput(e.target.value)}
              placeholder="https://drive.google.com/file/d/1A2B3C.../view?usp=sharing"
              className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] border text-xs focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-[var(--radius-sm)] text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer transition-colors shrink-0"
            >
              Add Link
            </button>
          </div>
        </form>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          className="p-3 rounded-[var(--radius)] text-xs border flex items-center gap-2"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            color: '#EF4444',
          }}
        >
          <AlertCircle size={14} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stacked Document Cards */}
      {documents.length > 0 && (
        <div className="space-y-2.5">
          {documents.map((doc, idx) => (
            <div
              key={doc.id || idx}
              className="p-3.5 sm:p-4 rounded-[var(--radius-lg)] border flex items-center justify-between gap-3 transition-all hover:border-[var(--green)]/40"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                >
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold truncate block" style={{ color: 'var(--text-primary)' }}>
                      {doc.fileName || 'Proof_Document.pdf'}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.2 rounded shrink-0"
                      style={{ backgroundColor: 'var(--green-light)', color: 'var(--green-text)' }}
                    >
                      Ready
                    </span>
                  </div>
                  <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatFileSize(doc.fileSize)} • Document #{idx + 1}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={doc.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-sm)] border inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <ExternalLink size={12} />
                  <span>Preview</span>
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(doc.id);
                  }}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-red-500 hover:bg-red-500/10 cursor-pointer inline-flex items-center gap-1 transition-colors"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  title="Remove this document"
                >
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Remove</span>
                </button>
              </div>
            </div>
          ))}

          {/* Compact Dropzone: + Attach another document */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFilesUpload(e.dataTransfer.files);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="p-3.5 rounded-[var(--radius-lg)] border-2 border-dashed flex items-center justify-center gap-2 text-center cursor-pointer hover:border-[var(--green)] hover:bg-[var(--bg-input)] transition-all"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--bg-card)',
            }}
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-emerald-500" />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {uploadStatusText || 'Attaching document...'}
                </span>
              </div>
            ) : (
              <>
                <UploadCloud size={16} style={{ color: 'var(--green-text)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  + Attach another document{' '}
                  <span className="font-normal text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    (Drag & drop or Browse)
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Primary Full Dropzone when 0 files attached */}
      {documents.length === 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFilesUpload(e.dataTransfer.files);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className="p-7 sm:p-9 rounded-[var(--radius-xl)] border-2 border-dashed text-center cursor-pointer hover:border-[var(--green)] transition-all group flex flex-col items-center justify-center gap-3"
          style={{
            borderColor: 'var(--border-strong)',
            backgroundColor: 'var(--bg-input)',
          }}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 size={28} className="animate-spin text-emerald-500" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {uploadStatusText || 'Uploading documents to storage...'}
              </span>
            </div>
          ) : (
            <>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--green-text)',
                  border: '1px solid var(--border)',
                }}
              >
                <UploadCloud size={24} />
              </div>

              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Drag & drop your files here, or{' '}
                  <span style={{ color: 'var(--green-text)' }}>browse</span>
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Attach official certificates, letters, or grade sheets. Multiple files supported.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
