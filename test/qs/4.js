// qs_test_extended.cjs.js
const qs = require('qs');

// 辅助函数：格式化输出对象
function formatObj(obj) {
  return JSON.stringify(obj);
}

// 辅助函数：对比并显示结果
function checkResult(testName, actual, expected, showValues = true) {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  const mark = passed ? '✅' : '❌';
  if (showValues) {
    return `${mark} ${testName}\n   期望: ${formatObj(expected)}\n   实际: ${formatObj(actual)}\n`;
  } else {
    return `${mark} ${testName}: ${passed ? '通过' : '失败'}\n`;
  }
}

// 辅助函数：对比字符串
function checkString(testName, actual, expected) {
  const passed = actual === expected;
  const mark = passed ? '✅' : '❌';
  return `${mark} ${testName}\n   期望: "${expected}"\n   实际: "${actual}"\n`;
}

// 辅助函数：对比布尔值
function checkBool(testName, actual, expected) {
  const passed = actual === expected;
  const mark = passed ? '✅' : '❌';
  return `${mark} ${testName}: ${actual}\n`;
}

// 扩展测试
let result = "\n=== 扩展测试 qs v6.14.0（CommonJS） ===\n";

// 1. 基础 parse / stringify（重复确认）
result += "\n========== 测试 1: 基础 parse/stringify ==========\n";
const baseStr = "foo=bar&baz=qux";
result += checkResult('parse 基础字符串', qs.parse(baseStr), {"foo":"bar","baz":"qux"});
const baseObj = { foo: 'bar', baz: 'qux' };
result += checkString('stringify 基础对象', qs.stringify(baseObj), "foo=bar&baz=qux");

// 2. ignoreQueryPrefix 测试
result += "\n========== 测试 2: ignoreQueryPrefix ==========\n";
const prefixed = "?x=1&y=2";
result += checkResult('parse with ignoreQueryPrefix true', qs.parse(prefixed, { ignoreQueryPrefix: true }), {"x":"1","y":"2"});
result += checkResult('parse default (should include \'?\')', qs.parse(prefixed), {"?x":"1","y":"2"});

// 3. depth 限制测试
result += "\n========== 测试 3: depth 限制 ==========\n";
const deepStr = "a[b][c][d][e][f]=value";
result += checkResult('parse default depth', qs.parse(deepStr), {"a":{"b":{"c":{"d":{"e":{"f":"value"}}}}}});
result += checkResult('parse depth=2', qs.parse(deepStr, { depth: 2 }), {"a":{"b":{"c":{"[d][e][f]":"value"}}}});
result += checkResult('parse depth=false (disable limit)', qs.parse(deepStr, { depth: false }), {"a[b][c][d][e][f]":"value"});

// 4. parameterLimit / throwOnLimitExceeded 测试
result += "\n========== 测试 4: parameterLimit & throwOnLimitExceeded ==========\n";
const many = Array.from({length: 20}, (_, i) => `k${i}=v${i}`).join('&');
result += checkResult("20 params parse default", qs.parse(many), {"k0":"v0","k1":"v1","k2":"v2","k3":"v3","k4":"v4","k5":"v5","k6":"v6","k7":"v7","k8":"v8","k9":"v9","k10":"v10","k11":"v11","k12":"v12","k13":"v13","k14":"v14","k15":"v15","k16":"v16","k17":"v17","k18":"v18","k19":"v19"}, false);
try {
  const limited = qs.parse(many, { parameterLimit: 5 });
  result += checkResult("parse parameterLimit=5", limited, {"k0":"v0","k1":"v1","k2":"v2","k3":"v3","k4":"v4"}, false);
} catch (e) {
  result += "❌ 异常 (parameterLimit exceeded): " + e.message + "\n";
}
// throwOnLimitExceeded option (新版本支持)：
try {
  qs.parse(many, { parameterLimit: 5, throwOnLimitExceeded: true });
  result += "❌ 未抛异常（期望抛出）\n";
} catch (e) {
  result += `✅ 正确捕获 throwOnLimitExceeded 异常: ${e.message}\n`;
}

// 5. allowDots / plainObjects / allowPrototypes 测试
result += "\n========== 测试 5: allowDots/plainObjects/allowPrototypes ==========\n";
const dotStr = "x.y=z&x[z]=w";
result += checkResult('parse default (allowDots false)', qs.parse(dotStr), {"x.y":"z","x":{"z":"w"}});
result += checkResult('parse allowDots true', qs.parse(dotStr, { allowDots: true }), {"x":{"y":"z","z":"w"}});
const protoStr = "a[__proto__][z]=evil";
result += checkResult('parse default (should ignore prototype)', qs.parse(protoStr), {});
result += checkResult('parse allowPrototypes true', qs.parse(protoStr, { allowPrototypes: true }), {"a":{}});
result += checkResult('parse plainObjects true', qs.parse(protoStr, { plainObjects: true }), {"a":{}});

// 6. arrayLimit / parseArrays 测试
result += "\n========== 测试 6: arrayLimit/parseArrays ==========\n";
const bigArrayStr = Array.from({length: 30}, (_, i) => `arr[${i}]=${i}`).join('&');
result += checkResult('parse default big array (limit ~20)', qs.parse(bigArrayStr), {"arr":{"0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","10":"10","11":"11","12":"12","13":"13","14":"14","15":"15","16":"16","17":"17","18":"18","19":"19","20":"20","21":"21","22":"22","23":"23","24":"24","25":"25","26":"26","27":"27","28":"28","29":"29"}}, false);
result += checkResult('parse arrayLimit=0 (disable array to object conversion)', qs.parse(bigArrayStr, { arrayLimit: 0 }), {"arr":{"0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9","10":"10","11":"11","12":"12","13":"13","14":"14","15":"15","16":"16","17":"17","18":"18","19":"19","20":"20","21":"21","22":"22","23":"23","24":"24","25":"25","26":"26","27":"27","28":"28","29":"29"}}, false);
result += checkResult('parse parseArrays=false', qs.parse("arr[]=1&arr[]=2", { parseArrays: false }), {"arr":{"0":["1","2"]}});

// 7. delimiter / comma / comma option 测试
result += "\n========== 测试 7: delimiter/comma ==========\n";
const delimStr = "p=1;q=2,r=3";
result += checkResult('parse delimiter=\';\'', qs.parse("p=1;q=2", { delimiter: ';' }), {"p":"1","q":"2"});
result += checkResult('parse delimiter=/[;,]/', qs.parse(delimStr, { delimiter: /[;,]/ }), {"p":"1","q":"2","r":"3"});
result += checkResult('parse comma true', qs.parse("a=1,2,3", { comma: true }), {"a":["1","2","3"]});

// 8. stringify 选项更多测试
result += "\n========== 测试 8: stringify 各种选项 ==========\n";
const objOpts = { a: 'b', c: null, d: undefined, e: ['x','y'], f: { g: 'h' } };
result += checkString('stringify default', qs.stringify(objOpts), "a=b&c=&e%5B0%5D=x&e%5B1%5D=y&f%5Bg%5D=h");
result += checkString('stringify skipNulls true', qs.stringify(objOpts, { skipNulls: true }), "a=b&e%5B0%5D=x&e%5B1%5D=y&f%5Bg%5D=h");
result += checkString('stringify strictNullHandling true', qs.stringify(objOpts, { strictNullHandling: true }), "a=b&c&e%5B0%5D=x&e%5B1%5D=y&f%5Bg%5D=h");
result += checkString('stringify encode false', qs.stringify({ a:{ b:'c'} }, { encode: false }), "a[b]=c");
result += checkString('stringify arrayFormat brackets', qs.stringify({ e:['x','y'] }, { arrayFormat: 'brackets' }), "e%5B%5D=x&e%5B%5D=y");
result += checkString('stringify arrayFormat repeat', qs.stringify({ e:['x','y'] }, { arrayFormat: 'repeat' }), "e=x&e=y");
result += checkString('stringify addQueryPrefix true', qs.stringify({ a:'b', c:'d' }, { addQueryPrefix: true }), "?a=b&c=d");
result += checkString('stringify delimiter=\';\'', qs.stringify({ a:'b', c:'d' }, { delimiter: ';' }), "a=b;c=d");
result += checkString('stringify sort alphabetical', qs.stringify({ b:'2', a:'1', c:'3' }, { sort: (a,b)=> a.localeCompare(b) }), "a=1&b=2&c=3");

// 9. encoder / decoder 自定义测试
result += "\n========== 测试 9: encoder/decoder 自定义 ==========\n";
const customEncoderObj = { key: 'value=with=equals' };
result += checkString('stringify custom encoder', qs.stringify(customEncoderObj, {
  encoder: (str, defaultEncoder, charset, type) => {
    return defaultEncoder(str).replace('=', '%3D');
  }
}), "key=value%3Dwith%3Dequals");
const encoded = qs.stringify({ x: 'y+z' });
result += checkResult('parse custom decoder', qs.parse(encoded, {
  decoder: (str, defaultDecoder, charset, type) => {
    return defaultDecoder(str).replace('+', 'PLUS');
  }
}), {"x":"yPLUSz"});

// 10. filter / serializeDate 测试
result += "\n========== 测试 10: filter/serializeDate ==========\n";
const dateObj = { d: new Date('2020-01-01T00:00:00Z'), e: 'val' };
result += checkString('stringify serializeDate override', qs.stringify(dateObj, {
  serializeDate: d => d.getTime().toString()
}), "d=1577836800000&e=val");
result += checkString('stringify filter array', qs.stringify({ a:'x', b:'y', c:'z' }, { filter: ['a','c'] }), "a=x&c=z");
result += checkString('stringify filter function', qs.stringify({ a:'x', b:'y', c:'z' }, {
  filter: (prefix, value) => {
    if (prefix === 'b') { return; }
    return value;
  }
}), "a=x&c=z");

// 11. format (RFC 1738 vs RFC3986) 测试
result += "\n========== 测试 11: format RFC ==========\n";
const spaceObj = { a: 'b c', d: 'd+e' };
result += checkString('stringify default (encode space %20)', qs.stringify(spaceObj), "a=b%20c&d=d%2Be");
result += checkString('stringify format=\'RFC1738\'', qs.stringify(spaceObj, { format: 'RFC1738' }), "a=b+c&d=d%2Be");
result += checkString('stringify format=\'RFC3986\'', qs.stringify(spaceObj, { format: 'RFC3986' }), "a=b%20c&d=d%2Be");


// 13. 边界／错误输入测试
result += "\n========== 测试 12: 边界/错误输入 ==========\n";
try {
  const result = qs.stringify(123);
  result += checkString("stringify non-object (123)", result, "");
} catch (e) {
  result += `✅ 正确抛出异常 stringify non-object: ${e.message}\n`;
}
try {
  const result = qs.parse(123);
  result += checkResult("parse non-string (123)", result, {}, false);
} catch (e) {
  result += `✅ 正确抛出异常 parse non-string: ${e.message}\n`;
}
result += checkResult("parse empty string", qs.parse('', { plainObjects: true }), {}, false);
result += checkString("stringify empty object", qs.stringify({}), "");

result += "\n=== 扩展测试结束 ===";

// 输出测试结果
return result;
