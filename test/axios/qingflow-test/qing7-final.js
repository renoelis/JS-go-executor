const axios = require('axios');

const headers = {   
  'accessToken':  'd866db1d-79ca-42c5-9e9c-0b1ce21135d2',
  'Content-Type': 'application/json'
};

const apiUrl = 'https://api.qingflow.com';

// 如果使用主字段部门字段
const depart = input.depart;
const departid = input.departid;

// 参数验证
if (!depart || !Array.isArray(depart) || depart.length === 0) {
  return { error: '部门名称数组为空或格式不正确' };
}

if (!departid || typeof departid !== 'string' || departid.trim() === '') {
  return { error: '部门ID为空或格式不正确' };
}

// 将departid字符串分割为数组
const departIds = departid.split(',');

// ⚠️ 检查数组长度是否匹配
if (depart.length !== departIds.length) {
  console.log('警告：部门名称数量(' + depart.length + ')与部门ID数量(' + departIds.length + ')不匹配');
  console.log('将只处理有完整信息的部门');
}

// 使用map函数将depart数组和departIds数组合并为所需的对象数组
// ✅ 过滤掉没有 ID 的部门
const table = [];
for (let i = 0; i < depart.length; i++) {
  if (i < departIds.length && departIds[i] && departIds[i].trim() !== '') {
    table.push({
      "部门": depart[i],
      "部门id": departIds[i].trim()
    });
  } else {
    console.log('跳过部门：' + depart[i] + '（缺少部门ID）');
  }
}

if (table.length === 0) {
  return { error: '没有有效的部门数据可处理' };
}

console.log('有效部门数量：' + table.length);

// 获取单个部门的用户列表
function getdepartuser(departmentId) {
  return axios.get(apiUrl + '/department/' + departmentId + '/user?fetchChild=true', { 
    headers: headers
  })
  .then(function(response) {
    // 防御性检查
    if (!response || !response.data || !response.data.result || !response.data.result.userList) {
      console.log('警告：部门 ' + departmentId + ' 数据结构异常');
      return [];
    }
    
    return response.data.result.userList;
  })
  .catch(function(error) {
    console.log('错误：获取部门 ' + departmentId + ' 用户失败：' + (error.message || '未知错误'));
    return [];
  });
}

// 并行获取所有部门的成员邮箱
function getEmailListForDepartments(departments) {
  // 为每个部门创建一个 Promise
  const promises = departments.map(function(department) {
    return getdepartuser(department['部门id'])
      .then(function(userList) {
        // 将用户列表转换为邮箱对象数组
        return userList.map(function(user) {
          return {
            "部门id": department['部门id'],
            "部门": department['部门'],
            "email": [user.email || '']
          };
        });
      });
  });

  // 等待所有部门的数据获取完成
  return Promise.all(promises)
    .then(function(results) {
      // 将所有部门的结果数组合并为一个数组
      const list = [];
      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          list.push(results[i][j]);
        }
      }
      
      console.log('总共获取了 ' + list.length + ' 条邮箱记录');
      return list;
    });
}

return getEmailListForDepartments(table);



