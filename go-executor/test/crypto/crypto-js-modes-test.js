// crypto-js 模块 - 加密模式扩展测试 (CFB, OFB, CTR)
const CryptoJS = require('crypto-js');

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

// 测试用的密钥和 IV
const key = CryptoJS.enc.Hex.parse("000102030405060708090a0b0c0d0e0f");
const iv = CryptoJS.enc.Hex.parse("0f0e0d0c0b0a09080706050403020100");
const plaintext = "Hello, Cipher Modes!";

//
// 测试 1: AES-CFB 模式 - 加密
//
try {
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  const passed = ciphertext && ciphertext.length > 0;
  
  addResult(
    '测试 1: AES-CFB 加密',
    passed,
    passed ? `成功加密, 密文 (hex): ${ciphertext.substring(0, 32)}...` : `加密失败`
  );
} catch (error) {
  addResult('测试 1: AES-CFB 加密', false, `异常: ${error.message}`);
}

//
// 测试 2: AES-CFB 模式 - 加密/解密往返
//
try {
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 2: AES-CFB 加密/解密往返',
    passed,
    passed ? `往返成功: "${plaintext}" -> "${decryptedText}"` : `解密失败: "${decryptedText}"`
  );
} catch (error) {
  addResult('测试 2: AES-CFB 加密/解密往返', false, `异常: ${error.message}`);
}

//
// 测试 3: AES-CFB 模式 - 中文字符
//
try {
  const chineseText = "你好，世界！AES-CFB 模式测试";
  
  const encrypted = CryptoJS.AES.encrypt(chineseText, key, {
    iv: iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === chineseText;
  
  addResult(
    '测试 3: AES-CFB 中文字符',
    passed,
    passed ? `中文加密/解密成功` : `中文解密失败`
  );
} catch (error) {
  addResult('测试 3: AES-CFB 中文字符', false, `异常: ${error.message}`);
}

//
// 测试 4: AES-OFB 模式 - 加密
//
try {
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.OFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  const passed = ciphertext && ciphertext.length > 0;
  
  addResult(
    '测试 4: AES-OFB 加密',
    passed,
    passed ? `成功加密, 密文 (hex): ${ciphertext.substring(0, 32)}...` : `加密失败`
  );
} catch (error) {
  addResult('测试 4: AES-OFB 加密', false, `异常: ${error.message}`);
}

//
// 测试 5: AES-OFB 模式 - 加密/解密往返
//
try {
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.OFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.OFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 5: AES-OFB 加密/解密往返',
    passed,
    passed ? `往返成功: "${plaintext}" -> "${decryptedText}"` : `解密失败: "${decryptedText}"`
  );
} catch (error) {
  addResult('测试 5: AES-OFB 加密/解密往返', false, `异常: ${error.message}`);
}

//
// 测试 6: AES-OFB 模式 - 中文字符
//
try {
  const chineseText = "你好，世界！AES-OFB 模式测试";
  
  const encrypted = CryptoJS.AES.encrypt(chineseText, key, {
    iv: iv,
    mode: CryptoJS.mode.OFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.OFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === chineseText;
  
  addResult(
    '测试 6: AES-OFB 中文字符',
    passed,
    passed ? `中文加密/解密成功` : `中文解密失败`
  );
} catch (error) {
  addResult('测试 6: AES-OFB 中文字符', false, `异常: ${error.message}`);
}

//
// 测试 7: AES-CTR 模式 - 加密
//
try {
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  const ciphertext = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  const passed = ciphertext && ciphertext.length > 0;
  
  addResult(
    '测试 7: AES-CTR 加密',
    passed,
    passed ? `成功加密, 密文 (hex): ${ciphertext.substring(0, 32)}...` : `加密失败`
  );
} catch (error) {
  addResult('测试 7: AES-CTR 加密', false, `异常: ${error.message}`);
}

//
// 测试 8: AES-CTR 模式 - 加密/解密往返
//
try {
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 8: AES-CTR 加密/解密往返',
    passed,
    passed ? `往返成功: "${plaintext}" -> "${decryptedText}"` : `解密失败: "${decryptedText}"`
  );
} catch (error) {
  addResult('测试 8: AES-CTR 加密/解密往返', false, `异常: ${error.message}`);
}

//
// 测试 9: AES-CTR 模式 - 中文字符
//
try {
  const chineseText = "你好，世界！AES-CTR 模式测试";
  
  const encrypted = CryptoJS.AES.encrypt(chineseText, key, {
    iv: iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === chineseText;
  
  addResult(
    '测试 9: AES-CTR 中文字符',
    passed,
    passed ? `中文加密/解密成功` : `中文解密失败`
  );
} catch (error) {
  addResult('测试 9: AES-CTR 中文字符', false, `异常: ${error.message}`);
}

//
// 测试 10: 模式比较 - 相同明文不同模式产生不同密文
//
try {
  const testText = "Mode comparison test";
  
  const encCBC = CryptoJS.AES.encrypt(testText, key, { iv: iv, mode: CryptoJS.mode.CBC });
  const encCFB = CryptoJS.AES.encrypt(testText, key, { iv: iv, mode: CryptoJS.mode.CFB });
  const encOFB = CryptoJS.AES.encrypt(testText, key, { iv: iv, mode: CryptoJS.mode.OFB });
  const encCTR = CryptoJS.AES.encrypt(testText, key, { iv: iv, mode: CryptoJS.mode.CTR });
  
  const hexCBC = encCBC.ciphertext.toString(CryptoJS.enc.Hex);
  const hexCFB = encCFB.ciphertext.toString(CryptoJS.enc.Hex);
  const hexOFB = encOFB.ciphertext.toString(CryptoJS.enc.Hex);
  const hexCTR = encCTR.ciphertext.toString(CryptoJS.enc.Hex);
  
  // 所有密文应该不同
  const allDifferent = (
    hexCBC !== hexCFB &&
    hexCBC !== hexOFB &&
    hexCBC !== hexCTR &&
    hexCFB !== hexOFB &&
    hexCFB !== hexCTR &&
    hexOFB !== hexCTR
  );
  
  addResult(
    '测试 10: 不同模式产生不同密文',
    allDifferent,
    allDifferent ? `CBC, CFB, OFB, CTR 模式产生不同的密文` : `某些模式产生了相同的密文`
  );
} catch (error) {
  addResult('测试 10: 不同模式产生不同密文', false, `异常: ${error.message}`);
}

//
// 测试 11: AES-CFB 模式 - 长文本
//
try {
  const longText = "A".repeat(1000);
  
  const encrypted = CryptoJS.AES.encrypt(longText, key, {
    iv: iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === longText;
  
  addResult(
    '测试 11: AES-CFB 长文本 (1000 字符)',
    passed,
    passed ? `成功加密/解密 1000 字符` : `长文本解密失败`
  );
} catch (error) {
  addResult('测试 11: AES-CFB 长文本', false, `异常: ${error.message}`);
}

//
// 测试 12: AES-OFB 模式 - 空字符串
//
try {
  const emptyText = "";
  
  const encrypted = CryptoJS.AES.encrypt(emptyText, key, {
    iv: iv,
    mode: CryptoJS.mode.OFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.OFB,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === emptyText;
  
  addResult(
    '测试 12: AES-OFB 空字符串',
    passed,
    passed ? `成功处理空字符串` : `空字符串处理失败`
  );
} catch (error) {
  addResult('测试 12: AES-OFB 空字符串', false, `异常: ${error.message}`);
}

//
// 测试 13: AES-CTR 模式 - 特殊字符
//
try {
  const specialText = "!@#$%^&*()_+-=[]{}|;':\",./<>?`~";
  
  const encrypted = CryptoJS.AES.encrypt(specialText, key, {
    iv: iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === specialText;
  
  addResult(
    '测试 13: AES-CTR 特殊字符',
    passed,
    passed ? `成功加密/解密特殊字符` : `特殊字符解密失败`
  );
} catch (error) {
  addResult('测试 13: AES-CTR 特殊字符', false, `异常: ${error.message}`);
}

//
// 测试 14: 流模式特性 - CFB/OFB/CTR 不需要填充
//
try {
  // 流模式 (CFB, OFB, CTR) 不需要将明文填充到块大小的倍数
  const oddLengthText = "ABC"; // 3 字节，不是 16 字节 (AES 块大小) 的倍数
  
  let allPassed = true;
  let details = [];
  
  // 测试 CFB
  try {
    const encCFB = CryptoJS.AES.encrypt(oddLengthText, key, { iv: iv, mode: CryptoJS.mode.CFB, padding: CryptoJS.pad.NoPadding });
    const decCFB = CryptoJS.AES.decrypt(encCFB, key, { iv: iv, mode: CryptoJS.mode.CFB, padding: CryptoJS.pad.NoPadding });
    const resultCFB = decCFB.toString(CryptoJS.enc.Utf8);
    if (resultCFB === oddLengthText) {
      details.push('CFB 通过');
    } else {
      allPassed = false;
      details.push('CFB 失败');
    }
  } catch (e) {
    allPassed = false;
    details.push(`CFB 异常: ${e.message}`);
  }
  
  // 测试 OFB
  try {
    const encOFB = CryptoJS.AES.encrypt(oddLengthText, key, { iv: iv, mode: CryptoJS.mode.OFB, padding: CryptoJS.pad.NoPadding });
    const decOFB = CryptoJS.AES.decrypt(encOFB, key, { iv: iv, mode: CryptoJS.mode.OFB, padding: CryptoJS.pad.NoPadding });
    const resultOFB = decOFB.toString(CryptoJS.enc.Utf8);
    if (resultOFB === oddLengthText) {
      details.push('OFB 通过');
    } else {
      allPassed = false;
      details.push('OFB 失败');
    }
  } catch (e) {
    allPassed = false;
    details.push(`OFB 异常: ${e.message}`);
  }
  
  // 测试 CTR
  try {
    const encCTR = CryptoJS.AES.encrypt(oddLengthText, key, { iv: iv, mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding });
    const decCTR = CryptoJS.AES.decrypt(encCTR, key, { iv: iv, mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding });
    const resultCTR = decCTR.toString(CryptoJS.enc.Utf8);
    if (resultCTR === oddLengthText) {
      details.push('CTR 通过');
    } else {
      allPassed = false;
      details.push('CTR 失败');
    }
  } catch (e) {
    allPassed = false;
    details.push(`CTR 异常: ${e.message}`);
  }
  
  addResult(
    '测试 14: 流模式不需要填充特性',
    allPassed,
    allPassed ? `所有流模式正确处理非块大小倍数的明文: ${details.join(', ')}` : `部分失败: ${details.join(', ')}`
  );
} catch (error) {
  addResult('测试 14: 流模式不需要填充特性', false, `异常: ${error.message}`);
}

//
// 测试 15: IV 影响验证 - 不同 IV 产生不同密文
//
try {
  const testText = "IV test";
  const iv1 = CryptoJS.enc.Hex.parse("00112233445566778899aabbccddeeff");
  const iv2 = CryptoJS.enc.Hex.parse("ffeeddccbbaa99887766554433221100");
  
  const enc1 = CryptoJS.AES.encrypt(testText, key, { iv: iv1, mode: CryptoJS.mode.CTR });
  const enc2 = CryptoJS.AES.encrypt(testText, key, { iv: iv2, mode: CryptoJS.mode.CTR });
  
  const hex1 = enc1.ciphertext.toString(CryptoJS.enc.Hex);
  const hex2 = enc2.ciphertext.toString(CryptoJS.enc.Hex);
  
  const isDifferent = hex1 !== hex2;
  
  addResult(
    '测试 15: 不同 IV 产生不同密文',
    isDifferent,
    isDifferent ? `不同 IV 正确产生不同的密文` : `不同 IV 产生了相同的密文 (错误)`
  );
} catch (error) {
  addResult('测试 15: 不同 IV 产生不同密文', false, `异常: ${error.message}`);
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
  note: '测试 crypto-js 模块的扩展加密模式 (AES-CFB, AES-OFB, AES-CTR)'
};






