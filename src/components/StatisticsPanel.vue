<template>
  <div class="statistics-panel">
    <h3>选中区域统计</h3>
    <div class="stat-item">
      <span class="label">选中区域数：</span>
      <span class="value">{{ selectedCount }}</span>
    </div>
    <div class="stat-item">
      <span class="label">总人数：</span>
      <span class="value">{{ totalPeople }}</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatisticsPanel',
  props: {
    selectedHexagons: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    selectedCount() {
      return this.selectedHexagons.length;
    },
    totalPeople() {
      return this.selectedHexagons.reduce((sum, hex) => sum + hex.count, 0);
    }
  }
}
</script>

<style scoped>
.statistics-panel {
  background: white;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
}

h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.label {
  color: #666;
}

.value {
  font-weight: bold;
  color: #3366FF;
}
</style>