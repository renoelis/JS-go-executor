// uuid_test_all.cjs.js
const {
    MAX,
    NIL,
    parse,
    stringify,
    v1,
    v1ToV6,
    v3,
    v4,
    v5,
    v6,
    v6ToV1,
    v7,
    validate,
    version
  } = require('uuid');
  
  console.log("=== 测试 uuid v13.0.0 功能覆盖（CommonJS） ===");
  
  // 常量测试
  console.log("\n-- 常量测试 --");
  console.log("MAX:", MAX);
  console.log("NIL:", NIL);
  
  // parse / stringify 测试 — 合法 UUID
  console.log("\n-- parse / stringify 测试（合法 UUID）--");
  const goodStr = "123e4567-e89b-12d3-a456-426614174000";  // 合法
  console.log("原字符串:", goodStr);
  const goodBytes = parse(goodStr);
  console.log("parse 得到 Uint8Array:", goodBytes);
  const backGoodStr = stringify(goodBytes);
  console.log("stringify 得到字符串:", backGoodStr);
  console.log("字符串是否一致:", backGoodStr === goodStr);
  
  // parse 测试 — 非法 UUID
  console.log("\n-- parse 测试（非法 UUID）--");
  const badStr = "01234567-89ab-cdef-0123-456789abcdef";  // 非合法 variant/version
  console.log("输入非法字符串:", badStr);
  try {
    const badBytes = parse(badStr);
    console.log("错误：parse 没有抛出异常, 得到:", badBytes);
  } catch (e) {
    console.log("正确捕获异常:", e.message);
  }
  
  // v1 测试
  console.log("\n-- v1 测试 --");
  const uuid1 = v1();
  console.log("v1:", uuid1);
  console.log("validate(v1)?:", validate(uuid1), "version(v1)?:", version(uuid1));
  
  // v1ToV6 测试
  console.log("\n-- v1ToV6 测试 --");
  const uuid1b = v1();
  const uuid6_from1 = v1ToV6(uuid1b);
  console.log("来自 v1:", uuid1b);
  console.log("转换为 v6:", uuid6_from1);
  console.log("validate(v6)?:", validate(uuid6_from1), "version(v6)?:", version(uuid6_from1));
  
  // v6 测试
  console.log("\n-- v6 测试 --");
  const uuid6 = v6();
  console.log("v6:", uuid6);
  console.log("validate(v6)?:", validate(uuid6), "version(v6)?:", version(uuid6));
  
  // v6ToV1 测试
  console.log("\n-- v6ToV1 测试 --");
  const uuid1_from6 = v6ToV1(uuid6);
  console.log("来自 v6:", uuid6);
  console.log("转换回 v1:", uuid1_from6);
  console.log("validate(v1_from6)?:", validate(uuid1_from6), "version(v1_from6)?:", version(uuid1_from6));
  
  // v3 测试
  console.log("\n-- v3 测试 --");
  const name3 = "example.com";
  const namespace3 = NIL;
  const uuid3 = v3(name3, namespace3);
  console.log("v3 (MD5) name=", name3, "namespace=", namespace3, "=>", uuid3);
  console.log("validate(v3)?:", validate(uuid3), "version(v3)?:", version(uuid3));
  
  // v4 测试
  console.log("\n-- v4 测试 --");
  const uuid4 = v4();
  console.log("v4:", uuid4);
  console.log("validate(v4)?:", validate(uuid4), "version(v4)?:", version(uuid4));
  
  // v5 测试
  console.log("\n-- v5 测试 --");
  const name5 = "example.org";
  const namespace5 = NIL;
  const uuid5 = v5(name5, namespace5);
  console.log("v5 (SHA-1) name=", name5, "namespace=", namespace5, "=>", uuid5);
  console.log("validate(v5)?:", validate(uuid5), "version(v5)?:", version(uuid5));
  
  // v7 测试
  console.log("\n-- v7 测试 --");
  const uuid7 = v7();
  console.log("v7:", uuid7);
  console.log("validate(v7)?:", validate(uuid7), "version(v7)?:", version(uuid7));
  
  // 总结
  console.log("\n=== 测试结束 ===");