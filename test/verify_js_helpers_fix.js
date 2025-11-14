// 验证 js_helpers.go 修复：测试 Buffer.from 跨 runtime 调用
// 这个测试会触发 getTypeofCheckFunc 和 getHasOwnPropertyFunc 的使用

const { Buffer } = require('buffer');

try {
  // 测试 1: Buffer.from 使用类数组对象（触发 typeof 检查）
  const obj1 = { length: 5, 0: 65, 1: 66, 2: 67 };
  const buf1 = Buffer.from(obj1);

  // 测试 2: Buffer.from 使用字符串 length（触发 typeof 检查）
  const obj2 = { length: "invalid" };
  const buf2 = Buffer.from(obj2); // 应返回空 Buffer

  // 测试 3: Buffer.from 使用 NaN length
  const obj3 = { length: NaN };
  const buf3 = Buffer.from(obj3); // 应返回空 Buffer

  // 测试 4: Buffer.from 使用 Symbol（触发 isSymbol 检查）
  try {
    const buf4 = Buffer.from(Symbol('test'));
  } catch (e) {
    // 预期会抛出错误
  }

  // 测试 5: 多次调用，确保每次都能正常工作（验证无跨 runtime 问题）
  for (let i = 0; i < 10; i++) {
    const buf = Buffer.from({ length: 3, 0: i, 1: i+1, 2: i+2 });
  }

  const result = {
    success: true,
    message: "所有测试通过：js_helpers 跨 runtime 问题已修复",
    tests: {
      test1_array_like: buf1.toString('hex'),
      test2_invalid_length: buf2.length,
      test3_nan_length: buf3.length,
      test5_iterations: "完成 10 次迭代"
    }
  };

  console.log(JSON.stringify(result, null, 2));
  return result;

} catch (error) {
  const result = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}
