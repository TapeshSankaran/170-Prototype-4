class Laser extends Phaser.Physics.Arcade.Sprite {
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

class LaserGroup extends Phaser.Physics.Arcade.Group {
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

		if (laser) {
			laser.fire(x, y);
		}
	}
}

class SpaceScene extends Phaser.Scene {
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

		this.bg = this.add.tileSprite(0, -16, width * 4, height * 4, 'background');
		this.emerScreen = this.add.tileSprite(0, -16, width * 4, height * 4, 'red');
		this.emerScreen.alpha = 0;
		this.bg.tilePositionX += this.scrollTotal;

		//reset highscore
		//this.saveHighscore(0);

		this.highScore = this.loadHighscore();

		this.music = this.sound.add('bgmusic', { volume: 0.33 });
		this.shootSound = this.sound.add('shot', { volume: 0.1 });
		this.waveSound = this.sound.add('wave', { volume: 1 });
		this.boomSound = this.sound.add('boom', { volume: 1 });
		this.music.play()
		this.laserGroup = new LaserGroup(this);

		this.waveText = this.add.text(width / 2, 30, 'Wave 1', {
			fontSize: 32,
			color: '#FFCD3D',
			align: 'center'
		}).setOrigin(0.5, 0.5);

		this.scoreText = this.add.text(width / 2, 70, 'Score 0', {
			fontSize: 40,
			color: '#FFCD3D',
			align: 'center'
		}).setOrigin(0.5, 0.5);

		this.timeText = this.add.text(width / 2, 110, 'time', {
			fontSize: 32,
			color: '#FFCD3D',
			align: 'center'
		}).setOrigin(0.5, 0.5);

		this.enterText = this.add.text(width / 2, 600, '[Press Enter to Restart]', {
			fontSize: 24,
			color: '#FFCD3D',
			align: 'center'
		}).setOrigin(0.5, 0.5);

		this.enterText.visible = false;

		this.barrier = this.add.image(width / 2, 70, 'bar');
		this.barrier.scale *= 1.4
		this.barrier.rotation = 3.1415926535;
		this.barrier.alpha = 0.5
		//this.waveText.setTint(0xffcd3d, 0xcaae5a, 0xffcd3d, 0xcaae5a);

		this.reinitialize();

		this.addShip();
		this.addEvents();

		this.ufos = this.physics.add.group();
		this.spawnUFO();
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
	}

	addShip() {

		let centerX = this.shipX;
		let centerY = this.cameras.main.height * 0.5;
		if (centerX == -1) {
			centerX = this.cameras.main.width / 2;
		}
		const bottom = this.cameras.main.height;
		this.ship = this.add.image(centerX * 0.25, centerY, 'ship');
		this.ship.rotation = Math.PI * 0.5;
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
		let num = Phaser.Math.Between(2, 5);
		for (let i = 0; i < num; i++) {
			this.addTwine(this.stringarray[i % 5]);
		}

		this.numUFOS += num;
	}

	addTwine(color) {
		let width = this.cameras.main.width;
		let height = this.cameras.main.height;
		let curve, delay, startX, startY;

		switch (color) {
			case 'ufob': // Straight Line
				startX = width + 50;
				startY = Phaser.Math.Between(100, height - 100);
				let endX = -20;
				let endY = startY + Phaser.Math.Between(-100, 100);
				curve = new Phaser.Curves.Line(
					new Phaser.Math.Vector2(startX, startY),
					new Phaser.Math.Vector2(endX, endY)
				);
				delay = 10000;
				break;

			case 'ufobl': //Wave
				startX = width + 50;
				startY = Phaser.Math.Between(150, height - 150);
				let wavePoints = [];
				for (let i = 0; i <= 5; i++) {
					let x = startX - (i * width / 5);
					let y = startY + Math.sin(i * Math.PI / 2) * 150;
					wavePoints.push(x, y);
				}
				curve = new Phaser.Curves.Spline(wavePoints);
				delay = 4000;
				break;

			case 'ufop': // Cycle
				let centerX = Phaser.Math.Between(width * 0.6, width * 0.8);
				let centerY = Phaser.Math.Between(height * 0.3, height * 0.7);
				let radius = Phaser.Math.Between(80, 120);
				curve = new Phaser.Curves.Ellipse(centerX, centerY, radius, radius);
				delay = 3500;
				startX = centerX + radius;
				startY = centerY;
				break;

			case 'ufog': // Z-Line
				startX = width + 50;
				startY = Phaser.Math.Between(100, height - 100);
				let zigzagPoints = [
					startX, startY,
					startX - width * 0.25, startY - 100,
					startX - width * 0.5, startY,
					startX - width * 0.75, startY + 100,
					-50, startY
				];
				curve = new Phaser.Curves.Spline(zigzagPoints);
				delay = 4500;
				break;

			case 'ufoy': // Original Twine
			default:
				this.origin = [Phaser.Math.Between(width * 2 / 3, width), Phaser.Math.Between(10, height)]
				this.dec = [this.origin[0] > 270 ? Phaser.Math.Between(-270, -10) : Phaser.Math.Between(10, 270), this.origin[1] > 270 ? Phaser.Math.Between(-270, -10) : Phaser.Math.Between(10, 270)]
				this.p1 = [this.origin[0] + this.dec[0], this.origin[1] + this.dec[1]];
				this.dec = [this.p1[0] > 270 ? Phaser.Math.Between(-270, -10) : Phaser.Math.Between(10, 270), this.p1[1] > 270 ? Phaser.Math.Between(-270, -10) : Phaser.Math.Between(10, 270)]
				this.p2 = [this.p1[0] + this.dec[0], this.p1[1] + this.dec[1]];
				this.points = [
					this.origin[0], this.origin[1],
					this.p1[0], this.p1[1],
					this.p2[0], this.p2[1],
				];
				curve = new Phaser.Curves.Spline(this.points);
				delay = Phaser.Math.Between(2000, 4000);
				startX = this.origin[0];
				startY = this.origin[1];
				break;
		}

		if (startX === undefined) {
			let point = curve.getPoint(0);
			startX = point.x;
			startY = point.y;
		}

		this.alien = this.add.follower(curve, startX, startY, color);
		this.spawner = this.add.image(this.alien.x, this.alien.y, 'spawn');
		this.spawner.scale *= 1.5;
		this.spawner.rotation += Phaser.Math.Between(40, 60);
		this.tweens.add({
			targets: this.spawner,
			alpha: { from: 1, to: 0 },
			rotation: { from: 0, to: 90 },
			ease: 'Sine.easeInOut',
			duration: 500
		});

		this.tweens.add({
			targets: this.alien,
			alpha: { from: 0, to: 1 },
			ease: 'Sine.easeIn',
			duration: 500
		});

		this.alien.scale *= 0.4;

		let followConfig = {
			from: 0,
			to: 1,
			delay: 0,
			duration: delay,
			ease: 'Sine.easeInOut',
			rotateToPath: false,
			rotationOffset: -90
		};

		if (color === 'ufop') {
			followConfig.repeat = -1;
		} else if (color === 'ufob') {
			followConfig.repeat = 0;
		} else {
			followConfig.repeat = -1;
			followConfig.yoyo = true;
		}

		this.alien.startFollow(followConfig);

		this.physics.add.existing(this.alien);
		this.ufos.add(this.alien);
	}

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
			alpha: { from: 1, to: 0 },
			x: { from: this.boom.x, to: this.boom.x + -this.speed * 67 },
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
		if (this.d.isDown && this.ship.x < width - 50 && this.canMove) {
			this.ship.x += this.shipSpeed;
		}

		if (this.a.isDown && this.ship.x > 50 && this.canMove) {
			this.ship.x -= this.shipSpeed;
		}

		if (this.w.isDown && this.ship.y > 50 && this.canMove) {
			this.ship.y -= this.shipSpeed;
		}

		if (this.s.isDown && this.ship.y < height - 50 && this.canMove) {
			this.ship.y += this.shipSpeed;
		}

		if (this.enter.isDown && this.ship.x > 50 && this.over) {
			this.scene.restart();
		}

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
			if (this.canShoot && key.isDown && this.canMove) {
				this.score -= 20 * (0.25 * this.wave);
				this.shootSound.play();
				this.fireBullet();
				this.canShoot = false;
				this.time.delayedCall(this.shootTime, () => {
					this.canShoot = true;
				});
			}
		});

		this.laserGroup.children.iterate(laser => {
			this.ufos.children.iterate(ufo => {
				//console.log(laser)
				if (this.physics.overlap(laser, ufo)) {
					this.handleCollision(laser, ufo);
				}
			});
		});



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
