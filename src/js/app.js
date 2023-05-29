App = {
  web3Provider: null,
  contracts: {},
  infos: null,
  rand:null,
  

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

function evento(){
  
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

  while(temp.length!=1){
    var first=temp.shift();
    var second=temp.shift();
    var toHash=""+first+second;
    var hashed=keccak256(toHash).toString('hex');
    temp.push(hashed);
  }
  App.rand=random;

  return temp[0];
}





/**
 * var subscription = web3.eth.subscribe('logs',{ 
      address: "0xadc048ED9545051b82c1B46f4A40f1C08F2c705D",
      topics: ["0xa42dd9e1d9175b98ede6b33b1bc3f78cd3f694b7213da993c11516d22751a66d",
              "0x24e3120dee1a7172611f0ca41434f8041a1ed6c9f69a04417e48a62dc92979fc",
              "0x8baeb50b886fb168a371117c6cb88337a25606fe162d778425bd068ef9d25da5",
              "0xc7e0345890e3d3863c7f66518e8fe24252b162afe06faf9b20c50ac5d774fdfa",
              "0xbac0d2f1d5b86b0ca75625d37a148747faa00f4de41c5c586f79880e455c2dc5",
              "0x9709744f7c7359edb2e10790a4a8501b0bb5fcec380968177c7a3e91249d52d8"]
    },(error, event) => {
        //Do something
    }).on("connected", function(subscriptionId){
        console.log('SubID: ',subscriptionId);
    })
    .on('data', function(event){
        console.log('Event:', event); 
        console.log(event.transactionHash);
        //Write send mail here!
    })
    .on('changed', function(event){
        // remove event from local database
    })
    .on('error', function(error, receipt) { 
        console.log('Error:', error, receipt);
    });
 */