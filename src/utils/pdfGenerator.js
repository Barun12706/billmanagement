import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export const generatePDF = async (elementId, invoiceNumber) => {
  const element = document.getElementById(elementId);
  if (!element) {
    if (import.meta.env.DEV) console.error("Element not found");
    return;
  }

  try {
    // Generate PNG directly using html-to-image, which safely handles modern CSS (like oklch)
    const imgData = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2, // High resolution
    });

    // Use actual dimensions of the element
    const rect = element.getBoundingClientRect();
    const canvasWidth = rect.width || 800;
    const canvasHeight = rect.height || 1131;
    
    // A4 size in mm
    const pdfWidth = 210;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Calculate aspect ratio
    const imgWidth = pdfWidth;
    const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`Invoice_${invoiceNumber}.pdf`);
  } catch (error) {
    if (import.meta.env.DEV) console.error("Error generating PDF", error);
    throw error;
  }
};
