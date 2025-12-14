let particles = [];
let numParticles = 30;

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.position(0, 0);
    canvas.style('z-index', '-1');
    canvas.style('position', 'fixed');
    
    // Create particles
    for (let i = 0; i < numParticles; i++) {
        particles.push({
            x: random(width),
            y: random(height),
            vx: random(-0.3, 0.3),
            vy: random(-0.3, 0.3),
            size: random(8, 15)
        });
    }
}

function draw() {
    background(244, 243, 242);
    
    // Move and draw particles
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        
        // Move particle
        p.x += p.vx;
        p.y += p.vy;
        
        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        
        // Draw particle
        noStroke();
        fill(138, 196, 188, 120);
        circle(p.x, p.y, p.size);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}