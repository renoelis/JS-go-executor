/**
 * Buffer异步测试示例
 * 包含所有Buffer操作的异步版本
 */

// 异步Buffer创建函数
function createBufferAsync(type, data, encoding) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            let buffer;
            let result = {};
            
            switch(type) {
                case 'from_string':
                    buffer = Buffer.from(data, encoding || 'utf8');
                    result = {
                        type: 'from_string',
                        buffer: buffer,
                        content: buffer.toString('utf8'),
                        hex: buffer.toString('hex')
                    };
                    break;
                case 'alloc':
                    buffer = Buffer.alloc(data);
                    result = {
                        type: 'alloc',
                        buffer: buffer,
                        hex: buffer.toString('hex'),
                        length: buffer.length
                    };
                    break;
                case 'allocUnsafe':
                    buffer = Buffer.allocUnsafe(data);
                    result = {
                        type: 'allocUnsafe',
                        buffer: buffer,
                        hex: buffer.toString('hex'),
                        length: buffer.length
                    };
                    break;
                case 'from_array':
                    buffer = Buffer.from(data);
                    result = {
                        type: 'from_array',
                        buffer: buffer,
                        content: buffer.toString(),
                        hex: buffer.toString('hex')
                    };
                    break;
                default:
                    buffer = Buffer.alloc(0);
                    result = { type: 'unknown', buffer: buffer };
            }
            
            resolve(result);
        }, 10);
    });
}

// 异步Buffer写入函数
function writeBufferAsync(buffer, data, encoding) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            const bytesWritten = buffer.write(data, encoding || 'utf8');
            resolve({
                operation: 'write',
                data: data,
                bytesWritten: bytesWritten,
                content: buffer.toString('utf8'),
                hex: buffer.toString('hex')
            });
        }, 15);
    });
}

// 异步Buffer读取函数
function readBufferAsync(buffer, encoding, start, end) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            const content = buffer.toString(encoding || 'utf8', start, end);
            resolve({
                operation: 'read',
                encoding: encoding,
                start: start,
                end: end,
                content: content
            });
        }, 12);
    });
}

// 异步Buffer编码转换函数
function encodeBufferAsync(buffer, encoding) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            const encoded = buffer.toString(encoding);
            resolve({
                operation: 'encode',
                encoding: encoding,
                result: encoded
            });
        }, 18);
    });
}

// 异步Buffer操作函数
function bufferOperationAsync(operation, buffers, options) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            let result = {};
            
            switch(operation) {
                case 'concat':
                    const concatenated = Buffer.concat(buffers);
                    result = {
                        operation: 'concat',
                        result: concatenated,
                        content: concatenated.toString(),
                        length: concatenated.length
                    };
                    break;
                case 'slice':
                    const sliced = buffers[0].slice(options.start, options.end);
                    result = {
                        operation: 'slice',
                        result: sliced,
                        content: sliced.toString(),
                        length: sliced.length
                    };
                    break;
                case 'copy':
                    const target = options.target;
                    const copied = buffers[0].copy(target, options.targetStart || 0, options.sourceStart || 0, options.sourceEnd);
                    result = {
                        operation: 'copy',
                        bytesCopied: copied,
                        target: target,
                        content: target.toString()
                    };
                    break;
                case 'compare':
                    const comparison = buffers[0].compare(buffers[1]);
                    result = {
                        operation: 'compare',
                        result: comparison,
                        meaning: comparison < 0 ? 'first < second' : comparison > 0 ? 'first > second' : 'equal'
                    };
                    break;
                case 'fill':
                    buffers[0].fill(options.value);
                    result = {
                        operation: 'fill',
                        value: options.value,
                        result: buffers[0],
                        content: buffers[0].toString()
                    };
                    break;
                case 'equals':
                    const isEqual = buffers[0].equals(buffers[1]);
                    result = {
                        operation: 'equals',
                        result: isEqual
                    };
                    break;
                default:
                    result = { operation: 'unknown' };
            }
            
            resolve(result);
        }, 20);
    });
}

// 主异步流程
return Promise.resolve()
    .then(function() {
        // 1. 并行创建多种Buffer
        return Promise.all([
            createBufferAsync('from_string', "Hello Buffer", "utf8"),
            createBufferAsync('alloc', 10),
            createBufferAsync('allocUnsafe', 10),
            createBufferAsync('from_array', [72, 101, 108, 108, 111])
        ]);
    })
    .then(function(createResults) {
        const bufFromString = createResults[0];
        const bufAlloc = createResults[1];
        const bufAllocUnsafe = createResults[2];
        const bufFromArray = createResults[3];
        
        // 2. 异步写入和读取操作
        return Promise.all([
            Promise.resolve({ createResults: createResults }),
            writeBufferAsync(bufAlloc.buffer, "Hi", "utf8"),
            readBufferAsync(bufFromString.buffer, "utf8", 0, 5)
        ]);
    })
    .then(function(results) {
        const previousResults = results[0];
        const writeResult = results[1];
        const readResult = results[2];
        
        // 3. 并行编码转换
        const bufFromString = previousResults.createResults[0].buffer;
        
        return Promise.all([
            Promise.resolve({ 
                createResults: previousResults.createResults,
                writeResult: writeResult,
                readResult: readResult
            }),
            encodeBufferAsync(bufFromString, "base64"),
            encodeBufferAsync(bufFromString, "hex")
        ]);
    })
    .then(function(results) {
        const previousResults = results[0];
        const base64Result = results[1];
        const hexResult = results[2];
        
        // 4. Buffer操作：拼接、切片、拷贝
        const bufFromArray = previousResults.createResults[3].buffer;
        const worldBuffer = Buffer.from(" World");
        const copyTarget = Buffer.alloc(5);
        
        return Promise.all([
            Promise.resolve({
                createResults: previousResults.createResults,
                writeResult: previousResults.writeResult,
                readResult: previousResults.readResult,
                encodingResults: { base64Result: base64Result, hexResult: hexResult }
            }),
            bufferOperationAsync('concat', [bufFromArray, worldBuffer]),
            bufferOperationAsync('copy', [bufFromArray], { 
                target: copyTarget, 
                targetStart: 0, 
                sourceStart: 0, 
                sourceEnd: 5 
            })
        ]);
    })
    .then(function(results) {
        const previousResults = results[0];
        const concatResult = results[1];
        const copyResult = results[2];
        
        // 5. 更多Buffer操作：切片、比较、填充、相等性检查
        const concatBuffer = concatResult.result;
        const bufA = Buffer.from("abc");
        const bufB = Buffer.from("abd");
        const fillBuffer = Buffer.alloc(5);
        const bufFromArray = previousResults.createResults[3].buffer;
        const helloBuffer = Buffer.from("Hello");
        
        return Promise.all([
            Promise.resolve({
                createResults: previousResults.createResults,
                writeResult: previousResults.writeResult,
                readResult: previousResults.readResult,
                encodingResults: previousResults.encodingResults,
                concatResult: concatResult,
                copyResult: copyResult
            }),
            bufferOperationAsync('slice', [concatBuffer], { start: 0, end: 5 }),
            bufferOperationAsync('compare', [bufA, bufB]),
            bufferOperationAsync('fill', [fillBuffer], { value: "a" }),
            bufferOperationAsync('equals', [bufFromArray, helloBuffer])
        ]);
    })
    .then(function(results) {
        const previousResults = results[0];
        const sliceResult = results[1];
        const compareResult = results[2];
        const fillResult = results[3];
        const equalsResult = results[4];
        
        // 6. 组装最终结果
        return {
            success: true,
            executionMode: 'EventLoop异步模式',
            timestamp: new Date().toISOString(),
            data: {
                // Buffer创建结果
                creation: {
                    from_string: previousResults.createResults[0].content,
                    alloc: previousResults.createResults[1].hex,
                    allocUnsafe: previousResults.createResults[2].hex,
                    from_array: previousResults.createResults[3].content
                },
                
                // 读写操作结果
                readWrite: {
                    write: previousResults.writeResult.content,
                    read: previousResults.readResult.content
                },
                
                // 编码转换结果
                encoding: {
                    base64: previousResults.encodingResults.base64Result.result,
                    hex: previousResults.encodingResults.hexResult.result
                },
                
                // Buffer操作结果
                operations: {
                    concat: previousResults.concatResult.content,
                    slice: sliceResult.content,
                    copy: previousResults.copyResult.content,
                    compare: compareResult.result,
                    fill: fillResult.content,
                    equals: equalsResult.result
                },
                
                // 额外信息
                metadata: {
                    concatLength: previousResults.concatResult.length,
                    compareExplanation: compareResult.meaning,
                    jsonRepresentation: JSON.stringify(previousResults.createResults[3].buffer)
                }
            },
            features: ['Promise', 'Promise.all', 'setTimeout', '并行处理', '链式调用'],
            summary: {
                totalOperations: 16, // 4创建+2读写+2编码+5操作+3元数据
                executionSteps: 6,
                asyncFeatures: '所有Buffer操作都通过Promise异步执行',
                bufferFeatures: [
                    'Buffer创建(from/alloc/allocUnsafe)', 
                    '读写操作', 
                    '编码转换(base64/hex)', 
                    'Buffer操作(concat/slice/copy/compare/fill/equals)',
                    'JSON序列化'
                ]
            }
        };
    })
    .catch(function(error) {
        return {
            success: false,
            error: error.message,
            executionMode: 'EventLoop异步模式',
            timestamp: new Date().toISOString(),
            note: 'Buffer异步操作失败'
        };
    });
