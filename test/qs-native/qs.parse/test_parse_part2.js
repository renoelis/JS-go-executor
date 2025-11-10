// qs.parse() 补充测试脚本 - Part 2
// 版本: qs v6.14.0
// 目标: 补充边界和安全场景

const qs = require('qs');

async function main() {
  try {
    const detail = [];
    let total = 0, pass = 0;

    function t(name, got, expect) {
      total++;
      const ok = deepEqual(got, expect);
      detail.push({ case: name, expect, got, pass: ok });
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) pass++;
      return ok;
    }

    function deepEqual(a, b) {
      if (a === b) return true;
      if (a == null || b == null) return a === b;
      if (typeof a !== 'object' || typeof b !== 'object') return false;

      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (let key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!deepEqual(a[key], b[key])) return false;
      }

      return true;
    }

    // ==== 超深嵌套测试 ====
    t('parse very deep nesting (depth: 10)',
      qs.parse('a[b][c][d][e][f][g][h][i][j]=value', { depth: 10 }),
      { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: 'value' } } } } } } } } } }
    );

    // ==== allowDots 与多层嵌套 ====
    t('parse deep dots (allowDots: true)',
      qs.parse('a.b.c.d.e=value', { allowDots: true }),
      { a: { b: { c: { d: { e: 'value' } } } } }
    );

    // ==== 混合点号和方括号的复杂情况 ====
    t('parse mixed dots and brackets deep',
      qs.parse('a.b[c].d[e]=value', { allowDots: true }),
      { a: { b: { c: { d: { e: 'value' } } } } }
    );

    // ==== 特殊编码字符 ====
    t('parse encoded brackets in value',
      qs.parse('a=%5Bvalue%5D'),
      { a: '[value]' }
    );

    t('parse encoded equals in value',
      qs.parse('a=b%3Dc'),
      { a: 'b=c' }
    );

    // ==== __proto__ 各种变体测试 ====
    t('parse __proto__ uppercase (should be blocked)',
      qs.parse('__PROTO__[x]=y', { allowPrototypes: false }),
      { '__PROTO__': { x: 'y' } } // 大写不被视为原型污染
    );

    t('parse constructor[prototype] (should be blocked)',
      qs.parse('constructor[prototype][polluted]=yes', { allowPrototypes: false }),
      {}
    );

    // ==== 空值与 strictNullHandling ====
    t('parse strictNullHandling with empty value',
      qs.parse('a=&b=value', { strictNullHandling: true }),
      { a: '', b: 'value' }
    );

    // ==== 数组与 comma 组合 ====
    t('parse comma with nested array',
      qs.parse('a[b]=1,2,3', { comma: true }),
      { a: { b: ['1', '2', '3'] } }
    );

    // ==== delimiter 与特殊字符 ====
    t('parse delimiter with encoded chars',
      qs.parse('a=1%3Bb=2', { delimiter: ';' }),
      { 'a': '1;b=2' } // %3B 是编码的 ;，被解码后在值中
    );

    // ==== parseArrays: false 与数字键 ====
    t('parse numeric keys without parseArrays',
      qs.parse('0=a&1=b&2=c', { parseArrays: false }),
      { '0': 'a', '1': 'b', '2': 'c' }
    );

    // ==== arrayLimit 边界测试 ====
    t('parse arrayLimit exactly at limit',
      qs.parse('a[0]=1&a[1]=2&a[20]=21', { arrayLimit: 20 }),
      { a: ['1', '2', '21'] } // 索引 20 仍在限制内
    );

    // ==== 重复键与 duplicates 选项 ====
    t('parse duplicates: first',
      qs.parse('a=1&a=2&a=3', { duplicates: 'first' }),
      { a: '1' }
    );

    t('parse duplicates: last',
      qs.parse('a=1&a=2&a=3', { duplicates: 'last' }),
      { a: '3' }
    );

    // ==== 空数组测试 (allowEmptyArrays) ====
    t('parse allowEmptyArrays: true',
      qs.parse('a[]=', { allowEmptyArrays: true }),
      { a: [] }
    );

    // ==== charsetSentinel 与 iso-8859-1 ====
    t('parse charsetSentinel with iso marker',
      qs.parse('utf8=%26%2310003%3B&a=%A3', { charsetSentinel: true, charset: 'iso-8859-1' }),
      { a: '£' }
    );

    // ==== decodeDotInKeys 测试 ====
    t('parse decodeDotInKeys: true',
      qs.parse('a[b%2Ec]=d', { decodeDotInKeys: true }),
      { 'a[b': { 'c': 'd' } } // decodeDotInKeys 会导致方括号匹配失败
    );

    // ==== 数组索引超出 arrayLimit ====
    t('parse array index beyond limit',
      qs.parse('a[0]=x&a[100]=y', { arrayLimit: 20 }),
      { a: { '0': 'x', '100': 'y' } }
    );

    // ==== 混合数组索引和空括号 ====
    t('parse mixed indices and empty brackets',
      qs.parse('a[0]=first&a[]=second&a[2]=third', { parseArrays: true }),
      { a: ['first', 'second', 'third'] }
    );

    // ==== 特殊键名测试 ====
    t('parse empty key',
      qs.parse('=value'),
      {} // 空键被忽略
    );

    t('parse key with only brackets',
      qs.parse('[]=value'),
      { '0': 'value' } // [] 被展平为数字键
    );

    // ==== 嵌套对象与数组的组合 ====
    t('parse nested array in object',
      qs.parse('a[b][0]=1&a[b][1]=2&a[c]=3'),
      { a: { b: ['1', '2'], c: '3' } }
    );

    // ==== depth=false 测试 ====
    t('parse depth: false (no nesting)',
      qs.parse('a[b][c][d][e][f][g][h][i][j][k]=deep', { depth: false }),
      { 'a[b][c][d][e][f][g][h][i][j][k]': 'deep' } // depth: false 不解析嵌套
    );

    // ==== 连续的空括号 ====
    t('parse consecutive empty brackets',
      qs.parse('a[][][]=value'),
      { a: ['value'] } // 连续空括号被压缩
    );

    // ==== URL 实际场景测试 ====
    t('parse typical query string',
      qs.parse('search=test&page=1&limit=10&sort=desc'),
      { search: 'test', page: '1', limit: '10', sort: 'desc' }
    );

    t('parse filter query',
      qs.parse('filter[status]=active&filter[type]=user'),
      { filter: { status: 'active', type: 'user' } }
    );

    // ==== 安全：大量重复键 ====
    const manyDuplicates = Array(50).fill('a=1').join('&');
    const manyResult = qs.parse(manyDuplicates);
    t('parse many duplicate keys (should create array)',
      Array.isArray(manyResult.a) && manyResult.a.length === 50,
      true
    );

    // ==== 汇总结果 ====
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n' + '='.repeat(50));
    console.log('Part 2 测试汇总:');
    console.log(JSON.stringify(summary, null, 2));
    console.log('='.repeat(50) + '\n');

    return testResults;

  } catch (err) {
    const result = {
      success: false,
      error: {
        message: err && err.message,
        stack: err && err.stack
      },
      summary: { total, pass, fail: total - pass },
      detail
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
}

return main();
