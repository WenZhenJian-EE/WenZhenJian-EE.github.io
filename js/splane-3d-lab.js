/**
 * splane-3d-lab.js
 * 电力电子复频域 (S-Plane) 连续调和波场动力学雕塑引擎
 * 
 * 设计定位：纯动画、无边框、无多余浮夸光效、全透明背景、60FPS 高精密实时起伏
 * 数学规范：X = σ (实轴), Y = jω (虚轴), Z = |H(s)| (复频域响应)，纯国际学术规范
 * 核心拓扑：连续多重调和行波流形 (静谧平滑波动，无突兀土包，无浮夸亮线)、纯学术坐标轴系
 * 视觉特征：极致通透莫兰迪悬浮晶格、无任何厚重侧壁、完全保留湖山渔舟背景通透度
 * 性能保护：借助 IntersectionObserver 视口离开即刻休眠（0% 负载）
 */

(function() {
  'use strict';

  function initSPlaneSculpture() {
    const container = document.getElementById('splaneSculpture');
    const canvas = document.getElementById('splaneCanvas');
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = null;
    let isVisibleInViewport = true;
    let globalTime = 0;

    // 几何网格参数 (正交均匀连续流形，消除任何奇点汇聚)
    const GRID_N = 36;
    const SPAN_X = 2.2;
    const SPAN_Y = 2.2;
    const Z_FLOOR = 0.0;

    // 高分辨率画布自适应
    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 连续波场莫兰迪通透着色器 (幽邃冰青 -> 晨霭鼠尾草绿 -> 暮色丁香紫)
    function getMorandiWaveColor(zVal, lightFactor) {
      // zVal 动态范围约为 [0.08, 1.55]
      const t = Math.max(0, Math.min(1, (zVal - 0.08) / 1.47));
      let r, g, b, alpha;

      if (t < 0.35) {
        // 低位波谷：深邃冰青 (68, 102, 126) -> 鼠尾草灰青 (115, 146, 138)
        const k = t / 0.35;
        r = 68 + (115 - 68) * k;
        g = 102 + (146 - 102) * k;
        b = 126 + (138 - 126) * k;
        alpha = 0.72 + 0.10 * k;
      } else if (t < 0.70) {
        // 中位平滑马鞍面：鼠尾草灰青 (115, 146, 138) -> 暮云微灰青 (142, 148, 165)
        const k = (t - 0.35) / 0.35;
        r = 115 + (142 - 115) * k;
        g = 146 + (148 - 146) * k;
        b = 138 + (165 - 138) * k;
        alpha = 0.78 + 0.08 * k;
      } else {
        // 高位谐振波峰：暮云微灰青 (142, 148, 165) -> 暮色丁香紫 (178, 145, 188)
        const k = (t - 0.70) / 0.30;
        r = 142 + (178 - 142) * k;
        g = 148 + (145 - 148) * k;
        b = 165 + (188 - 165) * k;
        alpha = 0.84 + 0.10 * k;
      }

      r = Math.round(r * lightFactor);
      g = Math.round(g * lightFactor);
      b = Math.round(b * lightFactor);

      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
    }

    // 主渲染循环
    function render() {
      if (!isVisibleInViewport) {
        animationId = null;
        return;
      }

      globalTime += 0.014;

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w <= 0 || h <= 0) {
        animationId = requestAnimationFrame(render);
        return;
      }

      const cx = w / 2;
      const cy = h / 2 + 15;

      // 100% 全透明清除画布（保留壁纸背景完全通透）
      ctx.clearRect(0, 0, w, h);

      // 自主平滑相机航行 (优雅的公转与微仰俯呼吸)
      const camPhi = -0.65 + globalTime * 0.15; // 慢速自转
      const camTheta = 0.48 + 0.06 * Math.sin(globalTime * 0.3); // 微幅俯仰
      const camDist = 4.8; // 饱满视距

      // LookAt 投影矩阵
      const target = { x: 0, y: 0, z: 0.5 };
      const eye = {
        x: target.x + camDist * Math.cos(camTheta) * Math.sin(camPhi),
        y: target.y - camDist * Math.cos(camTheta) * Math.cos(camPhi),
        z: target.z + camDist * Math.sin(camTheta)
      };

      let fx = target.x - eye.x, fy = target.y - eye.y, fz = target.z - eye.z;
      const flen = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
      fx /= flen; fy /= flen; fz /= flen;

      let rx = fy, ry = -fx;
      const rlen = Math.sqrt(rx * rx + ry * ry) || 1;
      rx /= rlen; ry /= rlen; const rz = 0;

      const ux = ry * fz - rz * fy;
      const uy = rz * fx - rx * fz;
      const uz = rx * fy - ry * fx;

      const fov = 460;
      // 放大网格尺度，严密饱满地填满右侧视窗
      const meshScale = Math.min(w, h) * 0.35;

      function project(p) {
        const vx = p.x * meshScale;
        const vy = p.y * meshScale;
        const vz = p.z * meshScale;

        const dx = vx - eye.x * meshScale;
        const dy = vy - eye.y * meshScale;
        const dz = vz - eye.z * meshScale;

        const xc = dx * rx + dy * ry + dz * rz;
        const yc = dx * ux + dy * uy + dz * uz;
        const zc = dx * fx + dy * fy + dz * fz;

        const scale = fov / (zc || 1);
        return {
          sx: cx + xc * scale,
          sy: cy - yc * scale,
          depth: zc,
          origZ: p.z
        };
      }

      // 生成连续正交调和波场流形 (S-Plane Harmonic Continuous Wavefield)
      const vertices = [];
      const stepSig = (SPAN_X * 2) / GRID_N;
      const stepOmg = (SPAN_Y * 2) / GRID_N;

      for (let i = 0; i <= GRID_N; i++) {
        const row = [];
        const sigma = -SPAN_X + i * stepSig; // 实轴 σ
        for (let j = 0; j <= GRID_N; j++) {
          const omega = -SPAN_Y + j * stepOmg; // 虚轴 jω
          const r = Math.sqrt(sigma * sigma + omega * omega);

          // 1. 基底双曲舒展马鞍面 (Hyperbolic Saddle Foundation)
          const baseSaddle = 0.65 + 0.16 * ((omega / 2.2) ** 2) - 0.12 * ((sigma / 2.2) ** 2);

          // 2. 连续行进调和波 (Traveling Resonant Wave: 随时间如丝绸般平滑波浪起伏)
          const travelingWave = 0.22 * Math.sin(1.8 * omega - globalTime * 2.2) * Math.cos(1.2 * sigma + globalTime * 1.5);

          // 3. 旋转双曲能量振型 (Rotating Harmonic Eigenmode: 60FPS 顺滑起伏，绝无孤立死土包)
          const rotatingMode = 0.14 * Math.sin(2.5 * (sigma + omega) - globalTime * 1.8) * Math.exp(-0.18 * r);

          // 4. 虚轴频响谐波微波 (High-Frequency Resonance Wavelet)
          const freqRipple = 0.07 * Math.cos(3.2 * omega - globalTime * 2.6) * Math.exp(-0.35 * Math.abs(sigma));

          let z = baseSaddle + travelingWave + rotatingMode + freqRipple;
          z = Math.max(0.08, Math.min(1.58, z));

          row.push({ x: sigma, y: omega, z: z });
        }
        vertices.push(row);
      }

      const polygons = [];

      // 生成正交双曲网格面元 (无任何厚重方形侧壁，通透悬浮)
      for (let i = 0; i < GRID_N; i++) {
        for (let j = 0; j < GRID_N; j++) {
          const p00 = vertices[i][j];
          const p10 = vertices[i + 1][j];
          const p11 = vertices[i + 1][j + 1];
          const p01 = vertices[i][j + 1];

          const pr00 = project(p00);
          const pr10 = project(p10);
          const pr11 = project(p11);
          const pr01 = project(p01);

          const avgDepth = (pr00.depth + pr10.depth + pr11.depth + pr01.depth) * 0.25;
          const avgZ = (p00.z + p10.z + p11.z + p01.z) * 0.25;
          const lightFactor = Math.max(0.52, Math.min(1.0, 0.78 + (p10.z - p01.z) * 0.45));

          polygons.push({
            pts: [pr00, pr10, pr11, pr01],
            depth: avgDepth,
            color: getMorandiWaveColor(avgZ, lightFactor)
          });
        }
      }

      // 深度排序 (从远到近绘制)
      polygons.sort((a, b) => b.depth - a.depth);

      for (let poly of polygons) {
        ctx.beginPath();
        ctx.moveTo(poly.pts[0].sx, poly.pts[0].sy);
        ctx.lineTo(poly.pts[1].sx, poly.pts[1].sy);
        ctx.lineTo(poly.pts[2].sx, poly.pts[2].sy);
        ctx.lineTo(poly.pts[3].sx, poly.pts[3].sy);
        ctx.closePath();

        ctx.fillStyle = poly.color;
        ctx.fill();

        ctx.lineWidth = 0.50;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.stroke();
      }

      // 底盘基准线框 (Z = 0)
      const flr00 = project({ x: -SPAN_X, y: -SPAN_Y, z: Z_FLOOR });
      const flr10 = project({ x: SPAN_X,  y: -SPAN_Y, z: Z_FLOOR });
      const flr11 = project({ x: SPAN_X,  y: SPAN_Y,  z: Z_FLOOR });
      const flr01 = project({ x: -SPAN_X, y: SPAN_Y,  z: Z_FLOOR });

      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(118, 148, 168, 0.30)';
      ctx.beginPath();
      ctx.moveTo(flr00.sx, flr00.sy);
      ctx.lineTo(flr10.sx, flr10.sy);
      ctx.lineTo(flr11.sx, flr11.sy);
      ctx.lineTo(flr01.sx, flr01.sy);
      ctx.closePath();
      ctx.stroke();

      // 3D 纯学术坐标系 (σ, jω, |H(s)|)
      const origin   = project({ x: 0, y: 0, z: 0.0 });
      const axisSigP = project({ x: SPAN_X * 1.25, y: 0, z: 0.0 });
      const axisSigN = project({ x: -SPAN_X * 1.25, y: 0, z: 0.0 });
      const axisOmgP = project({ x: 0, y: SPAN_Y * 1.25, z: 0.0 });
      const axisOmgN = project({ x: 0, y: -SPAN_Y * 1.25, z: 0.0 });
      const axisZP   = project({ x: 0, y: 0, z: 1.85 });

      function draw3DArrow(pStart, pEnd, color, width = 1.2) {
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(pStart.sx, pStart.sy);
        ctx.lineTo(pEnd.sx, pEnd.sy);
        ctx.stroke();

        const angle = Math.atan2(pEnd.sy - pStart.sy, pEnd.sx - pStart.sx);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(pEnd.sx, pEnd.sy);
        ctx.lineTo(pEnd.sx - 6 * Math.cos(angle - Math.PI / 6), pEnd.sy - 6 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(pEnd.sx - 6 * Math.cos(angle + Math.PI / 6), pEnd.sy - 6 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }

      // 实轴 σ
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(168, 154, 142, 0.35)';
      ctx.beginPath();
      ctx.moveTo(axisSigN.sx, axisSigN.sy);
      ctx.lineTo(origin.sx, origin.sy);
      ctx.stroke();
      ctx.setLineDash([]);
      draw3DArrow(origin, axisSigP, 'rgba(168, 154, 142, 0.85)', 1.3);

      // 虚轴 jω
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(118, 148, 168, 0.35)';
      ctx.beginPath();
      ctx.moveTo(axisOmgN.sx, axisOmgN.sy);
      ctx.lineTo(origin.sx, origin.sy);
      ctx.stroke();
      ctx.setLineDash([]);
      draw3DArrow(origin, axisOmgP, 'rgba(118, 148, 168, 0.90)', 1.3);

      // 垂直响应幅值轴 |H(s)|
      draw3DArrow(origin, axisZP, 'rgba(182, 150, 192, 0.90)', 1.3);

      // 坐标轴学术字形 (Times New Roman)
      ctx.font = 'bold 12px "Times New Roman", Times, serif';
      ctx.fillStyle = '#a89a8e';
      ctx.fillText('σ', axisSigP.sx + 7, axisSigP.sy + 4);
      ctx.font = '10px "Times New Roman", serif';
      ctx.fillText('-σ', axisSigN.sx - 18, axisSigN.sy + 4);

      ctx.font = 'bold 12px "Times New Roman", Times, serif';
      ctx.fillStyle = '#7694a8';
      ctx.fillText('jω', axisOmgP.sx + 7, axisOmgP.sy + 4);
      ctx.font = '10px "Times New Roman", serif';
      ctx.fillText('-jω', axisOmgN.sx - 22, axisOmgN.sy + 4);

      ctx.font = 'bold 12px "Times New Roman", Times, serif';
      ctx.fillStyle = '#c5a3d4';
      ctx.fillText('|H(s)|', axisZP.sx + 6, axisZP.sy - 3);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('0', origin.sx - 8, origin.sy + 9);

      animationId = requestAnimationFrame(render);
    }

    // 性能守护：离开视口彻底暂停渲染循环
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isVisibleInViewport = entry.isIntersecting;
          if (isVisibleInViewport && !animationId) {
            animationId = requestAnimationFrame(render);
          }
        });
      }, { threshold: 0.05 });
      observer.observe(container);
    }

    animationId = requestAnimationFrame(render);
  }

  // 页面加载完成后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSPlaneSculpture);
  } else {
    initSPlaneSculpture();
  }

  // 支持 Redefine 主题 Swup 局部刷新重新挂载
  document.addEventListener('swup:contentReplaced', () => {
    setTimeout(initSPlaneSculpture, 80);
  });
})();
