import { forwardRef } from 'react';
import { numberToWords } from '../utils/numberToWords';

const BillPreview = forwardRef(({ invoiceData, totals }, ref) => {
  if (!invoiceData) return null;

  const { customer, lineItems, invoiceNumber, date } = invoiceData;
  const { subtotal, sgst, cgst, grandTotal } = totals;

  const formattedDate = date ? new Date(date).toLocaleDateString('en-GB') : ''; // DD/MM/YYYY

  // Empty rows to pad the table
  const emptyRows = Math.max(0, 30 - lineItems.length);

  return (
    <div className="bg-white" ref={ref}>
      {/* 
        Fixed width for A4 proportion (e.g. 210mm x 297mm). 
        Using pixels to ensure html-to-image captures correctly.
        Width: ~800px is usually good for A4 
      */}
      <div style={{ width: '800px', height: '1131px', padding: '32px' }} className="mx-auto bg-white text-black font-sans">
        <div className="border-2 border-black h-full flex flex-col overflow-hidden text-[12px] leading-tight bg-white">
        
        {/* Header Section */}
        <div className="flex border-b border-black pb-2 items-center">
          {/* Logo */}
          <div className="w-[120px] h-[120px] ml-4 shrink-0 flex items-center justify-center p-2">
            <img src="/logo.jpeg" alt="Biotera Pharma Logo" className="max-w-full max-h-full object-contain mix-blend-multiply rounded-full" />
          </div>
          
          <div className="flex-1 text-center pl-4 pr-[120px]">
            <h1 className="text-3xl font-extrabold mb-2 uppercase tracking-wide">BIOTERA PHARMA PVT. LTD.</h1>
            <p className="text-[11px] mb-1">PARSA BAZAR, MAHULI PIPE FACTORY ROAD PATNA 804453.</p>
            <p className="text-[11px] mb-1">PHARMACEUTICAL DISTRIBUTORS & STOCKS.</p>
            <p className="text-[11px] mb-1">PHONE : 8963006572</p>
            <p className="text-[11px] text-blue-600 underline">EMAIL : BIOTERAPHARMA4025@GMAIL.COM</p>
          </div>
        </div>

        <div className="text-center font-bold text-sm py-1 border-b border-black">
          GST INVOICE
        </div>

        <div className="flex justify-between font-bold text-[11px] py-1 border-b border-black px-2">
          <span>GSTIN.: 10AANCB3724A1ZE</span>
          <span>D.L.NO.: 20B2025BR002624,606</span>
        </div>

        {/* Customer & Invoice Details */}
        <div className="flex border-b border-black h-[120px]">
          {/* Left: Customer */}
          <div className="w-[60%] border-r border-black p-2 flex flex-col">
            <div className="font-bold uppercase text-[12px] mb-1">M/S {customer.partyName}</div>
            <div className="flex-1 uppercase">{customer.address}</div>
            <div className="mt-auto">
              <div className="flex"><span className="w-20">GSTIN NO.:</span> <span className="uppercase">{customer.gstin}</span></div>
              <div className="flex"><span className="w-20">DL.NO.:</span> <span className="uppercase">{customer.dlNo}</span></div>
              <div className="flex"><span className="w-20">PH.NO.:</span> <span>{customer.phone}</span></div>
            </div>
          </div>
          {/* Right: Invoice */}
          <div className="w-[40%] p-2 flex flex-col justify-between">
            <div className="flex justify-between"><span className="font-bold">INVOICE NO. : {invoiceNumber}</span> <span className="font-bold">DATE: {formattedDate}</span></div>
            <div className="flex"><span className="w-24">ORDER NO. :</span> <span></span></div>
            <div className="flex"><span className="w-24">L.R.NO. :</span> <span></span></div>
            <div className="flex"><span className="w-24">CASES. :</span> <span></span></div>
            <div className="flex"><span className="w-24">TRANSPORT.:</span> <span></span></div>
            <div className="flex"><span className="w-24">DUE DATE. :</span> <span></span></div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 flex flex-col border-b border-black -mx-4 px-4 overflow-hidden">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-black font-bold">
                <th className="py-2 border-r border-black w-8">S.</th>
                <th className="py-2 border-r border-black">PRODUCT</th>
                <th className="py-2 border-r border-black w-12">QTY</th>
                <th className="py-2 border-r border-black w-16">PACK</th>
                <th className="py-2 border-r border-black w-20">HSN</th>
                <th className="py-2 border-r border-black w-20">BATCH</th>
                <th className="py-2 border-r border-black w-16">EXP</th>
                <th className="py-2 border-r border-black w-16">M.R.P</th>
                <th className="py-2 border-r border-black w-16">RATE</th>
                <th className="py-2 border-r border-black w-12">DIS.</th>
                <th className="py-2 w-24">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="py-2 border-r border-black">{idx + 1}</td>
                  <td className="py-2 border-r border-black text-left pl-2">{item.productName}</td>
                  <td className="py-2 border-r border-black">{item.qty}</td>
                  <td className="py-2 border-r border-black">{item.packSize}</td>
                  <td className="py-2 border-r border-black">{item.hsnCode}</td>
                  <td className="py-2 border-r border-black">{item.batch}</td>
                  <td className="py-2 border-r border-black">{item.exp}</td>
                  <td className="py-2 border-r border-black">{item.mrp?.toFixed(2)}</td>
                  <td className="py-2 border-r border-black">{item.rate?.toFixed(2)}</td>
                  <td className="py-2 border-r border-black">0</td>
                  <td className="py-2">{item.amount?.toFixed(2)}</td>
                </tr>
              ))}
              {/* Empty rows filler */}
              {Array.from({ length: emptyRows }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-8">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex border-b border-black">
          <div className="w-[70%] border-r border-black p-1 text-[10px]">
             GST {subtotal.toFixed(2)}*2.5%+2.5%={sgst.toFixed(2)}SGST+{cgst.toFixed(2)}CGST
          </div>
          <div className="w-[30%] flex flex-col font-bold">
             <div className="flex justify-between px-2 py-1"><span className="w-24">SAB TOTAL</span> <span>₹ {(subtotal || 0).toFixed(2)}</span></div>
             <div className="flex justify-between px-2 py-1"><span className="w-24">SGST 2.5%</span> <span>₹ {(sgst || 0).toFixed(2)}</span></div>
             <div className="flex justify-between px-2 py-1"><span className="w-24">CGST 2.5%</span> <span>₹ {(cgst || 0).toFixed(2)}</span></div>
          </div>
        </div>
        
        {/* Grand Total */}
        <div className="flex border-b border-black font-bold py-1">
          <div className="w-[70%] border-r border-black px-2 uppercase">
            RS {numberToWords(grandTotal)}
          </div>
          <div className="w-[30%] flex justify-between px-2">
            <span>GRAND TOTAL</span> <span>₹ {(grandTotal || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex flex-col">
          <div className="border-b border-black font-bold uppercase px-2 py-1">
            TERMS & CONDITIONS
          </div>
          <div className="border-b border-black px-2 py-1 text-[11px] leading-tight h-[100px] flex justify-between">
            <div className="flex-1">
              <div className="border-b border-black -mx-2 px-2 pb-1 mb-1">Goods once sold will note be taken back or exchange.</div>
              <div>Bills not paid due date will attract 24% interest.</div>
              <div>All disputes subject to jurisdication only.</div>
              <div>Prescribed Sales Tax declaration will be given.</div>
            </div>
            <div className="w-[200px] text-right flex items-end justify-end pb-2 font-bold">
              For BIOTERA PHARMA PVT.LTD.
            </div>
          </div>
          
          <div className="px-2 py-2 flex justify-between items-end h-[100px]">
             <div className="font-bold text-[11px] leading-tight">
               <div>BANK DETAILS NAME : BIOTERA PHARMA PVT LTD</div>
               <div className="flex gap-4">
                 <span className="w-48">BANK NAME : HDFC BANK</span>
                 <span>BRANCH : PARSA BAZAR</span>
               </div>
               <div className="flex gap-4">
                 <span className="w-48">ACCOUNT NO. : 99999304734844</span>
                 <span>IFSC : HDFC0005320</span>
               </div>
             </div>
             <div className="text-center font-bold mb-2 mr-8">
               Authorised signatory
             </div>
          </div>
        </div>

        </div>
      </div>
    </div>
  );
});

BillPreview.displayName = 'BillPreview';

export default BillPreview;
