// Debug script for resolveObjectURL
const buffer = require('buffer');
const { Blob } = buffer;

console.log('===== Debug resolveObjectURL =====');

// 1. 检查函数存在性
console.log('buffer.resolveObjectURL exists:', typeof buffer.resolveObjectURL);
console.log('URL exists:', typeof URL);
console.log('URL.createObjectURL exists:', typeof URL?.createObjectURL);

// 2. 检查Blob构造函数
console.log('Blob exists:', typeof Blob);

try {
  // 3. 创建Blob
  const blob = new Blob(['hello world'], { type: 'text/plain' });
  console.log('Blob created:', !!blob);
  console.log('Blob size:', blob.size);
  console.log('Blob type:', blob.type);
  
  // 4. 创建URL
  const url = URL.createObjectURL(blob);
  console.log('URL created:', url);
  console.log('URL format check:', url.startsWith('blob:nodedata:'));
  
  // 5. 解析URL
  const resolved = buffer.resolveObjectURL(url);
  console.log('Resolved:', !!resolved);
  if (resolved) {
    console.log('Resolved size:', resolved.size);
    console.log('Resolved type:', resolved.type);
  }
  
  // 6. 检查函数属性
  console.log('resolveObjectURL.length:', buffer.resolveObjectURL.length);
  console.log('resolveObjectURL.name:', buffer.resolveObjectURL.name);
  
} catch (e) {
  console.log('Error:', e.message);
  console.log('Stack:', e.stack);
}

console.log('===== End Debug =====');

return { success: true };
