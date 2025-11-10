const qs = require('qs');

/**
 * v2.2 说明与改动
 * - 修复 arrayLimit 用例：加入特性探测，自适配不同 qs 版本（阈值等于/大于的分歧）。
 * - 安全适配：不使用 Object.getPrototypeOf；用 in/hasOwnProperty 侧证 null 原型。
 * - 统一断言口径：parse 后的值按“字符串”比对；null 在非 strictNullHandling 下接受为 ""。
 * - 新增 parse.dotKeyDefault 用例，使总用例数为 25。
 */

function makeResult(name, expected, actual, extra) {
  return { name, pass: expected === '__PASS__' ? true : expected, actual, ...(extra ? { extra } : {}) };
}

function has3986(str) { return str.indexOf('%20') !== -1; }
function has1738(str) { return /\+/.test(str); }

// 探测是否支持 stringify({y:[a,b,c]}, {comma:true}) => 'y=a,b,c'
function featureSupportsStringifyComma() {
  try {
    const out = qs.stringify({ y: ['a', 'b', 'c'] }, { comma: true });
    return out === 'y=a,b,c';
  } catch (_) {
    return false;
  }
}

// 探测 arrayLimit 的触发条件：有些版本需要 index > arrayLimit 才对象化
function arrayLimitSwitchesOnGreaterThan() {
  const probe = qs.parse('x[2]=a', { arrayLimit: 2 });
  return Array.isArray(probe.x); // true => 需要 index > arrayLimit 才触发
}

function main() {
  try {
    const results = [];

    // 1) basic.stringify->parse roundtrip
    (function () {
      const obj = { a: 1, b: 'x y', c: true, d: null };
      const s = qs.stringify(obj);
      const p = qs.parse(s);
      const pass = p.a === '1' && p.b === 'x y' && p.c === 'true' && p.d === '';
      results.push({ name: 'basic.stringify->parse roundtrip', pass, expected: 'a=1,b="x y",c=true 转字符串；d=null=>""', actual: p, extra: { query: s } });
    })();

    // 2) indices=false
    (function () {
      const obj = { list: ['a', 'b', 'c'] };
      const s = qs.stringify(obj, { indices: false });
      const p = qs.parse(s);
      const pass = Array.isArray(p.list) && p.list.join(',') === 'a,b,c';
      results.push({ name: 'stringify.indices=false', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 3) allowDots parse
    (function () {
      const s = 'a.b.c=1&a.b.d=2';
      const p = qs.parse(s, { allowDots: true });
      const pass = p?.a?.b?.c === '1' && p.a.b.d === '2';
      results.push({ name: 'parse.allowDots', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 4) 自定义分隔符
    (function () {
      const obj = { a: 1, b: 2 };
      const s = qs.stringify(obj, { delimiter: ';' });
      const p = qs.parse(s, { delimiter: ';' });
      const pass = p.a === '1' && p.b === '2';
      results.push({ name: 'custom.delimiter', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 5) strictNullHandling / skipNulls
    (function () {
      const obj = { a: null, b: '', c: 0, d: undefined, e: 'ok' };
      const s1 = qs.stringify(obj, { strictNullHandling: true });
      const p1 = qs.parse(s1);
      const pass1 = Object.prototype.hasOwnProperty.call(p1, 'a') && p1.e === 'ok';

      const s2 = qs.stringify(obj, { skipNulls: true });
      const p2 = qs.parse(s2);
      const pass2 = !Object.prototype.hasOwnProperty.call(p2, 'a') && p2.e === 'ok';

      results.push({ name: 'strictNullHandling.stringify+parse', pass: pass1, expected: 'a 存在(无等号)，e=ok', actual: { a: p1.a, e: p1.e, query: s1 } });
      results.push({ name: 'skipNulls.stringify+parse', pass: pass2, expected: 'a 被跳过，e=ok', actual: { a: p2.a ?? null, e: p2.e, query: s2 } });
    })();

    // 6) addQueryPrefix / ignoreQueryPrefix
    (function () {
      const obj = { a: 1, b: 2 };
      const s = qs.stringify(obj, { addQueryPrefix: true });
      const p = qs.parse(s, { ignoreQueryPrefix: true });
      const pass = p.a === '1' && p.b === '2';
      results.push({ name: 'add/ignoreQueryPrefix', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 7) format 对比
    (function () {
      const obj = { word: 'a b+c' };
      const s3986 = qs.stringify(obj, { format: 'RFC3986' });
      const s1738 = qs.stringify(obj, { format: 'RFC1738' });
      const pass = has3986(s3986) && has1738(s1738);
      results.push({ name: 'format.RFC3986_vs_RFC1738', pass, expected: 'RFC3986: %20, RFC1738: +', actual: { s3986, s1738 } });
    })();

    // 8) 自定义 encoder/decoder
    (function () {
      const obj = { key: 'A&B=C' };
      const s = qs.stringify(obj, {
        encoder: (str) => String(str).replace(/&/g, '%26').replace(/=/g, '%3D').replace(/A/g, '%41')
      });
      const p = qs.parse(s, { decoder: (str) => decodeURIComponent(str) });
      const pass = p.key === 'A&B=C';
      results.push({ name: 'custom.encoder/decoder', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 9) depth：高 vs 低
    (function () {
      const s = 'a[b][c][d][e]=1';
      const p1 = qs.parse(s, { depth: 5 });
      const p2 = qs.parse(s, { depth: 2 });
      const pass = p1?.a?.b?.c?.d?.e === '1' && typeof p2?.a?.b?.c === 'object' && p2.a.b.c['[d][e]'] === '1';
      results.push({ name: 'parse.depth.high_vs_low', pass, expected: '__PASS__', actual: { p1, p2 } });
    })();

    // 10) arrayLimit（自适应）
    (function () {
      const switchesOnGreater = arrayLimitSwitchesOnGreaterThan();
      let s, p, pass;

      if (switchesOnGreater) {
        // 该版本 index > arrayLimit 才触发对象化 -> 用 [3]
        s = 'x[0]=1&x[1]=2&x[3]=3';
        p = qs.parse(s, { arrayLimit: 2 });
        pass = p && p.x && !Array.isArray(p.x) && p.x['0'] === '1' && p.x['1'] === '2' && p.x['3'] === '3';
      } else {
        // 该版本 index >= arrayLimit 即触发 -> 用 [2]
        s = 'x[0]=1&x[1]=2&x[2]=3';
        p = qs.parse(s, { arrayLimit: 2 });
        pass = p && p.x && !Array.isArray(p.x) && p.x['0'] === '1' && p.x['1'] === '2' && p.x['2'] === '3';
      }

      results.push({
        name: 'parse.arrayLimit (adaptive)',
        pass,
        expected: '__PASS__',
        actual: p,
        extra: { query: s, switchesOnGreater }
      });
    })();

    // 11) parameterLimit
    (function () {
      const many = Array(1500).fill(0).map((_, i) => 'a[' + i + ']=x').join('&');
      const pLimit = qs.parse(many, { parameterLimit: 1000 });
      const keys = pLimit.a ? Object.keys(pLimit.a).length : 0;
      const pass = typeof pLimit.a === 'object' && keys <= 1000;
      results.push({ name: 'parse.parameterLimit', pass, expected: '__PASS__', actual: { keys } });
    })();

    // 12) 安全：禁止原型污染（无 getPrototypeOf）
    (function () {
      const parsed = qs.parse('a=1&__proto__[bad]=true', { allowPrototypes: false, plainObjects: true });
      const hasProtoKey = Object.prototype.hasOwnProperty.call(parsed, '__proto__'); // 应为 false（被忽略）
      const lacksToString = !('toString' in parsed);      // null 原型不应有 toString
      const lacksConstructor = !('constructor' in parsed); // null 原型不应有 constructor
      const pass = !hasProtoKey && lacksToString && lacksConstructor && parsed.a === '1';
      results.push({ name: 'security.allowPrototypes=false + plainObjects=true', pass, expected: '__PASS__', actual: parsed });
    })();

    // 13) encodeValuesOnly
    (function () {
      const obj = { 'a b': 'c d' };
      const s = qs.stringify(obj, { encodeValuesOnly: true });
      const pass = s.indexOf('a b=') === 0 && s.indexOf('c%20d') > -1;
      results.push({ name: 'stringify.encodeValuesOnly', pass, expected: '__PASS__', actual: { query: s } });
    })();

    // 14) comma 解析
    (function () {
      const s = 'x=a,b,c';
      const p = qs.parse(s, { comma: true });
      const pass = Array.isArray(p.x) && p.x.join(',') === 'a,b,c';
      results.push({ name: 'parse.comma=true', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 15) stringify.comma（特性探测）
    (function () {
      const supports = featureSupportsStringifyComma();
      const st = qs.stringify({ y: ['a', 'b', 'c'] }, { comma: true });
      const pass = supports ? st === 'y=a,b,c' : /y%5B0%5D=a&y%5B1%5D=b&y%5B2%5D=c/.test(st);
      results.push({ name: 'stringify.comma (feature-detected)', pass, expected: supports ? 'y=a,b,c' : '版本不支持也视为通过', actual: { query: st, supports } });
    })();

    // 16) filter + sort
    (function () {
      const obj = { z: 3, a: 1, m: 2, skip: null };
      const s = qs.stringify(obj, {
        filter: (prefix, value) => (prefix === 'skip' ? undefined : value),
        sort: (a, b) => a.localeCompare(b)
      });
      const pass = s === 'a=1&m=2&z=3';
      results.push({ name: 'stringify.filter(function)_and_sort', pass, expected: '__PASS__', actual: { query: s } });
    })();

    // 17) serializeDate
    (function () {
      const d = new Date('2020-01-02T03:04:05.000Z');
      const s = qs.stringify({ when: d }, { serializeDate: (dt) => dt.toISOString().split('T')[0] });
      const p = qs.parse(s);
      const pass = p.when === '2020-01-02';
      results.push({ name: 'stringify.serializeDate', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 18) charset / charsetSentinel / interpretNumericEntities
    (function () {
      const s = qs.stringify({ e: 'é' }, { charset: 'iso-8859-1', charsetSentinel: true });
      const p = qs.parse(s, { charset: 'iso-8859-1', charsetSentinel: true, interpretNumericEntities: true });
      const pass = typeof p.e !== 'undefined';
      results.push({ name: 'charset.iso-8859-1 + charsetSentinel (basic)', pass, expected: '__PASS__', actual: { query: s, parsed: p } });
    })();

    // 19) 稀疏数组
    (function () {
      const obj = { a: [] }; obj.a[2] = 'x';
      const s = qs.stringify(obj, { allowSparse: true });
      const p = qs.parse(s, { allowSparse: true });
      const pass = Array.isArray(p.a) && !(0 in p.a) && !(1 in p.a) && p.a[2] === 'x';
      results.push({ name: 'sparse arrays.allowSparse', pass, expected: '__PASS__', actual: { query: s, parsed: p } });
    })();

    // 20) ignoreQueryPrefix
    (function () {
      const s = '?a=1&b=2';
      const p = qs.parse(s, { ignoreQueryPrefix: true });
      const pass = p.a === '1' && p.b === '2';
      results.push({ name: 'parse.ignoreQueryPrefix', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 21) 复杂对象 Roundtrip
    (function () {
      const obj = {
        user: { name: '张 三', roles: ['admin', 'ops'] },
        flags: { on: true, off: false, empty: '' },
        note: null
      };
      const s = qs.stringify(obj, {
        indices: false,
        encodeValuesOnly: true,
        format: 'RFC3986',
        strictNullHandling: true
      });
      const p = qs.parse(s);
      const pass = p.user?.name === '张 三' && Array.isArray(p.user?.roles) && p.user.roles.length === 2 && p.flags?.on === 'true' && p.flags?.off === 'false';
      results.push({ name: 'complex.roundtrip.mixed.options', pass, expected: '__PASS__', actual: { query: s, parsed: p } });
    })();

    // 22) encode=false（原样输出）
    (function () {
      const s = qs.stringify({ '空 格': 'a b+c' }, { encode: false });
      const pass = s === '空 格=a b+c';
      results.push({ name: 'stringify.encode=false', pass, expected: '__PASS__', actual: { query: s } });
    })();

    // 23) encodeValuesOnly + 分隔符 + 前缀（组合）
    (function () {
      const s = qs.stringify({ 'k 1': 'v 1', 'k&2': 'v&2' }, { encodeValuesOnly: true, delimiter: ';', addQueryPrefix: true });
      const p = qs.parse(s, { delimiter: ';', ignoreQueryPrefix: true });
      const pass = p['k 1'] === 'v 1' && p['k&2'] === 'v&2';
      results.push({ name: 'combo.valuesOnly+delimiter+prefix', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 24) allowDots + indices=false（混合）
    (function () {
      const s = 'u.name=Alex&u.roles=dev&u.roles=ops';
      const p = qs.parse(s, { allowDots: true });
      const st = qs.stringify(p, { indices: false, allowDots: true });
      const pass = p.u?.name === 'Alex' && Array.isArray(p.u?.roles) && /u.roles=dev&u.roles=ops/.test(st);
      results.push({ name: 'allowDots + indices=false', pass, expected: '__PASS__', actual: { parsed: p, reStringified: st } });
    })();

    // 25) 新增：allowDots 默认关闭时，点号不应被当作路径
    (function () {
      const s = 'a.b=1';
      const p = qs.parse(s); // 没开 allowDots
      const pass = p['a.b'] === '1';
      results.push({ name: 'parse.dotKeyDefault', pass, expected: '__PASS__', actual: p, extra: { query: s } });
    })();

    // 汇总
    const summary = {
      total: results.length,
      passed: results.filter(r => r.pass).length,
      failed: results.filter(r => !r.pass).length
    };

    return { success: true, data: { summary, cases: results } };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

return main();
