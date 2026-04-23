# Tasks: signature-dialog-ux

## SignatureField.vue Rewrite

- [x] 1.1 Add imports: ref, shallowRef, nextTick, watch, onBeforeUnmount from vue; useResponsive composable; SignaturePad
- [x] 1.2 Define state: dialogOpen, draftValue, canvasRef, canvasHostRef, padRef(shallowRef), observerRef(shallowRef), openToken(let)
- [x] 1.3 Implement trigger area template: empty state (dashed border + icon + "点击签名") and signed state (preview img + "重新签名")
- [x] 1.4 Implement QDialog template: persistent, :maximized="isMobile", mobile q-bar / desktop card-section toolbar, canvas-host section, confirm button
- [x] 1.5 Implement openDialog(): set dialogOpen=true, pushState({ signatureDialog: true })
- [x] 1.6 Implement closeDialog(): set dialogOpen=false, history.back() if state has signatureDialog
- [x] 1.7 Implement watch(dialogOpen): on open → token guard, draftValue=modelValue, nextTick → initPad → rAF → resizeCanvas, setup ResizeObserver; on close → observer.disconnect, pad.off, cleanup refs
- [x] 1.8 Implement initPad(): create SignaturePad on canvasRef with penColor=#000, bg=#fff, minWidth=0.5, maxWidth=2.5
- [x] 1.9 Implement resizeCanvas(): snapshot save, calculate physical pixels (DPR capped at 2), set canvas width/height, ctx.scale, pad.clear, restore from snapshot
- [x] 1.10 Implement clearDraft(): pad.clear(), draftValue=''
- [x] 1.11 Implement confirmSign(): draftValue=pad.toDataURL('image/png'), emit update:modelValue, closeDialog
- [x] 1.12 Implement popstate listener: onMounted add listener (if dialogOpen → close), onBeforeUnmount remove listener
- [x] 1.13 Implement defineExpose: save() → if pad exists return pad.toDataURL + emit, else return modelValue; clear() → emit empty + clear pad + reset draft; isEmpty() → if pad → pad.isEmpty(), else → !modelValue
- [x] 1.14 Implement preview=true template: responsive placeholder (width:100%, height:80px, dashed border, "签名区域" text)
- [x] 1.15 Write scoped CSS: .signature-trigger, .signature-dialog-card, .mobile variant with safe-area, .canvas-host, .signature-canvas-dialog (touch-action:none), .dialog-actions

## FieldRenderer.vue Modification

- [x] 2.1 Designer mode: replace `<div class="signature-placeholder">签名区域</div>` with `<SignatureField :preview="true" />`
- [x] 2.2 Remove `.signature-placeholder` CSS class from scoped styles

## Verification

- [x] 3.1 Manual test: fill mode — click trigger opens dialog, draw signature, confirm shows preview, re-sign works
- [x] 3.2 Manual test: desktop dialog 600x400, mobile dialog fullscreen with safe-area
- [x] 3.3 Manual test: mobile back button closes dialog without losing form data
- [x] 3.4 Manual test: form submission with signature — saveSignature() returns correct base64
- [x] 3.5 Manual test: form validation — required signature field shows error when empty
- [x] 3.6 Manual test: designer mode shows responsive placeholder
- [x] 3.7 Manual test: print mode unchanged (img tag)
- [x] 3.8 Manual test: rapid open/close does not cause errors or stale canvas
- [x] 3.9 Manual test: orientation change during signing preserves drawing
