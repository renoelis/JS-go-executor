// qs.stringify() 批次3: 高级功能测试 (filter, sort, encoder, serializeDate)
// 版本: qs v6.14.0
// 用例数: 约 40 个

const qs = require('qs');

async function main() {
  try {
    const detail = [];
    let total = 0, pass = 0;

    function t(name, got, expect) {
      total++;
      const ok = got === expect;
      detail.push({ case: name, expect, got, pass: ok });
      console.log(`${ok ? '✅' : '❌'} ${name}`);
      if (ok) pass++;
      return ok;
    }

    console.log('📦 批次3: 高级功能测试\n');

    // filter 选项 - 数组形式
    console.log('filter 选项测试 (数组形式):');
    t('stringify with filter array', 
      qs.stringify({ a: 'b', c: 'd', e: 'f' }, { filter: ['a', 'c'] }), 
      'a=b&c=d');
    t('stringify with filter array (mixed)', 
      qs.stringify({ a: 'b', c: { d: 'e' }, f: 'g' }, { filter: ['a', 'f'] }), 
      'a=b&f=g');
    t('stringify empty filter', 
      qs.stringify({ a: 'b', c: 'd' }, { filter: [] }), 
      '');
    t('stringify filter non-existent keys', 
      qs.stringify({ a: 'b' }, { filter: ['c', 'd'] }), 
      '');

    // filter 选项 - 函数形式
    console.log('\nfilter 选项测试 (函数形式):');
    t('stringify with filter function (uppercase values)', 
      qs.stringify({ a: 'hello', b: 'world' }, { 
        filter: function(prefix, value) {
          if (typeof value === 'string') {
            return value.toUpperCase();
          }
          return value;
        }
      }), 
      'a=HELLO&b=WORLD');
    
    t('stringify filter function skip keys', 
      qs.stringify({ a: 'b', c: 'd', e: 'f' }, { 
        filter: function(prefix, value) {
          if (prefix === 'c') return undefined;
          return value;
        }
      }), 
      'a=b&e=f');

    t('stringify filter function modify values', 
      qs.stringify({ a: 1, b: 2, c: 3 }, { 
        filter: function(prefix, value) {
          if (typeof value === 'number') {
            return value * 2;
          }
          return value;
        }
      }), 
      'a=2&b=4&c=6');

    // sort 选项
    console.log('\nsort 选项测试:');
    t('stringify without sort (insertion order)', 
      qs.stringify({ z: '1', a: '2', m: '3' }), 
      'z=1&a=2&m=3');
    
    t('stringify with sort function (alphabetical)', 
      qs.stringify({ z: '1', a: '2', m: '3' }, { 
        sort: function(a, b) {
          return a.localeCompare(b);
        }
      }), 
      'a=2&m=3&z=1');

    t('stringify with sort function (reverse)', 
      qs.stringify({ a: '1', b: '2', c: '3' }, { 
        sort: function(a, b) {
          return b.localeCompare(a);
        }
      }), 
      'c=3&b=2&a=1');

    t('stringify nested with sort', 
      qs.stringify({ z: { b: '1', a: '2' }, m: '3' }, { 
        sort: function(a, b) {
          return a.localeCompare(b);
        }
      }), 
      'm=3&z%5Ba%5D=2&z%5Bb%5D=1');

    // encoder 选项
    console.log('\nencoder 选项测试:');
    t('stringify with custom encoder (no encoding)', 
      qs.stringify({ a: 'b c' }, { 
        encoder: function(str) {
          return str;
        }
      }), 
      'a=b c');

    t('stringify with custom encoder (uppercase)', 
      qs.stringify({ a: 'hello' }, { 
        encoder: function(str) {
          return str.toUpperCase();
        }
      }), 
      'A=HELLO');

    t('stringify with encoder that uses defaultEncoder', 
      qs.stringify({ a: 'b c' }, { 
        encoder: function(str, defaultEncoder) {
          return 'x_' + defaultEncoder(str);
        }
      }), 
      'x_a=x_b%20c');

    // serializeDate 选项
    console.log('\nserializeDate 选项测试:');
    const testDate = new Date('2023-01-15T10:30:00.000Z');
    
    t('stringify Date with default serialization', 
      qs.stringify({ date: testDate }), 
      'date=2023-01-15T10%3A30%3A00.000Z');

    t('stringify Date with custom serializeDate', 
      qs.stringify({ date: testDate }, { 
        serializeDate: function(date) {
          return date.toISOString().split('T')[0];
        }
      }), 
      'date=2023-01-15');

    t('stringify Date with custom format', 
      qs.stringify({ date: testDate }, { 
        serializeDate: function(date) {
          return 'custom_' + date.getTime();
        }
      }), 
      'date=custom_1673778600000');

    t('stringify multiple dates', 
      qs.stringify({ 
        start: new Date('2023-01-01T00:00:00.000Z'),
        end: new Date('2023-12-31T23:59:59.000Z')
      }, {
        serializeDate: function(date) {
          return date.toISOString().split('T')[0];
        }
      }), 
      'start=2023-01-01&end=2023-12-31');

    t('stringify nested date', 
      qs.stringify({ 
        event: { date: testDate }
      }, {
        serializeDate: function(date) {
          return date.toISOString().split('T')[0];
        }
      }), 
      'event%5Bdate%5D=2023-01-15');

    // 组合选项测试
    console.log('\n组合选项测试:');
    t('stringify allowDots + sort', 
      qs.stringify({ z: { b: '1' }, a: { c: '2' } }, { 
        allowDots: true,
        sort: function(a, b) { return a.localeCompare(b); }
      }), 
      'a.c=2&z.b=1');

    t('stringify skipNulls + filter', 
      qs.stringify({ a: 'b', c: null, d: 'e' }, { 
        skipNulls: true,
        filter: ['a', 'c', 'd']
      }), 
      'a=b&d=e');

    t('stringify encode=false + allowDots', 
      qs.stringify({ a: { b: 'c d' } }, { 
        encode: false,
        allowDots: true
      }), 
      'a.b=c d');

    t('stringify arrayFormat=comma + sort', 
      qs.stringify({ z: [1, 2], a: [3, 4] }, { 
        arrayFormat: 'comma',
        sort: function(a, b) { return a.localeCompare(b); }
      }), 
      'a=3%2C4&z=1%2C2');

    t('stringify addQueryPrefix + charsetSentinel', 
      qs.stringify({ a: 'b' }, { 
        addQueryPrefix: true,
        charsetSentinel: true
      }), 
      '?utf8=%E2%9C%93&a=b');

    t('stringify encodeValuesOnly + delimiter', 
      qs.stringify({ 'a b': 'c d', 'e f': 'g h' }, { 
        encodeValuesOnly: true,
        delimiter: ';'
      }), 
      'a b=c%20d;e f=g%20h');

    // 汇总
    const summary = { total, pass, fail: total - pass };
    const testResults = {
      success: summary.fail === 0,
      summary,
      detail
    };

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('批次3测试汇总:', JSON.stringify(summary, null, 2));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return testResults;

  } catch (err) {
    const result = {
      success: false,
      error: {
        message: err && err.message,
        stack: err && err.stack
      }
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
}

return main();

