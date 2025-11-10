const CryptoJS = require('crypto-js');

if (!input.text || !input.password || !input.iv) {
  return { error: "缺少必要参数 text / password / iv" };
}

// 解析密钥和 IV（支持多种格式）
function parseKey(keyString, encoding) {
  encoding = encoding || 'utf8';
  
  if (encoding === 'hex') {
    return CryptoJS.enc.Hex.parse(keyString);
  } else if (encoding === 'base64') {
    return CryptoJS.enc.Base64.parse(keyString);
  } else {
    // 默认 UTF-8
    return CryptoJS.enc.Utf8.parse(keyString);
  }
}

// AES 加密
function aesEncode(text, password, ivString, options) {
  try {
    options = options || {};
    const keyEncoding = options.keyEncoding || 'utf8';
    const ivEncoding = options.ivEncoding || 'utf8';
    const outputFormat = options.outputFormat || 'hex';
    
    // 解析密钥和 IV
    const key = parseKey(password, keyEncoding);
    const iv = parseKey(ivString, ivEncoding);
    
    // 加密
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // 根据输出格式返回
    if (outputFormat === 'base64') {
      return encrypted.toString(); // Base64 格式
    } else {
      return encrypted.ciphertext.toString(CryptoJS.enc.Hex); // 十六进制
    }
  } catch (err) {
    return { error: "加密失败: " + err.message };
  }
}

// AES 解密
function aesDecode(encodeText, password, ivString, options) {
  try {
    options = options || {};
    const keyEncoding = options.keyEncoding || 'utf8';
    const ivEncoding = options.ivEncoding || 'utf8';
    const inputFormat = options.inputFormat || 'hex';
    
    // 解析密钥和 IV
    const key = parseKey(password, keyEncoding);
    const iv = parseKey(ivString, ivEncoding);
    
    // 根据输入格式创建 CipherParams
    let cipherParams;
    if (inputFormat === 'base64') {
      // Base64 格式可以直接使用
      cipherParams = encodeText;
    } else {
      // 十六进制格式需要转换
      cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Hex.parse(encodeText)
      });
    }
    
    // 解密
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
    // 获取选项（如果提供）
    const options = {
      keyEncoding: input.keyEncoding || 'utf8',    // 'utf8', 'hex', 'base64'
      ivEncoding: input.ivEncoding || 'utf8',      // 'utf8', 'hex', 'base64'
      outputFormat: input.outputFormat || 'hex',   // 'hex', 'base64'
      inputFormat: input.inputFormat || 'hex'      // 'hex', 'base64'
    };
    
    // 加密
    const encodeText = aesEncode(input.text, input.password, input.iv, options);
    
    if (encodeText.error) {
      return { success: false, error: encodeText.error };
    }
    
    // 解密（验证）
    const decodeText = aesDecode(encodeText, input.password, input.iv, options);
    
    if (decodeText.error) {
      return { success: false, error: decodeText.error };
    }
    
    return {
      success: true,
      "原始文本": input.text,
      "加密后内容": encodeText,
      "解密后内容": decodeText,
      "验证": decodeText === input.text,
      "密钥编码": options.keyEncoding,
      "输出格式": options.outputFormat
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

return main();



