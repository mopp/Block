window.onload = function()
{
    // Constants.
    const stage                   = new createjs.Stage("blockCanvas");
    const BALL_RADIUS             = 10;
    const INIT_VELOCITY           = 10;
    const BLOCK_WIDTH_DEVIDE_NUM  = 20;
    const BLOCK_HEIGHT_DEVIDE_NUM = 10;
    const BLOCK_AREA_BEGIN        = new Victor(0, 0);
    const BLOCK_AREA_END          = new Victor(stage.canvas.width, stage.canvas.height * 0.6);
    const BLOCK_AREA_SIZE         = BLOCK_AREA_END.subtract(BLOCK_AREA_BEGIN);

    // Create image layer class.
    const ImageBlockLayer = (function() {
            // Constructor
            function ImageBlockLayer(stage, bitmap, sizeX, sizeY, spriteCellContainer)
            {
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
            new_prototype.destructor = function() {
                this.spriteCellContainer.removeAllChildren();
                this.spriteCellContainer = null;
                this.stage.removeChild(this.spriteCellContainer);
            }

            new_prototype.invisibleCellAt = function(x, y) {
                this.visibleMatrix[x][y] = false;
                this.spriteCellMatrix[x][y].alpha = 0.0;
                --this.visibleCellCounter;
            }

            new_prototype.isInvisibleAllCell = function() {
                return (this.visibleCellCounter == 0) ? (true) : (false);
            }

            return ImageBlockLayer ;
    })();

    // Create ball class by inherit from Shape.
    const Ball = (function() {
            // Constructor
            function Ball(stage, x, y, radius, initVelocity, color)
            {
                this.Shape_constructor();
                this.x            = x;
                this.y            = y;
                this.position     = new Victor(x, y);
                this.velocity     = new Victor(0, initVelocity);
                this.stage        = stage;
                this.radius       = radius;
                this.color        = color;
                this.STAGE_WIDTH  = stage.canvas.width;
                this.STAGE_HEIGHT = stage.canvas.height;

                this.graphics.beginFill(createjs.Graphics.getRGB(color)).drawCircle(0, 0, this.radius);
            }
            var new_prototype = createjs.extend(Ball, createjs.Shape);

            new_prototype.collisionRectangle = function(positionX, positionY, sizeX, sizeY)
            {
                var rectangleSize = new Victor(sizeX, sizeY);
                var rectanglePos  = new Victor(positionX, positionY);
                var r = this.radius;

                // Check ball includes rectangle corner.
                var checker1 = function(v1, v2) {
                    return ((v1.distance(v2)) < (r * r)) ? (true) : (false);
                }

                // Check ball includes each rectangle line.
                var checker2 = function(p, q, m) {
                    var pq = q.clone().subtract(p);
                    var pm = m.clone().subtract(p);
                    var inner = pq.clone().dot(pm);
                    var pqd2 = pq.clone().lengthSq();
                    var pmd2 = pm.clone().lengthSq();
                    var k = inner / pqd2;

                    if ((k < 0) || (1 < k)) {
                        return false;
                    }

                    var phd2 = inner * k;
                    var d2 = pmd2 - phd2;

                    return (d2 < (r * r)) ? (true) : (false);
                }

                var checker3 = function(cs, m) {
                    var theta = [, ];
                    for (var i = 0; i < 2; ++i) {
                        var pp = cs[i + 1].clone().subtract(cs[i * 3]);
                        var pm = m.clone().subtract(cs[i * 3]);
                        var inner = pp.clone().dot(pm);
                        var outer = pp.clone().cross(pm);
                        theta[i] = Math.atan2(outer, inner) * (180 / Math.PI);
                    }

                    return ((0 <= theta[0]) && (theta[0] <= 90) && (0 <= theta[1]) && (theta[1] <= 90)) ? (true) : (false)
                }

                var c1 = rectanglePos.clone();
                var c2 = rectanglePos.clone().addX(rectangleSize);
                var c3 = rectanglePos.clone().addY(rectangleSize);
                var c4 = rectanglePos.clone().add(rectangleSize);

                return (checker3([c1, c2, c3, c4], this.position));

                return (
                    checker2(c1, c2, this.position) ||
                    checker2(c1, c3, this.position) ||
                    checker2(c2, c4, this.position) ||
                    checker2(c3, c4, this.position)
                );

                return (
                    checker1(this.position, c1) ||
                    checker1(this.position, c2) ||
                    checker1(this.position, c3) ||
                    checker1(this.position, c4)
                );
            }

            new_prototype.onTick = function(event)
            {
                var self = this;
                return (function(event) {
                        var x = self.position.x;
                        var y = self.position.y;

                        if ((self.STAGE_WIDTH < x) || (x <= 0)) {
                            // Reverse X direction.
                            self.velocity.x *= -1;
                        }
                        if ((self.STAGE_HEIGHT < y) || (y <= 0)) {
                            // Reverse Y direction.
                            self.velocity.y *= -1;
                        }

                        // Move
                        self.position.add(self.velocity);
                        self.syncPosition();

                        // redraw.
                        self.stage.update();

                        if (BLOCK_AREA_END.y < y) {
                            return;
                        }

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
                                if (self.collisionRectangle(bounds.x, bounds.y, bounds.width, bounds.height)) {
                                    self.velocity.y *= -1;
                                    imageBlockLayer.invisibleCellAt(i, j);
                                    if (imageBlockLayer.isInvisibleAllCell() == true) {
                                        imageBlockLayer.destructor();
                                        imageBlockLayers.shift();
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

    // Load images into imageBlockLayers.
    // Early index is top on the canvas.
    var imageBlockLayers = [];
    var imageLoadQueue = new createjs.LoadQueue(false);
    var manifest = [
        {'src' : 'img/rin2.jpg', 'id' : 'layer2'},
        {'src' : 'img/rin.jpg', 'id' : 'layer1'}
    ];
    imageLoadQueue.loadManifest(manifest, true);
    var onFileLoad = function(event)
    {
        var item = event.item;
        if (item.type != createjs.LoadQueue.IMAGE) {
            return;
        }

        var bitmap = new createjs.Bitmap(event.result);

        // Calculate scaling.
        var bounds = bitmap.getBounds();
        var scaleX = BLOCK_AREA_SIZE.x / bounds.width;
        var scaleY = BLOCK_AREA_SIZE.y / bounds.height;
        var scale = Math.min(scaleX, scaleY);

        var blockSize = new Victor(bounds.width / BLOCK_WIDTH_DEVIDE_NUM, bounds.height / BLOCK_HEIGHT_DEVIDE_NUM);

        // Create sprite sheet;
        var spBuilder = new createjs.SpriteSheetBuilder();
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

        // Insert container at bottom of stage.
        var container = stage.addChild(new createjs.Container());
        for (var i = stage.numChildren; 0 < i; --i) {
            stage.swapChildrenAt(i, i - 1);
        }

        // Create each sprite
        for (var i = 0; i < (BLOCK_WIDTH_DEVIDE_NUM * BLOCK_HEIGHT_DEVIDE_NUM); i++) {
            var sprite = new createjs.Sprite(spriteSheet);
            sprite.gotoAndStop(i);
            container.addChild(sprite);
        }

        imageBlockLayers.push(new ImageBlockLayer(stage, bitmap, BLOCK_WIDTH_DEVIDE_NUM, BLOCK_HEIGHT_DEVIDE_NUM, container));
    }
    imageLoadQueue.addEventListener('fileload', onFileLoad);

    // Set rendering configurations.
    createjs.Ticker.timingMode = createjs.Ticker.RAF_SYNCHED;
    createjs.Ticker.setFPS(60);

    // Create ball.
    var ball = new Ball(stage, 200, 600, BALL_RADIUS, INIT_VELOCITY, 0xAA00FF);
    stage.addChild(ball);
    stage.update();

    // Start.
    ball.turnOnTick();
};
