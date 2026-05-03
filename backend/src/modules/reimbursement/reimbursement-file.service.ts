import { mkdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import { nanoid } from 'nanoid';

import { BizError } from '../../utils/errors';

export const ALLOWED_REIMBURSEMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
export const MAX_REIMBURSEMENT_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_REIMBURSEMENT_ATTACHMENTS = 20;

type ReimbursementFileInput = {
  mimeType: string;
  size: number;
  originalName: string;
};

type ReimbursementHeaderInput = {
  mimeType: string;
  originalName: string;
};

export function reimbursementExtensionForMimeType(mimeType: string) {
  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'application/pdf') return '.pdf';
  throw new BizError('不支持的报销附件类型', 400, 'REIMBURSEMENT_FILE_TYPE_NOT_ALLOWED');
}

export function assertAllowedReimbursementFile(file: ReimbursementFileInput) {
  reimbursementExtensionForMimeType(file.mimeType);
  if (!file.originalName?.trim()) {
    throw new BizError('报销附件文件名不能为空', 400, 'REIMBURSEMENT_FILE_NAME_REQUIRED');
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new BizError('报销附件不能为空', 400, 'REIMBURSEMENT_FILE_EMPTY');
  }
  if (file.size > MAX_REIMBURSEMENT_FILE_SIZE) {
    throw new BizError('报销附件不能超过 10MB', 400, 'REIMBURSEMENT_FILE_TOO_LARGE');
  }
}

export function getSafeReimbursementStoredName(originalName: string, mimeType: string) {
  void originalName;
  return `${nanoid(16)}${reimbursementExtensionForMimeType(mimeType)}`;
}

export function getReimbursementUploadRoot() {
  return path.resolve(process.env.REIMBURSEMENT_UPLOAD_DIR ?? path.join(process.cwd(), 'uploads', 'reimbursements'));
}

export function resolveSafeReimbursementPath(relativePath: string) {
  if (!relativePath?.trim() || path.isAbsolute(relativePath)) {
    throw new BizError('报销附件路径无效', 400, 'INVALID_REIMBURSEMENT_FILE_PATH');
  }

  const root = getReimbursementUploadRoot();
  const absolutePath = path.resolve(root, relativePath);
  const relativeToRoot = path.relative(root, absolutePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new BizError('报销附件路径无效', 400, 'INVALID_REIMBURSEMENT_FILE_PATH');
  }
  return absolutePath;
}

export function buildReimbursementRelativePath(applicationId: number, storedName: string) {
  return `${applicationId}/${storedName}`;
}

export async function writeReimbursementFile(relativePath: string, file: File) {
  const absolutePath = resolveSafeReimbursementPath(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await Bun.write(absolutePath, file);
}

export async function deleteReimbursementFile(relativePath: string) {
  await rm(resolveSafeReimbursementPath(relativePath), { force: true });
}

function sanitizeHeaderFilename(originalName: string) {
  const cleaned = originalName.replace(/[\r\n/\\]/g, '').trim();
  return cleaned || 'attachment';
}

function buildContentDisposition(disposition: 'inline' | 'attachment', originalName: string) {
  return `${disposition}; filename="${sanitizeHeaderFilename(originalName)}"`;
}

export function buildReimbursementPreviewHeaders(file: ReimbursementHeaderInput) {
  return {
    'Content-Type': file.mimeType,
    'Content-Disposition': buildContentDisposition('inline', file.originalName),
  };
}

export function buildReimbursementDownloadHeaders(file: ReimbursementHeaderInput) {
  return {
    'Content-Type': file.mimeType,
    'Content-Disposition': buildContentDisposition('attachment', file.originalName),
  };
}
