var canvas = document.querySelector('#myCanvas');
canvas.setAttribute('width', window.innerWidth);
canvas.setAttribute('height', window.innerHeight);

function rgb(red, green, blue) { //returns a string
    return {r: red, g: green, b: blue };
}

function rgba (r, g, b, a) {
    return 'rgba('+r+','+g+','+b+','+a+')';
}

function variate (number, variance) {
    return Math.floor(number + variance - _.random(variance*2));
}

//farther should be blurrier
//farther should be larger
//farther should move slower
var Bokeh = function (x, y, distance, options) {
    options = options || {};
    this.x = x;
    this.y = y;
    this.distance = distance;
    
    // this.radius = options.radius || 70;
    // this.outlineWidth = options.outlineWidth || radius/17;
    this.opacity = options.opacity;
    this.color = options.color;

    this.yStep = Math.random() - .5;

    this.idiosyncracy = Math.random();

    this.setAttributes();
};

_.extend(Bokeh.prototype, {
    draw: function (ctx) {
        var r = this.color.r, g = this.color.g, b = this.color.b;
        var radgrad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        var baseOpacity = this.baseOpacity;
        if (this.distance < 50) {
            radgrad.addColorStop(0, rgba(r, g, b, baseOpacity));
            radgrad.addColorStop(0.88, rgba(r, g, b, baseOpacity));
            radgrad.addColorStop(0.89, rgba(r, g, b, baseOpacity + 0.01));
            radgrad.addColorStop(0.95, rgba(r, g, b, baseOpacity + 0.02));
            // radgrad.addColorStop(0.89, rgba(r, g, b, baseOpacity+ baseOpacity*.15));
            // radgrad.addColorStop(0.95, rgba(r, g, b, baseOpacity+ baseOpacity*.15));
            radgrad.addColorStop(1, rgba(r, g, b, 0));
        } else {
            radgrad.addColorStop(0, rgba(r, g, b, baseOpacity + .05));
            radgrad.addColorStop(0.8, rgba(r, g, b, baseOpacity));
            radgrad.addColorStop(1, rgba(r, g, b, 0));
        }
        ctx.fillStyle = radgrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
    setAttributes: function () {
        var distance = this.distance;
        var maxDistance = 100;
        var maxRadius = 100;
        this.radius = distance/maxDistance * maxRadius;
        var coef = (maxDistance - distance)/maxDistance;
        if (distance < 50) {
            coef = (50 - distance)/50;
        } 
        this.speedCoefficient = coef * coef;
        this.baseOpacity = this.distance > 50 
            // ? this.idiosyncracy < .2 ? .4 : .25
            ? this.idiosyncracy < .2 ? .1 : .05
            : .16;
    }
});

var ctx = canvas.getContext('2d');
ctx.globalCompositeOperation = 'lighter'

var centerX = canvas.width / 2;
var centerY = canvas.height / 2;

var canvasManager = (function () {
    var ctx = canvas.getContext('2d');
    var stepActions = [];

    var fadeIn = function (alpha) {
        ctx.globalAlpha = 0;
        fadeTo(alpha);
    }

    var fadeTo = function (alpha) {
        var stepAction = function () {
            if ((ctx.globalAlpha - alpha) * (ctx.globalAlpha - alpha) < .00001) {
                ctx.globalAlpha = alpha;
                removeStepAction(stepAction);
            }
            ctx.globalAlpha = ctx.globalAlpha + (alpha - ctx.globalAlpha)/20;
        };
        addStepAction(stepAction);
    }

    var bindSize = function (element) {
        window.addEventListener('resize', _.debounce(function() {
            ctx.canvas.width = element.clientWidth;
            ctx.canvas.height = element.clientHeight;
        }, 100));
    };

    var clear = function () {
        // ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // ctx.restore();
    }

    var step = function () {
        clear();
        stepActions.forEach(performAction);
        requestAnimationFrame(step);
    };

    var addStepAction = function (action) {
        stepActions.push(action);
    };

    var removeStepAction = function (action) {
        var index = stepActions.indexOf(action);
        if (index !== -1) {
            setTimeout(function () { //have to make this async else the screen jitters
                stepActions.splice(index, 1);
            }, 0);
        }
    };

    var performAction = function (action) {
        action(ctx);
    };

    var withinBounds = function (point, wiggleRoom) {
        var left = 0 - wiggleRoom;
        var top = 0 - wiggleRoom;
        var right = canvas.offsetWidth + wiggleRoom;
        var bottom = canvas.offsetHeight + wiggleRoom;
        return (left <= point.x && point.x <= right) && (top <= point.y && point.y <= bottom);
    };

    return {
        clear: clear,
        step: step,
        addStepAction: addStepAction,
        fadeIn: fadeIn,
        fadeTo: fadeTo,
        bindSize: bindSize,
        withinBounds: withinBounds
    }
} ());


var dotManager = (function (canvas, canvasManager) {
    var dots = [];

    var transform = function (dot) {
        if (!canvasManager.withinBounds(dot, dot.radius)) {
            repurpose(dot);
        }
        dot.x += .3 * dot.speedCoefficient + .1;
        dot.y += dot.yStep * dot.speedCoefficient-.05;
    };

    /**
     * Resets properties on a dot
     * Currently only repositioning the dot
     * TODO: give semi-random properties based on how many of a certain type are desired and how many currently exist
     */
    var repurpose = function (dot) {
        // dot.color.r = 200;

        // TODO: should maybe reposition based on where the dot went out of bounds
        if (Math.random() < canvas.offsetHeight / (canvas.offsetWidth + canvas.offsetHeight)) {
            // place to the left of canvas
            // TODO: might consider dots that drift leftwards
            dot.y = _.random(0, canvas.height);
            dot.x = 0 - dot.radius;
        } else {
            // places above or below canvas
            dot.x = _.random(0, canvas.width);
            if (dot.yStep < 0) { // drifts upwards
                dot.y = canvas.offsetHeight + dot.radius;
            } else {
                dot.y = 0 - dot.radius;
            }
        }
    }
    var animate = function () {
        //TODO: use timestep instead of changing position on every frame, creating speeds depending on FPS
        canvasManager.addStepAction(function (ctx) {
            dots.forEach(function (dot) {
                transform(dot);
                dot.draw(ctx);
            });
        });
        canvasManager.step();
    };
    return {
        dots: dots,
        animate: animate
    };
}(canvas, canvasManager));

for (var i = 0; i < 30; i++) {
    var x = _.random(0, canvas.width),
        y = _.random(0, canvas.height);
    var dot = new Bokeh(x, y, variate(80, 10), {
        opacity: .5,
        color: rgb(variate(55, 30), variate(220, 20), variate(44, 40))
    });
    dotManager.dots.push(dot);
}

for (var i = 0; i < 40; i++) {
    var x = _.random(0, canvas.width ),
        y = _.random(0, canvas.height);
    var dot = new Bokeh(x, y, variate(30, 10), {
        opacity: .5,
        color: rgb(variate(55, 30), variate(220, 20), variate(44, 40))
    });
    dotManager.dots.push(dot);
}

canvasManager.fadeIn(1);
canvasManager.bindSize(document.body);
dotManager.animate();