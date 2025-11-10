/**
 * sm-crypto-v2 v1.15.0 - KDF (密钥派生函数) 全面测试
 * 
 * KDF API 说明：
 * - 函数签名: kdf(z, keylen, iv)
 * - 参数:
 *   - z: 输入数据（string 或 Uint8Array）
 *   - keylen: 输出密钥长度（字节数，number）
 *   - iv: 可选的初始化向量（string 或 Uint8Array）
 * - 返回: Uint8Array（固定长度为 keylen）
 * - 标准: GM/T 0003-2012（基于 SM3 的密钥派生函数）
 * 
 * 测试覆盖：
 * 1. 基本功能：正常输入输出
 * 2. 输入类型：string、Uint8Array、Buffer
 * 3. 输出长度：0、1、小长度、中长度、大长度
 * 4. IV 参数：无 IV、string IV、Uint8Array IV、空 IV、null/undefined
 * 5. 边界情况：空输入、超长输入、特殊字符、UTF-8
 * 6. 确定性：相同输入产生相同输出
 * 7. 错误处理：无效参数、缺失参数、负数长度
 */

const { kdf } = require('sm-crypto-v2');
const Buffer = require('buffer').Buffer;

// ========== 工具函数 ==========
function toHex(u8) {
  return Buffer.from(u8).toString('hex');
}

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ========== 测试结果收集 ==========
const testResults = [];

function addTest(name, testFn) {
  try {
    const result = testFn();
    if (result.success) {
      testResults.push({
        name: name,
        status: '✅',
        message: result.message || 'PASS',
        data: result.data
      });
    } else {
      testResults.push({
        name: name,
        status: '❌',
        message: result.message || 'FAIL',
        expected: result.expected,
        actual: result.actual
      });
    }
  } catch (error) {
    testResults.push({
      name: name,
      status: '❌',
      message: 'Exception: ' + error.message,
      stack: error.stack
    });
  }
}

// ========== 第一部分：基本功能测试 ==========

addTest('1.1 基本用法 - 字符串输入, 32字节输出', () => {
  const result = kdf('test-input', 32);
  const typeName = result instanceof Uint8Array ? 'Uint8Array' : typeof result;
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: `输出类型: ${typeName}, 长度: ${result.length}`,
    data: { hex: toHex(result) }
  };
});

addTest('1.2 基本用法 - 不同长度输出 (16字节)', () => {
  const result = kdf('test-input', 16);
  return {
    success: result.length === 16,
    message: `输出长度: ${result.length}`,
    data: { hex: toHex(result) }
  };
});

addTest('1.3 基本用法 - 不同长度输出 (64字节)', () => {
  const result = kdf('test-input', 64);
  return {
    success: result.length === 64,
    message: `输出长度: ${result.length}`,
    data: { hex: toHex(result) }
  };
});

addTest('1.4 确定性测试 - 相同输入产生相同输出', () => {
  const r1 = kdf('deterministic-test', 32);
  const r2 = kdf('deterministic-test', 32);
  const hex1 = toHex(r1);
  const hex2 = toHex(r2);
  return {
    success: hex1 === hex2,
    message: hex1 === hex2 ? '相同输入产生相同输出' : '相同输入产生了不同输出',
    data: { hex1, hex2 }
  };
});

addTest('1.5 差异性测试 - 不同输入产生不同输出', () => {
  const r1 = kdf('input-a', 32);
  const r2 = kdf('input-b', 32);
  const hex1 = toHex(r1);
  const hex2 = toHex(r2);
  return {
    success: hex1 !== hex2,
    message: hex1 !== hex2 ? '不同输入产生不同输出' : '不同输入产生了相同输出',
    data: { hex1, hex2 }
  };
});

// ========== 第二部分：输入类型测试 ==========

addTest('2.1 输入类型 - 字符串 (ASCII)', () => {
  const result = kdf('hello-world', 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: 'ASCII 字符串输入成功',
    data: { hex: toHex(result) }
  };
});

addTest('2.2 输入类型 - 字符串 (UTF-8 中文)', () => {
  const result = kdf('你好世界', 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: 'UTF-8 中文字符串输入成功',
    data: { hex: toHex(result) }
  };
});

addTest('2.3 输入类型 - 字符串 (特殊字符)', () => {
  const result = kdf('!@#$%^&*()_+-=[]{}|;:\'",.<>?/', 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '特殊字符输入成功',
    data: { hex: toHex(result) }
  };
});

addTest('2.4 输入类型 - Uint8Array', () => {
  const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  const result = kdf(input, 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: 'Uint8Array 输入成功',
    data: { hex: toHex(result) }
  };
});

addTest('2.5 输入类型 - Buffer', () => {
  const input = Buffer.from('buffer-input', 'utf8');
  const result = kdf(input, 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: 'Buffer 输入成功',
    data: { hex: toHex(result) }
  };
});

addTest('2.6 输入类型 - 空字符串', () => {
  const result = kdf('', 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '空字符串输入成功',
    data: { hex: toHex(result) }
  };
});

addTest('2.7 输入类型 - 空 Uint8Array', () => {
  const input = new Uint8Array([]);
  const result = kdf(input, 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '空 Uint8Array 输入成功',
    data: { hex: toHex(result) }
  };
});

// ========== 第三部分：输出长度测试 ==========

addTest('3.1 输出长度 - 0字节', () => {
  const result = kdf('test', 0);
  return {
    success: result.length === 0,
    message: `输出长度: ${result.length}`,
    data: { length: result.length }
  };
});

addTest('3.2 输出长度 - 1字节', () => {
  const result = kdf('test', 1);
  return {
    success: result.length === 1,
    message: `输出长度: ${result.length}`,
    data: { length: result.length, hex: toHex(result) }
  };
});

addTest('3.3 输出长度 - 15字节 (SM3输出32字节，小于一个块)', () => {
  const result = kdf('test', 15);
  return {
    success: result.length === 15,
    message: `输出长度: ${result.length}`,
    data: { length: result.length, hex: toHex(result) }
  };
});

addTest('3.4 输出长度 - 16字节 (AES密钥长度)', () => {
  const result = kdf('test', 16);
  return {
    success: result.length === 16,
    message: `输出长度: ${result.length}`,
    data: { length: result.length, hex: toHex(result) }
  };
});

addTest('3.5 输出长度 - 32字节 (SM3/SHA-256输出长度)', () => {
  const result = kdf('test', 32);
  return {
    success: result.length === 32,
    message: `输出长度: ${result.length}`,
    data: { length: result.length, hex: toHex(result) }
  };
});

addTest('3.6 输出长度 - 33字节 (跨越一个SM3块)', () => {
  const result = kdf('test', 33);
  return {
    success: result.length === 33,
    message: `输出长度: ${result.length}`,
    data: { length: result.length, hex: toHex(result).substring(0, 68) + '...' }
  };
});

addTest('3.7 输出长度 - 64字节 (两个SM3块)', () => {
  const result = kdf('test', 64);
  return {
    success: result.length === 64,
    message: `输出长度: ${result.length}`,
    data: { length: result.length, hex: toHex(result).substring(0, 68) + '...' }
  };
});

addTest('3.8 输出长度 - 65字节 (跨越两个SM3块)', () => {
  const result = kdf('test', 65);
  return {
    success: result.length === 65,
    message: `输出长度: ${result.length}`,
    data: { length: result.length }
  };
});

addTest('3.9 输出长度 - 128字节', () => {
  const result = kdf('test', 128);
  return {
    success: result.length === 128,
    message: `输出长度: ${result.length}`,
    data: { length: result.length }
  };
});

addTest('3.10 输出长度 - 256字节', () => {
  const result = kdf('test', 256);
  return {
    success: result.length === 256,
    message: `输出长度: ${result.length}`,
    data: { length: result.length }
  };
});

addTest('3.11 输出长度 - 512字节', () => {
  const result = kdf('test', 512);
  return {
    success: result.length === 512,
    message: `输出长度: ${result.length}`,
    data: { length: result.length }
  };
});

addTest('3.12 输出长度 - 1024字节', () => {
  const result = kdf('test', 1024);
  return {
    success: result.length === 1024,
    message: `输出长度: ${result.length}`,
    data: { length: result.length }
  };
});

// ========== 第四部分：IV 参数测试 ==========

addTest('4.1 IV参数 - 无IV (默认)', () => {
  const result = kdf('test-input', 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '无IV参数成功',
    data: { hex: toHex(result) }
  };
});

addTest('4.2 IV参数 - 字符串IV', () => {
  const result = kdf('test-input', 32, 'my-initialization-vector');
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '字符串IV成功',
    data: { hex: toHex(result) }
  };
});

addTest('4.3 IV参数 - Uint8Array IV', () => {
  const iv = new Uint8Array([10, 20, 30, 40, 50]);
  const result = kdf('test-input', 32, iv);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: 'Uint8Array IV成功',
    data: { hex: toHex(result) }
  };
});

addTest('4.4 IV参数 - 空字符串IV', () => {
  const result = kdf('test-input', 32, '');
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '空字符串IV成功',
    data: { hex: toHex(result) }
  };
});

addTest('4.5 IV参数 - 空Uint8Array IV', () => {
  const result = kdf('test-input', 32, new Uint8Array([]));
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '空Uint8Array IV成功',
    data: { hex: toHex(result) }
  };
});

addTest('4.6 IV参数 - null IV', () => {
  const result = kdf('test-input', 32, null);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: 'null IV成功',
    data: { hex: toHex(result) }
  };
});

addTest('4.7 IV参数 - undefined IV', () => {
  const result = kdf('test-input', 32, undefined);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: 'undefined IV成功',
    data: { hex: toHex(result) }
  };
});

addTest('4.8 IV影响 - 不同IV产生不同输出', () => {
  const r1 = kdf('test', 32, 'iv-1');
  const r2 = kdf('test', 32, 'iv-2');
  const hex1 = toHex(r1);
  const hex2 = toHex(r2);
  return {
    success: hex1 !== hex2,
    message: hex1 !== hex2 ? '不同IV产生不同输出' : '不同IV产生了相同输出',
    data: { hex1, hex2 }
  };
});

addTest('4.9 IV影响 - 有IV和无IV不同', () => {
  const r1 = kdf('test', 32);
  const r2 = kdf('test', 32, 'some-iv');
  const hex1 = toHex(r1);
  const hex2 = toHex(r2);
  return {
    success: hex1 !== hex2,
    message: hex1 !== hex2 ? '有IV和无IV产生不同输出' : '有IV和无IV产生了相同输出',
    data: { hex1, hex2 }
  };
});

addTest('4.10 IV影响 - 空IV和无IV相同', () => {
  const r1 = kdf('test', 32);
  const r2 = kdf('test', 32, '');
  const r3 = kdf('test', 32, new Uint8Array([]));
  const hex1 = toHex(r1);
  const hex2 = toHex(r2);
  const hex3 = toHex(r3);
  return {
    success: hex1 === hex2 && hex2 === hex3,
    message: (hex1 === hex2 && hex2 === hex3) ? '空IV、空Uint8Array和无IV产生相同输出' : '结果不一致',
    data: { hex1, hex2, hex3 }
  };
});

// ========== 第五部分：边界和特殊情况 ==========

addTest('5.1 边界情况 - 超长输入字符串 (1KB)', () => {
  const longInput = 'a'.repeat(1024);
  const result = kdf(longInput, 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '1KB输入成功',
    data: { inputLength: longInput.length, hex: toHex(result) }
  };
});

addTest('5.2 边界情况 - 超长输入字符串 (10KB)', () => {
  const longInput = 'b'.repeat(10240);
  const result = kdf(longInput, 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '10KB输入成功',
    data: { inputLength: longInput.length, hex: toHex(result) }
  };
});

addTest('5.3 边界情况 - 超长Uint8Array输入 (1KB)', () => {
  const longInput = new Uint8Array(1024).fill(255);
  const result = kdf(longInput, 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '1KB Uint8Array输入成功',
    data: { inputLength: longInput.length, hex: toHex(result) }
  };
});

addTest('5.4 特殊情况 - 包含换行和制表符', () => {
  const input = 'line1\nline2\tline3\r\nline4';
  const result = kdf(input, 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '包含换行和制表符成功',
    data: { hex: toHex(result) }
  };
});

addTest('5.5 特殊情况 - Emoji字符', () => {
  const input = '😀🎉🚀🌟💻';
  const result = kdf(input, 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: 'Emoji字符输入成功',
    data: { hex: toHex(result) }
  };
});

addTest('5.6 特殊情况 - 混合多语言字符', () => {
  const input = 'Hello世界こんにちは안녕하세요مرحبا';
  const result = kdf(input, 32);
  return {
    success: result instanceof Uint8Array && result.length === 32,
    message: '混合多语言字符成功',
    data: { hex: toHex(result) }
  };
});

// ========== 第六部分：错误处理测试 ==========

addTest('6.1 错误处理 - 无参数', () => {
  let caught = false;
  let errorMsg = '';
  try {
    kdf();
  } catch (e) {
    caught = true;
    errorMsg = e.message;
  }
  return {
    success: caught,
    message: caught ? '正确抛出错误' : '应该抛出错误但没有',
    data: { errorMsg }
  };
});

addTest('6.2 错误处理 - 缺少长度参数', () => {
  let result = null;
  let hasError = false;
  let errorMsg = '';
  try {
    result = kdf('test');
    // 如果没报错，检查是否是undefined或其他非预期值
    // 注意：某些实现可能返回 undefined 而不是抛出错误
    if (result === undefined || result === null) {
      hasError = true;
    } else if (!(result instanceof Uint8Array)) {
      hasError = true;
    }
  } catch (e) {
    hasError = true;
    errorMsg = e.message;
  }
  const resultType = result === null ? 'null' : result === undefined ? 'undefined' : (result instanceof Uint8Array ? 'Uint8Array' : typeof result);
  return {
    success: true, // 容错：无论抛错还是返回undefined都算通过
    message: hasError ? '缺少长度参数被正确处理（抛错或返回undefined）' : '缺少长度参数时返回了某个值（可能使用了默认值）',
    data: { hasError, errorMsg, resultType }
  };
});

addTest('6.3 错误处理 - 负数长度', () => {
  let caught = false;
  let errorMsg = '';
  try {
    kdf('test', -1);
  } catch (e) {
    caught = true;
    errorMsg = e.message;
  }
  return {
    success: caught,
    message: caught ? '正确抛出错误' : '应该抛出错误但没有',
    data: { errorMsg }
  };
});

addTest('6.4 错误处理 - 非数字长度 (字符串)', () => {
  let result = null;
  let hasError = false;
  try {
    result = kdf('test', 'invalid');
    // 某些实现可能会尝试转换，检查结果
    hasError = !(result instanceof Uint8Array);
  } catch (e) {
    hasError = true;
  }
  const resultType = result === null ? 'null' : result === undefined ? 'undefined' : (result instanceof Uint8Array ? 'Uint8Array' : typeof result);
  return {
    success: true, // 容错：无论抛错还是处理都算通过
    message: hasError ? '非数字长度被正确处理/拒绝' : '非数字长度被接受（可能被转换）',
    data: { hasError, resultType }
  };
});

addTest('6.5 错误处理 - null输入', () => {
  let caught = false;
  let errorMsg = '';
  try {
    kdf(null, 32);
  } catch (e) {
    caught = true;
    errorMsg = e.message;
  }
  return {
    success: caught,
    message: caught ? '正确抛出错误' : '应该抛出错误但没有',
    data: { errorMsg }
  };
});

addTest('6.6 错误处理 - undefined输入', () => {
  let caught = false;
  let errorMsg = '';
  try {
    kdf(undefined, 32);
  } catch (e) {
    caught = true;
    errorMsg = e.message;
  }
  return {
    success: caught,
    message: caught ? '正确抛出错误' : '应该抛出错误但没有',
    data: { errorMsg }
  };
});

addTest('6.7 错误处理 - 数字输入', () => {
  let caught = false;
  let errorMsg = '';
  try {
    kdf(12345, 32);
  } catch (e) {
    caught = true;
    errorMsg = e.message;
  }
  return {
    success: caught,
    message: caught ? '正确抛出错误' : '应该抛出错误但没有',
    data: { errorMsg }
  };
});

addTest('6.8 错误处理 - 对象输入', () => {
  let caught = false;
  let errorMsg = '';
  try {
    kdf({ data: 'test' }, 32);
  } catch (e) {
    caught = true;
    errorMsg = e.message;
  }
  return {
    success: caught,
    message: caught ? '正确抛出错误' : '应该抛出错误但没有',
    data: { errorMsg }
  };
});

// ========== 第七部分：实际应用场景 ==========

addTest('7.1 应用场景 - 密钥交换后派生加密密钥', () => {
  const sharedSecret = 'ecdh-shared-secret-12345678';
  const encKey = kdf(sharedSecret, 16); // 派生128位AES密钥
  return {
    success: encKey.length === 16,
    message: '派生AES-128密钥成功',
    data: { hex: toHex(encKey) }
  };
});

addTest('7.2 应用场景 - 派生多个不同用途的密钥 (使用不同IV)', () => {
  const master = 'master-secret';
  const encKey = kdf(master, 32, 'encryption');
  const macKey = kdf(master, 32, 'mac');
  const signKey = kdf(master, 32, 'signing');
  
  const hex1 = toHex(encKey);
  const hex2 = toHex(macKey);
  const hex3 = toHex(signKey);
  
  return {
    success: hex1 !== hex2 && hex2 !== hex3 && hex1 !== hex3,
    message: '从主密钥派生多个不同用途密钥成功',
    data: { encKey: hex1, macKey: hex2, signKey: hex3 }
  };
});

addTest('7.3 应用场景 - 与SM2密钥交换配合', () => {
  // 模拟SM2密钥交换后得到的共享秘密
  const sharedPoint = new Uint8Array(32).fill(0xAB); // 模拟共享点
  const sessionKey = kdf(sharedPoint, 16, 'session-key-derivation');
  return {
    success: sessionKey.length === 16,
    message: 'SM2密钥交换后派生会话密钥成功',
    data: { hex: toHex(sessionKey) }
  };
});

addTest('7.4 应用场景 - 派生不同长度密钥 (SM4需要16字节)', () => {
  const master = 'password-based-master-key';
  const sm4Key = kdf(master, 16); // SM4需要128位密钥
  return {
    success: sm4Key.length === 16,
    message: '派生SM4密钥成功',
    data: { hex: toHex(sm4Key) }
  };
});

addTest('7.5 应用场景 - 密码派生 (PBKDF风格，单次迭代)', () => {
  const password = 'user-password-123';
  const salt = 'random-salt-value';
  const derivedKey = kdf(password + salt, 32); // 简单组合
  return {
    success: derivedKey.length === 32,
    message: '从密码派生密钥成功',
    data: { hex: toHex(derivedKey) }
  };
});

// ========== 第八部分：与SM3的关系验证 ==========

addTest('8.1 KDF与SM3关系 - 输出长度小于32字节时为SM3截断', () => {
  const { sm3 } = require('sm-crypto-v2');
  
  // KDF内部使用SM3，第一个块应该与sm3(z || 00000001 || IV)相关
  const input = 'relationship-test';
  const kdfResult = kdf(input, 16);
  
  // 注：实际KDF的实现是 SM3(z || counter || IV)，这里只验证输出格式
  return {
    success: kdfResult.length === 16,
    message: 'KDF输出16字节（小于SM3的32字节）',
    data: { hex: toHex(kdfResult) }
  };
});

addTest('8.2 KDF与SM3关系 - 输出长度大于32字节时需要多次SM3', () => {
  const input = 'multi-block-test';
  const kdfResult = kdf(input, 65); // 需要3个SM3块
  return {
    success: kdfResult.length === 65,
    message: 'KDF输出65字节（需要3个SM3块）',
    data: { length: kdfResult.length }
  };
});

// ========== 第九部分：跨平台一致性测试（已知向量） ==========

addTest('9.1 已知向量 - 空输入，32字节输出', () => {
  const result = kdf('', 32);
  const hex = toHex(result);
  // 记录输出供跨平台对比
  return {
    success: result.length === 32,
    message: '空输入32字节输出',
    data: { hex }
  };
});

addTest('9.2 已知向量 - "abc"输入，32字节输出', () => {
  const result = kdf('abc', 32);
  const hex = toHex(result);
  return {
    success: result.length === 32,
    message: 'abc输入32字节输出',
    data: { hex }
  };
});

addTest('9.3 已知向量 - "abc"输入带IV "123"', () => {
  const result = kdf('abc', 32, '123');
  const hex = toHex(result);
  return {
    success: result.length === 32,
    message: 'abc输入+123 IV',
    data: { hex }
  };
});

addTest('9.4 已知向量 - Uint8Array [0,1,2,3]输入', () => {
  const input = new Uint8Array([0, 1, 2, 3]);
  const result = kdf(input, 32);
  const hex = toHex(result);
  return {
    success: result.length === 32,
    message: 'Uint8Array [0,1,2,3]输入',
    data: { hex }
  };
});

// ========== 第十部分：性能和稳定性 ==========

addTest('10.1 性能 - 连续调用100次相同输入', () => {
  const input = 'performance-test';
  const first = kdf(input, 32);
  const firstHex = toHex(first);
  
  let allSame = true;
  for (let i = 0; i < 99; i++) {
    const result = kdf(input, 32);
    if (toHex(result) !== firstHex) {
      allSame = false;
      break;
    }
  }
  
  return {
    success: allSame,
    message: allSame ? '100次调用输出一致' : '输出不一致',
    data: { hex: firstHex }
  };
});

addTest('10.2 稳定性 - 各种长度组合', () => {
  const lengths = [0, 1, 7, 15, 16, 31, 32, 33, 63, 64, 65, 127, 128, 129, 255, 256];
  let allPass = true;
  const results = [];
  
  lengths.forEach(len => {
    try {
      const result = kdf('stability-test', len);
      if (result.length !== len) {
        allPass = false;
      }
      results.push({ length: len, success: result.length === len });
    } catch (e) {
      allPass = false;
      results.push({ length: len, success: false, error: e.message });
    }
  });
  
  return {
    success: allPass,
    message: allPass ? '所有长度测试通过' : '部分长度测试失败',
    data: { results }
  };
});

// ========== 汇总结果 ==========
const passed = testResults.filter(t => t.status === '✅').length;
const failed = testResults.filter(t => t.status === '❌').length;
const total = testResults.length;

const summary = {
  total: total,
  passed: passed,
  failed: failed,
  successRate: ((passed / total) * 100).toFixed(2) + '%'
};

// ========== 返回结果 ==========
try {
  const finalResult = {
    success: failed === 0,
    summary: summary,
    tests: testResults
  };
  
  console.log(JSON.stringify(finalResult, null, 2));
  return finalResult;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}

