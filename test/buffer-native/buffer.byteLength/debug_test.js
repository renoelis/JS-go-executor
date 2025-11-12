// 调试测试
const { Buffer } = require('buffer');

try {
  // 测试 SharedArrayBuffer
  console.log('Testing SharedArrayBuffer...');
  if (typeof SharedArrayBuffer !== 'undefined') {
    console.log('SharedArrayBuffer available');
    const sab = new SharedArrayBuffer(10);
    console.log('Created SharedArrayBuffer');
    const len = Buffer.byteLength(sab);
    console.log('Buffer.byteLength result:', len);
  } else {
    console.log('SharedArrayBuffer not available');
  }
  
  const result = {
    success: true,
    message: 'Debug test completed'
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const result = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}
