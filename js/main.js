window.onload = function()
{
    // Constants.
    const stage                   = new createjs.Stage("blockCanvas");
    const BALL_RADIUS             = 10;
    const INIT_VELOCITY           = 6;
    const BLOCK_WIDTH_DEVIDE_NUM  = 20;
    const BLOCK_HEIGHT_DEVIDE_NUM = 10;
    const BLOCK_AREA_BEGIN        = new Victor(0, 0);
    const BLOCK_AREA_END          = new Victor(stage.canvas.width, stage.canvas.height * 0.75);
    const BLOCK_AREA_SIZE         = BLOCK_AREA_END.subtract(BLOCK_AREA_BEGIN);
    const BAR_SIZE                = new Victor(90, 20);
    console.log("Block area size", BLOCK_AREA_SIZE.toString());

    // Set rendering configurations.
    createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
    createjs.Ticker.setFPS(60);

    // Create image layer class.
    const ImageBlockLayer = (function() {
        // Constructor
        function ImageBlockLayer(stage, bitmap, sizeX, sizeY, spriteCellContainer)
        {
            this.stage = stage;
            this.bitmap = bitmap;
            this.visibleMatrix = new Array(sizeY);
            for (var i = 0; i < sizeY; ++i) {
                this.visibleMatrix[i] = new Array(sizeX);
                for (var j = 0; j < sizeX; ++j) {
                    this.visibleMatrix[i][j] = true;
                }
            }
            this.visibleCellCounter = sizeX * sizeY;

            this.spriteCellMatrix = new Array(sizeY);
            for (var i = 0; i < sizeY; ++i) {
                this.spriteCellMatrix[i] = new Array(sizeX);
                for (var j = 0; j < sizeX; ++j) {
                    this.spriteCellMatrix[i][j] = spriteCellContainer.getChildAt((i * sizeX) + j);
                }
            }
            this.cellSize = new Victor(sizeX, sizeY);
            this.spriteCellContainer = spriteCellContainer;
        };

        var new_prototype = ImageBlockLayer.prototype;
        new_prototype.destructor = function()
        {
            this.spriteCellContainer.removeAllChildren();
            this.spriteCellContainer = null;
            this.stage.removeChild(this.spriteCellContainer);
        }

        new_prototype.invisibleCellAt = function(x, y)
        {
            this.visibleMatrix[x][y] = false;
            this.spriteCellMatrix[x][y].alpha = 0.0;
            --this.visibleCellCounter;
        }

        new_prototype.isInvisibleAllCell = function()
        {
            return (this.visibleCellCounter == 0) ? (true) : (false);
        }

        return ImageBlockLayer;
    })();

    // Create ball class by inherit from Shape.
    const Ball = (function() {
        const BALL_GRAVITY = 0.05;

        // Constructor
        function Ball(stage, x, y, radius, initVelocity, color)
        {
            this.Shape_constructor();
            this.x            = x;
            this.y            = y;
            this.position     = new Victor(x, y);
            this.initVelocity = initVelocity;
            this.velocity     = new Victor(0, -initVelocity);
            this.stage        = stage;
            this.radius       = radius;
            this.color        = color;
            this.STAGE_WIDTH  = stage.canvas.width;
            this.STAGE_HEIGHT = stage.canvas.height;
            this.checkCounter = 0;

            this.graphics.beginFill(createjs.Graphics.getRGB(color)).drawCircle(0, 0, this.radius);
        }
        var new_prototype = createjs.extend(Ball, createjs.Shape);


        new_prototype.isCollisionRectangle = function(ballPosition, r, rectanglePosition, rectangleSize)
        {
            // Check ball includes rectangle corner.
            var checker1 = function(t, cs)
            {
                var rSq = r * r;
                for (var i = 0; i < cs.length; ++i) {
                    var dx = cs[i].x - t.x;
                    var dy = cs[i].y - t.y;
                    if ((dx * dx + dy * dy) < rSq) {
                        return true;
                    }
                }

                return false;
            }

            // Check ball includes each rectangle line.
            var checker2 = function(cs, m)
            {
                var f = function(p, q)
                {
                    var pq = q.clone().subtract(p);
                    var pm = m.clone().subtract(p);
                    var inner = pq.clone().dot(pm);
                    var pqd2 = pq.lengthSq();
                    var pmd2 = pm.lengthSq();
                    var k = inner / pqd2;

                    if ((k < 0) || (1 < k)) {
                        return false;
                    }

                    var phd2 = inner * k;
                    var d2 = pmd2 - phd2;
                    return (d2 < (r * r)) ? (true) : (false);
                }

                return (f(cs[0], cs[1], m) || f(cs[0], cs[2], m) || f(cs[1], cs[3], m) || f(cs[2], cs[3], m));
            }

            // Check rectangle includes ball.
            var checker3 = function(cs, m)
            {
                var theta = [ , ];
                for (var i = 0; i < 2; ++i) {
                    var pp = cs[i + 1].clone().subtract(cs[i * 3]);
                    var pm = m.clone().subtract(cs[i * 3]);
                    var inner = pp.clone().dot(pm);
                    var outer = pp.clone().cross(pm);
                    theta[i] = Math.atan2(outer, inner) * (180 / Math.PI);
                }

                return ((0 <= theta[0]) && (theta[0] <= 90) && (0 <= theta[1]) && (theta[1] <= 90)) ? (true) : (false)
            }

            var corners = [
                rectanglePosition.clone(),
                rectanglePosition.clone().addX(rectangleSize),
                rectanglePosition.clone().addY(rectangleSize),
                rectanglePosition.clone().add(rectangleSize),
            ];

            return (checker3(corners, ballPosition) || checker2(corners, ballPosition) || checker1(ballPosition, corners));
        }


        new_prototype.isCollisionBlock = function(blockContainer, positionX, positionY, sizeX, sizeY)
        {
            var pt = blockContainer.globalToLocal(this.position.x, this.position.y);
            return this.isCollisionRectangle(new Victor(pt.x, pt.y), this.radius, new Victor(positionX, positionY), new Victor(sizeX, sizeY));
        }


        new_prototype.isCollisionBar = function()
        {
            return this.isCollisionRectangle(this.position, this.radius, new Victor(bar.x, bar.y), BAR_SIZE);
        }


        new_prototype.getReflectVelocityWithRectangle = function(ballPosition, r, rectanglePosition, rectangleSize)
        {
            var vx = 0;
            var vy = 0;
            var bx = ballPosition.x + r;
            var by = ballPosition.y + r;

            // Each boundary.
            var rectLeftX  = rectanglePosition.x + rectangleSize.x * (1 / 4);
            var rectRightX = rectanglePosition.x + rectangleSize.x * (3 / 4);
            var rectAboveY = rectanglePosition.y + rectangleSize.y * (1 / 4);
            var rectBelowY = rectanglePosition.y + rectangleSize.y * (5 / 7);

            var v = this.initVelocity;
            if ((bx <= rectLeftX) && (by <= rectAboveY)) {
                // Collision left above.
                vx = -v;
                vy = -v;
                console.log("left above");
            } else if ((rectRightX <= bx) && (by <= rectAboveY)) {
                // Collision right above.
                vx = v;
                vy = -v;
                console.log("right above");
            } else if ((bx <= rectLeftX) && (rectBelowY <= by)) {
                // Collision left below.
                vx = -v;
                vy = v;
                console.log("left below");
            } else if ((rectRightX <= bx) && (rectBelowY <= by)) {
                // Collision right below.
                vx = v;
                vy = v;
                console.log("right below");
            } else if (((rectLeftX < bx) && (bx < rectRightX)) && (by <= rectAboveY)) {
                // Collision center above.
                vx = v;
                vy = -v;
                console.log("center above");
            } else if (((rectLeftX < bx) && (bx < rectRightX)) && (rectBelowY <= by)) {
                // Collision center below.
                vx = v;
                vy = v;
                console.log("center below");
            } else if ((bx <= rectLeftX) && (((rectAboveY < by)) && (by < rectBelowY))) {
                // Collision center left.
                vx = -v;
                vy = -v;
                console.log("center left");
            } else if (((rectRightX <= bx) && (((rectAboveY < by)) && (by < rectBelowY)))) {
                // Collision center right.
                vx = v;
                vy = -v;
                console.log("center right");
            }
            this.syncPosition();

            return new Victor(vx, vy);
        }


        new_prototype.onTick = function(event)
        {
            var self = this;
            return (function(event) {
                    // Move
                    self.position.add(self.velocity);

                    // Check stage boundary.
                    var x = self.position.x;
                    var y = self.position.y;
                    if ((self.STAGE_WIDTH) < x) {
                        self.velocity.x *= -1;
                        self.position.x = (self.STAGE_WIDTH - self.radius);
                    }

                    if (x < 0) {
                        self.velocity.x *= -1;
                        self.position.x = self.radius;
                    }

                    if (self.STAGE_HEIGHT <= y) {
                        self.y = self.STAGE_HEIGHT + self.radius * 2;
                        self.stage.update();

                        // Game over.
                        onGameOver();
                        return;
                    }

                    if ((y - self.radius) <= 0) {
                        self.velocity.y *= -1;
                        self.position.y = self.radius;
                    }

                    // redraw.
                    self.syncPosition();
                    self.stage.update();

                    // Check Bar.
                    if (self.isCollisionBar() == true) {
                        self.velocity = self.getReflectVelocityWithRectangle(self.position, self.radius, new Victor(bar.x, bar.y), BAR_SIZE);
                        return;
                    }

                    // Check Block
                    x = self.position.x;
                    y = self.position.y;
                    var imageBlockLayer = imageBlockLayers[0];
                    var cellMatrix = imageBlockLayer.spriteCellMatrix;
                    var visibleMatrix = imageBlockLayer.visibleMatrix;
                    for (var i = 0; i < cellMatrix.length; i++) {
                        for (var j = 0; j < cellMatrix[i].length; ++j) {
                            if (visibleMatrix[i][j] == false) {
                                continue;
                            }

                            var cell = cellMatrix[i][j];
                            var bounds = cell.getBounds();
                            if (self.isCollisionBlock(imageBlockLayer.spriteCellContainer, bounds.x, bounds.y, bounds.width, bounds.height)) {
                                self.velocity = self.getReflectVelocityWithRectangle(self.position, self.radius, new Victor(bounds.x, bounds.y), new Victor(bounds.width, bounds.height));

                                imageBlockLayer.invisibleCellAt(i, j);

                                if (imageBlockLayer.isInvisibleAllCell() == true) {
                                    imageBlockLayer.destructor();
                                    imageBlockLayers.shift();

                                    if (imageBlockLayers.length == 1) {
                                        onFinish();
                                    }
                                }

                                return;
                            }
                        }
                    }
            });
        }


        new_prototype.syncPosition = function()
        {
            this.x = this.position.x;
            this.y = this.position.y;
        }


        new_prototype.turnOnTick = function()
        {
            this.tickHandler = this.onTick();
            createjs.Ticker.addEventListener("tick", this.tickHandler);
        }


        new_prototype.turnOffTick = function()
        {
            createjs.Ticker.removeEventListener("tick", this.tickHandler);
        }

        // return Ball class.
        return createjs.promote(Ball, "Shape");
    })();

    // Create Bar
    var bar = new createjs.Shape();
    bar.graphics.beginFill("#d7003a").drawRect(0, 0, BAR_SIZE.x, BAR_SIZE.y);
    bar.setBounds(0, 0, BAR_SIZE.x, BAR_SIZE.y);
    stage.addChild(bar);
    bar.x = (stage.canvas.width / 2) - (BAR_SIZE.x / 2);
    bar.y = stage.canvas.height - BAR_SIZE.y * 2;
    var oldStageX = -1;
    var isMoveBar = false;
    var onMovingMouse = function(event)
    {
        if (isMoveBar == false) {
            return;
        }

        // var x = event.stageX;
        var x = event.clientX;

        if (oldStageX == -1) {
            oldStageX = x;
            return;
        }

        var moveAmount = x - oldStageX;
        if (7 < moveAmount) {
            moveAmount = 7;
        } else if (moveAmount < -7) {
            moveAmount = -7;
        }
        bar.x += moveAmount;

        if (bar.x < 0) {
            bar.x = 0;
        } else if (stage.canvas.width < (bar.x + BAR_SIZE.x)) {
            bar.x = stage.canvas.width - BAR_SIZE.x;
        }

        oldStageX = x;
    };
    window.addEventListener("mousemove", onMovingMouse);

    var onMouseDown = function()
    {
        isMoveBar = true;
    }
    stage.on("stagemousedown", onMouseDown);

    var onMouseUp = function()
    {
        isMoveBar = false;
        oldStageX = -1;
    }
    stage.on("stagemouseup", onMouseUp);

    // Create ball.
    var ball = new Ball(stage, 220, 650, BALL_RADIUS, INIT_VELOCITY, 0x4d5aaf);
    stage.addChild(ball);

    // Load images into imageBlockLayers.
    // Early index is top on the canvas.
    var imageBlockLayers = [];
    var imageLoadQueue = new createjs.LoadQueue(false);
    var manifest = ['img/1.png', 'img/2.png'];
    imageLoadQueue.loadManifest(manifest, true);
    var onFileLoad = function(event)
    {
        var item = event.item;
        if (item.type != createjs.LoadQueue.IMAGE) {
            return;
        }

        // Calculate scaling.
        var bitmap = new createjs.Bitmap(event.result);
        var bounds = bitmap.getBounds();
        var scale  = Math.min((BLOCK_AREA_SIZE.x / bounds.width), (BLOCK_AREA_SIZE.y / bounds.height));

        // Create sprite sheet;
        var spBuilder     = new createjs.SpriteSheetBuilder();
        var blockSize     = new Victor(bounds.width / BLOCK_WIDTH_DEVIDE_NUM, bounds.height / BLOCK_HEIGHT_DEVIDE_NUM);
        var cropRectangle = new createjs.Rectangle(0, 0, blockSize.x, blockSize.y);

        for (var i = 0, j = 0; i < (BLOCK_WIDTH_DEVIDE_NUM * BLOCK_HEIGHT_DEVIDE_NUM); i++) {
            cropRectangle.x = (blockSize.x) * (i - j * BLOCK_WIDTH_DEVIDE_NUM);
            cropRectangle.y = (blockSize.y) * j;
            spBuilder.addFrame(bitmap, cropRectangle.clone(), scale);

            if (((i + 1) % BLOCK_WIDTH_DEVIDE_NUM) == 0) {
                j++;
            }
        }
        var spriteSheet = spBuilder.build();

        // Create each sprite
        var container = new createjs.Container();
        for (var i = 0; i < (BLOCK_WIDTH_DEVIDE_NUM * BLOCK_HEIGHT_DEVIDE_NUM); i++) {
            var sprite = new createjs.Sprite(spriteSheet);
            sprite.gotoAndStop(i);
            container.addChild(sprite);
        }

        // Horizontally centering image.
        var scaledSizeX = bounds.width * scale;
        var paddingX    = (scaledSizeX < BLOCK_AREA_SIZE.x) ? ((BLOCK_AREA_SIZE.x - scaledSizeX) / 2) : (0);
        container.x = paddingX;

        // Insert container at bottom of stage.
        stage.addChild(container);
        for (var i = stage.numChildren; 0 < i; --i) {
            stage.swapChildrenAt(i, i - 1);
        }

        imageBlockLayers.push(new ImageBlockLayer(stage, bitmap, BLOCK_WIDTH_DEVIDE_NUM, BLOCK_HEIGHT_DEVIDE_NUM, container));
    }
    imageLoadQueue.addEventListener('fileload', onFileLoad);

    var onCompleteLoad = function()
    {
        console.log("Complete Image Load");
        onStart();
    };
    imageLoadQueue.addEventListener('complete', onCompleteLoad);

    var onStart = function()
    {
        // Start dialog.
        var text = new createjs.Text("Click To Start !", "28px Arial", "#ABC");
        var bounds = text.getBounds();
        text.x = (stage.canvas.width - bounds.width) / 2;
        text.y = stage.canvas.height * 0.85;

        // Screen cover
        var screenBlur = new createjs.Shape();
        screenBlur.graphics.beginFill("#111").drawRect(0, 0, stage.canvas.width, stage.canvas.height);
        screenBlur.alpha = 0.8;
        var onClickScreen = function(event) {
            stage.removeChild(screenBlur);
            stage.removeChild(text);

            // Start.
            ball.turnOnTick();
        }
        screenBlur.on("click", onClickScreen, null, true);

        stage.addChild(screenBlur);
        stage.addChild(text);

        stage.update();

        console.log("Ready");
    }

    var onGameOver = function()
    {
        ball.turnOffTick();

        // GameOver dialog.
        var text = new createjs.Text("Game Over !\nClick To Restart", "28px Arial", "#000");
        var bounds = text.getBounds();
        text.x = (stage.canvas.width - bounds.width) / 2;
        text.y = stage.canvas.height * 0.85;

        // Screen cover
        var screenCover = new createjs.Shape();
        screenCover.graphics.beginFill("#111").drawRect(0, 0, stage.canvas.width, stage.canvas.height);
        screenCover.alpha = 0.01;
        var onClickScreen = function(event) {
            stage.removeChild(screenCover);
            stage.removeChild(text);

            location.reload();
        }
        screenCover.on("click", onClickScreen, null, true);

        stage.addChild(screenCover);
        stage.addChild(text);

        stage.update();
    }

    var onFinish = function()
    {
        ball.turnOffTick();

        // GameOver dialog.
        var text = new createjs.Text("Clear", "28px Arial", "#000");
        var bounds = text.getBounds();
        text.x = (stage.canvas.width - bounds.width) / 2;
        text.y = stage.canvas.height * 0.85;

        stage.addChild(text);
    }
};
