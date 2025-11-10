// Buffer 模块综合测试 - Promise 版本（兼容 Goja）
// 测试所有 Buffer API 功能，使用标准 Node.js 写法，使用 Promise 实现异步

function runBufferTests() {
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

  // 模拟异步延迟
  function delay(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }

  // 测试 1: Buffer.alloc()
  return delay(1).then(function() {
    try {
      const buf = Buffer.alloc(10);
      const passed = buf.length === 10 && buf[0] === 0 && buf[9] === 0;
      addResult(
        '测试 1: Buffer.alloc()',
        passed,
        passed ? '创建成功，长度: ' + buf.length : '创建失败'
      );
    } catch (error) {
      addResult('测试 1: Buffer.alloc()', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 2: Buffer.alloc() - 带填充值
  .then(function() {
    try {
      const buf = Buffer.alloc(5, 'a');
      const result = buf.toString();
      const passed = result === 'aaaaa';
      addResult(
        '测试 2: Buffer.alloc(size, fill)',
        passed,
        passed ? '填充成功: "' + result + '"' : '填充失败'
      );
    } catch (error) {
      addResult('测试 2: Buffer.alloc(size, fill)', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 3: Buffer.from(array)
  .then(function() {
    try {
      const buf = Buffer.from([72, 101, 108, 108, 111]);
      const result = buf.toString();
      const passed = result === 'Hello';
      addResult(
        '测试 3: Buffer.from(array)',
        passed,
        passed ? '创建成功: "' + result + '"' : '创建失败'
      );
    } catch (error) {
      addResult('测试 3: Buffer.from(array)', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 4: Buffer.from(string)
  .then(function() {
    try {
      const buf = Buffer.from('Hello World');
      const passed = buf.toString() === 'Hello World';
      addResult(
        '测试 4: Buffer.from(string)',
        passed,
        passed ? '创建成功: "' + buf.toString() + '"' : '创建失败'
      );
    } catch (error) {
      addResult('测试 4: Buffer.from(string)', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 5: Buffer.from(string, encoding) - Hex
  .then(function() {
    try {
      const buf = Buffer.from('48656c6c6f', 'hex');
      const result = buf.toString();
      const passed = result === 'Hello';
      addResult(
        '测试 5: Buffer.from(string, encoding) Hex',
        passed,
        passed ? 'Hex解码成功: "' + result + '"' : '解码失败'
      );
    } catch (error) {
      addResult('测试 5: Buffer.from(string, encoding) Hex', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 6: Buffer.concat()
  .then(function() {
    try {
      const buf1 = Buffer.from('Hello');
      const buf2 = Buffer.from(' ');
      const buf3 = Buffer.from('World');
      const result = Buffer.concat([buf1, buf2, buf3]);
      const passed = result.toString() === 'Hello World';
      addResult(
        '测试 6: Buffer.concat()',
        passed,
        passed ? '拼接成功: "' + result.toString() + '"' : '拼接失败'
      );
    } catch (error) {
      addResult('测试 6: Buffer.concat()', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 7: Buffer.isBuffer()
  .then(function() {
    try {
      const buf = Buffer.from('test');
      const notBuf = 'not a buffer';
      const test1 = Buffer.isBuffer(buf) === true;
      const test2 = Buffer.isBuffer(notBuf) === false;
      const test3 = Buffer.isBuffer(null) === false;
      const passed = test1 && test2 && test3;
      addResult(
        '测试 7: Buffer.isBuffer()',
        passed,
        passed ? '正确识别 Buffer 对象' : '识别错误'
      );
    } catch (error) {
      addResult('测试 7: Buffer.isBuffer()', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 8: Buffer.byteLength()
  .then(function() {
    try {
      const len1 = Buffer.byteLength('hello');
      const len2 = Buffer.byteLength('你好');
      const test1 = len1 === 5;
      const test2 = len2 === 6;
      const passed = test1 && test2;
      addResult(
        '测试 8: Buffer.byteLength()',
        passed,
        passed ? '字节长度计算正确: hello=' + len1 + ', 你好=' + len2 : '计算错误'
      );
    } catch (error) {
      addResult('测试 8: Buffer.byteLength()', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 9: Buffer.compare() - 静态方法
  .then(function() {
    try {
      const buf1 = Buffer.from('abc');
      const buf2 = Buffer.from('abd');
      const buf3 = Buffer.from('abc');
      const cmp1 = Buffer.compare(buf1, buf2);
      const cmp2 = Buffer.compare(buf2, buf1);
      const cmp3 = Buffer.compare(buf1, buf3);
      const passed = cmp1 < 0 && cmp2 > 0 && cmp3 === 0;
      addResult(
        '测试 9: Buffer.compare()',
        passed,
        passed ? '静态比较正确' : '比较错误'
      );
    } catch (error) {
      addResult('测试 9: Buffer.compare()', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 10: 读取 8 位整数
  .then(function() {
    try {
      const buf = Buffer.from([127, 128, 0, 255]);
      const v1 = buf.readInt8(0);
      const v2 = buf.readInt8(1);
      const v3 = buf.readUInt8(2);
      const v4 = buf.readUInt8(3);
      const passed = v1 === 127 && v2 === -128 && v3 === 0 && v4 === 255;
      addResult(
        '测试 10: readInt8/readUInt8',
        passed,
        passed ? '8位整数读取正确' : '读取错误'
      );
    } catch (error) {
      addResult('测试 10: readInt8/readUInt8', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 11: 读写 16 位整数
  .then(function() {
    try {
      const buf = Buffer.alloc(4);
      buf.writeInt16BE(0x0102, 0);
      buf.writeInt16LE(0x0304, 2);
      const v1 = buf.readInt16BE(0);
      const v2 = buf.readInt16LE(2);
      const passed = v1 === 0x0102 && v2 === 0x0304;
      addResult(
        '测试 11: readInt16BE/LE 和 writeInt16BE/LE',
        passed,
        passed ? '16位整数读写正确' : '读写错误'
      );
    } catch (error) {
      addResult('测试 11: readInt16BE/LE 和 writeInt16BE/LE', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 12: 读写 32 位整数
  .then(function() {
    try {
      const buf = Buffer.alloc(8);
      buf.writeInt32BE(0x01020304, 0);
      buf.writeInt32LE(-123456, 4);
      const v1 = buf.readInt32BE(0);
      const v2 = buf.readInt32LE(4);
      const passed = v1 === 0x01020304 && v2 === -123456;
      addResult(
        '测试 12: readInt32BE/LE 和 writeInt32BE/LE',
        passed,
        passed ? '32位整数读写正确' : '读写错误'
      );
    } catch (error) {
      addResult('测试 12: readInt32BE/LE 和 writeInt32BE/LE', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 13: 读写浮点数
  .then(function() {
    try {
      const buf = Buffer.alloc(16);
      buf.writeFloatBE(3.14, 0);
      buf.writeFloatLE(-2.71, 4);
      buf.writeDoubleBE(Math.PI, 8);
      const v1 = buf.readFloatBE(0);
      const v2 = buf.readFloatLE(4);
      const v3 = buf.readDoubleBE(8);
      const passed = Math.abs(v1 - 3.14) < 0.01 && 
                     Math.abs(v2 - (-2.71)) < 0.01 && 
                     Math.abs(v3 - Math.PI) < 0.0001;
      addResult(
        '测试 13: Float/Double 读写',
        passed,
        passed ? '浮点数读写正确' : '读写错误'
      );
    } catch (error) {
      addResult('测试 13: Float/Double 读写', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 14: BigInt64 读写
  .then(function() {
    try {
      const buf = Buffer.alloc(16);
      buf.writeBigInt64BE(BigInt('9223372036854775807'), 0);
      buf.writeBigInt64LE(BigInt('-9223372036854775808'), 8);
      const v1 = buf.readBigInt64BE(0);
      const v2 = buf.readBigInt64LE(8);
      const passed = v1.toString() === '9223372036854775807' && v2.toString() === '-9223372036854775808';
      addResult(
        '测试 14: BigInt64 读写',
        passed,
        passed ? 'BigInt64 读写正确' : '读写错误'
      );
    } catch (error) {
      addResult('测试 14: BigInt64 读写', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 15: BigInt64 - 超出 int32 范围
  .then(function() {
    try {
      const buf = Buffer.alloc(8);
      buf.writeBigInt64LE(BigInt(-0x87654321), 0);
      const value = buf.readBigInt64LE(0);
      const passed = value.toString() === '-2271560481';
      addResult(
        '测试 15: BigInt64 超出 int32 范围',
        passed,
        passed ? 'BigInt 写入成功: ' + value : '写入失败'
      );
    } catch (error) {
      addResult('测试 15: BigInt64 超出 int32 范围', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 16: 整数范围检查
  .then(function() {
    try {
      const buf = Buffer.alloc(4);
      buf.writeInt32LE(-0x87654321, 0); // 应该抛出错误
      addResult('测试 16: writeInt32LE 范围检查', false, '应该抛出范围错误');
    } catch (error) {
      const passed = error.message.indexOf('out of range') !== -1;
      addResult(
        '测试 16: writeInt32LE 范围检查',
        passed,
        passed ? '正确抛出范围错误' : '错误信息不正确'
      );
    }
    return delay(1);
  })
  
  // 测试 17: toString() - 各种编码
  .then(function() {
    try {
      const buf1 = Buffer.from('Hello');
      const hex = buf1.toString('hex');
      const base64 = buf1.toString('base64');
      const passed = hex === '48656c6c6f' && base64 === 'SGVsbG8=';
      addResult(
        '测试 17: toString() Hex/Base64',
        passed,
        passed ? 'Hex/Base64 转换正确' : '转换错误'
      );
    } catch (error) {
      addResult('测试 17: toString() Hex/Base64', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 18: UTF-16LE 编码
  .then(function() {
    try {
      const buf = Buffer.from('Hello', 'utf16le');
      const result = buf.toString('utf16le');
      const passed = result === 'Hello';
      addResult(
        '测试 18: UTF-16LE 编码',
        passed,
        passed ? 'UTF-16LE 转换成功' : '转换失败'
      );
    } catch (error) {
      addResult('测试 18: UTF-16LE 编码', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 19: Latin1 编码
  .then(function() {
    try {
      const buf = Buffer.from('ñáéíóú', 'latin1');
      const result = buf.toString('latin1');
      const passed = result === 'ñáéíóú';
      addResult(
        '测试 19: Latin1 编码',
        passed,
        passed ? 'Latin1 转换成功' : '转换失败'
      );
    } catch (error) {
      addResult('测试 19: Latin1 编码', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 20: slice 和 subarray
  .then(function() {
    try {
      const buf = Buffer.from('Hello World');
      const slice = buf.slice(0, 5);
      const sub = buf.subarray(6, 11);
      const passed = slice.toString() === 'Hello' && sub.toString() === 'World';
      addResult(
        '测试 20: slice 和 subarray',
        passed,
        passed ? '切片操作正确' : '切片操作错误'
      );
    } catch (error) {
      addResult('测试 20: slice 和 subarray', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 21: copy
  .then(function() {
    try {
      const buf1 = Buffer.from('Hello World');
      const buf2 = Buffer.alloc(5);
      buf1.copy(buf2, 0, 6, 11);
      const passed = buf2.toString() === 'World';
      addResult(
        '测试 21: buf.copy()',
        passed,
        passed ? '拷贝成功' : '拷贝失败'
      );
    } catch (error) {
      addResult('测试 21: buf.copy()', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 22: fill
  .then(function() {
    try {
      const buf = Buffer.alloc(10);
      buf.fill('a');
      const passed = buf.toString() === 'aaaaaaaaaa';
      addResult(
        '测试 22: buf.fill()',
        passed,
        passed ? '填充成功' : '填充失败'
      );
    } catch (error) {
      addResult('测试 22: buf.fill()', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 23: equals
  .then(function() {
    try {
      const buf1 = Buffer.from('Hello');
      const buf2 = Buffer.from('Hello');
      const buf3 = Buffer.from('World');
      const passed = buf1.equals(buf2) === true && buf1.equals(buf3) === false;
      addResult(
        '测试 23: buf.equals()',
        passed,
        passed ? 'equals 正确' : 'equals 错误'
      );
    } catch (error) {
      addResult('测试 23: buf.equals()', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 24: indexOf/lastIndexOf/includes
  .then(function() {
    try {
      const buf = Buffer.from('hello world hello');
      const idx1 = buf.indexOf('hello');
      const idx2 = buf.lastIndexOf('hello');
      const inc1 = buf.includes('world');
      const inc2 = buf.includes('xyz');
      const passed = idx1 === 0 && idx2 === 12 && inc1 === true && inc2 === false;
      addResult(
        '测试 24: indexOf/lastIndexOf/includes',
        passed,
        passed ? '搜索方法正确' : '搜索方法错误'
      );
    } catch (error) {
      addResult('测试 24: indexOf/lastIndexOf/includes', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 25: 字节交换
  .then(function() {
    try {
      const buf1 = Buffer.from([0x11, 0x22, 0x33, 0x44]);
      buf1.swap16();
      const result1 = buf1.toString('hex');
      
      const buf2 = Buffer.from([0x11, 0x22, 0x33, 0x44]);
      buf2.swap32();
      const result2 = buf2.toString('hex');
      
      const buf3 = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
      buf3.swap64();
      const result3 = buf3.toString('hex');
      
      const passed = result1 === '22114433' && result2 === '44332211' && result3 === '0807060504030201';
      addResult(
        '测试 25: swap16/32/64',
        passed,
        passed ? '字节交换正确' : '字节交换错误'
      );
    } catch (error) {
      addResult('测试 25: swap16/32/64', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 26: reverse
  .then(function() {
    try {
      const buf = Buffer.from('Hello');
      buf.reverse();
      const result = buf.toString();
      const passed = result === 'olleH';
      addResult(
        '测试 26: buf.reverse()',
        passed,
        passed ? 'reverse 正确' : 'reverse 错误'
      );
    } catch (error) {
      addResult('测试 26: buf.reverse()', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 27: 迭代器
  .then(function() {
    try {
      const buf = Buffer.from([1, 2, 3, 4, 5]);
      let sum = 0;
      for (const byte of buf) {
        sum += byte;
      }
      const passed = sum === 15;
      addResult(
        '测试 27: for...of 迭代器',
        passed,
        passed ? '迭代器正确, sum = ' + sum : '迭代器错误'
      );
    } catch (error) {
      addResult('测试 27: for...of 迭代器', false, '异常: ' + error.message);
    }
    return delay(1);
  })
  
  // 测试 28: Unicode Emoji
  .then(function() {
    try {
      const buf = Buffer.from('🎉👍🚀');
      const result = buf.toString('utf8');
      const passed = result === '🎉👍🚀';
      addResult(
        '测试 28: Unicode Emoji 处理',
        passed,
        passed ? 'Unicode 处理正确' : '处理错误'
      );
    } catch (error) {
      addResult('测试 28: Unicode Emoji 处理', false, '异常: ' + error.message);
    }
    return delay(10);
  })
  
  // 返回最终结果
  .then(function() {
    return {
      success: results.failed === 0,
      executionMode: 'Promise Chain',
      timestamp: new Date().toISOString(),
      summary: {
        total: results.passed + results.failed,
        passed: results.passed,
        failed: results.failed,
        passRate: ((results.passed / (results.passed + results.failed)) * 100).toFixed(1) + '%'
      },
      details: results.tests,
      note: 'Buffer 模块 Promise 链式测试 - 兼容 Goja 运行时'
    };
  });
}

// 执行测试
return runBufferTests();

