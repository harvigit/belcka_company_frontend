import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const PDF_PAGE_BLOCK_ATTR = "data-pdf-block";

/**
 * Preload and wait for all images within the container to finish loading
 * before html2canvas takes a snapshot.
 */
export const waitForPdfImages = async (element: HTMLElement, timeoutMs = 5000): Promise<void> => {
  const images = Array.from(element.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timeout = window.setTimeout(() => finish(), timeoutMs);
        const finish = () => {
          window.clearTimeout(timeout);
          image.removeEventListener("load", finish);
          image.removeEventListener("error", finish);
          resolve();
        };
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    })
  );
};

/**
 * Capture and download an HTML element as an executive-ready A4 multi-page PDF.
 */
export const exportSurveyReportToPdf = async (
  element: HTMLElement,
  fileName: string = "Survey-Inspection-Report.pdf"
): Promise<void> => {
  await waitForPdfImages(element);

  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const footerHeight = 28;
  const pageContentHeight = pageHeight - footerHeight;

  const pageBlocks = Array.from(element.querySelectorAll<HTMLElement>(`[${PDF_PAGE_BLOCK_ATTR}="true"]`));

  if (pageBlocks.length > 0) {
    let cursorY = 0;
    let previousBlockBottom = 0;

    for (const block of pageBlocks) {
      const canvas = await html2canvas(block, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: block.scrollWidth,
        height: block.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const blockImageWidth = (block.scrollWidth * pageWidth) / element.scrollWidth;
      const blockImageHeight = (canvas.height * blockImageWidth) / canvas.width;
      const blockImageData = canvas.toDataURL("image/jpeg", 0.95);
      const blockX = (block.offsetLeft * pageWidth) / element.scrollWidth;
      const rawBlockGap = Math.max(block.offsetTop - previousBlockBottom, 0) * (pageWidth / element.scrollWidth);
      const blockGap = previousBlockBottom === 0 ? 0 : Math.min(rawBlockGap, 20);
      previousBlockBottom = block.offsetTop + block.offsetHeight;

      // Check if block fits on current page
      if (cursorY > 0 && cursorY + blockGap + blockImageHeight > pageContentHeight) {
        pdf.addPage();
        cursorY = 0;
      } else if (cursorY > 0) {
        cursorY += blockGap;
      }

      // If block fits within one single page
      if (blockImageHeight <= pageContentHeight) {
        pdf.addImage(blockImageData, "JPEG", blockX, cursorY, blockImageWidth, blockImageHeight);
        cursorY += blockImageHeight;
        continue;
      }

      // For extra-large blocks exceeding a single page
      let remainingHeight = blockImageHeight;
      let sourceY = 0;

      while (remainingHeight > 0) {
        const availableHeight = pageContentHeight - cursorY;
        const drawHeight = Math.min(remainingHeight, availableHeight);

        pdf.addImage(blockImageData, "JPEG", blockX, cursorY - sourceY, blockImageWidth, blockImageHeight);
        remainingHeight -= drawHeight;
        sourceY += drawHeight;
        cursorY += drawHeight;

        if (remainingHeight > 0) {
          pdf.addPage();
          cursorY = 0;
        }
      }
    }

    // Draw page numbers on all pages
    const totalPages = pdf.getNumberOfPages();
    pdf.setFontSize(9);
    pdf.setTextColor(113, 130, 139);
    for (let index = 1; index <= totalPages; index += 1) {
      pdf.setPage(index);
      pdf.text(
        `Belcka Survey Studio • Page ${index} of ${totalPages}`,
        pageWidth - 36,
        pageHeight - 14,
        { align: "right" }
      );
    }

    pdf.save(fileName);
    return;
  }

  // Fallback if no individual blocks defined: snapshot entire container
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
};
