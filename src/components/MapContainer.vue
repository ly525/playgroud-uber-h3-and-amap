<template>
  <div class="map-container">
    <div id="container" class="map"></div>
    <div class="control-panel">
      <div class="input-group">
        <label>H3层级 (0-15):</label>
        <input
          type="number"
          v-model.number="h3Resolution"
          min="0"
          max="15"
          @change="handleResolutionChange"
        />
        <span class="edge-length-info">边长: {{ getEdgeLength }} km</span>
      </div>
      <div class="search-group">
        <input
          type="text"
          v-model="searchKeyword"
          placeholder="输入POI关键字搜索"
          @input="handleSearch"
          class="search-input"
        />
        <div v-if="searchResults.length > 0" class="search-results">
          <div
            v-for="(result, index) in searchResults"
            :key="index"
            class="search-result-item"
            @click="selectPOI(result)"
          >
            {{ result.name }}
            <span class="address">{{ result.address }}</span>
          </div>
        </div>
      </div>

      <statistics-panel :selected-hexagons="selectedHexagons" />

      <!-- <div class="tool-group">
        <button :class="{ active: isRangingActive }" @click="toggleRanging">
          测距
        </button>
      </div> -->

    </div>
  </div>
</template>

<script>
/**
 * MapContainer组件 - 基于高德地图和H3网格系统的地图展示组件
 *
 * 功能：
 * 1. 展示高德地图基础地图
 * 2. 在地图上叠加H3六边形网格
 * 3. 支持POI搜索和位置标记
 * 4. 提供测距工具
 * 5. 允许调整H3网格分辨率
 */

// 引入高德地图加载器和地图工具函数
import AMapLoader from "@amap/amap-jsapi-loader";
import { calculateEdgeLength, createBoundaryPolygon, getH3Cells, getH3CellBoundary } from '../utils/map';
import { getMockPeopleData } from '../utils/mockData';
import StatisticsPanel from './StatisticsPanel.vue';

export default {
  name: "MapContainer",
  components: {
    StatisticsPanel
  },
  computed: {
    getEdgeLength() {
      return calculateEdgeLength(this.h3Resolution);
    },
  },
  data() {
    // 组件状态数据
    return {
      map: null,                // 高德地图实例
      h3Resolution: 6,           // H3网格分辨率（0-15）
      polygons: [],              // 当前显示的H3网格多边形数组
      peopleMarkers: [],         // 人员标记数组
      peopleLabels: [],          // 人员标签数组
      selectedHexagons: [],      // 选中的六边形数据数组
      rangingTool: null,         // 测距工具实例
      isRangingActive: false,    // 测距工具是否激活
      searchKeyword: "",         // POI搜索关键词
      searchResults: [],         // POI搜索结果列表
      placeSearch: null,         // 高德地图POI搜索服务实例
      currentMarker: null,       // 当前选中POI的标记点
    };
  },
  mounted() {
    this.initMap();
  },
  methods: {
    /**
     * 处理POI搜索
     * 根据用户输入的关键词进行POI搜索
     */
    handleSearch() {
      if (!this.placeSearch) {
        this.placeSearch = new window.AMap.PlaceSearch({
          citylimit: true,
          pageSize: 10,
          extensions: 'all',
          // city: '南京'
      });
    }
      if (this.searchKeyword.trim()) {
        this.placeSearch.search(this.searchKeyword, (status, result) => {
          if (status === 'complete' && result.info === 'OK') {
            this.searchResults = result.poiList.pois;
          } else {
            this.searchResults = [];
          }
        });
      } else {
        this.searchResults = [];
      }
    },
    /**
     * 选择POI点位
     * @param {Object} poi - POI信息对象
     */
    selectPOI(poi) {
      if (this.currentMarker) {
        this.map.remove(this.currentMarker);
      }
      const position = [poi.location.lng, poi.location.lat];
      this.currentMarker = new window.AMap.Marker({
        position,
        title: poi.name
      });
      this.map.add(this.currentMarker);
      this.map.setCenter(position);
      this.searchResults = [];
      this.searchKeyword = "";
    },
    /**
     * 初始化地图
     * 加载高德地图SDK并创建地图实例
     */
    async initMap() {
      try {
        window._AMapSecurityConfig = {
          securityJsCode: "5b440f88696224cf4751dcaf08002656",
        };
        const AMap = await AMapLoader.load({
          key: "5f3465b9575a963b7c5fcd34b6b10f56",
          version: "2.0",
          plugins: ["AMap.PolygonEditor", "AMap.RangingTool", "AMap.PlaceSearch", "AMap.Marker"],
        });
        this.map = new AMap.Map("container", {
          zoom: 12,
          center: [116.397428, 39.90923],
          viewMode: "2D",
        });
        this.rangingTool = new AMap.RangingTool(this.map);
        // 添加测距工具的事件监听
        this.rangingTool.on('end', () => {
          this.isRangingActive = false;
        });
        this.rangingTool.on('close', () => {
          this.isRangingActive = false;
        });
        this.map.on("moveend", this.updateH3Grid);
        this.updateH3Grid();
      } catch (e) {
        console.error("地图加载失败：", e);
      }
    },
    /**
     * 清除地图上的H3网格多边形
     */
    clearPolygons() {
      this.polygons.forEach((polygon) => {
        this.map.remove(polygon);
      });
      this.polygons = [];
    },
    /**
     * 处理H3分辨率变化
     * 确保分辨率在有效范围内并更新网格显示
     */
    handleResolutionChange() {
      if (this.h3Resolution < 0) this.h3Resolution = 0;
      if (this.h3Resolution > 15) this.h3Resolution = 15;
      this.updateH3Grid();
    },
    /**
     * 更新H3网格显示
     * 根据当前地图视野范围和分辨率重新计算并显示H3网格
     */
    updateH3Grid() {
      if (!this.map) return;
      this.clearPolygons();

      const bounds = this.map.getBounds();
      const northeast = bounds.getNorthEast();
      const southwest = bounds.getSouthWest();

      // 创建边界多边形并获取H3单元格
      const boundaryPolygon = createBoundaryPolygon(northeast, southwest);
      const hexagons = getH3Cells(boundaryPolygon, this.h3Resolution);

      // 清除现有的人员标记和标签
      this.peopleMarkers.forEach(marker => this.map.remove(marker));
      this.peopleLabels.forEach(label => this.map.remove(label));
      this.peopleMarkers = [];
      this.peopleLabels = [];

      // 绘制六边形和添加人员数据
      hexagons.forEach((hexId) => {
        const path = getH3CellBoundary(hexId);

        // 获取六边形中心点
        const center = path.reduce((acc, curr) => [
          acc[0] + curr[0],
          acc[1] + curr[1]
        ]).map(v => v / path.length);

        // 获取模拟人员数据
        const peopleData = getMockPeopleData(hexId, center);

        const polygon = new window.AMap.Polygon({
          path,
          strokeColor: "#3366FF",
          strokeWeight: 1,
          strokeOpacity: 0.8,
          fillColor: "#3366FF",
          fillOpacity: 0.1,
          cursor: 'pointer',
          extData: peopleData
        });

        // 添加点击事件
        polygon.on('click', () => {
          peopleData.selected = !peopleData.selected;
          polygon.setOptions({
            fillColor: peopleData.selected ? "#FF6B6B" : "#3366FF",
            fillOpacity: peopleData.selected ? 0.3 : 0.1
          });

          if (peopleData.selected) {
            this.selectedHexagons.push(peopleData);
          } else {
            const index = this.selectedHexagons.findIndex(h => h.hexId === peopleData.hexId);
            if (index !== -1) {
              this.selectedHexagons.splice(index, 1);
            }
          }
        });

        // 添加人数标签
        const label = new window.AMap.Text({
          text: String(peopleData.count),
          position: center,
          offset: new window.AMap.Pixel(0, 0),
          style: {
            background: 'rgba(255,255,255,0.8)',
            padding: '5px',
            borderRadius: '3px',
            fontSize: '12px'
          }
        });

        // 添加人员位置标记
        peopleData.points.forEach(point => {
          const marker = new window.AMap.Marker({
            position: point,
            icon: new window.AMap.Icon({
              size: new window.AMap.Size(6, 6),
              image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxjaXJjbGUgY3g9IjMiIGN5PSIzIiByPSIzIiBmaWxsPSIjZmY0NDQ0Ii8+PC9zdmc+',
              imageSize: new window.AMap.Size(6, 6)
            })
          });
          this.peopleMarkers.push(marker);
          this.map.add(marker);
        });

        this.map.add(polygon);
        this.map.add(label);
        this.polygons.push(polygon);
        this.peopleLabels.push(label);
      });
    },
    /**
     * 切换测距工具状态
     * 开启或关闭地图测距功能
     */
    toggleRanging() {
      if (!this.rangingTool) return;
      if (this.isRangingActive) {
        this.rangingTool.turnOff();
      } else {
        this.rangingTool.turnOn();
      }
      this.isRangingActive = !this.isRangingActive;
    },
  },
  beforeDestroy() {
    if (this.rangingTool) {
      this.rangingTool.turnOff();
      this.rangingTool.off('end');
      this.rangingTool = null;
    }
    if (this.currentMarker) {
      this.map.remove(this.currentMarker);
      this.currentMarker = null;
    }
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }
  },
};
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100vh;
}

.map {
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background: white;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  min-width: 280px;
}

.tool-group {
  margin-bottom: 10px;
}

button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

button:hover {
  background: #f5f5f5;
}

button.active {
  background: #3366ff;
  color: white;
  border-color: #3366ff;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-group {
  position: relative;
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 5px;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
}

.search-result-item {
  padding: 8px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.search-result-item:hover {
  background: #f5f5f5;
}

.search-result-item .address {
  font-size: 12px;
  color: #666;
  display: block;
  margin-top: 4px;
}

input[type="number"] {
  width: 60px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}
</style>
