/**
 * mockData.js - 模拟H3网格区域内的人数和坐标点数据
 */

/**
 * 生成随机坐标点
 * @param {Array} center - 中心点坐标 [lng, lat]
 * @param {number} radius - 半径范围（公里）
 * @param {number} count - 生成点的数量
 * @returns {Array} 坐标点数组 [[lng, lat], ...]
 */
function generateRandomPoints(center, radius, count) {
  const points = [];
  const [centerLng, centerLat] = center;
  const kmPerLat = 111.32; // 每纬度大约111.32公里
  const kmPerLng = 111.32 * Math.cos(centerLat * (Math.PI / 180));

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;

    const latOffset = (distance * Math.sin(angle)) / kmPerLat;
    const lngOffset = (distance * Math.cos(angle)) / kmPerLng;

    points.push([centerLng + lngOffset, centerLat + latOffset]);
  }

  return points;
}

/**
 * 获取模拟的人员数据
 * @param {string} hexId - H3单元格ID
 * @param {Array} center - 中心点坐标 [lng, lat]
 * @returns {Object} 包含人数和坐标点的数据对象
 */
export function getMockPeopleData(hexId, center) {
  const count = Math.floor(Math.random() * 20) + 5; // 5-25人随机
  const points = generateRandomPoints(center, 0.5, count); // 0.5公里范围内随机分布

  return {
    hexId,
    count,
    points,
    selected: false // 添加选中状态标记
  };
}