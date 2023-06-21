App = {
  web3Provider: null,
  contracts: {},
  infos: null,
  rand:null,
  sibilings:[],
  battleshipInstance:null,
  lastMove:null,
  

  init: async function() {
    return await App.initWeb3();
  },

  initWeb3: async function() {
    if (window.ethereum){
      App.web3Provider = window.ethereum;
      try{
        await window.ethereum.enable();
      }catch(error){
        console.log("User denied account access");
      }
    }
    else if(window.otherWeb3){
      App.web3Provider = window.otherWeb3.currentProvider;
    }
    else{
      App.web3Provider = new Web3.provider.HttpProvider("http://localhost:7545");
    }
    otherWeb3 = new Web3(App.web3Provider);
    
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Game.json", function(data){
      var BattleshipArtifact = data;
      App.contracts.Battleship = TruffleContract(BattleshipArtifact);
      App.contracts.Battleship.setProvider(App.web3Provider);

      App.contracts.Battleship.deployed().then(function(instance) {
        App.battleshipInstance = instance;
        App.listenForEvents();
      });
    });  

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '#playNew', App.startNewGame);
    $(document).on('click', '#playRandom', App.joinRandomGame); 
    $(document).on('click', '#playMatched', App.joinFriendGame);  
    $(document).on('click', '#setRegAmount', App.setRegistrationAmount);
    $(document).on('click', '#payGame', App.pay);
    $(document).on('click', '#saveBoard', App.sendBoard);
    $(document).on('click', '#sendMove', App.sendMove);
    $(document).on('click', '#reportPlayer', App.reportPlayer);
  },

  startNewGame: function(){
    let nShips=$('#nShips').val();
    let tableWidth=$('#tableWidth').val();

    if(nShips == '' || tableWidth == ''){
      $(".tableWidth-error").text("required");
      $(".tableWidth-error").css("display", "block");
      $(".nShips-error").text("required");
      $(".nShips-error").css("display", "block");
      return;
    }

    if((Math.log(tableWidth)/Math.log(2)) % 1 !== 0){
      $(".nShips-error").css("display", "none");
      $(".tableWidth-error").text("Set a number power of two");
      $(".tableWidth-error").css("display", "block");
      return;
    }

    if(nShips >= (Math.pow(tableWidth, 2)/2)){
      $(".tableWidth-error").css("display", "none");
      $(".nShips-error").text("Too many ships, decrease");
      $(".nShips-error").css("display", "block");
      return;
    }

    var arr = [nShips, tableWidth];
    event.preventDefault();
    otherWeb3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        return instance.join(0, true, arr, {from: account});
      }).then(function(result){
        console.log(result);
        return;
      }).catch(function(err){
        console.log(err);
      });
    });
  },

  joinFriendGame: function(){
    var gameId=$('#gameId').val();
    console.log(gameId);
    event.preventDefault();

    otherWeb3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        return instance.join(gameId, false, [], {from: account});
      }).then(function(result){
        console.log(result);
        return;
ì      }).catch(function(err){
        console.log(err);
      });
    });
  },

  joinRandomGame: function(){
    event.preventDefault();
    otherWeb3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        return instance.join(0, false, [],{from: account});
      }).then(function(result){
        console.log(result);
        return;
      }).catch(function(err){
        console.log(err.message);
      });
    });
  },

  getRegistrationAmount: function(){
    var gameId=$('#gameIDreg').text();
    App.contracts.Battleship.deployed().then(function (instance){
      return instance.getReward.call(gameId);
    }).then(function(result){
      console.log(result);
      if($('#registrationAmount').val()!='')
        $('#registrationAmount').attr('disabled', true);
      else{
        if(result >= 0)
          $('#registrationAmount').val(result);
      }
    }).catch(function(err){
      console.log(err.message);
    });
  },

  setRegistrationAmount: function(event) {
    var gameId=$('#gameIDreg').text();
    var amount=$('#registrationAmount').val();
    event.preventDefault();
    otherWeb3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.setReward(gameId, amount, {from: account});
      }).then(function(result) {
        console.log(result);
        if(result){
          $('#setRegAmount').attr('disabled', true);
          $('#registrationAmount').attr('disabled', true);
          $('#payGame').attr('disabled', false);
          $('#toastRegistrationSuccess').toast('show');
        }else{
          $('#toastRegistrationError').toast('show');
        }
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  pay: function(event) {
    var gameId=$('#gameIDreg').text();
    event.preventDefault();
    otherWeb3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.pay(gameId, {from: account, value: web3Utils.toWei($('#registrationAmount').val())});
      }).then(function(result) {
        console.log(result);
        var n=$('#tableWidth').val();
        setTable(n);
        $('#numShipsBoard').append($('#nShips').val());
        $('#registration').attr("hidden", true);
        $('#board').attr("hidden", false);
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  sendBoard: function() {
    var gameId=$('#gameIDreg').text();
    var hashedBoard=hashBoard();
    console.log(hashedBoard); 
    otherWeb3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        return instance.setBoard(gameId, hashedBoard, {from: account});
      }).then(function(result){
          console.log(result);
          var n=$('#tableWidth').val();
          setAdversaryTable(n);
          $('#enemyBoard').attr("hidden", false);
          $('#saveBoard').attr("hidden", true);
          $('#sendMove').attr("disabled", true);
      }).catch(function(err){
        console.log(err.message);
      });
    });
  },

  getInfo: function(){
    var gameId=$('#gameIDreg').text();
    console.log();
    App.contracts.Battleship.deployed().then(function (instance){
      return instance.getInformations.call(gameId);
    }).then(function(result){
      App.infos = result;
      $('#gameIDreg').text(result[0]);
      $('#nShips').val(parseInt(result[2], 16));
      $('#tableWidth').val(parseInt(result[1], 16));
      if(web3Utils.toBN(result[5]).toNumber() > -1){
        $('#registrationAmount').val(parseInt(result[5], 16));
        $('#registrationAmount').attr('disabled', true);
      }    
    }).catch(function(err){
      console.log(err.message);
    });
  },

  sendMove: function(){
    $('#sendMove').attr('disabled', true);
    $('#advice').text("Wait for reply: be patient");
    
    var gameId=$('#gameIDreg').text();
    var idRaw=null;
    var table=document.getElementById("adversaryBoard");
    for (var i = 1, row; row = table.rows[i]; i++) {
      for (var j = 1, col; col = row.cells[j]; j++) {
          if(col.firstChild.getAttribute("class") == 'redB')
              idRaw=col.firstChild.id;
      }  
    }

    if(idRaw == null){
      $('#advice').text("Select an empty cell!");
      return;
    }

    var id=idRaw.substring(1);
    var coordinate=id;

    event.preventDefault();
    otherWeb3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.shoot(gameId, coordinate,{from: account});
      }).then(function(result) {
        $('#reportPlayer').attr('disabled', false);
        console.log(result);
      }).catch(function(err) {
        console.log(err.message);
        $('#sendMove').attr('disabled', false);
        $('#advice').text("An error is occured: shoot again!");
      });
    });
  },

  reportPlayer: function(){
    var gameId=$('#gameIDreg').text();
    
    otherWeb3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.notifyDelay(gameId, {from: account});
      }).then(function(result) {
        console.log(result);
      }).catch(function(err) {
        console.log(err.message);
        $('#sendMove').attr('disabled', false);
        $('#advice').text("An error is occured: shoot again!");
      });
    });
  },

  listenForEvents: function(){
    App.contracts.Battleship.deployed().then(function (instance) {
      instance.SendNewGameCreate({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }
        const data=result;
        var newGameId=data.args.gameId;
        if(data.event=="SendNewGameCreate" && data.args.player==otherWeb3.eth.accounts[0]){
          if (newGameId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            $('#gameIDreg').text(newGameId);
            $('#chooseSize').attr('hidden', true);
            $('#registration').attr('hidden', false);
            App.getInfo();
          }else{
            $('toastNewGameError').show();
          }    
        }    

      });
      instance.SendRequestAmount({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }
        var gameId=$('#gameIDreg').text();
        const data=result;
        if(data.event=="SendRequestAmount" && data.args.player==otherWeb3.eth.accounts[0] && data.args.gameId==gameId){
          console.log(result);
          App.getInfo();
        }
      });
      instance.SendMovesAdvice({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }    
        var gameId=$('#gameIDreg').text();    
        const data=result;        
        if(data.event=="SendMovesAdvice" && data.args.player==otherWeb3.eth.accounts[0] && data.args.gameId==gameId){
          
          console.log(data);
          $('#reportPlayer').attr('disabled', true);
          
          var idToCheck=data.args.move;
          if($('#'+idToCheck).attr('class')=='hit')
            var hit=true;
          else
            var hit=false;

          var gameId=$('#gameIDreg').text();
        
          if(gameId!=""){
            console.log("call to checkMerkleProof");
            //App.getLastMove();
            App.contracts.Battleship.deployed().then(function (instance){
              return instance.getLastMoves.call(gameId);
            }).then(function(result){
              App.lastMove=result;

              const sibilings=App.getSibilings(idToCheck);
              const leafIndex = (parseInt(App.lastMove.split("-")[0]) - 1) * parseInt(App.infos[1], 16) + (parseInt(App.lastMove.split("-")[1]) - 1);
              
              otherWeb3.eth.getAccounts(function(error, accounts) {
                if (error) { console.log(error); }
                var account = accounts[0];
                App.contracts.Battleship.deployed().then(function (instance) {
                  return instance.checkMerkleProof(gameId, sibilings, hit, leafIndex, {from: account});
                }).then(function(result) {
                  console.log(result);
                  $('#sendMove').attr('disabled', true);
                }).catch(function(err) {
                  console.log(err.message);
                });
              }); 

            }).catch(function(err){
              console.log(err.message);
            }); 
          }     
        }
      });
      instance.SendTurnAdvice({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }
        var gameId=$('#gameIDreg').text();
        const data=result;
        if(data.event=="SendTurnAdvice" && data.args.gameId==gameId){
          if(data.args.play==otherWeb3.eth.accounts[0]){
            console.log(data);          
            $('#sendMove').attr('disabled', false);
            $('#reportPlayer').attr('disabled', true);
            $('#advice').text("It's your turn: shoot!");  
          }else if(data.args.wait==otherWeb3.eth.accounts[0]){
            console.log(data);          
            $('#sendMove').attr('disabled', true);
            $('#reportPlayer').attr('disabled', false);
            $('#advice').text("Keep calm: wait your turn!");  
          }        
        }
      });
      instance.SendMoveResult({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }
        var gameId=$('#gameIDreg').text();
        const data=result;
        if(data.event=="SendMoveResult" && result.args.player==otherWeb3.eth.accounts[0] && data.args.gameId==gameId){
                    
          console.log(data);
          
          if(data.args.hit){
            $('#a'+data.args.coordinate).attr('class', 'hit');
            $('#resultMove').text('hit');
          }else{
            $('#a'+data.args.coordinate).attr('class', 'miss');
            $('#resultMove').text('miss');
          }
          $('#sendMove').attr('disabled', true);
          $('#advice').text("Wait for your turn: keep calm!");
        }
      });
      instance.SendRequestBoard({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }
        var gameId=$('#gameIDreg').text();
        const data=result;
        if(data.event=="SendRequestBoard" && result.args.player==otherWeb3.eth.accounts[0] && data.args.gameId==gameId){
          console.log(data);

          $('#reportPlayer').attr('disabled', true);

          var table=document.getElementById("gameBoard");
          var board=[];
          var gameId=$('#gameIDreg').text();

          for (var i = 1, row; row = table.rows[i]; i++) {
              var riga=[];
              for (var j = 1, col; col = row.cells[j]; j++) {
                if(col.firstChild.getAttribute("class") == 'hit'){
                  riga.push(1)
                }else{
                  riga.push(0)
                }         
              }
              board.push(riga);  
          }

          otherWeb3.eth.getAccounts(function(error, accounts) {
            if (error) { console.log(error); }
            var account = accounts[0];
            App.contracts.Battleship.deployed().then(function (instance) {
              return instance.checkBoard(gameId, board.flat(), {from: account});
            }).then(function(result) {
              console.log(result);
            }).catch(function(err) {
              console.log(err.message);
            });
          });

        }
      });
      instance.SendWrongMove({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }    
        var gameId=$('#gameIDreg').text();    
        const data=result;
        if(data.event=="SendWrongMove" && result.args.player==otherWeb3.eth.accounts[0] && data.args.gameId==gameId){
          console.log(data);
        }
      });
      instance.SendVictory({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }        
        var gameId=$('#gameIDreg').text();
        const data=result;
        if(data.event=="SendVictory" && data.args.gameId==gameId){
          if(result.args.winner==otherWeb3.eth.accounts[0]){
            console.log(data);
            $('#board').attr('hidden', true);
            $('#enemyBoard').attr('hidden', true);
            $('#win').attr('hidden', false);
          }
          else if(result.args.loser==otherWeb3.eth.accounts[0]){
            console.log(data);
            $('#board').attr('hidden', true);
            $('#enemyBoard').attr('hidden', true);
            $('#lose').attr('hidden', false);
          }
        }
      });
      instance.SendStopReport({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }    
        var gameId=$('#gameIDreg').text();    
        const data=result;
        if(data.event=="SendStopReport" && result.args.player==otherWeb3.eth.accounts[0] && data.args.gameId==gameId){
          console.log(data);
          $('#stopReport').attr('hidden', false);
          setTimeout(function(){
            $('#stopReport').attr('hidden', true);
          }, 5000);
        }
      });
      instance.SendCheatPayment({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }    
        var gameId=$('#gameIDreg').text();    
        const data=result;
        if(data.event=="SendCheatPayment" && data.args.gameId==gameId){
          console.log(data);
          if(result.args.cheater==otherWeb3.eth.accounts[0]){
            $('#board').attr('hidden', true);
            $('#enemyBoard').attr('hidden', true);
            $('#cheater').attr('hidden', false);
          }else if(result.args.receiver==otherWeb3.eth.accounts[0] ){
            $('#board').attr('hidden', true);
            $('#enemyBoard').attr('hidden', true);
            $('#receiver').attr('hidden', false);
          }
        }
      });
    });
  },

  getSibilings: function(id){
    const proof = [];
    const treeHeight = Math.log2(App.sibilings.length);
    
    var row = parseInt($('#tableWidth').val()) - parseInt(id.split("-")[0]); // 2-1 = 1
    var col = parseInt($('#tableWidth').val()) - parseInt(id.split("-")[1]); // 2-2 = 0

    // -1 is for the start from zero
    var leafIndex = App.sibilings.length - (row * parseInt($('#tableWidth').val()) + col); // 7-2 = 5
    // insert also the first node
    proof.push(App.sibilings[leafIndex-1]);

    for (let level = 0; level < treeHeight; level++) {
      if (leafIndex % 2 === 1) { // right child
        const siblingIndex = leafIndex - 1;
        proof.push(App.sibilings[siblingIndex-1]);
      } else { // left child
        const siblingIndex = leafIndex + 1;
        proof.push(App.sibilings[siblingIndex-1]);
      }
      leafIndex = Math.floor(leafIndex / 2);
    }

    // remove the root
    proof.pop();

    return proof;
  },

  getLastMove: function(){
    var gameId=$('#gameIDreg').text();
    App.contracts.Battleship.deployed().then(function (instance){
      return instance.getLastMoves.call(gameId);
    }).then(function(result){
      App.lastMove=result;
    }).catch(function(err){
      console.log(err.message);
    });
  },

  consumeTime: function(){
    otherWeb3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.dummyFunction({from: account});
      }).then(function(result) {
        console.log(result);
        console.log("consumed one block");
        return;
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  }
}

$(function() {
  $(window).load(function() {
    App.init();
  }); 
});


function setTable(n){
  let table=document.getElementById("gameBoard");
  var row = table.insertRow(0);
  var letters=['*', 'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
  for(var j=0; j<=n; j++){
    if(j>0){
      row.insertCell(j).outerHTML = '<th class="numbers">'+(j-1)+'</th>';
    }else{
      row.insertCell(j).outerHTML = '<th class="numbers"></th>';
    }
  }

  for(var i=1; i<=n; i++){
    var row = table.insertRow(i);
    for(var j=0; j<=n; j++){
      if(j==0){
        row.insertCell(j).outerHTML = '<th class="letters">'+letters[i]+'</th>';
      }else{
        var cell = row.insertCell(j);
        var index="" + i + "-" + j;
        cell.setAttribute("class", "mine");
        cell.innerHTML='<div id="'+index+'"></div>';
      }
    }
  }
}

function setAdversaryTable(n){
  let table=document.getElementById("adversaryBoard");
  var row = table.insertRow(0);
  var letters=['*','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
  for(var j=0; j<=n; j++){
    if(j>0){
      row.insertCell(j).outerHTML = '<th class="numbers">'+(j-1)+'</th>';
    }else{
      row.insertCell(j).outerHTML = '<th class="numbers"></th>';
    }
  }

  for(var i=1; i<=n; i++){
    var row = table.insertRow(i);
    for(var j=0; j<=n; j++){
      if(j==0){
        row.insertCell(j).outerHTML = '<th class="letters">'+letters[i]+'</th>';
      }else{
        var cell = row.insertCell(j);
        cell.setAttribute("class", "him");
        var index="a" + i + "-" + j;
        cell.innerHTML='<div id="'+index+'"></div>';
      }
    }
  }
}

function hashBoard(){
  var table=document.getElementById("gameBoard");
  var n=Math.pow(parseInt($('#tableWidth').val()), 2);
  var random=[];
  var values=[];

  for (var i = 1, row; row = table.rows[i]; i++) {
    for (var j = 1, col; col = row.cells[j]; j++) {
      if(col.firstChild.getAttribute("class") == 'hit')
        values.push(1);
      else
        values.push(0);
    }  
  }

  var temp=[];

  for(var i=0; i<n; i++){
    var r=Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    random.push(r);
    let toHash=""+values[i]+random[i];
    var hashed = web3Utils.soliditySha3({type:'string', value: toHash});
    temp.push(hashed);
  }

  const leafNodes = temp;
  const tree = []; // Copy the leaf nodes to the first level of the tree
  tree.push([...leafNodes]);

  let level = 0;
  let numNodes = values.length;

  // Construct the Merkle tree level by level
  while (numNodes > 1) {
    const levelNodes = [];

    // Hash pairs of nodes from the previous level
    for (let i = 0; i < numNodes; i += 2) {
      const left = tree[0][i];
      const right = tree[0][i + 1];
      //const toHash=left+right;

      // Remove the "0x" prefix from the bytes32 values
      const lWithoutPrefix = left.slice(2);
      const rWithoutPrefix = right.slice(2);

      // Concatenate the two bytes32 values as hexadecimal strings
      const toHash = '0x' + lWithoutPrefix + rWithoutPrefix;

      const parent = web3Utils.soliditySha3(toHash);
      levelNodes.push(parent);
    }
    
    tree.unshift([...levelNodes]);
    level++;
    numNodes = levelNodes.length;
  }

  // Flatten the tree
  const flattenedTree = tree.flat();
  App.sibilings=flattenedTree;
  console.log(flattenedTree[0]);
  return flattenedTree[0];
}