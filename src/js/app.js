App = {
  web3Provider: null,
  contracts: {},

  init: async function() {
    console.log("hello");
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
  },

  startNewGame: function(){
    let nShips=$('#nShips').val();
    let tableWidth=$('#tableWidth').val();
    let arr = [nShips, tableWidth];

    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Battleship.deployed().then(function (instance){
        gameInstance = instance;
        return gameInstance.join.call(gameId, false, arr, {from: account});
      }).then(function(newGameId){
        console.log("terzo");
        $('#gameIDreg').append(newGameId);
        $('#chooseSize').attr('hidden', true);
        $('#registration').attr('hidden', false);
      }).catch(function(err){
        console.log(err);
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

  markAdopted: function() {
    var adoptionInstance;
    App.contracts.Adoption.deployed().then(function (instance){
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

  handleAdopt: function(event) {
    event.preventDefault();
    var petId = parseInt($(event.target).data('id'));
    var adoptionInstance;
    web3.eth.getAccounts(function(error, accounts) {
      if (error) { console.log(error); }
      var account = accounts[0];
      App.contracts.Adoption.deployed().then(function (instance) {
        adoptionInstance = instance;
        return adoptionInstance.adopt(petId, {from: account});
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
