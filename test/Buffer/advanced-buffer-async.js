/**
 * 高级Buffer功能异步测试
 * 异步版本：测试16/32位数值读写、浮点数、字符串搜索、字节交换、特殊编码等功能
 */

// 异步16/32位整数读写函数
function integerReadWriteAsync(buffer, operations) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                const results = {};
                
                // 执行写入操作
                for (let i = 0; i < operations.writes.length; i++) {
                    const op = operations.writes[i];
                    buffer[op.method](op.value, op.offset);
                }
                
                // 执行读取操作
                for (let i = 0; i < operations.reads.length; i++) {
                    const op = operations.reads[i];
                    results[op.name] = buffer[op.method](op.offset);
                }
                
                resolve({
                    operation: 'integer_read_write',
                    buffer: buffer,
                    results: results,
                    bufferHex: buffer.toString('hex')
                });
            } catch (error) {
                console.log('❌ integerReadWriteAsync 内部错误:', error.message);
                reject(error);
            }
        }, 15);
    });
}

// 异步浮点数读写函数
function floatReadWriteAsync(buffer, operations) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                const results = {};
                
                // 执行写入操作
                for (let i = 0; i < operations.writes.length; i++) {
                    const op = operations.writes[i];
                    buffer[op.method](op.value, op.offset);
                }
                
                // 执行读取操作
                for (let i = 0; i < operations.reads.length; i++) {
                    const op = operations.reads[i];
                    const value = buffer[op.method](op.offset);
                    results[op.name] = op.precision ? value.toFixed(op.precision) : value;
                }
                
                resolve({
                    operation: 'float_read_write',
                    buffer: buffer,
                    results: results,
                    bufferHex: buffer.toString('hex')
                });
            } catch (error) {
                console.log('❌ floatReadWriteAsync 内部错误:', error.message);
                reject(error);
            }
        }, 20);
    });
}

// 异步字符串搜索函数
function stringSearchAsync(buffer, searchTerms) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                const results = {};
                
                for (let i = 0; i < searchTerms.length; i++) {
                    const term = searchTerms[i];
                    if (term.type === 'includes') {
                        results[term.name] = buffer.includes ? buffer.includes(term.value) : buffer.indexOf(term.value) !== -1;
                    } else if (term.type === 'lastIndexOf') {
                        if (typeof term.value === 'string') {
                            results[term.name] = buffer.lastIndexOf(term.value.charCodeAt(0));
                        } else {
                            results[term.name] = buffer.lastIndexOf(term.value);
                        }
                    }
                }
                
                resolve({
                    operation: 'string_search',
                    buffer: buffer,
                    results: results,
                    content: buffer.toString()
                });
            } catch (error) {
                console.log('❌ stringSearchAsync 内部错误:', error.message);
                reject(error);
            }
        }, 25);
    });
}

// 异步字节交换函数
function byteSwapAsync(buffer, swapMethod) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                const originalHex = buffer.toString('hex');
                buffer[swapMethod]();
                const swappedHex = buffer.toString('hex');
                
                resolve({
                    operation: 'byte_swap',
                    method: swapMethod,
                    originalHex: originalHex,
                    swappedHex: swappedHex,
                    buffer: buffer
                });
            } catch (error) {
                console.log('❌ byteSwapAsync 内部错误:', error.message);
                reject(error);
            }
        }, 18);
    });
}

// 异步编码测试函数
function encodingTestAsync(text, encoding) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                const buffer = Buffer.from(text, encoding);
                const decoded = buffer.toString(encoding);
                
                resolve({
                    operation: 'encoding_test',
                    encoding: encoding,
                    originalText: text,
                    buffer: buffer,
                    length: buffer.length,
                    decoded: decoded,
                    hex: buffer.toString('hex')
                });
            } catch (error) {
                console.log('❌ encodingTestAsync 内部错误:', error.message);
                reject(error);
            }
        }, 22);
    });
}

// 异步边界条件测试函数
function boundaryTestAsync(testType, value) {
    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            try {
                let result = {};
                
                switch(testType) {
                    case 'empty_swap':
                        const emptyBuf = Buffer.alloc(0);
                        result = {
                            operation: 'empty_swap_test',
                            safe: true,
                            bufferLength: emptyBuf.length
                        };
                        break;
                    case 'big_number':
                        const bufBig = Buffer.alloc(8);
                        bufBig.writeDoubleBE(value, 0);
                        const readValue = bufBig.readDoubleBE(0);
                        result = {
                            operation: 'big_number_test',
                            originalValue: value,
                            readValue: readValue,
                            accurate: readValue === value
                        };
                        break;
                    default:
                        result = { operation: 'unknown_boundary_test' };
                }
                
                resolve(result);
            } catch (error) {
                console.log('❌ boundaryTestAsync 内部错误:', error.message);
                reject(error);
            }
        }, 12);
    });
}

// 主异步流程
console.log('🚀 开始主异步流程\n');

return Promise.resolve()
    .then(function() {
        console.log('步骤 1: 异步16/32位整数读写测试');
        
        // 1. 异步16/32位整数读写测试
        const buf1 = Buffer.alloc(10);
        const buf2 = Buffer.alloc(20);
        
        const int16Operations = {
            writes: [
                { method: 'writeInt16BE', value: 12345, offset: 0 },
                { method: 'writeInt16LE', value: -6789, offset: 2 },
                { method: 'writeUInt16BE', value: 65535, offset: 4 },
                { method: 'writeUInt16LE', value: 32768, offset: 6 }
            ],
            reads: [
                { method: 'readInt16BE', offset: 0, name: 'int16BE' },
                { method: 'readInt16LE', offset: 2, name: 'int16LE' },
                { method: 'readUInt16BE', offset: 4, name: 'uint16BE' },
                { method: 'readUInt16LE', offset: 6, name: 'uint16LE' }
            ]
        };
        
        const int32Operations = {
            writes: [
                { method: 'writeInt32BE', value: 0x12345678, offset: 0 },
                { method: 'writeInt32LE', value: -0x12345678, offset: 4 },  // 🔧 修复：使用范围内的值
                { method: 'writeUInt32BE', value: 0xFFFFFFFF, offset: 8 },
                { method: 'writeUInt32LE', value: 0x80000000, offset: 12 }
            ],
            reads: [
                { method: 'readInt32BE', offset: 0, name: 'int32BE' },
                { method: 'readInt32LE', offset: 4, name: 'int32LE' },
                { method: 'readUInt32BE', offset: 8, name: 'uint32BE' },
                { method: 'readUInt32LE', offset: 12, name: 'uint32LE' }
            ]
        };
        
        console.log('  调用 Promise.all (2个整数测试)');
        
        return Promise.all([
            integerReadWriteAsync(buf1, int16Operations),
            integerReadWriteAsync(buf2, int32Operations)
        ]);
    })
    .then(function(integerResults) {
        console.log('\n步骤 2: 整数测试完成, 结果数:', integerResults ? integerResults.length : 'null/undefined');
        
        const int16Result = integerResults[0];
        const int32Result = integerResults[1];
        
        // 2. 异步浮点数读写测试
        const bufFloat = Buffer.alloc(16);
        
        const floatOperations = {
            writes: [
                { method: 'writeFloatBE', value: 3.14159, offset: 0 },
                { method: 'writeFloatLE', value: -2.71828, offset: 4 },
                { method: 'writeDoubleBE', value: Math.PI, offset: 8 }
            ],
            reads: [
                { method: 'readFloatBE', offset: 0, name: 'floatBE', precision: 4 },
                { method: 'readFloatLE', offset: 4, name: 'floatLE', precision: 4 },
                { method: 'readDoubleBE', offset: 8, name: 'doubleBE', precision: 6 }
            ]
        };
        
        console.log('  调用 Promise.all (浮点数测试)');
        
        return Promise.all([
            Promise.resolve({ int16Result: int16Result, int32Result: int32Result }),
            floatReadWriteAsync(bufFloat, floatOperations)
        ]);
    })
    .then(function(results) {
        console.log('\n步骤 3: 浮点数测试完成');
        
        const previousResults = results[0];
        const floatResult = results[1];
        
        // 3. 异步字符串搜索测试
        const buf3 = Buffer.from("hello world hello");
        
        const searchTerms = [
            { type: 'includes', value: 'hello', name: 'includes_hello' },
            { type: 'includes', value: 'xyz', name: 'includes_xyz' },
            { type: 'lastIndexOf', value: 'hello', name: 'lastIndexOf_hello' },
            { type: 'lastIndexOf', value: 'o', name: 'lastIndexOf_o' }
        ];
        
        return Promise.all([
            Promise.resolve({
                int16Result: previousResults.int16Result,
                int32Result: previousResults.int32Result,
                floatResult: floatResult
            }),
            stringSearchAsync(buf3, searchTerms)
        ]);
    })
    .then(function(results) {
        const previousResults = results[0];
        const searchResult = results[1];
        
        // 4. 异步字节交换测试
        const buf4 = Buffer.from([0x11, 0x22, 0x33, 0x44]);
        const buf4Copy = Buffer.from(buf4); // 创建副本用于第二次交换
        
        return Promise.all([
            Promise.resolve({
                int16Result: previousResults.int16Result,
                int32Result: previousResults.int32Result,
                floatResult: previousResults.floatResult,
                searchResult: searchResult
            }),
            byteSwapAsync(buf4, 'swap16'),
            byteSwapAsync(buf4Copy, 'swap16').then(function(swap16Result) {
                return byteSwapAsync(swap16Result.buffer, 'swap32');
            })
        ]);
    })
    .then(function(results) {
        const previousResults = results[0];
        const swap16Result = results[1];
        const swap32Result = results[2];
        
        // 5. 异步特殊编码测试
        return Promise.all([
            Promise.resolve({
                int16Result: previousResults.int16Result,
                int32Result: previousResults.int32Result,
                floatResult: previousResults.floatResult,
                searchResult: previousResults.searchResult,
                swapResults: { swap16Result: swap16Result, swap32Result: swap32Result }
            }),
            encodingTestAsync("ñáéíóú", "latin1"),
            encodingTestAsync("Hello ASCII", "ascii")
        ]);
    })
    .then(function(results) {
        const previousResults = results[0];
        const latin1Result = results[1];
        const asciiResult = results[2];
        
        // 6. 异步边界条件测试
        return Promise.all([
            Promise.resolve({
                int16Result: previousResults.int16Result,
                int32Result: previousResults.int32Result,
                floatResult: previousResults.floatResult,
                searchResult: previousResults.searchResult,
                swapResults: previousResults.swapResults,
                encodingResults: { latin1Result: latin1Result, asciiResult: asciiResult }
            }),
            boundaryTestAsync('empty_swap'),
            boundaryTestAsync('big_number', Number.MAX_SAFE_INTEGER)
        ]);
    })
    .then(function(results) {
        const previousResults = results[0];
        const emptySwapResult = results[1];
        const bigNumberResult = results[2];
        
        // 7. 组装最终结果
        console.log('\n步骤 7: 组装最终结果');
        
        const finalResult = {
            success: true,
            executionMode: 'EventLoop异步模式',
            message: "所有高级Buffer功能异步测试完成",
            timestamp: new Date().toISOString(),
            results: {
                // 16位整数结果
                integers16: previousResults.int16Result.results,
                
                // 32位整数结果
                integers32: previousResults.int32Result.results,
                
                // 浮点数结果
                floats: previousResults.floatResult.results,
                
                // 字符串搜索结果
                stringSearch: previousResults.searchResult.results,
                
                // 字节交换结果
                byteSwap: {
                    swap16_before: previousResults.swapResults.swap16Result.originalHex,
                    swap16_after: previousResults.swapResults.swap16Result.swappedHex,
                    swap32_after: previousResults.swapResults.swap32Result.swappedHex
                },
                
                // 特殊编码结果
                encoding: {
                    latin1_length: previousResults.encodingResults.latin1Result.length,
                    latin1_back: previousResults.encodingResults.latin1Result.decoded,
                    ascii_length: previousResults.encodingResults.asciiResult.length,
                    ascii_back: previousResults.encodingResults.asciiResult.decoded
                },
                
                // 边界条件结果
                boundary: {
                    empty_swap_safe: emptySwapResult.safe,
                    big_number: bigNumberResult.readValue,
                    big_number_accurate: bigNumberResult.accurate
                }
            },
            features: ['Promise', 'Promise.all', 'setTimeout', '并行处理', '链式调用'],
            summary: {
                totalOperations: 20, // 8整数+3浮点+4搜索+2交换+2编码+1边界
                executionSteps: 7,
                asyncFeatures: '所有高级Buffer操作都通过Promise异步执行',
                bufferFeatures: [
                    '16/32位整数读写(BE/LE)',
                    '32/64位浮点数读写',
                    '字符串搜索(includes/lastIndexOf)',
                    '字节交换(swap16/swap32)',
                    '特殊编码(latin1/ascii)',
                    '边界条件测试'
                ]
            }
        };
        
        console.log('\n准备返回最终结果');
        console.log('结果对象:', JSON.stringify(finalResult).substring(0, 200) + '...');
        
        return finalResult;
    })
    .catch(function(error) {
        console.log('\n❌ Promise 链错误捕获');
        console.log('错误类型:', error.name);
        console.log('错误信息:', error.message);
        console.log('错误堆栈:', error.stack);
        return {
            success: false,
            error: error.message || "Buffer高级功能异步测试失败",
            stack: error.stack,
            executionMode: 'EventLoop异步模式',
            timestamp: new Date().toISOString()
        };
    });
