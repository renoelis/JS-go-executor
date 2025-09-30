const crypto = require('crypto');      // ✅ 使用混合crypto模块
const CryptoJS = crypto.CryptoJS;

try {
  let results = {};

  //
  // 1. 哈希函数
  //
  results["MD5('abc')"]      = CryptoJS.MD5("abc").toString();
  results["SHA1('abc')"]     = CryptoJS.SHA1("abc").toString();
  results["SHA224('abc')"]   = CryptoJS.SHA224("abc").toString();
  results["SHA256('abc')"]   = CryptoJS.SHA256("abc").toString();
  results["SHA384('abc')"]   = CryptoJS.SHA384("abc").toString();
  results["SHA512('abc')"]   = CryptoJS.SHA512("abc").toString();
  results["SHA3('abc')"]     = CryptoJS.SHA3("abc").toString();
  results["RIPEMD160('abc')"]= CryptoJS.RIPEMD160("abc").toString();
  //
  // 2. HMAC
  //
  results["HMAC-SHA256"]   = CryptoJS.HmacSHA256("abc","key").toString();
  results["HMAC-SHA1"]     = CryptoJS.HmacSHA1("abc","key").toString();
  results["HMAC-MD5"]      = CryptoJS.HmacMD5("abc","key").toString();
  results["HMAC-SHA224"]   = CryptoJS.HmacSHA224("abc","key").toString();
  results["HMAC-SHA384"]   = CryptoJS.HmacSHA384("abc","key").toString();
  results["HMAC-SHA512"]   = CryptoJS.HmacSHA512("abc","key").toString();
  results["HMAC-SHA3"]     = CryptoJS.HmacSHA3("abc","key").toString();
  results["HMAC-RIPEMD160"]= CryptoJS.HmacRIPEMD160("abc","key").toString();

  //
  // 3. KDF
  //
  results["PBKDF2"] = CryptoJS.PBKDF2("password","salt",{keySize:4,iterations:1}).toString();
  results["EVPKDF"] = CryptoJS.EvpKDF("password","salt",{keySize:4,iterations:1}).toString();

  //
  // 4. 对称加密算法 + 模式 + 填充
  //
  let key = CryptoJS.enc.Hex.parse("000102030405060708090a0b0c0d0e0f");
  let iv  = CryptoJS.enc.Hex.parse("0f0e0d0c0b0a09080706050403020100");
  let plaintext = "hello world";

  // AES-CBC + PKCS7
  let aesCbcEnc = CryptoJS.AES.encrypt(plaintext, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  results["AES-CBC-PKCS7 encrypt"] = aesCbcEnc.ciphertext.toString(CryptoJS.enc.Hex);
  results["AES-CBC-PKCS7 decrypt"] = CryptoJS.AES.decrypt(aesCbcEnc, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }).toString(CryptoJS.enc.Utf8);

  // 3DES-ECB + NoPadding (需补齐长度)
  let text3des = "12345678ABCDEFGH"; // 16字节
  let desKey = CryptoJS.enc.Hex.parse("0123456789abcdef0123456789abcdef0123456789abcdef");
  let desEnc = CryptoJS.TripleDES.encrypt(text3des, desKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding });
  results["3DES-ECB-NoPadding encrypt"] = desEnc.ciphertext.toString(CryptoJS.enc.Hex);
  results["3DES-ECB-NoPadding decrypt"] = CryptoJS.TripleDES.decrypt(desEnc, desKey, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }).toString(CryptoJS.enc.Utf8);

  // RC4
  let rc4Enc = CryptoJS.RC4.encrypt("plainrc4", "key");
  results["RC4 encrypt"] = rc4Enc.ciphertext.toString(CryptoJS.enc.Hex);
  results["RC4 decrypt"] = CryptoJS.RC4.decrypt(rc4Enc,"key").toString(CryptoJS.enc.Utf8);

  // Rabbit
  let rabbitEnc = CryptoJS.Rabbit.encrypt("plainrabbit", "key");
  results["Rabbit encrypt"] = rabbitEnc.ciphertext.toString(CryptoJS.enc.Hex);
  results["Rabbit decrypt"] = CryptoJS.Rabbit.decrypt(rabbitEnc,"key").toString(CryptoJS.enc.Utf8);

  // Rabbit-legacy
  let rabbitLegacyEnc = CryptoJS.RabbitLegacy.encrypt("plainrabbit", "key");
  results["RabbitLegacy encrypt"] = rabbitLegacyEnc.ciphertext.toString(CryptoJS.enc.Hex);
  results["RabbitLegacy decrypt"] = CryptoJS.RabbitLegacy.decrypt(rabbitLegacyEnc,"key").toString(CryptoJS.enc.Utf8);

  //
  // 5. 编码/格式
  //
  let wordArray = CryptoJS.enc.Utf8.parse("hello");
  results["UTF8->Hex"]   = wordArray.toString(CryptoJS.enc.Hex);
  results["Hex->UTF8"]   = CryptoJS.enc.Hex.parse("68656c6c6f").toString(CryptoJS.enc.Utf8);
  results["Base64('hello')"] = CryptoJS.enc.Base64.stringify(wordArray);
  results["Latin1('A')"] = CryptoJS.enc.Latin1.parse("A").toString();
  results["UTF16 roundtrip"] = CryptoJS.enc.Utf16.parse("hi").toString(CryptoJS.enc.Utf16);

  results["FormatHex"] = CryptoJS.format.Hex.stringify({ ciphertext: wordArray });
  results["FormatOpenSSL"] = CryptoJS.format.OpenSSL.stringify({ ciphertext: wordArray, salt: CryptoJS.enc.Hex.parse("12345678") });

  //
  // 返回结果
  //
  return {
    success: true,
    data: results
  };

} catch (err) {
  return { error: err.message };
}