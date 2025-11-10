/**
 * 测试 Web API 原生 FormData (浏览器/Node.js 18+)
 * 测试域名: https://httpbin.qingflow.dpdns.org
 * 
 * 环境要求: Node.js >= 18 (支持原生 fetch 和 FormData)
 * 无需安装额外依赖
 * 
 * 注意: 此测试使用 Web API 标准的 FormData,不是 form-data 包
 */

const BASE_URL = 'https://httpbin.qingflow.dpdns.org';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    log(`✓ ${name}`, 'green');
    passed++;
  } catch (error) {
    log(`✗ ${name}`, 'red');
    log(`  错误: ${error.message}`, 'red');
    failed++;
  }
}

console.log('\n╔════════════════════════════════════════════════════════╗');
log('║       Web API FormData 完整功能测试                    ║', 'cyan');
log('║       测试域名: https://httpbin.qingflow.dpdns.org     ║', 'cyan');
log('║       环境: Node.js >= 18 或现代浏览器                  ║', 'cyan');
console.log('╚════════════════════════════════════════════════════════╝\n');

(async () => {
  // 检查环境
  if (typeof FormData === 'undefined') {
    log('❌ 错误: 当前环境不支持 FormData API', 'red');
    log('   请使用 Node.js >= 18 或现代浏览器', 'yellow');
    process.exit(1);
  }

  // ============ 1. 基础字段测试 ============
  log('━━━ 测试 1: 基础表单字段 ━━━', 'cyan');

  await test('添加简单字符串字段', async () => {
    const form = new FormData();
    form.append('name', 'John Doe');
    form.append('email', 'john@example.com');
    form.append('age', '30');
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.name !== 'John Doe') throw new Error('name 字段错误');
    if (data.form.email !== 'john@example.com') throw new Error('email 字段错误');
    if (data.form.age !== '30') throw new Error('age 字段错误');
  });

  await test('自动转换数字和布尔值', async () => {
    const form = new FormData();
    // Web API FormData 会自动转换为字符串
    form.append('count', 123);
    form.append('price', 99.99);
    form.append('active', true);
    form.append('inactive', false);
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    // 验证自动转换
    if (data.form.count !== '123') throw new Error('count 字段错误');
    if (data.form.price !== '99.99') throw new Error('price 字段错误');
    if (data.form.active !== 'true') throw new Error('active 字段错误');
  });

  await test('添加特殊字符和中文', async () => {
    const form = new FormData();
    form.append('chinese', '你好世界');
    form.append('emoji', '🎉🚀✨');
    form.append('special', 'a&b=c d+e');
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.chinese !== '你好世界') throw new Error('中文字段错误');
    if (data.form.emoji !== '🎉🚀✨') throw new Error('emoji 字段错误');
    if (data.form.special !== 'a&b=c d+e') throw new Error('特殊字符错误');
  });

  // ============ 2. 文件上传测试 (Blob) ============
  log('\n━━━ 测试 2: 文件上传 (Blob) ━━━', 'cyan');

  await test('上传 Blob 作为文件', async () => {
    const form = new FormData();
    const blob = new Blob(['This is file content from blob'], { type: 'text/plain' });
    form.append('file', blob, 'test.txt');
    
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (!data.files || !data.files.file) throw new Error('文件未上传');
  });

  await test('上传不同类型的 Blob', async () => {
    const form = new FormData();
    
    // JSON Blob
    const jsonBlob = new Blob([JSON.stringify({ key: 'value' })], { 
      type: 'application/json' 
    });
    form.append('json_file', jsonBlob, 'data.json');
    
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (!data.files || !data.files.json_file) throw new Error('JSON 文件未上传');
  });

  await test('上传多个文件', async () => {
    const form = new FormData();
    
    const file1 = new Blob(['File 1 content'], { type: 'text/plain' });
    const file2 = new Blob(['File 2 content'], { type: 'text/plain' });
    const file3 = new Blob(['File 3 content'], { type: 'text/plain' });
    
    form.append('file1', file1, 'file1.txt');
    form.append('file2', file2, 'file2.txt');
    form.append('file3', file3, 'file3.txt');
    
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (!data.files) throw new Error('文件未上传');
    const fileCount = Object.keys(data.files).length;
    if (fileCount !== 3) throw new Error(`期望3个文件,得到${fileCount}个`);
  });

  await test('混合文件和表单字段', async () => {
    const form = new FormData();
    form.append('description', 'Test upload with metadata');
    form.append('category', 'documents');
    
    const blob = new Blob(['Document content'], { type: 'text/plain' });
    form.append('file', blob, 'document.txt');
    
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.description !== 'Test upload with metadata') throw new Error('表单字段错误');
    if (!data.files || !data.files.file) throw new Error('文件未上传');
  });

  await test('上传大 Blob (10KB)', async () => {
    const form = new FormData();
    const largeContent = 'x'.repeat(10 * 1024);
    const blob = new Blob([largeContent], { type: 'text/plain' });
    form.append('large_file', blob, 'large.txt');
    
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (!data.files || !data.files.large_file) throw new Error('大文件上传失败');
  });

  // ============ 3. FormData 方法测试 ============
  log('\n━━━ 测试 3: FormData 方法 ━━━', 'cyan');

  await test('set() 方法 - 设置/覆盖字段', async () => {
    const form = new FormData();
    form.append('name', 'John');
    form.set('name', 'Jane'); // 覆盖
    form.set('age', '25');    // 新增
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.name !== 'Jane') throw new Error('set() 覆盖失败');
    if (data.form.age !== '25') throw new Error('set() 新增失败');
  });

  await test('get() 方法 - 获取字段值', async () => {
    const form = new FormData();
    form.append('name', 'John');
    form.append('age', '30');
    
    const name = form.get('name');
    const age = form.get('age');
    const missing = form.get('missing');
    
    if (name !== 'John') throw new Error('get() 获取失败');
    if (age !== '30') throw new Error('get() 获取失败');
    if (missing !== null) throw new Error('get() 应返回 null');
  });

  await test('getAll() 方法 - 获取重复字段', async () => {
    const form = new FormData();
    form.append('tags', 'tag1');
    form.append('tags', 'tag2');
    form.append('tags', 'tag3');
    
    const tags = form.getAll('tags');
    
    if (!Array.isArray(tags)) throw new Error('getAll() 应返回数组');
    if (tags.length !== 3) throw new Error('getAll() 数组长度错误');
    if (tags[0] !== 'tag1') throw new Error('getAll() 值错误');
  });

  await test('has() 方法 - 检查字段存在', async () => {
    const form = new FormData();
    form.append('name', 'John');
    
    if (!form.has('name')) throw new Error('has() 应返回 true');
    if (form.has('missing')) throw new Error('has() 应返回 false');
  });

  await test('delete() 方法 - 删除字段', async () => {
    const form = new FormData();
    form.append('name', 'John');
    form.append('age', '30');
    
    form.delete('age');
    
    if (form.has('age')) throw new Error('delete() 删除失败');
    if (!form.has('name')) throw new Error('delete() 误删其他字段');
  });

  await test('keys() 方法 - 遍历字段名', async () => {
    const form = new FormData();
    form.append('name', 'John');
    form.append('age', '30');
    form.append('city', 'NYC');
    
    const keys = Array.from(form.keys());
    
    if (keys.length !== 3) throw new Error('keys() 数量错误');
    if (!keys.includes('name')) throw new Error('keys() 缺少字段');
  });

  await test('values() 方法 - 遍历字段值', async () => {
    const form = new FormData();
    form.append('name', 'John');
    form.append('age', '30');
    
    const values = Array.from(form.values());
    
    if (values.length !== 2) throw new Error('values() 数量错误');
    if (!values.includes('John')) throw new Error('values() 缺少值');
  });

  await test('entries() 方法 - 遍历键值对', async () => {
    const form = new FormData();
    form.append('name', 'John');
    form.append('age', '30');
    
    const entries = Array.from(form.entries());
    
    if (entries.length !== 2) throw new Error('entries() 数量错误');
    if (entries[0][0] !== 'name' || entries[0][1] !== 'John') {
      throw new Error('entries() 键值对错误');
    }
  });

  await test('forEach() 方法 - 迭代字段', async () => {
    const form = new FormData();
    form.append('name', 'John');
    form.append('age', '30');
    
    let count = 0;
    const fields = {};
    
    form.forEach((value, key) => {
      count++;
      fields[key] = value;
    });
    
    if (count !== 2) throw new Error('forEach() 迭代次数错误');
    if (fields.name !== 'John') throw new Error('forEach() 值错误');
  });

  // ============ 4. 边界情况测试 ============
  log('\n━━━ 测试 4: 边界情况 ━━━', 'cyan');

  await test('空 FormData', async () => {
    const form = new FormData();
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    
    if (res.status !== 200) throw new Error('空表单发送失败');
  });

  await test('重复字段名', async () => {
    const form = new FormData();
    form.append('tags', 'tag1');
    form.append('tags', 'tag2');
    form.append('tags', 'tag3');
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    // httpbin 可能只返回最后一个值或数组
    if (!data.form.tags) throw new Error('重复字段未处理');
  });

  await test('空字符串值', async () => {
    const form = new FormData();
    form.append('empty', '');
    form.append('space', ' ');
    form.append('normal', 'value');
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.empty !== '') throw new Error('空字符串处理错误');
    if (data.form.space !== ' ') throw new Error('空格处理错误');
  });

  await test('大量字段', async () => {
    const form = new FormData();
    for (let i = 0; i < 100; i++) {
      form.append(`field${i}`, `value${i}`);
    }
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    const fieldCount = Object.keys(data.form).length;
    if (fieldCount !== 100) throw new Error(`期望100个字段,得到${fieldCount}个`);
  });

  await test('null 和 undefined 值', async () => {
    const form = new FormData();
    form.append('null_value', null);
    form.append('undefined_value', undefined);
    form.append('normal', 'value');
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    // null 和 undefined 会被转为字符串
    if (data.form.null_value !== 'null') throw new Error('null 转换错误');
    if (data.form.undefined_value !== 'undefined') throw new Error('undefined 转换错误');
  });

  // ============ 5. 实际应用场景测试 ============
  log('\n━━━ 测试 5: 实际应用场景 ━━━', 'cyan');

  await test('用户注册表单', async () => {
    const form = new FormData();
    form.append('username', 'testuser');
    form.append('email', 'test@example.com');
    form.append('password', 'secret123');
    form.append('age', 25);
    form.append('terms', true);
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.username !== 'testuser') throw new Error('用户名错误');
    if (data.form.email !== 'test@example.com') throw new Error('邮箱错误');
    if (data.form.age !== '25') throw new Error('年龄错误');
  });

  await test('文件上传 + 元数据', async () => {
    const form = new FormData();
    form.append('title', 'My Document');
    form.append('description', 'Important document');
    form.append('tags', 'work,important');
    
    const blob = new Blob(['Document content here'], { type: 'application/pdf' });
    form.append('file', blob, 'document.pdf');
    
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.title !== 'My Document') throw new Error('标题错误');
    if (!data.files || !data.files.file) throw new Error('文件未上传');
  });

  await test('多文件上传 (图片库)', async () => {
    const form = new FormData();
    form.append('album', 'Vacation 2024');
    
    // 模拟上传3张图片
    for (let i = 1; i <= 3; i++) {
      const blob = new Blob([`Image ${i} data`], { type: 'image/jpeg' });
      form.append(`photo${i}`, blob, `photo${i}.jpg`);
    }
    
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.album !== 'Vacation 2024') throw new Error('相册名错误');
    const fileCount = Object.keys(data.files || {}).length;
    if (fileCount !== 3) throw new Error(`期望3张图片,得到${fileCount}张`);
  });

  await test('API 数据提交 (JSON + 文件)', async () => {
    const form = new FormData();
    const metadata = {
      user_id: 123,
      timestamp: Date.now(),
      action: 'upload'
    };
    form.append('metadata', JSON.stringify(metadata));
    
    const blob = new Blob(['CSV data here'], { type: 'text/csv' });
    form.append('data_file', blob, 'data.csv');
    
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    const parsedMetadata = JSON.parse(data.form.metadata);
    if (parsedMetadata.user_id !== 123) throw new Error('元数据解析错误');
    if (!data.files || !data.files.data_file) throw new Error('数据文件未上传');
  });

  await test('动态表单构建', async () => {
    const formData = {
      name: 'John',
      age: 30,
      city: 'NYC',
      active: true
    };
    
    const form = new FormData();
    for (const [key, value] of Object.entries(formData)) {
      form.append(key, value);
    }
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.name !== 'John') throw new Error('动态构建失败');
    if (data.form.age !== '30') throw new Error('数字转换失败');
  });

  // ============ 6. 与其他 API 集成测试 ============
  log('\n━━━ 测试 6: 与其他 API 集成 ━━━', 'cyan');

  await test('URLSearchParams 转 FormData', async () => {
    const params = new URLSearchParams();
    params.append('name', 'John');
    params.append('age', '30');
    
    const form = new FormData();
    for (const [key, value] of params.entries()) {
      form.append(key, value);
    }
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.name !== 'John') throw new Error('URLSearchParams 转换失败');
  });

  await test('Object 转 FormData', async () => {
    const obj = {
      name: 'John',
      age: 30,
      active: true,
      tags: ['tag1', 'tag2']
    };
    
    const form = new FormData();
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, value);
      }
    }
    
    const res = await fetch(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    const data = await res.json();
    
    if (data.form.name !== 'John') throw new Error('Object 转换失败');
  });

  await test('使用 Request 对象', async () => {
    const form = new FormData();
    form.append('name', 'John');
    form.append('age', '30');
    
    const request = new Request(`${BASE_URL}/post`, {
      method: 'POST',
      body: form
    });
    
    const res = await fetch(request);
    const data = await res.json();
    
    if (data.form.name !== 'John') throw new Error('Request 对象使用失败');
  });

  // ============ 测试结果汇总 ============
  console.log('\n╔════════════════════════════════════════════════════════╗');
  log('║                    测试结果汇总                         ║', 'cyan');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  log(`总测试数: ${passed + failed}`, 'blue');
  log(`✓ 通过: ${passed}`, 'green');
  log(`✗ 失败: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`📊 成功率: ${((passed / (passed + failed)) * 100).toFixed(2)}%\n`, 'cyan');

  if (failed === 0) {
    log('🎉 所有 Web API FormData 功能测试通过!', 'green');
  } else {
    log('⚠️  部分测试失败,请检查上述错误信息', 'yellow');
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  log('║            Web API FormData 功能覆盖总结                ║', 'cyan');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  log('✅ 测试覆盖的功能:', 'cyan');
  log('  1. 基础字段 - 字符串、自动类型转换、特殊字符', 'reset');
  log('  2. 文件上传 - Blob、多文件、混合表单', 'reset');
  log('  3. FormData 方法 - set/get/has/delete/keys/values/entries/forEach', 'reset');
  log('  4. 边界情况 - 空表单、重复字段、大量字段、null/undefined', 'reset');
  log('  5. 实际场景 - 注册表单、文件+元数据、动态构建', 'reset');
  log('  6. API 集成 - URLSearchParams、Object、Request', 'reset');
  console.log('');

})().catch(error => {
  log(`\n测试运行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
