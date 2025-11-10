// 测试 UUID 格式严格性 - 验证 Go 实现与 Node.js uuid 模块的一致性
// 主要测试不带连字符的 UUID 是否被正确拒绝

const testCases = [
  {
    name: "标准格式 UUID（带连字符）",
    uuid: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    expectedValidate: true,
    expectedParse: true,
    expectedVersion: 4
  },
  {
    name: "不带连字符的 UUID",
    uuid: "9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d",
    expectedValidate: false,
    expectedParse: false,
    expectedVersion: null
  },
  {
    name: "大写 UUID（标准格式）",
    uuid: "9B1DEB4D-3B7D-4BAD-9BDD-2B0D7B3DCB6D",
    expectedValidate: true,
    expectedParse: true,
    expectedVersion: 4
  },
  {
    name: "混合大小写 UUID（标准格式）",
    uuid: "9b1DeB4D-3B7d-4bAd-9bDd-2B0d7b3DcB6d",
    expectedValidate: true,
    expectedParse: true,
    expectedVersion: 4
  },
  {
    name: "带大括号的 UUID（非标准）",
    uuid: "{9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d}",
    expectedValidate: false,
    expectedParse: false,
    expectedVersion: null
  },
  {
    name: "URN 格式 UUID（非标准）",
    uuid: "urn:uuid:9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    expectedValidate: false,
    expectedParse: false,
    expectedVersion: null
  },
  {
    name: "NIL UUID",
    uuid: "00000000-0000-0000-0000-000000000000",
    expectedValidate: true,
    expectedParse: true,
    expectedVersion: 0
  },
  {
    name: "MAX UUID",
    uuid: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    expectedValidate: true,
    expectedParse: true,
    expectedVersion: 15
  }
];

console.log("╔═══════════════════════════════════════════════════════════════════╗");
console.log("║      UUID 格式严格性测试 - Go 实现 vs Node.js uuid v13.0.0       ║");
console.log("╚═══════════════════════════════════════════════════════════════════╝");
console.log("");

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  console.log(`\n[测试 ${index + 1}/${testCases.length}] ${testCase.name}`);
  console.log(`UUID: ${testCase.uuid}`);
  console.log("─".repeat(70));
  
  let testPassed = true;
  
  // 测试 validate()
  try {
    const { validate } = require('uuid');
    const isValid = validate(testCase.uuid);
    const validateMatch = isValid === testCase.expectedValidate;
    
    if (validateMatch) {
      console.log(`✅ validate(): ${isValid} (预期: ${testCase.expectedValidate})`);
    } else {
      console.log(`❌ validate(): ${isValid} (预期: ${testCase.expectedValidate})`);
      testPassed = false;
    }
  } catch (e) {
    console.log(`❌ validate() 抛出异常: ${e.message}`);
    testPassed = false;
  }
  
  // 测试 parse()
  try {
    const { parse } = require('uuid');
    const bytes = parse(testCase.uuid);
    
    if (testCase.expectedParse) {
      console.log(`✅ parse(): 成功解析，长度 ${bytes.length}`);
    } else {
      console.log(`❌ parse(): 应该失败但成功了，长度 ${bytes.length}`);
      testPassed = false;
    }
  } catch (e) {
    if (!testCase.expectedParse) {
      console.log(`✅ parse(): 正确拒绝 (${e.message})`);
    } else {
      console.log(`❌ parse(): 应该成功但失败了 (${e.message})`);
      testPassed = false;
    }
  }
  
  // 测试 version()
  try {
    const { version } = require('uuid');
    const ver = version(testCase.uuid);
    
    if (testCase.expectedVersion !== null) {
      const versionMatch = ver === testCase.expectedVersion;
      if (versionMatch) {
        console.log(`✅ version(): ${ver} (预期: ${testCase.expectedVersion})`);
      } else {
        console.log(`❌ version(): ${ver} (预期: ${testCase.expectedVersion})`);
        testPassed = false;
      }
    } else {
      console.log(`❌ version(): 应该失败但返回了 ${ver}`);
      testPassed = false;
    }
  } catch (e) {
    if (testCase.expectedVersion === null) {
      console.log(`✅ version(): 正确拒绝 (${e.message})`);
    } else {
      console.log(`❌ version(): 应该成功但失败了 (${e.message})`);
      testPassed = false;
    }
  }
  
  if (testPassed) {
    console.log(`\n✅ 测试通过`);
    passCount++;
  } else {
    console.log(`\n❌ 测试失败`);
    failCount++;
  }
});

console.log("\n\n╔═══════════════════════════════════════════════════════════════════╗");
console.log("║                           测试总结                                ║");
console.log("╚═══════════════════════════════════════════════════════════════════╝");
console.log(`\n总测试数: ${testCases.length}`);
console.log(`通过: ${passCount} ✅`);
console.log(`失败: ${failCount} ❌`);
console.log(`通过率: ${((passCount / testCases.length) * 100).toFixed(2)}%`);

if (failCount === 0) {
  console.log("\n🎉 恭喜！所有格式严格性测试通过！");
  console.log("Go 实现与 Node.js uuid v13.0.0 完全一致！");
} else {
  console.log("\n⚠️  存在失败的测试项，请检查上述输出。");
}

console.log("");

