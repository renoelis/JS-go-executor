var axios = require('axios');

/**
 * 查询部门下成员
 * @param {string} url 域名（专有轻流需要加/openApi）
 * @param {number} deptId 部门ID
 * @param {string} token openApi token
 */
function findMemberByDeptId(url, deptId, token) {
  var requestUrl = `${url}/department/${deptId}/user?fetchChild=false`;

  // 直接返回 Promise
  return axios.get(requestUrl, { headers: { accessToken: token } })
    .then(resp => {
      const userList = resp.data.result.userList || [];
      const emailList = userList.map(user => user.email);
      return { userList: emailList };
    })
    .catch(err => {
      console.log('❌ 请求失败:', err.message);
      return { error: '请求发生错误' };
    });
}

function findMembersByDeptIds(url, deptIds, token) {
    const tasks = deptIds.map(id => findMemberByDeptId(url, id, token));
    return Promise.all(tasks).then(results => {
      return { list: results };
    });
  }
  
return findMembersByDeptIds('https://api.qingflow.com', [143937,168059], 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2');
// ==================== 示例调用 ====================
//return findMemberByDeptId('https://api.qingflow.com', 143937, 'd866db1d-79ca-42c5-9e9c-0b1ce21135d2');`

