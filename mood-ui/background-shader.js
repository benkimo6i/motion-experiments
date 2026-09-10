/**
 * background-shader.js
 * Generates an organic, multi-directional ambient canvas background 
 * using 3D Simplex noise and offscreen blur rendering.
 * Controlled dynamically by e-motion trigger events.
 */

'use strict';

const BackgroundShader = (() => {
  // Configuration parameters
  const circleCount = 150;
  const circlePropCount = 8; // x, y, vx, vy, life, ttl, radius, hue
  const circlePropsLength = circleCount * circlePropCount;
  const baseSpeed = 0.05;  
  const rangeSpeed = 0.15;
  const baseTTL = 200;
  const rangeTTL = 250;
  const baseRadius = 100;
  const rangeRadius = 200;
  const rangeHue = 60;
  const xOff = 0.0015;
  const yOff = 0.0015;
  const zOff = 0.0015;
  const backgroundColor = 'hsla(0, 0%, 5%, 1)';

  // Math constants and helper functions
  const { PI, cos, sin, random } = Math;
  const TAU = 2 * PI;
  const rand = (n) => n * random();
  const fadeInOut = (t, m) => {
    let hm = 0.5 * m;
    return t < hm ? t / hm : (m - t) / hm;
  };

  // Application state variables
  let container;
  let canvas;
  let ctx;
  let circleProps;
  let simplex;
  let currentHue = 220;
  let targetHue = 220;

  function init(canvasId) {
    createCanvas(canvasId);
    resize();
    initCircles();
    window.addEventListener('resize', resize);
    draw();
  }

  function initCircles() {
    circleProps = new Float32Array(circlePropsLength);
    simplex = new SimplexNoise();

    for (let i = 0; i < circlePropsLength; i += circlePropCount) {
      initCircle(i);
    }
  }

  function initCircle(i) {
    let x = rand(canvas.a.width);
    let y = rand(canvas.a.height);
    // Simplex noise seeds subtle color variance
    let n = simplex.noise3D(x * xOff, y * yOff, currentHue * zOff);
    
    // Random polar direction angle (0 to 2*PI) for multi-directional motion
    let t = rand(TAU);
    let speed = baseSpeed + rand(rangeSpeed);
    let vx = speed * cos(t);
    let vy = speed * sin(t);
    
    let life = 0;
    let ttl = baseTTL + rand(rangeTTL);
    let radius = baseRadius + rand(rangeRadius);
    let hue = currentHue + n * rangeHue;

    circleProps.set([x, y, vx, vy, life, ttl, radius, hue], i);
  }

  function updateCircles() {
    // Smoothly transition currentHue toward targetHue
    currentHue += (targetHue - currentHue) * 0.02;

    for (let i = 0; i < circlePropsLength; i += circlePropCount) {
      updateCircle(i);
    }
  }

  function updateCircle(i) {
    let i2 = 1 + i, i3 = 2 + i, i4 = 3 + i, i5 = 4 + i, i6 = 5 + i, i7 = 6 + i, i8 = 7 + i;

    let x = circleProps[i];
    let y = circleProps[i2];
    let vx = circleProps[i3];
    let vy = circleProps[i4];
    let life = circleProps[i5];
    let ttl = circleProps[i6];
    let radius = circleProps[i7];
    let hue = circleProps[i8];

    drawCircle(x, y, life, ttl, radius, hue);

    life++;
    circleProps[i] = x + vx;
    circleProps[i2] = y + vy;
    circleProps[i5] = life;

    if (checkBounds(x, y, radius) || life > ttl) {
      initCircle(i);
    }
  }

  function drawCircle(x, y, life, ttl, radius, hue) {
    ctx.a.save();
    ctx.a.fillStyle = `hsla(${hue}, 60%, 30%, ${fadeInOut(life, ttl)})`;
    ctx.a.beginPath();
    ctx.a.arc(x, y, radius, 0, TAU);
    ctx.a.fill();
    ctx.a.closePath();
    ctx.a.restore();
  }

  function checkBounds(x, y, radius) {
    return (
      x < -radius ||
      x > canvas.a.width + radius ||
      y < -radius ||
      y > canvas.a.height + radius
    );
  }

  function createCanvas(canvasId) {
    container = document.querySelector('.content--canvas') || document.body;
    
    // Check if an existing canvas target was passed
    let existingCanvas = canvasId ? document.getElementById(canvasId) : null;

    canvas = {
      a: document.createElement('canvas'),
      b: existingCanvas || document.createElement('canvas')
    };
    
    if (!existingCanvas) {
      container.appendChild(canvas.b);
    }

    ctx = {
      a: canvas.a.getContext('2d'),
      b: canvas.b.getContext('2d')
    };
  }

  function resize() {
    const { innerWidth, innerHeight } = window;
    canvas.a.width = innerWidth;
    canvas.a.height = innerHeight;
    ctx.a.drawImage(canvas.b, 0, 0);

    canvas.b.width = innerWidth;
    canvas.b.height = innerHeight;
    ctx.b.drawImage(canvas.a, 0, 0);
  }

  function render() {
    ctx.b.save();
    ctx.b.filter = 'blur(50px)';
    ctx.b.drawImage(canvas.a, 0, 0);
    ctx.b.restore();
  }

  function draw() {
    ctx.a.clearRect(0, 0, canvas.a.width, canvas.a.height);
    ctx.b.fillStyle = backgroundColor;
    ctx.b.fillRect(0, 0, canvas.b.width, canvas.b.height);
    updateCircles();
    render();
    window.requestAnimationFrame(draw);
  }

  let isRevealed = false;

  function setHue(hueValue) {
    targetHue = hueValue;

    if (!isRevealed) {
      // 1. Snap currentHue instantly
      currentHue = hueValue;
      isRevealed = true;

      // 2. Re-initialize all 150 particles immediately with the new hue
      if (typeof initCircles === 'function') {
        initCircles();
      }

      // 3. Clear canvas and perform an immediate synchronous render frame
      if (ctx && ctx.a && ctx.b) {
        ctx.a.clearRect(0, 0, canvas.a.width, canvas.a.height);
        draw(); 
      }

      // 4. Reveal canvas (CSS transition-delay holds opacity at 0 for 150ms)
      if (canvas && canvas.b) {
        canvas.b.classList.add('active');
      }
    }
  }

  return {
    init,
    setHue
  };
})();