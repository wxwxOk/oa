# Specs: signature-dialog-ux

## Functional Requirements

### FR-1: Trigger Area (Fill Mode)
- Width: 100% of parent container
- Height: 80px fixed
- Empty state: dashed border (#ccc 1px), centered icon (edit) + text "点击签名"
- Signed state: signature preview image (object-fit: contain) + overlay "重新签名" button
- Click anywhere on trigger area opens signature dialog
- Keyboard accessible: tabindex="0", Enter/Space opens dialog

### FR-2: Signature Dialog
- Desktop (≥1024px): QDialog 600x400, transition scale
- Mobile (<1024px): QDialog maximized fullscreen, transition slide-up/slide-down
- `persistent` prop: backdrop click and ESC do not close
- Dialog content layout (flex column):
  - Top toolbar: title "手写签名" (left), clear button (center-right), close button (right)
  - Middle: canvas container (flex: 1, overflow: hidden)
  - Bottom: confirm button (full width, primary color)

### FR-3: Canvas Behavior
- Initialize on dialog `@show` event via `nextTick` + `requestAnimationFrame`
- Physical pixel size = CSS size × min(devicePixelRatio, 2)
- CSS size: 100% width of dialog body, height fills remaining space
- ResizeObserver on canvas host: on resize → save snapshot → resize canvas → restore snapshot
- Touch: `touch-action: none`, `overscroll-behavior: contain` on canvas
- Pen: color #000, background #fff, minWidth 0.5, maxWidth 2.5

### FR-4: State Management
- `modelValue` (prop): confirmed signature, base64 PNG data URL or empty string
- `draftValue` (internal ref): in-dialog working copy
- Dialog open: `draftValue = modelValue`, init pad, restore if draftValue exists
- Clear button (in dialog): clears pad + draftValue, does NOT emit
- Confirm button: `draftValue = pad.toDataURL()`, `emit('update:modelValue', draftValue)`, close dialog
- Close button (X): discard draft, close dialog, no emit
- `openToken` (let): increments on each open, all async ops check token before executing

### FR-5: Exposed API (defineExpose)
- `save()`: if dialog open and pad exists → return pad.toDataURL() and emit; else return modelValue
- `clear()`: emit('update:modelValue', ''), clear pad if exists, reset draftValue
- `isEmpty()`: if dialog open → pad?.isEmpty() ?? true; else → !modelValue

### FR-6: Designer Mode
- SignatureField with `preview=true` renders responsive placeholder
- Width: 100%, height: 80px, dashed border, centered "签名区域" text
- FieldRenderer removes `.signature-placeholder` div, uses `<SignatureField :preview="true" />` instead

### FR-7: Mobile Back Button
- Dialog open: `history.pushState({ signatureDialog: true }, '')`
- `popstate` listener: if dialog open → close dialog (discard draft)
- Dialog close (any path): if history state has signatureDialog → `history.back()`
- Cleanup: remove popstate listener on component unmount and dialog close

### FR-8: Print Mode
- No change. FieldRenderer continues using `<img>` tag for signature in print mode.

## Non-Functional Requirements

### NFR-1: Performance
- No emit during drawing (only on confirm/clear)
- DPR ratio capped at 2 to limit base64 payload size
- shallowRef for pad and observer (no deep reactivity)

### NFR-2: Compatibility
- Quasar ^2.17.0 QDialog API
- signature_pad ^5.1.3
- Mobile Safari safe-area-inset support
- Works with existing form validation flow (FieldRenderer.validate → sigError)
- Works with existing submission flow (GridFormRenderer.saveSignatures → sigRef.save)

## Constraints
- Backend: zero changes. Signature value remains base64 PNG string in Submission.data JSON.
- canvas.width/height assignment clears content (browser spec). Must save/restore around resize.
- signature_pad.fromDataURL is async but does not return a promise in v5. Use setTimeout(0) or requestAnimationFrame for restore timing.
