const Adoption = artifacts.require("../contracts/Game.sol");
module.exports = function (instance) {
    instance.deploy(Adoption);
};