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

// 使用map函数将depart数组和departIds数组合并为所需的对象数组
const table = depart.map(function(name, index) {
    return {
        "部门": name,
        "部门id": departIds[index]
    };
});

// 获取单个部门的用户列表
function getdepartuser(departmentId) {
  return axios.get(apiUrl + '/department/' + departmentId + '/user?fetchChild=true', { 
    headers: headers
  })
  .then(function(response) {
    // 添加防御性检查
    if (!response || !response.data) {
      console.log('警告：部门 ' + departmentId + ' 响应数据为空');
      return [];
    }
    
    if (!response.data.result) {
      console.log('警告：部门 ' + departmentId + ' result 为空，完整响应：' + JSON.stringify(response.data));
      return [];
    }
    
    if (!response.data.result.userList) {
      console.log('警告：部门 ' + departmentId + ' userList 为空');
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
      return list;
    });
}

return getEmailListForDepartments(table);

