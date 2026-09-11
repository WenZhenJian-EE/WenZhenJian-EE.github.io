/**
 * splane-3d-lab.js
 * 电力电子复频域 (S-Plane) 3D 动力学浮动雕塑引擎
 * 
 * 设计定位：纯动画、无边框、无多余文字、全透明背景、高精密实时起伏
 * 数学规范：X = σ (实轴), Y = jω (虚轴), Z = |G(s)| (幅值)，纯国际学术符号
 * 动画特征：自主平滑轨道巡航、极点与零点谐振律动起伏、微光莫兰迪半透明渐变
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

    // 几何网格精度
    const GRID_N = 36;
    const SPAN_SIGMA = 2.2;
    const SPAN_OMEGA = 2.2;
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

    // 高级莫兰迪半透明着色器 (与山峦湖泊暮色完美融合)
    function getMorandiSculptureColor(zVal, lightFactor) {
      // zVal 范围 [0.05, 1.6]
      const t = Math.max(0, Math.min(1, (zVal - 0.05) / 1.5));
      let r, g, b, alpha;

      if (t < 0.35) {
        // 漏斗深渊凹槽：深邃雾青 (82, 115, 138) -> 鼠尾草灰青 (128, 155, 146)
        const k = t / 0.35;
        r = 82 + (128 - 82) * k;
        g = 115 + (155 - 115) * k;
        b = 138 + (146 - 138) * k;
        alpha = 0.78 + 0.12 * k;
      } else {
        // 极点山峰耸立：鼠尾草灰青 (128, 155, 146) -> 暮色丁香灰紫 (170, 145, 180)
        const k = (t - 0.35) / 0.65;
        r = 128 + (170 - 128) * k;
        g = 155 + (145 - 155) * k;
        b = 146 + (180 - 146) * k;
        alpha = 0.82 + 0.14 * k;
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

      // 生成实时起伏的 S 平面数学曲面
      const vertices = [];
      const stepSig = (SPAN_SIGMA * 2) / GRID_N;
      const stepOmg = (SPAN_OMEGA * 2) / GRID_N;

      for (let i = 0; i <= GRID_N; i++) {
        const row = [];
        const sigma = -SPAN_SIGMA + i * stepSig; // 实轴 σ
        for (let j = 0; j <= GRID_N; j++) {
          const omega = -SPAN_OMEGA + j * stepOmg; // 虚轴 jω

          // Boost CCM 经典拓扑势能 + 实时谐振动力学起伏
          const dP1 = Math.sqrt((sigma + 0.75) ** 2 + (omega - 1.05) ** 2);
          const dP2 = Math.sqrt((sigma + 0.75) ** 2 + (omega + 1.05) ** 2);
          const poleBreath = 0.95 + 0.10 * Math.sin(globalTime * 1.5);
          const polePeak1 = poleBreath / (1 + (dP1 / 0.38) ** 2);
          const polePeak2 = poleBreath / (1 + (dP2 / 0.38) ** 2);

          // 右半平面零点（RHPZ）深渊漏斗天坑
          const dZeroRHP = Math.sqrt((sigma - 1.15) ** 2 + omega ** 2);
          const zeroPulse = 0.60 + 0.08 * Math.cos(globalTime * 1.2);
          const zeroCrater = zeroPulse / (1 + (dZeroRHP / 0.42) ** 2);

          // 沿虚轴及全平面的平滑谐振波纹 (Living Harmonic Dynamics)
          const harmonicWave = 0.04 * Math.sin(omega * 2.5 - globalTime * 2.0) * Math.exp(-Math.abs(sigma) * 0.4);
          const radialRipple = 0.03 * Math.sin(Math.sqrt((sigma + 0.2) ** 2 + omega ** 2) * 3.8 - globalTime * 1.8);

          let z = 0.62 + (polePeak1 + polePeak2) - zeroCrater + harmonicWave + radialRipple;
          z = Math.max(0.04, Math.min(1.68, z));

          row.push({ x: sigma, y: omega, z: z });
        }
        vertices.push(row);
      }

      const polygons = [];

      // 曲面网格面元
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
          const lightFactor = Math.max(0.48, Math.min(1.0, 0.74 + (p10.z - p01.z) * 0.42));

          polygons.push({
            type: 'surface',
            pts: [pr00, pr10, pr11, pr01],
            depth: avgDepth,
            color: getMorandiSculptureColor(avgZ, lightFactor)
          });
        }
      }

      // 侧壁垂直裙边 (基盘闭合，半透明烟熏深灰，与暮色山峦自然融合)
      function addSkirt(pA, pB, light) {
        const bA = { x: pA.x, y: pA.y, z: Z_FLOOR };
        const bB = { x: pB.x, y: pB.y, z: Z_FLOOR };
        const prTA = project(pA), prTB = project(pB);
        const prBA = project(bA), prBB = project(bB);
        const avgD = (prTA.depth + prTB.depth + prBA.depth + prBB.depth) * 0.25;

        const r = Math.round(28 * light);
        const g = Math.round(38 * light);
        const b = Math.round(52 * light);

        polygons.push({
          type: 'skirt',
          pts: [prTA, prTB, prBB, prBA],
          depth: avgD,
          color: `rgba(${r}, ${g}, ${b}, 0.48)`
        });
      }

      for (let i = 0; i < GRID_N; i++) {
        addSkirt(vertices[i][0], vertices[i + 1][0], 0.75);
        addSkirt(vertices[i][GRID_N], vertices[i + 1][GRID_N], 0.65);
        addSkirt(vertices[0][i], vertices[0][i + 1], 0.70);
        addSkirt(vertices[GRID_N][i], vertices[GRID_N][i + 1], 0.85);
      }

      // 深度排序
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

        if (poly.type === 'surface') {
          ctx.lineWidth = 0.55;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
        } else {
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        }
        ctx.stroke();
      }

      // 底盘基准线框 (Z = 0)
      const flr00 = project({ x: -SPAN_SIGMA, y: -SPAN_OMEGA, z: Z_FLOOR });
      const flr10 = project({ x: SPAN_SIGMA,  y: -SPAN_OMEGA, z: Z_FLOOR });
      const flr11 = project({ x: SPAN_SIGMA,  y: SPAN_OMEGA,  z: Z_FLOOR });
      const flr01 = project({ x: -SPAN_SIGMA, y: SPAN_OMEGA,  z: Z_FLOOR });

      ctx.lineWidth = 1.1;
      ctx.strokeStyle = 'rgba(118, 148, 168, 0.35)';
      ctx.beginPath();
      ctx.moveTo(flr00.sx, flr00.sy);
      ctx.lineTo(flr10.sx, flr10.sy);
      ctx.lineTo(flr11.sx, flr11.sy);
      ctx.lineTo(flr01.sx, flr01.sy);
      ctx.closePath();
      ctx.stroke();

      // 3D 纯学术坐标系 (仅标准学术代号，严禁任何中文)
      const origin     = project({ x: 0, y: 0, z: Z_FLOOR });
      const axisSigPos = project({ x: SPAN_SIGMA * 1.3, y: 0, z: Z_FLOOR });
      const axisSigNeg = project({ x: -SPAN_SIGMA * 1.3, y: 0, z: Z_FLOOR });
      const axisOmgPos = project({ x: 0, y: SPAN_OMEGA * 1.3, z: Z_FLOOR });
      const axisOmgNeg = project({ x: 0, y: -SPAN_OMEGA * 1.3, z: Z_FLOOR });
      const axisZPos   = project({ x: 0, y: 0, z: 2.1 });

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
        ctx.lineTo(pEnd.sx - 7 * Math.cos(angle - Math.PI / 6), pEnd.sy - 7 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(pEnd.sx - 7 * Math.cos(angle + Math.PI / 6), pEnd.sy - 7 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }

      // 实轴 σ
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(168, 154, 142, 0.35)';
      ctx.beginPath();
      ctx.moveTo(axisSigNeg.sx, axisSigNeg.sy);
      ctx.lineTo(origin.sx, origin.sy);
      ctx.stroke();
      ctx.setLineDash([]);
      draw3DArrow(origin, axisSigPos, 'rgba(168, 154, 142, 0.85)', 1.3);

      // 虚轴 jω
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(118, 148, 168, 0.35)';
      ctx.beginPath();
      ctx.moveTo(axisOmgNeg.sx, axisOmgNeg.sy);
      ctx.lineTo(origin.sx, origin.sy);
      ctx.stroke();
      ctx.setLineDash([]);
      draw3DArrow(origin, axisOmgPos, 'rgba(118, 148, 168, 0.90)', 1.4);

      // 垂直幅值轴 |G(s)|
      draw3DArrow(origin, axisZPos, 'rgba(165, 145, 175, 0.90)', 1.4);

      // 坐标轴代号 (Times New Roman 学术字形)
      ctx.font = 'bold 12px "Times New Roman", Times, serif';
      ctx.fillStyle = '#a89a8e';
      ctx.fillText('σ', axisSigPos.sx + 7, axisSigPos.sy + 4);
      ctx.font = '10px "Times New Roman", serif';
      ctx.fillText('-σ', axisSigNeg.sx - 16, axisSigNeg.sy + 4);

      ctx.font = 'bold 12px "Times New Roman", Times, serif';
      ctx.fillStyle = '#7694a8';
      ctx.fillText('jω', axisOmgPos.sx + 7, axisOmgPos.sy + 4);
      ctx.font = '10px "Times New Roman", serif';
      ctx.fillText('-jω', axisOmgNeg.sx - 20, axisOmgNeg.sy + 4);

      ctx.font = 'bold 12px "Times New Roman", Times, serif';
      ctx.fillStyle = '#a591af';
      ctx.fillText('|G(s)|', axisZPos.sx + 6, axisZPos.sy - 3);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('0', origin.sx - 8, origin.sy + 9);

      // 极点 (×) 与 零点 (○) 立体符号（严密紧贴实时呼吸起伏点）
      const poleBreath = 0.95 + 0.10 * Math.sin(globalTime * 1.5);
      const livePoleZ = 0.62 + poleBreath + 0.08;
      const zeroPulse = 0.60 + 0.08 * Math.cos(globalTime * 1.2);
      const liveZeroZ = Math.max(0.04, 0.62 - zeroPulse);

      const pP1 = project({ x: -0.75, y: 1.05, z: livePoleZ });
      const pP2 = project({ x: -0.75, y: -1.05, z: livePoleZ });
      const pZ0 = project({ x: 1.15, y: 0, z: liveZeroZ });

      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = 'rgba(216, 180, 254, 0.95)';
      ctx.fillText('×', pP1.sx - 5, pP1.sy - 6);
      ctx.fillText('×', pP2.sx - 5, pP2.sy - 6);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
      ctx.fillText('○', pZ0.sx - 6, pZ0.sy - 6);

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
