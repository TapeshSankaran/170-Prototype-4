class Laser extends Phaser.Physics.Arcade.Sprite {
	constructor(scene, x, y) {
		super(scene, x, y, 'laser');
	}

	fire(x, y, velX, velY) {
		this.body.reset(x, y);

		this.setActive(true);
		this.setVisible(true);
		this.setVelocityX(velX);
		this.setVelocityY(velY);
		this.rotation = Math.atan2(velY, velX) + Math.PI / 2;
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
			laser.fire(x, y, 900, 0);
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

	fire(x, y, velX, velY) {
		this.body.reset(x, y, velX, velY);
		this.setActive(true);
		this.setVisible(true);
		this.setVelocityX(velX);
		this.setVelocityY(velY);
		this.rotation = Math.atan2(velY, velX) + Math.PI / 2;
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

	fireBullet(x, y, velX, velY) {
		const laser = this.getFirstDead(false);
		if(laser) {
			laser.fire(x, y, velX, velY);
		}
	}
}
// ========== CONVOY CODE END ==========

class UFOLaserGroup extends Phaser.Physics.Arcade.Group {
	constructor(scene) {
		super(scene.physics.world, scene);

		this.createMultiple({
			frameQuantity: 3000,
			key: 'ufolaser',
			active: false,
			visible: false,
			classType: Laser
		});
	}

	fireBullet(x, y, velX, velY) {
		const ufolaser = this.getFirstDead(false);

		if (ufolaser) {
			ufolaser.fire(x, y, velX, velY);
			ufolaser.setTint(0xff7777); // Set UFO laser color to red
		}
	}
}

class Anim {
	constructor(scene, conf) {
		// conf = { name:, url:, pos: {x:, y:}, s: {x: 1, y: 1}, a: 1, fs: {x:, y:, end:, fRate: 24}, rotation: 0, repeatTimes: }
		let r = conf.rotation;
		if (r === undefined) r = 0;

		let fRate = conf.fs.fRate;
		if (fRate === undefined) fRate = 24;

		this.size = { x: conf.s ? conf.s.x : 1, y: conf.s ? conf.s.y : 1 }
		this.alpha = conf.a ? conf.a : 1;

		this.scene = scene;

		this.pos = {x: conf.pos.x, y: conf.pos.y};
		this.frameSize = {x: conf.fs.x, y: conf.fs.y, end: conf.fs.end};
		this.rot = conf.rotation;
		this.name = conf.name;
		this.anim_set = this.scene.load.spritesheet({
			key: conf.name,
			url: conf.url,
			frameConfig: {  frameWidth: conf.fs.x, frameHeight: conf.fs.y, endFrame: conf.fs.end }
		});
		this.config = {
			key: conf.name+'Animation',
			frames: 0,
			frameRate: conf.fs.fRate,
			repeat: conf.repeatTimes
		}
		this.spriteConfig = {
			n: this.name,
			p: this.pos,
			r: this.rot,
			s: this.size,
			a: this.alpha,
		}
		this.sprite;
		
	}

	create() {
		this.config.frames = this.scene.anims.generateFrameNumbers(this.name, { start: 0, end: this.frameSize.end })
		this.scene.anims.create(this.config);
		return new AnimSprite(this.scene, this.spriteConfig);
	}
}

class AnimSprite {
	constructor(scene, conf) {
		this.scene = scene;
		this.conf = conf;
		this.n = conf.n;
		this.p = conf.p;
		this.s = conf.s;
		this.a = conf.a;
		this.r = conf.r;
		this.sprite = this.scene.add.sprite(this.p.x, this.p.y, this.n).play(this.n+"Animation");
		this.sprite.rotation = this.r;
		this.sprite.alpha = this.a;
		this.sprite.setScale(this.s.x, this.s.y);
	}

	setPos(x, y) {
		this.p = { x: x, y: y };
		this.sprite.x = x;
		this.sprite.y = y;
	}

	setTint(hex, a=1) {
		this.sprite.setTint(hex);
		this.sprite.alpha = a;
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
		this.scrollSpeed = 0;
		this.scrollTotal = 0;
		this.canMove = true;
		this.yMove = 0;
		this.over = false;
		this.shipX = -1;
		this.shootTime = 500;
		this.speed = 10;
		this.shipSpeed = 4;
		this.fireRateUpActive = false;

        this.canShoot = true;
        this.numUFOS = 0;
        // ========== CONVOY CODE START ==========
        // Convoy properties (convoys group will be created in create() method)
        this.convoyActive = false;
        this.convoySpawnTimer = null;
        this.convoyLaserGroup = null;
        this.convoyShootTimer = null;
        // ========== CONVOY CODE END ==========

		this.formchange = false;
		this.formation = 'wedge';
		let s = 80;
		this.formations = {
			'file': [{x: -s, y: 0}, {x: -2*s, y: 0}, {x: -3*s, y: 0}, {x: -4*s, y: 0}],
			'vee' : [{x: -0.75*s, y: 0.75*s}, {x: 0.75*s, y: 0.75*s}, {x: 0.75*s, y: -0.75*s}, {x: -0.75*s, y: -0.75*s}],
			'line': [{x: 0, y: -s}, {x: 0, y: s}, {x: 0, y: -2*s}, {x: 0, y: 2*s}],
			'shield': [{x: s, y: 0}, {x: -s, y: 0}, {x: 0, y: -s}, {x: 0, y: s}],
			'wedge': [{x: -0.5*s, y: -s}, {x: -0.5*s, y: s}, {x: -s, y: -2*s}, {x: -s, y: 2*s}]
		};

		a: Phaser.Input.Keyboard.Key;
		d: Phaser.Input.Keyboard.Key;
		enter: Phaser.Input.Keyboard.Key;
		this.powerUpFire;
		this.pickUpEffect;
		
		// ========== POWER-UP CODE START ==========
		// Power-up properties
		this.powerUps = null;
		this.fireRateBoostActive = false;
		this.fireRateBoostTimer = null;
		this.shieldCharges = 0;
		this.speedBoostActive = false;
		this.speedBoostTimer = null;
		this.baseShootTime = 500;
		this.baseShipSpeed = 3.5;
		this.powerUpSpawnTimer = null;
		this.powerUps = null;
		this.fireRateBoostActive = false;
		this.fireRateBoostTimer = null;
		this.shieldCharges = 0;
		this.speedBoostActive = false;
		this.speedBoostTimer = null;
		this.baseShootTime = 500;
		this.baseShipSpeed = 3.5;
		this.powerUpSpawnTimer = null;
		this.poweredUpEffect;
		this.poweredUp = false;
		// ========== POWER-UP CODE END ==========
	}

	preload() {
		this.load.setPath('./assets/')
		this.load.image('laser', 'SHIP/PNG/Lasers/laserBlue04.png');
		this.load.image('ship', 'SHIP/PNG/playerShip1_red.png');
		this.load.image('bar', 'SHIP/PNG/Effects/shield3.png');
		this.load.image('spawn', 'SHIP/PNG/Lasers/laserRed08.png');
		this.load.image('background', 'SHIP/Backgrounds/darkPurple.png');
		this.load.image('ufolaser', 'UFO/PNG/Lasers/laserBlue04.png');
		this.load.image('ufob', 'UFO/PNG/shipBeige_manned.png');
		this.load.image('ufop', 'UFO/PNG/shipPink_manned.png');
		this.load.image('ufobl', 'UFO/PNG/shipBlue_manned.png');
		this.load.image('ufog', 'UFO/PNG/shipGreen_manned.png');
		this.load.image('ufoy', 'UFO/PNG/shipYellow_manned.png');
		this.load.image('ufod', 'UFO/PNG/laserBlue_burst.png');
		this.load.image('red', 'red.png');
		this.load.image('satellite1', 'OBSTACLES/SATELLITE/spaceStation_017.png');
		this.load.image('satellite2', 'OBSTACLES/SATELLITE/spaceStation_020.png');
		this.load.image('satellite3', 'OBSTACLES/SATELLITE/spaceStation_026.png');
		this.load.image('lgmeteor', 'OBSTACLES/METEOR/spaceMeteors_large.png');
		this.load.image('medmeteor1', 'OBSTACLES/METEOR/meteorBrown_medium1.png');
		this.load.image('medmeteor2', 'OBSTACLES/METEOR/meteorBrown_medium2.png');
		this.load.image('medmeteor3', 'OBSTACLES/METEOR/meteorBrown_medium3.png');
		this.load.image('medmeteor4', 'OBSTACLES/METEOR/meteorBrown_medium4.png');
		this.load.image('smmeteor1', 'OBSTACLES/METEOR/meteorBrown_small1.png');
		this.load.image('smmeteor2', 'OBSTACLES/METEOR/meteorBrown_small2.png');
		this.load.image('smmeteor3', 'OBSTACLES/METEOR/meteorBrown_small3.png');
		this.load.image('smmeteor4', 'OBSTACLES/METEOR/meteorBrown_small4.png');
		this.load.image('arrowkey', 'UI/keyboard_arrow_up_outline.png');
		this.load.image('shipForm', 'UI/steamdeck_trackpad.png');
		this.load.image('convoyForm', 'UI/steamdeck_trackpad_outline.png');
		this.load.image('wkey', 'UI/keyboard_w_outline.png');
		this.load.image('akey', 'UI/keyboard_a_outline.png');
		this.load.image('skey', 'UI/keyboard_s_outline.png');
		this.load.image('dkey', 'UI/keyboard_d_outline.png');
		// ========== CONVOY CODE START ==========
		// Load convoy images
		this.load.image('convoyBlue', 'CONVOY/convoyBlue.png');
		this.load.image('convoyRed', 'CONVOY/convoyRed.png');
		// ========== CONVOY CODE END ==========
		// ========== POWER-UP CODE START ==========
		// Load power-up images
		this.load.image('powerupFireRate', 'UI/sword.png'); // Orange - Fire Rate Up
		this.load.image('powerupShield', 'UI/shield.png'); // Blue - Shield Up
		this.load.image('powerupHealth', 'UI/suit_hearts.png'); // Red - Health Up
		this.load.image('powerupSpeed', 'UI/sword.png'); // Green - Speed Up
		// ========== POWER-UP CODE END ==========
		this.load.audio('bgmusic', ['finalMusic.mp3']);
		this.load.audio('shot', ['shot.mp3']);
		this.load.audio('wave', ['wave.mp3']);
		this.load.audio('boom', ['explosion.mp3']);
		this.load.audio('bgending', ['endingBG.mp3']);
		this.load.audio('spawn', ['spawn.wav']);
		this.load.audio('grab', ['grab.wav']);

		let W = this.cameras.main.width;
		let H = this.cameras.main.height;
		let conf = { 
			name: 'fire', 
			url: 'FX/Holy VFX 01 Repeatable.png', 
			pos: {x: 0, y: 0},
			s: { x: 5, y: 10 },
			a: 0.5,
			rotation: 0, 
			fs: { x: 32, y: 32, end: 7, fRate: 32 }, 
			repeatTimes: -1 
		};
		this.powerUpFire = new Anim(this, conf);

		conf = { 
			name: 'pickup', 
			url: 'FX/Pickup.png', 
			pos: {x: -100, y: -100},
			s: { x: 2, y: 2 },
			a: 1,
			rotation: 0, 
			fs: { x: 64, y: 64, end: 18, fRate: 32 }, 
			repeatTimes: 0 
		};
		this.pickUpEffect = new Anim(this, conf);
		this.poweredUpEffect;
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
		this.ending = this.sound.add('bgending', { volume: 0.33 });
		this.shootSound = this.sound.add('shot', { volume: 0.1 });
		this.waveSound = this.sound.add('wave', { volume: 1 });
		this.boomSound = this.sound.add('boom', { volume: 1 });
		this.spawnSound = this.sound.add('spawn', { volume: 1 });
		this.grabSound = this.sound.add('grab', { volume: 1 });
		this.music.play();
		this.music.setLoop(true);
		this.laserGroup = new LaserGroup(this);
		// ========== CONVOY CODE START ==========
		// Create convoy laser group for ally shooting
		this.convoyLaserGroup = new ConvoyLaserGroup(this);
		// ========== CONVOY CODE END ==========
		this.ufoLaserGroup = new UFOLaserGroup(this);

		let uiHeight = height - 90;
		let convoyUI = width - 180;
		let shipUI = 285;

		// ======= TEST METEOR + SATELLITE SPAWN ======
		var mediumMeteor = this.make.image(this.assetConfig(1400, 250, "medmeteor1", 0, 1, .75))
		var largeMeteor = this.make.image(this.assetConfig(600, 500, "lgmeteor", 0, 1, .75))
		var satellite = this.make.image(this.assetConfig(900, 100, "satellite2", 320, 1, 1))

		// UI for Convoy Controls
		var convoyGuide = this.make.image(this.assetConfig(convoyUI - 125, uiHeight, "convoyBlue", 0, .5, .5));
		var upArrow = this.make.image(this.assetConfig(convoyUI, uiHeight - 40, "arrowkey", 0));
		var leftArrow = this.make.image(this.assetConfig(convoyUI - 40, uiHeight, "arrowkey", 270));
		var downArrow = this.make.image(this.assetConfig(convoyUI, uiHeight + 40, "arrowkey", 180));
		var rightArrow = this.make.image(this.assetConfig(convoyUI + 40, uiHeight, "arrowkey", 90));

		// UI for Convoy Formations
		// Wedge
		var wConvoy1 = this.make.image(this.assetConfig(convoyUI - 5, uiHeight - 10, "convoyForm", 0, .75, .15));
		var wConvoy2 = this.make.image(this.assetConfig(convoyUI, uiHeight - 5, "convoyForm", 0, .75, .15));
		var wShip = this.make.image(this.assetConfig(convoyUI + 5, uiHeight, "shipForm", 0, .75, .15));
		var wConvoy3 = this.make.image(this.assetConfig(convoyUI, uiHeight + 5, "convoyForm", 0, .75, .15));
		var wConvoy4 = this.make.image(this.assetConfig(convoyUI - 5, uiHeight + 10, "convoyForm", 0, .75, .15));
		// Line
		var lConvoy1 = this.make.image(this.assetConfig(convoyUI - 68, uiHeight - 20, "convoyForm", 0, .75, .15));
		var lConvoy2 = this.make.image(this.assetConfig(convoyUI - 68, uiHeight - 10, "convoyForm", 0, .75, .15));
		var lShip = this.make.image(this.assetConfig(convoyUI - 68, uiHeight, "shipForm", 0, .75, .15));
		var lConvoy3 = this.make.image(this.assetConfig(convoyUI - 68, uiHeight + 10, "convoyForm", 0, .75, .15));
		var lConvoy4 = this.make.image(this.assetConfig(convoyUI - 68, uiHeight + 20, "convoyForm", 0, .75, .15));
		//Shield
		var sConvoy1 = this.make.image(this.assetConfig(convoyUI, uiHeight - 85, "convoyForm", 0, .75, .15));
		var sConvoy2 = this.make.image(this.assetConfig(convoyUI - 10, uiHeight - 75, "convoyForm", 0, .75, .15));
		var sShip = this.make.image(this.assetConfig(convoyUI, uiHeight - 75, "shipForm", 0, .75, .15));
		var sConvoy3 = this.make.image(this.assetConfig(convoyUI + 10, uiHeight - 75, "convoyForm", 0, .75, .15));
		var sConvoy4 = this.make.image(this.assetConfig(convoyUI, uiHeight - 65, "convoyForm", 0, .75, .15));
		// Vee
		var sConvoy1 = this.make.image(this.assetConfig(convoyUI + 8, uiHeight + 79, "convoyForm", 0, .75, .15));
		var sConvoy2 = this.make.image(this.assetConfig(convoyUI - 8, uiHeight + 79, "convoyForm", 0, .75, .15));
		var sShip = this.make.image(this.assetConfig(convoyUI, uiHeight + 72, "shipForm", 0, .75, .15));
		var sConvoy3 = this.make.image(this.assetConfig(convoyUI + 8, uiHeight + 65, "convoyForm", 0, .75, .15));
		var sConvoy4 = this.make.image(this.assetConfig(convoyUI - 8, uiHeight + 65, "convoyForm", 0, .75, .15));
		// Line
		var lConvoy1 = this.make.image(this.assetConfig(convoyUI + 65, uiHeight, "convoyForm", 0, .75, .15));
		var lConvoy2 = this.make.image(this.assetConfig(convoyUI + 75, uiHeight, "convoyForm", 0, .75, .15));
		var lShip = this.make.image(this.assetConfig(convoyUI + 105, uiHeight, "shipForm", 0, .75, .15));
		var lConvoy3 = this.make.image(this.assetConfig(convoyUI + 85, uiHeight, "convoyForm", 0, .75, .15));
		var lConvoy4 = this.make.image(this.assetConfig(convoyUI + 95, uiHeight, "convoyForm", 0, .75, .15));

		// UI for Ship Controls
		var shipGuide = this.make.image(this.assetConfig(shipUI - 105, uiHeight, "ship", 0, .5, .75));
		var wGuide = this.make.image(this.assetConfig(shipUI, uiHeight - 20, "wkey"));
		var aGuide = this.make.image(this.assetConfig(shipUI - 40, uiHeight + 20, "akey"));
		var sGuide = this.make.image(this.assetConfig(shipUI, uiHeight + 20, "skey"));
		var dGuide = this.make.image(this.assetConfig(shipUI + 40, uiHeight + 20, "dkey"));


		
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

		this.timeText = this.add.text(width / 2, 110, 'High Score ' + this.highScore, {
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
		this.poweredUpEffect = this.powerUpFire.create();
		// Hide powerUpFire animation - user doesn't want it visible on ship
		if (this.poweredUpEffect) {
			this.poweredUpEffect.sprite.setVisible(false);
		}
		this.addShip();
		
		// ========== POWER-UP CODE START ==========
		// Create power-up group
		this.powerUps = this.physics.add.group();
		// Start spawning power-ups periodically
		this.startPowerUpSpawning();
		// ========== POWER-UP CODE END ==========
	}

	assetConfig(imgX, imgY, imgKey, imgAngle = 0, imgAlpha = 1, imgScale = .75) {
    	return {
			x: imgX,
			y: imgY,
			key: imgKey,
			angle: imgAngle,
			alpha: imgAlpha,
			scale : {
			   x: imgScale,
			   y: imgScale
			},
			origin: {x: 0.5, y: 0.5}
		};
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
		
		// ========== POWER-UP CODE START ==========
		// Reset power-up state
		this.fireRateBoostActive = false;
		this.shieldCharges = 0;
		this.speedBoostActive = false;
		if (this.fireRateBoostTimer) {
			this.fireRateBoostTimer.remove();
		}
		if (this.speedBoostTimer) {
			this.speedBoostTimer.remove();
		}
		if (this.powerUpSpawnTimer) {
			this.powerUpSpawnTimer.remove();
		}
		// ========== POWER-UP CODE END ==========
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
		
		// ========== HEALTH BAR CODE START ==========
		// Initialize player health
		this.ship.health = 100;
		this.ship.maxHealth = 100;
		// Create player health bar
		this.createHealthBar(this.ship, 'player');
		// Add physics body for collision detection
		this.physics.add.existing(this.ship);
		this.ship.body.setSize(this.ship.width * 0.8, this.ship.height * 0.8);
		// ========== HEALTH BAR CODE END ==========
	}
	
	UpdatePowerUp(ship, powerType) {
		switch (powerType) {
			case 'fireRateUp': // Orange, halves player shoot time for 10 seconds
				this.fireRateUpActive = true;
				this.time.delayedCall(10000, () => {
					this.fireRateUpActive = false;
				});
				break;

			case 'shieldUp': // Blue, protects player from 5 bullets
				if (ship.shield) {
					ship.shieldHealth = ship.shieldMax;
				}
				else {
					this.createShield(ship);
				}
				break;

			case 'healthUp': // Red, heals player for 10 health (1 bullet)
				this.updateShipHealth(ship, -50);
				break;

			case 'speedUp': // Green, increase player movement to 4.75 from 4 for 10 seconds
				this.shipSpeed += 0.75;
				this.time.delayedCall(10000, () => {
					this.shipSpeed -= 0.75;
				});
				break;

			default:
				break;
		}
	}

	createShield(ship) {
		let shield = this.make.image(this.assetConfig(ship.x, ship.y, "bar", 90));
		ship.shield = shield;
		ship.shieldMax = 50;
		ship.shieldHealth = 50;
		this.UpdateShield(ship);
	}

	UpdateShield(ship) {
		if (!ship || !ship.active || !ship.shield) return;

		if (ship.shieldHealth <= 0) {
			ship.shield.destroy();
			ship.shield = null;
			return;
		}
		let shipX = ship.x;
		let shipY = ship.y;
		ship.shield.setPosition(shipX, shipY);
	}


	// ========== HEALTH BAR CODE START ==========
	// Create health bar for player or convoy ship
	createHealthBar(ship, type) {
		let barWidth = type === 'player' ? 60 : 40;
		let barHeight = 6;
		let offsetY = type === 'player' ? -40 : -35;
		
		// Health bar background (black with white border)
		let healthBarBg = this.add.graphics();
		healthBarBg.fillStyle(0x000000, 0.8);
		healthBarBg.fillRect(-barWidth / 2, offsetY - barHeight / 2, barWidth, barHeight);
		healthBarBg.lineStyle(2, 0xffffff, 1);
		healthBarBg.strokeRect(-barWidth / 2, offsetY - barHeight / 2, barWidth, barHeight);
		
		// Health bar fill (green)
		let healthBarFill = this.add.graphics();
		healthBarFill.fillStyle(0x00ff00, 1);
		healthBarFill.fillRect(-barWidth / 2, offsetY - barHeight / 2, barWidth, barHeight);
		
		// Store health bar references on ship
		ship.healthBarBg = healthBarBg;
		ship.healthBarFill = healthBarFill;
		ship.healthBarOffsetY = offsetY;
		ship.healthBarWidth = barWidth;
		ship.healthBarHeight = barHeight;
	}
	
	// Update health bar visual
	updateHealthBar(ship) {
		if (!ship || !ship.active || !ship.healthBarFill) return;
		
		let barWidth = ship.healthBarWidth || (ship.maxHealth === 100 ? 60 : 40);
		let barHeight = ship.healthBarHeight || 6;
		let offsetY = ship.healthBarOffsetY || (ship.maxHealth === 100 ? -40 : -35);
		let healthPercent = Math.max(0, ship.health / ship.maxHealth);
		
		// Update position to follow ship
		let shipX = ship.x;
		let shipY = ship.y;
		
		// Clear and update health bar fill
		ship.healthBarFill.clear();
		ship.healthBarFill.setPosition(shipX, shipY);
		
		// Change color based on health percentage
		if (healthPercent > 0.6) {
			ship.healthBarFill.fillStyle(0x00ff00, 1); // Green
		} else if (healthPercent > 0.3) {
			ship.healthBarFill.fillStyle(0xffff00, 1); // Yellow
		} else {
			ship.healthBarFill.fillStyle(0xff0000, 1); // Red
		}
		
		let currentWidth = barWidth * healthPercent;
		if (currentWidth > 0) {
			ship.healthBarFill.fillRect(-barWidth / 2, offsetY - barHeight / 2, currentWidth, barHeight);
		}
		
		// Update health bar background position
		if (ship.healthBarBg) {
			ship.healthBarBg.setPosition(shipX, shipY);
		}
	}
	
	// Update ship health and handle death
	updateShipHealth(ship, damage) {
		if (!ship || !ship.active || ship.health <= 0) return;
		
		if (ship.shield && damage > 0) {
			ship.shieldHealth -= damage;
			if (ship.shieldHealth < 0) ship.shieldHealth = 0;
			ship.shield.setTint(0xff0000);
			this.time.delayedCall(100, () => {
				if (ship.shield && ship.shield.active) {
					ship.shield.clearTint();
				}
			});
			return;
		}
		ship.health -= damage;
		if (ship.health < 0) ship.health = 0;
		if (ship.health > 100) ship.health = 100;
		
		// Visual feedback for taking damage - flash red
		if (ship === this.ship || (ship.getData && ship.getData('isAlly'))) {
			ship.setTint(0xff0000);
			this.time.delayedCall(100, () => {
				if (ship && ship.active) {
					ship.clearTint();
				}
			});
		}
		
		// Update health bar
		this.updateHealthBar(ship);
		
		// Check if ship is dead
		if (ship.health <= 0) {
			if (ship === this.ship) {
				// Player died - end game immediately
				this.ending.play();
				this.ship.dead = true;
				this.over = true;
				this.canMove = false;
				this.boomSound.play();
				let boom = this.add.image(ship.x, ship.y, 'ufod');
				boom.scale *= 1.5;
				this.tweens.add({
					targets: boom,
					alpha: { from: 1, to: 0 },
					duration: 1000
				});
				ship.setVisible(false);
				// Destroy player health bars
				if (ship.healthBarBg) ship.healthBarBg.destroy();
				if (ship.healthBarFill) ship.healthBarFill.destroy();
				this.time.addEvent({
					delay: 1000,
					callback: () => {
						this.music.stop();
					}
				});
			} else {
				// Convoy ship died - remove from convoy group
				if (this.convoys && this.convoys.contains(ship)) {
					this.convoys.remove(ship);
				}
				this.boomSound.play();
				let boom = this.add.image(ship.x, ship.y, 'ufod');
				boom.scale *= 0.75;
				this.tweens.add({
					targets: boom,
					alpha: { from: 1, to: 0 },
					duration: 500
				});
				// Destroy health bars
				if (ship.healthBarBg) ship.healthBarBg.destroy();
				if (ship.healthBarFill) ship.healthBarFill.destroy();
				ship.destroy();
				
				// Check if player is dead and all convoy ships are dead
				this.checkGameOver();
			}
		}
	}
	
	// Check if game should end (all convoy ships dead AND player dead)
	checkGameOver() {
		// Check if player is dead
		let playerDead = !this.ship || !this.ship.active || (this.ship.dead !== undefined && this.ship.dead) || (this.ship.health !== undefined && this.ship.health <= 0);
		
		// Check if all convoy ships are dead
		let allConvoysDead = true;
		if (this.convoys && this.convoys.children.entries.length > 0) {
			// Check if any convoy ship is still alive
			allConvoysDead = this.convoys.children.entries.every(convoyShip => {
				return !convoyShip || !convoyShip.active || convoyShip.health <= 0;
			});
		}
		
		// If player is dead AND all convoy ships are dead, end the game
		// (Note: Player death already ends game immediately in updateShipHealth)
		if ((playerDead || allConvoysDead) && !this.over) {
			this.ending.play();
			this.canMove = false;

			this.time.addEvent({
				delay: 1000,
				callback: () => {
					this.music.stop();
				}
			});
			
			this.over = true;
		}
	}
	// ========== HEALTH BAR CODE END ==========

	addEvents() {
		this.inputKeys = [
			this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
		];
		this.w = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
		this.a = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
		this.s = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
		this.d = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
		this.up = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
		this.down = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
		this.left = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
		this.right = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

		this.enter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
	}

	spawnUFO() {
		this.stringarray = ["ufob", "ufobl", "ufop", "ufog", "ufoy"];
		// Increase aliens per wave - scales with wave number for progressive difficulty
		// Base: 1-3, then add 1-2 aliens per wave
		let baseMin = 1;
		let baseMax = 3;
		let waveBonus = Math.floor(this.wave * 0.8); // Add aliens based on wave
		let minAliens = baseMin + waveBonus;
		let maxAliens = baseMax + waveBonus;
		// Cap max aliens at 25 per wave to prevent performance issues
		maxAliens = Math.min(maxAliens, 25);
		minAliens = Math.min(minAliens, 20);
		
		let num = Phaser.Math.Between(minAliens, maxAliens);
		for (let i = 0; i < num; i++) {
			this.addTwine(this.stringarray[i % 5]);
		}

		this.numUFOS += num;
	}

	addTwine(color) {
		let width = this.cameras.main.width;
		let height = this.cameras.main.height;
		let curve, delay, startX, startY;

		// Safety margin: prevent aliens from going behind player
		// Player is at approximately width * 0.25, so keep aliens to the right
		let minX = width * 0.15; // Minimum x position for alien paths

		switch (color) {
			case 'ufob': // Straight Line
				startX = width + 50;
				startY = Phaser.Math.Between(100, height - 100);
				let endX = Math.max(minX, width * 0.2); // Keep away from player
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
					// Ensure wave doesn't go too far left
					x = Math.max(x, minX);
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
				// Ensure circle doesn't extend too far left
				if (centerX - radius < minX) {
					centerX = minX + radius;
				}
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
					startX - width * 0.65, startY + 100,
					Math.max(minX, width * 0.2), startY // Keep final point away from player
				];
				curve = new Phaser.Curves.Spline(zigzagPoints);
				delay = 4500;
				break;

			case 'ufoy': 
			default:
				// Keep aliens within screen bounds to prevent corner glitches
				let margin = 100;
				this.origin = [
					Phaser.Math.Between(width * 0.5, width - margin), 
					Phaser.Math.Between(margin, height - margin)
				];
				// Clamp movement deltas to keep points within bounds
				let maxDelta = 200;
				this.dec = [
					Phaser.Math.Clamp(
						Phaser.Math.Between(-maxDelta, maxDelta),
						-(this.origin[0] - margin),
						width - this.origin[0] - margin
					),
					Phaser.Math.Clamp(
						Phaser.Math.Between(-maxDelta, maxDelta),
						-(this.origin[1] - margin),
						height - this.origin[1] - margin
					)
				];
				this.p1 = [
					Phaser.Math.Clamp(this.origin[0] + this.dec[0], margin, width - margin),
					Phaser.Math.Clamp(this.origin[1] + this.dec[1], margin, height - margin)
				];
				this.dec = [
					Phaser.Math.Clamp(
						Phaser.Math.Between(-maxDelta, maxDelta),
						-(this.p1[0] - margin),
						width - this.p1[0] - margin
					),
					Phaser.Math.Clamp(
						Phaser.Math.Between(-maxDelta, maxDelta),
						-(this.p1[1] - margin),
						height - this.p1[1] - margin
					)
				];
				this.p2 = [
					Phaser.Math.Clamp(this.p1[0] + this.dec[0], margin, width - margin),
					Phaser.Math.Clamp(this.p1[1] + this.dec[1], margin, height - margin)
				];
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
		// Store the color type in UFO data for shooting patterns
		this.alien.setData('ufoColor', color);
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

		// ========== WAVE DIFFICULTY CODE START ==========
		// Make aliens shoot faster and move faster as waves increase
		// Base fire rate starts at 3000-5000ms, reduces more aggressively per wave
		let waveReduction = this.wave * 200; // Reduce by 200ms per wave (more aggressive)
		let baseFireRateMin = 3000 - waveReduction;
		let baseFireRateMax = 5000 - (waveReduction * 1.2);
		// Lower minimums for much faster shooting at high waves
		baseFireRateMin = Math.max(400, baseFireRateMin); // Minimum 400ms (very fast)
		baseFireRateMax = Math.max(600, baseFireRateMax); // Minimum 600ms (very fast)
		this.alien.fireRate = Phaser.Math.Between(baseFireRateMin, baseFireRateMax);
		
		// Make aliens move faster as waves increase (reduce duration = faster movement)
		let speedMultiplier = 1 + (this.wave * 0.08);
		speedMultiplier = Math.min(speedMultiplier, 2.0); // Cap at 2x speed
		followConfig.duration = Math.floor(delay / speedMultiplier);
		// ========== WAVE DIFFICULTY CODE END ==========
		
		this.alien.startFollow(followConfig);

		this.alien.cooldown = false
		this.alien.start = true
		
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
            let convoyShip = this.make.image(this.assetConfig(startX, startY, convoyImage));
            
            convoyShip.scale *= 0.5;
            convoyShip.setData('convoyIndex', i);
            convoyShip.setData('baseOffset', {x: offsetX, y: offsetY});
            convoyShip.setData('isAlly', true); // Mark as ally
            convoyShip.setData('followPlayer', true);
            
            // ========== HEALTH BAR CODE START ==========
            // Initialize convoy health
            convoyShip.health = 50;
            convoyShip.maxHealth = 50;
            // Create convoy health bar
            this.createHealthBar(convoyShip, 'convoy');
            // Add physics body for collision detection
            this.physics.add.existing(convoyShip);
            convoyShip.body.setSize(convoyShip.width * 0.8, convoyShip.height * 0.8);
            // ========== HEALTH BAR CODE END ==========
            
            // DO NOT add to ufos group - they are allies, not enemies
            this.convoys.add(convoyShip);
        }
        
        this.convoyActive = true;
    }

	changeConvoyPosition(formation) {
		if (!this.convoys || this.convoys.children.entries.length === 0) return;
		if (!this.ship || !this.ship.active) return;
		this.formchange = true;
		const s = 80;

		if (!this.formations[formation]) return;
		if (this.formation === formation) {
			formation = 'wedge';
		}
		this.formation = formation;

		for (let i = 0; i < this.convoys.children.entries.length; i++) {
			let convoyShip = this.convoys.children.entries[i];
			if (!convoyShip.active) continue;
			let offset = this.formations[formation][i];
			convoyShip.setData('baseOffset', {x: offset.x, y: offset.y});
		}
		this.time.addEvent({
			delay: 500,
			callback: () => {
				this.formchange = false;
			},
			loop: false
		});
	}
    
    // Method for convoy ships to shoot at enemies
    convoyShoot() {
        if (!this.convoys || this.convoys.children.entries.length === 0) return;
        if (!this.ufos || this.ufos.children.entries.length === 0) return;
        
        // Each convoy ship shoots at nearest enemy
        this.convoys.children.entries.forEach((convoyShip, i) => {
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
            if (nearestEnemy && nearestDistance < 1000) {
				let sx;
				let sy;
				let s = 80;
				if (this.formation === 'wedge' || this.formation === 'line' || this.formation === 'shield') {
					sx = 900;
					sy = 0;

				} else if (this.formation === 'file') {
					sx = this.yMove == 0 ? 900 : 0;
					sy = -this.yMove * 900;
				} else {
					sx = this.formations[this.formation][i].x/s * 900;
					sy = this.formations[this.formation][i].y/s * 900;
				}

                this.convoyLaserGroup.fireBullet(convoyShip.x + 20, convoyShip.y, sx, sy);
            }
        });
    }
    // ========== CONVOY CODE END ==========
    
    // ========== POWER-UP CODE START ==========
    // Start power-up spawning system
    startPowerUpSpawning() {
        // Spawn first power-up after 10 seconds
        this.time.delayedCall(10000, () => {
            if (!this.over && this.canMove) {
                this.spawnPowerUp();
            }
        });
        
        // Spawn power-ups with dynamic rate (doubles when low health)
        this.scheduleNextPowerUp();
    }
    
    // Schedule next power-up spawn - doubles spawn rate when low health
    scheduleNextPowerUp() {
        if (this.over || !this.canMove) return;
        
        let isLowHealth = this.ship && this.ship.health && this.ship.health < (this.ship.maxHealth * 0.3);
        // Base delay: 15-25 seconds, halved if low health (double spawn rate)
        let baseDelay = Phaser.Math.Between(15000, 25000);
        let delay = isLowHealth ? baseDelay * 0.5 : baseDelay;
        
        this.powerUpSpawnTimer = this.time.delayedCall(delay, () => {
            if (!this.over && this.canMove) {
                this.spawnPowerUp();
                // Schedule next spawn
                this.scheduleNextPowerUp();
            }
        });
    }
    
    // Spawn a random power-up
    spawnPowerUp() {
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        
        // Determine spawn rate based on player health (double if low health)
        let isLowHealth = this.ship && this.ship.health < (this.ship.maxHealth * 0.3);
        
        // Power-up types: 'fireRate', 'shield', 'health', 'speed'
        let powerUpTypes = ['fireRateUp', 'shieldUp', 'healthUp', 'speedUp'];
        // Double spawn chance for shield and health when low health
        if (isLowHealth) {
            powerUpTypes.push('shieldUp', 'healthUp', 'shieldUp', 'healthUp'); // Add extra entries to double chance
        }
        
        let powerUpType = powerUpTypes[Phaser.Math.Between(0, powerUpTypes.length - 1)];
        let imageKey = '';
        let tint = 0xffffff;
        
        switch(powerUpType) {
            case 'fireRateUp':
                imageKey = 'powerupFireRate';
                tint = 0xff8800; // Orange
                break;
            case 'shieldUp':
                imageKey = 'powerupShield';
                tint = 0x0088ff; // Blue
                break;
            case 'healthUp':
                imageKey = 'powerupHealth';
                tint = 0xff0000; // Red
                break;
            case 'speedUp':
                imageKey = 'powerupSpeed';
                tint = 0x00ff00; // Green
                break;
        }
        
        // Spawn power-up on the right side of screen
        let spawnX = Phaser.Math.Between(width * 0.7, width - 50);
        let spawnY = Phaser.Math.Between(100, height - 100);
        
		let powerUpEffect = this.pickUpEffect.create();
        let powerUp = this.add.image(spawnX, spawnY, imageKey);
		powerUpEffect.setTint(tint);
		powerUpEffect.setPos(spawnX, spawnY)
        powerUp.setTint(tint);
        powerUp.scale *= 0.6;
        powerUp.setData('powerUpType', powerUpType);
		powerUp.setData('effect', powerUpEffect);

		this.spawnSound.play();
        
        // Add physics body for collision
        this.physics.add.existing(powerUp);
        powerUp.body.setSize(powerUp.width * 0.8, powerUp.height * 0.8);
        
        // Add floating animation
        this.tweens.add({
            targets: powerUp,
            y: powerUp.y + 20,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

		this.tweens.add({
            targets: powerUpEffect.sprite,
            y: powerUpEffect.sprite.y + 20,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        
        // Add rotation animation
        this.tweens.add({
            targets: powerUp,
            rotation: powerUp.rotation + Math.PI * 2,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });
        
        this.powerUps.add(powerUp);
        
        // Despawn after 10 seconds if not collected
        this.time.delayedCall(10000, () => {
            if (powerUp && powerUp.active) {
                powerUp.destroy();
            }
        });
    }
    
    // Collect power-up and apply effect
    collectPowerUp(powerUp) {
        if (!powerUp || !powerUp.active) return;
        
        let powerUpType = powerUp.getData('powerUpType');
        let effect = this.pickUpEffect.create();
        // Play pickup effect
        effect.setPos(powerUp.x, powerUp.y);
        
		this.grabSound.play();
        this.UpdatePowerUp(this.ship, powerUpType)
        
		powerUp.getData('effect').setTint(0xffffff, 0);
        // Remove power-up
        powerUp.destroy();
    }
    
    // Apply fire rate boost (halves shoot time for 10 seconds)
    applyFireRateBoost() {
        if (this.fireRateBoostActive) {
            // Reset timer if already active
            if (this.fireRateBoostTimer) {
                this.fireRateBoostTimer.remove();
            }
        }
        
		this.poweredUp = true;
		this.poweredUpEffect.sprite.setVisible(true);
        this.fireRateBoostActive = true;
        this.baseShootTime = this.shootTime; // Save current shoot time
        
        // Set timer to remove boost after 10 seconds
        this.fireRateBoostTimer = this.time.delayedCall(10000, () => {
            this.fireRateBoostActive = false;
            this.fireRateBoostTimer = null;
			this.poweredUp = false;
			this.poweredUpEffect.sprite.setVisible(false);
        });
    }
    
    // Apply speed boost (increase to 4.5 for 10 seconds)
    applySpeedBoost() {
        if (this.speedBoostActive) {
            // Reset timer if already active
            if (this.speedBoostTimer) {
                this.speedBoostTimer.remove();
            }
        }
        
		this.poweredUp = true;
        this.speedBoostActive = true;
        this.baseShipSpeed = this.shipSpeed; // Save current speed
		this.poweredUpEffect.sprite.setVisible(true);
        
        // Set timer to remove boost after 10 seconds
        this.speedBoostTimer = this.time.delayedCall(10000, () => {
            this.speedBoostActive = false;
            this.shipSpeed = this.baseShipSpeed;
            this.speedBoostTimer = null;
			this.poweredUp = false;
			this.poweredUpEffect.sprite.setVisible(false);
        });
    }
    // ========== POWER-UP CODE END ==========

	fireBullet() {
		this.laserGroup.fireBullet(this.ship.x, this.ship.y - 20);
	}

	ufoBullet(ufo) {
		if (!ufo || !ufo.active) return;
		if (!this.ufoLaserGroup) return;
		if (this.over) return;
		
		// Calculate direction to player for all UFO types
		let dx = 0;
		let dy = 0;
		let speed = 800;
		
		// If player exists, aim at player
		if (this.ship && this.ship.active) {
			dx = this.ship.x - ufo.x;
			dy = this.ship.y - ufo.y;
			let distance = Math.sqrt(dx * dx + dy * dy);
			if (distance > 0) {
				// Normalize direction and apply speed
				dx = (dx / distance) * speed;
				dy = (dy / distance) * speed;
			} else {
				// Default to shooting left if player is at same position
				dx = -speed;
				dy = 0;
			}
		} else {
			// Default to shooting left if no player
			dx = -speed;
			dy = 0;
		}
		
		// Get UFO color from stored data or texture key as fallback
		let ufoColor = ufo.getData ? ufo.getData('ufoColor') : (ufo.texture ? ufo.texture.key : 'ufoy');
		
		switch (ufoColor) {
			case 'ufob': // Charger - Fires ring of bullets
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -speed, 0); // Angles starting from shooting left, clockwise
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -(Math.sqrt(3)/2) * speed, speed/2);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -speed/2, (Math.sqrt(3)/2) * speed);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, 0, speed);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, speed/2, (Math.sqrt(3)/2) * speed);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, (Math.sqrt(3)/2) * speed, speed/2);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, speed, 0);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, (Math.sqrt(3)/2) * speed, -speed/2);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, speed/2, -(Math.sqrt(3)/2) * speed);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, 0, -speed);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -speed/2, -(Math.sqrt(3)/2) * speed);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -(Math.sqrt(3)/2) * speed, -speed/2);
				break;

			case 'ufobl': // Spurter - Fires in straight spread twice
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -(Math.sqrt(3)/2) * speed, -speed/2);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -speed, 0);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -(Math.sqrt(3)/2) * speed, speed/2);
				// Slower second set 
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -(Math.sqrt(3)/2) * speed/2, -speed/4);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -speed/2, 0);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -(Math.sqrt(3)/2) * speed/2, speed/4);
				break;

			case 'ufop': // Sniper - Fires bullets angled at player
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, dx, dy);
				break;

			case 'ufog': // Controller - Fires spread towards player (Hit Conveys + Cover Fire)
				let angle1 = Math.atan2(dy, dx) - Phaser.Math.DegToRad(5);
				let angle2 = Math.atan2(dy, dx) + Phaser.Math.DegToRad(5);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, Math.cos(angle1) * speed, Math.sin(angle1) * speed);
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, Math.cos(angle2) * speed, Math.sin(angle2) * speed);
				break;

			case 'ufoy': // Fodder - Fires straight forward
			default:
				this.ufoLaserGroup.fireBullet(ufo.x, ufo.y, -speed, 0);
				break;
		}
	}

	handleCollision(laser, ufo) {
		if (laser != null) {

			this.score += 100;
			laser.kill();
			ufo.destroy();
		} else {
			ufo.active = false;
			ufo.visible = false;
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
			this.isMoving = true;
		}

		if (this.a.isDown && this.ship.x > 50 && this.canMove) {
			this.ship.x -= this.shipSpeed;
		}

		if (this.w.isDown) {
			this.yMove = -1;
			if (this.ship.y > 50 && this.canMove) {
				this.ship.y -= this.shipSpeed;
			}
		}

		if (this.s.isDown) {
			this.yMove = 1;
			if (this.ship.y < height - 50 && this.canMove) {
			this.ship.y += this.shipSpeed;
			}
		}

		if ((!this.w.isDown && !this.s.isDown)) {
			this.yMove = 0;
		}

		if (this.enter.isDown && this.over) {
			this.formation = 'wedge';
			this.ending.stop();
			this.waveSound.play();
			this.scene.restart();
        }

		if (this.left.isDown && this.formchange == false && this.canMove) {
			this.changeConvoyPosition('line');
		}
		
		if (this.right.isDown && this.formchange == false && this.canMove) {
			this.changeConvoyPosition('file');
		}
		
		if (this.up.isDown && this.formchange == false && this.canMove) {
			this.changeConvoyPosition('shield');
		}
		
		if (this.down.isDown && this.formchange == false && this.canMove) {
			this.changeConvoyPosition('vee');
		}

		// ANIMATIONS
		// Hide powerUpFire animation from ship
		if (this.poweredUpEffect && this.poweredUpEffect.sprite) {
			if (this.poweredUp) {
				console.log("goodbye");
				this.poweredUpEffect.sprite.setVisible(true);
			} else {
				console.log("hello");
				this.poweredUpEffect.sprite.setVisible(false);
			}
			this.poweredUpEffect.setPos(this.ship.x, this.ship.y);
		}
        // ANIMATIONS

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
        
        // ========== HEALTH BAR CODE START ==========
        // Check for UFO laser collisions with player and convoy ships
        if (this.ufoLaserGroup && this.ship && this.ship.active) {
            // Check player collision with UFO lasers
            let lasersToRemove = [];
            this.ufoLaserGroup.children.entries.forEach((ufoLaser, index) => {
                if (!ufoLaser || !ufoLaser.active) return;
                // Check if laser is overlapping with player ship using distance check
                let dx = ufoLaser.x - this.ship.x;
                let dy = ufoLaser.y - this.ship.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let hitRadius = (this.ship.width + (ufoLaser.width || 20)) * 0.3;
                
                if (distance < hitRadius) {
                    lasersToRemove.push(ufoLaser);
                    this.updateShipHealth(this.ship, 10); // Player takes 10 damage
                }
            });
            // Remove lasers that hit the player
            lasersToRemove.forEach(laser => laser.kill());
        }
        
        // Check convoy ship collisions with UFO lasers
        if (this.ufoLaserGroup && this.convoys && this.convoys.children.entries.length > 0) {
            this.convoys.children.entries.forEach(convoyShip => {
                if (!convoyShip || !convoyShip.active) return;
                let lasersToRemove = [];
                this.ufoLaserGroup.children.entries.forEach(ufoLaser => {
                    if (!ufoLaser || !ufoLaser.active) return;
                    // Check if laser is overlapping with convoy ship using distance check
                    let dx = ufoLaser.x - convoyShip.x;
                    let dy = ufoLaser.y - convoyShip.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    let hitRadius = (convoyShip.width + (ufoLaser.width || 20)) * 0.3;
                    
                    if (distance < hitRadius) {
                        lasersToRemove.push(ufoLaser);
                        this.updateShipHealth(convoyShip, 10); // Convoy ship takes 10 damage
                    }
                });
                // Remove lasers that hit the convoy ship
                lasersToRemove.forEach(laser => laser.kill());
            });
        }
        
        // Update health bar and shield positions every frame
        if (this.ship && this.ship.active) {
            this.updateHealthBar(this.ship);
			if (this.ship.shield) {
				this.UpdateShield(this.ship);
			}
        }
        if (this.convoys) {
            this.convoys.children.entries.forEach(convoyShip => {
                if (convoyShip && convoyShip.active) {
                    this.updateHealthBar(convoyShip);
                }
            });
        }
        // ========== HEALTH BAR CODE END ==========
        
        // ========== POWER-UP CODE START ==========
        // Check for power-up collection
        if (this.powerUps && this.ship && this.ship.active && !this.over) {
            this.powerUps.children.entries.forEach(powerUp => {
                if (!powerUp || !powerUp.active) return;
                
                // Check collision using distance
                let dx = powerUp.x - this.ship.x;
                let dy = powerUp.y - this.ship.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let hitRadius = (this.ship.width + powerUp.width) * 0.4;
                
                if (distance < hitRadius) {
                    this.collectPowerUp(powerUp);
                }
            });
        }
        
        // Apply speed boost if active
        if (this.speedBoostActive) {
            this.shipSpeed = 4.5; // Boosted speed
        } else {
            this.shipSpeed = this.baseShipSpeed; // Normal speed
        }
        // ========== POWER-UP CODE END ==========
        
        // ========== COLLISION DAMAGE CODE START ==========
        // Check for player ship collision with UFOs (ramming damage)
        if (this.ship && this.ship.active && !this.over) {
            this.ufos.children.iterate(ufo => {
                if (!ufo || !ufo.active) return;
                // Skip if ufo is actually a convoy ship (ally)
                if (ufo.getData && ufo.getData('isAlly')) return;
                
                // Check collision using distance
                let dx = ufo.x - this.ship.x;
                let dy = ufo.y - this.ship.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let hitRadius = (this.ship.width + ufo.width) * 0.35;
                
                if (distance < hitRadius) {
                    // Player hits UFO - UFO destroyed, player takes quarter damage
                    let quarterDamage = this.ship.maxHealth * 0.25;
                    this.updateShipHealth(this.ship, quarterDamage);
                    
                    // Destroy UFO
                    this.boomSound.play();
                    let boom = this.add.image(ufo.x, ufo.y, 'ufod');
                    boom.scale *= 0.75;
                    boom.rotation += Phaser.Math.Between(45, 135);
                    this.tweens.add({
                        targets: boom,
                        alpha: { from: 1, to: 0 },
                        x: { from: boom.x, to: boom.x + -this.speed * 67 },
                        ease: 'Sine.easeOut',
                        duration: 500
                    });
                    
                    this.numUFOS--;
                    ufo.destroy();
                    
                    // Check for wave completion
                    if (this.numUFOS == 0) {
                        this.waveSound.play();
                        this.score += 500 * (0.5 * this.wave);
                        this.wave++;
                        const text = "Wave " + this.wave;
                        this.waveText.setText(text);
                        this.spawnUFO();
                    }
                    return; // Exit to avoid checking same UFO again
                }
            });
        }
        
        // Check for convoy ship collision with UFOs (ramming damage)
        if (this.convoys && this.convoys.children.entries.length > 0 && !this.over) {
            this.convoys.children.entries.forEach(convoyShip => {
                if (!convoyShip || !convoyShip.active) return;
                
                this.ufos.children.iterate(ufo => {
                    if (!ufo || !ufo.active) return;
                    // Skip if ufo is actually a convoy ship (ally)
                    if (ufo.getData && ufo.getData('isAlly')) return;
                    
                    // Check collision using distance
                    let dx = ufo.x - convoyShip.x;
                    let dy = ufo.y - convoyShip.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    let hitRadius = (convoyShip.width + ufo.width) * 0.35;
                    
                    if (distance < hitRadius) {
                        // Convoy ship hits UFO - UFO destroyed, convoy takes quarter damage
                        let quarterDamage = convoyShip.maxHealth * 0.25;
                        this.updateShipHealth(convoyShip, quarterDamage);
                        
                        // Destroy UFO
                        this.boomSound.play();
                        let boom = this.add.image(ufo.x, ufo.y, 'ufod');
                        boom.scale *= 0.75;
                        boom.rotation += Phaser.Math.Between(45, 135);
                        this.tweens.add({
                            targets: boom,
                            alpha: { from: 1, to: 0 },
                            x: { from: boom.x, to: boom.x + -this.speed * 67 },
                            ease: 'Sine.easeOut',
                            duration: 500
                        });
                        
                        this.numUFOS--;
                        ufo.destroy();
                        
                        // Check for wave completion
                        if (this.numUFOS == 0) {
                            this.waveSound.play();
                            this.score += 500 * (0.5 * this.wave);
                            this.wave++;
                            const text = "Wave " + this.wave;
                            this.waveText.setText(text);
                            this.spawnUFO();
                        }
                        return; // Exit to avoid checking same UFO again
                    }
                });
            });
        }
        // ========== COLLISION DAMAGE CODE END ==========

		// ========== WAVE DIFFICULTY CODE START ==========
		// Make player shooting slower as waves increase (harder difficulty)
		let baseShootTime = 500;
		let waveShootPenalty = this.wave * 50; // Add 50ms per wave
		let maxShootTime = 1000; // Cap at 1 second
		let calculatedShootTime = Math.min(baseShootTime + waveShootPenalty, maxShootTime);
		
		// Emergency mode override (When player ship is under 35 health)
		if (this.ship.health < 35) {
			this.shootTime = Math.min(calculatedShootTime, 250);
			this.speed = 20;
			if (this.emerScreen.alpha < 0.1 && this.canMove) {
				this.emerScreen.alpha += 0.01;
			}
		} 
		else {
			this.shootTime = calculatedShootTime;
		}
		if (this.fireRateUpActive) {
			this.shootTime *= 0.5;
		}
		// ========== WAVE DIFFICULTY CODE END ==========

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

        // Player laser collision with enemies
        this.laserGroup.children.iterate(laser => {
            this.ufos.children.iterate(ufo => {
                if (!ufo || !ufo.active) return;
                // Skip if ufo is actually a convoy ship (ally)
                if (ufo.getData && ufo.getData('isAlly')) return;
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
                    if (!ufo || !ufo.active) return;
                    // Skip convoy ships (allies) and check only enemies
                    if (ufo.getData && ufo.getData('isAlly')) return;
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

		// ========== In order to get rid of the glitching aliens CODE START ==========
		// Check and clean up stuck aliens (ones outside screen bounds)
		let margin = 200; // Allow aliens slightly outside for movement
		
		this.ufos.children.iterate(ufo => {
			if (!ufo || !ufo.active) return;
			
			// Reset aliens that get stuck way outside screen bounds
			if (ufo.x < -margin || ufo.x > width + margin || 
				ufo.y < -margin || ufo.y > height + margin) {
				// Reset stuck alien by destroying it
				ufo.destroy();
				this.numUFOS--;
				return;
			}
			// ========== getting rid of glitching alien CODE END ==========
			
			if (ufo.start) {
				this.time.delayedCall(ufo.fireRate || 2000, () => {
					if (ufo && ufo.active) {
						ufo.start = false;
					}
				});
			}
			
			if (!ufo.cooldown && !ufo.start && ufo.fireRate) {
				this.ufoBullet(ufo);
				ufo.cooldown = true;
				this.time.delayedCall(ufo.fireRate, () => {
					if (ufo && ufo.active) {
						ufo.cooldown = false;
					}
				});
			}
		});

		this.scoreText.setText("Score " + this.score);

		if (this.scrollSpeed < this.speed && !this.over) this.scrollSpeed += 0.1;

		this.bg.tilePositionX += this.scrollSpeed;

		if (this.over) {
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
	width: window.innerWidth,
	height: window.innerHeight,
	physics: {
		default: 'arcade',
		arcade: {
			debug: false,
			gravity: { y: 0 }
		}
	},
	scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
    },
	scene: [
		SpaceScene
	]
};

const game = new Phaser.Game(config);