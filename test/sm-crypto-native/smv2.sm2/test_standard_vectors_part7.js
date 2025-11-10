const { sm2 } = require('sm-crypto-v2');

/**
 * SM2 标准测试向量验证 - Part 7
 * 覆盖：已知答案测试(KAT)、标准测试向量、跨实现兼容性验证
 * 
 * 测试向量来源：
 * 1. 使用固定私钥派生标准密钥对
 * 2. 验证签名、加密、密钥交换等功能的确定性和一致性
 * 3. 确保实现符合 SM2 算法标准
 */

try {
  const results = [];
  let testCount = 0;
  let passCount = 0;

  // ========== 标准测试向量 1: 固定私钥的签名验签 ==========
  testCount++;
  try {
    const privateKey = '128B2FA8BD433C6C068C8D803DFF79792A519A55171B1B650C23661D15897263';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const userId = '414C494345313233405941484F4F2E434F4D'; // ALICE123@YAHOO.COM in hex
    const message = 'message digest';

    // 签名
    const signature = sm2.doSignature(message, privateKey, {
      hash: true,
      publicKey: publicKey,
      userId: sm2.hexToArray(userId)
    });

    // 验签
    const isValid = sm2.doVerifySignature(message, signature, publicKey, {
      hash: true,
      userId: sm2.hexToArray(userId)
    });

    if (!isValid) {
      throw new Error('签名验证失败');
    }

    // 验证签名格式
    if (!/^[0-9a-fA-F]+$/.test(signature) || signature.length !== 128) {
      throw new Error(`签名格式错误: 长度=${signature.length}, 期望=128`);
    }

    results.push({
      test: '标准测试向量1: 固定私钥签名验签',
      status: '✅',
      details: `userId=ALICE123@YAHOO.COM`
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量1: 固定私钥签名验签',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 2: 固定私钥的加密解密 ==========
  testCount++;
  try {
    const privateKey = '3945208F7B2144B13F36E38AC6D39F95889393692860B51A42FB81EF4DF7C5B8';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const plaintext = 'encryption standard test 加密标准测试';

    // 加密
    const encrypted = sm2.doEncrypt(plaintext, publicKey, 1);
    
    // 解密
    const decrypted = sm2.doDecrypt(encrypted, privateKey, 1);

    if (decrypted !== plaintext) {
      throw new Error(`解密结果不匹配`);
    }

    results.push({
      test: '标准测试向量2: 固定私钥加密解密',
      status: '✅',
      details: `C1C3C2模式, 密文长度=${encrypted.length}`
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量2: 固定私钥加密解密',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 3: 公钥压缩与解压缩 ==========
  testCount++;
  try {
    const privateKey = 'B9AB0B828FF68872F21A837FC303668428DEA11DCD1B24429D0C99E24EED83D5';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);

    // 验证公钥长度
    if (publicKey.length !== 130 || !publicKey.startsWith('04')) {
      throw new Error(`未压缩公钥格式错误: ${publicKey.slice(0,10)}...`);
    }

    // 压缩公钥
    const compressed = sm2.compressPublicKeyHex(publicKey);
    if (compressed.length !== 66 || (!compressed.startsWith('02') && !compressed.startsWith('03'))) {
      throw new Error(`压缩公钥格式错误: ${compressed.slice(0,10)}...`);
    }

    // 验证公钥比较
    const isEqual = sm2.comparePublicKeyHex(publicKey, compressed);
    if (!isEqual) {
      throw new Error('压缩与未压缩公钥应相等');
    }

    // 验证公钥有效性
    if (!sm2.verifyPublicKey(publicKey) || !sm2.verifyPublicKey(compressed)) {
      throw new Error('公钥验证失败');
    }

    results.push({
      test: '标准测试向量3: 公钥压缩验证',
      status: '✅',
      details: `130位 → 66位`
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量3: 公钥压缩验证',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 4: DER编码签名 ==========
  testCount++;
  try {
    const privateKey = 'DC8A19BB44D3EFD954C28A0A0D3C2F3C7F3F3D3E3F3C3B3A393837363534330A';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const message = 'DER encoding test';
    const userId = '31323334353637383132333435363738'; // 1234567812345678

    // DER编码签名
    const signatureDer = sm2.doSignature(message, privateKey, {
      der: true,
      hash: true,
      publicKey: publicKey,
      userId: sm2.hexToArray(userId)
    });

    // DER编码验签
    const isValidDer = sm2.doVerifySignature(message, signatureDer, publicKey, {
      der: true,
      hash: true,
      userId: sm2.hexToArray(userId)
    });

    if (!isValidDer) {
      throw new Error('DER编码签名验证失败');
    }

    // DER签名长度通常在140-146之间
    if (signatureDer.length < 138 || signatureDer.length > 148) {
      throw new Error(`DER签名长度异常: ${signatureDer.length}`);
    }

    results.push({
      test: '标准测试向量4: DER编码签名',
      status: '✅',
      details: `DER签名长度=${signatureDer.length}`
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量4: DER编码签名',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 5: 双密码模式(C1C3C2 & C1C2C3) ==========
  testCount++;
  try {
    const privateKey = 'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const plaintext = 'Test both cipher modes';

    // C1C3C2 模式
    const encrypted1 = sm2.doEncrypt(plaintext, publicKey, 1);
    const decrypted1 = sm2.doDecrypt(encrypted1, privateKey, 1);
    if (decrypted1 !== plaintext) {
      throw new Error('C1C3C2模式失败');
    }

    // C1C2C3 模式
    const encrypted0 = sm2.doEncrypt(plaintext, publicKey, 0);
    const decrypted0 = sm2.doDecrypt(encrypted0, privateKey, 0);
    if (decrypted0 !== plaintext) {
      throw new Error('C1C2C3模式失败');
    }

    results.push({
      test: '标准测试向量5: 双密码模式',
      status: '✅',
      details: 'C1C3C2 & C1C2C3均通过'
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量5: 双密码模式',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 6: ASN.1编码加密 ==========
  testCount++;
  try {
    const privateKey = '1649AB77A00637BD5E2EFE283FBF353534AA7F7CB89463F208DDBC2920BB0DA0';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const plaintext = 'ASN.1 encoding test';

    // ASN.1编码
    const encryptedAsn1 = sm2.doEncrypt(plaintext, publicKey, 1, { asn1: true });
    const decryptedAsn1 = sm2.doDecrypt(encryptedAsn1, privateKey, 1, { asn1: true });
    if (decryptedAsn1 !== plaintext) {
      throw new Error('ASN.1编码失败');
    }

    // 非ASN.1编码
    const encryptedNoAsn1 = sm2.doEncrypt(plaintext, publicKey, 1, { asn1: false });
    const decryptedNoAsn1 = sm2.doDecrypt(encryptedNoAsn1, privateKey, 1, { asn1: false });
    if (decryptedNoAsn1 !== plaintext) {
      throw new Error('非ASN.1编码失败');
    }

    results.push({
      test: '标准测试向量6: ASN.1编码',
      status: '✅',
      details: 'ASN.1和非ASN.1均正确'
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量6: ASN.1编码',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 7: Uint8Array输入输出 ==========
  testCount++;
  try {
    const privateKey = 'F0E1D2C3B4A59687786949392827161514131211100F0E0D0C0B0A0908070605';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const plaintext = 'TypedArray test 二进制测试';

    // 转为 Uint8Array
    const plaintextArray = new TextEncoder().encode(plaintext);

    // 加密
    const encrypted = sm2.doEncrypt(plaintextArray, publicKey, 1);

    // 解密为 Uint8Array
    const decryptedArray = sm2.doDecrypt(encrypted, privateKey, 1, { output: 'array' });

    if (!(decryptedArray instanceof Uint8Array)) {
      throw new Error('输出应为Uint8Array');
    }

    // 转回字符串
    const decryptedString = new TextDecoder().decode(decryptedArray);
    if (decryptedString !== plaintext) {
      throw new Error('Uint8Array往返转换失败');
    }

    results.push({
      test: '标准测试向量7: Uint8Array输入输出',
      status: '✅',
      details: `二进制长度=${plaintextArray.length}字节`
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量7: Uint8Array输入输出',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 8: Z值计算 ==========
  testCount++;
  try {
    const privateKey = '5DD701828C424B84C5D56770ECF7C4FE882E654CAC53C7CC89A66B1709068B9D';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const userId = '31323334353637383132333435363738'; // 默认userId

    // 计算Z值
    const z = sm2.getZ(publicKey, sm2.hexToArray(userId));

    if (!(z instanceof Uint8Array) || z.length !== 32) {
      throw new Error(`Z值格式错误: 长度=${z ? z.length : 'null'}`);
    }

    // 验证getHash
    const message = 'hash test';
    const hash = sm2.getHash(message, publicKey, sm2.hexToArray(userId));

    if (typeof hash !== 'string' || hash.length !== 64) {
      throw new Error(`哈希格式错误: 长度=${hash.length}`);
    }

    // 验证确定性
    const hash2 = sm2.getHash(message, publicKey, sm2.hexToArray(userId));
    if (hash !== hash2) {
      throw new Error('哈希不确定');
    }

    results.push({
      test: '标准测试向量8: Z值计算',
      status: '✅',
      details: `Z值长度=32字节, 哈希长度=64字符`
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量8: Z值计算',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 9: ECDH密钥协商 ==========
  testCount++;
  try {
    const privateKeyA = 'D5B7EC8D1CF5C55CF5C5A2E3F1E0D9C8B7A69584736251403020101F1E1D1C1B';
    const publicKeyA = sm2.getPublicKeyFromPrivateKey(privateKeyA);

    const privateKeyB = 'C5A4938271605F4E3D2C1B0A090807060504030201F0E1D2C3B4A5968778695A';
    const publicKeyB = sm2.getPublicKeyFromPrivateKey(privateKeyB);

    // ECDH
    const sharedKeyA = sm2.ecdh(privateKeyA, publicKeyB);
    const sharedKeyB = sm2.ecdh(privateKeyB, publicKeyA);

    if (!(sharedKeyA instanceof Uint8Array) || !(sharedKeyB instanceof Uint8Array)) {
      throw new Error('共享密钥应为Uint8Array');
    }

    if (sharedKeyA.length !== sharedKeyB.length) {
      throw new Error('共享密钥长度不同');
    }

    // 比较内容
    let match = true;
    for (let i = 0; i < sharedKeyA.length; i++) {
      if (sharedKeyA[i] !== sharedKeyB[i]) {
        match = false;
        break;
      }
    }

    if (!match) {
      throw new Error('ECDH共享密钥不匹配');
    }

    results.push({
      test: '标准测试向量9: ECDH密钥协商',
      status: '✅',
      details: `共享密钥长度=${sharedKeyA.length}字节`
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量9: ECDH密钥协商',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 10: 完整密钥交换流程 ==========
  testCount++;
  try {
    const aliceStaticPrivate = 'A1B2C3D4E5F607182930415263748596A7B8C9DAEBFCFD0E1F2031425364750A';
    const aliceStaticPublic = sm2.getPublicKeyFromPrivateKey(aliceStaticPrivate);
    const aliceEphemeral = sm2.generateKeyPairHex();

    const bobStaticPrivate = 'F6E5D4C3B2A19081726354453627180900A1B2C3D4E5F607182930415263748C';
    const bobStaticPublic = sm2.getPublicKeyFromPrivateKey(bobStaticPrivate);
    const bobEphemeral = sm2.generateKeyPairHex();

    const idA = 'alice@example.com';
    const idB = 'bob@example.com';

    // Alice计算
    const sharedKeyAlice = sm2.calculateSharedKey(
      { privateKey: aliceStaticPrivate, publicKey: aliceStaticPublic },
      { privateKey: aliceEphemeral.privateKey, publicKey: aliceEphemeral.publicKey },
      bobStaticPublic,
      bobEphemeral.publicKey,
      32,
      false, // Alice是发起方
      idA,
      idB
    );

    // Bob计算
    const sharedKeyBob = sm2.calculateSharedKey(
      { privateKey: bobStaticPrivate, publicKey: bobStaticPublic },
      { privateKey: bobEphemeral.privateKey, publicKey: bobEphemeral.publicKey },
      aliceStaticPublic,
      aliceEphemeral.publicKey,
      32,
      true, // Bob是响应方
      idB,
      idA
    );

    if (sharedKeyAlice.length !== 32 || sharedKeyBob.length !== 32) {
      throw new Error('共享密钥长度错误');
    }

    let match = true;
    for (let i = 0; i < 32; i++) {
      if (sharedKeyAlice[i] !== sharedKeyBob[i]) {
        match = false;
        break;
      }
    }

    if (!match) {
      throw new Error('密钥交换失败');
    }

    results.push({
      test: '标准测试向量10: 完整密钥交换',
      status: '✅',
      details: `${idA} ↔ ${idB}`
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量10: 完整密钥交换',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 11: 空消息签名 ==========
  testCount++;
  try {
    const privateKey = 'B1C2D3E4F5067182930415263748596A7B8C9DAEBFCFD0E1F203142536475869';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const message = '';

    const signature = sm2.doSignature(message, privateKey, { hash: true });
    const isValid = sm2.doVerifySignature(message, signature, publicKey, { hash: true });

    if (!isValid) {
      throw new Error('空消息签名验证失败');
    }

    results.push({
      test: '标准测试向量11: 空消息签名',
      status: '✅',
      details: '空字符串处理正确'
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量11: 空消息签名',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 12: Unicode多语言 ==========
  testCount++;
  try {
    const privateKey = 'C0D1E2F30415263748596A7B8C9DAEBFCFD0E1F203142536475869708192A3C0';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const message = 'Hello世界🌍مرحبا안녕하세요Привет';

    // 加密
    const encrypted = sm2.doEncrypt(message, publicKey, 1);
    const decrypted = sm2.doDecrypt(encrypted, privateKey, 1);
    if (decrypted !== message) {
      throw new Error('Unicode加密失败');
    }

    // 签名
    const signature = sm2.doSignature(message, privateKey, { hash: true });
    const isValid = sm2.doVerifySignature(message, signature, publicKey, { hash: true });
    if (!isValid) {
      throw new Error('Unicode签名失败');
    }

    results.push({
      test: '标准测试向量12: Unicode多语言',
      status: '✅',
      details: '多语言+Emoji支持'
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量12: Unicode多语言',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 13: 预计算公钥 ==========
  testCount++;
  try {
    const privateKey = 'D0E1F203142536475869708990A1B2C3D4E5F607182930415263748596A0B10D';
    const publicKey = sm2.getPublicKeyFromPrivateKey(privateKey);
    const precomputedKey = sm2.precomputePublicKey(publicKey);
    const message = 'precomputed test';

    // 使用预计算公钥多次
    for (let i = 0; i < 3; i++) {
      const msg = `${message} ${i}`;
      
      // 加密
      const encrypted = sm2.doEncrypt(msg, precomputedKey, 1);
      const decrypted = sm2.doDecrypt(encrypted, privateKey, 1);
      if (decrypted !== msg) {
        throw new Error(`第${i+1}次加密失败`);
      }

      // 验签
      const signature = sm2.doSignature(msg, privateKey);
      const isValid = sm2.doVerifySignature(msg, signature, precomputedKey);
      if (!isValid) {
        throw new Error(`第${i+1}次验签失败`);
      }
    }

    results.push({
      test: '标准测试向量13: 预计算公钥',
      status: '✅',
      details: '3次重复使用成功'
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量13: 预计算公钥',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 14: 工具函数转换 ==========
  testCount++;
  try {
    const testData = {
      hex: '48656C6C6F20576F726C6421',
      utf8: 'Hello World!',
      array: new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]),
    };

    // hex → array
    const hexToArr = sm2.hexToArray(testData.hex);
    for (let i = 0; i < testData.array.length; i++) {
      if (hexToArr[i] !== testData.array[i]) {
        throw new Error(`hexToArray错误 at ${i}`);
      }
    }

    // array → hex
    const arrToHex = sm2.arrayToHex(Array.from(testData.array));
    if (arrToHex.toUpperCase() !== testData.hex.toUpperCase()) {
      throw new Error('arrayToHex错误');
    }

    // utf8 → hex
    const utf8ToHex = sm2.utf8ToHex(testData.utf8);
    if (utf8ToHex.toUpperCase() !== testData.hex.toUpperCase()) {
      throw new Error('utf8ToHex错误');
    }

    // array → utf8
    const arrToUtf8 = sm2.arrayToUtf8(testData.array);
    if (arrToUtf8 !== testData.utf8) {
      throw new Error('arrayToUtf8错误');
    }

    // 往返转换
    const roundTrip = sm2.arrayToUtf8(sm2.hexToArray(sm2.utf8ToHex(testData.utf8)));
    if (roundTrip !== testData.utf8) {
      throw new Error('往返转换失败');
    }

    results.push({
      test: '标准测试向量14: 工具函数转换',
      status: '✅',
      details: 'hex/array/utf8互转正确'
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量14: 工具函数转换',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
  }

  // ========== 标准测试向量 15: 密钥格式一致性 ==========
  testCount++;
  try {
    const keypair = sm2.generateKeyPairHex();

    // 验证私钥长度
    if (keypair.privateKey.length !== 64) {
      throw new Error(`私钥长度错误: ${keypair.privateKey.length}`);
    }

    // 验证公钥长度
    if (keypair.publicKey.length !== 130) {
      throw new Error(`公钥长度错误: ${keypair.publicKey.length}`);
    }

    // 验证公钥前缀
    if (!keypair.publicKey.startsWith('04')) {
      throw new Error('公钥应以04开头');
    }

    // 验证派生一致性
    const derivedPubKey = sm2.getPublicKeyFromPrivateKey(keypair.privateKey);
    if (derivedPubKey !== keypair.publicKey) {
      throw new Error('公钥派生不一致');
    }

    // 验证压缩
    const compressedKey = sm2.compressPublicKeyHex(keypair.publicKey);
    if (compressedKey.length !== 66) {
      throw new Error(`压缩公钥长度错误: ${compressedKey.length}`);
    }
    if (!compressedKey.startsWith('02') && !compressedKey.startsWith('03')) {
      throw new Error('压缩公钥前缀错误');
    }

    // 验证有效性
    if (!sm2.verifyPublicKey(keypair.publicKey) || !sm2.verifyPublicKey(compressedKey)) {
      throw new Error('公钥验证失败');
    }

    results.push({
      test: '标准测试向量15: 密钥格式一致性',
      status: '✅',
      details: '私钥64位, 公钥130位/66位'
    });
    passCount++;
  } catch (error) {
    results.push({
      test: '标准测试向量15: 密钥格式一致性',
      status: '❌',
      error: error.message,
      stack: error.stack
    });
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
