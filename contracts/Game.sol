// SPDX-License-Identifier: MIT 
pragma solidity >=0.8.2 <0.9.0;
pragma abicoder v2;
pragma experimental ABIEncoderV2;

contract Game {

    struct GameMatch{
        bytes32 gameId;
        uint tableSize;
        uint ships;
        address p1; // also the creator
        address p2;
        int registration; // -1: not registered, otherwise the amount 
        int reward;
        bool turn; // if true --> p1 have to play otherwise p2 
        bytes32 b1; // hash of the board to proof merkle tree
        bytes32 b2;
        string lastMove; // last move played in the game [1-2][2-4][1-1][2-2] --> first x then y
        string[] moves;     // l'array avrà quindi le caselle pari per il p1 e disapari per il p2 e li metterai le mosse fatte in chiaro
                            // con anche il risultato della mossa tipo 1.1.0 (casella 1 1 mancato) 2.1.1 (casella 2 1 colpito)
    }

    GameMatch[] public matches;
    event SendNewGameCreate(address player, bytes32 gameId);
    event SendRequestAmount(address player, int amount);    //tell to the player to put the money to start play
    event SendTurnAdvice(address player);   //tell to the player that is his/her turn
    event SendMovesAdvice(address player, string move);  //tell to the player that have been shoot
    event SendRequestBoard(address player);   //tell to the player that have won
    event SendWrongMove(address player);    //tell to the player that is not a valid move
    event SendVictory(address player);
    event SendMoveResult(address player, bool hit);

    function join(bytes32 _gameId, bool _isNew, uint8[] memory _info) public{
        
        // set player 2 in case of given game id
        if(_gameId != 0){
            for(uint8 i=0; i < matches.length; i++){
                if(matches[i].gameId == _gameId){
                    if(matches[i].p2 == address(0)){
                        matches[i].p2 = msg.sender;
                        emit SendNewGameCreate(msg.sender, matches[i].gameId);
                        return;
                    }
                    else{
                        emit SendNewGameCreate(msg.sender, 0);
                        return;
                    }
                }
            }
        }

        if(_isNew){
            // otherwise create a new game
            bytes32 newGameId = keccak256(abi.encode(matches.length));
            uint8[] memory _ships= new uint8[](1);
            string[] memory _moves = new string[](0);
            matches.push(GameMatch(newGameId, _info[1], _info[0], msg.sender, address(0), -1, 0, true, 0, 0, "",  _moves));
            emit SendNewGameCreate(msg.sender, newGameId);
            return;
        }

        // set player 2 in random game if available
        for(uint8 i=0; i<matches.length; i++){
            if(matches[i].p2 != address(0)){
                matches[i].p2=msg.sender;
                emit SendNewGameCreate(msg.sender, matches[i].gameId);
                return;
            }
        }

        emit SendNewGameCreate(msg.sender, 0);
    }

    /**
        The two part agree offline and the first who call this method
        also set the reward.    
     */
    function setReward(bytes32 _gameId, int _registration) external{
        for(uint8 i=0; i<matches.length; i++){
            if(matches[i].gameId == _gameId){
                if(matches[i].registration < 0){
                    matches[i].registration=_registration;
                    if(matches[i].p1==msg.sender)
                        emit SendRequestAmount(matches[i].p2, _registration);
                    else
                        emit SendRequestAmount(matches[i].p2, _registration);
                    return;
                }
                else{
                    if(matches[i].registration == _registration){
                        matches[i].reward=_registration*2;
                        return;
                    }
                    else{
                        return;
                    }
                }
            }
        }
    }

    function getInformations(bytes32 _gameId) external view returns(
        bytes32, 
        bytes memory,
        bytes memory,
        address ,
        address ,
        bytes memory ,
        bytes memory ,
        bool , 
        bytes32 ,
        bytes32 ,
        string memory,
        string[] memory
    ){
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                return(matches[i].gameId, abi.encodePacked(matches[i].tableSize), abi.encodePacked(matches[i].ships), matches[i].p1, matches[i].p2, abi.encodePacked(matches[i].registration), abi.encodePacked(matches[i].reward), matches[i].turn, matches[i].b1, matches[i].b2, matches[i].lastMove, matches[i].moves);
            }
        }
    }

    function getReward(bytes32 _gameId) external view returns(int){
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                return matches[i].registration;
            }
        }
    }

    function pay(bytes32 _gameId) public payable{
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                require((msg.value/1000000000000000000) == uint(matches[i].registration));
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
                    emit SendMovesAdvice(matches[i].p2, _coordinate);
                }
                else{
                    emit SendMovesAdvice(matches[i].p1, _coordinate);
                }
            }
        }
    }

    /**
        get the last move of the game
        then compute the merkle tree as a proof 
     */
    function getLastMoves(bytes32 _gameId) public view returns(string memory){
        for(uint8 i=0; i < matches.length; i++){
            if(matches[i].gameId == _gameId){
                return matches[i].lastMove;
            }
        }
    }

    function checkMerkleProof(bytes32 _gameId, bytes32[] memory _sibilings, bool _hit) public {
        
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
                // control if i have to switch the first or the second element of the sibilings array
                // questo problema è sorto perché la merkle proof non viene applicata nel migliore dei modi
                // infatti dovrei computare l'hash della foglia di cui voglio sapere la prova, ma 
                // in quel caso dovrei avere il valore randomico che compone l'hash della foglia.
                // Ma così facendo rovino la segretezza del nodo
                uint row = stringToUint(splitString(matches[i].lastMove, "-")[0]) - 1;
                uint col = stringToUint(splitString(matches[i].lastMove, "-")[0]) - 1;
                uint toCheck = row*matches[i].tableSize + col;
                
                if(toCheck%2!=0){
                    bytes32 _t = _sibilings[0];
                    _sibilings[0] = _sibilings[1];
                    _sibilings[1] = _t;
                }


                for(uint j=0; j < _sibilings.length; j+2){
                    // compute the merkle proof
                    
                    bytes memory _temp = new bytes(64);
                    bytes32 _b1=_sibilings[i];
                    bytes32 _b2=_sibilings[i+1];
                    assembly {
                        mstore(add(_temp, 32), _b1)
                        mstore(add(_temp, 64), _b2)
                        _b := keccak256(0x00, 0x40)
                    }            
                }

                // confronta il risultato con _b se ok allora memorizza la mossa valida e return true

                if(_b == _trueBoard){

                    matches[i].moves.push();
                    // chiama la funzione checkWin e richiedi la board da controllare
                    if(checkWin(matches[i])){
                        emit SendRequestBoard(msg.sender);
                        
                    }else{
                        // altrimenti emetti l'evento cambia turno
                        emit SendTurnAdvice(msg.sender);
                        matches[i].turn ? matches[i].turn=false : matches[i].turn=true; //meglio riuscire a toglierla
                    }

                    if(msg.sender==matches[i].p1){
                        emit SendMoveResult(matches[i].p2, _hit);
                    }else{
                        emit SendMoveResult(matches[i].p1, _hit);
                    }
                        
                    return;
                }
                else{   
                    emit SendWrongMove(msg.sender);             
                    return;
                }
                
            }
        }
    }

    function checkWin(GameMatch memory g) internal pure returns(bool){
        uint _shipToSink=g.ships*2;
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

                if(count == matches[i].ships){ //there aren't ship overlapped
                    payable(msg.sender).transfer(address(this).balance);
                }
            }
        }
    }

    function notifyDelay() public{
        //wait for 5 blocks and if there isn't a reply
        // pay the other player
    }

    fallback() external{
        pay(0);
    }


    /**
        Some utility functions for internal use only    
     */
    function splitString(string memory _s, string memory _separator) internal pure returns(string[] memory){
        string memory _temp="";
        uint count=0;
        bytes memory _sbytes=bytes(_s);
        string[] memory _res = new string[](bytes(_s).length);
        for(uint i=0; i < _sbytes.length; i++){
            if(_sbytes[i]==bytes(_separator)[0]){
                _res[count] = _temp;
                count++;
            }
            else{
                _temp=string(bytes.concat(bytes(_temp), bytes(_s)[i]));
            }
        }
        return _res;
    }

    function stringToUint(string memory _str) internal pure returns (uint) {
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