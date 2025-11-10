// Buffer 8位整数和索引访问测试 - Node.js 标准写法
// 测试 readInt8, writeInt8, readUInt8, writeUInt8, buf[index]

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
// 测试 1: writeInt8() / readInt8() - 正数
//
try {
  const buf = Buffer.alloc(4);
  buf.writeInt8(127, 0); // 最大正值
  buf.writeInt8(1, 1);
  buf.writeInt8(0, 2);
  buf.writeInt8(42, 3);
  
  const v1 = buf.readInt8(0);
  const v2 = buf.readInt8(1);
  const v3 = buf.readInt8(2);
  const v4 = buf.readInt8(3);
  
  const passed = v1 === 127 && v2 === 1 && v3 === 0 && v4 === 42;
  
  addResult(
    '测试 1: writeInt8/readInt8 正数',
    passed,
    passed ? `读写正确: ${v1}, ${v2}, ${v3}, ${v4}` : `读写错误`
  );
} catch (error) {
  addResult('测试 1: writeInt8/readInt8 正数', false, `异常: ${error.message}`);
}

//
// 测试 2: writeInt8() / readInt8() - 负数
//
try {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-128, 0); // 最小负值
  buf.writeInt8(-1, 1);
  buf.writeInt8(-42, 2);
  buf.writeInt8(-100, 3);
  
  const v1 = buf.readInt8(0);
  const v2 = buf.readInt8(1);
  const v3 = buf.readInt8(2);
  const v4 = buf.readInt8(3);
  
  const passed = v1 === -128 && v2 === -1 && v3 === -42 && v4 === -100;
  
  addResult(
    '测试 2: writeInt8/readInt8 负数',
    passed,
    passed ? `读写正确: ${v1}, ${v2}, ${v3}, ${v4}` : `读写错误`
  );
} catch (error) {
  addResult('测试 2: writeInt8/readInt8 负数', false, `异常: ${error.message}`);
}

//
// 测试 3: writeUInt8() / readUInt8() - 无符号整数
//
try {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(255, 0); // 最大值
  buf.writeUInt8(0, 1);   // 最小值
  buf.writeUInt8(128, 2);
  buf.writeUInt8(200, 3);
  
  const v1 = buf.readUInt8(0);
  const v2 = buf.readUInt8(1);
  const v3 = buf.readUInt8(2);
  const v4 = buf.readUInt8(3);
  
  const passed = v1 === 255 && v2 === 0 && v3 === 128 && v4 === 200;
  
  addResult(
    '测试 3: writeUInt8/readUInt8',
    passed,
    passed ? `读写正确: ${v1}, ${v2}, ${v3}, ${v4}` : `读写错误`
  );
} catch (error) {
  addResult('测试 3: writeUInt8/readUInt8', false, `异常: ${error.message}`);
}

//
// 测试 4: buf[index] - 索引读取
//
try {
  const buf = Buffer.from([72, 101, 108, 108, 111]); // "Hello"
  
  const v1 = buf[0];
  const v2 = buf[1];
  const v3 = buf[2];
  const v4 = buf[3];
  const v5 = buf[4];
  
  const passed = v1 === 72 && v2 === 101 && v3 === 108 && v4 === 108 && v5 === 111;
  
  addResult(
    '测试 4: buf[index] 索引读取',
    passed,
    passed ? `索引读取正确: [${v1}, ${v2}, ${v3}, ${v4}, ${v5}]` : `读取错误`
  );
} catch (error) {
  addResult('测试 4: buf[index] 索引读取', false, `异常: ${error.message}`);
}

//
// 测试 5: buf[index] = value - 索引赋值
//
try {
  const buf = Buffer.alloc(5);
  buf[0] = 72;  // 'H'
  buf[1] = 101; // 'e'
  buf[2] = 108; // 'l'
  buf[3] = 108; // 'l'
  buf[4] = 111; // 'o'
  
  const result = buf.toString();
  const passed = result === 'Hello';
  
  addResult(
    '测试 5: buf[index] = value 索引赋值',
    passed,
    passed ? `索引赋值正确: "${result}"` : `赋值错误: "${result}"`
  );
} catch (error) {
  addResult('测试 5: buf[index] = value 索引赋值', false, `异常: ${error.message}`);
}

//
// 测试 6: buf[index] - 越界读取
//
try {
  const buf = Buffer.from('test');
  const v1 = buf[10]; // 越界
  const v2 = buf[-1]; // 负索引
  
  const passed = v1 === undefined && v2 === undefined;
  
  addResult(
    '测试 6: buf[index] 越界读取',
    passed,
    passed ? `越界返回 undefined` : `越界处理错误: ${v1}, ${v2}`
  );
} catch (error) {
  addResult('测试 6: buf[index] 越界读取', false, `异常: ${error.message}`);
}

//
// 测试 7: 有符号和无符号的区别
//
try {
  const buf = Buffer.alloc(1);
  buf.writeUInt8(200, 0); // 作为无符号: 200
  
  const unsignedVal = buf.readUInt8(0); // 200
  const signedVal = buf.readInt8(0);    // -56 (补码)
  
  const passed = unsignedVal === 200 && signedVal === -56;
  
  addResult(
    '测试 7: 有符号/无符号区别',
    passed,
    passed ? `正确区分: unsigned=${unsignedVal}, signed=${signedVal}` : `区分错误`
  );
} catch (error) {
  addResult('测试 7: 有符号/无符号区别', false, `异常: ${error.message}`);
}

//
// 测试 8: 索引读写与 readUInt8/writeUInt8 一致性
//
try {
  const buf1 = Buffer.alloc(3);
  const buf2 = Buffer.alloc(3);
  
  // 使用索引赋值
  buf1[0] = 100;
  buf1[1] = 150;
  buf1[2] = 200;
  
  // 使用 writeUInt8
  buf2.writeUInt8(100, 0);
  buf2.writeUInt8(150, 1);
  buf2.writeUInt8(200, 2);
  
  const passed = buf1[0] === buf2.readUInt8(0) && 
                 buf1[1] === buf2.readUInt8(1) && 
                 buf1[2] === buf2.readUInt8(2);
  
  addResult(
    '测试 8: 索引与 read/write 一致性',
    passed,
    passed ? `索引访问与方法调用结果一致` : `不一致`
  );
} catch (error) {
  addResult('测试 8: 索引与 read/write 一致性', false, `异常: ${error.message}`);
}

//
// 测试 9: 混合读写测试
//
try {
  const buf = Buffer.alloc(10);
  
  // 使用不同方式写入
  buf[0] = 65;              // 'A'
  buf.writeInt8(66, 1);     // 'B'
  buf.writeUInt8(67, 2);    // 'C'
  buf[3] = 68;              // 'D'
  buf.writeInt8(69, 4);     // 'E'
  
  // 使用不同方式读取
  const v1 = buf[0];
  const v2 = buf.readUInt8(1);
  const v3 = buf.readInt8(2);
  const v4 = buf[3];
  const v5 = buf.readUInt8(4);
  
  const result = buf.toString('utf8', 0, 5);
  const passed = result === 'ABCDE' && 
                 v1 === 65 && v2 === 66 && v3 === 67 && v4 === 68 && v5 === 69;
  
  addResult(
    '测试 9: 混合读写',
    passed,
    passed ? `混合读写正确: "${result}"` : `混合读写错误`
  );
} catch (error) {
  addResult('测试 9: 混合读写', false, `异常: ${error.message}`);
}

//
// 测试 10: 使用索引遍历 Buffer
//
try {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  let sum = 0;
  
  for (let i = 0; i < buf.length; i++) {
    sum += buf[i];
  }
  
  const passed = sum === 15; // 1+2+3+4+5 = 15
  
  addResult(
    '测试 10: 索引遍历 Buffer',
    passed,
    passed ? `遍历正确, sum = ${sum}` : `遍历错误, sum = ${sum}`
  );
} catch (error) {
  addResult('测试 10: 索引遍历 Buffer', false, `异常: ${error.message}`);
}

//
// 测试 11: 字符串到字节数组的转换
//
try {
  const str = 'ABC';
  const buf = Buffer.alloc(3);
  
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i);
  }
  
  const result = buf.toString();
  const passed = result === 'ABC';
  
  addResult(
    '测试 11: 字符串转字节数组',
    passed,
    passed ? `转换正确: "${result}"` : `转换错误: "${result}"`
  );
} catch (error) {
  addResult('测试 11: 字符串转字节数组', false, `异常: ${error.message}`);
}

//
// 测试 12: 字节数组比较
//
try {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 4]);
  
  let equal1 = true;
  let equal2 = true;
  
  for (let i = 0; i < buf1.length; i++) {
    if (buf1[i] !== buf2[i]) equal1 = false;
    if (buf1[i] !== buf3[i]) equal2 = false;
  }
  
  const passed = equal1 === true && equal2 === false;
  
  addResult(
    '测试 12: 字节数组比较',
    passed,
    passed ? `比较正确` : `比较错误`
  );
} catch (error) {
  addResult('测试 12: 字节数组比较', false, `异常: ${error.message}`);
}

//
// 测试 13: readInt8 边界值
//
try {
  const buf = Buffer.alloc(2);
  buf.writeInt8(127, 0);  // 最大正值
  buf.writeInt8(-128, 1); // 最小负值
  
  const max = buf.readInt8(0);
  const min = buf.readInt8(1);
  
  const passed = max === 127 && min === -128;
  
  addResult(
    '测试 13: readInt8 边界值',
    passed,
    passed ? `边界值正确: max=${max}, min=${min}` : `边界值错误`
  );
} catch (error) {
  addResult('测试 13: readInt8 边界值', false, `异常: ${error.message}`);
}

//
// 测试 14: readUInt8 边界值
//
try {
  const buf = Buffer.alloc(2);
  buf.writeUInt8(255, 0); // 最大值
  buf.writeUInt8(0, 1);   // 最小值
  
  const max = buf.readUInt8(0);
  const min = buf.readUInt8(1);
  
  const passed = max === 255 && min === 0;
  
  addResult(
    '测试 14: readUInt8 边界值',
    passed,
    passed ? `边界值正确: max=${max}, min=${min}` : `边界值错误`
  );
} catch (error) {
  addResult('测试 14: readUInt8 边界值', false, `异常: ${error.message}`);
}

//
// 测试 15: 索引赋值超出范围的值
//
try {
  const buf = Buffer.alloc(3);
  buf[0] = 300;  // 超出 0-255 范围，应该取模
  buf[1] = -10;  // 负数
  buf[2] = 256;  // 正好 256
  
  // Node.js 会自动取模到 0-255 范围
  const v1 = buf[0];
  const v2 = buf[1];
  const v3 = buf[2];
  
  const passed = v1 === 44 && v2 === 246 && v3 === 0; // 300%256=44, -10%256=246, 256%256=0
  
  addResult(
    '测试 15: 索引赋值超出范围',
    passed,
    passed ? `自动取模正确: ${v1}, ${v2}, ${v3}` : `处理错误: ${v1}, ${v2}, ${v3}`
  );
} catch (error) {
  addResult('测试 15: 索引赋值超出范围', false, `异常: ${error.message}`);
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
  note: '测试 Buffer 8位整数读写和索引访问功能 (readInt8, writeInt8, readUInt8, writeUInt8, buf[index])'
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
  note: '测试 Buffer 8位整数读写和索引访问功能 (readInt8, writeInt8, readUInt8, writeUInt8, buf[index])'
};



