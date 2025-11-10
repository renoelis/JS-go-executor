const crypto = require('crypto');

console.log('=== 测试 8.5: DER key 输入 ===\n');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

// 导出公钥 DER（直接从 KeyObject 导出）
const derPub = publicKey.export({ type: 'spki', format: 'der' });
console.log('derPub 类型:', typeof derPub);
console.log('derPub 是 Buffer:', Buffer.isBuffer(derPub));
console.log('derPub 长度:', derPub.length);

const msg = Buffer.from('DER key input');

try {
  console.log('\n测试 1: 直接使用 Buffer 作为 DER key');
  const enc1 = crypto.publicEncrypt({ 
    key: derPub, 
    format: 'der', 
    type: 'spki', 
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING 
  }, msg);
  console.log('✓ 加密成功');
  
  const dec1 = crypto.privateDecrypt({ 
    key: privateKey, 
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING 
  }, enc1);
  console.log('✓ 解密成功:', dec1.toString());
  
  if (dec1.toString() !== 'DER key input') {
    throw new Error('解密结果不匹配');
  }
} catch (e) {
  console.log('✗ 测试 1 失败:', e.message);
  console.log('Stack:', e.stack);
}

try {
  console.log('\n测试 2: 使用 Uint8Array 作为 DER key');
  // 从 Buffer 创建 Uint8Array
  const u8 = new Uint8Array(derPub.length);
  for (let i = 0; i < derPub.length; i++) {
    u8[i] = derPub[i];
  }
  
  const enc2 = crypto.publicEncrypt({ 
    key: u8, 
    format: 'der', 
    type: 'spki', 
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING 
  }, msg);
  console.log('✓ 加密成功');
  
  const dec2 = crypto.privateDecrypt({ 
    key: privateKey, 
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING 
  }, enc2);
  console.log('✓ 解密成功:', dec2.toString());
  
  if (dec2.toString() !== 'DER key input') {
    throw new Error('解密结果不匹配');
  }
} catch (e) {
  console.log('✗ 测试 2 失败:', e.message);
  console.log('Stack:', e.stack);
}

console.log('\n✅ 所有测试通过！');
return { success: true };
