let floatingdots = [];
let numDots = 30;

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.position(0, 0);
    canvas.style('z-index', '-1');
    canvas.style('position', 'fixed');
    
    // Create dots
    for (let i = 0; i < numDots; i++) {
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
    
    // Move and draw dots
    for (let i = 0; i < dots.length; i++) {
        let d = dots[i];
        
        // Move dots
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = width;
        if (d.x > width) p.x = 0;
        if (d.y < 0) d.y = height;
        if (d.y > height) p.y = 0;
        
        // Draw dots
        noStroke();
        fill(138, 196, 188, 120);
        circle(d.x, d.y, d.size);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}
