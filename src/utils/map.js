/**
 * map.js - H3网格系统工具函数集
 *
 * 该模块提供了一系列用于处理H3网格系统的工具函数，包括：
 * - 计算六边形边长
 * - 创建边界多边形
 * - 获取H3单元格
 * - 获取单元格边界坐标
 */

import * as h3 from 'h3-js';

/**
 * 计算指定分辨率下的六边形边长（单位：千米）
 *
 * @param {number} resolution - H3分辨率（0-15），数值越大，网格越小
 * @returns {string} - 边长（千米），保留2位小数
 * @example
 * calculateEdgeLength(7) // 返回 "0.97"
 */
export const calculateEdgeLength = (resolution) => {
  const edgeLengthM = h3.getHexagonEdgeLengthAvg(resolution, 'm');
  return (edgeLengthM / 1000).toFixed(2);
};

/**
 * 根据东北和西南边界点创建边界多边形
 *
 * @param {Object} northeast - 东北点坐标对象，包含getLat()和getLng()方法
 * @param {Object} southwest - 西南点坐标对象，包含getLat()和getLng()方法
 * @returns {Array<Array<number>>} - 边界多边形坐标数组，格式为[[lat, lng], ...]
 * @example
 * createBoundaryPolygon(
 *   {getLat: () => 40.0, getLng: () => 117.0},
 *   {getLat: () => 39.0, getLng: () => 116.0}
 * )
 */
export const createBoundaryPolygon = (northeast, southwest) => {
  return [
    [northeast.getLat(), northeast.getLng()],
    [northeast.getLat(), southwest.getLng()],
    [southwest.getLat(), southwest.getLng()],
    [southwest.getLat(), northeast.getLng()],
  ];
};

/**
 * 获取指定边界和分辨率下的H3单元格
 *
 * @param {Array<Array<number>>} boundaryPolygon - 边界多边形坐标数组，格式为[[lat, lng], ...]
 * @param {number} resolution - H3分辨率（0-15）
 * @returns {Array<string>} - H3单元格ID数组
 * @example
 * getH3Cells([[40.0, 117.0], [40.0, 116.0], [39.0, 116.0], [39.0, 117.0]], 7)
 */
export const getH3Cells = (boundaryPolygon, resolution) => {
  return h3.polygonToCells(boundaryPolygon, resolution);
};

/**
 * 获取H3单元格的边界坐标
 *
 * @param {string} hexId - H3单元格ID，例如"87283472bffffff"
 * @returns {Array<Array<number>>} - 边界坐标数组，格式为[[lng, lat], ...]
 * @example
 * getH3CellBoundary("87283472bffffff")
 */
export const getH3CellBoundary = (hexId) => {
  const boundary = h3.cellToBoundary(hexId);
  return boundary.map(([lat, lng]) => [lng, lat]);
};