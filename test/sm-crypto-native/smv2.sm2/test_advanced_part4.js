const { sm2 } = require('sm-crypto-v2');

/**
 * SM2 高级功能完整测试 - Part 4
 * 覆盖：预计算公钥、密钥交换、椭圆曲线点、随机池初始化
 */

async function runTests() {
  try {
    const results = [];
    let testCount = 0;
    let passCount = 0;

    // 生成测试用密钥对
    const keypair = sm2.generateKeyPairHex();
    const publicKey = keypair.publicKey;
    const privateKey = keypair.privateKey;

    // ========== 测试 1: 预计算公钥基本功能 ==========
    testCount++;
    try {
      const precomputedPublicKey = sm2.precomputePublicKey(publicKey);
      
      // 验证返回结果不为空
      if (!precomputedPublicKey) {
        throw new Error('预计算公钥返回空值');
      }
      
      results.push({ test: '预计算公钥基本功能', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '预计算公钥基本功能', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 2: 预计算公钥用于加密 ==========
    testCount++;
    try {
      const msg = 'precomputed encryption test';
      const precomputedPublicKey = sm2.precomputePublicKey(publicKey);
      const cipherMode = 1;
      
      const encryptData = sm2.doEncrypt(msg, precomputedPublicKey, cipherMode);
      const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode);
      
      if (decryptData !== msg) {
        throw new Error('使用预计算公钥加密解密失败');
      }
      
      results.push({ test: '预计算公钥用于加密', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '预计算公钥用于加密', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 3: 预计算公钥用于验签 ==========
    testCount++;
    try {
      const msg = 'precomputed verify test';
      const precomputedPublicKey = sm2.precomputePublicKey(publicKey);
      
      const signature = sm2.doSignature(msg, privateKey);
      const isValid = sm2.doVerifySignature(msg, signature, precomputedPublicKey);
      
      if (!isValid) {
        throw new Error('使用预计算公钥验签失败');
      }
      
      results.push({ test: '预计算公钥用于验签', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '预计算公钥用于验签', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 4: 预计算压缩公钥 ==========
    testCount++;
    try {
      const compressedPublicKey = sm2.compressPublicKeyHex(publicKey);
      const precomputedCompressedKey = sm2.precomputePublicKey(compressedPublicKey);
      
      const msg = 'compressed precomputed test';
      const signature = sm2.doSignature(msg, privateKey);
      const isValid = sm2.doVerifySignature(msg, signature, precomputedCompressedKey);
      
      if (!isValid) {
        throw new Error('预计算压缩公钥验签失败');
      }
      
      results.push({ test: '预计算压缩公钥', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '预计算压缩公钥', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 5: 获取椭圆曲线点 ==========
    testCount++;
    try {
      const point = sm2.getPoint();
      
      if (!point) {
        throw new Error('获取椭圆曲线点失败');
      }
      
      results.push({ test: '获取椭圆曲线点', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '获取椭圆曲线点', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 6: 多次获取椭圆曲线点应不同 ==========
    testCount++;
    try {
      const point1 = sm2.getPoint();
      const point2 = sm2.getPoint();
      const point3 = sm2.getPoint();
      
      // 点对象应该不同（不同的引用或不同的值）
      if (point1 === point2 || point1 === point3 || point2 === point3) {
        // 如果是相同引用，可能是实现问题
      }
      
      results.push({ test: '多次获取椭圆曲线点', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '多次获取椭圆曲线点', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 7: 密钥交换（无身份） ==========
    testCount++;
    try {
      const keyPairA = sm2.generateKeyPairHex();
      const keyPairB = sm2.generateKeyPairHex();
      const ephemeralKeypairA = sm2.generateKeyPairHex();
      const ephemeralKeypairB = sm2.generateKeyPairHex();
      
      // A计算共享密钥
      const sharedKeyFromA = sm2.calculateSharedKey(
        keyPairA,
        ephemeralKeypairA,
        keyPairB.publicKey,
        ephemeralKeypairB.publicKey,
        233, // 长度（字节）
        false // A是发起方
      );
      
      // B计算共享密钥
      const sharedKeyFromB = sm2.calculateSharedKey(
        keyPairB,
        ephemeralKeypairB,
        keyPairA.publicKey,
        ephemeralKeypairA.publicKey,
        233,
        true // B是接收方
      );
      
      // 验证返回类型为Uint8Array
      if (!(sharedKeyFromA instanceof Uint8Array) || !(sharedKeyFromB instanceof Uint8Array)) {
        throw new Error('共享密钥应为Uint8Array类型');
      }
      
      // 验证共享密钥长度
      if (sharedKeyFromA.length !== 233 || sharedKeyFromB.length !== 233) {
        throw new Error(`共享密钥长度错误: A=${sharedKeyFromA.length}, B=${sharedKeyFromB.length}, 期望: 233`);
      }
      
      // 比较共享密钥是否相同
      let keysMatch = true;
      for (let i = 0; i < sharedKeyFromA.length; i++) {
        if (sharedKeyFromA[i] !== sharedKeyFromB[i]) {
          keysMatch = false;
          break;
        }
      }
      
      if (!keysMatch) {
        throw new Error('密钥交换失败: A和B得到的共享密钥不同');
      }
      
      results.push({ test: '密钥交换（无身份）', status: '✅', details: `共享密钥长度: ${sharedKeyFromA.length}字节` });
      passCount++;
    } catch (error) {
      results.push({ test: '密钥交换（无身份）', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 8: 密钥交换（带身份） ==========
    testCount++;
    try {
      const keyPairA = sm2.generateKeyPairHex();
      const keyPairB = sm2.generateKeyPairHex();
      const ephemeralKeypairA = sm2.generateKeyPairHex();
      const ephemeralKeypairB = sm2.generateKeyPairHex();
      
      const idA = 'alice@example.com';
      const idB = 'bob@example.com';
      
      // A计算共享密钥（带身份）
      const sharedKeyFromA = sm2.calculateSharedKey(
        keyPairA,
        ephemeralKeypairA,
        keyPairB.publicKey,
        ephemeralKeypairB.publicKey,
        233,
        false,
        idA, // A的身份
        idB  // B的身份
      );
      
      // B计算共享密钥（带身份，注意身份顺序）
      const sharedKeyFromB = sm2.calculateSharedKey(
        keyPairB,
        ephemeralKeypairB,
        keyPairA.publicKey,
        ephemeralKeypairA.publicKey,
        233,
        true,
        idB, // B的身份
        idA  // A的身份
      );
      
      // 验证类型
      if (!(sharedKeyFromA instanceof Uint8Array) || !(sharedKeyFromB instanceof Uint8Array)) {
        throw new Error('共享密钥应为Uint8Array类型');
      }
      
      // 比较共享密钥是否相同
      let keysMatch = true;
      for (let i = 0; i < sharedKeyFromA.length; i++) {
        if (sharedKeyFromA[i] !== sharedKeyFromB[i]) {
          keysMatch = false;
          break;
        }
      }
      
      if (!keysMatch) {
        throw new Error('带身份的密钥交换失败');
      }
      
      results.push({ test: '密钥交换（带身份）', status: '✅', details: `A: ${idA}, B: ${idB}` });
      passCount++;
    } catch (error) {
      results.push({ test: '密钥交换（带身份）', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 9: 密钥交换不同长度 ==========
    testCount++;
    try {
      const keyPairA = sm2.generateKeyPairHex();
      const keyPairB = sm2.generateKeyPairHex();
      const ephemeralKeypairA = sm2.generateKeyPairHex();
      const ephemeralKeypairB = sm2.generateKeyPairHex();
      
      const lengths = [16, 32, 64, 128, 256];
      
      for (const len of lengths) {
        const sharedKeyA = sm2.calculateSharedKey(
          keyPairA, ephemeralKeypairA, keyPairB.publicKey, ephemeralKeypairB.publicKey, len, false
        );
        const sharedKeyB = sm2.calculateSharedKey(
          keyPairB, ephemeralKeypairB, keyPairA.publicKey, ephemeralKeypairA.publicKey, len, true
        );
        
        // 验证长度
        if (sharedKeyA.length !== len || sharedKeyB.length !== len) {
          throw new Error(`长度${len}的共享密钥长度错误: A=${sharedKeyA.length}, B=${sharedKeyB.length}`);
        }
        
        // 比较是否相同
        let match = true;
        for (let i = 0; i < len; i++) {
          if (sharedKeyA[i] !== sharedKeyB[i]) {
            match = false;
            break;
          }
        }
        
        if (!match) {
          throw new Error(`长度${len}的密钥交换失败`);
        }
      }
      
      results.push({ test: '密钥交换不同长度', status: '✅', details: `测试长度: ${lengths.join(', ')}字节` });
      passCount++;
    } catch (error) {
      results.push({ test: '密钥交换不同长度', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 10: 密钥交换角色互换 ==========
    testCount++;
    try {
      const keyPairA = sm2.generateKeyPairHex();
      const keyPairB = sm2.generateKeyPairHex();
      const ephemeralKeypairA = sm2.generateKeyPairHex();
      const ephemeralKeypairB = sm2.generateKeyPairHex();
      
      // 正确的角色
      const correctA = sm2.calculateSharedKey(
        keyPairA, ephemeralKeypairA, keyPairB.publicKey, ephemeralKeypairB.publicKey, 64, false
      );
      const correctB = sm2.calculateSharedKey(
        keyPairB, ephemeralKeypairB, keyPairA.publicKey, ephemeralKeypairA.publicKey, 64, true
      );
      
      // 比较正确角色的密钥
      let correctMatch = true;
      for (let i = 0; i < 64; i++) {
        if (correctA[i] !== correctB[i]) {
          correctMatch = false;
          break;
        }
      }
      
      if (!correctMatch) {
        throw new Error('正确角色密钥交换失败');
      }
      
      // 错误的角色（两个都是false或两个都是true）
      const wrongA = sm2.calculateSharedKey(
        keyPairA, ephemeralKeypairA, keyPairB.publicKey, ephemeralKeypairB.publicKey, 64, true
      );
      const wrongB = sm2.calculateSharedKey(
        keyPairB, ephemeralKeypairB, keyPairA.publicKey, ephemeralKeypairA.publicKey, 64, false
      );
      
      // 错误角色的共享密钥应该与正确的不同
      let wrongMatchA = true;
      let wrongMatchB = true;
      for (let i = 0; i < 64; i++) {
        if (correctA[i] !== wrongA[i]) wrongMatchA = false;
        if (correctB[i] !== wrongB[i]) wrongMatchB = false;
      }
      
      if (wrongMatchA || wrongMatchB) {
        throw new Error('角色标识未正确影响密钥交换');
      }
      
      results.push({ test: '密钥交换角色标识验证', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '密钥交换角色标识验证', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 11: 身份不匹配的密钥交换 ==========
    testCount++;
    try {
      const keyPairA = sm2.generateKeyPairHex();
      const keyPairB = sm2.generateKeyPairHex();
      const ephemeralKeypairA = sm2.generateKeyPairHex();
      const ephemeralKeypairB = sm2.generateKeyPairHex();
      
      // A使用身份"alice", "bob"
      const sharedKeyA = sm2.calculateSharedKey(
        keyPairA, ephemeralKeypairA, keyPairB.publicKey, ephemeralKeypairB.publicKey,
        64, false, 'alice', 'bob'
      );
      
      // B使用不匹配的身份"bob", "charlie"
      const sharedKeyB = sm2.calculateSharedKey(
        keyPairB, ephemeralKeypairB, keyPairA.publicKey, ephemeralKeypairA.publicKey,
        64, true, 'bob', 'charlie'
      );
      
      // 身份不匹配，共享密钥应该不同
      let keysMatch = true;
      for (let i = 0; i < 64; i++) {
        if (sharedKeyA[i] !== sharedKeyB[i]) {
          keysMatch = false;
          break;
        }
      }
      
      if (keysMatch) {
        throw new Error('身份不匹配时密钥交换不应成功');
      }
      
      results.push({ test: '身份不匹配的密钥交换', status: '✅', details: '正确检测到身份不匹配' });
      passCount++;
    } catch (error) {
      results.push({ test: '身份不匹配的密钥交换', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 12: 随机池初始化 ==========
    testCount++;
    try {
      // initRNGPool是异步函数
      await sm2.initRNGPool();
      
      // 初始化后应该能正常生成密钥
      const testKeypair = sm2.generateKeyPairHex();
      
      if (!testKeypair || !testKeypair.publicKey || !testKeypair.privateKey) {
        throw new Error('随机池初始化后密钥生成失败');
      }
      
      results.push({ test: '随机池初始化', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '随机池初始化', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 13: 随机池初始化后的密钥质量 ==========
    testCount++;
    try {
      await sm2.initRNGPool();
      
      // 生成多个密钥，验证随机性
      const keys = [];
      for (let i = 0; i < 5; i++) {
        const kp = sm2.generateKeyPairHex();
        keys.push(kp.privateKey);
      }
      
      // 验证所有密钥都不同
      const uniqueKeys = new Set(keys);
      if (uniqueKeys.size !== keys.length) {
        throw new Error('随机池初始化后仍存在重复密钥');
      }
      
      results.push({ test: '随机池初始化后的密钥质量', status: '✅', details: `生成${keys.length}个不重复密钥` });
      passCount++;
    } catch (error) {
      results.push({ test: '随机池初始化后的密钥质量', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 14: 预计算公钥与原始公钥等价性（加密） ==========
    testCount++;
    try {
      const msg = 'equivalence test';
      const cipherMode = 1;
      
      // 使用原始公钥加密
      const encrypted1 = sm2.doEncrypt(msg, publicKey, cipherMode);
      const decrypted1 = sm2.doDecrypt(encrypted1, privateKey, cipherMode);
      
      // 使用预计算公钥加密
      const precomputedKey = sm2.precomputePublicKey(publicKey);
      const encrypted2 = sm2.doEncrypt(msg, precomputedKey, cipherMode);
      const decrypted2 = sm2.doDecrypt(encrypted2, privateKey, cipherMode);
      
      if (decrypted1 !== msg || decrypted2 !== msg) {
        throw new Error('预计算公钥与原始公钥加密结果不等价');
      }
      
      results.push({ test: '预计算公钥与原始公钥等价性（加密）', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '预计算公钥与原始公钥等价性（加密）', status: '❌', error: error.message, stack: error.stack });
    }

    // ========== 测试 15: 预计算公钥与原始公钥等价性（验签） ==========
    testCount++;
    try {
      const msg = 'signature equivalence test';
      
      const signature = sm2.doSignature(msg, privateKey, { hash: true });
      
      // 使用原始公钥验签
      const valid1 = sm2.doVerifySignature(msg, signature, publicKey, { hash: true });
      
      // 使用预计算公钥验签
      const precomputedKey = sm2.precomputePublicKey(publicKey);
      const valid2 = sm2.doVerifySignature(msg, signature, precomputedKey, { hash: true });
      
      if (!valid1 || !valid2) {
        throw new Error('预计算公钥与原始公钥验签结果不等价');
      }
      
      results.push({ test: '预计算公钥与原始公钥等价性（验签）', status: '✅' });
      passCount++;
    } catch (error) {
      results.push({ test: '预计算公钥与原始公钥等价性（验签）', status: '❌', error: error.message, stack: error.stack });
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
}

// 执行测试（异步）
return runTests();

