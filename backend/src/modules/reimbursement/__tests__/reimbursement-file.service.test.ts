import { describe, expect, it } from 'bun:test';

import { BizError } from '../../../utils/errors';
import {
  ALLOWED_REIMBURSEMENT_MIME_TYPES,
  ALLOWED_REIMBURSEMENT_SIGNATURE_MIME_TYPES,
  MAX_REIMBURSEMENT_ATTACHMENTS,
  MAX_REIMBURSEMENT_FILE_SIZE,
  MAX_REIMBURSEMENT_SIGNATURE_SIZE,
  assertAllowedReimbursementFile,
  assertAllowedReimbursementSignature,
  buildReimbursementDownloadHeaders,
  buildReimbursementPreviewHeaders,
  buildReimbursementSignaturePreviewHeaders,
  buildReimbursementSignatureRelativePath,
  getSafeReimbursementSignatureStoredName,
  getSafeReimbursementStoredName,
  reimbursementExtensionForMimeType,
  resolveSafeReimbursementPath,
} from '../reimbursement-file.service';

describe('reimbursement file service contract', () => {
  it('pins allowed MIME types and upload limits', () => {
    expect(ALLOWED_REIMBURSEMENT_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]);
    expect(MAX_REIMBURSEMENT_FILE_SIZE).toBe(10 * 1024 * 1024);
    expect(MAX_REIMBURSEMENT_ATTACHMENTS).toBe(20);
    expect(ALLOWED_REIMBURSEMENT_SIGNATURE_MIME_TYPES).toEqual(['image/png']);
    expect(MAX_REIMBURSEMENT_SIGNATURE_SIZE).toBe(2 * 1024 * 1024);
  });

  it('generates safe stored names without reusing the original basename', () => {
    const storedName = getSafeReimbursementStoredName('invoice.pdf', 'application/pdf');

    expect(storedName).toMatch(/^[A-Za-z0-9_-]+\.pdf$/);
    expect(storedName).not.toContain('invoice');
    expect(reimbursementExtensionForMimeType('image/jpeg')).toBe('.jpg');
    expect(reimbursementExtensionForMimeType('image/png')).toBe('.png');
    expect(reimbursementExtensionForMimeType('image/webp')).toBe('.webp');
    expect(reimbursementExtensionForMimeType('application/pdf')).toBe('.pdf');
  });

  it('generates signature-only safe paths and headers', () => {
    const storedName = getSafeReimbursementSignatureStoredName();
    const relativePath = buildReimbursementSignatureRelativePath(12, 'DEPARTMENT_APPROVE', storedName);
    const headers = buildReimbursementSignaturePreviewHeaders();

    expect(storedName).toMatch(/^[A-Za-z0-9_-]+\.png$/);
    expect(relativePath).toBe(`signatures/12/DEPARTMENT_APPROVE/${storedName}`);
    expect(headers['Content-Type']).toBe('image/png');
    expect(headers['Content-Disposition']).toContain('inline');
    expect(headers['Content-Disposition']).toContain('signature.png');
  });

  it('rejects unsupported MIME types and oversized files with BizError', () => {
    expect(() => reimbursementExtensionForMimeType('text/html')).toThrow(BizError);
    expect(() =>
      assertAllowedReimbursementFile({
        mimeType: 'image/png',
        size: MAX_REIMBURSEMENT_FILE_SIZE + 1,
        originalName: 'too-large.png',
      }),
    ).toThrow(BizError);
    expect(() => assertAllowedReimbursementSignature({ mimeType: 'image/png', size: 1024, originalName: 'signature.png' })).not.toThrow();
    expect(() => assertAllowedReimbursementSignature({ mimeType: 'image/jpeg', size: 1024, originalName: 'signature.jpg' })).toThrow(
      BizError,
    );
    expect(() =>
      assertAllowedReimbursementSignature({
        mimeType: 'image/png',
        size: MAX_REIMBURSEMENT_SIGNATURE_SIZE + 1,
        originalName: 'signature.png',
      }),
    ).toThrow(BizError);
  });

  it('rejects path traversal when resolving stored attachment paths', () => {
    expect(() => resolveSafeReimbursementPath('../escape.pdf')).toThrow(BizError);
  });

  it('builds safe preview and download headers', () => {
    const previewHeaders = buildReimbursementPreviewHeaders({ mimeType: 'image/png', originalName: 'invoice.png' });
    const downloadHeaders = buildReimbursementDownloadHeaders({
      mimeType: 'application/pdf',
      originalName: 'invoice\r\n.pdf',
    });

    expect(previewHeaders['Content-Type']).toBe('image/png');
    expect(previewHeaders['Content-Disposition']).toContain('inline');
    expect(downloadHeaders['Content-Type']).toBe('application/pdf');
    expect(downloadHeaders['Content-Disposition']).toContain('attachment');
    expect(downloadHeaders['Content-Disposition']).toContain('invoice.pdf');
    expect(downloadHeaders['Content-Disposition']).not.toContain('\r');
    expect(downloadHeaders['Content-Disposition']).not.toContain('\n');
  });

  it('keeps upload handling dependency-light for Bun/Web file APIs', async () => {
    const packageJson = await Bun.file(new URL('../../../../package.json', import.meta.url)).text();

    expect(packageJson).not.toMatch(/"(?:multer|formidable|busboy)"/);
    expect(packageJson).toContain('nanoid');
  });
});
