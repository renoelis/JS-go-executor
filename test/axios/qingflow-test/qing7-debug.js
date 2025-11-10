const axios = require('axios');

const headers = {   
  'accessToken':  'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
  'Content-Type': 'application/json'
};

const apiUrl = 'https://api.qingflow.com';

// 如果使用主字段部门字段
const depart = input.depart;
const departid = input.departid;

// 将departid字符串分割为数组
const departIds = departid.split(',');

console.log('========== 调试信息 ==========');
console.log('部门名称数组：' + JSON.stringify(depart));
console.log('部门ID数组：' + JSON.stringify(departIds));

// 使用map函数将depart数组和departIds数组合并为所需的对象数组
const table = depart.map(function(name, index) {
    return {
        "部门": name,
        "部门id": departIds[index]
    };
});

console.log('处理后的 table：' + JSON.stringify(table));
console.log('==============================\n');

// 获取单个部门的用户列表（带详细调试信息）
async function getdepartuser(departmentId) {
  try {
    const url = apiUrl + '/department/' + departmentId + '/user?fetchChild=true';
    console.log('发起请求：' + url);
    
    const response = await axios.get(url, { 
      headers: headers
    });
    
    console.log('请求成功，响应状态码：' + response.status);
    console.log('响应数据结构：' + JSON.stringify(response.data).substring(0, 500) + '...');
    
    // 检查数据结构
    if (!response || !response.data) {
      console.log('❌ 错误：响应或响应数据为空');
      return { error: '响应数据为空', data: null };
    }
    
    console.log('response.data 存在：' + (response.data ? '是' : '否'));
    console.log('response.data.result 存在：' + (response.data.result ? '是' : '否'));
    
    if (response.data.result) {
      console.log('response.data.result.userList 存在：' + (response.data.result.userList ? '是' : '否'));
      if (response.data.result.userList) {
        console.log('userList 长度：' + response.data.result.userList.length);
      }
    }
    
    // 如果没有 result，尝试查看其他可能的字段
    if (!response.data.result) {
      console.log('可用字段：' + Object.keys(response.data).join(', '));
      return { 
        error: 'result 字段不存在', 
        availableFields: Object.keys(response.data),
        data: response.data 
      };
    }
    
    if (!response.data.result.userList) {
      console.log('result 中的可用字段：' + Object.keys(response.data.result).join(', '));
      return { 
        error: 'userList 字段不存在', 
        availableFields: Object.keys(response.data.result),
        data: response.data.result 
      };
    }
    
    return response.data.result.userList;
  } catch (error) {
    console.log('❌ 请求失败：' + error.message);
    if (error.response) {
      console.log('错误状态码：' + error.response.status);
      console.log('错误响应：' + JSON.stringify(error.response.data));
    }
    return { error: error.message };
  }
}

async function main() {
  // 只测试第一个部门
  const firstDepartment = table[0];
  console.log('\n========== 测试第一个部门 ==========');
  console.log('部门名称：' + firstDepartment['部门']);
  console.log('部门ID：' + firstDepartment['部门id']);
  console.log('===================================\n');
  
  const result = await getdepartuser(firstDepartment['部门id']);
  
  console.log('\n========== 最终结果 ==========');
  if (result.error) {
    console.log('❌ 遇到错误：' + result.error);
    return {
      success: false,
      error: result.error,
      debug: result
    };
  }
  
  console.log('✅ 成功获取用户列表');
  console.log('用户数量：' + result.length);
  if (result.length > 0) {
    console.log('第一个用户示例：' + JSON.stringify(result[0]));
  }
  
  return {
    success: true,
    userCount: result.length,
    users: result
  };
}

return main();



