const { sm2 } = require('sm-crypto-v2');

/**
 * SM2 遗漏API补充测试 - Part 5
 * 覆盖：getPublicKeyFromPrivateKey, ecdh, getHash, getZ, 工具函数
 */

try {
  const results = [];
  let testCount = 0;
  let passCount = 0;

  // 生成测试用密钥对
  const keypair = sm2.generateKeyPairHex();
  const publicKey = keypair.publicKey;
  const privateKey = keypair.privateKey;

  // ========== 测试 1: getPublicKeyFromPrivateKey 基本功能 ==========
  testCount++;
  try {
    const derivedPublicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    
    if (!derivedPublicKey || typeof derivedPublicKey !== 'string') {
      throw new Error('派生公钥格式错误');
    }
    
    // 验证派生的公钥与原公钥相同
    if (derivedPublicKey !== publicKey) {
      throw new Error(`派生公钥不匹配: 期望 ${publicKey.slice(0, 20)}..., 实际 ${derivedPublicKey.slice(0, 20)}...`);
    }
    
    results.push({ test: 'getPublicKeyFromPrivateKey基本功能', status: '✅', details: `公钥长度: ${derivedPublicKey.length}` });
    passCount++;
  } catch (error) {
    results.push({ test: 'getPublicKeyFromPrivateKey基本功能', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 2: getPublicKeyFromPrivateKey 多次调用一致性 ==========
  testCount++;
  try {
    const pub1 = sm2.getPublicKeyFromPrivateKey(privateKey);
    const pub2 = sm2.getPublicKeyFromPrivateKey(privateKey);
    const pub3 = sm2.getPublicKeyFromPrivateKey(privateKey);
    
    if (pub1 !== pub2 || pub1 !== pub3) {
      throw new Error('同一私钥多次派生公钥应相同');
    }
    
    results.push({ test: 'getPublicKeyFromPrivateKey一致性', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'getPublicKeyFromPrivateKey一致性', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 3: getPublicKeyFromPrivateKey 不同私钥 ==========
  testCount++;
  try {
    const kp1 = sm2.generateKeyPairHex();
    const kp2 = sm2.generateKeyPairHex();
    
    const pub1 = sm2.getPublicKeyFromPrivateKey(kp1.privateKey);
    const pub2 = sm2.getPublicKeyFromPrivateKey(kp2.privateKey);
    
    if (pub1 === pub2) {
      throw new Error('不同私钥应派生出不同公钥');
    }
    
    results.push({ test: 'getPublicKeyFromPrivateKey不同私钥', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'getPublicKeyFromPrivateKey不同私钥', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 4: ecdh 基本功能 ==========
  testCount++;
  try {
    const kpA = sm2.generateKeyPairHex();
    const kpB = sm2.generateKeyPairHex();
    
    const sharedA = sm2.ecdh(kpA.privateKey, kpB.publicKey);
    const sharedB = sm2.ecdh(kpB.privateKey, kpA.publicKey);
    
    // 验证返回类型为Uint8Array
    if (!(sharedA instanceof Uint8Array) || !(sharedB instanceof Uint8Array)) {
      throw new Error('ecdh应返回Uint8Array类型');
    }
    
    // 验证共享密钥相同
    if (sharedA.length !== sharedB.length) {
      throw new Error(`共享密钥长度不同: A=${sharedA.length}, B=${sharedB.length}`);
    }
    
    let match = true;
    for (let i = 0; i < sharedA.length; i++) {
      if (sharedA[i] !== sharedB[i]) {
        match = false;
        break;
      }
    }
    
    if (!match) {
      throw new Error('ecdh共享密钥不匹配');
    }
    
    results.push({ test: 'ecdh基本功能', status: '✅', details: `共享密钥长度: ${sharedA.length}字节` });
    passCount++;
  } catch (error) {
    results.push({ test: 'ecdh基本功能', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 5: ecdh 与不同公钥 ==========
  testCount++;
  try {
    const kpA = sm2.generateKeyPairHex();
    const kpB1 = sm2.generateKeyPairHex();
    const kpB2 = sm2.generateKeyPairHex();
    
    const shared1 = sm2.ecdh(kpA.privateKey, kpB1.publicKey);
    const shared2 = sm2.ecdh(kpA.privateKey, kpB2.publicKey);
    
    // 使用不同公钥应得到不同的共享密钥
    let same = true;
    for (let i = 0; i < Math.min(shared1.length, shared2.length); i++) {
      if (shared1[i] !== shared2[i]) {
        same = false;
        break;
      }
    }
    
    if (same && shared1.length === shared2.length) {
      throw new Error('不同公钥应产生不同的共享密钥');
    }
    
    results.push({ test: 'ecdh与不同公钥', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'ecdh与不同公钥', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 6: ecdh 使用压缩公钥 ==========
  testCount++;
  try {
    const kpA = sm2.generateKeyPairHex();
    const kpB = sm2.generateKeyPairHex();
    const compressedPubB = sm2.compressPublicKeyHex(kpB.publicKey);
    
    const shared1 = sm2.ecdh(kpA.privateKey, kpB.publicKey);
    const shared2 = sm2.ecdh(kpA.privateKey, compressedPubB);
    
    // 压缩和未压缩公钥应产生相同的共享密钥
    let match = true;
    for (let i = 0; i < shared1.length; i++) {
      if (shared1[i] !== shared2[i]) {
        match = false;
        break;
      }
    }
    
    if (!match) {
      throw new Error('压缩和未压缩公钥应产生相同的共享密钥');
    }
    
    results.push({ test: 'ecdh使用压缩公钥', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'ecdh使用压缩公钥', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 7: getHash 基本功能 ==========
  testCount++;
  try {
    const msg = 'test message';
    const hash = sm2.getHash(msg, publicKey);
    
    // 验证返回类型为字符串
    if (typeof hash !== 'string') {
      throw new Error(`getHash应返回字符串，实际: ${typeof hash}`);
    }
    
    // 验证哈希长度（SM3哈希为64位十六进制字符串）
    if (hash.length !== 64) {
      throw new Error(`哈希长度错误: ${hash.length}, 期望: 64`);
    }
    
    // 验证为十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(hash)) {
      throw new Error('哈希应为十六进制字符串');
    }
    
    results.push({ test: 'getHash基本功能', status: '✅', details: `哈希长度: ${hash.length}` });
    passCount++;
  } catch (error) {
    results.push({ test: 'getHash基本功能', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 8: getHash 确定性 ==========
  testCount++;
  try {
    const msg = 'deterministic test';
    const hash1 = sm2.getHash(msg, publicKey);
    const hash2 = sm2.getHash(msg, publicKey);
    const hash3 = sm2.getHash(msg, publicKey);
    
    if (hash1 !== hash2 || hash1 !== hash3) {
      throw new Error('相同输入应产生相同哈希');
    }
    
    results.push({ test: 'getHash确定性', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'getHash确定性', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 9: getHash 不同消息 ==========
  testCount++;
  try {
    const msg1 = 'message 1';
    const msg2 = 'message 2';
    
    const hash1 = sm2.getHash(msg1, publicKey);
    const hash2 = sm2.getHash(msg2, publicKey);
    
    if (hash1 === hash2) {
      throw new Error('不同消息应产生不同哈希');
    }
    
    results.push({ test: 'getHash不同消息', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'getHash不同消息', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 10: getHash 不同公钥 ==========
  testCount++;
  try {
    const msg = 'same message';
    const kp2 = sm2.generateKeyPairHex();
    
    const hash1 = sm2.getHash(msg, publicKey);
    const hash2 = sm2.getHash(msg, kp2.publicKey);
    
    if (hash1 === hash2) {
      throw new Error('不同公钥应产生不同哈希');
    }
    
    results.push({ test: 'getHash不同公钥', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'getHash不同公钥', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 11: getZ 基本功能 ==========
  testCount++;
  try {
    const z = sm2.getZ(publicKey);
    
    // 验证返回类型为Uint8Array
    if (!(z instanceof Uint8Array)) {
      throw new Error(`getZ应返回Uint8Array，实际: ${typeof z}`);
    }
    
    // 验证Z值长度（应为32字节）
    if (z.length !== 32) {
      throw new Error(`Z值长度错误: ${z.length}, 期望: 32`);
    }
    
    results.push({ test: 'getZ基本功能', status: '✅', details: `Z值长度: ${z.length}字节` });
    passCount++;
  } catch (error) {
    results.push({ test: 'getZ基本功能', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 12: getZ 确定性 ==========
  testCount++;
  try {
    const z1 = sm2.getZ(publicKey);
    const z2 = sm2.getZ(publicKey);
    const z3 = sm2.getZ(publicKey);
    
    // 相同公钥应产生相同Z值
    let match1 = true, match2 = true;
    for (let i = 0; i < 32; i++) {
      if (z1[i] !== z2[i]) match1 = false;
      if (z1[i] !== z3[i]) match2 = false;
    }
    
    if (!match1 || !match2) {
      throw new Error('相同公钥应产生相同Z值');
    }
    
    results.push({ test: 'getZ确定性', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'getZ确定性', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 13: getZ 不同公钥 ==========
  testCount++;
  try {
    const kp2 = sm2.generateKeyPairHex();
    
    const z1 = sm2.getZ(publicKey);
    const z2 = sm2.getZ(kp2.publicKey);
    
    // 不同公钥应产生不同Z值
    let same = true;
    for (let i = 0; i < 32; i++) {
      if (z1[i] !== z2[i]) {
        same = false;
        break;
      }
    }
    
    if (same) {
      throw new Error('不同公钥应产生不同Z值');
    }
    
    results.push({ test: 'getZ不同公钥', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'getZ不同公钥', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 14: getZ 使用压缩公钥 ==========
  testCount++;
  try {
    const compressedPub = sm2.compressPublicKeyHex(publicKey);
    
    const z1 = sm2.getZ(publicKey);
    const z2 = sm2.getZ(compressedPub);
    
    // 压缩和未压缩公钥应产生相同Z值
    let match = true;
    for (let i = 0; i < 32; i++) {
      if (z1[i] !== z2[i]) {
        match = false;
        break;
      }
    }
    
    if (!match) {
      throw new Error('压缩和未压缩公钥应产生相同Z值');
    }
    
    results.push({ test: 'getZ使用压缩公钥', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'getZ使用压缩公钥', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 15: 工具函数 hexToArray ==========
  testCount++;
  try {
    const hexStr = '48656c6c6f'; // "Hello"
    const arr = sm2.hexToArray(hexStr);
    
    if (!(arr instanceof Uint8Array)) {
      throw new Error('hexToArray应返回Uint8Array');
    }
    
    if (arr.length !== 5) {
      throw new Error(`数组长度错误: ${arr.length}, 期望: 5`);
    }
    
    // 验证值
    const expected = [0x48, 0x65, 0x6c, 0x6c, 0x6f];
    for (let i = 0; i < expected.length; i++) {
      if (arr[i] !== expected[i]) {
        throw new Error(`字节${i}不匹配: ${arr[i]} vs ${expected[i]}`);
      }
    }
    
    results.push({ test: '工具函数hexToArray', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '工具函数hexToArray', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 16: 工具函数 arrayToHex ==========
  testCount++;
  try {
    // 注意：arrayToHex 接受普通数组，不是 Uint8Array
    const arr = [0x48, 0x65, 0x6c, 0x6c, 0x6f];
    const hexStr = sm2.arrayToHex(arr);
    
    if (typeof hexStr !== 'string') {
      throw new Error('arrayToHex应返回字符串');
    }
    
    if (hexStr.toLowerCase() !== '48656c6c6f') {
      throw new Error(`十六进制转换错误: ${hexStr}, 期望: 48656c6c6f`);
    }
    
    results.push({ test: '工具函数arrayToHex', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '工具函数arrayToHex', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 17: 工具函数 utf8ToHex ==========
  testCount++;
  try {
    const utf8Str = 'Hello 世界';
    const hexStr = sm2.utf8ToHex(utf8Str);
    
    if (typeof hexStr !== 'string') {
      throw new Error('utf8ToHex应返回字符串');
    }
    
    // 验证为有效的十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(hexStr)) {
      throw new Error('应返回有效的十六进制字符串');
    }
    
    results.push({ test: '工具函数utf8ToHex', status: '✅', details: `输出长度: ${hexStr.length}` });
    passCount++;
  } catch (error) {
    results.push({ test: '工具函数utf8ToHex', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 18: 工具函数 arrayToUtf8 ==========
  testCount++;
  try {
    // "Hello"
    const arr = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    const utf8Str = sm2.arrayToUtf8(arr);
    
    if (typeof utf8Str !== 'string') {
      throw new Error('arrayToUtf8应返回字符串');
    }
    
    if (utf8Str !== 'Hello') {
      throw new Error(`UTF-8转换错误: ${utf8Str}, 期望: Hello`);
    }
    
    results.push({ test: '工具函数arrayToUtf8', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '工具函数arrayToUtf8', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 19: 工具函数 leftPad ==========
  testCount++;
  try {
    const str = '123';
    const padded = sm2.leftPad(str, 6);
    
    if (typeof padded !== 'string') {
      throw new Error('leftPad应返回字符串');
    }
    
    if (padded !== '000123') {
      throw new Error(`左填充错误: ${padded}, 期望: 000123`);
    }
    
    // 测试不需要填充的情况
    const nopad = sm2.leftPad('123456', 6);
    if (nopad !== '123456') {
      throw new Error('不需要填充时应返回原字符串');
    }
    
    results.push({ test: '工具函数leftPad', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '工具函数leftPad', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 20: 工具函数往返转换 ==========
  testCount++;
  try {
    const original = 'Hello 世界 🎉';
    
    // UTF-8 → Hex → Array → UTF-8
    const hex = sm2.utf8ToHex(original);
    const arr = sm2.hexToArray(hex);
    const back = sm2.arrayToUtf8(arr);
    
    if (back !== original) {
      throw new Error(`往返转换失败: "${back}" vs "${original}"`);
    }
    
    // Array → Hex → Array（注意：arrayToHex接受普通数组）
    const arr2 = [1, 2, 3, 4, 5];
    const hex2 = sm2.arrayToHex(arr2);
    const arr3 = sm2.hexToArray(hex2);
    
    let arrMatch = true;
    for (let i = 0; i < arr2.length; i++) {
      if (arr2[i] !== arr3[i]) {
        arrMatch = false;
        break;
      }
    }
    
    if (!arrMatch) {
      throw new Error('数组往返转换失败');
    }
    
    results.push({ test: '工具函数往返转换', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '工具函数往返转换', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 汇总结果 ==========
  const summary = {
    success: passCount === testCount,
    total: testCount,
    passed: passCount,
    failed: testCount - passCount,
    passRate: `${((passCount / testCount) * 100).toFixed(2)}%`
  };

  const output = {
    success: summary.success,
    summary,
    results
  };

  console.log(JSON.stringify(output, null, 2));
  return output;

} catch (error) {
  const output = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(output, null, 2));
  return output;
}

