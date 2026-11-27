# 博客专属超清摄影暗夜壁纸库与切换指南

本目录专门用于收纳和归档为博客甄选的超清真实摄影壁纸（2K/4K 分辨率，严格杜绝 AI 生成生硬感）。所有壁纸均已针对深色毛玻璃（Dark Glassmorphism）、冷色调微光与电力电子/硬件工程实验室的主题美学进行了深度优化与暗角适配。

---

## 🖼️ 壁纸资产归档清单

| 文件名 | 主题命名 | 摄影内容与视觉意境 | 适合场景与色调 | 当前状态 |
| :--- | :--- | :--- | :--- | :--- |
| **`bg-orbital-tech.jpg`** | **🛰️ 行星电网 (空间站俯瞰)** | 国际空间站（ISS）夜间俯瞰地球，各大洲城市灯火汇聚如电路板金色走线与芯片管脚 | 硬件与电气工程师专属硬核浪漫；深邃暗夜黑 + 暖金电网微光 | **当前“关于我”页面默认背景** |
| **`bg-alpine-stars.jpg`** | **🏔️ 珠峰星轨 (雪山银河)** | 巍峨冷冽雪山、暗夜冷杉林海、璀璨银河与划破天际的冷蓝流星 | 纯净冷冽，自然与深空结合，与 Redefine 暮色山湖基因天然契合 | 归档备选 |
| **`bg-aurora-borealis.jpg`** | **🌌 极北极光 (幻彩暗夜)** | 极地雪原上空舞动的紫青幻彩极光微光，群星闪烁 | 极强呼吸感与流动感，赋予深色模式更多色彩层次 | 归档备选 |
| **`bg-deep-cosmos.jpg`** | **🪐 仙女深空 (浩瀚星云)** | 仙女座大星系（M31）螺旋旋臂在深邃漆黑虚空中静谧运转 | 极致纯净暗黑，文字与图表对比度最高，极简静谧 | 归档备选 |

---

## 🔄 快速切换指南

未来如果想要切换任何页面的背景，无需重新搜寻图片，只需指定上述文件名按如下方式快速修改：

### 1. 更换“关于我”页面背景
打开 [`blog-source/about/index.md`](../about/index.md)，定位至第 65 行附近的 `.about-bg-fixed`，将图片路径替换为您想要的壁纸即可：

```css
.about-bg-fixed {
  /* 示例：切换为 珠峰星轨 */
  background: url('/images/wallpapers/bg-alpine-stars.jpg') center center / cover no-repeat;
  
  /* 示例：切换为 极北极光 */
  /* background: url('/images/wallpapers/bg-aurora-borealis.jpg') center center / cover no-repeat; */
  
  /* 示例：切换为 仙女深空 */
  /* background: url('/images/wallpapers/bg-deep-cosmos.jpg') center center / cover no-repeat; */
}
```

### 2. 更换博客首页全屏 Banner 背景
打开 [`_config.redefine.yml`](../../_config.redefine.yml)，定位至 `home_banner.image.dark`，修改为对应路径：

```yaml
home_banner:
  enable: true
  style: fixed
  image:
    light: /images/wallhaven-wqery6-light.webp
    dark: /images/wallpapers/bg-orbital-tech.jpg # 或 bg-alpine-stars.jpg
```
