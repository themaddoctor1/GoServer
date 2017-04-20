
//Stone values
const BLACK_STONE = -1;
const WHITE_STONE = 1;

/**
 * Creates a 2D array of zeros.
 * O(r*c)
 */
function make2DZeroArr(r, c) {
    var arr = [];
    for (var i = 0; i < r; i++)
        arr.push(new Array(c).fill(0));

    return arr;
}

function GoBoard(size) {
    this.size = size;
    this.board = make2DZeroArr(size, size);
    
    /**
     * Clones a Go board.
     * O(N^2)
     */
    this.clone = function() {
        var board = new GoBoard(this.size);
        
        for (var i = 0; i < size; i++)
            for (var j = 0; j < size; j++)
                board.board[i][j] = this.board[i][j];

        return board;
    }
    
    /**
     * Equality function
     * O(N^2)
     */
    this.equals = function(other) {
        if (this.size != other.size)
            return false;
        else for (var i = 0; i < this.size; i++)
            for (var j = 0; j < this.size; j++)
                if (this.board[i][j] != other.board[i][j])
                    return false;

        return true;
    }

    /**
     * Creates a filter to represent a chain or blank space
     * O(B+S) = O(N^2)
     */
    this.chainWith = function(r, c, color, chain, mask) {
        if (chain == null)
            chain = make2DZeroArr(this.size, this.size);
        
        if (mask == null)
            mask = make2DZeroArr(this.size, this.size);
        
        if (r < 0 || r >= size || c < 0 || c >= size || mask[r][c] != 0)
            return mask;

        mask[r][c] = 1;

        if (this.board[r][c] == color) {
            chain[r][c] = 1;
            this.chainWith(r-1, c, color, chain, mask);
            this.chainWith(r+1, c, color, chain, mask);
            this.chainWith(r, c-1, color, chain, mask);
            this.chainWith(r, c+1, color, chain, mask);
        }
        
        return chain;
    }
    
    /**
     * Finds out how many liberties a stone has.
     * The user should pass null as the mask.
     * O(B) = O(N^2)
     */
    this.libertiesOf = function(r, c, color, mask) {
        if (mask == null)
            mask = make2DZeroArr(this.size, this.size);

        if (r < 0 || r >= size || c < 0 || c >= size)
            return 0;
        
        mask[r][c] = 1;
        var result = 0;
        
        /* Up */
        if (r > 0 && mask[r-1][c] == 0) {
            if (this.board[r-1][c] == 0) {
                result++;
            } else if (color == this.board[r-1][c])
                result += this.libertiesOf(r-1, c, color, mask);
            mask[r-1][c] = 1;
        }
        
        /* Down */
        if (r < this.size - 1 && mask[r+1][c] == 0) {
            
            if (this.board[r+1][c] == 0) {
                result++;
            } else if (color == this.board[r+1][c])
                result += this.libertiesOf(r+1, c, color, mask);
            mask[r+1][c] = 1;
        }
        
        /* Left */
        if (c > 0 && mask[r][c-1] == 0) {
            if (this.board[r][c-1] == 0) {
                result++;
            } else if (color == this.board[r][c-1])
                result += this.libertiesOf(r, c-1, color, mask);
            mask[r][c-1] = 1;
        }
        
        /* Right */
        if (c < this.size - 1 && mask[r][c+1] == 0) {
            if (this.board[r][c+1] == 0) {
                result++;
            } else if (color == this.board[r][c+1])
                result += this.libertiesOf(r, c+1, color, mask);
            mask[r][c+1] = 1;
        }

        return result;

    }

    /**
     * Attempts to place a stone.
     *
     * return - An indicating whether or not the move was legal.
     *          0 - Legal
     *          1 - On top of another player's stone
     *          2 - Suicidal placement
     *
     * O(N^2)
     */
    this.placeStone = function(r, c, color) {
        
        /* Allow placement on empty tiles in the following circumstances:
            1) The stone placed has liberties.
            2) The stone covers the liberty of an oppenent's chain in atari.
        */

        if (this.board[r][c] != 0)
            return 1;
        
        if (this.libertiesOf(r, c, color, null) > 0) {
            
            //console.log("Placed stone at " + r + "," + c);

        } else {
            if (
                    (r > 0 && this.board[r-1][c] == -color && this.libertiesOf(r-1, c, -color, null) == 1) || 
                    (r < this.size - 1 && this.board[r+1][c] == -color && this.libertiesOf(r+1, c, -color, null) == 1) || 
                    (c > 0 && this.board[r][c-1] == -color && this.libertiesOf(r, c-1, -color, null) == 1) || 
                    (c < this.size - 1 && this.board[r][c+1] == -color && this.libertiesOf(r, c+1, -color, null) == 1)) {

                console.log("Legal suicidal placement at " + r + "," + c);

            } else {
                console.log("Illegal placement");
                return 2;
            }
        }

        this.board[r][c] = color;

        //Find out what opposing stones need to be removed.
        var filter = make2DZeroArr(this.size, this.size);
        for (var i = 0; i < 4; i++) {
            var x = r + ((i+1) % 2) * (i > 1 ? 1 : -1);
            var y = c + (i % 2) * (i > 1 ? 1 : -1);
            
            //console.log("Checking liberties of " + x + "," + y);

            //Only add them to the filter if they have no liberties
            //O(N^2 + N^2) = O(N^2)
            if (this.libertiesOf(x, y, -color, null) == 0) {
                var extraFilter = this.chainWith(x, y, -color, null, null);
                for (var j = 0; j < this.size; j++)
                    for (var k = 0; k < this.size; k++)
                        if (filter[j][k] == 0)
                            filter[j][k] = extraFilter[j][k];
            }
        }
        
        //Lift the stones.
        //O(N^2)
        for (var i = 0; i < this.size; i++)
            for (var j = 0; j < this.size; j++)
                this.board[i][j] += color * filter[i][j];

        return 0;
    }

}

function GoMatch(board, player, moveHist, hist, pNames) {
    this.currBoard = board;
    this.movesHistory = moveHist;
    this.history = hist;
    this.turn = player == 0 ? BLACK_STONE : player;
    this.playerNames = pNames;
    this.passes = 0;
    
    this.passTurn = function(player) {
        if (this.turn != player)
            return 3;
        else if (this.passes > 1)
            return 5;
        else {
            this.passes++;
            this.turn *= -1;
            return this.passes >= 2 ? 5 : 0;
        }
    };

    /**
     * Makes a move for the player, storing the move location and the 
     * Returns an error code:
     *      0 - Legal move.
     *      1 - On another player's stones.
     *      2 - Suicidal move.
     *      3 - Wrong turn.
     *      4 - Ko rule violation.
     *      5 - Game over
     * O(N^2 + H*N^2) = O(H*N^2)
     */
    this.placeStone = function(r, c, player) {
        if (this.turn != player)
            return 3;
        else if (this.passes > 1)
            return 5;
        else {
            var boardClone = this.currBoard.clone();
            var errCode = this.currBoard.placeStone(r, c, player);
            if (errCode == 0) {
                
                //Check ko rule
                for (var i = 0; i < this.history.length; i++) {
                    if (this.currBoard.equals(this.history[i]))
                        break;
                }
                
                //If it wasn't violated, allow the placement
                if (i == this.history.length) {
                    this.history.push(boardClone);
                    this.movesHistory.push((r, c));
                    
                    //Next player
                    this.turn *= -1;
                    this.passes = 0;

                    return 0;
                } else {
                    this.currBoard = boardClone;
                    return 4;
                }
            } else
                return errCode;
        }
    }
    
    /**
     * Scores a Go Board.
     * return - A list containing the scores of black and white, respectively.
     * O(N^2)
     */
    this.scoreBoard = function() {
        var counted = make2DZeroArr(this.currBoard.size, this.currBoard.size);
        
        //scores[0] is black, and scores[1] is white
        var scores = [0, 0];
        
        /**
         * Helper function that computes the number of
         * tiles of a color surrounding an empty section.
         * O(B + P) = O(N^2))
         */
        var surroundColors = function(r, c, board, color, mask, DEPTH) {

            if (r < 0 || c < 0 || r >= board.size || c >= board.size || mask[r][c] != 0)
                return 0;
            else if (board.board[r][c] == 0) {
                var count = 0;
                
                //Maintain the invariant that checked cells
                //should not be rechecked.
                mask[r][c] = 1;
                
                //Add the amount from surrounding tiles to the count.
                count += surroundColors(r-1, c, board, color, mask, DEPTH+1);
                count += surroundColors(r+1, c, board, color, mask, DEPTH+1);
                count += surroundColors(r, c-1, board, color, mask, DEPTH+1);
                count += surroundColors(r, c+1, board, color, mask, DEPTH+1);

                return count;

            } else {
                mask[r][c] = -1
                return board.board[r][c] == color ? 1 : 0;
            }

        }
        
        /**
         * Loops through each index. Skips checked cells.
         * Consequently, surroundColors() is not called N^2 times.
         * So, O(N^2)
         */
        for (var i = 0; i < this.currBoard.size; i++) {
            for (var j = 0; j < this.currBoard.size; j++) {
                
                if (this.currBoard.board[i][j] == BLACK_STONE)
                    scores[0]++;
                else if (this.currBoard.board[i][j] == WHITE_STONE)
                    scores[1]++;
                else if (counted[i][j] == 0) {
                    
                    //Get the number of stones of each color surrounding the space
                    var blk = surroundColors(i, j, this.currBoard, BLACK_STONE, make2DZeroArr(this.currBoard.size, this.currBoard.size), 0);

                    var wht = surroundColors(i, j, this.currBoard, WHITE_STONE, make2DZeroArr(this.currBoard.size, this.currBoard.size), 0);

                    //If at most one player rules the space, score it.
                    var filter = this.currBoard.chainWith(i, j, 0, null, null);

                    for (var x = 0; x < this.currBoard.size; x++) {
                        for (var y = 0; y < this.currBoard.size; y++) {
                            var f = filter[x][y];
                            if (f > 0) {
                                if (blk * wht == 0) {
                                    if (blk > 0)
                                        scores[0]++;
                                    else if (wht > 0)
                                        scores[1]++;
                                }
                                counted[x][y] = 1;
                            }
                        }
                    }
                }
            }
        }

        return scores;

    }
    
}

exports.GoBoard = GoBoard;
exports.GoMatch = GoMatch;

/*
var board = new GoBoard(13);

var game = new GoMatch(board, 0, [], []);
console.log("Move 1:");
game.placeStone(1, 0, BLACK_STONE);

console.log("Move 2:");
game.placeStone(0, 0, WHITE_STONE);

console.log("Move 3:");
game.placeStone(0, 1, BLACK_STONE);

console.log(board.board);
var score = game.scoreBoard();
console.log("Scores: " + score);
*/
