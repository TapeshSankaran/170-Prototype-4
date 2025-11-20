class Laser extends Phaser.Physics.Arcade.Sprite
{
	constructor(scene, x, y) {
		super(scene, x, y, 'laser');
	}

	fire(x, y) {
		this.body.reset(x, y);

		this.setActive(true);
		this.setVisible(true);
        this.rotation = Math.PI*0.5;
		this.setVelocityX(900);

	}

	kill() {
		this.body.reset(-10, -10);

		this.setActive(false);
		this.setVisible(false);

		this.setVelocityX(0);

	}
}

class LaserGroup extends Phaser.Physics.Arcade.Group
{
	constructor(scene) {
		super(scene.physics.world, scene);

		this.createMultiple({
			frameQuantity: 3000,
			key: 'laser',
			active: false,
			visible: false,
			classType: Laser
		});
	}

	fireBullet(x, y) {
		const laser = this.getFirstDead(false);

		if(laser) {
			laser.fire(x, y);
		}
	}
}

// ========== CONVOY CODE START ==========
// Laser class for convoy ships (allies)
class ConvoyLaser extends Phaser.Physics.Arcade.Sprite
{
	constructor(scene, x, y) {
		super(scene, x, y, 'laser');
	}

	fire(x, y) {
		this.body.reset(x, y);
		this.setActive(true);
		this.setVisible(true);
		this.rotation = Math.PI * 0.5;
		this.setVelocityX(900);
	}

	kill() {
		this.body.reset(-10, -10);
		this.setActive(false);
		this.setVisible(false);
		this.setVelocityX(0);
	}
}

class ConvoyLaserGroup extends Phaser.Physics.Arcade.Group
{
	constructor(scene) {
		super(scene.physics.world, scene);
		this.createMultiple({
			frameQuantity: 500,
			key: 'laser',
			active: false,
			visible: false,
			classType: ConvoyLaser
		});
	}

	fireBullet(x, y) {
		const laser = this.getFirstDead(false);
		if(laser) {
			laser.fire(x, y);
		}
	}
}
// ========== CONVOY CODE END ==========

class SpaceScene extends Phaser.Scene
{
	constructor() {
		super('SpaceScene');

		this.ship;
		this.laserGroup;
		this.inputKeys;
		this.highScore = 0;
		this.score = 0;
		this.wave = 1;
		this.timeLeft = 120000;
		this.scrollSpeed = 0;
		this.scrollTotal = 0;
		this.canMove = true;
		this.over = false;
		this.shipX = -1;
		this.shootTime = 500;
		this.speed = 10;
        this.shipSpeed = 3.5;

        this.canShoot = true;
        this.numUFOS = 0;
        // ========== CONVOY CODE START ==========
        // Convoy properties (convoys group will be created in create() method)
        this.convoyActive = false;
        this.convoySpawnTimer = null;
        this.convoyLaserGroup = null;
        this.convoyShootTimer = null;
        // ========== CONVOY CODE END ==========

        a: Phaser.Input.Keyboard.Key;
        d: Phaser.Input.Keyboard.Key;
        enter: Phaser.Input.Keyboard.Key;
	}

	preload() {
        this.load.setPath('./assets/')
		this.load.image('laser', 'SHIP/PNG/Lasers/laserBlue04.png');
		this.load.image('ship', 'SHIP/PNG/playerShip1_red.png');
		this.load.image('bar', 'SHIP/PNG/Effects/shield3.png');
		this.load.image('spawn', 'SHIP/PNG/Lasers/laserRed08.png');
		this.load.image('background', 'SHIP/Backgrounds/darkPurple.png');
		this.load.image('ufob', 'UFO/PNG/shipBeige_manned.png');
		this.load.image('ufop', 'UFO/PNG/shipPink_manned.png');
		this.load.image('ufobl', 'UFO/PNG/shipBlue_manned.png');
		this.load.image('ufog', 'UFO/PNG/shipGreen_manned.png');
		this.load.image('ufoy', 'UFO/PNG/shipYellow_manned.png');
		this.load.image('ufod', 'UFO/PNG/laserBlue_burst.png');
		this.load.image('red', 'red.png');
		// ========== CONVOY CODE START ==========
		// Load convoy images
		this.load.image('convoyBlue', 'CONVOY/convoyBlue.png');
		this.load.image('convoyRed', 'CONVOY/convoyRed.png');
		// ========== CONVOY CODE END ==========
		this.load.audio('bgmusic', ['finalMusic.mp3']);
		this.load.audio('shot', ['shot.mp3']);
		this.load.audio('wave', ['wave.mp3']);
		this.load.audio('boom', ['explosion.mp3']);
	}

	create() {
		this.sound.pauseOnBlur = false;
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;

		if (this.shipX < 0)
			this.cameras.main.fadeIn(1000, 0, 0, 0);
	
		this.bg = this.add.tileSprite(0, -16, width*4, height*4, 'background');
		this.emerScreen = this.add.tileSprite(0, -16, width*4, height*4, 'red');
		this.emerScreen.alpha = 0;
		this.bg.tilePositionX += this.scrollTotal;
		
		//reset highscore
		//this.saveHighscore(0);

		this.highScore = this.loadHighscore();

		this.music = this.sound.add('bgmusic', {volume: 0.33});
		this.shootSound = this.sound.add('shot', {volume: 0.1});
		this.waveSound = this.sound.add('wave', {volume: 1});
		this.boomSound = this.sound.add('boom', {volume: 1});
		this.music.play()
		this.laserGroup = new LaserGroup(this);
		// ========== CONVOY CODE START ==========
		// Create convoy laser group for ally shooting
		this.convoyLaserGroup = new ConvoyLaserGroup(this);
		// ========== CONVOY CODE END ==========

		this.waveText = this.add.text(width/2, 30, 'Wave 1', {
			fontSize: 32, 
			color: '#FFCD3D', 
			align: 'center'
		}).setOrigin(0.5, 0.5);

		this.scoreText = this.add.text(width/2, 70, 'Score 0', {
			fontSize: 40, 
			color: '#FFCD3D', 
			align: 'center'
		}).setOrigin(0.5, 0.5);

		this.timeText = this.add.text(width/2, 110, 'time', {
			fontSize: 32, 
			color: '#FFCD3D', 
			align: 'center'
		}).setOrigin(0.5, 0.5);

		this.enterText = this.add.text(width/2, 600, '[Press Enter to Restart]', {
			fontSize: 24, 
			color: '#FFCD3D', 
			align: 'center'
		}).setOrigin(0.5, 0.5);

		this.enterText.visible = false;

		this.barrier = this.add.image(width/2, 70, 'bar');
		this.barrier.scale *= 1.4
		this.barrier.rotation = 3.1415926535;
		this.barrier.alpha = 0.5
        //this.waveText.setTint(0xffcd3d, 0xcaae5a, 0xffcd3d, 0xcaae5a);

		this.reinitialize();

		this.addShip();
		this.addEvents();
        
        this.ufos = this.physics.add.group();
        this.spawnUFO();
        
        // ========== CONVOY CODE START ==========
        // Create convoy group and spawn immediately
        this.convoys = this.physics.add.group();
        // Spawn convoy immediately when player spawns
        this.spawnConvoy();
        // Make convoy ships shoot at enemies periodically
        this.convoyShootTimer = this.time.addEvent({
            delay: 800, // Shoot every 0.8 seconds
            callback: () => {
                if (!this.over && this.canMove && this.convoys.children.entries.length > 0) {
                    this.convoyShoot();
                }
            },
            loop: true
        });
        // ========== CONVOY CODE END ==========
	}

	saveHighscore(score) {
		localStorage.setItem('highscore', score);
	}
	  
	loadHighscore() {
		const highscore = localStorage.getItem('highscore');
		return highscore ? parseInt(highscore) : 0; 
	}

	reinitialize() {
		this.score = 0;
		this.wave = 1;
		this.timeLeft = 120000;
		this.canMove = true;
		this.over = false;
		this.midPoint = false;
		this.shootTime = 500;
		this.speed = 10;

        this.canShoot = true;
        this.numUFOS = 0;
		this.timeBuf = this.game.getTime() + 64170;
		
		// ========== CONVOY CODE START ==========
		// Reset convoy state when reinitializing
		this.convoyActive = false;
		if (this.convoySpawnTimer) {
			this.convoySpawnTimer.remove();
		}
		if (this.convoyShootTimer) {
			this.convoyShootTimer.remove();
		}
		// ========== CONVOY CODE END ==========
	}

	addShip() {

		let centerX = this.shipX;
        let centerY = this.cameras.main.height*0.5;
		if (centerX == -1) {
			centerX = this.cameras.main.width / 2;
		}
		const bottom = this.cameras.main.height;
		this.ship = this.add.image(centerX*0.25, centerY, 'ship');
        this.ship.rotation = Math.PI*0.5;
	}

	addEvents() {
		this.inputKeys = [
			this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
		];
        this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

		this.enter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
	}

    spawnUFO() {
		this.stringarray = ["ufob", "ufobl", "ufop", "ufog", "ufoy"];
		let num = Phaser.Math.Between(4, 10);
        for (let i = 0; i < num; i++) {
			this.addTwine(this.stringarray[i % 5]);
		}

        this.numUFOS += num;
    }

    addTwine(color) {
		let width = this.cameras.main.width;
		let height = this.cameras.main.height;
        this.origin = [Phaser.Math.Between(width*2/3, width), Phaser.Math.Between(10, height)]
        this.dec = [this.origin[0] > 270 ? Phaser.Math.Between(-270, -10) : Phaser.Math.Between(10, 270), this.origin[1] > 270 ? Phaser.Math.Between(-270, -10) : Phaser.Math.Between(10, 270)]
        this.p1 = [this.origin[0]+this.dec[0], this.origin[1]+this.dec[1]]; 
        this.dec = [this.p1[0] > 270 ? Phaser.Math.Between(-270, -10) : Phaser.Math.Between(10, 270), this.p1[1] > 270 ? Phaser.Math.Between(-270, -10) : Phaser.Math.Between(10, 270)]
        this.p2 = [this.p1[0]+this.dec[0], this.p1[1]+this.dec[1]]; 
        this.points = [
			this.origin[0], this.origin[1],
			this.p1[0], this.p1[1],
			this.p2[0], this.p2[1],
        ];
		this.delay = Phaser.Math.Between(2000, 4000);
        this.curve = new Phaser.Curves.Spline(this.points);
		this.alien = this.add.follower(this.curve, this.origin[0], this.origin[1], color);
		this.spawner = this.add.image(this.alien.x, this.alien.y, 'spawn');
		this.spawner.scale *= 1.5;
		this.spawner.rotation += Phaser.Math.Between(40, 60);
		this.tweens.add({
			targets: this.spawner,
			alpha: { from: 1, to: 0},
			rotation: {from: 0, to: 90},
			ease: 'Sine.easeInOut',
			//repeat: 2,
			duration: 500
		});

		this.tweens.add({
			targets: this.alien,
			alpha: { from: 0, to: 1},
			ease: 'Sine.easeIn',
			duration: 500
			
		});
		this.alien.scale *= 0.4;
		this.alien.startFollow({
			from: 0,
			to: 1,
			delay: 0,
			duration: this.delay,
			ease: 'Sine.easeInOut',
			repeat: -1,
			yoyo: true,
			rotateToPath: false,
			rotationOffset: -90
		});

        this.physics.add.existing(this.alien);
        this.ufos.add(this.alien);
    }
    
    // ========== CONVOY CODE START ==========
    // Method to spawn a convoy of ally ships that stay with the player
    spawnConvoy() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        // Number of ships in convoy
        let convoySize = 4;
        
        // Array of convoy images
        let convoyImages = ["convoyBlue", "convoyRed"];
        
        // Spacing between convoy ships
        let spacing = 80;
        
        // Position convoy around the left side of player (player is at 25% width)
        let baseX = width * 0.15;
        let baseY = height * 0.5;
        
        for (let i = 0; i < convoySize; i++) {
            // Alternate between blue and red convoy ships
            let convoyImage = convoyImages[i % 2];
            let offsetX = 0;
            let offsetY = 0;
            
            // V formation around player
            if (i === 0) {
                offsetX = -30;
                offsetY = -spacing * 0.6;
            } else if (i === 1) {
                offsetX = -30;
                offsetY = spacing * 0.6;
            } else if (i === 2) {
                offsetX = -60;
                offsetY = -spacing * 1.2;
            } else {
                offsetX = -60;
                offsetY = spacing * 1.2;
            }
            
            let startX = baseX + offsetX;
            let startY = baseY + offsetY;
            
            // Create convoy ship as a regular sprite so it can follow player position
            let convoyShip = this.add.image(startX, startY, convoyImage);
            convoyShip.rotation = Math.PI * 0.5;
            
            convoyShip.scale *= 0.5;
            convoyShip.setData('convoyIndex', i);
            convoyShip.setData('baseOffset', {x: offsetX, y: offsetY});
            convoyShip.setData('isAlly', true); // Mark as ally
            convoyShip.setData('followPlayer', true);
            
            this.physics.add.existing(convoyShip);
            // DO NOT add to ufos group - they are allies, not enemies
            this.convoys.add(convoyShip);
        }
        
        this.convoyActive = true;
    }
    
    // Method for convoy ships to shoot at enemies
    convoyShoot() {
        if (!this.convoys || this.convoys.children.entries.length === 0) return;
        if (!this.ufos || this.ufos.children.entries.length === 0) return;
        
        // Each convoy ship shoots at nearest enemy
        this.convoys.children.entries.forEach(convoyShip => {
            if (!convoyShip.active) return;
            
            // Find nearest enemy
            let nearestEnemy = null;
            let nearestDistance = Infinity;
            
            this.ufos.children.entries.forEach(enemy => {
                if (!enemy.active) return;
                let dx = enemy.x - convoyShip.x;
                let dy = enemy.y - convoyShip.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < nearestDistance && enemy.x > 0 && enemy.x < this.cameras.main.width) {
                    nearestDistance = distance;
                    nearestEnemy = enemy;
                }
            });
            
            // Shoot at nearest enemy if found
            if (nearestEnemy && nearestDistance < 800) {
                this.convoyLaserGroup.fireBullet(convoyShip.x + 20, convoyShip.y);
            }
        });
    }
    // ========== CONVOY CODE END ==========

	fireBullet() {
		this.laserGroup.fireBullet(this.ship.x, this.ship.y - 20);
	}

    handleCollision(laser, ufo) {
		if (laser != null) {

			this.score += 100;
			laser.kill();
        	ufo.destroy();
		} else {
			ufo.active = false;
			ufo.visible = false;
			this.over = true;
		}
		this.boomSound.play();
		this.boom = this.add.image(ufo.x, ufo.y, 'ufod');
		this.boom.scale *= 0.75
		this.boom.rotation += Phaser.Math.Between(45, 135);
		this.tweens.add({
			targets: this.boom,
			alpha: { from: 1, to: 0},
            x: { from : this.boom.x, to: this.boom.x + -this.speed*67},
			ease: 'Sine.easeOut',
			duration: 500
			
		});
		if (laser != null) {
        	this.numUFOS--;
			if (this.numUFOS == 0) {
				this.waveSound.play();
				this.score += 500 * (0.5 * this.wave);
				this.wave++;
				const text = "Wave " + this.wave;
				this.waveText.setText(text);
				this.spawnUFO();
			}
		}
    }

	update() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        if (this.d.isDown && this.ship.x < width - 50 && this.canMove){
            this.ship.x += this.shipSpeed;
        }
        
        if (this.a.isDown && this.ship.x > 50 && this.canMove){
            this.ship.x -= this.shipSpeed;
        }

        if (this.w.isDown && this.ship.y > 50 && this.canMove){
            this.ship.y -= this.shipSpeed;
        }

        if (this.s.isDown && this.ship.y < height - 50 && this.canMove){
            this.ship.y += this.shipSpeed;
        }

        if (this.enter.isDown && this.ship.x > 50 && this.over){
			this.scene.restart();
        }
        
        // ========== CONVOY CODE START ==========
        // Update convoy ship positions to follow player
        if (this.convoys && this.convoys.children.entries.length > 0 && this.ship) {
            this.convoys.children.entries.forEach(convoyShip => {
                if (!convoyShip.active || !convoyShip.getData('followPlayer')) return;
                let offset = convoyShip.getData('baseOffset');
                if (offset) {
                    // Keep convoy ships in formation relative to player
                    let targetX = this.ship.x + offset.x;
                    let targetY = this.ship.y + offset.y;
                    // Smoothly move towards target position
                    convoyShip.x += (targetX - convoyShip.x) * 0.05;
                    convoyShip.y += (targetY - convoyShip.y) * 0.05;
                }
            });
        }
        // ========== CONVOY CODE END ==========

		if (this.timeLeft < 25000) {
			this.shootTime = 250;
			this.speed = 20;
			if (this.emerScreen.alpha < 0.1 && this.canMove) {
				this.emerScreen.alpha += 0.01;
			}
		}

		// Loop over all keys
		this.inputKeys.forEach(key => {
			// Check if the key was just pressed, and if so -> fire the bullet
			if(this.canShoot && key.isDown && this.canMove) {
				this.score -= 20 * (0.25 * this.wave);
				this.shootSound.play();
				this.fireBullet();
                this.canShoot = false;
                this.time.delayedCall(this.shootTime, () => {
                    this.canShoot = true;
                });
			}
		});

        // Player laser collision with enemies
        this.laserGroup.children.iterate(laser => {
            this.ufos.children.iterate(ufo => {
                // Skip if ufo is actually a convoy ship (ally)
                if (ufo.getData('isAlly')) return;
                if (this.physics.overlap(laser, ufo)) {
                    this.handleCollision(laser, ufo);
                }
            });
        });
        
        // ========== CONVOY CODE START ==========
        // Convoy laser collision with enemies
        if (this.convoyLaserGroup) {
            this.convoyLaserGroup.children.iterate(convoyLaser => {
                if (!convoyLaser.active) return;
                this.ufos.children.iterate(ufo => {
                    // Skip convoy ships (allies) and check only enemies
                    if (ufo.getData('isAlly')) return;
                    if (this.physics.overlap(convoyLaser, ufo)) {
                        // Convoy laser hits enemy
                        this.score += 100;
                        convoyLaser.kill();
                        ufo.destroy();
                        this.numUFOS--;
                        this.boomSound.play();
                        this.boom = this.add.image(ufo.x, ufo.y, 'ufod');
                        this.boom.scale *= 0.75;
                        this.boom.rotation += Phaser.Math.Between(45, 135);
                        this.tweens.add({
                            targets: this.boom,
                            alpha: { from: 1, to: 0},
                            x: { from : this.boom.x, to: this.boom.x + -this.speed*67},
                            ease: 'Sine.easeOut',
                            duration: 500
                        });
                        
                        // Check for wave completion
                        if (this.numUFOS == 0) {
                            this.waveSound.play();
                            this.score += 500 * (0.5 * this.wave);
                            this.wave++;
                            const text = "Wave " + this.wave;
                            this.waveText.setText(text);
                            this.spawnUFO();
                        }
                    }
                });
            });
        }
        // ========== CONVOY CODE END ==========



		if (this.timeLeft >= 0) 
			this.timeLeft = this.timeBuf - this.game.getTime();
		
		if (!this.over)
			this.timeText.setText(Math.trunc(this.timeLeft / 1000));

		this.scoreText.setText("Score " + this.score);

		if (this.scrollSpeed < this.speed && this.timeLeft > 0) this.scrollSpeed += 0.1;

        this.bg.tilePositionX += this.scrollSpeed;

		if (this.timeLeft <= 1000) {
			if (this.emerScreen.alpha > 0) {
				this.emerScreen.alpha -= 0.001;
			}
			this.canMove = false;
			if (this.scrollSpeed >= 0.2)
				this.scrollSpeed -= 0.1;
			else {
				this.time.delayedCall(1000, () => {
					if (!this.over) {
						this.ufos.children.iterate(ufo => {
							this.handleCollision(null, ufo);
						});
					}
					this.barrier.visible = false;
					this.scoreText.y = 475;
					this.waveText.y = 435;
					this.timeText.y = 515;
					if (this.highScore < this.score) {
						this.highScore = this.score;
						this.saveHighscore(this.highScore);
					}
					this.timeText.setText("High Score " + this.highScore);
					this.enterText.visible = true;
					this.scrollTotal = this.bg.tilePositionY;
					this.shipX = this.ship.x;

				});
			}
		}
	}
}

const config = {
	type: Phaser.AUTO,
	width: 1200,
	height: 900,
	physics: {
		default: 'arcade',
		arcade: {
			debug: false,
			gravity: { y: 0 }
		}
	},
	scene: [
		SpaceScene
	]
};

const game = new Phaser.Game(config);
