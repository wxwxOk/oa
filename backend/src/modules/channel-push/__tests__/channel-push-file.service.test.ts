import { describe, expect, it } from 'bun:test';

import { BizError } from '../../../utils/errors';
import {
  ALLOWED_CHANNEL_PUSH_MIME_TYPES,
  MAX_CHANNEL_PUSH_ATTACHMENTS,
  MAX_CHANNEL_PUSH_FILE_SIZE,
  assertAllowedChannelPushFile,
  buildChannelPushDownloadHeaders,
  buildChannelPushPreviewHeaders,
  channelPushExtensionForMimeType,
  getSafeChannelPushStoredName,
  resolveSafeChannelPushPath,
} from '../channel-push-file.service';

describe('channel-push file service contract', () => {
  it('pins allowed MIME types and upload limits (mirror v1.4 reimbursement)', () => {
    expect(ALLOWED_CHANNEL_PUSH_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]);
    expect(MAX_CHANNEL_PUSH_FILE_SIZE).toBe(10 * 1024 * 1024);
    expect(MAX_CHANNEL_PUSH_ATTACHMENTS).toBe(20);
  });

  it('generates safe stored names without reusing the original basename', () => {
    const storedName = getSafeChannelPushStoredName('id-front.jpg', 'image/jpeg');

    expect(storedName).toMatch(/^[A-Za-z0-9_-]+\.jpg$/);
    expect(storedName).not.toContain('id-front');
    expect(channelPushExtensionForMimeType('image/jpeg')).toBe('.jpg');
    expect(channelPushExtensionForMimeType('image/png')).toBe('.png');
    expect(channelPushExtensionForMimeType('image/webp')).toBe('.webp');
    expect(channelPushExtensionForMimeType('application/pdf')).toBe('.pdf');
  });

  it('rejects unsupported MIME types and oversized files with BizError', () => {
    expect(() => channelPushExtensionForMimeType('text/html')).toThrow(BizError);
    expect(() =>
      assertAllowedChannelPushFile({
        mimeType: 'image/png',
        size: MAX_CHANNEL_PUSH_FILE_SIZE + 1,
        originalName: 'too-large.png',
      }),
    ).toThrow(BizError);
    expect(() =>
      assertAllowedChannelPushFile({
        mimeType: 'text/html',
        size: 1024,
        originalName: 'evil.html',
      }),
    ).toThrow(BizError);
    expect(() =>
      assertAllowedChannelPushFile({
        mimeType: 'image/png',
        size: 1024,
        originalName: 'photo.png',
      }),
    ).not.toThrow();
  });

  it('rejects path traversal when resolving stored attachment paths', () => {
    expect(() => resolveSafeChannelPushPath('../escape.jpg')).toThrow(BizError);
    expect(() => resolveSafeChannelPushPath('subdir/../../etc/passwd')).toThrow(BizError);
  });

  it('falls back to CHANNEL_PUSH_UPLOAD_DIR / cwd uploads/channel-push', async () => {
    const source = await Bun.file(new URL('../channel-push-file.service.ts', import.meta.url)).text();

    expect(source).toContain('CHANNEL_PUSH_UPLOAD_DIR');
    expect(source).toContain('process.env.CHANNEL_PUSH_UPLOAD_DIR');
    expect(source).toMatch(/uploads['"\/\\,]+channel-push/);
  });

  it('builds safe preview and download headers', () => {
    const previewHeaders = buildChannelPushPreviewHeaders({
      mimeType: 'image/png',
      originalName: 'id-front.png',
    });
    const downloadHeaders = buildChannelPushDownloadHeaders({
      mimeType: 'application/pdf',
      originalName: 'evidence\r\n.pdf',
    });

    expect(previewHeaders['Content-Type']).toBe('image/png');
    expect(previewHeaders['Content-Disposition']).toContain('inline');
    expect(downloadHeaders['Content-Type']).toBe('application/pdf');
    expect(downloadHeaders['Content-Disposition']).toContain('attachment');
    expect(downloadHeaders['Content-Disposition']).toContain('evidence.pdf');
    expect(downloadHeaders['Content-Disposition']).not.toContain('\r');
    expect(downloadHeaders['Content-Disposition']).not.toContain('\n');
  });

  it('keeps upload handling dependency-light (no multer / formidable / busboy)', async () => {
    const packageJson = await Bun.file(new URL('../../../../package.json', import.meta.url)).text();

    expect(packageJson).not.toMatch(/"(?:multer|formidable|busboy)"/);
  });
});
