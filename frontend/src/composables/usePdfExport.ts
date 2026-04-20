import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * 将 DOM 元素导出为 PDF 文件
 * @param element 要截图的 DOM 元素（#print-area）
 * @param filename 输出文件名（含 .pdf 后缀）
 */
export async function exportToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15; // mm
  const contentWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;
  const maxContentHeight = pageHeight - margin * 2;

  if (imgHeight <= maxContentHeight) {
    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, imgHeight);
  } else {
    // 分页处理
    let remainingHeight = imgHeight;
    let sourceY = 0;
    while (remainingHeight > 0) {
      const sliceHeight = Math.min(remainingHeight, maxContentHeight);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = (sliceHeight / contentWidth) * canvas.width;
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context unavailable — browser resource limit reached');
      }
      ctx.drawImage(
        canvas,
        0, sourceY, canvas.width, sliceCanvas.height,
        0, 0, sliceCanvas.width, sliceCanvas.height,
      );
      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
      if (sourceY > 0) pdf.addPage();
      pdf.addImage(sliceData, 'JPEG', margin, margin, contentWidth, sliceHeight);
      sourceY += sliceCanvas.height;
      remainingHeight -= sliceHeight;
    }
  }

  pdf.save(filename);
}

/**
 * 批量导出多个提交为单个 PDF
 * @param renderFn 渲染函数，接收 index 返回要截图的 DOM 元素
 * @param total 总条数
 * @param filename 输出文件名
 * @param onProgress 进度回调 (current, total)
 * @param cancelRef 取消引用
 * @returns 是否完成（false 表示被取消）
 */
export async function exportBatchToPdf(
  renderFn: (index: number) => Promise<HTMLElement>,
  total: number,
  filename: string,
  onProgress?: (current: number, total: number) => void,
  cancelRef?: { value: boolean },
): Promise<boolean> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const maxContentHeight = pageHeight - margin * 2;

  for (let i = 0; i < total; i++) {
    if (cancelRef?.value) return false;
    onProgress?.(i + 1, total);

    const element = await renderFn(i);
    const canvas = await html2canvas(element, {
      scale: 1.5, // 批量时降低 scale 节省内存
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    if (i > 0) pdf.addPage();

    if (imgHeight <= maxContentHeight) {
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, imgHeight);
    } else {
      let remainingHeight = imgHeight;
      let sourceY = 0;
      let firstSlice = true;
      while (remainingHeight > 0) {
        const sliceHeight = Math.min(remainingHeight, maxContentHeight);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = (sliceHeight / contentWidth) * canvas.width;
        const ctx = sliceCanvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable — browser resource limit reached');
        }
        ctx.drawImage(
          canvas,
          0, sourceY, canvas.width, sliceCanvas.height,
          0, 0, sliceCanvas.width, sliceCanvas.height,
        );
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.9);
        if (!firstSlice) pdf.addPage();
        firstSlice = false;
        pdf.addImage(sliceData, 'JPEG', margin, margin, contentWidth, sliceHeight);
        sourceY += sliceCanvas.height;
        remainingHeight -= sliceHeight;
      }
    }
  }

  pdf.save(filename);
  return true;
}
