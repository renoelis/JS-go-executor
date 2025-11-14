// 测试 js_helpers.go 预编译 Program 优化
// 验证 typeof 和 Symbol 检查在高频调用场景下的正确性

const { Buffer } = require('buffer');

async function main() {
  try {
    const results = {
      success: true,
      tests: []
    };

    // 测试1: 高频调用 Buffer.from（触发 getTypeofCheckFunc）
    console.log('测试1: 高频调用 Buffer.from 验证 typeof 检查');
    for (let i = 0; i < 100; i++) {
      // 使用类数组对象（会触发 length 类型检查）
      const buf = Buffer.from([i, i + 1, i + 2]);
      if (buf.length !== 3) {
        throw new Error(`Buffer.from 失败: 期望长度 3, 实际 ${buf.length}`);
      }
    }
    results.tests.push({
      name: '高频 Buffer.from',
      passed: true
    });

    // 测试2: 验证 length 类型检查（字符串类型的 length 应返回空 Buffer）
    console.log('测试2: 验证 typeof 检查对非数字 length 的处理');
    const objWithStringLength = { length: "10", 0: 65, 1: 66 };
    const buf2 = Buffer.from(objWithStringLength);
    if (buf2.length !== 0) {
      throw new Error(`应该返回空 Buffer，实际长度 ${buf2.length}`);
    }
    results.tests.push({
      name: '非数字 length 返回空 Buffer',
      passed: true
    });

    // 测试3: 验证正常的数字 length
    console.log('测试3: 验证数字 length 的正常处理');
    const objWithNumberLength = { length: 3, 0: 65, 1: 66, 2: 67 };
    const buf3 = Buffer.from(objWithNumberLength);
    if (buf3.length !== 3 || buf3[0] !== 65 || buf3[1] !== 66 || buf3[2] !== 67) {
      throw new Error(`Buffer.from 类数组对象失败`);
    }
    results.tests.push({
      name: '数字 length 正常工作',
      passed: true
    });

    // 测试4: 高频调用 Buffer.byteLength（触发 getIsSymbolCheckFunc）
    console.log('测试4: 高频调用 Buffer.byteLength 验证 Symbol 检查');
    for (let i = 0; i < 100; i++) {
      const len = Buffer.byteLength('test string');
      if (len !== 11) {
        throw new Error(`Buffer.byteLength 失败: 期望 11, 实际 ${len}`);
      }
    }
    results.tests.push({
      name: '高频 Buffer.byteLength',
      passed: true
    });

    // 测试5: 验证 Buffer.byteLength 对 Buffer 的处理
    console.log('测试5: 验证 Buffer.byteLength 处理 Buffer 对象');
    const testBuf = Buffer.from('hello');
    const len5 = Buffer.byteLength(testBuf);
    if (len5 !== 5) {
      throw new Error(`Buffer.byteLength(Buffer) 失败: 期望 5, 实际 ${len5}`);
    }
    results.tests.push({
      name: 'Buffer.byteLength 处理 Buffer',
      passed: true
    });

    // 测试6: 验证 Buffer.byteLength 对 TypedArray 的处理
    console.log('测试6: 验证 Buffer.byteLength 处理 TypedArray');
    const uint8 = new Uint8Array([1, 2, 3, 4]);
    const len6 = Buffer.byteLength(uint8);
    if (len6 !== 4) {
      throw new Error(`Buffer.byteLength(Uint8Array) 失败: 期望 4, 实际 ${len6}`);
    }
    results.tests.push({
      name: 'Buffer.byteLength 处理 TypedArray',
      passed: true
    });

    // 所有测试通过
    console.log('\n✅ 所有测试通过');
    console.log(JSON.stringify(results, null, 2));
    return results;

  } catch (error) {
    const errorResult = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    console.log(JSON.stringify(errorResult, null, 2));
    return errorResult;
  }
}

return main();
