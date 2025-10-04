/**
 * Reflect.construct 和 Proxy 绕过测试
 * 验证安全修复是否生效
 */

const testCases = [
  {
    name: "测试1: Reflect.construct 绕过 (应被阻止)",
    code: `
      const evil = Reflect.construct(Array.prototype.constructor.constructor, ['return process'])();
      return 'success';
    `,
    shouldFail: true,
    expectedError: "SecurityError" // 静态检测会捕获
  },
  {
    name: "测试2: Reflect.apply 绕过 (应被阻止)",
    code: `
      const fn = Reflect.apply(Array.prototype.constructor.constructor, null, ['return process']);
      return 'success';
    `,
    shouldFail: true,
    expectedError: "SecurityError" // 静态检测会捕获
  },
  {
    name: "测试3: Proxy 陷阱绕过 (应被阻止)",
    code: `
      const handler = {
        get: (target, prop) => {
          if (prop === 'constructor') {
            return Array.prototype.constructor;
          }
        }
      };
      const proxy = new Proxy({}, handler);
      return 'success';
    `,
    shouldFail: true,
    expectedError: "SecurityError" // 静态检测会捕获 "new Proxy"
  },
  {
    name: "测试4: Reflect 静态检测 (应被静态拒绝)",
    code: `
      if (typeof Reflect !== 'undefined') {
        return 'Reflect is available';
      }
      return 'Reflect is blocked';
    `,
    shouldFail: false,
    expectedResult: "Reflect is blocked"
  },
  {
    name: "测试5: Proxy 静态检测 (应被静态拒绝)",
    code: `
      if (typeof Proxy !== 'undefined') {
        return 'Proxy is available';
      }
      return 'Proxy is blocked';
    `,
    shouldFail: false,
    expectedResult: "Proxy is blocked"
  },
  {
    name: "测试6: 正常代码不受影响",
    code: `
      const arr = [1, 2, 3];
      const sum = arr.reduce((a, b) => a + b, 0);
      return sum;
    `,
    shouldFail: false,
    expectedResult: 6
  },
  {
    name: "测试7: lodash 仍然可用",
    code: `
      const _ = require('lodash');
      const result = _.chunk([1, 2, 3, 4], 2);
      return result;
    `,
    shouldFail: false,
    expectedResult: [[1, 2], [3, 4]]
  },
  {
    name: "测试8: 字符串字面量不应误判",
    code: `
      const data = "This string mentions Reflect but is safe";
      return data;
    `,
    shouldFail: false,
    expectedResult: "This string mentions Reflect but is safe"
  },
  {
    name: "测试9: Reflect 已被禁用为 undefined",
    code: `
      const r = Reflect;
      if (r === undefined) {
        return 'Reflect is undefined (blocked)';
      }
      return 'Reflect is available';
    `,
    shouldFail: false,
    expectedResult: "Reflect is undefined (blocked)"
  }
];

async function runTest(testCase) {
  console.log(`\n🧪 ${testCase.name}`);
  
  try {
    const codeBase64 = Buffer.from(testCase.code).toString('base64');
    const response = await fetch('http://localhost:3002/flow/codeblock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        codeBase64: codeBase64,
        input: {}
      })
    });

    const result = await response.json();
    
    if (testCase.shouldFail) {
      if (result.error) {
        const errorType = result.error.type || '';
        if (errorType.includes(testCase.expectedError)) {
          console.log(`✅ PASS - 正确拒绝: ${result.error.message}`);
          return { pass: true, message: result.error.message };
        } else {
          console.log(`❌ FAIL - 错误类型不匹配`);
          console.log(`   预期: ${testCase.expectedError}`);
          console.log(`   实际: ${errorType}`);
          return { pass: false, message: `Error type mismatch: expected ${testCase.expectedError}, got ${errorType}` };
        }
      } else {
        console.log(`❌ FAIL - 应该失败但成功了`);
        console.log(`   返回值: ${JSON.stringify(result.result)}`);
        return { pass: false, message: 'Should have failed but succeeded' };
      }
    } else {
      if (result.error) {
        console.log(`❌ FAIL - 不应该失败: ${result.error.message}`);
        return { pass: false, message: result.error.message };
      } else {
        const actualResult = JSON.stringify(result.result);
        const expectedResult = JSON.stringify(testCase.expectedResult);
        
        if (actualResult === expectedResult) {
          console.log(`✅ PASS - 返回值正确: ${actualResult}`);
          return { pass: true, message: actualResult };
        } else {
          console.log(`❌ FAIL - 返回值不匹配`);
          console.log(`   预期: ${expectedResult}`);
          console.log(`   实际: ${actualResult}`);
          return { pass: false, message: `Result mismatch: expected ${expectedResult}, got ${actualResult}` };
        }
      }
    }
  } catch (error) {
    console.log(`❌ FAIL - 请求失败: ${error.message}`);
    return { pass: false, message: error.message };
  }
}

async function main() {
  console.log('========================================');
  console.log('🔒 Reflect & Proxy 绕过防护测试');
  console.log('========================================');

  const results = [];
  
  for (const testCase of testCases) {
    const result = await runTest(testCase);
    results.push({ name: testCase.name, ...result });
  }

  console.log('\n========================================');
  console.log('📊 测试汇总');
  console.log('========================================');
  
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  
  console.log(`总计: ${results.length} 个测试`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`成功率: ${(passed / results.length * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n失败的测试:');
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  - ${r.name}: ${r.message}`);
    });
  }
  
  console.log('\n========================================');
  
  if (failed === 0) {
    console.log('🎉 所有测试通过！安全修复已生效。');
    process.exit(0);
  } else {
    console.log('⚠️ 部分测试失败，请检查安全配置。');
    process.exit(1);
  }
}

main();

