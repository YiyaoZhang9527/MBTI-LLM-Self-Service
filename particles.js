class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.reset();
    }

    reset() {
        this.x = Math.random() * this.canvas.width;
        this.y = Math.random() * this.canvas.height;
        this.z = Math.random() * 2 + 0.5; // Depth factor
        this.size = Math.random() * 2;
        this.speed = Math.random() * 2 + 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;

        // Target center
        this.tx = this.canvas.width / 2;
        this.ty = this.canvas.height / 2;

        // Random starting angle
        this.angle = Math.random() * Math.PI * 2;
        this.radius = Math.max(this.canvas.width, this.canvas.height) * (0.5 + Math.random() * 0.5);

        this.x = this.tx + Math.cos(this.angle) * this.radius;
        this.y = this.ty + Math.sin(this.angle) * this.radius;

        // Trail history
        this.history = [];
        this.maxHistory = 10;
    }

    update() {
        // Save current position to history
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Move towards center
        const dx = this.tx - this.x;
        const dy = this.ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Accelerate as it gets closer
        const speed = this.speed * (1 + (1000 / (dist + 10)));

        this.x += (dx / dist) * speed;
        this.y += (dy / dist) * speed;

        // Fade out when very close to center
        if (dist < 50) {
            this.opacity -= 0.05;
        } else if (this.opacity < 1) {
            this.opacity += 0.01;
        }

        // Reset if reached center or invisible
        if (dist < 5 || this.opacity <= 0) {
            this.reset();
        }
    }

    draw(ctx) {
        // Draw Trail
        if (this.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(this.history[0].x, this.history[0].y);
            for (let i = 1; i < this.history.length; i++) {
                ctx.lineTo(this.history[i].x, this.history[i].y);
            }
            ctx.lineTo(this.x, this.y);
            ctx.strokeStyle = `rgba(0, 240, 255, ${this.opacity * 0.3})`;
            ctx.lineWidth = this.size / 2;
            ctx.stroke();
        }

        // Draw Head
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 240, 255, ${this.opacity})`; // Cyan glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = "rgba(0, 240, 255, 0.8)";
        ctx.fill();
    }
}

// 容错处理 - 等待DOM加载
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('star-canvas');
    if (!canvas) {
        console.error('❌ 找不到star-canvas元素');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('❌ 无法获取Canvas 2D上下文');
        return;
    }

    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();
    }

  function initParticles() {
        particles = [];
        const count = Math.floor((canvas.width * canvas.height) / 10000); // Density
        console.log(`✅ 初始化${count}个粒子`);
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(canvas));
        }
    }

    function animate() {
        // Clear canvas completely to let CSS background show through
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);

    // 初始化
    console.log('🌟 启动星空粒子系统...');
    resize();
    animate();
    console.log('✅ 星空粒子系统已启动');
});
