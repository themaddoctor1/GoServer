
var canvas, context;

//Board size info
var boardSize = 19;
var width, height, cellSize;

//Stats
var board;
var score; //Score is a list of length 2 of form [blk, wht]
var pNames = ['Black', 'White']; //Name of the players
var turn = -1;
var moveDescs = [];

function initBoard(names) {
    
    if (names !== undefined)
        pNames = names;

    canvas = document.getElementById("goban");
    context = canvas.getContext("2d");

    canvas.addEventListener("mousedown", function (evt) {
        var x = evt.x;
        var y = evt.y;
        
        var i = parseInt(x / cellSize, 10);
        var j = parseInt(y / cellSize, 10);
        
        //Make move if valid
        if (i >= 0 && j >= 0 && i < boardSize && j < boardSize)
            makeMove(i, j);
        else
            passMove();

    }, false);

    //Create an empty board
    board = [];
    for (var i = 0; i < boardSize; i++) {
        board.push([]);
        for (var j = 0; j < boardSize; j++)
            board[i].push(0);
    }

    //Set scores to zero
    score = [0, 0];
    moveDescs = [];

    drawBoard();

}

function setBoardState(newBoard, newScore, newTurn) {
    board = newBoard;
    score = newScore;

    turn = newTurn == 0 ? turn : newTurn;

    drawBoard();
}

function addGameLogEntry(move) {
    moveDescs.push(move);
}

function drawBoard() {
    width = window.innerWidth * 0.75;
    height = width / 2;
    /*
    var ratio = (canvas.innerHeight * 0.75) / canvas.height;
    if (canvas.height > ratio) {
        canvas.height = window.innerHeight * 0.75;
        canvas.width *= ratio;
    }
    */

    canvas.width = width;
    canvas.height = height;
    cellSize = width > height ? (height / boardSize) : (width / boardSize);
    console.log(width + " by " + height);

    //Draw the wooden board
    context.rect(0, 0, cellSize * boardSize, cellSize * boardSize);
    context.fillStyle = "#966f33";
    context.fill();
    context.fillStyle = "#000000";
    
    //Draw the lines on the board
    for (var i = 0; i < boardSize; i++) {

        context.beginPath();
        context.moveTo(cellSize / 2, (i + 0.5) * cellSize);
        context.lineTo((boardSize - 0.5) * cellSize, (i + 0.5) * cellSize);
        context.stroke();
        
        context.beginPath();
        context.moveTo((i + 0.5) * cellSize, cellSize / 2);
        context.lineTo((i + 0.5) * cellSize, (boardSize - 0.5) * cellSize);
        context.stroke();


    }
    
    //Draw the pieces
    for (var i = 0; i < boardSize; i++)
        for (var j = 0; j < 19; j++) {

            var x = (i + 0.5) * cellSize;
            var y = (j + 0.5) * cellSize;

            if (board[i][j] == -1) {
                //Black
                context.fillStyle = "#000000";
            } else if (board[i][j] == 1) {
                //White
                context.fillStyle = "#ffffff";
            }

            //Draw if score is non-zero
            if (board[i][j] != 0) {
                context.beginPath();
                context.arc(x, y, 0.4 * cellSize, 0, 2 * Math.PI);
                context.fill();
                context.stroke();
            }
        }

    //Backplates for scoreboard
    context.beginPath();
    context.fillStyle = "#202020";
    context.rect(height, 0, height / 2, height / 4);
    context.fill();

    context.beginPath();
    context.fillStyle = "#cfcfcf";
    context.rect(height, height / 4, height / 2, height / 4);
    context.fill();

    context.font = turn == -1 ? "bold 30px Arial" : "30px Arial";

    //Black name
    context.fillStyle = "#ffffff";
    context.fillText(pNames[0], height + 10, 30);
    
    context.font = turn == 1 ? "bold 30px Arial" : "30px Arial";

    //White name
    context.fillStyle = "#000000";
    context.fillText(pNames[1], height + 10, height / 4 + 30);
    
    context.font = turn == -1 ? "bold 20px Arial" : "20px Arial";
    
    //Black score
    context.fillStyle = "#ffffff";
    context.fillText('Score: ' + score[0], height + 10, 60);

    context.font = turn == 1 ? "bold 20px Arial" : "20px Arial";
    
    //White score
    context.fillStyle = "#000000";
    context.fillText('Score: ' + score[1], height + 10, height / 4 + 60);

    //Move history
    context.font = "16px Arial";
    for (var i = 0; i < 10 && i < moveDescs.length; i++) {
        context.fillText(moveDescs[moveDescs.length - i - 1], height + 10, height / 2 + 16 + 18 * i);
    }
}



