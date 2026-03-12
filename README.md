# Atmos

多城市天气应用，支持预报、航空气象、雷达卫星图与 Polymarket 预测市场跳转。

**在线访问：** [https://polyatmos.vercel.app/](https://polyatmos.vercel.app/)

**Site URL 配置：** 修改 `src/config/site.ts` 中的 `SITE_URL` 可更换域名，用于 SEO meta 与 Open Graph。

## 功能

### 城市与预报
- **13 座城市**：Sao Paulo、NYC、Seoul、Atlanta、Toronto、London、Paris、Miami、Chicago、Seattle、Ankara、Dallas、Buenos Aires
- **今日 / 明日切换**：查看当天或次日预报
- **多数据源温度**：Open-Meteo 为主，可选 WeatherAPI、OpenWeatherMap、Wunderground 对比
- **温度展示**：默认 °C，悬停显示 °F

### 天气详情
- **风速与风向**
- **降水量**
- **云量与云底高度**（云底来自 METAR）

### 航空气象
- **METAR / TAF**：来自 Aviation Weather Center
- **METAR 历史温度图表**：机场观测最高温趋势

### 地图与跳转
- **卫星云图**：NASA GIBS 全球云图
- **雷达降水**：RainViewer
- **跳转工具**：Windy、Ventusky、RainViewer、Aviation Weather、Meteoblue、Wunderground
- **Polymarket**：跳转至当日最高温预测市场（如 Paris March 6）

### 其他
- **深色 / 浅色主题** 切换
- **URL 参数**：`?city=paris` 直接打开指定城市

## 技术栈

Vite 7 · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Leaflet

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```
