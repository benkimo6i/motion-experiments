/**
 * mood.js
 * Mood-driven UI library powered by MediaPipe Face Landmarker
 */

import { FaceLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12";

class Mood {
  constructor() {
    this.moods = ['happy', 'sad', 'angry'];
    this.activeMood = null;
    this.deniedCallback = null;
    this.grantedCallback = null;
    
    // Updated color palettes with rich multi-hue depth for ambient noise shading
    this.config = {
      happy: { 
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 35%, #f43f5e 70%, #d97706 100%)', 
        colors: ['#78350f', '#f59e0b', '#fbbf24', '#f43f5e'],
        glow: 'rgba(245, 158, 11, 0.45)',
        trigger: null 
      },
      sad: { 
        gradient: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 35%, #3b82f6 70%, #06b6d4 100%)', 
        colors: ['#030712', '#1e3a8a', '#2563eb', '#06b6d4'],
        glow: 'rgba(59, 130, 246, 0.45)',
        trigger: null 
      },
      angry: { 
        gradient: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 35%, #dc2626 70%, #f87171 100%)', 
        colors: ['#290202', '#7f1d1d', '#dc2626', '#f87171'],
        glow: 'rgba(220, 38, 38, 0.45)',
        trigger: null 
      }
    };

    this.frameBuffer = [];
    this.smoothingFrames = 12;
    this.threshold = 0.38;

    this.pendingMood = null;
    this.pendingMoodStartTime = 0;
    this.holdDelayMs = 400;

    this.showPreview = false;
    this.previewContainer = null;
    this.previewCanvas = null;
    this.previewCtx = null;

    this.visibleElements = new Set();
    this.observer = null;

    this.faceLandmarker = null;
    this.videoElement = null;
    this.isInitialized = false;

    this._setupPropertyAccessors();
  }

  _setupPropertyAccessors() {
    const self = this;
    this.moods.forEach((mood) => {
      Object.defineProperty(self, mood, {
        get: () => ({
          get gradient() { return self.config[mood].gradient; },
          set gradient(val) { self.config[mood].gradient = val; self._applyMoodUpdate(); },
          get trigger() { return self.config[mood].trigger; },
          set trigger(fn) { self.config[mood].trigger = fn; self._applyMoodUpdate(); }
        }),
        configurable: true
      });
    });
  }

  onDenied(callback) {
    this.deniedCallback = callback;
  }

  onGranted(callback) {
    this.grantedCallback = callback;
  }

  async init(options = {}) {
    if (options.threshold !== undefined) this.threshold = options.threshold;
    if (options.smoothingFrames !== undefined) this.smoothingFrames = options.smoothingFrames;
    if (options.holdDelayMs !== undefined) this.holdDelayMs = options.holdDelayMs;
    this.showPreview = options.preview || false;

    this._setupDOMObserver();

    if (this.showPreview) {
      this._createPreviewContainer();
    }

    try {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
      );

      this.faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });

      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoElement.srcObject = stream;
      await this.videoElement.play();

      this.isInitialized = true;

      if (typeof this.grantedCallback === 'function') {
        this.grantedCallback();
      }
        
      this._startDetectionLoop();

    } catch (err) {
      console.warn("mood: Camera access unavailable.", err);
      this._removePreviewContainer();

      if (typeof this.deniedCallback === 'function') {
        this.deniedCallback(err);
      }
    }
  }

  _setupDOMObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.visibleElements.add(entry.target);
          this._applyMoodUpdate();
        } else {
          this.visibleElements.delete(entry.target);
        }
      });
    }, { rootMargin: '50px' });

    document.querySelectorAll('.mood').forEach(el => this.observer.observe(el));
  }

  _startDetectionLoop() {
    const processFrame = () => {
      if (this.videoElement && this.videoElement.currentTime > 0) {
        const results = this.faceLandmarker.detectForVideo(this.videoElement, performance.now());
        
        let rawMoods = { happy: 0, sad: 0, angry: 0 };

        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
          rawMoods = this._calculateHeuristicScores(results.faceBlendshapes[0].categories);
          this._processSmoothedMood(rawMoods);
        }

        if (this.showPreview && this.previewCanvas) {
          this._renderPreview(rawMoods);
        }
      }
      requestAnimationFrame(processFrame);
    };
    processFrame();
  }

  _calculateHeuristicScores(categories) {
    const map = {};
    categories.forEach(item => { map[item.categoryName] = item.score; });

    const happy = ((map['mouthSmileLeft'] || 0) + (map['mouthSmileRight'] || 0)) / 2;
    const angry = ((map['browDownLeft'] || 0) + (map['browDownRight'] || 0)) / 2;
    
    const frownScore = ((map['mouthFrownLeft'] || 0) + (map['mouthFrownRight'] || 0));
    const innerBrowScore = (map['browInnerUp'] || 0) * 1.8;
    const lipRoll = (map['mouthRollLower'] || 0);
    const sad = Math.min(1.0, (frownScore + innerBrowScore + lipRoll) / 2.2);

    return { happy, sad, angry };
  }

  _processSmoothedMood(rawScores) {
    this.frameBuffer.push(rawScores);
    if (this.frameBuffer.length > this.smoothingFrames) {
      this.frameBuffer.shift();
    }

    const averages = { happy: 0, sad: 0, angry: 0 };
    this.frameBuffer.forEach(frame => {
      for (const mood in averages) {
        averages[mood] += frame[mood] / this.frameBuffer.length;
      }
    });

    let maxEmotion = null;
    let maxScore = 0;

    for (const [emotion, score] of Object.entries(averages)) {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion;
      }
    }

    const now = performance.now();

    if (maxScore >= this.threshold) {
      if (maxEmotion !== this.activeMood) {
        if (this.pendingMood !== maxEmotion) {
          this.pendingMood = maxEmotion;
          this.pendingMoodStartTime = now;
        } else if (now - this.pendingMoodStartTime >= this.holdDelayMs) {
          this.setMood(maxEmotion);
        }
      } else {
        this.pendingMood = null;
      }
    } else {
      this.pendingMood = null;
    }
  }

  setMood(moodName) {
    if (this.moods.includes(moodName)) {
      this.activeMood = moodName;
      this._applyMoodUpdate();
    }
  }

  _applyMoodUpdate() {
    if (!this.activeMood) return;

    this.visibleElements.forEach(el => {
      const allowed = el.dataset.moods ? el.dataset.moods.split(',').map(e => e.trim()) : [];
      
      if (allowed.includes(this.activeMood)) {
        el.classList.add('mood-active');
        el.dataset.currentMood = this.activeMood;

        const configEntry = this.config[this.activeMood];
        
        if (configEntry && typeof configEntry.trigger === 'function') {
          configEntry.trigger(el);
        } else if (configEntry && configEntry.gradient) {
          el.style.background = configEntry.gradient;
        }
      }
    });
  }

  _createPreviewContainer() {
    this.previewContainer = document.createElement('div');
    this.previewContainer.id = 'mood-preview';
    this.previewContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 220px;
      height: 200px;
      background: #000000;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8);
      z-index: 9999;
      border: 1px solid #262626;
    `;

    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.width = 220;
    this.previewCanvas.height = 200;
    this.previewCtx = this.previewCanvas.getContext('2d');

    this.previewContainer.appendChild(this.previewCanvas);
    document.body.appendChild(this.previewContainer);
  }

  _removePreviewContainer() {
    if (this.previewContainer && this.previewContainer.parentNode) {
      this.previewContainer.parentNode.removeChild(this.previewContainer);
      this.previewContainer = null;
      this.previewCanvas = null;
      this.previewCtx = null;
    }
  }

  _renderPreview(scores) {
    if (!this.previewCtx) return;

    this.previewCtx.save();
    this.previewCtx.scale(-1, 1);
    this.previewCtx.drawImage(this.videoElement, -220, 0, 220, 130);
    this.previewCtx.restore();

    this.previewCtx.fillStyle = '#0a0a0a';
    this.previewCtx.fillRect(0, 130, 220, 70);

    let y = 142;
    this.moods.forEach(mood => {
      const score = scores[mood] || 0;
      const isActive = this.activeMood === mood;

      this.previewCtx.fillStyle = isActive ? '#22c55e' : '#737373';
      this.previewCtx.font = '10px sans-serif';
      this.previewCtx.fillText(mood.substring(0, 5).toUpperCase(), 8, y + 8);

      this.previewCtx.fillStyle = '#262626';
      this.previewCtx.fillRect(50, y, 115, 8);

      this.previewCtx.fillStyle = score >= this.threshold ? '#22c55e' : '#f59e0b';
      this.previewCtx.fillRect(50, y, Math.min(115, score * 115), 8);

      this.previewCtx.fillStyle = '#f5f5f5';
      this.previewCtx.fillText(score.toFixed(2), 172, y + 8);

      y += 18;
    });
  }

  renderManualSelector(containerElement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mood-pill-selector';
    
    this.moods.forEach(mood => {
      const btn = document.createElement('button');
      btn.innerText = mood.charAt(0).toUpperCase() + mood.slice(1);
      btn.className = 'mood-pill';
      btn.onclick = () => {
        document.querySelectorAll('.mood-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setMood(mood);
      };
      wrapper.appendChild(btn);
    });

    containerElement.appendChild(wrapper);
  }
}

const mood = new Mood();
export default mood;