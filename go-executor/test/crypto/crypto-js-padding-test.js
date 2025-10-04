// crypto-js 模块 - 填充模式测试 (ZeroPadding, AnsiX923, Iso10126, Iso97971)
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

//
// 测试 1: ZeroPadding - 加密/解密往返
//
try {
  const plaintext = "Test Zero Padding";
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  // ZeroPadding 可能会在末尾保留 null 字符，需要 trim
  const trimmedText = decryptedText.replace(/\0+$/, '');
  const passed = trimmedText === plaintext;
  
  addResult(
    '测试 1: ZeroPadding 加密/解密',
    passed,
    passed ? `往返成功: "${plaintext}"` : `解密失败: "${trimmedText}"`
  );
} catch (error) {
  addResult('测试 1: ZeroPadding 加密/解密', false, `异常: ${error.message}`);
}

//
// 测试 2: ZeroPadding - 块大小对齐的明文
//
try {
  const plaintext = "1234567890123456"; // 恰好 16 字节 (AES 块大小)
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const trimmedText = decryptedText.replace(/\0+$/, '');
  const passed = trimmedText === plaintext;
  
  addResult(
    '测试 2: ZeroPadding 块对齐明文',
    passed,
    passed ? `块对齐明文处理成功` : `解密失败`
  );
} catch (error) {
  addResult('测试 2: ZeroPadding 块对齐明文', false, `异常: ${error.message}`);
}

//
// 测试 3: ZeroPadding - 中文字符
//
try {
  const plaintext = "你好世界";
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const trimmedText = decryptedText.replace(/\0+$/, '');
  const passed = trimmedText === plaintext;
  
  addResult(
    '测试 3: ZeroPadding 中文字符',
    passed,
    passed ? `中文处理成功` : `中文解密失败`
  );
} catch (error) {
  addResult('测试 3: ZeroPadding 中文字符', false, `异常: ${error.message}`);
}

//
// 测试 4: AnsiX923 - 加密/解密往返
//
try {
  const plaintext = "Test ANSI X.923 Padding";
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.AnsiX923
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.AnsiX923
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 4: AnsiX923 加密/解密',
    passed,
    passed ? `往返成功: "${plaintext}"` : `解密失败: "${decryptedText}"`
  );
} catch (error) {
  addResult('测试 4: AnsiX923 加密/解密', false, `异常: ${error.message}`);
}

//
// 测试 5: AnsiX923 - 块对齐明文
//
try {
  const plaintext = "1234567890123456"; // 16 字节
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.AnsiX923
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.AnsiX923
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 5: AnsiX923 块对齐明文',
    passed,
    passed ? `块对齐明文处理成功` : `解密失败`
  );
} catch (error) {
  addResult('测试 5: AnsiX923 块对齐明文', false, `异常: ${error.message}`);
}

//
// 测试 6: AnsiX923 - 中文字符
//
try {
  const plaintext = "你好世界！ANSI X.923";
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.AnsiX923
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.AnsiX923
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 6: AnsiX923 中文字符',
    passed,
    passed ? `中文处理成功` : `中文解密失败`
  );
} catch (error) {
  addResult('测试 6: AnsiX923 中文字符', false, `异常: ${error.message}`);
}

//
// 测试 7: Iso10126 - 加密/解密往返
//
try {
  const plaintext = "Test ISO 10126 Padding";
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso10126
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso10126
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 7: Iso10126 加密/解密',
    passed,
    passed ? `往返成功: "${plaintext}"` : `解密失败: "${decryptedText}"`
  );
} catch (error) {
  addResult('测试 7: Iso10126 加密/解密', false, `异常: ${error.message}`);
}

//
// 测试 8: Iso10126 - 随机性验证 (多次加密产生不同密文)
//
try {
  const plaintext = "Random padding test";
  
  const encrypted1 = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso10126
  });
  
  const encrypted2 = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso10126
  });
  
  const hex1 = encrypted1.ciphertext.toString(CryptoJS.enc.Hex);
  const hex2 = encrypted2.ciphertext.toString(CryptoJS.enc.Hex);
  
  // ISO 10126 使用随机填充，所以相同明文应该产生不同密文
  const isDifferent = hex1 !== hex2;
  
  // 但解密结果应该相同
  const decrypted1 = CryptoJS.AES.decrypt(encrypted1, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Iso10126 }).toString(CryptoJS.enc.Utf8);
  const decrypted2 = CryptoJS.AES.decrypt(encrypted2, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Iso10126 }).toString(CryptoJS.enc.Utf8);
  const sameDecrypted = decrypted1 === plaintext && decrypted2 === plaintext;
  
  const passed = isDifferent && sameDecrypted;
  
  addResult(
    '测试 8: Iso10126 随机填充特性',
    passed,
    passed ? `正确产生随机填充 (密文不同但解密相同)` : `随机填充验证失败`
  );
} catch (error) {
  addResult('测试 8: Iso10126 随机填充特性', false, `异常: ${error.message}`);
}

//
// 测试 9: Iso97971 - 加密/解密往返
//
try {
  const plaintext = "Test ISO/IEC 9797-1 Padding";
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso97971
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso97971
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 9: Iso97971 加密/解密',
    passed,
    passed ? `往返成功: "${plaintext}"` : `解密失败: "${decryptedText}"`
  );
} catch (error) {
  addResult('测试 9: Iso97971 加密/解密', false, `异常: ${error.message}`);
}

//
// 测试 10: Iso97971 - 块对齐明文
//
try {
  const plaintext = "1234567890123456"; // 16 字节
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso97971
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso97971
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 10: Iso97971 块对齐明文',
    passed,
    passed ? `块对齐明文处理成功` : `解密失败`
  );
} catch (error) {
  addResult('测试 10: Iso97971 块对齐明文', false, `异常: ${error.message}`);
}

//
// 测试 11: 填充模式比较 - 相同明文不同填充产生不同密文
//
try {
  const plaintext = "Padding comparison";
  
  const encPkcs7 = CryptoJS.AES.encrypt(plaintext, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  const encZero = CryptoJS.AES.encrypt(plaintext, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.ZeroPadding });
  const encAnsi = CryptoJS.AES.encrypt(plaintext, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.AnsiX923 });
  const encIso97 = CryptoJS.AES.encrypt(plaintext, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Iso97971 });
  
  const hexPkcs7 = encPkcs7.ciphertext.toString(CryptoJS.enc.Hex);
  const hexZero = encZero.ciphertext.toString(CryptoJS.enc.Hex);
  const hexAnsi = encAnsi.ciphertext.toString(CryptoJS.enc.Hex);
  const hexIso97 = encIso97.ciphertext.toString(CryptoJS.enc.Hex);
  
  // 不同填充应该产生不同的密文 (至少最后一个块不同)
  const allDifferent = (
    hexPkcs7 !== hexZero &&
    hexPkcs7 !== hexAnsi &&
    hexPkcs7 !== hexIso97 &&
    hexZero !== hexAnsi &&
    hexZero !== hexIso97 &&
    hexAnsi !== hexIso97
  );
  
  addResult(
    '测试 11: 不同填充模式产生不同密文',
    allDifferent,
    allDifferent ? `Pkcs7, ZeroPadding, AnsiX923, Iso97971 产生不同的密文` : `某些填充模式产生了相同的密文`
  );
} catch (error) {
  addResult('测试 11: 不同填充模式产生不同密文', false, `异常: ${error.message}`);
}

//
// 测试 12: ZeroPadding - 长文本
//
try {
  const plaintext = "A".repeat(500);
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const trimmedText = decryptedText.replace(/\0+$/, '');
  const passed = trimmedText === plaintext;
  
  addResult(
    '测试 12: ZeroPadding 长文本 (500 字符)',
    passed,
    passed ? `长文本处理成功` : `长文本解密失败`
  );
} catch (error) {
  addResult('测试 12: ZeroPadding 长文本', false, `异常: ${error.message}`);
}

//
// 测试 13: AnsiX923 - 特殊字符
//
try {
  const plaintext = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.AnsiX923
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.AnsiX923
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 13: AnsiX923 特殊字符',
    passed,
    passed ? `特殊字符处理成功` : `特殊字符解密失败`
  );
} catch (error) {
  addResult('测试 13: AnsiX923 特殊字符', false, `异常: ${error.message}`);
}

//
// 测试 14: Iso10126 - 中文字符
//
try {
  const plaintext = "测试 ISO 10126 中文填充模式功能";
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso10126
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso10126
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 14: Iso10126 中文字符',
    passed,
    passed ? `中文处理成功` : `中文解密失败`
  );
} catch (error) {
  addResult('测试 14: Iso10126 中文字符', false, `异常: ${error.message}`);
}

//
// 测试 15: Iso97971 - 空字符串 (边界情况)
//
try {
  const plaintext = "";
  
  const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso97971
  });
  
  const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Iso97971
  });
  
  const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
  const passed = decryptedText === plaintext;
  
  addResult(
    '测试 15: Iso97971 空字符串',
    passed,
    passed ? `空字符串处理成功` : `空字符串解密失败`
  );
} catch (error) {
  addResult('测试 15: Iso97971 空字符串', false, `异常: ${error.message}`);
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
  note: '测试 crypto-js 模块的填充模式 (ZeroPadding, AnsiX923, Iso10126, Iso97971)'
};






