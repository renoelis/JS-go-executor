const xlsx = require('xlsx');

const wb = xlsx.utils.book_new();
console.log('workbook created');
console.log('typeof wb.close:', typeof wb.close);
console.log('wb keys:', Object.keys(wb));

if (typeof wb.close === 'function') {
  wb.close();
  console.log('close() called successfully');
  return { success: true, hasClose: true };
} else {
  console.log('close() not found');
  return { success: false, hasClose: false };
}
