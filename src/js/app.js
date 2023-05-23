App = {
  web3Provider: null,
  contracts: {},

  init: async function() {
    return await App.initWeb3();
  },

  initWeb3: async function() {
    if (window.ethereum){
      App.web3Provider=window.ethereum;
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
    $(document).on('click', '#setRegAmount', App.setRegistrationAmount);
    $(document).on('click', '#payGame', App.payGame);
  },

  startNewGame: function(){
    let nShips=$('#nShips').val();
    let tableWidth=$('#tableWidth').val();
    var arr = [nShips, tableWidth];
    console.log(arr);

    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        gameInstance = instance;
        return gameInstance.join.call(0, true, arr, {from: account});
      }).then(function(newGameId){
        
        if (newGameId !== '0x0000000000000000000000000000000000000000') {

          $('#gameIDreg').text(newGameId);
          $('#chooseSize').attr('hidden', true);
          $('#registration').attr('hidden', false);

          return 
        }

        
      }).catch(function(err){
        console.log(err);
      });
    });
  },

///0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563

  getRegistrationAmount: function(){
    var gameId=$('#gameIDreg').text();
    App.contracts.Battleship.deployed().then(function (instance){
      return instance.getReward.call(gameId);
    }).then(function(result){
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

  payGame: function(event) {
    var gameId=$('#gameIDreg').text();
    event.preventDefault();
    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance) {
        return instance.payGame(gameId, {from: account});
      }).then(function() {
        var n=$('#tableWidth').val();
        setTable(n);
        $('#registration').attr("hidden", true);
        $('#board').attr("hidden", false);
      }).catch(function(err) {
        console.log(err.message);
      });
    });
  },

  joinRandomGame: function(){
    App.contracts.Battleship.deployed().then(function (instance){
      adoptionInstance = instance;
      return adoptionInstance.getAdopters.call();
    }).then(function(adopters){
      for (let i = 0; i < array.length; i++) {
        if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
          $('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
        }
      }
    }).catch(function(err){
      console.log(err.message);
    });
  },

  joinFriendGame: function(){
    let gameId=web3.utils.utf8ToHex($('#gameId').val());
    App.contracts.Battleship.deployed().then(function (instance){
      gameInstance = instance;
      return gameInstance.join.call(gameId, false, null);
    }).then(function(newGameId){
      $('#gameIDreg').append(newGameId);
      $('#chooseSize').attr('hidden', true);
      $('#registration').attr('hidden', false);
    }).catch(function(err){
      console.log(err.message);
    });
  },


  //standard template for amonymous call
  markAdopted: function() {
    App.contracts.Battleship.deployed().then(function (instance){
      return instance.function.call();
    }).then(function(result){
      
    }).catch(function(err){
      console.log(err.message);
    });
  },


  //standard template for call with address
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
  let board=$('#board');
  var row = table.insertRow(0);
  var letters=['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q'];
  for(var j=0; j<=n+1; j++){
    if(j>0)
      row.insertCell(j).outerHTML = '<th class="numbers">'+(j-1)+'</th>';
  }

  for(var i=1; i<=n; i++){
    var row = table.insertRow(i);
    for(var j=0; j<=n; j++){
      var cell = row.insertCell(j);
      var index="" + i + n;
      if(j==0){
        row.insertCell(j).outerHTML = '<th class="letters">'+letters[i]+'</th>';
      }else{
        var cell = row.insertCell(j);
        var index="" + i + n;
        cell.innerHTML='<div id="'+index+'"></div>';
      }
    }
  }
}
