/**
 * 📊 简化版测试：Excel 生成 + OSS 上传（推荐方式）
 * 
 * 场景：
 * 1. 创建业务数据并生成 Excel
 * 2. 直接上传 Buffer 到 OSS（使用 PUT 方式，更简单）
 * 3. 返回文件访问 URL
 * 
 * 注意：这个版本使用更简单的方式，不依赖 FormData
 */

const axios = require('axios');
const xlsx = require('xlsx');
const dateFns = require('date-fns');

console.log('========================================');
console.log('📊 简化版：Excel 生成 + OSS 上传');
console.log('========================================\n');

// Step 1: 创建业务数据
console.log('📝 Step 1: 创建业务数据...');
const orders = [];
for (let i = 1; i <= 20; i++) {
  orders.push({
    '订单编号': 'ORD' + String(i).padStart(4, '0'),
    '客户名称': '客户' + i,
    '订单金额': (Math.random() * 5000 + 500).toFixed(2),
    '税额': (Math.random() * 500 + 50).toFixed(2),
    '总计': 0,  // 将在后面计算
    '下单日期': dateFns.format(new Date(2025, 0, i), 'yyyy-MM-dd'),
    '状态': i % 3 === 0 ? '已完成' : (i % 3 === 1 ? '处理中' : '待支付')
  });
}

// 业务逻辑：计算总计
orders.forEach(function(order) {
  const amount = parseFloat(order['订单金额']);
  const tax = parseFloat(order['税额']);
  order['总计'] = (amount + tax).toFixed(2);
});

console.log('   ✅ 已创建 ' + orders.length + ' 条订单数据');
console.log('   📊 统计: ');
console.log('      - 已完成: ' + orders.filter(function(o) { return o['状态'] === '已完成'; }).length);
console.log('      - 处理中: ' + orders.filter(function(o) { return o['状态'] === '处理中'; }).length);
console.log('      - 待支付: ' + orders.filter(function(o) { return o['状态'] === '待支付'; }).length);
console.log('');

// Step 2: 生成 Excel
console.log('📝 Step 2: 生成 Excel 文件...');
const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(orders);

// 添加工作表
xlsx.utils.book_append_sheet(workbook, worksheet, '订单明细');

// 添加汇总工作表
const summary = [{
  '项目': '订单总数',
  '数值': orders.length
}, {
  '项目': '订单总额',
  '数值': orders.reduce(function(sum, o) { return sum + parseFloat(o['订单金额']); }, 0).toFixed(2)
}, {
  '项目': '税额总计',
  '数值': orders.reduce(function(sum, o) { return sum + parseFloat(o['税额']); }, 0).toFixed(2)
}, {
  '项目': '总计',
  '数值': orders.reduce(function(sum, o) { return sum + parseFloat(o['总计']); }, 0).toFixed(2)
}, {
  '项目': '生成时间',
  '数值': dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss')
}];

const summarySheet = xlsx.utils.json_to_sheet(summary);
xlsx.utils.book_append_sheet(workbook, summarySheet, '汇总数据');

// 写入 Buffer
const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
console.log('   ✅ Excel 文件已生成');
console.log('      - 文件大小: ' + excelBuffer.length + ' bytes');
console.log('      - 工作表数量: ' + workbook.SheetNames.length);
console.log('      - 工作表名称: ' + workbook.SheetNames.join(', '));
console.log('');

// Step 3: 上传到 OSS
console.log('📝 Step 3: 准备上传到 OSS...');

// 生成文件名
const timestamp = Date.now();
const filename = 'orders-report-' + timestamp + '.xlsx';
const objectKey = 'excel-reports/' + filename;

console.log('   📤 上传信息:');
console.log('      - 文件名: ' + filename);
console.log('      - 对象路径: ' + objectKey);
console.log('      - 文件大小: ' + (excelBuffer.length / 1024).toFixed(2) + ' KB');
console.log('');

// 方式 1: 使用 FormData（推荐）
console.log('📡 开始上传（使用 FormData）...\n');

return new Promise(function(resolve, reject) {
  setTimeout(function() {
    // 创建 FormData（使用环境提供的 FormData）
    const FormData = require('form-data');
    const formData = new FormData();
    
    // 创建 Blob 对象来包装 Buffer
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    // 添加字段到 FormData
    formData.append('file', blob, filename);
    formData.append('bucket_name', 'renoelis-bucket');
    formData.append('endpoint', 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com');
    formData.append('access_key_id', 'dbe49459ff0a510d1b01674c333c11fe');
    formData.append('secret_access_key', '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e');
    formData.append('custom_domain', 'https://bucket.renoelis.dpdns.org');
    formData.append('object_key', objectKey);
    
    console.log('📋 上传配置:');
    console.log(JSON.stringify({
      bucket: 'renoelis-bucket',
      objectKey: objectKey,
      fileSize: excelBuffer.length
    }, null, 2));
    console.log('');
    
    // 实际上传请求
    axios.post('https://api.renoelis.top/R2api/upload-direct', formData, {
      headers: {
        'Authorization': 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi'
        // 注意：不要手动设置 Content-Type，FormData 会自动设置正确的 boundary
      },
      timeout: 30000  // 30 秒超时
    })
    .then(function(response) {
      console.log('========================================');
      console.log('✅ 上传成功！');
      console.log('========================================\n');
      
      const fileUrl = 'https://bucket.renoelis.dpdns.org/' + objectKey;
      
      console.log('📊 上传结果:');
      console.log('   HTTP 状态: ' + response.status);
      console.log('   文件地址: ' + fileUrl);
      console.log('');
      
      if (response.data) {
        console.log('📄 服务器响应:');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('');
      }
      
      resolve({
        success: true,
        message: 'Excel 文件已成功上传到 OSS',
        fileInfo: {
          filename: filename,
          objectKey: objectKey,
          size: excelBuffer.length,
          sizeKB: (excelBuffer.length / 1024).toFixed(2),
          url: fileUrl,
          uploadTime: dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
          ordersCount: orders.length
        },
        serverResponse: response.data
      });
    })
    .catch(function(error) {
      console.log('========================================');
      console.log('❌ 上传失败');
      console.log('========================================\n');
      
      console.log('❌ 错误信息:');
      console.log('   错误类型: ' + (error.response ? 'HTTP错误' : '请求错误'));
      
      if (error.response) {
        console.log('   HTTP 状态: ' + error.response.status);
        console.log('   状态文本: ' + error.response.statusText);
        console.log('   错误详情: ' + JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.log('   错误: 未收到服务器响应');
        console.log('   详情: ' + error.message);
      } else {
        console.log('   错误: ' + error.message);
      }
      console.log('');
      
      // 即使上传失败，也返回生成的 Excel 信息
      resolve({
        success: false,
        message: '上传失败，但 Excel 已生成',
        error: error.message,
        fileInfo: {
          filename: filename,
          size: excelBuffer.length,
          sizeKB: (excelBuffer.length / 1024).toFixed(2),
          ordersCount: orders.length,
          generatedAt: dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss')
        },
        note: '文件已在内存中生成，可以尝试其他上传方式'
      });
    });
  }, 100);
});

