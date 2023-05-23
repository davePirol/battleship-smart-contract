const Battleship = artifacts.require("../contracts/Game.sol");
module.exports = function (instance) {
    instance.deploy(Battleship);
};