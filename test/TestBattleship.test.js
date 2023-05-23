const Adoption = artifacts.require("Game");

contract("Game", (accounts) => {
  let battleship;
  let expectGameId;

  before(async () => {
    battleship = await Adoption.deployed();
  });

  describe("create a new game", async () => {
    before("create a new game from accounts[0]", async () => {
        let x = await battleship.join(0, true, new Uint8Array([nShips, tableWidth]), { from: accounts[0] });
        expectGameId = bytes32ToNumString(x);
    });
  });

  it("A new game is being created: ", async () => {
    let id="044852b2a670ade5407e78fb2863c51de9fcb96542a07186fe3aeda6bb8a116d";
    assert.equal(id, expectGameId, "The id of game is: ");
  });
});

function numStringToBytes32(num) { 
  var bn = new BN(num).toTwos(256);
  return padToBytes32(bn.toString(16));
}

function bytes32ToNumString(bytes32str) {
  bytes32str = bytes32str.replace(/^0x/, '');
  var bn = new BN(bytes32str, 16).fromTwos(256);
  return bn.toString();
}

function padToBytes32(n) {
  while (n.length < 64) {
      n = "0" + n;
  }
  return "0x" + n;
}