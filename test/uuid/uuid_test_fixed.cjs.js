// uuid_test_fixed.cjs.js
const {
    NIL,
    parse,
    stringify,
    v3,
    v5,
    version,
    validate
  } = require('uuid');
  
  console.log("=== 固定输入／输出对比测试 uuid v13.0.0（CommonJS） ===");
  
  // 常量 NIL 测试
  console.log("\n-- NIL 常量测试 --");
  console.log("NIL:", NIL);
  console.log("预期: 00000000-0000-0000-0000-000000000000");
  console.log("是否匹配:", NIL === "00000000-0000-0000-0000-000000000000");
  
  // parse／stringify 对照
  console.log("\n-- parse／stringify 对照测试 --");
  const fixedStr = "123e4567-e89b-12d3-a456-426614174000";  // 合法标准
  console.log("输入字符串:", fixedStr);
  const fixedBytes = parse(fixedStr);
  console.log("parse 输出 (hex 每字节):", Array.from(fixedBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  const backToStr = stringify(fixedBytes);
  console.log("stringify 返回:", backToStr);
  console.log("是否一致:", backToStr === fixedStr);
  
  // v3 固定输入测试
  console.log("\n-- v3 固定输入测试 --");
  const name3 = "test-name";
  const namespace3 = NIL;
  const fixed_v3 = v3(name3, namespace3);
  console.log("name:", name3, "namespace:", namespace3);
  console.log("生成的 v3:", fixed_v3);
  console.log("validate?:", validate(fixed_v3), "version?:", version(fixed_v3));
  console.log("请记录该值作为你以后对比基准");
  
  // v5 固定输入测试
  console.log("\n-- v5 固定输入测试 --");
  const name5 = "another-name";
  const namespace5 = NIL;
  const fixed_v5 = v5(name5, namespace5);
  console.log("name:", name5, "namespace:", namespace5);
  console.log("生成的 v5:", fixed_v5);
  console.log("validate?:", validate(fixed_v5), "version?:", version(fixed_v5));
  console.log("请记录该值作为你以后对比基准");
  
  console.log("\n=== 固定输入／输出测试结束 ===");