// buf.writeUInt16BE/LE() - Round 7: 实际应用场景与协议模拟
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 1. 网络协议模拟
test('writeUInt16BE: TCP 端口号写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(80, 0);    // HTTP 端口
  buf.writeUInt16BE(443, 2);   // HTTPS 端口
  return buf[0] === 0x00 && buf[1] === 0x50 && buf[2] === 0x01 && buf[3] === 0xBB;
});

test('writeUInt16LE: 小端协议端口号', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(8080, 0);
  buf.writeUInt16LE(3306, 2);  // MySQL 端口
  return buf.readUInt16LE(0) === 8080 && buf.readUInt16LE(2) === 3306;
});

test('writeUInt16BE: IP 数据包长度字段', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(1500, 0);  // 最大 MTU
  return buf[0] === 0x05 && buf[1] === 0xDC;
});

test('writeUInt16LE: USB 设备描述符长度', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(64, 0);
  return buf[0] === 0x40 && buf[1] === 0x00;
});

// 2. 文件格式头部
test('writeUInt16BE: PNG 宽度高度字段模拟', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(1920, 0);  // 宽度
  buf.writeUInt16BE(1080, 2);  // 高度
  return buf.readUInt16BE(0) === 1920 && buf.readUInt16BE(2) === 1080;
});

test('writeUInt16LE: BMP 文件头字段', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(1, 0);     // 保留字段
  buf.writeUInt16LE(28, 2);    // 位深度
  return buf.readUInt16LE(0) === 1 && buf.readUInt16LE(2) === 28;
});

// 3. 音频数据模拟
test('writeUInt16BE: PCM 采样数据', () => {
  const buf = Buffer.alloc(6);
  buf.writeUInt16BE(32768, 0);  // 中心值
  buf.writeUInt16BE(0, 2);      // 最小值
  buf.writeUInt16BE(65535, 4);  // 最大值
  return buf.readUInt16BE(0) === 32768 && buf.readUInt16BE(2) === 0 && buf.readUInt16BE(4) === 65535;
});

test('writeUInt16LE: WAV 采样率字段', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(44100, 0);  // CD 质量
  return buf.readUInt16LE(0) === 44100;
});

// 4. 颜色值编码
test('writeUInt16BE: RGB565 颜色格式', () => {
  const buf = Buffer.alloc(2);
  const red = (31 << 11) | (0 << 5) | 0;    // 纯红
  buf.writeUInt16BE(red, 0);
  return buf[0] === 0xF8 && buf[1] === 0x00;
});

test('writeUInt16LE: RGB565 绿色', () => {
  const buf = Buffer.alloc(2);
  const green = (0 << 11) | (63 << 5) | 0;  // 纯绿
  buf.writeUInt16LE(green, 0);
  return buf.readUInt16LE(0) === green;
});

test('writeUInt16BE: RGB565 蓝色', () => {
  const buf = Buffer.alloc(2);
  const blue = (0 << 11) | (0 << 5) | 31;   // 纯蓝
  buf.writeUInt16BE(blue, 0);
  return buf.readUInt16BE(0) === blue;
});

// 5. CRC/校验和场景
test('writeUInt16BE: CRC16 校验值', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(0xA001, 0);  // CRC16 多项式
  return buf[0] === 0xA0 && buf[1] === 0x01;
});

test('writeUInt16LE: Modbus CRC', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0xFFFF, 0);  // 初始值
  return buf[0] === 0xFF && buf[1] === 0xFF;
});

// 6. 时间戳和计数器
test('writeUInt16BE: 秒级时间戳低 16 位', () => {
  const buf = Buffer.alloc(2);
  const timestamp = 1234567890 & 0xFFFF;
  buf.writeUInt16BE(timestamp, 0);
  return buf.readUInt16BE(0) === timestamp;
});

test('writeUInt16LE: 毫秒计数器', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(999, 0);
  return buf.readUInt16LE(0) === 999;
});

test('writeUInt16BE: 帧计数器', () => {
  const buf = Buffer.alloc(2);
  for (let i = 0; i < 65535; i += 1000) {
    buf.writeUInt16BE(i, 0);
    if (buf.readUInt16BE(0) !== i) return false;
  }
  return true;
});

// 7. 二进制消息格式
test('writeUInt16BE: 消息长度前缀', () => {
  const buf = Buffer.alloc(10);
  const msgLen = 8;
  buf.writeUInt16BE(msgLen, 0);
  return buf[0] === 0x00 && buf[1] === 0x08;
});

test('writeUInt16LE: 命令 ID', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(0x0100, 0);  // 命令 256
  return buf[0] === 0x00 && buf[1] === 0x01;
});

// 8. 位域和标志位
test('writeUInt16BE: 16 个布尔标志位', () => {
  const buf = Buffer.alloc(2);
  const flags = 0b1010101010101010;
  buf.writeUInt16BE(flags, 0);
  return buf[0] === 0xAA && buf[1] === 0xAA;
});

test('writeUInt16LE: 权限位掩码', () => {
  const buf = Buffer.alloc(2);
  const permissions = 0x0001 | 0x0004 | 0x0010;  // 读、写、执行
  buf.writeUInt16LE(permissions, 0);
  return buf.readUInt16LE(0) === permissions;
});

// 9. 数据压缩/编码
test('writeUInt16BE: 游程编码长度', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(100, 0);   // 重复 100 次
  buf.writeUInt16BE(50, 2);    // 重复 50 次
  return buf.readUInt16BE(0) === 100 && buf.readUInt16BE(2) === 50;
});

test('writeUInt16LE: 字典索引', () => {
  const buf = Buffer.alloc(6);
  buf.writeUInt16LE(0, 0);
  buf.writeUInt16LE(255, 2);
  buf.writeUInt16LE(1000, 4);
  return buf.readUInt16LE(4) === 1000;
});

// 10. 数学/科学计算
test('writeUInt16BE: 定点数表示', () => {
  const buf = Buffer.alloc(2);
  const fixedPoint = Math.round(3.14159 * 1000);  // 3位小数
  buf.writeUInt16BE(fixedPoint, 0);
  return buf.readUInt16BE(0) === 3142;
});

test('writeUInt16LE: 温度传感器值 (0.01度精度)', () => {
  const buf = Buffer.alloc(2);
  const temp = Math.round(25.67 * 100);  // 2567 = 25.67度
  buf.writeUInt16LE(temp, 0);
  return buf.readUInt16LE(0) === 2567;
});

// 11. 游戏数据序列化
test('writeUInt16BE: 玩家 HP', () => {
  const buf = Buffer.alloc(6);
  buf.writeUInt16BE(1000, 0);  // 当前 HP
  buf.writeUInt16BE(1000, 2);  // 最大 HP
  buf.writeUInt16BE(500, 4);   // MP
  return buf.readUInt16BE(0) === 1000 && buf.readUInt16BE(4) === 500;
});

test('writeUInt16LE: 物品 ID 和数量', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(12345, 0);  // 物品 ID
  buf.writeUInt16LE(99, 2);     // 数量
  return buf.readUInt16LE(0) === 12345 && buf.readUInt16LE(2) === 99;
});

// 12. 坐标和向量
test('writeUInt16BE: 2D 地图坐标', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(1024, 0);  // X
  buf.writeUInt16BE(768, 2);   // Y
  return buf.readUInt16BE(0) === 1024 && buf.readUInt16BE(2) === 768;
});

test('writeUInt16LE: 屏幕分辨率', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(2560, 0);  // 宽
  buf.writeUInt16LE(1440, 2);  // 高
  return buf.readUInt16LE(0) === 2560 && buf.readUInt16LE(2) === 1440;
});

// 13. 序列号和版本号
test('writeUInt16BE: 软件版本号', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(1, 0);     // 主版本
  buf.writeUInt16BE(2, 2);     // 次版本
  return buf.readUInt16BE(0) === 1 && buf.readUInt16BE(2) === 2;
});

test('writeUInt16LE: 硬件序列号片段', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16LE(12345, 0);
  return buf.readUInt16LE(0) === 12345;
});

// 14. 实时通信数据
test('writeUInt16BE: WebSocket frame length', () => {
  const buf = Buffer.alloc(2);
  buf.writeUInt16BE(125, 0);   // 小于 126 的长度
  return buf.readUInt16BE(0) === 125;
});

test('writeUInt16LE: RTP 序列号', () => {
  const buf = Buffer.alloc(2);
  let seq = 0;
  for (let i = 0; i < 10; i++) {
    buf.writeUInt16LE(seq++, 0);
    if (buf.readUInt16LE(0) !== i) return false;
  }
  return true;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
