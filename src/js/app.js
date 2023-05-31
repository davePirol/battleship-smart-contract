App = {
  web3Provider: null,
  contracts: {},
  infos: null,
  rand:null,
  sibilings:[],
  

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
    else if(window.web3){
      App.web3Provider = window.web3.currentProvider;
    }
    else{
      App.web3Provider = new Web3.provider.HttpProvider("http://localhost:7545");
    }
    web3 = new Web3(App.web3Provider);
    
    return App.initContract();
  },

  initContract: function() {
    $.getJSON("Game.json", function(data){
      var BattleshipArtifact = data;
      App.contracts.Battleship = TruffleContract(BattleshipArtifact);
      App.contracts.Battleship.setProvider(App.web3Provider);
    }).done(function() {
      App.listenForEvents(); // Call listenForEvents here
    });;    

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
  },

  startNewGame: function(){
    let nShips=$('#nShips').val();
    let tableWidth=$('#tableWidth').val();
    var arr = [nShips, tableWidth];
    event.preventDefault();
    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        return instance.join(0, true, arr, {from: account});
      }).then(function(result){
        var newGameId=result.logs[0].args.gameId;
        console.log(result.logs[0].args.gameId);
        
        if (newGameId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {

          $('#gameIDreg').text(newGameId);
          $('#chooseSize').attr('hidden', true);
          $('#registration').attr('hidden', false);

        }else{
          $('toastNewGameError').show();
        }        
      }).catch(function(err){
        console.log(err);
      });
    });
  },

  joinFriendGame: function(){
    var gameId=$('#gameId').val();
    console.log(gameId);
    event.preventDefault();

    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        return instance.join(gameId, false, [], {from: account});
      }).then(function(result){
        var newGameId=result.logs[0].args.gameId
        $('#gameIDreg').text(newGameId);
        $('#chooseSize').attr('hidden', true);
        $('#registration').attr('hidden', false);
        return App.getInfo();
      }).catch(function(err){
        console.log(err);
      });
    });
  },

  joinRandomGame: function(){
    event.preventDefault();
    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        return instance.join.call(0, false, [], {from: account});
      }).then(function(newGameId){

        if (newGameId !== '0x0000000000000000000000000000000000000000000000000000000000000000') {

          var newGameId=result.logs[0].args.gameId
          $('#gameIDreg').text(newGameId);
          $('#chooseSize').attr('hidden', true);
          $('#registration').attr('hidden', false);
          
          var arr=App.getInfo();
          $('#nShips').val(parseInt(arr[2], 16));
          $('#tableWidth').val(parseInt(arr[1], 16));
          if(arr[5] > -1){
            $('#registrationAmount').val(parseInt(arr[1], 16));
            $('#registrationAmount').attr('disabled', true);
          }

        }else{
          $('#toastJoinError').toast('show');
          return;
        }
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
    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.setReward(gameId, amount, {from: account});
      }).then(function(result) {
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
    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.pay(gameId, {from: account, value: $('#registrationAmount').val()+"000000000000000000"});
      }).then(function() {
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
    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        return instance.setBoard(gameId, hashedBoard, {from: account});
      }).then(function(result){
          console.log(result);
          var n=$('#tableWidth').val();
          setAdversaryTable(n);
          $('#enemyBoard').attr("hidden", false);

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
      $('#nShips').val(parseInt(result[2], 16));
      $('#tableWidth').val(parseInt(result[1], 16));
      if(parseInt(result[5], 16) > -1){
        $('#registrationAmount').val(parseInt(result[5], 16));
        $('#registrationAmount').attr('disabled', true);
      }    
    }).catch(function(err){
      console.log(err.message);
    });
  },

  sendMove: function(){
    var gameId=$('#gameIDreg').text();
    var idRaw;
    var table=document.getElementById("adversaryBoard");
    for (var i = 1, row; row = table.rows[i]; i++) {
      for (var j = 1, col; col = row.cells[j]; j++) {
          if(col.firstChild.getAttribute("class") == 'redB')
              idRaw=col.firstChild.id;
      }  
    }
    var id=idRaw.substring(1);
    var coordinate=id;

    event.preventDefault();
    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.shoot(gameId, coordinate,{from: account});
      }).then(function(result) {
        console.log(result);
      }).catch(function(err) {
        console.log(err.message);
      });
    });

  },

  listenForEvents: function(){
    App.contracts.Battleship.deployed().then(function (instance) {
      instance.SendNewGameCreate({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }
      });
      instance.SendRequestAmount({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }
        console.log(result);
      });
      instance.SendMovesAdvice({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }
        console.log(result.args);
        if(result.args.player==web3.eth.accounts[0]){
          // controlla le coordinate e dai la merkle sibilings
          // result.arg.move
          var idToCheck=result.arg.move.substring(1);
          if($('#'+idToCheck).attr('class')=='hit')
            var hit=true;
          else
            var hit=false;

          var gameId=$('#gameIDreg').text();

          App.contracts.Battleship.deployed().then(function (instance){
            var sibilings=App.getSibilings();
            return instance.checkMerkleProof.call(gameId, sibilings, hit);
          }).then(function(result){
            console.log(result);
            if(result){
              $('#a'+idToCheck).attr('class', 'hit');
              $('#resultMove').text('hit');
            }else{
              $('#a'+idToCheck).attr('class', 'miss');
              $('#resultMove').text('miss');
            }
            $('#sendMove').attr('disabled', true);            
          }).catch(function(err){
            console.log(err.message);
          });
        }
      });
      instance.SendTurnAdvice({}, { fromBlock: 'latest', toBlock: 'latest' }).watch(function (err, result){
        if (err) {
          return error(err);
        }
        console.log(result.args);
        if(result.args.player==web3.eth.accounts[0]){
          $('#sendMove').attr('disabled', false);
          $('#advice').text("It's your turn: shoot!");
        }
      });
    });
  },

  getSibilings: function(id){
    const proof = [];
    const treeHeight = Math.log2(App.sibilings.length);
    
    // -1 is because the id start from 1-1
    var row = parseInt($('#tableWidth').val()) - parseInt(id.split("-")[0]);
    var col = parseInt($('#tableWidth').val()) - parseInt(id.split("-")[1]);

    // -1 is for the length
    var leafIndex = App.sibilings.length - 1 - (row * parseInt($('#tableWidth').val()) + col);
    // insert also the first node
    proof.push(App.sibilings[leafIndex]);

    for (let level = 0; level < treeHeight; level++) {
      if (leafIndex % 2 === 1) { // left child
        const siblingIndex = leafIndex + 1;
        proof.push(App.sibilings[siblingIndex]);
      } else { // right child
        const siblingIndex = leafIndex - 1;
        proof.push(App.sibilings[siblingIndex]);
      }
      leafIndex = Math.floor(leafIndex / 2);
    }

    // remove the root
    proof.pop();

    return proof;
  },

  //standard template for call
  markAdopted: function() {
    App.contracts.Battleship.deployed().then(function (instance){
      return instance.function.call();
    }).then(function(result){
      
    }).catch(function(err){
      console.log(err.message);
    });
  },


  //standard template for transaction with address
  handleAdopt: function(event) {
    event.preventDefault();
    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.adopt(petId, {from: account});
      }).then(function() {
        return App.markAdopted();
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  }
};

$(function() {
  $(window).load(function() {
    App.init();
  }); 
});


function setTable(n){
  let table=document.getElementById("gameBoard");
  var row = table.insertRow(0);
  var letters=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
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
  var letters=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
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

  for(var i=0; i<n; i++){
    var r=Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    random.push(r);
  }

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
    var toHash=""+values[i]+random[i];
    var hashed=keccak256(toHash).toString('hex');
    temp.push(hashed);
  }
  var _sib=[];
  while(temp.length!=1){
    var first=temp.shift();
    var second=temp.shift();
    var toHash=""+first+second;
    var hashed=keccak256(toHash).toString('hex');
    temp.push(hashed);
    _sib.push(first);
    _sib.push(second);
  }
  App.rand=random;
  _sib.push(temp[0]); //insert the root
  
  //divide in two the array, the second part is reversed to have a representation of a tree 
  // take the first x^2 where x is the table width
  _f=_sib.slice(0, n);
  _s=_sib.slice(n, _sib.length);
  _s.reverse();
  App.sibilings=_s.concat(_f);
  return temp[0];
}