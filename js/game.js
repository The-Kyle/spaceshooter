function init(){
    var stage = new createjs.Stage("canvas");
    var progressDivElement = document.getElementById('currentProgress');

    //Asset preloading
    var assetsPath = "img/";
    var assetManifest = [
        {id:"laser", src:"Bonus/sfx_laser2.ogg"},
        {id:"lose", src:"Bonus/sfx_lose.ogg"},
        {id:"click", src:"Bonus/sfx_zap.ogg"},
        {id:"bgm", src:"Bonus/Light-Years_V001_Looping.mp3"},
        {id:"ship", src:"PNG/playerShip1_blue.png"},
        {id:"fire1", src:"PNG/Lasers/laserBlue01.png"},
        {id:"fireenemie", src:"PNG/Lasers/laserRed01.png"},
        {id:"fireboss", src:"PNG/Lasers/laserRed02.png"},
        {id:"enemies0", src:"PNG/Enemies/enemyBlue1.png"},
        {id:"enemies1", src:"PNG/Enemies/enemyBlue2.png"},
        {id:"enemies2", src:"PNG/Enemies/enemyBlue3.png"},
        {id:"bosses0", src:"PNG/Enemies/enemyBlack1.png"},
        {id:"bosses1", src:"PNG/Enemies/enemyBlack2.png"},
        {id:"bosses2", src:"PNG/Enemies/enemyBlack3.png"},
        {id:"life", src:"PNG/UI/playerLife2_red.png"}
    ];
    var queue = new createjs.LoadQueue(true, assetsPath);
    queue.on("progress", handleOverallProgress);
    queue.installPlugin(createjs.Sound);
    queue.loadManifest(assetManifest);

    function handleOverallProgress()
    {
        progressDivElement.style.width = (queue.progress * 100) + "%";
    }

    var keys = {
        up: [38],
        right: [39],
        down: [40],
        left: [37],
        shoot: [32, 17] //space, ctrl
    };
    
    var level = 0;
    var levels = [
        new Level('enemies0', 3, 'bosses0', 300),
        new Level('enemies1', 4, 'bosses1', 200),
        new Level('enemies2', 5, 'bosses2', 175),
    ];

    var helpText = "This game is for INFT4000 - Assignment 1\nDemonstration purpose only\n\nArrow keys to move\nSpace or Ctrl key to shoot\nEscape key to pause\nMouse Click to toggle sounds\n\nKyle Lee";

    //localstorage for soundEnable, highScore
    var soundEnable = localStorage.getItem('soundEnable') || 'enable';
    if( localStorage.getItem('highScore') === null) localStorage.setItem('highScore', 0);
    var highscore = JSON.parse(localStorage.getItem('highScore'));

    var started = false;
    var end = false;
    var canShoot = false;
    var canFire = true;
    var bossPhase = false;

    var startWrap = new createjs.Container();
    var move = {up: false, right: false, down: false, left: false};
    var levelText;

    document.onkeydown = handleKeyDown;
    document.onkeyup = handleKeyUp;
    
    var bossArr = [];
    var enemiesArray = [];
    var shootArray = [];
    var enemiesShootArray = [];
    var livesArray = [];
    
    var enemiesSpeed = 5000;    
    var score = 0;
    var scoreWrap;

    var invincible = false; //every hit, collision makes player invincible for 1s.
    var speed = 5.5;

    var shield;
    var ship;

    displayStartScreen();

    function main(){
        started = true;
        stage.removeChild(startWrap);
        addShip();
        addEnemies();
        addLives();
        addScore();
        addLevelText();
        addBgm();
        createjs.Ticker.on("tick", tick);
    }

    function displayStartScreen(){
        helpText = new createjs.Text(helpText, '20px kenvector', 'white');
        helpText.x = 40;
        helpText.y = 150;
        var startText = new createjs.Text('PRESS ENTER TO START', '40px kenvector', 'white');
        startText.x = 200;
        startText.y = 400;
        var soundEnableText = (soundEnable == 'enable') ? 'ON' : 'OFF';
        var soundText = new createjs.Text('SOUND : ' + soundEnableText, '20px kenvector', 'white');
        soundText.x = 390;
        soundText.y = 500;
        document.addEventListener('keydown', function(e) {
            if(e.keyCode == 13 && !end && !started) main();
        });
        startWrap.addChild(helpText, startText, soundText);
        stage.addChild(startWrap);
        document.querySelector("canvas").addEventListener('click', function() {
            if(!started){
                localStorage.setItem('sound', soundEnable == 'enable' ? 'disable' : 'enable');
                soundEnable = localStorage.getItem('sound');
                soundEnableText = soundEnable == 'enable' ? 'ON' : 'OFF';
                soundText.text = 'SOUND : ' + soundEnableText;
                
                if (soundEnable == 'enable') {
                    var sound = createjs.Sound.play('click');
                    sound.volume = 0.6;
                }
            }
        });
        createjs.Ticker.addEventListener("tick", stage);
    }
       
    function addShip(){
        ship = new createjs.Bitmap(queue.getResult("ship"));
        stage.addChild(ship);
        ship.x = 435; 
        ship.y = 650; 
    }

    function addEnemies(){
        for(var i=0, c=0; i<levels[level].number; i++){
            var enemie = new createjs.Bitmap(queue.getResult(levels[level].type));
            enemie.x = levels[level].pos + (i * levels[level].pos);
            enemie.y = -100;
            enemie.life = level+1;
            enemiesArray.push(enemie);
            stage.addChild(enemie);
            createjs.Tween.get(enemie)
                .to({y: 150}, 1000, createjs.Ease.getPowInOut(1))
                .call(function(){
                    c++;
                    if( c == levels[level].number){
                        canShoot = true;
                        moveEnemies();
                        enemiesShoot();
                    }
                });
            createjs.Ticker.framerate = 60;
            createjs.Ticker.addEventListener("tick", stage);
        }
    }

    function addLives(){
        for(var i=0; i<3; i++){
            var life = new createjs.Bitmap(queue.getResult('life'));
            life.x = 900;
            life.y = 710 - ( i * 40);
            livesArray.push(life);
            stage.addChild(life);
        }
    }

    function addLevelText(){
        levelText = new createjs.Text('Level ' + (level + 1), '40px kenvector', 'white');
        levelText.x = 20;
        stage.addChild(levelText);
    }

    function addBgm(){
        if (soundEnable = localStorage.getItem('sound') == 'enable') {
            //for infinite bgm replay
            var props = new createjs.PlayPropsConfig().set({interrupt: createjs.Sound.INTERRUPT_ANY, loop: -1, volume: 0.6});
            var sound = createjs.Sound.play('bgm', props);
        }
    }

    function addScore(){
        scoreWrap = new createjs.Text('0'.repeat(5 - String(score).length) + score, '40px kenvector', 'white');
        scoreWrap.x = 800;
        stage.addChild(scoreWrap);
    }

    function addBoss(){
        bossPhase = true;
        var boss = new createjs.Bitmap(queue.getResult(levels[level].boss));

        boss.x = 400;
        boss.y = -100;
        boss.lives = (level + 1) * 3;
        bossArr.push(boss);
        stage.addChild(boss);
        createjs.Tween.get(boss)
            .to({y: 150}, 1000, createjs.Ease.getPowInOut(1))
            .call(function(){
            moveBoss();
            bossShoot();
        });
        createjs.Ticker.framerate = 60;
        createjs.Ticker.addEventListener("tick", stage);
    }

    function tick(){
        //for keyboard movement
        if(move.up && ship.y > 0 ){
            ship.y -= speed;
            if(shield) shield.y -= speed;
        }
        if(move.right && ship.x < stage.canvas.width - ship.image.width){
            ship.x += speed;
            if(shield) shield.x += speed;
        }
        if(move.down && ship.y < stage.canvas.height - ship.image.height){
            ship.y += speed;
            if(shield) shield.y += speed;
        }
        if(move.left && ship.x > 0){
            ship.x -= speed;
            if(shield) shield.x -= speed;
        }
        
        //case: player successfuly shoot enemy
        for(var i=enemiesArray.length-1; i>=0; i--){
            for(var j=shootArray.length-1; j>=0; j--){ 
                if(enemiesArray[i] && shootArray[j]) { //verify if all two argument exists before asking ndgmr
                    if(ndgmr.checkPixelCollision(enemiesArray[i], shootArray[j], 0) && canShoot){
                        enemiesArray[i].life--;
                        if(enemiesArray[i].life <= 0){
                            stage.removeChild(enemiesArray[i]);
                            enemiesArray.splice(i, 1);
                            score += (50 * (level + 1)); 
                            scoreWrap.text = '0'.repeat(5 - String(score).length) + score;
                        }
                        else
                            enemiesArray[i].alpha = enemiesArray[i].life / (level + 1); 
                        stage.removeChild(shootArray[j]);
                        shootArray.splice(j, 1);
                        stage.update();
                    }
                }                
            }
        }

        //case: enemy ship collides player
        for(var i=enemiesArray.length-1; i>=0; i--){
            if(ndgmr.checkPixelCollision(enemiesArray[i], ship, 0) && !invincible){
                stage.removeChild(enemiesArray[i]);
                enemiesArray.splice(i, 1);
                stage.removeChild(livesArray[livesArray.length-1]);
                livesArray.splice(livesArray.length - 1, 1);
                if(soundEnable == 'enable'){
                    var sound = createjs.Sound.play('lose');
                    sound.volume = 1;
                }
                stage.update();
                invincible = true;
                ship.alpha = 0.5;
                setTimeout(function(){
                    invincible = false;
                    ship.alpha = 1;
                }, 1000);
                if( livesArray.length === 0)
                    gameOver(0);
            }
        }

        //case: enemy successfully shoot player
        for(var i=enemiesShootArray.length-1; i>=0; i--){
            if(shield){
                if(ndgmr.checkPixelCollision(enemiesShootArray[i], shield, 0)){
                    stage.removeChild(enemiesShootArray[i]);
                    enemiesShootArray.splice(i, 1);
                    stage.update();
                }
            }
            else if(ndgmr.checkPixelCollision(enemiesShootArray[i], ship, 0) && !invincible){
                stage.removeChild(enemiesShootArray[i]);
                enemiesShootArray.splice(i, 1);
                stage.removeChild(livesArray[livesArray.length-1]);
                livesArray.splice(livesArray.length - 1, 1);
                stage.update();
                if(soundEnable == 'enable'){
                    var sound = createjs.Sound.play('lose');
                    sound.volume = 1;
                }
                invincible = true;
                ship.alpha = 0.5;
                setTimeout(function(){
                    invincible = false;
                    ship.alpha = 1;
                }, 1000);
                if( livesArray.length === 0)
                    gameOver(0);
            }
        }
        //check if all enemies died and if so launch boss
        if(enemiesArray.length === 0 && !bossPhase && !end){
            bossPhase = true;
            addBoss();
            // level++;
            // addEnemies(); 
        }

        if(bossPhase){
            //check if boss hit ship
            if( ndgmr.checkPixelCollision(bossArr[bossArr.length - 1], ship, 0) && !invincible)
                gameOver(0);

            //check if shoot hit boss
            for(var i=shootArray.length-1; i>=0; i--){
                if( ndgmr.checkPixelCollision(bossArr[bossArr.length - 1], shootArray[i], 0)){
                    stage.removeChild(shootArray[i]);
                    shootArray.splice(i, 1);
                    stage.update();
                    bossArr[bossArr.length-1].lives --;
                    score += (100 * (level + 1));
                    if(bossArr[bossArr.length-1].lives <= 0){ 
                        score += 1000;
                        stage.removeChild(bossArr[bossArr.length - 1]);
                        bossArr.splice(bossArr[bossArr.length - 1], 1);
                        stage.update();
                        bossPhase = false;
                        canShoot = false;
                        level++;
                        levelText.text = 'Level ' + (level + 1);

                        enemiesSpeed *= 1.20; //speed increse by 20% at each level's completion
                        if(level < levels.length)
                            addEnemies();
                        else
                            gameOver(1);
                    }
                    scoreWrap.text = '0'.repeat(5 - String(score).length) + score;
                }
            }
        }
    }

    function moveEnemies(){
        for(var i=0, c=0, d=enemiesArray.length; i<enemiesArray.length; i++){
            createjs.Tween.get(enemiesArray[i])
                .to({y: Math.floor(Math.random() * 750) + 1, x: Math.floor(Math.random() * 960) + 1}, enemiesSpeed, createjs.Ease.getPowInOut(1))
                .call(function(){
                    c++;
                    if(c == d && !bossPhase) moveEnemies();
            });
            createjs.Ticker.framerate = 60;
        }
    }

    function enemiesShoot(){
        for(var i=0, c=0, d=enemiesArray.length; i<enemiesArray.length; i++){
                var enemieShoot = new createjs.Bitmap(queue.getResult('fireenemie'));
                enemieShoot.rotation = 180;
                enemieShoot.x = enemiesArray[i].x + (enemiesArray[i].image.width / 2) + 5;
                enemieShoot.y = enemiesArray[i].y + 100;
                enemiesShootArray.push(enemieShoot);
                stage.addChild(enemieShoot);
                createjs.Tween.get(enemieShoot)
                .to({y: 800}, ((800 - enemiesArray[i].y) * (5/4)) + 250, createjs.Ease.getPowInOut(1))
                .call(function(){
                    c++;
                    if(c == d && !bossPhase && !end) enemiesShoot();
                });
                createjs.Ticker.framerate = 60;
        }
    }

    function moveBoss(){
        createjs.Tween.get(bossArr[bossArr.length-1])
        .to({y: Math.floor(Math.random() * 750) + 1, x: Math.floor(Math.random() * 960) + 1}, 1500, createjs.Ease.getPowInOut(1))
        .call(function(){
            if(bossPhase) moveBoss();
        });
        createjs.Ticker.framerate = 60;
    }

    function bossShoot(){
        var bShoot = new createjs.Bitmap(queue.getResult('fireboss'));
        bShoot.rotation = 180;
        bShoot.x = bossArr[bossArr.length-1].x + (bossArr[bossArr.length-1].image.width / 2) + 5;
        bShoot.y = bossArr[bossArr.length-1].y + 100;
        enemiesShootArray.push(bShoot);
        stage.addChild(bShoot);
        createjs.Tween.get(bShoot)
            .to({y: 800}, ((800 - bossArr[bossArr.length-1].y) * (5/4)) + 150, createjs.Ease.getPowInOut(1))
            .call(function(){
                if(bossPhase && !end) bossShoot();
        });
        createjs.Ticker.framerate = 60;
    }

    function gameOver(win){
        end = true;
        var text, scoreBox, msgWin, replay;
        msgWin = win ? 'Congratulations !' : 'Game over';
        if(win) score += 1000 * livesArray.length;
        if( score > highscore ){
            highscore = score;
            localStorage.setItem('highscore', highscore);
        }
        stage.removeAllChildren();
        //
        text = new createjs.Text(msgWin, '75px kenvector', 'white');
        text.x = win ? 50 : 225;
        text.y = 200;
        scoreBox = new createjs.Text('0'.repeat(5 - String(score).length) + score +' Points', '75px kenvector', 'white');
        scoreBox.x = 160;
        scoreBox.y = 310;
        replay = new createjs.Text('Replay', '50px kenvector', 'white');
        replay.x = 370;
        replay.y = 430;
        var hsText = new createjs.Text("HIGHSCORE : " + highscore, '30px kenvector', 'white');
        hsText.x = 330;
        hsText.y = 490;
        stage.addChild(text, replay, scoreBox, hsText);
        document.querySelector("canvas").addEventListener('click', function() {
            if(end) location.reload();
        });
    }

    function handleKeyDown(e){
        var key = e.keyCode;
        if(keys.up.includes(key)){
            move.up = true;
        }
        else if(keys.right.includes(key))
            move.right = true;       
        else if(keys.down.includes(key))
            move.down = true;
        else if(keys.left.includes(key))
            move.left = true;
        else if(keys.shoot.includes(key) && canShoot && started){
            if(canFire && !end){
                if(soundEnable == 'enable'){
                    var sound = createjs.Sound.play('laser');
                    sound.volume = 0.3;
                }
                var shoot = new createjs.Bitmap(queue.getResult('fire1'));

                shoot.x = ship.x + (ship.image.width / 2) - (shoot.image.width / 2);
                shoot.y = ship.y - (ship.image.height / 2);
                shootArray.push(shoot);
                stage.addChild(shoot); 
                createjs.Tween.get(shoot)
                    .to({y: - 1000}, (ship.y + 1000) * (4/3), createjs.Ease.getPowInOut(1));
                createjs.Ticker.framerate = 60;
                canFire = false;
                setTimeout(function(){canFire = true;}, 200);
            }
        }
    }

    function handleKeyUp(e){
        var key = e.keyCode;
        if(keys.up.includes(key)){
            move.up = false;
            document.querySelector("canvas").style.animationDuration = '1.5s';
        }
        else if(keys.right.includes(key))
            move.right = false;         
        else if(keys.down.includes(key))
            move.down = false;
        else if(keys.left.includes(key))
            move.left = false;
    }

    function Level(type, number, boss, pos){
        this.type   = type;
        this.number = number;
        this.boss   = boss;
        this.pos    = pos;
    }

}