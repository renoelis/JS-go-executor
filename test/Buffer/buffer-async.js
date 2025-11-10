// 异步Buffer操作函数
function writeIntAsync(buffer, value, offset, method) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                buffer[method](value, offset);
                resolve({ method, value, offset, success: true });
            } catch (error) {
                reject(new Error(`writeIntAsync failed: ${error.message}`));
            }
        }, 10);
    });
}

function readIntAsync(buffer, offset, method) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const value = buffer[method](offset);
                resolve({ method, value, offset });
            } catch (error) {
                reject(new Error(`readIntAsync failed: ${error.message}`));
            }
        }, 10);
    });
}

function writeFloatAsync(buffer, value, offset, method) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                buffer[method](value, offset);
                resolve({ method, value, offset, success: true });
            } catch (error) {
                reject(new Error(`writeFloatAsync failed: ${error.message}`));
            }
        }, 15);
    });
}

function readFloatAsync(buffer, offset, method) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const value = buffer[method](offset);
                resolve({ method, value, offset });
            } catch (error) {
                reject(new Error(`readFloatAsync failed: ${error.message}`));
            }
        }, 15);
    });
}

function bufferSearchAsync(buffer, searchValue) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const indexOf = buffer.indexOf(searchValue);
                const lastIndexOf = typeof searchValue === 'string' 
                    ? buffer.lastIndexOf(searchValue.charCodeAt(searchValue.length - 1))
                    : buffer.lastIndexOf(searchValue);
                resolve({ 
                    searchValue, 
                    indexOf, 
                    lastIndexOf,
                    found: indexOf !== -1 
                });
            } catch (error) {
                reject(new Error(`bufferSearchAsync failed: ${error.message}`));
            }
        }, 20);
    });
}

function bufferSwapAsync(buffer, method) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const originalHex = buffer.toString('hex');
                buffer[method]();
                const swappedHex = buffer.toString('hex');
                resolve({ 
                    method, 
                    original: originalHex, 
                    swapped: swappedHex 
                });
            } catch (error) {
                reject(new Error(`bufferSwapAsync failed: ${error.message}`));
            }
        }, 25);
    });
}

function bufferEncodeAsync(text, encoding) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const buffer = Buffer.from(text, encoding);
                const decoded = buffer.toString(encoding);
                resolve({ 
                    encoding, 
                    original: text, 
                    buffer: buffer.toString('hex'),
                    decoded 
                });
            } catch (error) {
                reject(new Error(`bufferEncodeAsync failed: ${error.message}`));
            }
        }, 30);
    });
}

// 主异步流程
return Promise.resolve()
    .then(() => {
        // 1. 创建Buffer并进行异步整数读写操作
        const buf1 = Buffer.alloc(6);
        
        return Promise.all([
            writeIntAsync(buf1, 12345, 0, 'writeInt16BE'),
            writeIntAsync(buf1, 67890, 2, 'writeInt32LE')
        ]).then(() => {
            // 写入完成后进行读取
            return Promise.all([
                readIntAsync(buf1, 0, 'readInt16BE'),
                readIntAsync(buf1, 2, 'readInt32LE'),
                Promise.resolve(buf1) // 保留buffer引用
            ]);
        });
    })
    .then(([int16Result, int32Result, buf1]) => {
        // 2. 异步浮点数操作
        const bufFloat = Buffer.alloc(4);
        const bufDouble = Buffer.alloc(8);
        
        return Promise.all([
            Promise.resolve({ intResults: { int16Result, int32Result }, buf1 }),
            writeFloatAsync(bufFloat, 3.14, 0, 'writeFloatBE').then(() => 
                readFloatAsync(bufFloat, 0, 'readFloatBE')
            ),
            writeFloatAsync(bufDouble, 2.71828, 0, 'writeDoubleLE').then(() => 
                readFloatAsync(bufDouble, 0, 'readDoubleLE')
            )
        ]);
    })
    .then(([previousResults, floatResult, doubleResult]) => {
        // 3. 异步字符串搜索操作
        const buf3 = Buffer.from("hello world");
        
        return Promise.all([
            Promise.resolve({ 
                intResults: previousResults.intResults, 
                buf1: previousResults.buf1,
                floatResult: floatResult, 
                doubleResult: doubleResult 
            }),
            bufferSearchAsync(buf3, "hello"),
            bufferSearchAsync(buf3, "o")
        ]);
    })
    .then(([previousResults, helloSearch, oSearch]) => {
        // 4. 异步字节交换操作
        const buf4 = Buffer.from([0x11, 0x22, 0x33, 0x44]);
        const buf4Copy = Buffer.from(buf4); // 创建副本用于第二次交换
        
        return Promise.all([
            Promise.resolve({ 
                intResults: previousResults.intResults, 
                buf1: previousResults.buf1,
                floatResult: previousResults.floatResult, 
                doubleResult: previousResults.doubleResult,
                searchResults: { helloSearch: helloSearch, oSearch: oSearch } 
            }),
            bufferSwapAsync(buf4, 'swap16'),
            bufferSwapAsync(buf4Copy, 'swap16').then(() => 
                bufferSwapAsync(buf4Copy, 'swap32')
            )
        ]);
    })
    .then(([previousResults, swap16Result, swap32Result]) => {
        // 5. 异步编码测试
        return Promise.all([
            Promise.resolve({ 
                intResults: previousResults.intResults, 
                buf1: previousResults.buf1,
                floatResult: previousResults.floatResult, 
                doubleResult: previousResults.doubleResult,
                searchResults: previousResults.searchResults,
                swapResults: { swap16Result: swap16Result, swap32Result: swap32Result } 
            }),
            bufferEncodeAsync("ñ", "latin1"),
            bufferEncodeAsync("abc", "ascii"),
            bufferEncodeAsync("hello", "utf8"),
            // 🔥 修复: 使用有效的 base64 字符串来测试解码
            // "SGVsbG8gV29ybGQ=" 解码后是 "Hello World"
            bufferEncodeAsync("SGVsbG8gV29ybGQ=", "base64")
        ]);
    })
    .then(([previousResults, latin1Result, asciiResult, utf8Result, base64Result]) => {
        // 6. 组装最终结果
        return {
            success: true,
            executionMode: 'EventLoop异步模式',
            timestamp: new Date().toISOString(),
            data: {
                // 整数读写结果
                integers: {
                    int16BE: previousResults.intResults.int16Result.value,
                    int32LE: previousResults.intResults.int32Result.value,
                    bufferHex: previousResults.buf1.toString('hex')
                },
                
                // 浮点数结果
                floats: {
                    floatBE: parseFloat(previousResults.floatResult.value.toFixed(2)),
                    doubleLE: parseFloat(previousResults.doubleResult.value.toFixed(5))
                },
                
                // 搜索结果
                search: {
                    includesHello: previousResults.searchResults.helloSearch.found,
                    helloIndex: previousResults.searchResults.helloSearch.indexOf,
                    lastIndexOfO: previousResults.searchResults.oSearch.lastIndexOf
                },
                
                // 字节交换结果
                swap: {
                    original: "11223344",
                    swap16: previousResults.swapResults.swap16Result.swapped,
                    swap32: previousResults.swapResults.swap32Result.swapped
                },
                
                // 编码结果
                encoding: {
                    latin1: {
                        original: latin1Result.original,
                        decoded: latin1Result.decoded,
                        hex: latin1Result.buffer
                    },
                    ascii: {
                        original: asciiResult.original,
                        decoded: asciiResult.decoded,
                        hex: asciiResult.buffer
                    },
                    utf8: {
                        original: utf8Result.original,
                        decoded: utf8Result.decoded,
                        hex: utf8Result.buffer
                    },
                    base64: {
                        original: base64Result.original,
                        decoded: base64Result.decoded,
                        hex: base64Result.buffer,
                        note: 'base64 原文是编码后的字符串,decoded 是解码结果'
                    }
                }
            },
            features: ['Promise', 'Promise.all', 'setTimeout', '并行处理', '链式调用'],
            summary: {
                totalOperations: 15, // 2整数+2浮点+2搜索+2交换+4编码+3辅助
                executionSteps: 6,
                asyncFeatures: '所有Buffer操作都通过Promise异步执行',
                bufferFeatures: ['整数读写', '浮点数读写', '字符串搜索', '字节交换', '多种编码']
            }
        };
    })
    .catch((error) => {
        return {
            success: false,
            error: error.message,
            executionMode: 'EventLoop异步模式',
            timestamp: new Date().toISOString(),
            note: 'Buffer异步操作失败'
        };
    });
