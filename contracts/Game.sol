pragma solidity >=0.4.22 <0.9.0;

contract Game {

    struct GameMatch{
        bytes32 gameId;
        uint tableSize;
        uint8[] ships;
        address p1; // also the creator
        address p2;
        int registration; // -1: not registered, otherwise the amount 
        int reward;
        bool turn; // if true --> p1 have to play otherwise p2 
        bytes32 b1; // hash of the board to proof merkle tree
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

    function join(address player, bytes32 _gameId) external returns(bytes32){
        
        // set player 2 in case of given game id
        bytes32 _gameIdTest = _gameId;
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
        bytes32 newGameId = keccak256(abi.encode(matches.length));
        uint8[] memory _ships= new uint8[](1);
        string[] memory _moves = new string[](0);
        _ships[0]=2;
        GameMatch memory newGame = GameMatch(newGameId, 2, _ships, player, address(0), -1, 0, true, 0, 0, "",  _moves);
        matches.push(newGame);
        return newGameId;
    }

    /**
        The two part agree offline and the first who call this method
        also set the reward.    
     */
    function setReward(bytes32 _gameId, int _amount) external returns(bool){
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

    function payGame(bytes32 _gameId) public payable{
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                require(msg.value == uint(matches[i].registration));
            }
        }
    }

    function setBoard(bytes32 _gameId, bytes32 _hashedBoard) public{
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                if(matches[i].p1==msg.sender){
                    matches[i].b1=_hashedBoard;
                }
                else{
                    matches[i].b2=_hashedBoard;
                }
                matches[i].turn=true;
                emit SendTurnAdvice(matches[i].p1);
            }
        }
    }

    function shoot(bytes32 _gameId, string calldata _coordinate) public{
        // stores the coordination for the other player
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                matches[i].lastMove=_coordinate;
                if(matches[i].p1==msg.sender){
                    emit SendMovesAdvice(matches[i].p1);
                }
                else{
                    emit SendMovesAdvice(matches[i].p2);
                }
            }
        }
    }

    /**
        get the last move of the game
        then compute the merkle tree as a proof 
     */
    function getLastMoves(bytes32 _gameId) public returns(string memory){
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                return matches[i].lastMove;
            }
        }
    }

    function checkMerkleProof(bytes32 _gameId, bytes32[] calldata _sibilings) public returns(bool){
        
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                bytes32 _trueBoard;
                if(matches[i].p1==msg.sender){
                    _trueBoard=matches[i].b1;
                }
                else{
                    _trueBoard=matches[i].b2;
                }
                
                bytes32 _b; //=keccak256(_firstNode); wait for the reply of teacher
                for(uint j=0; j < _sibilings.length; j++){
                    // compute the merkle proof
                    // there is an issue and it's reported in the PDF
                    bytes memory _temp = new bytes(64);
                    bytes32 _b1=_sibilings[i];
                    assembly {
                        mstore(add(_temp, 32), _b)
                        mstore(add(_temp, 64), _b1)
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
        uint _shipToSink=0;
        for(uint i=0; i < g.ships.length; i++){
            _shipToSink+=g.ships[i];
        }
        uint _shipSinked=0;
        if(g.turn){
            for (uint i=0; i<g.moves.length; i+2){
                string[] memory _s = splitString(g.moves[i], ".");
                _shipSinked += stringToUint(_s[2]);
            }
        }else{
            for(uint i = 1; i < g.moves.length; i+2){
                string[] memory _s = splitString(g.moves[i], ".");
                _shipSinked += stringToUint(_s[2]);
            }
        }

        if(_shipSinked==_shipToSink){
            return true;
        }else{
            return false;
        }
    }

    function checkBoard(bytes32 _gameId, string[][] memory _board) public payable returns(bool){
        bytes1 _one = 0x01;        
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                //controllo sovrapposizioni navi
                uint8 count=0;
                for(uint q = 0; q < matches[i].tableSize; q++){
                    for(uint k = 0; k < matches[i].tableSize; k++){
                        if(bytes(_board[q][k])[0] == _one) //there is a ship
                            count++;
                    }
                }

                if(count == matches[i].ships.length){ //there aren't ship overlapped
                    payable(msg.sender).transfer(address(this).balance);
                }
            }
        }
    }

    function notifyDelay() public{
        //wait for 5 blocks and if there isn't a reply
        // pay the other player
    }


    /**
        Some utility functions for internal use only    
     */
    function splitString(string memory _s, string memory _separator) internal returns(string[] memory){
        string memory _temp="";
        bytes memory _sbytes=bytes(_s);
        string[] storage _res;
        for(uint i=0; i < _sbytes.length; i++){
            if(_sbytes[i]==bytes(_separator)[0]){
                _res.push(_temp);
            }
            else{
                _temp=string(bytes.concat(bytes(_temp), bytes(_s)[i]));
            }
        }
        return _res;
    }

    function stringToUint(string memory _str) internal returns (uint) {
        bytes memory b = bytes(_str);
        uint result = 0;
        for (uint i = 0; i < b.length; i++) {
            uint c = uint(uint8(b[i]));
            if (c >= 48 && c <= 57) {
                result = result * 10 + (c - 48);
            }
        }
        return result;
    }
}