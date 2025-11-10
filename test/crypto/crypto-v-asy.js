//
// ================================================================
// 异步代码执行示例 (使用EventLoop)
// ================================================================
//
// 说明：当代码包含Promise、setTimeout等异步特征时，
// go-executor会自动使用EventLoop而不是Runtime池来执行
//
// 检测关键字：Promise、.then()、setTimeout、setInterval等
//

// 异步加密函数

const CryptoJS = require('crypto-js');

let results = {};

function encryptAsync(data, password) {
    return new Promise((resolve, reject) => {
        try {
            if (!data || !password) {
                reject(new Error('数据或密码不能为空'));
                return;
            }
            const encrypted = CryptoJS.AES.encrypt(data, password).toString();
            resolve(encrypted);
        } catch (error) {
            reject(new Error('加密失败: ' + error.message));
        }
    });
}

// 异步解密函数  
function decryptAsync(encrypted, password) {
    return new Promise((resolve, reject) => {
        try {
            const decrypted = CryptoJS.AES.decrypt(encrypted, password).toString(CryptoJS.enc.Utf8);
            if (!decrypted) {
                reject(new Error('解密失败，可能是密码错误'));
                return;
            }
            resolve(decrypted);
        } catch (error) {
            reject(new Error('解密失败: ' + error.message));
        }
    });
}

// 批量哈希计算
function batchHashAsync(data, algorithms) {
    const hashPromises = algorithms.map(alg => {
        return new Promise((resolve) => {
            let result;
            switch(alg) {
                case 'MD5': result = CryptoJS.MD5(data).toString(); break;
                case 'SHA1': result = CryptoJS.SHA1(data).toString(); break; 
                case 'SHA256': result = CryptoJS.SHA256(data).toString(); break;
                case 'SHA512': result = CryptoJS.SHA512(data).toString(); break;
                default: result = CryptoJS.SHA256(data).toString();
            }
            resolve({ algorithm: alg, hash: result });
        });
    });
    return Promise.all(hashPromises);
}

// 延迟处理函数
function delayedProcess(data, delay) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const processed = CryptoJS.SHA256(data + '_processed').toString();
            resolve(processed);
        }, delay);
    });
}

// 主异步流程
const testData = 'Complete Async Test Data';
const password = 'secure-password-123';
const algorithms = ['MD5', 'SHA1', 'SHA256', 'SHA512'];

// 执行完整的异步流程并返回结果
// 注意：异步代码只能有一个返回点，要么同步return，要么异步Promise
return encryptAsync(testData, password)
    .then((encrypted) => {
        // 并行执行：解密 + 批量哈希 + 延迟处理
        return Promise.all([
            decryptAsync(encrypted, password),
            batchHashAsync(testData, algorithms),
            delayedProcess(testData, 50),
            Promise.resolve(encrypted) // 保留加密结果
        ]);
    })
    .then(([decrypted, hashResults, delayed, encrypted]) => {
        // 链式HMAC计算
        return Promise.resolve(testData)
            .then(data => CryptoJS.HmacSHA256(data, 'key1').toString())
            .then(hash1 => CryptoJS.HmacSHA512(hash1, 'key2').toString())
            .then(finalHash => {
                return {
                    success: true,
                    message: '完整异步流程执行成功',
                    executionMode: 'EventLoop',
                    syncResults: results, // 包含同步结果
                    asyncData: {
                        originalData: testData,
                        encrypted: encrypted.substring(0, 50) + '...',
                        decrypted: decrypted,
                        dataIntegrity: testData === decrypted,
                        batchHashes: hashResults.map(({ algorithm, hash }) => ({
                            algorithm,
                            hash: hash.substring(0, 32) + '...'
                        })),
                        delayedProcessed: delayed.substring(0, 32) + '...',
                        hmacChain: finalHash.substring(0, 32) + '...'
                    },
                    features: ['Promise', 'Promise.all', 'setTimeout', '链式调用', '错误处理'],
                    timestamp: new Date().toISOString(),
                    note: 'EventLoop自动检测并执行异步代码'
                };
            });
    })
    .catch((error) => {
        return {
            success: false,
            error: error.message,
            executionMode: 'EventLoop',
            syncResults: results, // 即使出错也返回同步结果
            timestamp: new Date().toISOString()
        };
    });