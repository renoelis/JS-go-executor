const CryptoJS = require('crypto-js');

// 异步哈希函数
function hashAsync(data, algorithm) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let result;
            switch(algorithm) {
                case 'MD5': result = CryptoJS.MD5(data).toString(); break;
                case 'SHA1': result = CryptoJS.SHA1(data).toString(); break;
                case 'SHA224': result = CryptoJS.SHA224(data).toString(); break;
                case 'SHA256': result = CryptoJS.SHA256(data).toString(); break;
                case 'SHA384': result = CryptoJS.SHA384(data).toString(); break;
                case 'SHA512': result = CryptoJS.SHA512(data).toString(); break;
                case 'SHA3': result = CryptoJS.SHA3(data).toString(); break;
                case 'RIPEMD160': result = CryptoJS.RIPEMD160(data).toString(); break;
                default: result = CryptoJS.SHA256(data).toString();
            }
            resolve({ algorithm, hash: result });
        }, 10);
    });
}

// 异步HMAC函数
function hmacAsync(data, key, algorithm) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let result;
            switch(algorithm) {
                case 'SHA256': result = CryptoJS.HmacSHA256(data, key).toString(); break;
                case 'SHA1': result = CryptoJS.HmacSHA1(data, key).toString(); break;
                case 'MD5': result = CryptoJS.HmacMD5(data, key).toString(); break;
                case 'SHA224': result = CryptoJS.HmacSHA224(data, key).toString(); break;
                case 'SHA384': result = CryptoJS.HmacSHA384(data, key).toString(); break;
                case 'SHA512': result = CryptoJS.HmacSHA512(data, key).toString(); break;
                case 'SHA3': result = CryptoJS.HmacSHA3(data, key).toString(); break;
                case 'RIPEMD160': result = CryptoJS.HmacRIPEMD160(data, key).toString(); break;
                default: result = CryptoJS.HmacSHA256(data, key).toString();
            }
            resolve({ algorithm: `HMAC-${algorithm}`, hash: result });
        }, 15);
    });
}

// 异步加密函数
function encryptAsync(plaintext, key, algorithm, options = {}) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let encrypted;
            switch(algorithm) {
                case 'AES':
                    encrypted = CryptoJS.AES.encrypt(plaintext, key, options);
                    break;
                case '3DES':
                    encrypted = CryptoJS.TripleDES.encrypt(plaintext, key, options);
                    break;
                case 'RC4':
                    encrypted = CryptoJS.RC4.encrypt(plaintext, key);
                    break;
                case 'Rabbit':
                    encrypted = CryptoJS.Rabbit.encrypt(plaintext, key);
                    break;
                case 'RabbitLegacy':
                    encrypted = CryptoJS.RabbitLegacy.encrypt(plaintext, key);
                    break;
                default:
                    encrypted = CryptoJS.AES.encrypt(plaintext, key, options);
            }
            resolve({
                algorithm,
                ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Hex),
                encrypted: encrypted
            });
        }, 20);
    });
}

// 异步解密函数
function decryptAsync(encrypted, key, algorithm, options = {}) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let decrypted;
            switch(algorithm) {
                case 'AES':
                    decrypted = CryptoJS.AES.decrypt(encrypted, key, options);
                    break;
                case '3DES':
                    decrypted = CryptoJS.TripleDES.decrypt(encrypted, key, options);
                    break;
                case 'RC4':
                    decrypted = CryptoJS.RC4.decrypt(encrypted, key);
                    break;
                case 'Rabbit':
                    decrypted = CryptoJS.Rabbit.decrypt(encrypted, key);
                    break;
                case 'RabbitLegacy':
                    decrypted = CryptoJS.RabbitLegacy.decrypt(encrypted, key);
                    break;
                default:
                    decrypted = CryptoJS.AES.decrypt(encrypted, key, options);
            }
            resolve({
                algorithm,
                plaintext: decrypted.toString(CryptoJS.enc.Utf8)
            });
        }, 20);
    });
}

// 主异步流程
return Promise.resolve()
    .then(() => {
        // 1. 并行执行所有哈希算法
        const hashAlgorithms = ['MD5', 'SHA1', 'SHA224', 'SHA256', 'SHA384', 'SHA512', 'SHA3', 'RIPEMD160'];
        return Promise.all(hashAlgorithms.map(alg => hashAsync('abc', alg)));
    })
    .then((hashResults) => {
        // 2. 并行执行所有HMAC算法
        const hmacAlgorithms = ['SHA256', 'SHA1', 'MD5', 'SHA224', 'SHA384', 'SHA512', 'SHA3', 'RIPEMD160'];
        return Promise.all([
            Promise.resolve(hashResults),
            Promise.all(hmacAlgorithms.map(alg => hmacAsync('abc', 'key', alg)))
        ]);
    })
    .then(([hashResults, hmacResults]) => {
        // 3. KDF操作
        const kdfResults = {
            PBKDF2: CryptoJS.PBKDF2("password", "salt", {keySize: 4, iterations: 1}).toString(),
            EVPKDF: CryptoJS.EvpKDF("password", "salt", {keySize: 4, iterations: 1}).toString()
        };
        
        // 4. 准备加密参数
        const key = CryptoJS.enc.Hex.parse("000102030405060708090a0b0c0d0e0f");
        const iv = CryptoJS.enc.Hex.parse("0f0e0d0c0b0a09080706050403020100");
        const plaintext = "hello world";
        
        // 5. 并行执行所有加密算法
        return Promise.all([
            Promise.resolve({ hashResults, hmacResults, kdfResults }),
            encryptAsync(plaintext, key, 'AES', { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }),
            encryptAsync("12345678ABCDEFGH", CryptoJS.enc.Hex.parse("0123456789abcdef0123456789abcdef0123456789abcdef"), '3DES', { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }),
            encryptAsync("plainrc4", "key", 'RC4'),
            encryptAsync("plainrabbit", "key", 'Rabbit'),
            encryptAsync("plainrabbit", "key", 'RabbitLegacy')
        ]);
    })
    .then(([previousResults, aesEnc, desEnc, rc4Enc, rabbitEnc, rabbitLegacyEnc]) => {
        // 6. 并行执行所有解密操作
        const key = CryptoJS.enc.Hex.parse("000102030405060708090a0b0c0d0e0f");
        const iv = CryptoJS.enc.Hex.parse("0f0e0d0c0b0a09080706050403020100");
        const desKey = CryptoJS.enc.Hex.parse("0123456789abcdef0123456789abcdef0123456789abcdef");
        
        return Promise.all([
            Promise.resolve(previousResults),
            Promise.resolve({ aesEnc, desEnc, rc4Enc, rabbitEnc, rabbitLegacyEnc }),
            decryptAsync(aesEnc.encrypted, key, 'AES', { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }),
            decryptAsync(desEnc.encrypted, desKey, '3DES', { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.NoPadding }),
            decryptAsync(rc4Enc.encrypted, "key", 'RC4'),
            decryptAsync(rabbitEnc.encrypted, "key", 'Rabbit'),
            decryptAsync(rabbitLegacyEnc.encrypted, "key", 'RabbitLegacy')
        ]);
    })
    .then(([previousResults, encResults, aesDec, desDec, rc4Dec, rabbitDec, rabbitLegacyDec]) => {
        // 7. 编码格式操作
        const wordArray = CryptoJS.enc.Utf8.parse("hello");
        const encodingResults = {
            "UTF8->Hex": wordArray.toString(CryptoJS.enc.Hex),
            "Hex->UTF8": CryptoJS.enc.Hex.parse("68656c6c6f").toString(CryptoJS.enc.Utf8),
            "Base64('hello')": CryptoJS.enc.Base64.stringify(wordArray),
            "Latin1('A')": CryptoJS.enc.Latin1.parse("A").toString(),
            "UTF16 roundtrip": CryptoJS.enc.Utf16.parse("hi").toString(CryptoJS.enc.Utf16),
            "FormatHex": CryptoJS.format.Hex.stringify({ ciphertext: wordArray }),
            "FormatOpenSSL": CryptoJS.format.OpenSSL.stringify({ ciphertext: wordArray, salt: CryptoJS.enc.Hex.parse("12345678") })
        };
        
        // 8. 组装最终结果
        return {
            success: true,
            executionMode: 'EventLoop异步模式',
            timestamp: new Date().toISOString(),
            data: {
                // 哈希结果
                hashes: previousResults.hashResults.reduce((acc, item) => {
                    acc[`${item.algorithm}('abc')`] = item.hash;
                    return acc;
                }, {}),
                
                // HMAC结果
                hmacs: previousResults.hmacResults.reduce((acc, item) => {
                    acc[item.algorithm] = item.hash;
                    return acc;
                }, {}),
                
                // KDF结果
                kdf: previousResults.kdfResults,
                
                // 加密结果
                encryption: {
                    "AES-CBC-PKCS7 encrypt": encResults.aesEnc.ciphertext,
                    "AES-CBC-PKCS7 decrypt": aesDec.plaintext,
                    "3DES-ECB-NoPadding encrypt": encResults.desEnc.ciphertext,
                    "3DES-ECB-NoPadding decrypt": desDec.plaintext,
                    "RC4 encrypt": encResults.rc4Enc.ciphertext,
                    "RC4 decrypt": rc4Dec.plaintext,
                    "Rabbit encrypt": encResults.rabbitEnc.ciphertext,
                    "Rabbit decrypt": rabbitDec.plaintext,
                    "RabbitLegacy encrypt": encResults.rabbitLegacyEnc.ciphertext,
                    "RabbitLegacy decrypt": rabbitLegacyDec.plaintext
                },
                
                // 编码结果
                encoding: encodingResults
            },
            features: ['Promise', 'Promise.all', 'setTimeout', '并行处理', '链式调用'],
            summary: {
                totalOperations: 35, // 8哈希+8HMAC+2KDF+10加解密+7编码
                executionSteps: 7,
                asyncFeatures: '所有加密操作都通过Promise异步执行'
            }
        };
    })
    .catch((error) => {
        return {
            success: false,
            error: error.message,
            executionMode: 'EventLoop异步模式',
            timestamp: new Date().toISOString()
        };
    });
