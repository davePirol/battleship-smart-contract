pragma solidity >=0.4.22 <0.9.0;

contract Game {

    struct GameMatch{
        string gameId;
        int tableSize;
        int[] ships;
        address p1; // also the creator
        address p2;
        int registration;
        int reward;
        // winner
        bool turn; // if true --> p1 have to play otherwise p2 
        bytes32 b1; // hash of the board --> merkle root?? is correct?? in that case 
        bytes32 b2;
        string lastMove; // last move played in the game [1.2][2.4][1.1][2.2] --> first x then y
        string[] moves;     // l'array avrà quindi le caselle pari per il p1 e disapari per il p2 e li metterai le mosse fatte in chiaro
                            // con anche il risultato della mossa tipo 1.1.0 (casella 1 1 mancato) 2.1.1 (casella 2 1 colpito)
    }

    GameMatch[] matches;
    event SendRequestAmount(address p1, address p2);    //tell to the player to put the money to start play
    event SendTurnAdvice(address player);   //tell to the player that is his/her turn
    event SendMovesAdvice(address player);  //tell to the player that have been shoot
    event SendRequestBoard(address player);   //tell to the player that have won
    event SendWrongMove(address player);    //tell to the player that is not a valid move

    function join(address player, string memory _gameId) external returns(string memory){
        
        // set player 2 in case of given game id
        bytes memory _gameIdTest = bytes(_gameId);
        if(_gameIdTest.length == 0){
            for(uint8 i=0; i<matches.length; i++){
                if(matches[i].gameId == _gameId){
                    if(matches[i].p2 == address(0)){
                        matches[i].p2 = player;
                        return matches[i].gameId;
                    }
                }
            }
        }

        // set player 2 in random game if available
        for(uint8 i=0; i<matches.length; i++){
            if(matches[i].p2 != address(0)){
                matches[i].p2=player;
                return matches[i].gameId;
            }
        }

        // otherwise create a new game
        string memory newGameId = string(keccak256(matches.length));
        GameMatch memory newGame = GameMatch(newGameId, 2, [2], player, address(0), -1, 0);
        matches.push(newGame);
        return newGameId;
    }

    function setReward(string memory _gameId, int _amount) external returns(bool){
        for(uint8 i=0; i<matches.length; i++){
            if(matches[i].gameId == _gameId){
                if(matches[i].registration < 0){
                    matches[i].registration=_amount;
                    return true;
                }
                else{
                    if(matches[i].registration == _amount){
                        matches[i].reward=_amount*2;
                        return true;
                    }
                    else{
                        return false;
                    }
                }
            }
        }
    }

    function payGame(string memory _gameId) public{
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                require(msg.value == matches[i].registration);
            }
        }
    }

    function setBoard(string memory _gameId, bytes32 hashedBoard) public{
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                if(matches[i].p1==msg.sender){
                    matches[i].d1=hashedBoard;
                }
                else{
                    matches[i].d2=hashedBoard;
                }
                matches[i].turn=true;
                emit SendTurnAdvice(matches[i].p1);
            }
        }
    }

    function shoot(string calldata _gameId, string calldata _coordinate) public{
        // stores the coordination for the other player
        
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                matches[i].lastMove=_coordinate;
                if(matches[i].p1==msg.sender){
                    SendMovesAdvice(matches[i].p1);
                }
                else{
                    SendMovesAdvice(matches[i].p2);
                }
            }
        }

        // player compute the merkle proof 

        // check the merkle proof

        // store the coordinates
    }

    /**
        get the last move of the game
        then compute the merkle tree as a proof 
     */
    function getLastMoves(string calldata _gameId) public returns(string memory){
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                return matches[i].lastMove;
            }
        }
    }

    function checkMerkleProof(string calldata _gameId, bytes32[] calldata _sibilings) public returns(bool){
        
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                bytes32 _trueBoard;
                if(matches[i].p1==msg.sender){
                    _trueBoard=matches[i].b1;
                }
                else{
                    _trueBoard=matches[i].b2;
                }
                
                bytes32 _b;
                for(int j=0; j < _sibilings.length; j++){
                    // compute the merkle proof
                    // there is an issue and it's reported in the PDF

                    bytes memory _temp = new bytes(64);
                    assembly {
                        mstore(add(_temp, 32), b1)
                        mstore(add(_temp, 64), b2)
                        _b := keccak256(0x00, 0x40)
                    }            
                }

                // confronta il risultato con _b se ok allora memorizza la mossa valida e return true

                if(_b == _trueBoard){

                    matches[i].moves.push();
                    // chiama la funzione checkWin e se true emetti evento vittoria
                    if(checkWin(matches[i], msg.sender)){
                        emit SendRequestBoard(msg.sender);
                    }else{
                        // altrimenti emetti l'evento cambia turno
                        emit SendTurnAdvice(msg.sender);
                        matches[i].turn ? matches[i].turn=false : matches[i].turn=true;
                    }
                        
                    return true;
                }
                else{   
                    emit SendWrongMove(msg.sender);             
                    return false;
                }
                
            }
        }
    }

    function checkWin(GameMatch memory g, address sender) internal returns(bool){
        int _shipToSink=0;
        for(int i=0; i < g.ships.length; i++){
            _shipToSink+=g.ships[i];
        }
        int _shipSinked=0;
        if(g.turn){
            for (int i=0; i<g.moves.length; i+2){
                string[] memory _s = splitString(g.moves, ".");
                _shipSinked += _s[2];
            }
        }else{
            for(int i = 1; i<g.moves.length; i+2){
                string[] memory _s = splitString(g.moves, ".");
                _shipSinked += _s[2];
            }
        }

        if(_shipSinked==_shipToSink){
            return true;
        }else{
            return false;
        }
    }

    function splitString(string memory _s, string memory _separator) internal returns(string[] memory){
        string memory _temp="";
        string[] memory _res;
        for(int i=0; i<_s.length; i++){
            if(_s[i]==_separator){
                _res.push(_temp);
            }
            else{
                _temp=string(bytes.concat(bytes(_temp), bytes(_s[i])));
            }
        }

        return _res;
    }

    function checkBoard() public payable{

    }

    //function pay 

    function notifyDelay() public{
        //wait for 5 blocks and if there isn't a reply
        // pay the other player
    }

    

}