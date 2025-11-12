// Debug large Buffer allocation issue
const { Buffer } = require('buffer');

try {
  console.log('开始分配10MB Buffer...');
  const size = 10 * 1024 * 1024; // 10MB
  console.log(`分配大小: ${size} 字节 (${size / 1024 / 1024}MB)`);
  
  console.log('分配第一个Buffer...');
  const buf1 = Buffer.alloc(size, 0xAA);
  console.log(`第一个Buffer分配完成，长度: ${buf1.length}`);
  
  console.log('分配第二个Buffer...');
  const buf2 = Buffer.alloc(size, 0xBB);
  console.log(`第二个Buffer分配完成，长度: ${buf2.length}`);
  
  console.log('开始连接Buffer...');
  const result = Buffer.concat([buf1, buf2]);
  console.log(`连接完成，结果长度: ${result.length}`);
  
  console.log('验证数据...');
  const isValid = result.length === size * 2 &&
                 result[0] === 0xAA &&
                 result[size] === 0xBB;
  
  const testResult = {
    success: true,
    size: size,
    totalSize: size * 2,
    resultLength: result.length,
    firstByte: result[0],
    middleByte: result[size],
    isValid: isValid
  };
  
  console.log(JSON.stringify(testResult, null, 2));
  return testResult;
  
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log('错误发生:', JSON.stringify(errorResult, null, 2));
  return errorResult;
}
