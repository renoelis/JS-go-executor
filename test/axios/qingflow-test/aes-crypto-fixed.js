const CryptoJS = require('crypto-js');

if (!input.text || !input.password || !input.iv) {
  return { error: "缺少必要参数 text / password / iv" };
}

function aesEncode(text, password, ivString) {
  try {
    // 将密钥和 IV 转换为 WordArray
    // 假设 password 和 iv 是十六进制字符串或 UTF-8 字符串
    const key = CryptoJS.enc.Utf8.parse(password);
    const iv = CryptoJS.enc.Utf8.parse(ivString);
    
    // 使用 AES-128-CBC 加密
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // 返回十六进制字符串
    return encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  } catch (err) {
    return { error: "加密失败: " + err.message };
  }
}

function aesDecode(encodeText, password, ivString) {
  try {
    // 将密钥和 IV 转换为 WordArray
    const key = CryptoJS.enc.Utf8.parse(password);
    const iv = CryptoJS.enc.Utf8.parse(ivString);
    
    // 将十六进制字符串转换为 CipherParams
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(encodeText)
    });
    
    // 使用 AES-128-CBC 解密
    const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // 转换为 UTF-8 字符串
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    return { error: "解密失败: " + err.message };
  }
}

// 主函数
function main() {
  try {
    // 加密
    const encodeText = aesEncode(input.text, input.password, input.iv);
    
    if (encodeText.error) {
      return { success: false, error: encodeText.error };
    }
    
    // 解密
    const decodeText = aesDecode(encodeText, input.password, input.iv);
    
    if (decodeText.error) {
      return { success: false, error: decodeText.error };
    }
    
    return {
      success: true,
      "加密后内容": encodeText,
      "解密后内容": decodeText
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

return main();



