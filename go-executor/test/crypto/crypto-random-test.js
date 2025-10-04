// Node.js crypto 模块 - 随机数生成功能测试
const crypto = require('crypto');

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
// 测试 1: randomBytes() - 生成不同长度的随机字节
//
try {
  // 测试各种长度
  const lengths = [8, 16, 32, 64, 128, 256];
  let allPassed = true;
  let details = [];
  
  for (const len of lengths) {
    const randomBuf = crypto.randomBytes(len);
    
    // 验证长度
    if (randomBuf.length !== len) {
      allPassed = false;
      details.push(`长度 ${len}: 失败 (实际: ${randomBuf.length})`);
    } else {
      // 验证是 Buffer 对象
      const isBuffer = randomBuf && typeof randomBuf === 'object' && randomBuf.length;
      if (!isBuffer) {
        allPassed = false;
        details.push(`长度 ${len}: 不是有效的 Buffer`);
      } else {
        details.push(`长度 ${len}: 通过 (${randomBuf.toString('hex').substring(0, 16)}...)`);
      }
    }
  }
  
  addResult(
    '测试 1: randomBytes() 不同长度',
    allPassed,
    allPassed ? `所有长度测试通过: ${lengths.join(', ')}` : `部分失败: ${details.join('; ')}`
  );
} catch (error) {
  addResult('测试 1: randomBytes() 不同长度', false, `异常: ${error.message}`);
}

//
// 测试 2: randomBytes() - Hex 编码输出
//
try {
  const buf = crypto.randomBytes(32);
  const hexStr = buf.toString('hex');
  
  // 验证 hex 格式 (应该是 64 个字符, 只包含 0-9a-f)
  const isValidHex = /^[0-9a-f]{64}$/.test(hexStr);
  
  addResult(
    '测试 2: randomBytes().toString("hex")',
    isValidHex,
    isValidHex ? `生成有效的 hex 字符串: ${hexStr.substring(0, 32)}...` : `无效的 hex 格式: ${hexStr}`
  );
} catch (error) {
  addResult('测试 2: randomBytes().toString("hex")', false, `异常: ${error.message}`);
}

//
// 测试 3: randomBytes() - Base64 编码输出
//
try {
  const buf = crypto.randomBytes(32);
  const base64Str = buf.toString('base64');
  
  // 验证 base64 格式
  const isValidBase64 = /^[A-Za-z0-9+/=]+$/.test(base64Str);
  
  addResult(
    '测试 3: randomBytes().toString("base64")',
    isValidBase64,
    isValidBase64 ? `生成有效的 base64 字符串: ${base64Str.substring(0, 32)}...` : `无效的 base64 格式: ${base64Str}`
  );
} catch (error) {
  addResult('测试 3: randomBytes().toString("base64")', false, `异常: ${error.message}`);
}

//
// 测试 4: randomBytes() - 随机性验证 (不应该生成相同的值)
//
try {
  const buf1 = crypto.randomBytes(32);
  const buf2 = crypto.randomBytes(32);
  const hex1 = buf1.toString('hex');
  const hex2 = buf2.toString('hex');
  
  const isDifferent = hex1 !== hex2;
  
  addResult(
    '测试 4: randomBytes() 随机性验证',
    isDifferent,
    isDifferent ? '两次调用生成不同的值' : `生成了相同的值: ${hex1}`
  );
} catch (error) {
  addResult('测试 4: randomBytes() 随机性验证', false, `异常: ${error.message}`);
}

//
// 测试 5: randomBytes() - 边界情况 (最小长度)
//
try {
  const buf = crypto.randomBytes(1);
  const passed = buf.length === 1;
  
  addResult(
    '测试 5: randomBytes(1) 最小长度',
    passed,
    passed ? `生成 1 字节: ${buf.toString('hex')}` : `长度错误: ${buf.length}`
  );
} catch (error) {
  addResult('测试 5: randomBytes(1) 最小长度', false, `异常: ${error.message}`);
}

//
// 测试 6: randomBytes() - 大尺寸测试
//
try {
  const buf = crypto.randomBytes(1024); // 1KB
  const passed = buf.length === 1024;
  
  addResult(
    '测试 6: randomBytes(1024) 大尺寸',
    passed,
    passed ? `成功生成 1KB 随机数据` : `长度错误: ${buf.length}`
  );
} catch (error) {
  addResult('测试 6: randomBytes(1024) 大尺寸', false, `异常: ${error.message}`);
}

//
// 测试 7: randomUUID() - 生成 UUID
//
try {
  const uuid = crypto.randomUUID();
  
  // UUID v4 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // y 的第一位是 8, 9, a, 或 b
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
  
  addResult(
    '测试 7: randomUUID() 格式验证',
    isValidUUID,
    isValidUUID ? `生成有效的 UUID: ${uuid}` : `无效的 UUID 格式: ${uuid}`
  );
} catch (error) {
  addResult('测试 7: randomUUID() 格式验证', false, `异常: ${error.message}`);
}

//
// 测试 8: randomUUID() - 唯一性验证
//
try {
  const uuid1 = crypto.randomUUID();
  const uuid2 = crypto.randomUUID();
  
  const isDifferent = uuid1 !== uuid2;
  
  addResult(
    '测试 8: randomUUID() 唯一性验证',
    isDifferent,
    isDifferent ? `生成不同的 UUID: ${uuid1}, ${uuid2}` : `生成了相同的 UUID: ${uuid1}`
  );
} catch (error) {
  addResult('测试 8: randomUUID() 唯一性验证', false, `异常: ${error.message}`);
}

//
// 测试 9: randomUUID() - 批量生成
//
try {
  const uuids = [];
  for (let i = 0; i < 10; i++) {
    uuids.push(crypto.randomUUID());
  }
  
  // 验证所有 UUID 都不同
  const uniqueUUIDs = new Set(uuids);
  const allUnique = uniqueUUIDs.size === 10;
  
  addResult(
    '测试 9: randomUUID() 批量生成唯一性',
    allUnique,
    allUnique ? `成功生成 10 个不同的 UUID` : `发现重复 UUID: ${10 - uniqueUUIDs.size} 个`
  );
} catch (error) {
  addResult('测试 9: randomUUID() 批量生成唯一性', false, `异常: ${error.message}`);
}

//
// 测试 10: getRandomValues() - Uint8Array
//
try {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // 验证数组被填充 (不是全部为 0)
  const notAllZero = array.some(val => val !== 0);
  const validRange = array.every(val => val >= 0 && val <= 255);
  const passed = notAllZero && validRange;
  
  addResult(
    '测试 10: getRandomValues(Uint8Array)',
    passed,
    passed ? `成功填充 32 字节数组: [${array.slice(0, 8).join(', ')}...]` : `填充失败或值不正确`
  );
} catch (error) {
  addResult('测试 10: getRandomValues(Uint8Array)', false, `异常: ${error.message}`);
}

//
// 测试 11: getRandomValues() - Uint16Array
//
try {
  const array = new Uint16Array(16);
  crypto.getRandomValues(array);
  
  const notAllZero = array.some(val => val !== 0);
  const validRange = array.every(val => val >= 0 && val <= 65535);
  const passed = notAllZero && validRange;
  
  addResult(
    '测试 11: getRandomValues(Uint16Array)',
    passed,
    passed ? `成功填充 16 个 Uint16: [${array.slice(0, 4).join(', ')}...]` : `填充失败或值不正确`
  );
} catch (error) {
  addResult('测试 11: getRandomValues(Uint16Array)', false, `异常: ${error.message}`);
}

//
// 测试 12: getRandomValues() - Uint32Array
//
try {
  const array = new Uint32Array(8);
  crypto.getRandomValues(array);
  
  const notAllZero = array.some(val => val !== 0);
  const validRange = array.every(val => val >= 0 && val <= 4294967295);
  const passed = notAllZero && validRange;
  
  addResult(
    '测试 12: getRandomValues(Uint32Array)',
    passed,
    passed ? `成功填充 8 个 Uint32: [${array.slice(0, 4).join(', ')}...]` : `填充失败或值不正确`
  );
} catch (error) {
  addResult('测试 12: getRandomValues(Uint32Array)', false, `异常: ${error.message}`);
}

//
// 测试 13: getRandomValues() - 随机性验证
//
try {
  const array1 = new Uint8Array(32);
  const array2 = new Uint8Array(32);
  
  crypto.getRandomValues(array1);
  crypto.getRandomValues(array2);
  
  // 转换为字符串进行比较
  const str1 = Array.from(array1).join(',');
  const str2 = Array.from(array2).join(',');
  const isDifferent = str1 !== str2;
  
  addResult(
    '测试 13: getRandomValues() 随机性验证',
    isDifferent,
    isDifferent ? '两次调用生成不同的值' : `生成了相同的值`
  );
} catch (error) {
  addResult('测试 13: getRandomValues() 随机性验证', false, `异常: ${error.message}`);
}

//
// 测试 14: randomBytes() - 错误处理 (无效参数)
//
try {
  let errorCaught = false;
  let errorMessage = '';
  
  try {
    crypto.randomBytes(0);
  } catch (err) {
    errorCaught = true;
    errorMessage = err.message;
  }
  
  addResult(
    '测试 14: randomBytes(0) 错误处理',
    errorCaught,
    errorCaught ? `正确抛出错误: ${errorMessage}` : `未抛出预期错误`
  );
} catch (error) {
  addResult('测试 14: randomBytes(0) 错误处理', false, `异常: ${error.message}`);
}

//
// 测试 15: randomBytes() - 超大尺寸限制
//
try {
  let errorCaught = false;
  let success = false;
  let message = '';
  
  try {
    // 尝试生成 10MB 数据 (可能会被限制)
    const buf = crypto.randomBytes(10 * 1024 * 1024);
    if (buf.length === 10 * 1024 * 1024) {
      success = true;
      message = '成功生成 10MB 随机数据';
    } else {
      message = `长度不匹配: ${buf.length}`;
    }
  } catch (err) {
    errorCaught = true;
    message = `抛出错误 (可能有尺寸限制): ${err.message}`;
  }
  
  // 任意一种结果都是可接受的 (成功或者有合理的限制)
  const passed = success || errorCaught;
  
  addResult(
    '测试 15: randomBytes() 超大尺寸处理',
    passed,
    message
  );
} catch (error) {
  addResult('测试 15: randomBytes() 超大尺寸处理', false, `异常: ${error.message}`);
}

//
// 返回结果
//
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
  note: '测试 Node.js crypto 模块的随机数生成功能 (randomBytes, randomUUID, getRandomValues)'
};






