import { describe, expect, it } from 'bun:test';

async function readPrismaSchema() {
  return Bun.file(new URL('../../../../prisma/schema.prisma', import.meta.url)).text();
}

function block(source: string, kind: 'enum' | 'model', name: string) {
  const match = source.match(new RegExp(`${kind} ${name} \\{[\\s\\S]*?\\n\\}`));
  expect(match?.[0]).toBeTruthy();
  return match![0];
}

describe('reimbursement Prisma schema contract', () => {
  it('pins reimbursement statuses and append-only action types', async () => {
    const schema = await readPrismaSchema();
    const statusEnum = block(schema, 'enum', 'ReimbursementStatus');
    const actionEnum = block(schema, 'enum', 'ReimbursementActionType');

    for (const status of ['DRAFT', 'DEPARTMENT_REVIEW', 'FINANCE_REVIEW', 'APPROVED', 'REJECTED']) {
      expect(statusEnum).toContain(status);
    }
    for (const action of ['SUBMIT', 'DEPARTMENT_APPROVE', 'DEPARTMENT_REJECT', 'FINANCE_APPROVE', 'FINANCE_REJECT']) {
      expect(actionEnum).toContain(action);
    }
  });

  it('pins fixed reimbursement application fields without JSON business payloads', async () => {
    const schema = await readPrismaSchema();
    const application = block(schema, 'model', 'ReimbursementApplication');

    expect(application).toMatch(/applicationNo\s+String\s+@unique/);
    expect(application).toMatch(/title\s+String/);
    expect(application).toMatch(/category\s+String/);
    expect(application).toMatch(/occurredAt\s+DateTime/);
    expect(application).toMatch(/amount\s+Decimal\s+@db\.Decimal\(12,\s*2\)/);
    expect(application).toMatch(/reason\s+String/);
    expect(application).toMatch(/payeeInfo\s+String\?/);
    expect(application).toMatch(/remark\s+String\?/);
    expect(application).toMatch(/applicantId\s+Int/);
    expect(application).toMatch(/applicantName\s+String/);
    expect(application).toMatch(/applicantDepartmentId\s+Int\?/);
    expect(application).toMatch(/applicantDepartmentName\s+String\?/);
    expect(application).toMatch(/submittedAt\s+DateTime\?/);
    expect(application).toMatch(/completedAt\s+DateTime\?/);
    expect(application).toMatch(/createdAt\s+DateTime\s+@default\(now\(\)\)/);
    expect(application).toMatch(/updatedAt\s+DateTime\s+@updatedAt/);
    expect(application).not.toMatch(/\b(?:formData|data|payload)\s+Json\s+@default/);
    expect(application).not.toContain('ApprovalApplication');
  });

  it('pins list filter indexes on reimbursement applications', async () => {
    const application = block(await readPrismaSchema(), 'model', 'ReimbursementApplication');

    for (const field of ['applicantId', 'applicantDepartmentId', 'status', 'category', 'occurredAt', 'createdAt']) {
      expect(application).toContain(`@@index([${field}])`);
    }
  });

  it('pins attachment and action models for metadata and audit trail', async () => {
    const schema = await readPrismaSchema();
    const attachment = block(schema, 'model', 'ReimbursementAttachment');
    const action = block(schema, 'model', 'ReimbursementAction');

    for (const field of ['originalName', 'storedName', 'relativePath', 'mimeType', 'size', 'uploaderId', 'createdAt']) {
      expect(attachment).toContain(field);
    }
    for (const field of ['applicationId', 'actorId', 'actorName', 'type', 'comment', 'createdAt']) {
      expect(action).toContain(field);
    }
  });
});
