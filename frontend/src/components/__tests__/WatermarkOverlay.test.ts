import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../WatermarkOverlay.vue'), 'utf8');

describe('WatermarkOverlay contract', () => {
  it('keeps a stable root host (no v-if on root) so slot subtree is never remounted on text change', () => {
    expect(source).toContain('<div class="oa-watermark-host">');
    expect(source).toContain('<slot />');
    expect(source).not.toMatch(/<div\s+v-if="text"\s+class="oa-watermark-host/);
  });

  it('renders watermark as absolute overlay (not as host background) so it does not get masked by child fills', () => {
    expect(source).toContain('class="oa-watermark-overlay"');
    expect(source).toContain('position: absolute');
    expect(source).toContain('inset: 0');
    expect(source).toContain('pointer-events: none');
  });

  it('opts the overlay out of html2canvas and screen readers', () => {
    expect(source).toContain('data-html2canvas-ignore="true"');
    expect(source).toContain('aria-hidden="true"');
  });

  it('escapes XML special chars to prevent SVG injection', () => {
    for (const token of [
      'function escapeXml',
      "'<': return '&lt;'",
      "'>': return '&gt;'",
      "'&': return '&amp;'",
      "'\"': return '&quot;'",
      "'&apos;'",
    ]) {
      expect(source).toContain(token);
    }
  });

  it('truncates watermark text to 50 chars and encodes SVG as data URL', () => {
    expect(source).toContain('.slice(0, 50)');
    expect(source).toContain('data:image/svg+xml;utf8,');
    expect(source).toContain('encodeURIComponent(svg)');
  });

  it('uses the agreed default opacity, Chinese-first system font stack and tilt', () => {
    expect(source).toContain('opacity: 0.08');
    expect(source).toContain('PingFang SC, Microsoft YaHei, sans-serif');
    expect(source).toContain('rotate(-30 150 90)');
  });

  it('hides watermark in print media to preserve 13-pdf print contract', () => {
    expect(source).toContain('@media print');
    expect(source).toContain('display: none !important');
  });
});
