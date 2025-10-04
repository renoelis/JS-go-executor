// Buffer 创建和类型检测测试 - Node.js 标准写法
// 测试 Buffer.from(buffer), Buffer.from(arrayBuffer), Buffer.isBuffer(), Buffer.byteLength()

let results = {
  passed: 0,
  failed: 0,
  tests: []
};

function addResult(testName, passed, message) {
  results.tests.push({ test: testName, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

//
// 测试 1: Buffer.from(buffer) - 从另一个 Buffer 创建
//
try {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  
  // 验证内容相同
  const passed = buf2.toString() === 'hello' && buf1.length === buf2.length;
  
  addResult(
    '测试 1: Buffer.from(buffer)',
    passed,
    passed ? `成功从 Buffer 创建新 Buffer: "${buf2.toString()}"` : `创建失败`
  );
} catch (error) {
  addResult('测试 1: Buffer.from(buffer)', false, `异常: ${error.message}`);
}

//
// 测试 2: Buffer.from(buffer) - 修改不影响原 Buffer
//
try {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from(buf1);
  buf2[0] = 72; // 'H'
  
  const originalUnchanged = buf1[0] !== 72;
  const newChanged = buf2[0] === 72;
  const passed = originalUnchanged && newChanged;
  
  addResult(
    '测试 2: Buffer.from(buffer) 独立性',
    passed,
    passed ? `新 Buffer 独立于原 Buffer` : `新 Buffer 与原 Buffer 不独立`
  );
} catch (error) {
  addResult('测试 2: Buffer.from(buffer) 独立性', false, `异常: ${error.message}`);
}

//
// 测试 3: Buffer.from(arrayBuffer) - 从 ArrayBuffer 创建
//
try {
  const arrayBuffer = new ArrayBuffer(8);
  const view = new Uint8Array(arrayBuffer);
  view[0] = 72; // 'H'
  view[1] = 101; // 'e'
  view[2] = 108; // 'l'
  view[3] = 108; // 'l'
  view[4] = 111; // 'o'
  
  const buf = Buffer.from(arrayBuffer);
  const passed = buf.toString('utf8', 0, 5) === 'Hello';
  
  addResult(
    '测试 3: Buffer.from(arrayBuffer)',
    passed,
    passed ? `从 ArrayBuffer 创建成功: "${buf.toString('utf8', 0, 5)}"` : `创建失败`
  );
} catch (error) {
  addResult('测试 3: Buffer.from(arrayBuffer)', false, `异常: ${error.message}`);
}

//
// 测试 4: Buffer.from(arrayBuffer, byteOffset) - 带偏移量
//
try {
  const arrayBuffer = new ArrayBuffer(8);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < 8; i++) {
    view[i] = 65 + i; // A, B, C, D, E, F, G, H
  }
  
  const buf = Buffer.from(arrayBuffer, 2, 4); // 从索引 2 开始，长度 4
  const result = buf.toString();
  const passed = result === 'CDEF';
  
  addResult(
    '测试 4: Buffer.from(arrayBuffer, byteOffset, length)',
    passed,
    passed ? `带偏移量创建成功: "${result}"` : `创建失败: "${result}"`
  );
} catch (error) {
  addResult('测试 4: Buffer.from(arrayBuffer, byteOffset, length)', false, `异常: ${error.message}`);
}

//
// 测试 5: Buffer.isBuffer() - 检测 Buffer 对象
//
try {
  const buf = Buffer.from('test');
  const notBuf = 'not a buffer';
  const arr = [1, 2, 3];
  
  const test1 = Buffer.isBuffer(buf) === true;
  const test2 = Buffer.isBuffer(notBuf) === false;
  const test3 = Buffer.isBuffer(arr) === false;
  const test4 = Buffer.isBuffer(null) === false;
  const test5 = Buffer.isBuffer(undefined) === false;
  
  const passed = test1 && test2 && test3 && test4 && test5;
  
  addResult(
    '测试 5: Buffer.isBuffer()',
    passed,
    passed ? `正确识别 Buffer 和非 Buffer 对象` : `识别错误`
  );
} catch (error) {
  addResult('测试 5: Buffer.isBuffer()', false, `异常: ${error.message}`);
}

//
// 测试 6: Buffer.byteLength() - 获取字符串字节长度
//
try {
  const len1 = Buffer.byteLength('hello');
  const len2 = Buffer.byteLength('你好');
  const len3 = Buffer.byteLength('hello', 'utf8');
  const len4 = Buffer.byteLength('hello', 'ascii');
  
  const test1 = len1 === 5; // ASCII 字符，1字节/字符
  const test2 = len2 === 6; // 中文字符，3字节/字符 (UTF-8)
  const test3 = len3 === 5;
  const test4 = len4 === 5;
  
  const passed = test1 && test2 && test3 && test4;
  
  addResult(
    '测试 6: Buffer.byteLength()',
    passed,
    passed ? `正确计算字节长度: "hello"=${len1}, "你好"=${len2}` : `计算错误`
  );
} catch (error) {
  addResult('测试 6: Buffer.byteLength()', false, `异常: ${error.message}`);
}

//
// 测试 7: Buffer.byteLength() - Hex 编码
//
try {
  const hexStr = '48656c6c6f'; // "Hello" in hex
  const len = Buffer.byteLength(hexStr, 'hex');
  const passed = len === 5; // 5 字节
  
  addResult(
    '测试 7: Buffer.byteLength() Hex 编码',
    passed,
    passed ? `Hex 编码字节长度正确: ${len}` : `计算错误: ${len}`
  );
} catch (error) {
  addResult('测试 7: Buffer.byteLength() Hex 编码', false, `异常: ${error.message}`);
}

//
// 测试 8: Buffer.byteLength() - Base64 编码
//
try {
  const base64Str = 'SGVsbG8='; // "Hello" in base64
  const len = Buffer.byteLength(base64Str, 'base64');
  const passed = len === 5; // 5 字节
  
  addResult(
    '测试 8: Buffer.byteLength() Base64 编码',
    passed,
    passed ? `Base64 编码字节长度正确: ${len}` : `计算错误: ${len}`
  );
} catch (error) {
  addResult('测试 8: Buffer.byteLength() Base64 编码', false, `异常: ${error.message}`);
}

//
// 测试 9: Buffer.compare() - 静态比较方法
//
try {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abd');
  const buf3 = Buffer.from('abc');
  
  const cmp1 = Buffer.compare(buf1, buf2); // -1 (buf1 < buf2)
  const cmp2 = Buffer.compare(buf2, buf1); // 1 (buf2 > buf1)
  const cmp3 = Buffer.compare(buf1, buf3); // 0 (buf1 === buf3)
  
  const passed = cmp1 < 0 && cmp2 > 0 && cmp3 === 0;
  
  addResult(
    '测试 9: Buffer.compare() 静态方法',
    passed,
    passed ? `比较结果正确: ${cmp1}, ${cmp2}, ${cmp3}` : `比较错误`
  );
} catch (error) {
  addResult('测试 9: Buffer.compare() 静态方法', false, `异常: ${error.message}`);
}

//
// 测试 10: Buffer.isEncoding() - 检测编码是否支持
//
try {
  const enc1 = Buffer.isEncoding('utf8');
  const enc2 = Buffer.isEncoding('hex');
  const enc3 = Buffer.isEncoding('base64');
  const enc4 = Buffer.isEncoding('ascii');
  const enc5 = Buffer.isEncoding('invalid-encoding');
  const enc6 = Buffer.isEncoding('');
  
  const passed = enc1 && enc2 && enc3 && enc4 && !enc5 && !enc6;
  
  addResult(
    '测试 10: Buffer.isEncoding()',
    passed,
    passed ? `正确识别支持的编码格式` : `编码识别错误`
  );
} catch (error) {
  addResult('测试 10: Buffer.isEncoding()', false, `异常: ${error.message}`);
}

//
// 测试 11: Buffer.allocUnsafeSlow() - 创建非池化 Buffer
//
try {
  const buf = Buffer.allocUnsafeSlow(10);
  const passed = buf.length === 10 && Buffer.isBuffer(buf);
  
  addResult(
    '测试 11: Buffer.allocUnsafeSlow()',
    passed,
    passed ? `成功创建非池化 Buffer，长度: ${buf.length}` : `创建失败`
  );
} catch (error) {
  addResult('测试 11: Buffer.allocUnsafeSlow()', false, `异常: ${error.message}`);
}

//
// 测试 12: Buffer.concat() - 空数组
//
try {
  const buf = Buffer.concat([]);
  const passed = buf.length === 0 && Buffer.isBuffer(buf);
  
  addResult(
    '测试 12: Buffer.concat([]) 空数组',
    passed,
    passed ? `空数组 concat 返回空 Buffer` : `处理错误`
  );
} catch (error) {
  addResult('测试 12: Buffer.concat([]) 空数组', false, `异常: ${error.message}`);
}

//
// 测试 13: Buffer.concat() - 指定总长度
//
try {
  const buf1 = Buffer.from('Hello');
  const buf2 = Buffer.from(' World');
  const buf = Buffer.concat([buf1, buf2], 8); // 只取前 8 字节
  
  const result = buf.toString();
  const passed = result === 'Hello Wo' && buf.length === 8;
  
  addResult(
    '测试 13: Buffer.concat() 指定总长度',
    passed,
    passed ? `正确截断到指定长度: "${result}"` : `处理错误: "${result}"`
  );
} catch (error) {
  addResult('测试 13: Buffer.concat() 指定总长度', false, `异常: ${error.message}`);
}

//
// 测试 14: Buffer.from() - 空字符串
//
try {
  const buf = Buffer.from('');
  const passed = buf.length === 0 && Buffer.isBuffer(buf);
  
  addResult(
    '测试 14: Buffer.from(\'\') 空字符串',
    passed,
    passed ? `空字符串创建空 Buffer` : `处理错误`
  );
} catch (error) {
  addResult('测试 14: Buffer.from(\'\') 空字符串', false, `异常: ${error.message}`);
}

//
// 测试 15: Buffer.from() - 空数组
//
try {
  const buf = Buffer.from([]);
  const passed = buf.length === 0 && Buffer.isBuffer(buf);
  
  addResult(
    '测试 15: Buffer.from([]) 空数组',
    passed,
    passed ? `空数组创建空 Buffer` : `处理错误`
  );
} catch (error) {
  addResult('测试 15: Buffer.from([]) 空数组', false, `异常: ${error.message}`);
}

//
// 返回结果
//
console.log({
  success: results.failed === 0,
  executionMode: 'Runtime池',
  timestamp: new Date().toISOString(),
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    passRate: `${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`
  },
  details: results.tests,
  note: '测试 Buffer 创建和类型检测功能 (Buffer.from, Buffer.isBuffer, Buffer.byteLength, Buffer.compare)'
});
return {
  success: results.failed === 0,
  executionMode: 'Runtime池',
  timestamp: new Date().toISOString(),
  summary: {
    total: results.passed + results.failed,
    passed: results.passed,
    failed: results.failed,
    passRate: `${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`
  },
  details: results.tests,
  note: '测试 Buffer 创建和类型检测功能 (Buffer.from, Buffer.isBuffer, Buffer.byteLength, Buffer.compare)'
};





