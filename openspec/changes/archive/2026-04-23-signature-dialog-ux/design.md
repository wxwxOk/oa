# Design: signature-dialog-ux

## Architecture

### Component Boundary

```
FieldRenderer.vue
  ├── mode=designer → <SignatureField :preview="true" />
  ├── mode=fill    → <SignatureField :preview="false" v-model="..." />
  └── mode=print   → <img :src="modelValue" /> (unchanged)

SignatureField.vue (single file, no sub-components)
  ├── preview=true  → responsive placeholder div
  └── preview=false → trigger area + QDialog + canvas
```

### State Flow

```
[Trigger Area] --click--> dialogOpen=true
                           ├── pushState({ signatureDialog: true })
                           ├── draftValue = modelValue
                           ├── nextTick → initPad → rAF → resizeCanvas
                           └── restoreDraft if draftValue exists

[Dialog Canvas] --draw--> pad internal state (no emit)

[Clear Button]  --click--> pad.clear() + draftValue=''

[Confirm]       --click--> draftValue = pad.toDataURL()
                           ├── emit('update:modelValue', draftValue)
                           └── dialogOpen=false → destroyPad → history.back()

[Close/X]       --click--> dialogOpen=false → destroyPad → history.back()
                           (draftValue discarded, modelValue unchanged)

[Back Button]   --popstate--> dialogOpen=false → destroyPad
                              (draftValue discarded)

[External save()] ---------> if pad exists: return pad.toDataURL() + emit
                              else: return modelValue
```

### Canvas Lifecycle

```
watch(dialogOpen) {
  if (open) {
    token = ++openToken
    draftValue = modelValue
    await nextTick()
    if (token !== openToken) return  // race guard
    initPad()
    rAF(() => resizeCanvas())
    observer = new ResizeObserver(() => resizeCanvas())
    observer.observe(canvasHost)
  } else {
    observer?.disconnect()
    pad?.off()
    padRef = null
  }
}

resizeCanvas() {
  snapshot = pad.isEmpty() ? draftValue : pad.toDataURL()
  ratio = min(devicePixelRatio, 2)
  canvas.width = floor(host.clientWidth * ratio)
  canvas.height = floor(host.clientHeight * ratio)
  canvas.style.width = host.clientWidth + 'px'
  canvas.style.height = host.clientHeight + 'px'
  ctx.scale(ratio, ratio)
  pad.clear()
  if (snapshot) pad.fromDataURL(snapshot)
}
```

### History State Management

```
openDialog() {
  dialogOpen = true
  history.pushState({ signatureDialog: true }, '')
}

onPopstate(event) {
  if (dialogOpen) {
    dialogOpen = false  // triggers watch → cleanup
  }
}

closeDialog() {
  if (dialogOpen) {
    dialogOpen = false
    // Only go back if we pushed state
    if (history.state?.signatureDialog) {
      history.back()
    }
  }
}
```

### Template Structure (SignatureField, preview=false)

```html
<!-- Trigger Area -->
<div class="signature-trigger" @click="openDialog" tabindex="0" @keyup.enter="openDialog">
  <template v-if="modelValue">
    <img :src="modelValue" class="signature-preview-img" />
    <q-btn flat dense size="sm" label="重新签名" class="re-sign-btn" />
  </template>
  <template v-else>
    <q-icon name="edit" size="24px" color="grey-5" />
    <span class="trigger-hint">点击签名</span>
  </template>
</div>

<!-- Dialog -->
<q-dialog v-model="dialogOpen" persistent
  :maximized="isMobile"
  :transition-show="isMobile ? 'slide-up' : 'scale'"
  :transition-hide="isMobile ? 'slide-down' : 'scale'"
>
  <q-card :class="['signature-dialog-card', { mobile: isMobile }]">
    <q-bar v-if="isMobile" class="bg-primary text-white">
      <div>手写签名</div>
      <q-space />
      <q-btn dense flat icon="delete_outline" @click="clearDraft" />
      <q-btn dense flat icon="close" @click="closeDialog" />
    </q-bar>
    <q-card-section v-else class="row items-center q-pb-none">
      <div class="text-h6">手写签名</div>
      <q-space />
      <q-btn flat dense label="清除" @click="clearDraft" />
      <q-btn flat dense round icon="close" @click="closeDialog" />
    </q-card-section>

    <q-card-section class="col canvas-host" ref="canvasHostRef">
      <canvas ref="canvasRef" class="signature-canvas-dialog" />
    </q-card-section>

    <q-card-actions class="dialog-actions">
      <q-btn unelevated color="primary" label="确认签名" class="full-width" @click="confirmSign" />
    </q-card-actions>
  </q-card>
</q-dialog>
```

### CSS Key Points

```css
.signature-trigger {
  width: 100%;
  height: 80px;
  border: 1px dashed var(--oa-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  background: #fff;
  position: relative;
}

.signature-dialog-card {
  width: 600px;
  max-width: 100vw;
  height: 400px;
  display: flex;
  flex-direction: column;
}

.signature-dialog-card.mobile {
  width: 100vw;
  height: 100dvh;
  border-radius: 0;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}

.canvas-host {
  flex: 1;
  overflow: hidden;
  padding: 8px;
}

.signature-canvas-dialog {
  width: 100%;
  height: 100%;
  border: 1px solid var(--oa-border);
  background: #fff;
  touch-action: none;
  overscroll-behavior: contain;
}

.dialog-actions {
  padding-bottom: env(safe-area-inset-bottom, 8px);
}
```

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/designer/fields/SignatureField.vue` | Rewrite | Trigger area + QDialog + canvas lifecycle |
| `frontend/src/components/renderer/FieldRenderer.vue` | Modify | Designer mode: replace `.signature-placeholder` with `<SignatureField :preview="true" />` |

## Files NOT Changed

| File | Reason |
|------|--------|
| `FieldRenderer.vue` fill mode | SignatureField handles dialog internally |
| `FieldRenderer.vue` print mode | Already uses `<img>`, unaffected |
| `GridFormRenderer.vue` | `saveSignature()` → `sigRef.save()` still works |
| `PublicFillPage.vue` | Submission flow unchanged |
| Backend (all) | Signature value format unchanged |
